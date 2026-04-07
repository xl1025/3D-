/**
 * 魔法交互控制器 (InteractionManager.js)
 * 专职处理学徒的鼠标手势：拖拽、智能磁性吸附、楔入、斩断与净化
 * 优化：新增第三关手动拖拽碳、氧原子生成双键的吸附逻辑，弱化具体指令
 */
class InteractionManager {
    constructor(sceneManager) {
        this.sm = sceneManager;
        this.SNAP_DISTANCE = 2.4; 
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.initDragControls();
        this.initDispelMagic();
    }

    initDragControls() {
        this.dragControls = new THREE.DragControls(this.sm.atoms, this.sm.camera, this.sm.renderer.domElement);
        
        this.dragControls.addEventListener('dragstart', (event) => {
            event.object.userData.isDragging = true;
            if (typeof gsap !== 'undefined') gsap.to(event.object.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 0.2 });
        });
        
        this.dragControls.addEventListener('drag', (event) => {
            event.object.position.z = 0; 
            if (this.sm.physicsEngine) this.sm.physicsEngine.updateConnectedBonds(event.object);
        });
        
        this.dragControls.addEventListener('dragend', (event) => {
            event.object.userData.isDragging = false;
            if (typeof gsap !== 'undefined') gsap.to(event.object.scale, { x: 1, y: 1, z: 1, duration: 0.2 });
            this.handleSnapAndBond(event.object);
        });

        this.sm.renderer.domElement.addEventListener('pointerdown', (event) => {
            if (window.app && window.app.chemistryEngine) {
                const state = window.app.chemistryEngine.interactiveReactionState;
                if (state === 'awaiting_bond_break' || state === 'awaiting_oxidation_bond_break') {
                    const rect = this.sm.renderer.domElement.getBoundingClientRect();
                    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
                    
                    this.raycaster.setFromCamera(this.mouse, this.sm.camera);
                    const bondMeshes = this.sm.bonds.map(b => b.mesh);
                    const intersects = this.raycaster.intersectObjects(bondMeshes, true);
                    
                    if (intersects.length > 0) {
                        let clickedMesh = intersects[0].object;
                        let bondObj = this.sm.bonds.find(b => b.mesh === clickedMesh || (b.mesh.children && b.mesh.children.includes(clickedMesh)));
                        
                        if (bondObj) {
                            if (state === 'awaiting_bond_break') {
                                window.app.chemistryEngine.handleBondClick(bondObj); 
                            } else {
                                window.app.chemistryEngine.handleOxidationBondClick(bondObj); 
                            }
                        }
                    }
                }
            }
        });
    }

    handleSnapAndBond(draggedAtom) {
        if (window.app && window.app.chemistryEngine) {
            const state = window.app.chemistryEngine.interactiveReactionState;

            if (state === 'awaiting_bond_break' || state === 'awaiting_oxidation_bond_break') return; 

            // 第二关拦截：投入金属钠
            if (state === 'awaiting_na_drag') {
                if (draggedAtom.userData.type !== 'Na') return; 
                const dir = window.app.chemistryEngine.director;
                if (dir && dir.activeReactionSite && dir.activeReactionSite.atomO) {
                    const atomO = dir.activeReactionSite.atomO;
                    if (draggedAtom.position.distanceTo(atomO.position) < this.SNAP_DISTANCE * 2.0) {
                        window.app.chemistryEngine.checkInteractiveSnap(draggedAtom, atomO);
                    } 
                }
                return; 
            }
            
            // 第三关拦截：拖拽铜原子催化
            if (state === 'awaiting_cu_drag') {
                if (draggedAtom.userData.type !== 'Cu') return; 
                const dir = window.app.chemistryEngine.director;
                if (dir && dir.activeReactionSite && dir.activeReactionSite.atomO) {
                    const atomO = dir.activeReactionSite.atomO;
                    if (draggedAtom.position.distanceTo(atomO.position) < this.SNAP_DISTANCE * 2.0) {
                        window.app.chemistryEngine.checkInteractiveSnap(draggedAtom, atomO);
                    } 
                }
                return; 
            }

            // 🌟 核心升级：第三关拦截：手动拖拽生成双键
            if (state === 'awaiting_double_bond') {
                if (draggedAtom.userData.type !== 'C' && draggedAtom.userData.type !== 'O') return;
                const dir = window.app.chemistryEngine.director;
                if (dir && dir.activeReactionSite) {
                    const { atomO, atomC } = dir.activeReactionSite;
                    // 确认当前拖拽的是参与反应的那个 C 或 O
                    if (draggedAtom === atomO || draggedAtom === atomC) {
                        const target = (draggedAtom === atomO) ? atomC : atomO;
                        // 放宽吸附距离，只要在附近松手就算成功
                        if (draggedAtom.position.distanceTo(target.position) < this.SNAP_DISTANCE * 2.0) {
                            window.app.chemistryEngine.checkInteractiveSnap(draggedAtom, target);
                        } else {
                            // 🌟 任务导向提示，弱化具体指令
                            if (window.app.uiManager) window.app.uiManager.showMagicNotice("⚠️ 施法偏离", "距离太远啦！请尝试将反应原子互相靠近以重构分子骨架！");
                        }
                    }
                }
                return;
            }
        }

        // 常规拼装逻辑：楔入或自动成键
        let closestBond = null;
        let minBondDist = 1.0; 

        for (let bond of this.sm.bonds) {
            if (bond.a === draggedAtom || bond.b === draggedAtom) continue;
            const A = bond.a.position, B = bond.b.position, P = draggedAtom.position;
            const AB = new THREE.Vector3().subVectors(B, A), AP = new THREE.Vector3().subVectors(P, A);
            const abLenSq = AB.lengthSq();
            if (abLenSq === 0) continue;

            let t = AP.dot(AB) / abLenSq;
            if (t > 0.2 && t < 0.8) { 
                const closestPoint = new THREE.Vector3().copy(A).add(AB.clone().multiplyScalar(t));
                const dist = P.distanceTo(closestPoint);
                if (dist < minBondDist) { minBondDist = dist; closestBond = bond; }
            }
        }

        if (closestBond && (draggedAtom.userData.maxBonds - draggedAtom.userData.bonds >= 2)) {
            if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.insertAtomIntoBond(draggedAtom, closestBond);
            return; 
        }

        let closestAtom = null;
        let minScore = Infinity; 

        for (let targetAtom of this.sm.atoms) {
            if (targetAtom === draggedAtom) continue;
            const distance = draggedAtom.position.distanceTo(targetAtom.position);
            const surfaceDist = distance - (draggedAtom.geometry.parameters.radius || 0.6) - (targetAtom.geometry.parameters.radius || 0.6);
            
            if (distance < this.SNAP_DISTANCE) {
                if (draggedAtom.userData.bonds < draggedAtom.userData.maxBonds && targetAtom.userData.bonds < targetAtom.userData.maxBonds) {
                    if (!this.sm.checkIfAlreadyBonded(draggedAtom, targetAtom)) {
                        let score = surfaceDist; 
                        const typeA = draggedAtom.userData.type, typeB = targetAtom.userData.type;

                        if (typeA === 'H' && typeB === 'H') score += 1000; 
                        if ((typeA === 'C' && typeB === 'C') || (typeA === 'C' && typeB === 'O') || (typeA === 'O' && typeB === 'C')) score -= 10;
                        if ((typeA === 'H' && (typeB === 'C' || typeB === 'O')) || (typeB === 'H' && (typeA === 'C' || typeA === 'O'))) score -= 25; 
                        if (typeA === 'Na' || typeB === 'Na' || typeA === 'Cu' || typeB === 'Cu') score += 1000; 

                        if (score < minScore) { minScore = score; closestAtom = targetAtom; }
                    }
                }
            }
        }

        if (closestAtom && minScore <= 50) {
            this.sm.createBondVisual(draggedAtom, closestAtom);
            draggedAtom.userData.bonds++;
            closestAtom.userData.bonds++;
            if(window.app && window.app.chemistryEngine) {
                window.app.chemistryEngine.updateGraph(draggedAtom, closestAtom);
                window.app.chemistryEngine.analyzeStructure();
            }
        }
    }

    initDispelMagic() {
        this.sm.renderer.domElement.addEventListener('dblclick', (event) => {
            if (window.app && window.app.chemistryEngine && window.app.chemistryEngine.interactiveReactionState !== 'idle') {
                if (window.app.uiManager) window.app.uiManager.showMagicNotice("🛡️ 魔法护盾", "互动试炼正在进行中，法阵已被锁定，暂时无法驱散元素！");
                return;
            }
            const rect = this.sm.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.sm.camera);
            
            const intersects = this.raycaster.intersectObjects(this.sm.atoms);
            if (intersects.length > 0) this.sm.removeAtom(intersects[0].object); 
        });
    }
}