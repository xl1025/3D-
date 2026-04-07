/**
 * 远古智慧试炼官 (AIAssistant.js)
 * 【纯本地增强版】移除了不稳定的 AI 接口调用，内置了丰富的本地随机题库
 * 重点检测学生对乙醇微观断键、性质以及护理临床应用的理解与记忆。
 */
class AIAssistant {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.initQuestionBank();
    }

    /**
     * 🛡️ 初始化本地丰富题库
     * 每个模块配置了多道题目，每次试炼将随机抽取一道
     */
    initQuestionBank() {
        this.questionBank = {
            // 模块 1：结构探秘
            1: [
                {
                    question: "第一关结构试炼：在 3D 的四面体结构下，决定乙醇产生诸多炼金魔法反应（如置换、氧化）的核心结构是？",
                    options: [
                        { text: "🔵 碳骨架", explanation: "✨ 魔法判定：错误。碳骨架非常稳固，如同法阵的基石，并不是发生反应的活性中心。", isCorrect: false },
                        { text: "🔴 羟基 (-OH)", explanation: "✨ 魔法判定：正确！羟基是最活跃的官能团，正是它赋予了乙醇神奇的化学性质。", isCorrect: true }
                    ]
                },
                {
                    question: "第一关结构试炼：刚才我们拼装出的乙醇，其氧原子的成键方式（连接一个碳和一个氢）与哪种常见魔法物质最为相似？",
                    options: [
                        { text: "💧 水 (H₂O)", explanation: "✨ 魔法判定：正确！你可以把乙醇看作是水分子中的一个氢原子被“乙基”取代后的产物，因此它们都有极性相似的羟基。", isCorrect: true },
                        { text: "☁️ 二氧化碳 (CO₂)", explanation: "✨ 魔法判定：错误。二氧化碳中的氧都是双键连接，而乙醇中的氧是单键。", isCorrect: false }
                    ]
                },
                {
                    question: "第一关结构试炼：在你的炼金探索中，如果有相同的原子（2个C，6个H，1个O），但氧原子插在两个碳中间，这种新物质叫什么？",
                    options: [
                        { text: "🧪 乙酸", explanation: "✨ 魔法判定：错误。乙酸分子中含有两个氧原子。", isCorrect: false },
                        { text: "🌫️ 二甲醚", explanation: "✨ 魔法判定：正确！这就是神奇的“同分异构”现象，组成相同但空间结构不同，导致它们一个是液体（乙醇），一个是气体（二甲醚）。", isCorrect: true }
                    ]
                }
            ],
            // 模块 2：钠置换反应
            2: [
                {
                    question: "第二关置换试炼：刚才的金属钠攻击中，乙醇分子里哪个化学键断裂，并释放出了氢气？",
                    options: [
                        { text: "🔗 C-H 键", explanation: "✨ 魔法判定：错误。忠诚的 C-H 键十分坚固，并未被金属钠切断。", isCorrect: false },
                        { text: "🔗 O-H 键", explanation: "✨ 魔法判定：正确！脆弱且极性的 O-H 键被切断，说明乙醇羟基上的氢具有微弱的活泼性（酸性）。", isCorrect: true }
                    ]
                },
                {
                    question: "第二关置换试炼：如果将金属钠分别投入水和乙醇中，根据你对微观结构的理解，哪边反应更剧烈？",
                    options: [
                        { text: "💧 钠与水反应更剧烈", explanation: "✨ 魔法判定：正确！水分子中的氢比乙醇羟基中的氢更活泼，因此与钠反应时水更为剧烈（熔化成小球四处游动）。", isCorrect: true },
                        { text: "🧪 钠与乙醇反应更剧烈", explanation: "✨ 魔法判定：错误。乙醇中的乙基会影响羟基，使得 O-H 键不如水分子中的 O-H 键容易断裂。", isCorrect: false }
                    ]
                },
                {
                    question: "第二关置换试炼：置换反应配平后，试管中留下了什么炼金产物？",
                    options: [
                        { text: "🧂 乙醇钠和水", explanation: "✨ 魔法判定：错误。仔细回想，生成的并不是水，氢原子结合变成了气体逃逸了。", isCorrect: false },
                        { text: "🔮 乙醇钠和氢气", explanation: "✨ 魔法判定：正确！金属钠置换出了羟基中的氢，2个氢原子结合生成了氢气，剩下的部分结合成了乙醇钠。", isCorrect: true }
                    ]
                }
            ],
            // 模块 3：铜催化氧化
            3: [
                {
                    question: "第三关氧化试炼：在灼热铜丝的催化氧化中，究竟是哪些化学键断裂，使产物变成了乙醛？",
                    options: [
                        { text: "仅断裂 O-H 键", explanation: "✨ 魔法判定：错误。如果只断 O-H 键，无法形成碳氧双键。", isCorrect: false },
                        { text: "断裂 O-H 键与相连碳上的 C-H 键", explanation: "✨ 魔法判定：正确！这如同精准的手术，切去这两个氢原子后，碳氧之间形成了稳固的双键 (C=O)，生成了乙醛。", isCorrect: true }
                    ]
                },
                {
                    question: "第三关氧化试炼：在刚才的反应中，反复变黑又变红的铜丝（Cu）究竟扮演了什么角色？",
                    options: [
                        { text: "🔥 反应物，被完全消耗", explanation: "✨ 魔法判定：错误。铜丝在反应前后质量并未发生改变。", isCorrect: false },
                        { text: "✨ 催化剂，加速反应", explanation: "✨ 魔法判定：正确！铜在反应中先被氧化成黑色的氧化铜，随后又被乙醇还原成红色的铜，起到了传递氧的催化作用。", isCorrect: true }
                    ]
                },
                {
                    question: "第三关氧化试炼：乙醇失去两个氢原子被氧化后，生成的新物质“乙醛”含有什么特殊的官能团？",
                    options: [
                        { text: "🩸 羧基 (-COOH)", explanation: "✨ 魔法判定：错误。那是乙醛进一步被氧化变成乙酸的官能团。", isCorrect: false },
                        { text: "💧 醛基 (-CHO)", explanation: "✨ 魔法判定：正确！碳氧双键加上一个氢原子，构成了醛基，赋予了物质全新的气味和性质。", isCorrect: true }
                    ]
                }
            ],
            // 模块 4：综合评测 (结合护理临床)
            4: [
                {
                    question: "结业综合试炼：在护理病房的器械和皮肤消毒中，我们通常使用 75% 的乙醇溶液，其微观消毒原理与哪项性质相关？",
                    options: [
                        { text: "乙醇具有强酸性，能腐蚀细菌", explanation: "✨ 魔法判定：错误。乙醇近乎中性，它不能依靠酸碱性来杀菌。", isCorrect: false },
                        { text: "乙醇能穿透细菌细胞膜，使蛋白质变性", explanation: "✨ 魔法判定：正确！75%的浓度能最好地渗入细菌内部，使内部蛋白质脱水凝固。纯酒精反而会在细菌表面形成保护膜，无法达到深层杀菌目的。", isCorrect: true }
                    ]
                },
                {
                    question: "结业综合试炼：医疗上打针前，护士用酒精棉擦拭皮肤时会感到一阵清凉，这主要利用了乙醇的什么物理性质？",
                    options: [
                        { text: "❄️ 易挥发，且挥发时吸收热量", explanation: "✨ 魔法判定：正确！乙醇沸点低易挥发，带走体表大量热量，因此在临床上也常用于给发高烧的病人进行物理降温。", isCorrect: true },
                        { text: "🧊 熔点低，直接从固态升华", explanation: "✨ 魔法判定：错误。擦拭在皮肤上的是液态酒精，并不是固态的。", isCorrect: false }
                    ]
                },
                {
                    question: "结业综合试炼：医疗和生活中严禁饮用“工业酒精”，因为其中常含有少量会引发失明甚至致命的物质，它是？",
                    options: [
                        { text: "☠️ 甲醇 (CH₃OH)", explanation: "✨ 魔法判定：正确！甲醇在人体内会被氧化成剧毒的甲醛和甲酸，严重损害视神经，极少量即可致盲。", isCorrect: true },
                        { text: "🍋 乙酸 (CH₃COOH)", explanation: "✨ 魔法判定：错误。乙酸其实就是食醋的主要成分，并没有剧毒。", isCorrect: false }
                    ]
                }
            ]
        };
    }

    /**
     * 取消了异步(async)请求，直接从本地题库随机抽取并渲染
     */
    generateQuiz(userStats, level) {
        // 如果找不到对应的关卡题库，默认取第一关
        const bank = this.questionBank[level] || this.questionBank[1];
        
        // 🌟 随机抽取该关卡下的一道题目
        const randomIndex = Math.floor(Math.random() * bank.length);
        const selectedQuiz = bank[randomIndex];
        
        // 执行渲染
        this.renderQuiz(selectedQuiz);
    }

    /**
     * 渲染题目到卷轴面板中
     */
    renderQuiz(quiz) {
        const container = document.getElementById('ai-content');
        
        // 大字号题目渲染
        let html = `<p class="quiz-question" style="color: #ffd700; margin-bottom: 20px; font-size: 1.3em; line-height: 1.5; text-shadow: 2px 2px 4px #000;">${quiz.question}</p>
                    <div class="quiz-options-container" style="display: flex; flex-direction: column; gap: 15px;">`;
        
        // 遍历选项按钮
        quiz.options.forEach((opt) => {
            // 对解释文本进行 URL 编码，防止内部带有单双引号破坏了 HTML 按钮的 onclick 结构
            const encodedExp = encodeURIComponent(opt.explanation);
            html += `<button class="quiz-option magic-btn" style="white-space: normal; height: auto; padding: 15px; font-size: 1.1em; line-height: 1.4;" onclick="app.uiManager.handleQuizAnswer(${opt.isCorrect}, '${encodedExp}')">${opt.text}</button>`;
        });
        
        html += `</div>`;
        container.innerHTML = html;
    }
}