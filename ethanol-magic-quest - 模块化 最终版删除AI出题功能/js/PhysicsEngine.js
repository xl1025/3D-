/**
 * 微观物理场引擎 (PhysicsEngine.js)
 * 专职处理魔法阵内的原子斥力、化学键弹簧拉力及位置推演
 */
class PhysicsEngine {
    constructor(sceneManager) {
        this.sm = sceneManager; // 获取主法阵的引用
        this.BOND_LENGTH = 2.2; // 稳定化学键的基础长度
    }

    // 拖动或物理推演时，实时更新相连键的位置与拉伸比例
    updateConnectedBonds(atom) {
        this.sm.bonds.forEach(bond => {
            if (bond.a === atom || bond.b === atom) {
                const currentDistance = Math.max(0.1, bond.a.position.distanceTo(bond.b.position));
                const midPoint = new THREE.Vector3().addVectors(bond.a.position, bond.b.position).multiplyScalar(0.5);
                bond.mesh.position.copy(midPoint);
                bond.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bond.b.position.clone().sub(bond.a.position).normalize());
                bond.mesh.scale.y = currentDistance / bond.baseDistance;
            }
        });
    }

    // 运行物理模拟：弹簧模型与库仑斥力
    applyPhysics() {
        const kBond = 0.08, kRepel = 1.5, damping = 0.8;
        
        // 1. 初始化受力向量
        this.sm.atoms.forEach(atom => {
            if (!atom.userData.velocity) atom.userData.velocity = new THREE.Vector3();
            atom.userData.force = new THREE.Vector3();
        });
        
        // 2. 计算化学键的弹簧拉力
        this.sm.bonds.forEach(bond => {
            const delta = new THREE.Vector3().subVectors(bond.b.position, bond.a.position);
            const dist = delta.length();
            if(dist === 0) return;
            const dir = delta.normalize();
            const displacement = dist - this.BOND_LENGTH;
            const force = dir.multiplyScalar(kBond * displacement);
            bond.a.userData.force.add(force);
            bond.b.userData.force.sub(force);
        });
        
        // 3. 计算原子间的静电斥力
        this.sm.atoms.forEach(centerAtom => {
            const neighbors = [];
            this.sm.bonds.forEach(bond => {
                if(bond.a === centerAtom) neighbors.push(bond.b);
                if(bond.b === centerAtom) neighbors.push(bond.a);
            });
            for(let i=0; i<neighbors.length; i++) {
                for(let j=i+1; j<neighbors.length; j++) {
                    const n1 = neighbors[i], n2 = neighbors[j];
                    const delta = new THREE.Vector3().subVectors(n1.position, n2.position);
                    let dist = delta.length();
                    if(dist < 0.1) { delta.set(Math.random() - 0.5, Math.random() - 0.5, 0).normalize(); dist = 0.1; }
                    const forceMag = Math.min(kRepel / (dist * dist), 0.5); 
                    const force = delta.normalize().multiplyScalar(forceMag);
                    n1.userData.force.add(force);
                    n2.userData.force.sub(force);
                }
            }
        });
        
        // 4. 更新位置与速度
        this.sm.atoms.forEach(atom => {
            if (atom.userData.isDragging) return;
            atom.userData.velocity.add(atom.userData.force);
            atom.userData.velocity.multiplyScalar(damping);
            if (atom.userData.velocity.length() > 0.5) atom.userData.velocity.clampLength(0, 0.5);
            if (atom.userData.velocity.lengthSq() > 0.0001) {
                atom.position.add(atom.userData.velocity);
                atom.position.z = 0; 
                this.updateConnectedBonds(atom);
            }
        });
    }
}