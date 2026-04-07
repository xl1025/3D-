/**
 * 主法阵核心调度器 (SceneManager.js)
 * 【工业级重构版：引入材质池(Material Pooling)、ResizeObserver 防形变、严格内存释放】
 */
class SceneManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.01); 
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 30);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        this.container.appendChild(this.renderer.domElement);

        this.atoms = []; this.bonds = []; this.SNAP_DISTANCE = 4.0; 
        this.isHighlighted = false; this.highlightHalos = []; 
        this.physicsEngine = null; 

        // 🌟 性能优化 1：初始化材质与几何体缓存池
        this.materialCache = {};
        this.geometryCache = {};
        this.initCaches();

        this.initLights();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        
        // 🌟 性能优化 2：废弃 window.resize，使用 ResizeObserver 精准监听容器变化，防止分屏动画导致的拉伸形变
        const resizeObserver = new ResizeObserver(() => this.onWindowResize());
        resizeObserver.observe(this.container);
    }

    initCaches() {
        const elements = ['C', 'H', 'O', 'Na', 'Cu'];
        elements.forEach(el => {
            this.materialCache[el] = this.createAtomMaterial(el);
            let radius = el === 'C' ? 1.2 : (el === 'H' ? 0.6 : (el === 'O' ? 1.0 : 1.3));
            this.geometryCache[el] = new THREE.SphereGeometry(radius, 32, 32);
        });
    }

    initLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const pointLight = new THREE.PointLight(0xffffff, 1.2);
        pointLight.position.set(10, 15, 10);
        this.scene.add(pointLight);
        const magicLight = new THREE.PointLight(0x4444ff, 0.8);
        magicLight.position.set(-10, -10, -10);
        this.scene.add(magicLight);
    }

    createAtomMaterial(element) {
        let bgColorStr, textColorStr, emissiveHex;
        if (element === 'C') { bgColorStr = '#2a2a2a'; textColorStr = '#ffffff'; emissiveHex = 0x111111; }
        else if (element === 'H') { bgColorStr = '#ffffff'; textColorStr = '#222222'; emissiveHex = 0x444444; }
        else if (element === 'O') { bgColorStr = '#cc0000'; textColorStr = '#ffffff'; emissiveHex = 0x660000; }
        else if (element === 'Na') { bgColorStr = '#aaaaaa'; textColorStr = '#ffdd00'; emissiveHex = 0x554400; }
        else if (element === 'Cu') { bgColorStr = '#cc5500'; textColorStr = '#ffffff'; emissiveHex = 0x883300; } 
        else { bgColorStr = '#888888'; textColorStr = '#ffffff'; emissiveHex = 0x000000; }

        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColorStr; ctx.fillRect(0, 0, 512, 256);
        ctx.font = 'bold 120px "Courier New", Arial, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 8; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;
        ctx.fillStyle = textColorStr;
        ctx.fillText(element, 128, 128); ctx.fillText(element, 384, 128); 

        const colorMap = new THREE.CanvasTexture(canvas);
        colorMap.needsUpdate = true;
        if (typeof THREE.SRGBColorSpace !== 'undefined') colorMap.colorSpace = THREE.SRGBColorSpace;

        return new THREE.MeshStandardMaterial({
            map: colorMap, roughness: 0.4, metalness: 0.3,
            emissive: emissiveHex, emissiveIntensity: 0.6
        });
    }

    createAtom(element) {
        let maxBonds = element === 'C' ? 4 : (element === 'H' ? 1 : (element === 'O' ? 2 : 1));
        
        // 🌟 性能优化 3：直接从缓存池中复用 Geometry 和 Material，极大地节省 WebGL 内存
        const material = this.materialCache[element];
        const geometry = this.geometryCache[element];
        const mesh = new THREE.Mesh(geometry, material);
        
        const randomX = (Math.random() - 0.5) * 24;
        const randomY = (Math.random() - 0.5) * 16;
        mesh.position.set(randomX, randomY, 0);
        
        mesh.userData = { 
            type: element, bonds: 0, maxBonds: maxBonds, 
            id: THREE.MathUtils.generateUUID(), isDragging: false 
        };
        
        this.scene.add(mesh);
        this.atoms.push(mesh);
        return mesh;
    }

    autoBuildEthanol() {
        this.clearAll();
        
        const c1 = this.createAtom('C'); c1.position.set(-2, 0, 0);
        const c2 = this.createAtom('C'); c2.position.set(1.2, 0, 0);
        const o1 = this.createAtom('O'); o1.position.set(4, -1, 0);
        
        const h1 = this.createAtom('H'); h1.position.set(-2, 2.5, 0);
        const h2 = this.createAtom('H'); h2.position.set(-2, -2.5, 0);
        const h3 = this.createAtom('H'); h3.position.set(-4.5, 0, 0);
        const h4 = this.createAtom('H'); h4.position.set(1.2, 2.5, 0);
        const h5 = this.createAtom('H'); h5.position.set(1.2, -2.5, 0);
        const h6 = this.createAtom('H'); h6.position.set(5.5, 1, 0);

        const bondList = [[c1, c2], [c2, o1], [c1, h1], [c1, h2], [c1, h3], [c2, h4], [c2, h5], [o1, h6]];
        bondList.forEach(pair => {
            this.createBondVisual(pair[0], pair[1]);
            pair[0].userData.bonds++; pair[1].userData.bonds++;
            if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.updateGraph(pair[0], pair[1]);
        });

        if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.analyzeStructure();
    }

    checkIfAlreadyBonded(atomA, atomB) {
        return this.bonds.some(bond => (bond.a === atomA && bond.b === atomB) || (bond.a === atomB && bond.b === atomA));
    }

    createBondVisual(atomA, atomB, colorHex = 0x88ccff) {
        const distance = Math.max(0.1, atomA.position.distanceTo(atomB.position));
        const visualLength = distance * 0.8; 
        const geometry = new THREE.CylinderGeometry(0.15, 0.15, visualLength, 8);
        const material = new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.7, emissive: 0x224488 });
        const bondMesh = new THREE.Mesh(geometry, material);
        const midPoint = new THREE.Vector3().addVectors(atomA.position, atomB.position).multiplyScalar(0.5);
        bondMesh.position.copy(midPoint);
        bondMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), atomB.position.clone().sub(atomA.position).normalize());
        this.scene.add(bondMesh);
        this.bonds.push({ mesh: bondMesh, a: atomA, b: atomB, baseDistance: distance, type: 'single' });
    }

    createDoubleBondVisual(atomA, atomB, colorHex = 0xffaa00) {
        const distance = Math.max(0.1, atomA.position.distanceTo(atomB.position));
        const visualLength = distance * 0.65;
        const geometry = new THREE.CylinderGeometry(0.18, 0.18, visualLength, 12);
        const material = new THREE.MeshStandardMaterial({ color: colorHex, transparent: true, opacity: 0.9, emissive: 0xff6600, emissiveIntensity: 1.2 });
        const bondMesh1 = new THREE.Mesh(geometry, material);
        const bondMesh2 = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(bondMesh1); group.add(bondMesh2);
        bondMesh1.position.x = 0.35; bondMesh2.position.x = -0.35;
        const midPoint = new THREE.Vector3().addVectors(atomA.position, atomB.position).multiplyScalar(0.5);
        group.position.copy(midPoint);
        group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), atomB.position.clone().sub(atomA.position).normalize());
        this.scene.add(group);
        this.bonds.push({ mesh: group, a: atomA, b: atomB, baseDistance: distance, type: 'double' });
    }

    createIonicBondVisual(atomA, atomB) {
        const distance = Math.max(0.1, atomA.position.distanceTo(atomB.position));
        const geometry = new THREE.CylinderGeometry(0.2, 0.2, distance, 12);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8, emissive: 0x00aaff, emissiveIntensity: 1.5 });
        const bondMesh = new THREE.Mesh(geometry, material);
        const midPoint = new THREE.Vector3().addVectors(atomA.position, atomB.position).multiplyScalar(0.5);
        bondMesh.position.copy(midPoint);
        bondMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), atomB.position.clone().sub(atomA.position).normalize());
        this.scene.add(bondMesh);
        this.bonds.push({ mesh: bondMesh, a: atomA, b: atomB, baseDistance: distance, type: 'ionic' });
        if (typeof gsap !== 'undefined') {
            gsap.to(bondMesh.scale, { x: 1.4, z: 1.4, duration: 1.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
            gsap.to(material, { opacity: 0.4, emissiveIntensity: 0.5, duration: 1.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
        }
    }

    // 🌟 性能优化 4：严格的 Dispose 机制。动态生成的键（圆柱体）移除时彻底销毁材质和几何体
    removeAtom(atom) {
        const bondsToRemove = this.bonds.filter(b => b.a === atom || b.b === atom);
        bondsToRemove.forEach(bond => {
            this.scene.remove(bond.mesh);
            
            // 销毁动态创建的键的几何体和材质
            if (bond.mesh.type === 'Group') {
                bond.mesh.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
            } else {
                if (bond.mesh.geometry) bond.mesh.geometry.dispose();
                if (bond.mesh.material) bond.mesh.material.dispose();
            }

            const otherAtom = bond.a === atom ? bond.b : bond.a;
            otherAtom.userData.bonds--;
        });
        
        this.bonds = this.bonds.filter(b => b.a !== atom && b.b !== atom);
        
        this.scene.remove(atom);
        const index = this.atoms.indexOf(atom);
        if (index > -1) this.atoms.splice(index, 1);
        
        if (window.app && window.app.chemistryEngine) {
            window.app.chemistryEngine.rebuildGraph();
            window.app.chemistryEngine.analyzeStructure(); 
        }
    }

    undoLast() {
        if (this.atoms.length === 0) return;
        const lastAtom = this.atoms[this.atoms.length - 1];
        if (typeof gsap !== 'undefined') gsap.to(lastAtom.scale, { x: 0, y: 0, z: 0, duration: 0.3, onComplete: () => this.removeAtom(lastAtom) });
        else this.removeAtom(lastAtom);
    }

    clearAll() {
        while(this.atoms.length > 0) this.removeAtom(this.atoms[0]);
        this.isHighlighted = false;
        const btnHighlight = document.getElementById('btn-highlight-group');
        if (btnHighlight) btnHighlight.innerText = "🎯 圈画官能团";
        if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.resetReactionState();
    }

    toggleHighlightFunctionalGroup(moleculeType) {
        const btnHighlight = document.getElementById('btn-highlight-group');
        if (this.isHighlighted) {
            this.highlightHalos.forEach(item => { item.parent.remove(item.mesh); });
            this.highlightHalos = [];
            this.isHighlighted = false;
            if(btnHighlight) btnHighlight.innerText = "🎯 圈画官能团";
            return;
        }
        let targetAtoms = [];
        const oxygen = this.atoms.find(a => a.userData.type === 'O');
        if (!oxygen) return; 

        if (moleculeType === 'ethanol') {
            targetAtoms.push(oxygen);
            const connectedBond = this.bonds.find(b => (b.a === oxygen && b.b.userData.type === 'H') || (b.b === oxygen && b.a.userData.type === 'H'));
            if (connectedBond) targetAtoms.push(connectedBond.a === oxygen ? connectedBond.b : connectedBond.a);
        } else if (moleculeType === 'dimethyl_ether') { targetAtoms.push(oxygen); }
        
        targetAtoms.forEach(atom => {
            const radius = atom.geometry.parameters.radius * 1.6;
            const geo = new THREE.SphereGeometry(radius, 32, 32);
            const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, wireframe: true });
            const halo = new THREE.Mesh(geo, mat);
            atom.add(halo); 
            this.highlightHalos.push({ parent: atom, mesh: halo });
            if (typeof gsap !== 'undefined') gsap.to(halo.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
        });
        this.isHighlighted = true;
        if(btnHighlight) btnHighlight.innerText = "❌ 取消圈画";
    }

    onWindowResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(this.animate);
        if (this.physicsEngine) this.physicsEngine.applyPhysics();
        const time = Date.now() * 0.001;
        this.atoms.forEach((atom, index) => {
            if(atom.userData.bonds === 0 && !atom.userData.isDragging) atom.position.y += Math.sin(time * 2 + index) * 0.002; 
            atom.quaternion.copy(this.camera.quaternion);
        });
        this.renderer.render(this.scene, this.camera);
    }
}