/**
 * 魔法卷轴与界面管理器 (UIManager.js)
 * 【极致流畅版：右上角轻量通知 + 测试按钮永久驻留可反复练习 + 错题本功能】
 */
class UIManager {
    constructor() {
        // 🌟 新增 wrongQuestions 数组用于记录错题
        this.userStats = { foundIsomer: false, watchedNa: false, watchedCu: false, quizScore: 0, startTime: Date.now(), wrongQuestions: [] };
        this.currentRenderedType = null; 
        this.currentMoleculeType = null; 
        this.miniRendererInstance = null; 
        this.currentLevel = 1; 
        this.lastReactionType = null; 
        this.quizUnlocked = false; // 🌟 记录当前模块测试按钮是否已解锁

        this.bindEvents();
        setTimeout(() => this.updateLevelUI(), 500); 
    }

    // ================= 沙盒模块化全局路由切换 =================
    switchModule(moduleId) {
        this.currentLevel = moduleId;
        this.quizUnlocked = false; // 切换模块时，重置测试按钮解锁状态
        
        if (window.app && window.app.sceneManager) {
            window.app.sceneManager.clearAll();
        }
        const leftPanel = document.getElementById('left-vision-panel');
        if (leftPanel) leftPanel.classList.add('hidden');
        
        document.getElementById('ai-trial-panel')?.classList.add('hidden');
        document.getElementById('evaluation-panel')?.classList.add('hidden');
        document.getElementById('isomer-panel')?.classList.add('hidden');
        document.getElementById('equation-minigame')?.remove();
        
        // 隐藏侧边测试按钮
        const btnQuiz = document.getElementById('btn-trigger-quiz');
        if (btnQuiz) btnQuiz.classList.add('hidden');
        
        document.querySelector('.system-menu')?.classList.remove('hidden');
        document.querySelector('.action-bar')?.classList.remove('hidden');

        const btnNa = document.getElementById('btn-reaction-na');
        const btnCu = document.getElementById('btn-reaction-cu');
        const btnFinish = document.getElementById('btn-finish');
        const elementSkills = document.querySelector('.element-skills');

        // 🌟 极简文案，减少阅读负担
        if (moduleId === 1) {
            if(elementSkills) elementSkills.classList.remove('hidden');
            if(btnNa) btnNa.classList.add('hidden');
            if(btnCu) btnCu.classList.add('hidden');
            if(btnFinish) btnFinish.classList.add('hidden');
            this.showMagicNotice("🧩 结构探秘", "请召唤元素，拼装出目标分子结构。");
            
        } else if (moduleId === 2) {
            if(elementSkills) elementSkills.classList.add('hidden');
            if(btnNa) btnNa.classList.remove('hidden');
            if(btnCu) btnCu.classList.add('hidden');
            if(btnFinish) btnFinish.classList.add('hidden');
            if(window.app && window.app.sceneManager) window.app.sceneManager.autoBuildEthanol();
            this.showMagicNotice("💥 置换反应", "请点击下方【💥】符号开始断键推演。");
            
        } else if (moduleId === 3) {
            if(elementSkills) elementSkills.classList.add('hidden');
            if(btnNa) btnNa.classList.add('hidden');
            if(btnCu) btnCu.classList.remove('hidden');
            if(btnFinish) btnFinish.classList.add('hidden');
            if(window.app && window.app.sceneManager) window.app.sceneManager.autoBuildEthanol();
            setTimeout(() => { this.forceOpenMain3DView('ethanol'); }, 300); 
            this.showMagicNotice("🔥 催化氧化", "请点击下方【🔥】符号观察脱氢过程。");
            
        } else if (moduleId === 4) {
            if(elementSkills) elementSkills.classList.add('hidden');
            if(btnNa) btnNa.classList.add('hidden');
            if(btnCu) btnCu.classList.add('hidden');
            if(btnFinish) btnFinish.classList.remove('hidden');
            this.showMagicNotice("📜 综合评测", "请点击下方【🏆】开启最终问答获取证书！");
        }
        
        this.updateLevelUI();
    }

    updateLevelUI() {
        let levelText = '';
        switch(this.currentLevel) {
            case 1: levelText = "🌟 当前：结构探秘"; break;
            case 2: levelText = "🌟 当前：置换反应"; break;
            case 3: levelText = "🌟 当前：催化氧化"; break;
            case 4: levelText = "👑 当前：综合评测"; break;
        }
        
        let indicatorContainer = document.getElementById('level-indicator-container');
        if (indicatorContainer) {
            indicatorContainer.innerHTML = `<div class="level-indicator" id="level-indicator">${levelText}</div>`;
        }

        const btnFinish = document.getElementById('btn-finish');
        if(btnFinish) {
            btnFinish.onclick = () => {
                if (window.app && window.app.aiAssistant) {
                    this.showAITrial();
                    window.app.aiAssistant.generateQuiz(this.userStats, 4);
                }
            };
        }
    }

    // 🌟 细节体验优化：限制右上角 Toast 的最大存在数量，防止操作过快导致通知满屏堆积
    showMagicNotice(title, desc) {
        let toastContainer = document.getElementById('magic-toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'magic-toast-container';
            toastContainer.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 9999999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
            document.body.appendChild(toastContainer);
        }

        // 🌟 队列清理限制：如果同屏超过 3 条提示，强制移除最旧的一条
        while (toastContainer.children.length >= 3) {
            toastContainer.firstElementChild.remove();
        }

        const toast = document.createElement('div');
        toast.style.cssText = 'background: rgba(20, 20, 30, 0.95); border-left: 4px solid var(--rpg-gold); border-radius: 4px; padding: 12px 15px; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5); min-width: 200px; max-width: 300px; opacity: 0; transform: translateX(100%); transition: all 0.3s ease;';
        toast.innerHTML = `<h4 style="color: var(--rpg-gold); margin: 0 0 5px 0; font-size: 1em;">${title}</h4><div style="font-size: 0.85em; color: #00ffcc; line-height: 1.4;">${desc}</div>`;
        
        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
            }
        }, 3500); 
    }

    showEquationMinigame(reactionType) {
        const overlay = document.createElement('div');
        overlay.id = 'equation-minigame';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999999; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; pointer-events: auto;';

        let equationHTML = '';
        let options = [];

        const dropZoneStyle = 'display: inline-block; min-width: 120px; height: 70px; border: 3px dashed #ffd700; border-radius: 10px; margin: 0 10px; color: #00ffcc; line-height: 70px; text-align: center; background: rgba(0,0,0,0.6); cursor: pointer; font-weight: bold; font-size: 1.2em; transition: all 0.2s; box-shadow: inset 0 0 15px rgba(0,0,0,0.8);';

        if (reactionType === 'sodium') {
            equationHTML = `<span style="color:#fff;">2CH₃CH₂OH + </span><div class="drop-zone" data-answer="2Na" style="${dropZoneStyle}"></div> <span style="color:#fff; margin:0 15px;">&rarr;</span> <div class="drop-zone" data-answer="2CH₃CH₂ONa" style="${dropZoneStyle}"></div> <span style="color:#fff;">+ H₂&uarr;</span>`;
            options = ['2Na', '2CH₃CH₂ONa', 'O₂', 'H₂O', 'Na'];
        } else {
            equationHTML = `<span style="color:#fff;">2CH₃CH₂OH + </span><div class="drop-zone" data-answer="O₂" style="${dropZoneStyle}"></div> <span style="font-size:0.6em; margin:0 15px; color:#aaa; position:relative; top:-10px;">-Cu/&triangle;&rarr;</span> <div class="drop-zone" data-answer="2CH₃CHO" style="${dropZoneStyle}"></div> <span style="color:#fff;">+ 2H₂O</span>`;
            options = ['O₂', '2CH₃CHO', '2CH₃COOH', 'H₂', 'CO₂'];
            reactionType = 'oxidation'; 
        }

        options.sort(() => Math.random() - 0.5);
        
        let optionsHTML = options.map(opt => `
            <div class="drag-item" draggable="true" data-val="${opt}" style="cursor: pointer; padding: 15px 30px; font-size: 1.8em; background: linear-gradient(135deg, #4a3b2c, #2a2015); border: 2px solid #ffd700; border-radius: 12px; user-select: none; font-weight: bold; color: #fff; text-shadow: 2px 2px 4px #000; box-shadow: 0 5px 15px rgba(0,0,0,0.8); margin: 10px; transition: all 0.2s;">
                ${opt}
            </div>
        `).join('');

        overlay.innerHTML = `
            <div style="background: #1a1a2e; padding: 40px; border: 4px solid #ffd700; border-radius: 20px; text-align: center; max-width: 95%; width: 1000px; box-shadow: 0 0 50px rgba(255, 215, 0, 0.4); pointer-events: auto;">
                <h2 style="color:#ffd700; font-size: 2.8em; margin-bottom: 20px; margin-top: 0; text-shadow: 2px 2px 5px #000;">🧩 符文补全：重构物质序列</h2>
                <div style="font-size: 2.5em; margin-bottom: 50px; display:flex; align-items:center; justify-content:center; flex-wrap: wrap; background: rgba(0,0,0,0.5); padding: 30px 20px; border-radius: 15px; border: 1px solid #555;">
                    ${equationHTML}
                </div>
                <div id="options-container" style="display:flex; justify-content:center; align-items: center; gap: 15px; margin-bottom: 40px; flex-wrap: wrap; background: rgba(255,255,255,0.05); padding: 25px; border-radius: 15px; min-height: 80px;">
                    ${optionsHTML}
                </div>
                <button id="btn-check-equation" class="hidden" style="font-size: 2em; padding: 15px 50px; background: rgba(0, 0, 0, 0.8); border: 2px solid #00ffcc; color: #00ffcc; border-radius: 12px; cursor: pointer; margin-top: 20px; font-weight: bold; text-shadow: 0 0 10px #00ffcc; box-shadow: 0 0 20px rgba(0, 255, 204, 0.4);">✨ 注入魔力验证</button>
            </div>
        `;
        document.body.appendChild(overlay);
        this.bindDragDropEvents(overlay, reactionType);
    }

    bindDragDropEvents(overlay, reactionType) {
        const dragItems = overlay.querySelectorAll('.drag-item');
        const dropZones = overlay.querySelectorAll('.drop-zone');
        let draggedItem = null;
        let selectedItemVal = null; 

        dragItems.forEach(item => {
            item.addEventListener('dragstart', (e) => { draggedItem = item; e.dataTransfer.setData('text/plain', item.getAttribute('data-val')); setTimeout(() => item.style.opacity = '0.4', 0); });
            item.addEventListener('dragend', () => { setTimeout(() => item.style.opacity = '1', 0); draggedItem = null; });
            item.addEventListener('click', () => {
                dragItems.forEach(i => { i.style.borderColor = '#ffd700'; i.style.transform = 'scale(1)'; i.style.background = 'linear-gradient(135deg, #4a3b2c, #2a2015)'; });
                item.style.borderColor = '#00ffcc'; item.style.transform = 'scale(1.1)'; item.style.background = 'linear-gradient(135deg, #1a4a40, #0f2a25)';
                selectedItemVal = item.getAttribute('data-val');
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.background = 'rgba(0, 255, 204, 0.3)'; zone.style.borderColor = '#00ffcc'; });
            zone.addEventListener('dragleave', () => { zone.style.background = 'rgba(0,0,0,0.6)'; zone.style.borderColor = '#ffd700'; });
            zone.addEventListener('drop', (e) => {
                e.preventDefault(); zone.style.background = 'rgba(0,0,0,0.6)'; zone.style.borderColor = '#ffd700';
                const val = e.dataTransfer.getData('text/plain') || (draggedItem ? draggedItem.getAttribute('data-val') : null);
                if (val) { zone.innerHTML = val; zone.setAttribute('data-filled', val); this.checkEquationCompletion(overlay, reactionType); }
            });
            zone.addEventListener('click', () => {
                if (selectedItemVal) {
                    zone.innerHTML = selectedItemVal; zone.setAttribute('data-filled', selectedItemVal); selectedItemVal = null;
                    dragItems.forEach(i => { i.style.borderColor = '#ffd700'; i.style.transform = 'scale(1)'; i.style.background = 'linear-gradient(135deg, #4a3b2c, #2a2015)'; });
                    this.checkEquationCompletion(overlay, reactionType);
                } else if (zone.getAttribute('data-filled')) {
                    zone.innerHTML = ''; zone.removeAttribute('data-filled');
                    overlay.querySelector('#btn-check-equation').classList.add('hidden');
                }
            });
        });
    }

    // 🌟 核心改动 2：解锁测试按钮且防止重复提醒
    checkEquationCompletion(overlay, reactionType) {
        const zones = overlay.querySelectorAll('.drop-zone');
        let allFilled = true;
        zones.forEach(z => { if(!z.getAttribute('data-filled')) allFilled = false; });

        const btn = overlay.querySelector('#btn-check-equation');
        if (allFilled) {
            btn.classList.remove('hidden');
            btn.onclick = () => {
                let correct = true;
                zones.forEach(z => { if (z.getAttribute('data-filled') !== z.getAttribute('data-answer')) correct = false; });
                
                if (correct) {
                    // 如果该模块是第一次通关，弹出提示和按钮
                    if (!this.quizUnlocked) {
                        this.quizUnlocked = true;
                        this.showMagicNotice("✨ 配平成功", "宏观物质能量已平衡！<br>请点击右侧新出现的【📝】按钮开启理论试炼！");
                        
                        const btnQuiz = document.getElementById('btn-trigger-quiz');
                        if (btnQuiz) {
                            btnQuiz.classList.remove('hidden');
                            if (typeof gsap !== 'undefined') {
                                gsap.fromTo(btnQuiz, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" });
                            }
                        }
                    } else {
                        // 如果学生是重置后再次通关（反复练习），就不要唠叨了
                        this.showMagicNotice("✨ 配平成功", "能量平衡确认。");
                    }
                    overlay.remove();
                } else {
                    this.showMagicNotice("❌ 序列冲突", "物质配平有误，请点选虚线框清空错误元素。");
                    btn.classList.add('hidden');
                }
            };
        }
    }

    bindEvents() {
        const btnCloseAI = document.getElementById('btn-close-ai');
        if(btnCloseAI) {
            btnCloseAI.onclick = () => { document.getElementById('ai-trial-panel').classList.add('hidden'); };
        }

        const btnCloseEval = document.getElementById('btn-close-eval');
        if(btnCloseEval) {
            btnCloseEval.onclick = () => {
                document.getElementById('evaluation-panel').classList.add('hidden');
                document.querySelector('.system-menu')?.classList.remove('hidden');
                document.querySelector('.action-bar')?.classList.remove('hidden'); 
            };
        }

        const btnDownloadEval = document.getElementById('btn-download-eval');
        if(btnDownloadEval) {
            btnDownloadEval.onclick = () => this.downloadEvaluation();
        }

        const systemMenu = document.getElementById('system-menu');
        if (systemMenu && !document.getElementById('btn-undo')) {
            const btnToggleVision = document.createElement('button');
            btnToggleVision.id = 'btn-toggle-main-3d'; btnToggleVision.className = 'magic-btn'; 
            btnToggleVision.innerHTML = '👁️'; btnToggleVision.title = '开启 3D 视界';
            btnToggleVision.style.borderColor = 'var(--rpg-mana)'; btnToggleVision.style.color = 'var(--rpg-mana)';
            systemMenu.appendChild(btnToggleVision);

            const btnUndo = document.createElement('button');
            btnUndo.id = 'btn-undo'; btnUndo.className = 'magic-btn'; btnUndo.innerHTML = '↩'; btnUndo.title = '撤销上步';
            btnUndo.style.borderColor = '#ffaa00'; btnUndo.style.color = '#ffaa00';
            systemMenu.appendChild(btnUndo);

            const btnClear = document.createElement('button');
            btnClear.id = 'btn-clear'; btnClear.className = 'magic-btn'; btnClear.innerHTML = '🧹'; btnClear.title = '净化法阵';
            btnClear.style.borderColor = '#ff4444'; btnClear.style.color = '#ff4444';
            systemMenu.appendChild(btnClear);

            const btnRetryInteraction = document.createElement('button');
            btnRetryInteraction.id = 'btn-retry-interaction'; btnRetryInteraction.className = 'magic-btn hidden'; btnRetryInteraction.innerHTML = '🔁'; btnRetryInteraction.title = '重新推演';
            btnRetryInteraction.style.borderColor = '#ff8800'; btnRetryInteraction.style.color = '#ff8800';
            systemMenu.appendChild(btnRetryInteraction);
            
            // 📝 测试题呼出按钮
            const btnTriggerQuiz = document.createElement('button');
            btnTriggerQuiz.id = 'btn-trigger-quiz'; btnTriggerQuiz.className = 'magic-btn hidden'; 
            btnTriggerQuiz.innerHTML = '📝'; btnTriggerQuiz.title = '开启/继续理论试炼';
            btnTriggerQuiz.style.borderColor = '#00ffcc'; btnTriggerQuiz.style.color = '#00ffcc';
            systemMenu.appendChild(btnTriggerQuiz);

            btnUndo.addEventListener('click', () => { if (window.app && window.app.sceneManager) window.app.sceneManager.undoLast(); });
            btnClear.addEventListener('click', () => { 
                if (window.app && window.app.sceneManager) window.app.sceneManager.clearAll(); 
                if (btnRetryInteraction) btnRetryInteraction.classList.add('hidden'); 
            });
            btnRetryInteraction.addEventListener('click', () => {
                if (window.app && window.app.chemistryEngine) window.app.chemistryEngine.retryInteractiveReaction();
            });
            
            // 🌟 核心改动 2：点击后不再隐藏按钮，允许学生无限次点击出题“刷题”
            btnTriggerQuiz.addEventListener('click', () => {
                if (window.app && window.app.aiAssistant) {
                    this.showAITrial();
                    window.app.aiAssistant.generateQuiz(this.userStats, this.currentLevel);
                }
            });
        }
    }

    showAutoBuildBtn() {
        let systemMenu = document.getElementById('system-menu');
        if (systemMenu && !document.getElementById('btn-auto-build')) {
            const btnAutoBuild = document.createElement('button');
            btnAutoBuild.id = 'btn-auto-build'; btnAutoBuild.className = 'magic-btn'; 
            btnAutoBuild.innerHTML = '🧪'; btnAutoBuild.title = '一键生成';
            btnAutoBuild.style.borderColor = 'var(--rpg-mana)'; btnAutoBuild.style.color = 'var(--rpg-mana)';
            systemMenu.appendChild(btnAutoBuild);
            if (typeof gsap !== 'undefined') gsap.fromTo(btnAutoBuild, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" });
            btnAutoBuild.addEventListener('click', () => { if (window.app && window.app.sceneManager) window.app.sceneManager.autoBuildEthanol(); });
        }
    }

    unlockMain3DView(moleculeType) {
        const leftPanel = document.getElementById('left-vision-panel');
        const miniVisionControls = document.getElementById('mini-vision-controls');
        const btnToggle = document.getElementById('btn-toggle-main-3d');
        const btnHighlight = document.getElementById('btn-highlight-group');
        const btnReplay = document.getElementById('btn-replay-animation');
        const titleEl = document.getElementById('mini-vision-title');
        const actionBar = document.querySelector('.action-bar'); 
        
        this.currentMoleculeType = moleculeType;

        if (btnToggle) {
            const getVisionText = (type) => {
                switch(type) {
                    case 'dimethyl_ether': return "二甲醚视界";
                    case 'sodium_ethoxide': return "乙醇钠视界";
                    case 'acetaldehyde': return "乙醛视界";
                    default: return "乙醇视界";
                }
            };

            const targetText = getVisionText(moleculeType);

            if (!leftPanel.classList.contains('hidden')) {
                btnToggle.innerHTML = `👁️`; btnToggle.title = `隐藏 ${targetText}`;
                miniVisionControls.classList.remove('hidden'); btnHighlight.classList.remove('hidden');
                if(titleEl) titleEl.innerText = targetText;
                if(actionBar) actionBar.classList.add('split-mode'); 
                if (this.currentRenderedType !== this.currentMoleculeType) this.renderMiniModel(moleculeType);
            } else {
                btnToggle.innerHTML = `👁️`; btnToggle.title = `开启 ${targetText}`;
                if(actionBar) actionBar.classList.remove('split-mode');
            }

            btnToggle.onclick = () => {
                const isHidden = leftPanel.classList.contains('hidden');
                const nextText = getVisionText(this.currentMoleculeType);

                if (isHidden) {
                    leftPanel.classList.remove('hidden'); btnToggle.title = `隐藏 ${nextText}`;
                    miniVisionControls.classList.remove('hidden'); btnHighlight.classList.remove('hidden');
                    if(titleEl) titleEl.innerText = nextText;
                    if(actionBar) actionBar.classList.add('split-mode'); 
                    if (this.currentRenderedType !== this.currentMoleculeType) this.renderMiniModel(this.currentMoleculeType);
                    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 500);
                } else {
                    leftPanel.classList.add('hidden'); btnToggle.title = `开启 ${nextText}`;
                    if(actionBar) actionBar.classList.remove('split-mode'); 
                    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 500);
                }
            };
        }

        if (btnHighlight) {
            btnHighlight.onclick = () => {
                if (window.app && window.app.sceneManager) {
                    window.app.sceneManager.toggleHighlightFunctionalGroup(this.currentMoleculeType);
                    btnHighlight.innerText = window.app.sceneManager.isHighlighted ? "❌ 取消圈画" : "🎯 官能团";
                }
            };
        }
        if (btnReplay && !btnReplay.onclick) btnReplay.onclick = () => this.replayCinematicMicroAnimation();
    }

    playCinematicMicroAnimation(reactionType) {
        if (reactionType) this.lastReactionType = reactionType;
        else reactionType = this.lastReactionType;
        this.forceOpenMain3DView('ethanol');
        const btnReplay = document.getElementById('btn-replay-animation');
        const btnHighlight = document.getElementById('btn-highlight-group');
        if (btnReplay) btnReplay.classList.remove('hidden');
        if (btnHighlight) btnHighlight.classList.add('hidden'); 

        setTimeout(() => {
            if (this.miniRendererInstance && !this.miniRendererInstance.isDisposed) {
                if (reactionType === 'sodium' || this.currentLevel === 2) {
                    this.miniRendererInstance.animateTransitionToSodiumEthoxide();
                    this.currentRenderedType = 'sodium_ethoxide';
                    document.getElementById('mini-vision-title').innerText = "乙醇钠视界";
                } else if (reactionType === 'oxidation' || this.currentLevel === 3) {
                    this.miniRendererInstance.animateTransitionToAcetaldehyde();
                    this.currentRenderedType = 'acetaldehyde';
                    document.getElementById('mini-vision-title').innerText = "乙醛视界";
                }
            }
        }, 800);
    }

    replayCinematicMicroAnimation() {
        this.showMagicNotice("🔁 视界重置", "正在为您重演微观动态...");
        this.renderMiniModel('ethanol');
        document.getElementById('mini-vision-title').innerText = "乙醇视界";
        setTimeout(() => {
            if (this.miniRendererInstance && !this.miniRendererInstance.isDisposed) {
                if (this.lastReactionType === 'sodium' || this.currentLevel === 2) {
                    this.miniRendererInstance.animateTransitionToSodiumEthoxide();
                    this.currentRenderedType = 'sodium_ethoxide';
                    document.getElementById('mini-vision-title').innerText = "乙醇钠视界";
                } else if (this.lastReactionType === 'oxidation' || this.currentLevel === 3) {
                    this.miniRendererInstance.animateTransitionToAcetaldehyde();
                    this.currentRenderedType = 'acetaldehyde';
                    document.getElementById('mini-vision-title').innerText = "乙醛视界";
                }
            }
        }, 1200);
    }

    renderMiniModel(moleculeType) {
        const previewContainer = document.getElementById('main-3d-preview');
        if ((moleculeType === 'sodium_ethoxide' || moleculeType === 'acetaldehyde') && this.currentRenderedType === 'ethanol' && this.miniRendererInstance && !this.miniRendererInstance.isDisposed) {
            if (moleculeType === 'sodium_ethoxide') this.miniRendererInstance.animateTransitionToSodiumEthoxide();
            else this.miniRendererInstance.animateTransitionToAcetaldehyde();
            this.currentRenderedType = moleculeType;
            return; 
        }
        if (this.miniRendererInstance && typeof this.miniRendererInstance.dispose === 'function') {
            this.miniRendererInstance.dispose(); this.miniRendererInstance = null;
        }
        previewContainer.innerHTML = '<p class="loading-text">⏳ 正在构建投影...</p>';
        setTimeout(() => {
            this.miniRendererInstance = new MiniModelRenderer('main-3d-preview', moleculeType);
            this.currentRenderedType = moleculeType;
        }, 100);
    }

    forceOpenMain3DView(moleculeType) {
        this.unlockMain3DView(moleculeType);
        const leftPanel = document.getElementById('left-vision-panel');
        if (leftPanel && leftPanel.classList.contains('hidden')) {
            document.getElementById('btn-toggle-main-3d')?.click();
        }
    }

    showAITrial() {
        const panel = document.getElementById('ai-trial-panel');
        if (panel) {
            panel.classList.remove('hidden');
            document.getElementById('ai-content').innerHTML = `<p style="font-size: 1.5em; color: var(--rpg-mana);">⏳ 正在连接智慧法阵出卷...</p>`;
            document.getElementById('btn-close-ai')?.classList.remove('hidden');
        }
    }

    // 🌟 核心改动 3：自动记录错题
    handleQuizAnswer(isCorrect, encodedExplanation) {
        const explanation = decodeURIComponent(encodedExplanation);
        const container = document.getElementById('ai-content');
        
        if (isCorrect) {
            this.userStats.quizScore += 100;
        } else {
            // 记录错题信息到数组中
            this.userStats.wrongQuestions.push({
                module: this.currentLevel,
                explanation: explanation
            });
        }

        const resultColor = isCorrect ? "var(--rpg-mana)" : "var(--rpg-danger)";
        const resultTitle = isCorrect ? "✨ 判定正确！" : "💥 判定失败...";
        
        container.innerHTML = `
            <h3 style="color:${resultColor}; font-size: 1.2em; margin-bottom: 20px;">${resultTitle}</h3>
            <div style="font-size: 1em; line-height: 1.6; text-align: left; padding: 25px; background: rgba(0,0,0,0.6); border-radius: 12px; border: 2px solid ${resultColor};">${explanation}</div>
        `;
        
        if (isCorrect) {
            let nextBtnHtml = ''; 
            if (this.currentLevel === 4) {
                nextBtnHtml = `<button class="magic-btn" style="margin-top:40px; font-size:1.2em; padding: 15px 30px; border-color:var(--rpg-gold); color:var(--rpg-gold);" onclick="app.uiManager.showEvaluation()">🏆 查看结业徽章</button>`;
            } else {
                nextBtnHtml = `<p style="margin-top: 30px; font-size: 1.1em; color: var(--rpg-gold);">🎉 试炼通过！您可以关闭面板继续练习，或通过顶部【导航栏】前往下一模块。</p>`;
            }
            container.innerHTML += nextBtnHtml;
        }
    }

    showEvaluation() {
        ['.action-bar', '.system-menu', '#left-vision-panel', '#ai-trial-panel'].forEach(selector => {
            const el = document.querySelector(selector);
            if(el) el.classList.add('hidden');
        });
        const panel = document.getElementById('evaluation-panel');
        panel.classList.remove('hidden');
        
        const timeSpent = (Date.now() - this.userStats.startTime) / 1000;
        const speedScore = Math.max(40, 100 - (timeSpent / 15)); 
        const explorationScore = this.userStats.foundIsomer ? 100 : 80;
        const insightScore = (this.userStats.watchedNa && this.userStats.watchedCu) ? 100 : 70;
        const theoryScore = this.userStats.quizScore > 200 ? 100 : 60;
        
        this.renderRadarChart([explorationScore, insightScore, theoryScore, speedScore]);
        document.getElementById('eval-feedback').innerText = "🏆 大炼金术师诞生！恭喜你完成了微观奥秘的所有严苛关卡！";

        // 🌟 核心改动 3：动态生成“错题本”按钮
        const evalPanelContent = document.getElementById('evaluation-panel');
        if (!document.getElementById('btn-wrong-questions')) {
            const btnWQ = document.createElement('button');
            btnWQ.id = 'btn-wrong-questions';
            btnWQ.className = 'magic-btn';
            btnWQ.innerText = '📖 查看错题本';
            btnWQ.style.cssText = 'margin-top: 15px; margin-left: 15px; font-size: 1.5em; padding: 12px 30px; border-color: #ff4444; color: #ff4444; box-shadow: 0 0 20px rgba(255, 68, 68, 0.4);';
            btnWQ.onclick = () => this.showWrongQuestions();
            
            // 附加到下载按钮旁边
            const downloadBtn = document.getElementById('btn-download-eval');
            if(downloadBtn && downloadBtn.parentNode) {
                downloadBtn.parentNode.appendChild(btnWQ);
            }
        }
    }

    // 🌟 核心改动 3：渲染展示错题本面板
    showWrongQuestions() {
        const existingPanel = document.getElementById('wrong-question-panel');
        if (existingPanel) existingPanel.remove();
        
        const panel = document.createElement('div');
        panel.id = 'wrong-question-panel';
        panel.className = 'magic-scroll';
        panel.style.cssText = 'position: absolute; top: 10%; left: 10%; width: 80%; height: 80%; z-index: 9999999; background: rgba(20,20,30,0.98); border: 2px solid #ff4444; border-radius: 15px; padding: 30px; overflow-y: auto; box-shadow: 0 0 30px rgba(0,0,0,0.8);';
        
        let content = `<h2 style="color: #ff4444; text-align: center; margin-bottom: 30px; text-shadow: 2px 2px 5px #000;">📖 错题本与解析记录</h2>`;
        
        if (!this.userStats.wrongQuestions || this.userStats.wrongQuestions.length === 0) {
            content += `<div style="text-align: center; padding: 50px; background: rgba(0,255,204,0.1); border-radius: 15px;"><h3 style="color: #00ffcc; font-size: 1.5em;">🎉 完美通关！</h3><p style="color: #fff; font-size: 1.2em; margin-top: 15px;">远古智慧未发现您有任何失误记录，您是一位完美的大炼金术师！</p></div>`;
        } else {
            this.userStats.wrongQuestions.forEach((wq, index) => {
                let modText = ["", "结构探秘", "置换反应", "催化氧化", "综合评测"][wq.module] || "通用试炼";
                content += `
                    <div style="background: rgba(0,0,0,0.6); padding: 20px; border: 1px solid #ff4444; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                        <div style="color: #ffaa00; font-weight: bold; margin-bottom: 12px; font-size: 1.1em;">错题 #${index + 1} &nbsp;<span style="color:#aaa; font-size:0.8em; font-weight:normal;">(出自模块：${modText})</span></div>
                        <div style="color: #fff; line-height: 1.6; font-size: 1em;">${wq.explanation}</div>
                    </div>
                `;
            });
        }
        
        content += `<div style="text-align: center; margin-top: 30px;"><button class="magic-btn" onclick="document.getElementById('wrong-question-panel').remove()" style="font-size: 1.2em; padding: 10px 40px; border-color: #fff; color: #fff;">关闭记录</button></div>`;
        
        panel.innerHTML = content;
        document.getElementById('evaluation-panel').appendChild(panel);
    }

    renderRadarChart(dataArray) {
        const ctx = document.getElementById('radarChart').getContext('2d');
        if(window.magicRadarChart) window.magicRadarChart.destroy();
        Chart.defaults.color = '#fff'; Chart.defaults.font.family = "'Courier New', monospace"; Chart.defaults.font.size = 18;
        window.magicRadarChart = new Chart(ctx, {
            type: 'radar',
            data: { labels: ['空间探索', '微观洞察', '理论掌控', '魔力运转'], datasets: [{ data: dataArray, backgroundColor: 'rgba(255, 215, 0, 0.4)', borderColor: '#ffd700', borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#ffd700', pointRadius: 5 }] },
            options: { scales: { r: { angleLines: { color: 'rgba(255,255,255,0.4)' }, grid: { color: 'rgba(255,255,255,0.2)' }, pointLabels: { color: '#00ffcc', font: { size: 20, weight: 'bold' } }, ticks: { display: false, min: 0, max: 100 } } }, plugins: { legend: { display: false } } }
        });
    }

    downloadEvaluation() {
        const canvas = document.getElementById('radarChart');
        if (!canvas) { this.showMagicNotice("❌ 魔法干扰", "无法获取雷达数据！"); return; }
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 800; tempCanvas.height = 1000;
        const ctx = tempCanvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 1000);
        grad.addColorStop(0, '#3a2e24'); grad.addColorStop(1, '#1a1510');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 1000);
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 10; ctx.strokeRect(20, 20, 760, 960);
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 4; ctx.strokeRect(32, 32, 736, 936);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 48px "Microsoft YaHei"'; ctx.textAlign = 'center'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 10;
        ctx.fillText('✨ 大炼金术师鉴定证书 ✨', 400, 100);
        ctx.shadowBlur = 0; 
        ctx.beginPath(); ctx.arc(400, 480, 280, 0, 2 * Math.PI); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
        ctx.drawImage(canvas, 100, 180, 600, 600);
        ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 30px "Microsoft YaHei"'; ctx.fillText('经远古智慧与法阵联合鉴定：', 400, 840);
        ctx.fillStyle = '#ffffff'; ctx.font = '24px "Microsoft YaHei"'; ctx.fillText('该学徒已完美掌控微观断键与方程式配平的奥秘！', 400, 890);
        ctx.fillStyle = '#aaaaaa'; ctx.font = '18px "Microsoft YaHei"'; ctx.fillText(`印记授予时间：${new Date().toLocaleString()}`, 400, 950);
        const link = document.createElement('a'); link.download = `大炼金术师鉴定证书_${new Date().getTime()}.png`;
        link.href = tempCanvas.toDataURL('image/png'); link.click();
        this.showMagicNotice("📥 凝聚成功", "证书已下载！");
    }

    // 🌟 新增：自动隐藏 3D 投影面板的逻辑
    hideMain3DView() {
        const leftPanel = document.getElementById('left-vision-panel');
        const btnToggle = document.getElementById('btn-toggle-main-3d');
        const actionBar = document.querySelector('.action-bar');
        
        // 只有当面板处于打开状态时，才执行收起操作
        if (leftPanel && !leftPanel.classList.contains('hidden')) {
            // 1. 添加 hidden 类隐藏左侧面板
            leftPanel.classList.add('hidden');
            
            // 2. 将顶部菜单栏的“眼睛”按钮提示重置为“开启”
            if (btnToggle) {
                const getVisionText = (type) => {
                    switch(type) {
                        case 'dimethyl_ether': return "二甲醚视界";
                        case 'sodium_ethoxide': return "乙醇钠视界";
                        case 'acetaldehyde': return "乙醛视界";
                        default: return "乙醇视界";
                    }
                };
                const nextText = getVisionText(this.currentMoleculeType);
                btnToggle.title = `开启 ${nextText}`;
            }
            
            // 3. 取消底部工具栏的分屏排版模式（恢复居中排列）
            if (actionBar) {
                actionBar.classList.remove('split-mode');
            }
            
            // 4. 触发窗口调整事件，让主画布(SceneManager)平滑地重新铺满右侧空间
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 500);
        }
    }
}