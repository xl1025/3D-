/**
 * 高阶微观全息投影仪 (MiniModelRenderer.js)
 * 🌟 核心升级：动画期间锁定旋转、官能团绝对居中直面镜头，提升观察清晰度
 */
class MiniModelRenderer {
    constructor(containerId, moleculeType) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.container.innerHTML = ''; 
        this.isDisposed = false; 

        this.scene = new THREE.Scene();
        this.pivot = new THREE.Group(); 
        this.scene.add(this.pivot);

        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const light = new THREE.PointLight(0xffffff, 1.2);
        light.position.set(10, 10, 10);
        this.scene.add(light);

        const width = this.container.clientWidth || 370;
        const height = this.container.clientHeight || 350;

        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
        this.camera.position.set(0, 0, 11); 

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        this.renderer.domElement.style.pointerEvents = 'auto';
        this.renderer.domElement.style.touchAction = 'none'; 
        this.container.appendChild(this.renderer.domElement);

        // 🌟 新增 isAnimating 状态锁，用于屏蔽动画期间的自动旋转
        this.interactionState = {
            isDragging: false, isClick: true, isAnimating: false, previousMouse: { x: 0, y: 0 },
            targetRotationX: 0, targetRotationY: 0, targetCameraZ: 11, lastInteractionTime: Date.now() 
        };

        this.transientMeshes = { 
            atomH: null, bondOH: null, atomNa: null, ionicField: null,
            atomC2: null, atomO1: null, atomH_C: null, atomH_C_remain: null, bondCH: null, bondCO: null
        };
        
        this.bonds = []; 

        if (moleculeType === 'ethanol') this.createEthanolModel();
        else if (moleculeType === 'dimethyl_ether') this.createDimethylEtherModel();
        else if (moleculeType === 'sodium_ethoxide') this.createSodiumEthoxideModel(); 
        else if (moleculeType === 'acetaldehyde') this.createAcetaldehydeModel(); 

        this.initNativeInteraction(); 

        const animateStaticModel = () => {
            if (this.isDisposed) return; 
            requestAnimationFrame(animateStaticModel);
            
            this.pivot.rotation.y += (this.interactionState.targetRotationY - this.pivot.rotation.y) * 0.1;
            this.pivot.rotation.x += (this.interactionState.targetRotationX - this.pivot.rotation.x) * 0.1;
            this.camera.position.z += (this.interactionState.targetCameraZ - this.camera.position.z) * 0.1;

            // 🌟 如果处于动画播放期，强制停止闲置自动旋转
            if (Date.now() - this.interactionState.lastInteractionTime > 3000 && !this.interactionState.isDragging && !this.interactionState.isAnimating) {
                this.interactionState.targetRotationY += 0.003; 
            }

            this.bonds.forEach(bond => {
                if (!bond.mesh.parent) return; 
                const posA = bond.a.position;
                const posB = bond.b.position;
                const distance = posA.distanceTo(posB);
                if (distance === 0) return;

                const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
                const direction = new THREE.Vector3().subVectors(posB, posA).normalize();

                bond.mesh.position.copy(midPoint);
                bond.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

                if (bond.type === 'double') {
                    bond.mesh.children.forEach(child => child.scale.y = distance);
                    bond.mesh.rotateY(Date.now() * 0.002);
                } else {
                    bond.mesh.scale.y = distance;
                }
            });

            this.renderer.render(this.scene, this.camera);
        };
        animateStaticModel();
    }

    dispose() {
        this.isDisposed = true;
        if (typeof gsap !== 'undefined') {
            gsap.killTweensOf(this.pivot.rotation);
            gsap.killTweensOf(this.pivot.position);
            gsap.killTweensOf(this.camera.position);
            this.pivot.traverse(obj => gsap.killTweensOf(obj));
        }
        if (this.renderer) {
            this.renderer.dispose();
            const canvas = this.renderer.domElement;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        }
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }

    resetIdleTimer() { this.interactionState.lastInteractionTime = Date.now(); }

    initNativeInteraction() {
        const canvas = this.renderer.domElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.tooltip = document.createElement('div');
        this.tooltip.style.cssText = 'position: absolute; color: #ffd700; background: rgba(26, 26, 46, 0.9); padding: 12px 20px; border: 2px solid #8b5a2b; border-radius: 8px; pointer-events: none; opacity: 0; transition: opacity 0.3s; font-size: 3em; font-weight: bold; z-index: 100; font-family: "Courier New", monospace; text-shadow: 2px 2px 4px #000; box-shadow: 0 0 15px rgba(139, 90, 43, 0.8);';
        this.container.appendChild(this.tooltip);

        canvas.addEventListener('pointerdown', (e) => {
            if (this.interactionState.isAnimating) return; // 动画期间禁止拖拽视角
            this.interactionState.isDragging = true; this.interactionState.isClick = true; 
            this.interactionState.previousMouse = { x: e.clientX, y: e.clientY };
            this.resetIdleTimer(); canvas.setPointerCapture(e.pointerId); 
        });

        canvas.addEventListener('pointermove', (e) => {
            if (this.interactionState.isDragging) {
                const deltaX = e.clientX - this.interactionState.previousMouse.x;
                const deltaY = e.clientY - this.interactionState.previousMouse.y;
                if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) this.interactionState.isClick = false; 
                this.interactionState.targetRotationY += deltaX * 0.01;
                this.interactionState.targetRotationX += deltaY * 0.01;
                this.interactionState.previousMouse = { x: e.clientX, y: e.clientY };
                this.resetIdleTimer();
            }
        });

        canvas.addEventListener('pointerup', (e) => {
            this.interactionState.isDragging = false; canvas.releasePointerCapture(e.pointerId);
            this.resetIdleTimer();
            if (this.interactionState.isClick && !this.interactionState.isAnimating) this.handleRaycast(e);
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault(); 
            if (this.interactionState.isAnimating) return;
            this.interactionState.targetCameraZ += e.deltaY * 0.005;
            this.interactionState.targetCameraZ = Math.max(4, Math.min(25, this.interactionState.targetCameraZ)); 
            this.resetIdleTimer(); 
        }, { passive: false });
    }

    handleRaycast(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.pivot.children, true);
        let clickedAtom = intersects.find(obj => obj.object.userData && obj.object.userData.type);
        
        if (clickedAtom) {
            const type = clickedAtom.object.userData.type;
            const nameMap = { 'C': '碳原子 (C)', 'H': '氢原子 (H)', 'O': '氧原子 (O)', 'Na': '钠离子 (Na⁺)', 'Cu': '铜原子 (Cu)' };
            this.tooltip.innerText = `🔍 探知: ${nameMap[type] || type}`;
            this.tooltip.style.left = (event.clientX - rect.left + 15) + 'px';
            this.tooltip.style.top = (event.clientY - rect.top + 15) + 'px';
            this.tooltip.style.opacity = '1';
            setTimeout(() => { if (!this.isDisposed) this.tooltip.style.opacity = '0'; }, 2000);
        }
    }

    addAtom(type, positionVector) {
        let color = type === 'C' ? 0x333333 : (type === 'O' ? 0xff0000 : (type === 'Na' ? 0xaaaaaa : (type === 'Cu' ? 0xb87333 : 0xffffff)));
        let radius = type === 'C' ? 0.7 : (type === 'H' ? 0.4 : (type === 'Na' || type === 'Cu' ? 0.8 : 0.6));
        const geo = new THREE.SphereGeometry(radius, 32, 32); 
        const mat = new THREE.MeshStandardMaterial({ 
            color: color, metalness: (type === 'Na' || type === 'Cu') ? 0.8 : 0.6, roughness: 0.1,
            emissive: type === 'Na' ? 0x222255 : (type === 'Cu' ? 0x442200 : 0x000000) 
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(positionVector);
        mesh.userData = { type: type }; 
        this.pivot.add(mesh);
        return mesh;
    }

    addBond(atomAMesh, atomBMesh, type = 'single') {
        const posA = atomAMesh.position; 
        const posB = atomBMesh.position;
        const distance = posA.distanceTo(posB);
        
        let mesh;
        if (type === 'double') {
            mesh = new THREE.Group();
            const mat = new THREE.MeshStandardMaterial({ color: 0xffaa00, metalness: 0.8, roughness: 0.2, emissive: 0xff4400, emissiveIntensity: 1.5 });
            const bond1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 12), mat);
            const bond2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 12), mat);
            bond1.position.x = 0.18; bond2.position.x = -0.18; 
            bond1.scale.y = distance; bond2.scale.y = distance;
            mesh.add(bond1); mesh.add(bond2);
        } else {
            let geo, mat;
            if(type === 'ionic') {
                geo = new THREE.CylinderGeometry(0.15, 0.15, 1, 12);
                mat = new THREE.MeshBasicMaterial({ color: 0x88bbff, transparent: true, opacity: 0.3, wireframe: true, blending: THREE.AdditiveBlending });
            } else {
                geo = new THREE.CylinderGeometry(0.12, 0.12, 1, 12);
                mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
            }
            mesh = new THREE.Mesh(geo, mat);
            mesh.scale.y = distance;
        }

        mesh.userData = { a: atomAMesh, b: atomBMesh, type: type };
        
        const midPoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
        mesh.position.copy(midPoint);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), posB.clone().sub(posA).normalize());
        
        this.pivot.add(mesh);
        this.bonds.push({ mesh: mesh, a: atomAMesh, b: atomBMesh, type: type });
        return mesh;
    }

    createEthanolModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.5, -0.5, 0)); 
        const c2 = this.addAtom('C', new THREE.Vector3(0.5, 0.5, 0)); 
        const o1 = this.addAtom('O', new THREE.Vector3(1.8, -0.5, 0));
        this.addBond(c1, c2); 
        const bondCO = this.addBond(c2, o1);
        
        const h_c2_1 = this.addAtom('H', new THREE.Vector3(0.5, 1.3, 0.8)); 
        const h_c2_2 = this.addAtom('H', new THREE.Vector3(0.5, 1.3, -0.8));
        const bondCH = this.addBond(c2, h_c2_1); 
        this.addBond(c2, h_c2_2);
        
        const h_c1_1 = this.addAtom('H', new THREE.Vector3(-2.3, 0.3, 0)); 
        const h_c1_2 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, 0.8)); 
        const h_c1_3 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, -0.8));
        this.addBond(c1, h_c1_1); this.addBond(c1, h_c1_2); this.addBond(c1, h_c1_3);
        
        const h_o1 = this.addAtom('H', new THREE.Vector3(2.5, 0.2, 0));
        const bondOH = this.addBond(o1, h_o1);

        this.transientMeshes.atomH = h_o1;
        this.transientMeshes.bondOH = bondOH;
        this.transientMeshes.atomC2 = c2;
        this.transientMeshes.atomO1 = o1;
        this.transientMeshes.atomH_C = h_c2_1; 
        this.transientMeshes.atomH_C_remain = h_c2_2; 
        this.transientMeshes.bondCH = bondCH;
        this.transientMeshes.bondCO = bondCO;
    }

    createDimethylEtherModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.5, -0.8, 0)); 
        const o1 = this.addAtom('O', new THREE.Vector3(0, 0.5, 0)); 
        const c2 = this.addAtom('C', new THREE.Vector3(1.5, -0.8, 0));
        this.addBond(c1, o1); this.addBond(c2, o1);
        
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-2.3, -0.1, 0))); 
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-1.5, -1.6, 0.8))); 
        this.addBond(c1, this.addAtom('H', new THREE.Vector3(-1.5, -1.6, -0.8)));
        
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(2.3, -0.1, 0))); 
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(1.5, -1.6, 0.8))); 
        this.addBond(c2, this.addAtom('H', new THREE.Vector3(1.5, -1.6, -0.8)));
    }

    createSodiumEthoxideModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.5, -0.5, 0)); 
        const c2 = this.addAtom('C', new THREE.Vector3(0.5, 0.5, 0)); 
        const o1 = this.addAtom('O', new THREE.Vector3(1.8, -0.5, 0));
        this.addBond(c1, c2); this.addBond(c2, o1);
        
        const h_c2_1 = this.addAtom('H', new THREE.Vector3(0.5, 1.3, 0.8)); 
        const h_c2_2 = this.addAtom('H', new THREE.Vector3(0.5, 1.3, -0.8));
        this.addBond(c2, h_c2_1); this.addBond(c2, h_c2_2);
        
        const h_c1_1 = this.addAtom('H', new THREE.Vector3(-2.3, 0.3, 0)); 
        const h_c1_2 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, 0.8)); 
        const h_c1_3 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, -0.8));
        this.addBond(c1, h_c1_1); this.addBond(c1, h_c1_2); this.addBond(c1, h_c1_3);
        
        const na_o1 = this.addAtom('Na', new THREE.Vector3(3.6, 0.2, 0)); 
        this.addBond(o1, na_o1, 'ionic');
    }

    createAcetaldehydeModel() {
        const c1 = this.addAtom('C', new THREE.Vector3(-1.5, -0.5, 0)); 
        const c2 = this.addAtom('C', new THREE.Vector3(0.5, 0.5, 0)); 
        const o1 = this.addAtom('O', new THREE.Vector3(1.8, -0.5, 0)); 
        this.addBond(c1, c2); 
        this.addBond(c2, o1, 'double'); 
        
        const h_c2_remain = this.addAtom('H', new THREE.Vector3(0.5, 1.7, 0)); 
        this.addBond(c2, h_c2_remain);
        
        const h_c1_1 = this.addAtom('H', new THREE.Vector3(-2.3, 0.3, 0)); 
        const h_c1_2 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, 0.8)); 
        const h_c1_3 = this.addAtom('H', new THREE.Vector3(-1.5, -1.3, -0.8));
        this.addBond(c1, h_c1_1); this.addBond(c1, h_c1_2); this.addBond(c1, h_c1_3);
    }

    showMagicTitle(text) {
        const titleEl = document.getElementById('mini-vision-title');
        if(titleEl) {
            titleEl.innerText = text;
            titleEl.style.opacity = 1;
            setTimeout(() => { if(!this.isDisposed) titleEl.style.opacity = 0; }, 3500);
        }
    }

    // ==========================================
    // 🎭 置换反应动画：取消旋转，绝对居中羟基
    // ==========================================
    async animateTransitionToSodiumEthoxide() {
        if (this.isDisposed || !this.transientMeshes.atomH || !this.transientMeshes.bondOH) return;
        this.showMagicTitle("置换推演：O-H 键断裂");
        this.interactionState.isAnimating = true; // 锁定动画期间的交互

        const tl = gsap.timeline();
        
        const startPosNa = new THREE.Vector3(6, 4, -4); 
        const targetPosNa = new THREE.Vector3(3.6, 0.2, 0);
        
        const atomNa = this.addAtom('Na', startPosNa);
        atomNa.material.transparent = true;
        atomNa.material.opacity = 0;
        this.transientMeshes.atomNa = atomNa;

        const atomO = this.transientMeshes.bondOH.userData.a.userData.type === 'O' ? this.transientMeshes.bondOH.userData.a : this.transientMeshes.bondOH.userData.b;

        // 🌟 核心：取消 X/Y 旋转，并将羟基氧原子 (-1.8, 0.5) 推入屏幕正中央，拉近焦距
        tl.addLabel("focus")
            .to(this.interactionState, { targetCameraZ: 7, targetRotationX: 0, targetRotationY: 0, duration: 1.5, ease: "power2.inOut" }, "focus") 
            .to(this.pivot.rotation, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" }, "focus") 
            .to(this.pivot.position, { x: -1.8, y: 0.5, duration: 1.5, ease: "power2.inOut" }, "focus"); 

        const haloGeo = new THREE.SphereGeometry(1.5, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, wireframe: true });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        atomO.add(halo);

        tl.addLabel("tension", "-=0.2")
            .to(halo.material, { opacity: 0.8, duration: 0.4, yoyo: true, repeat: 3 }, "tension") 
            .to(halo.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.4, yoyo: true, repeat: 3 }, "tension")
            .to(this.transientMeshes.bondOH.material.emissive, { r: 1, duration: 0.3, yoyo: true, repeat: 4 }, "tension")
            .to(this.transientMeshes.bondOH.scale, { x: 0.4, z: 0.4, duration: 1.2, ease: "rough({ strength: 3, points: 30 })" }, "tension") 
            .to(this.transientMeshes.atomH.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 1.2, ease: "rough({ strength: 3, points: 30 })" }, "tension");

        tl.addLabel("break", "+=0.1")
            .set(this.transientMeshes.bondOH, { visible: false }, "break")
            .to(this.transientMeshes.atomH.position, { x: "+=3", y: "+=3", z: "+=8", duration: 1.2, ease: "power2.in" }, "break") 
            .to(this.transientMeshes.atomH.material, { opacity: 0, transparent: true, duration: 0.8, ease: "power1.in" }, "break")
            .to(halo.material, { opacity: 0, duration: 0.5 }, "break");

        tl.addLabel("naAdsorb", "-=0.5")
            .to(atomNa.material, { opacity: 1, duration: 0.4 }, "naAdsorb")
            .to(atomNa.position, { x: targetPosNa.x, y: targetPosNa.y, z: targetPosNa.z, duration: 0.8, ease: "back.out(1.5)" }, "naAdsorb"); 

        tl.addLabel("formIonic", "-=0.1")
            .add(() => {
                if (!this.isDisposed) {
                   const field = this.addBond(atomO, atomNa, 'ionic');
                   this.transientMeshes.ionicField = field;
                   gsap.to(field.material, { opacity: 0.2, duration: 1.0, yoyo: true, repeat: -1, ease: "sine.inOut" });
                   gsap.to(field.scale, { x: 1.6, z: 1.6, duration: 1.0, yoyo: true, repeat: -1, ease: "sine.inOut" });
                }
            }, "formIonic")
            .to(this.camera.position, { x: "+=0.3", y: "+=0.3", duration: 0.05, yoyo: true, repeat: 5 }, "formIonic")
            .to(this.camera.position, { x: 0, y: 0, duration: 0.1 })
            .to(this.interactionState, { targetCameraZ: 11, duration: 1.5, ease: "power2.inOut" }, "+=0.5")
            .to(this.pivot.position, { x: 0, y: 0, duration: 1.5, ease: "power2.inOut" }, "-=1.5")
            .add(() => { 
                if(halo.parent) halo.parent.remove(halo);
                this.interactionState.isAnimating = false; // 释放交互锁
                this.resetIdleTimer(); 
            });
            
        return tl;
    }

    // ==========================================
    // 🌟 铜氧化反应特效：取消旋转，绝对居中 C-O 键
    // ==========================================
    async animateTransitionToAcetaldehyde() {
        if (this.isDisposed || !this.transientMeshes.atomH || !this.transientMeshes.bondOH || !this.transientMeshes.bondCH) return;
        this.showMagicTitle("氧化推演：生成 C=O 双键");
        this.interactionState.isAnimating = true; // 锁定动画期间的交互
        
        const tl = gsap.timeline();
        const { atomO1, atomC2, atomH, atomH_C, atomH_C_remain, bondOH, bondCH, bondCO } = this.transientMeshes;

        // 🌟 核心：取消倾斜旋转，将发生反应的 C-O 基团重心 (-1.15, 0) 推入画面正中央
        tl.addLabel("focus")
            .to(this.interactionState, { targetCameraZ: 6.5, targetRotationX: 0, targetRotationY: 0, duration: 2.0, ease: "power2.inOut" }, "focus")
            .to(this.pivot.rotation, { x: 0, y: 0, z: 0, duration: 2.0, ease: "power2.inOut" }, "focus")
            .to(this.pivot.position, { x: -1.15, y: 0, duration: 2.0, ease: "power2.inOut" }, "focus");

        const cuWire = this.addAtom('Cu', new THREE.Vector3(atomC2.position.x - 5, atomC2.position.y + 4, 2));
        cuWire.geometry.dispose();
        cuWire.geometry = new THREE.CylinderGeometry(0.15, 0.15, 5, 12); 
        cuWire.rotation.z = Math.PI / 4;
        
        tl.to(cuWire.position, { x: atomC2.position.x + 1, y: atomC2.position.y + 1, duration: 2.5, ease: "power1.inOut" }, "focus+=1.0");

        const halo = new THREE.Mesh(new THREE.SphereGeometry(1.8, 32, 32), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0, wireframe: true }));
        atomC2.add(halo);

        tl.addLabel("tension", "+=0.5")
            .to(halo.material, { opacity: 0.6, duration: 0.6, yoyo: true, repeat: 3 }, "tension")
            .to([bondOH.material.emissive, bondCH.material.emissive], { r: 1, duration: 0.4, yoyo: true, repeat: 4 }, "tension");

        tl.addLabel("break", "+=0.5")
            .set([bondOH, bondCH], { visible: false }, "break")
            .to(atomH.position, { x: 4.5, y: 4, z: 0, duration: 2.0, ease: "circ.in" }, "break")
            .to(atomH_C.position, { x: 5.5, y: 4, z: 0, duration: 2.0, ease: "circ.in" }, "break")
            .to(halo.material, { opacity: 0, duration: 0.5 }, "break")
            .add(() => { if(!this.isDisposed) this.addBond(atomH, atomH_C, 'single'); }, "break+=2.0"); 

        tl.to(cuWire.position, { x: "+=5", y: "-=4", duration: 2.0 }, "break+=1.0")
          .to(cuWire.material.emissive, { r: 0.1, g: 0, b: 0, duration: 1.5 }, "break+=1.0");

        tl.addLabel("formDouble", "-=0.2")
            .to(bondCO.material, { color: 0xffaa00, emissive: 0x442200, duration: 0.5 }, "formDouble") 
            .add(() => { 
                if (!this.isDisposed) {
                    this.pivot.remove(bondCO); 
                    this.bonds = this.bonds.filter(b => b.mesh !== bondCO); 
                }
            }, "formDouble+=0.5") 
            .to(atomH_C_remain.position, { x: atomC2.position.x + 0.0, y: atomC2.position.y + 1.3, duration: 1.5, ease: "power2.inOut" }, "formDouble+=0.5")
            .to(this.camera.position, { x: "+=0.3", y: "+=0.3", duration: 0.05, yoyo: true, repeat: 7 }, "formDouble+=0.8") 
            .to(this.camera.position, { x: 0, y: 0, duration: 0.1 })
            .add(() => {
                if (!this.isDisposed) {
                    const dbGroup = this.addBond(atomC2, atomO1, 'double'); 
                    dbGroup.children.forEach(c => {
                        c.material.emissiveIntensity = 4;
                        c.material.emissive.setHex(0xffffff); 
                        gsap.to(c.material.emissive, { r: 0.26, g: 0.13, b: 0, duration: 2.0, ease: "power2.out" }); 
                        gsap.to(c.material, { emissiveIntensity: 1, duration: 2.0, ease: "power2.out" });
                    });
                    
                    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 1, blending: THREE.AdditiveBlending });
                    const highlightHalo = new THREE.Mesh(new THREE.SphereGeometry(1.5, 32, 32), highlightMat);
                    dbGroup.add(highlightHalo);
                    gsap.to(highlightHalo.scale, { x: 3, y: 3, z: 3, duration: 1.0, ease: "power2.out" });
                    gsap.to(highlightHalo.material, { opacity: 0, duration: 1.0, ease: "power2.out", onComplete: () => { if (highlightHalo.parent) highlightHalo.parent.remove(highlightHalo); }});
                }
            }, "formDouble+=0.8");

        tl.to(this.interactionState, { targetCameraZ: 11, duration: 2.0 }, "+=2.0")
          .to(this.pivot.position, { x: 0, y: 0, duration: 2.0 }, "-=2.0")
          .to(this.pivot.rotation, { x: 0, y: 0, z: 0, duration: 2.0 }, "-=2.0")
          .add(() => { 
              if(cuWire.parent) cuWire.parent.remove(cuWire); 
              this.interactionState.isAnimating = false; // 释放交互锁
              this.resetIdleTimer(); 
          });
          
        return tl;
    }
}