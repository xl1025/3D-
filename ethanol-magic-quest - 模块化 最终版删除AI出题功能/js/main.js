/**
 * 魔法世界总控枢纽 (main.js)
 * 负责初始化全局应用命名空间，确保各个独立模块能在全局上下文中互相调用与协同运转
 */

// 初始化全局应用命名空间
window.app = {};

window.onload = () => {
    // ==========================================
    // 1. 实例化基础渲染与魔法卷轴（UI）模块
    // ==========================================
    app.sceneManager = new SceneManager('canvas-container');
    app.uiManager = new UIManager();

    // ==========================================
    // 2. 挂载物理引擎与交互模块 (修复解耦后的实例化缺失)
    // ==========================================
    // 物理引擎：专职处理魔法阵内的原子斥力与化学键弹簧拉力
    app.physicsEngine = new PhysicsEngine(app.sceneManager);
    // 将物理引擎实例注入到 SceneManager 中，供其 requestAnimationFrame 动画循环调用
    app.sceneManager.physicsEngine = app.physicsEngine; 
    
    // 交互管理器：专职处理学徒的鼠标手势（拖拽、智能磁性吸附、斩断与净化）
    app.interactionManager = new InteractionManager(app.sceneManager); 

    // ==========================================
    // 3. 实例化高阶炼金核心与 AI 试炼官
    // ==========================================
    // 炼金引擎总枢纽（挂载了图谱解析和反应导演）
    app.chemistryEngine = new ChemistryEngine(app.sceneManager, app.uiManager);
    
    // 远古智慧试炼官（AI 助手）
    app.aiAssistant = new AIAssistant(app.uiManager); 

    // ==========================================
    // 4. 绑定法阵工具栏事件：召唤基础元素
    // ==========================================
    const btnAddC = document.getElementById('btn-add-c');
    const btnAddH = document.getElementById('btn-add-h');
    const btnAddO = document.getElementById('btn-add-o');

    if (btnAddC) btnAddC.onclick = () => app.sceneManager.createAtom('C');
    if (btnAddH) btnAddH.onclick = () => app.sceneManager.createAtom('H');
    if (btnAddO) btnAddO.onclick = () => app.sceneManager.createAtom('O');

    // ==========================================
    // 5. 绑定高阶炼金反应事件 (金属钠置换 & 催化氧化)
    // ==========================================
    const btnReactionNa = document.getElementById('btn-reaction-na');
    const btnReactionCu = document.getElementById('btn-reaction-cu');

    if (btnReactionNa) {
        btnReactionNa.onclick = () => {
            // 记录学徒行为，供后续 AI 试炼生成针对性题目
            app.uiManager.userStats.watchedNa = true;
            // 吟唱金属钠置换反应魔法
            app.chemistryEngine.playSodiumReaction();
        };
    }

    if (btnReactionCu) {
        btnReactionCu.onclick = () => {
            app.uiManager.userStats.watchedCu = true;
            // 吟唱灼热铜丝催化氧化魔法
            app.chemistryEngine.playOxidationReaction();
        };
    }
    
    // ==========================================
    // 6. 启动世界规则循环
    // ==========================================
    // 每 500 毫秒循环检测一次空间法阵内的元素距离，自动编织或楔入化学键
    setInterval(() => {
        if (app.chemistryEngine) {
            app.chemistryEngine.checkAndFormBonds();
        }
    }, 500);
};