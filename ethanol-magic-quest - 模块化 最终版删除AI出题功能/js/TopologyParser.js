/**
 * 魔法拓扑解构仪 (TopologyParser.js)
 * 【防呆重构版：引入 BFS 连通性校验，防止散落原子误触发通关】
 */
class TopologyParser {
    constructor(engine) {
        this.engine = engine;
        this.graph = new Map();
    }

    updateGraph(atomA, atomB) {
        if (!this.graph.has(atomA)) this.graph.set(atomA, []);
        if (!this.graph.has(atomB)) this.graph.set(atomB, []);
        if (!this.graph.get(atomA).includes(atomB)) this.graph.get(atomA).push(atomB);
        if (!this.graph.get(atomB).includes(atomA)) this.graph.get(atomB).push(atomA);
    }

    rebuildGraph() {
        this.graph.clear();
        this.engine.sceneManager.bonds.forEach(bond => {
            this.updateGraph(bond.a, bond.b);
        });
    }

    // 🌟 新增算法：广度优先搜索(BFS)划分连通分量，找出场景里所有“连接在一起”的分子团
    getConnectedComponents() {
        const visited = new Set();
        const components = [];

        for (let atom of this.graph.keys()) {
            if (!visited.has(atom)) {
                const comp = [];
                const queue = [atom];
                visited.add(atom);

                while (queue.length > 0) {
                    const current = queue.shift();
                    comp.push(current);
                    const neighbors = this.graph.get(current) || [];
                    for (let neighbor of neighbors) {
                        if (!visited.has(neighbor)) {
                            visited.add(neighbor);
                            queue.push(neighbor);
                        }
                    }
                }
                components.push(comp);
            }
        }
        return components;
    }

    analyzeStructure() {
        const ui = this.engine.uiManager;
        
        // 🌟 核心防呆：不再统计全图，而是逐个检查连在一起的分子团 (Connected Components)
        const components = this.getConnectedComponents();
        
        let hasEthanol = false;
        let hasDimethylEther = false;

        for (let comp of components) {
            let cCount = 0, hCount = 0, oCount = 0;
            for (let atom of comp) {
                if (atom.userData.type === 'C') cCount++;
                else if (atom.userData.type === 'H') hCount++;
                else if (atom.userData.type === 'O') oCount++;
            }

            // 只有当某一个独立连通的分子团正好是 2个C、6个H、1个O 时，才继续判定结构
            if (cCount === 2 && hCount === 6 && oCount === 1) {
                for (let atom of comp) {
                    if (atom.userData.type === 'O') {
                        let connectedC = 0, connectedH = 0;
                        const neighbors = this.graph.get(atom) || [];
                        neighbors.forEach(n => {
                            if (n.userData.type === 'C') connectedC++;
                            if (n.userData.type === 'H') connectedH++;
                        });
                        if (connectedC === 1 && connectedH === 1) hasEthanol = true;
                        if (connectedC === 2) hasDimethylEther = true;
                    }
                }
            }
        }

        if (hasDimethylEther && !ui.userStats.foundIsomer) {
            ui.userStats.foundIsomer = true;
            ui.showMagicNotice("✨ 隐藏成就：炼金异构", "不可思议！你拼搭出了一种全新的未知同分异构体！请尝试点击工具栏的【👁️】预览它的3D晶体。");
            ui.unlockMain3DView('dimethyl_ether');
        }

        if (hasEthanol) {
            if (ui.currentLevel === 1) {
                ui.unlockMain3DView('ethanol');
                if (typeof ui.showAutoBuildBtn === 'function') ui.showAutoBuildBtn();
                ui.showMagicNotice("✨ 结构探秘：拼装完成！", "完美的目标分子结构已经诞生！系统已为您解锁了【一键生成】的快捷魔法。<br><br>👉 您可以继续在此摸索结构，或者通过上方<b>【导航栏】</b>自由切换到其他模块！");
            } else if (ui.currentLevel === 3) {
                ui.unlockMain3DView('ethanol');
                const leftPanel = document.getElementById('left-vision-panel');
                if (leftPanel && leftPanel.classList.contains('hidden')) {
                    const btnToggle = document.getElementById('btn-toggle-main-3d');
                    if (btnToggle) btnToggle.click();
                }
            }
        }
        
        if (!hasEthanol && !hasDimethylEther) {
            if (typeof ui.hideMain3DView === 'function') {
                ui.hideMain3DView();
            }
        }
    }

    findEthanolHydroxylGroup() {
        for (let [atomO, neighborsO] of this.graph.entries()) {
            if (atomO.userData.type === 'O') {
                let atomH = neighborsO.find(n => n.userData.type === 'H');
                let atomC = neighborsO.find(n => n.userData.type === 'C');
                if (atomH && atomC) {
                    const bondOH = this.engine.sceneManager.bonds.find(b => (b.a === atomO && b.b === atomH) || (b.a === atomH && b.b === atomO));
                    return { atomO, atomH, atomC, bondOH };
                }
            }
        }
        return null;
    }

    findOxidationSite() {
        let hydroxyl = this.findEthanolHydroxylGroup();
        if (!hydroxyl) return null;
        let alphaC = hydroxyl.atomC;
        let neighborsC = this.graph.get(alphaC);
        let atomH_C = neighborsC.find(n => n.userData.type === 'H');
        if (atomH_C) {
            const bondCH = this.engine.sceneManager.bonds.find(b => (b.a === alphaC && b.b === atomH_C) || (b.a === atomH_C && b.b === alphaC));
            return {
                atomO: hydroxyl.atomO, atomH_O: hydroxyl.atomH, bondOH: hydroxyl.bondOH,
                atomC: alphaC, atomH_C: atomH_C, bondCH: bondCH
            };
        }
        return null;
    }
}