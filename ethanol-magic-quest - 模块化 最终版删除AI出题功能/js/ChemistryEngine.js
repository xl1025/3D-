/**
 * 炼金引擎总枢纽 (ChemistryEngine.js)
 * 【优化版：彻底移除全局自动成键，强制要求学生手动拖拽拼装】
 */
class ChemistryEngine {
    constructor(sceneManager, uiManager) {
        this.sceneManager = sceneManager;
        this.uiManager = uiManager;
        this.topology = new TopologyParser(this);
        this.director = new ReactionDirector(this);
    }

    get interactiveReactionState() {
        return this.director.interactiveReactionState;
    }

    // 🌟 核心修复1：直接阻断后台的自动扫描成键机制！
    // 强制要求玩家必须通过鼠标/手指拖拽 (InteractionManager 的 dragend 事件) 才能完成拼接。
    checkAndFormBonds() {
        return; 
    }

    insertAtomIntoBond(newAtom, bondObj) {
        const atomA = bondObj.a; const atomB = bondObj.b;

        this.sceneManager.scene.remove(bondObj.mesh);
        this.sceneManager.bonds = this.sceneManager.bonds.filter(b => b !== bondObj);
        
        if (this.topology.graph.has(atomA) && this.topology.graph.has(atomB)) {
            this.topology.graph.get(atomA).splice(this.topology.graph.get(atomA).indexOf(atomB), 1);
            this.topology.graph.get(atomB).splice(this.topology.graph.get(atomB).indexOf(atomA), 1);
        }
        
        atomA.userData.bonds--; atomB.userData.bonds--;
        const midPoint = new THREE.Vector3().addVectors(atomA.position, atomB.position).multiplyScalar(0.5);
        newAtom.position.copy(midPoint);

        this.sceneManager.createBondVisual(atomA, newAtom);
        this.sceneManager.createBondVisual(newAtom, atomB);
        
        atomA.userData.bonds++; newAtom.userData.bonds++;
        atomB.userData.bonds++; newAtom.userData.bonds++;

        this.topology.updateGraph(atomA, newAtom); this.topology.updateGraph(newAtom, atomB);

        const dirA = new THREE.Vector3().subVectors(atomA.position, newAtom.position).normalize();
        const dirB = new THREE.Vector3().subVectors(atomB.position, newAtom.position).normalize();
        
        if (typeof gsap !== 'undefined') {
            gsap.to(atomA.position, { x: atomA.position.x + dirA.x * 1.5, y: atomA.position.y + dirA.y * 1.5, duration: 0.4, ease: "back.out(1.2)" });
            gsap.to(atomB.position, { x: atomB.position.x + dirB.x * 1.5, y: atomB.position.y + dirB.y * 1.5, duration: 0.4, ease: "back.out(1.2)" });
        }
        this.topology.analyzeStructure();
    }

    updateGraph(a, b) { this.topology.updateGraph(a, b); }
    rebuildGraph() { this.topology.rebuildGraph(); }
    analyzeStructure() { this.topology.analyzeStructure(); }

    playSodiumReaction() { this.director.playSodiumReaction(); }
    playOxidationReaction() { this.director.playOxidationReaction(); }
    
    handleBondClick(bondObj) { this.director.handleBondClick(bondObj); }
    handleOxidationBondClick(bondObj) { this.director.handleOxidationBondClick(bondObj); } 
    
    checkInteractiveSnap(draggedAtom, targetAtom) { return this.director.checkInteractiveSnap(draggedAtom, targetAtom); }
    retryInteractiveReaction() { if(this.director) this.director.retryInteractiveReaction(); }
    resetReactionState() { if(this.director) this.director.resetReactionState(); }
}