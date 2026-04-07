/**
 * 魔法反应调度导演 (ReactionDirector.js)
 * 【升级版】任务驱动提示；点错化学键时只保留颤动变红特效，不再弹出错误提示窗
 */
class ReactionDirector {
    constructor(engine) {
        this.engine = engine;
        this.sm = engine.sceneManager;
        this.um = engine.uiManager;
        this.tp = engine.topology; 

        this.isReactionPlaying = false; 
        this.interactiveReactionState = 'idle'; 
        this.activeReactionSite = null; 
        
        this.cinematicTimeout = null; 
        this.brokenOxidationBonds = 0;
    }

    resetReactionState() {
        this.isReactionPlaying = false;
        this.interactiveReactionState = 'idle';
        if (this.cinematicTimeout) clearTimeout(this.cinematicTimeout);
        if (this.atomNa) { this.sm.removeAtom(this.atomNa); this.atomNa = null; }
        if (this.atomCu) { this.sm.removeAtom(this.atomCu); this.atomCu = null; }
        if (this.bondPulse) this.bondPulse.kill(); 
        if (this.bondScalePulse) this.bondScalePulse.kill();
        if (this.atomPulse) this.atomPulse.kill();
        if (typeof gsap !== 'undefined' && this.sm.camera) gsap.killTweensOf(this.sm.camera.position);
        const eqDiv = document.getElementById('equation-minigame'); 
        if (eqDiv) eqDiv.remove();
    }

    async playSodiumReaction() {
        this.resetReactionState();
        let reactionSite = this.tp.findEthanolHydroxylGroup();
        if (!reactionSite) { 
            this.sm.autoBuildEthanol();
            reactionSite = this.tp.findEthanolHydroxylGroup();
            if (!reactionSite) return;
        }

        this.isReactionPlaying = true;
        this.activeReactionSite = reactionSite;
        
        this.um.playCinematicMicroAnimation('sodium');
        this.cinematicTimeout = setTimeout(() => { this.startInteractiveSodiumReaction(); }, 8500);
    }

    startInteractiveSodiumReaction() {
        const btnRetry = document.getElementById('btn-retry-interaction');
        if (btnRetry) btnRetry.classList.remove('hidden');

        const { atomO, atomH, bondOH } = this.activeReactionSite;
        const hydroxylMidPoint = new THREE.Vector3().addVectors(atomO.position, atomH.position).multiplyScalar(0.5);
        this.atomNa = this.createMagicalSodiumAtom();
        
        const naPosX = hydroxylMidPoint.x + 5; const naPosY = hydroxylMidPoint.y + 4;
        this.atomNa.position.set(naPosX, naPosY, 0);
        this.sm.scene.add(this.atomNa); this.sm.atoms.push(this.atomNa); 

        const camTargetX = (hydroxylMidPoint.x + naPosX) / 2; const camTargetY = (hydroxylMidPoint.y + naPosY) / 2;
        gsap.to(this.sm.camera.position, { x: camTargetX, y: camTargetY, z: 22, duration: 2, ease: "power2.inOut" });
        
        // 🌟 任务导向提示，不指出具体步骤
        this.um.showMagicNotice("🗡️ 互动阶段", "请寻找并切断发生置换反应的化学键，随后引导金属钠(Na)完成置换！");

        this.bondPulse = gsap.to(bondOH.mesh.material.emissive, { r: 1, g: 0, b: 0, duration: 0.5, yoyo: true, repeat: -1 });
        this.bondScalePulse = gsap.to(bondOH.mesh.scale, { x: 3, z: 3, duration: 0.5, yoyo: true, repeat: -1 });
        this.interactiveReactionState = 'awaiting_bond_break';
    }

    handleBondClick(clickedBondObj) {
        if (this.interactiveReactionState !== 'awaiting_bond_break') return;
        
        // 🌟 仅保留颤动特效，删除弹窗提示
        if (clickedBondObj !== this.activeReactionSite.bondOH) {
            if (typeof gsap !== 'undefined') {
                gsap.to(clickedBondObj.mesh.scale, { x: 2.5, z: 2.5, duration: 0.05, yoyo: true, repeat: 5 });
                gsap.to(clickedBondObj.mesh.material.emissive, { r: 1, g: 0, b: 0, duration: 0.05, yoyo: true, repeat: 5 });
            }
            return; 
        }

        this.interactiveReactionState = 'awaiting_na_drag';
        if (this.bondPulse) this.bondPulse.kill(); 
        if (this.bondScalePulse) this.bondScalePulse.kill();

        const { atomO, atomH, bondOH } = this.activeReactionSite;
        this.sm.scene.remove(bondOH.mesh); this.sm.bonds = this.sm.bonds.filter(b => b !== bondOH);
        this.tp.graph.get(atomO).splice(this.tp.graph.get(atomO).indexOf(atomH), 1);
        this.tp.graph.get(atomH).splice(this.tp.graph.get(atomH).indexOf(atomO), 1);
        atomO.userData.bonds--; atomH.userData.bonds--;
        atomH.userData.maxBonds = 0; 
        
        atomO.material.emissive.setHex(0xcc00cc);
        if (typeof gsap !== 'undefined') gsap.to(atomH.position, { x: atomO.position.x + 4, y: atomO.position.y + 4, duration: 0.6, ease: "power2.out" });
    }

    playOxidationReaction() {
        this.resetReactionState();
        let site = this.tp.findOxidationSite();
        if (!site) { 
            this.sm.autoBuildEthanol();
            site = this.tp.findOxidationSite();
            if (!site) return;
        }

        this.isReactionPlaying = true;
        this.activeReactionSite = site;

        this.um.playCinematicMicroAnimation('oxidation');
        this.cinematicTimeout = setTimeout(() => { this.startInteractiveOxidationReaction(); }, 8500);
    }

    startInteractiveOxidationReaction() {
        const btnRetry = document.getElementById('btn-retry-interaction');
        if (btnRetry) btnRetry.classList.remove('hidden');

        this.activeReactionSite = this.tp.findOxidationSite();
        const site = this.activeReactionSite;
        if(!site) return;

        this.atomCu = this.createMagicalCopperAtom();
        this.atomCu.position.set(0, 6, 0); 
        this.sm.scene.add(this.atomCu);
        this.sm.atoms.push(this.atomCu); 

        if(this.sm.dragControls) this.sm.dragControls.enabled = true;
        this.interactiveReactionState = 'awaiting_cu_drag';
        this.brokenOxidationBonds = 0;
        site.bondOH_broken = false;
        site.bondCH_broken = false;

        // 🌟 任务导向提示
        this.um.showMagicNotice("🗡️ 互动阶段", "请引导铜(Cu)原子介入分子的反应核心，开启催化氧化！");
    }

    handleOxidationBondClick(clickedBondObj) {
        if (this.interactiveReactionState !== 'awaiting_oxidation_bond_break') return;
        
        const site = this.activeReactionSite;
        let isCorrectBond = false;

        if (clickedBondObj === site.bondOH && !site.bondOH_broken) {
            site.bondOH_broken = true; isCorrectBond = true;
            this.sm.scene.remove(site.bondOH.mesh); this.sm.bonds = this.sm.bonds.filter(b => b !== site.bondOH);
            this.tp.graph.get(site.atomO).splice(this.tp.graph.get(site.atomO).indexOf(site.atomH_O), 1);
            this.tp.graph.get(site.atomH_O).splice(this.tp.graph.get(site.atomH_O).indexOf(site.atomO), 1);
            site.atomO.userData.bonds--; site.atomH_O.userData.bonds--;
            gsap.to(site.atomH_O.position, { x: "+=1.5", y: "+=1.5", duration: 0.4 });
        } 
        else if (clickedBondObj === site.bondCH && !site.bondCH_broken) {
            site.bondCH_broken = true; isCorrectBond = true;
            this.sm.scene.remove(site.bondCH.mesh); this.sm.bonds = this.sm.bonds.filter(b => b !== site.bondCH);
            this.tp.graph.get(site.atomC).splice(this.tp.graph.get(site.atomC).indexOf(site.atomH_C), 1);
            this.tp.graph.get(site.atomH_C).splice(this.tp.graph.get(site.atomH_C).indexOf(site.atomC), 1);
            site.atomC.userData.bonds--; site.atomH_C.userData.bonds--;
            gsap.to(site.atomH_C.position, { x: "+=1.5", y: "-=1.5", duration: 0.4 });
        }

        // 🌟 仅保留颤动特效，删除弹窗提示
        if (!isCorrectBond) {
            if (typeof gsap !== 'undefined') {
                gsap.to(clickedBondObj.mesh.scale, { x: 2.5, z: 2.5, duration: 0.05, yoyo: true, repeat: 5 });
                gsap.to(clickedBondObj.mesh.material.emissive, { r: 1, g: 0, b: 0, duration: 0.05, yoyo: true, repeat: 5 });
            }
            return; 
        }

        this.brokenOxidationBonds++;
        if (this.brokenOxidationBonds === 2) {
            if (this.bondPulse) this.bondPulse.kill();
            if (this.bondScalePulse) this.bondScalePulse.kill();
            
            this.interactiveReactionState = 'awaiting_double_bond';
            // 🌟 任务导向提示
            this.um.showMagicNotice("✨ 重构骨架", "原子已被脱去，结构极度不稳定，请尝试重构分子骨架！");

            if (typeof gsap !== 'undefined') {
                const midX = (site.atomH_O.position.x + site.atomH_C.position.x) / 2 + 5;
                const midY = (site.atomH_O.position.y + site.atomH_C.position.y) / 2 + 4;
                site.atomH_O.material.transparent = false; site.atomH_C.material.transparent = false;
                gsap.to(site.atomH_O.position, { x: midX - 0.4, y: midY, z: 0, duration: 1.5, ease: "power2.inOut" });
                gsap.to(site.atomH_C.position, { x: midX + 0.4, y: midY, z: 0, duration: 1.5, ease: "power2.inOut" });
                setTimeout(() => { this.sm.createBondVisual(site.atomH_O, site.atomH_C); }, 1400);

                gsap.to(this.atomCu.material.emissive, { r: 0.1, g: 0, b: 0, duration: 1 });
                gsap.to(this.atomCu.material.color, { r: 0.5, g: 0.2, b: 0.1, duration: 1 });

                this.atomPulse = gsap.to([site.atomO.scale, site.atomC.scale], { x: 1.4, y: 1.4, z: 1.4, duration: 0.5, yoyo: true, repeat: -1 });
                gsap.to([site.atomO.material.emissive, site.atomC.material.emissive], { r: 1, g: 0.6, b: 0, duration: 0.5, yoyo: true, repeat: -1 });
            }
        }
    }

    checkInteractiveSnap(draggedAtom, targetAtom) {
        if (this.interactiveReactionState === 'awaiting_na_drag') {
            const { atomO, atomH } = this.activeReactionSite;
            if (draggedAtom === this.atomNa && targetAtom === atomO) {
                this.interactiveReactionState = 'completed';
                let offsetDir = new THREE.Vector3().subVectors(this.atomNa.position, atomO.position);
                if (offsetDir.lengthSq() < 0.1) offsetDir.set(1, 1, 0); offsetDir.normalize();
                const safePos = atomO.position.clone().add(offsetDir.multiplyScalar(2.2));
                if (typeof gsap !== 'undefined') gsap.to(this.atomNa.position, { x: safePos.x, y: safePos.y, z: safePos.z, duration: 0.3, ease: "power2.out", onComplete: () => this.executeSodiumVisuals(atomO, atomH) });
                else { this.atomNa.position.copy(safePos); this.executeSodiumVisuals(atomO, atomH); }
                return true; 
            }
        }
        
        if (this.interactiveReactionState === 'awaiting_cu_drag') {
            const site = this.activeReactionSite;
            if (draggedAtom === this.atomCu && targetAtom === site.atomO) {
                this.interactiveReactionState = 'awaiting_oxidation_bond_break';
                let offsetDir = new THREE.Vector3().subVectors(this.atomCu.position, site.atomO.position);
                if (offsetDir.lengthSq() < 0.1) offsetDir.set(-1, 1, 0); offsetDir.normalize();
                const safePos = site.atomO.position.clone().add(offsetDir.multiplyScalar(2.5));
                
                if (typeof gsap !== 'undefined') gsap.to(this.atomCu.position, { x: safePos.x, y: safePos.y, z: safePos.z, duration: 0.3, ease: "power2.out" });
                else this.atomCu.position.copy(safePos);

                // 🌟 任务导向提示
                this.um.showMagicNotice("🗡️ 精准脱氢", "铜原子介入成功！请寻找并依次切断需要脱去原子的化学键！");
                
                this.bondPulse = gsap.to([site.bondOH.mesh.material.emissive, site.bondCH.mesh.material.emissive], { r: 1, g: 0, b: 0, duration: 0.5, yoyo: true, repeat: -1 });
                this.bondScalePulse = gsap.to([site.bondOH.mesh.scale, site.bondCH.mesh.scale], { x: 3, z: 3, duration: 0.5, yoyo: true, repeat: -1 });
                return true;
            }
        }

        if (this.interactiveReactionState === 'awaiting_double_bond') {
            const site = this.activeReactionSite;
            if ((draggedAtom === site.atomO && targetAtom === site.atomC) || (draggedAtom === site.atomC && targetAtom === site.atomO)) {
                this.interactiveReactionState = 'animating_products';
                if (this.atomPulse) this.atomPulse.kill();
                gsap.to([site.atomO.scale, site.atomC.scale], { x: 1, y: 1, z: 1, duration: 0.3 });
                gsap.to(site.atomO.material.emissive, { r: 0.4, g: 0, b: 0, duration: 0.3 }); 
                gsap.to(site.atomC.material.emissive, { r: 0.06, g: 0.06, b: 0.06, duration: 0.3 }); 
                this.executeOxidationVisuals(site);
                return true;
            }
        }
        return false; 
    }

    executeSodiumVisuals(atomO, atomH) {
        try {
            if (this.sm.createIonicBondVisual) this.sm.createIonicBondVisual(atomO, this.atomNa);
            this.atomNa.userData.bonds++; atomO.userData.bonds++;
            this.tp.updateGraph(this.atomNa, atomO);

            if (typeof gsap !== 'undefined') {
                gsap.to(this.atomNa.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.8 });
                atomH.material.transparent = false; atomH.material.opacity = 1.0;
                gsap.to(atomH.position, { x: atomO.position.x + 5, y: atomO.position.y, z: 0, duration: 1.5, ease: "power2.inOut" });
                gsap.to(atomH.scale, { x: 1, y: 1, z: 1, duration: 1.5 });
            }
        } catch (e) {}
        this.finalizeInteractiveReaction('sodium', atomO);
    }

    executeOxidationVisuals(site) {
        try {
            site.atomH_O.userData.maxBonds = 0; site.atomH_C.userData.maxBonds = 0; 
            const oldCOBond = this.sm.bonds.find(b => (b.a === site.atomC && b.b === site.atomO) || (b.a === site.atomO && b.b === site.atomC));
            if(oldCOBond) {
                this.sm.scene.remove(oldCOBond.mesh);
                this.sm.bonds = this.sm.bonds.filter(b => b !== oldCOBond);
            }
            if(this.sm.createDoubleBondVisual) {
                this.sm.createDoubleBondVisual(site.atomC, site.atomO);
                if (typeof gsap !== 'undefined') {
                    const newBondGroup = this.sm.bonds[this.sm.bonds.length - 1].mesh;
                    newBondGroup.scale.set(0.1, 0.1, 0.1);
                    gsap.to(newBondGroup.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 1, ease: "elastic.out(1, 0.3)" });
                }
            }
            this.tp.rebuildGraph();
            setTimeout(() => this.finalizeInteractiveReaction('oxidation', site.atomO), 1500);
        } catch (e) {}
    }

    finalizeInteractiveReaction(reactionType, focusAtom = null) {
        this.isReactionPlaying = false; 
        try {
            if (typeof gsap !== 'undefined' && this.sm.camera) {
                let camX = focusAtom ? focusAtom.position.x + 2.5 : 0;
                let camY = focusAtom ? focusAtom.position.y : 0;
                gsap.to(this.sm.camera.position, { z: 28, x: camX, y: camY, duration: 2, ease: "power1.inOut" });
            }
        } catch(e) {}

        const ui = this.um || (window.app && window.app.uiManager); 
        if (ui) {
            setTimeout(() => { ui.showEquationMinigame(reactionType); }, 1500);
        }
    }

    retryInteractiveReaction() {
        const eqDiv = document.getElementById('equation-minigame'); if (eqDiv) eqDiv.remove();
        const aiPanel = document.getElementById('ai-trial-panel'); if (aiPanel) aiPanel.classList.add('hidden');

        if (this.interactiveReactionState === 'awaiting_na_drag' || this.atomNa) {
            this.resetReactionState();
            this.sm.autoBuildEthanol();
            this.um.renderMiniModel('ethanol');
            this.isReactionPlaying = true;
            this.activeReactionSite = this.tp.findEthanolHydroxylGroup();
            this.startInteractiveSodiumReaction();
        } else if (this.interactiveReactionState === 'awaiting_cu_drag' || this.interactiveReactionState === 'awaiting_oxidation_bond_break' || this.interactiveReactionState === 'awaiting_double_bond' || this.atomCu) {
            this.resetReactionState();
            this.sm.autoBuildEthanol();
            this.um.renderMiniModel('ethanol');
            this.isReactionPlaying = true;
            this.activeReactionSite = this.tp.findOxidationSite();
            setTimeout(() => { this.startInteractiveOxidationReaction(); }, 500);
        } else {
            this.resetReactionState();
            this.sm.autoBuildEthanol();
        }
    }

    createMagicalSodiumAtom() {
        const material = this.sm.createAtomMaterial('Na');
        material.emissive.setHex(0xffaa00); material.emissiveIntensity = 0.5;
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), material);
        mesh.userData = { type: 'Na', bonds: 0, maxBonds: 1, id: 'Na_Reaction_Atom', isDragging: false };
        return mesh;
    }

    createMagicalCopperAtom() {
        const material = this.sm.createAtomMaterial('Cu');
        material.emissive.setHex(0xff3300); material.emissiveIntensity = 0.8; 
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.3, 32, 32), material);
        mesh.userData = { type: 'Cu', bonds: 0, maxBonds: 0, id: 'Cu_Reaction_Atom', isDragging: false };
        return mesh;
    }
}