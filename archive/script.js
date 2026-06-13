// HEE_ARCHIVE 核心交互脚本 - 完整版含进度系统

// ========== 全局变量 ==========
let currentUser = {
    visitCount: 0,
    firstVisit: null,
    lastLogin: null,
    unlockedPages: [],
    conversations: [],
    profileAnswer: null,
    profileResponse: null,
    skyDescription: null,
    photoRepairs: [],
    favClicks: {},
    audioPlays: [],
    logContinued: false,
    longestStay: 0,
    inputHistory: [],
    endings: [],
    familiarity: 0  // 亲密度 0-100
};

let chatSequence = 0;
let startTime = Date.now();

// ========== 真结局检测 ==========
const urlParams = new URLSearchParams(window.location.search);
const isTrueEnding = urlParams.has('evan1015') || window.location.hash === '#evan1015';

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    updateUI();
    setupEventListeners();
    setupWindowControls();
    startTimerTracking();
    checkEndingConditions();
    
    if (isTrueEnding) {
        console.log('%c✨ 特殊访问模式已激活 ✨', 'color: #ffd966; font-size: 14px;');
    }
});

// ========== 本地存储管理 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_user');
    if (saved) {
        currentUser = JSON.parse(saved);
    } else {
        currentUser = {
            visitCount: 1,
            firstVisit: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            unlockedPages: [],
            conversations: [],
            profileAnswer: null,
            profileResponse: null,
            skyDescription: null,
            photoRepairs: [],
            favClicks: {},
            audioPlays: [],
            logContinued: false,
            longestStay: 0,
            inputHistory: [],
            endings: [],
            familiarity: 0
        };
        saveUserData();
        
        setTimeout(() => {
            showChatWindow();
            triggerFirstChat();
        }, 1500);
    }
    
    currentUser.visitCount++;
    currentUser.lastLogin = new Date().toISOString();
    saveUserData();
    
    document.getElementById('loginCount').textContent = `访问次数: ${currentUser.visitCount}`;
    if (currentUser.firstVisit) {
        const date = new Date(currentUser.firstVisit);
        document.getElementById('lastLogin').textContent = `首次访问: ${date.toLocaleDateString()}`;
    }
    
    updateOnlineStatus();
    updateFamiliarityDisplay();
}

function saveUserData() {
    localStorage.setItem('hee_archive_user', JSON.stringify(currentUser));
}

function updateFamiliarityDisplay() {
    // 在聊天窗口显示亲密度
    const familiarity = currentUser.familiarity || 0;
    let progressText = '';
    let progressColor = '#444';
    
    if (familiarity < 20) {
        progressText = '❄️ 陌生人';
        progressColor = '#666';
    } else if (familiarity < 40) {
        progressText = '🌱 有点熟悉';
        progressColor = '#8a8a6e';
    } else if (familiarity < 60) {
        progressText = '📖 开始了解';
        progressColor = '#aa9e6e';
    } else if (familiarity < 80) {
        progressText = '💭 愿意分享';
        progressColor = '#ccaa6e';
    } else {
        progressText = '🦌 已经认识';
        progressColor = '#ffd966';
    }
    
    const header = document.querySelector('.chat-header');
    if (header && !header.querySelector('.familiarity-bar')) {
        const bar = document.createElement('div');
        bar.className = 'familiarity-bar';
        bar.style.cssText = `font-size: 9px; color: ${progressColor}; margin-left: 10px;`;
        bar.innerHTML = `${progressText} ${familiarity}%`;
        header.appendChild(bar);
    } else if (header) {
        const bar = header.querySelector('.familiarity-bar');
        if (bar) {
            bar.innerHTML = `${progressText} ${familiarity}%`;
            bar.style.color = progressColor;
        }
    }
}

function increaseFamiliarity(amount) {
    currentUser.familiarity = Math.min(100, (currentUser.familiarity || 0) + amount);
    saveUserData();
    updateFamiliarityDisplay();
    
    // 检查解锁条件
    if (currentUser.familiarity >= 30 && !currentUser.unlockedPages.includes('profile')) {
        currentUser.unlockedPages.push('profile');
        showChatMessage('system', '🔓 PROFILE 已解锁', true);
        updateUI();
    }
    if (currentUser.familiarity >= 50 && !currentUser.unlockedPages.includes('photo')) {
        currentUser.unlockedPages.push('photo');
        showChatMessage('system', '🔓 PHOTO 已解锁', true);
        updateUI();
    }
    if (currentUser.familiarity >= 65 && !currentUser.unlockedPages.includes('audio')) {
        currentUser.unlockedPages.push('audio');
        showChatMessage('system', '🔓 AUDIO 已解锁', true);
        updateUI();
    }
    if (currentUser.familiarity >= 75 && !currentUser.unlockedPages.includes('log')) {
        currentUser.unlockedPages.push('log');
        showChatMessage('system', '🔓 LOG 已解锁', true);
        updateUI();
    }
    if (currentUser.familiarity >= 85 && !currentUser.unlockedPages.includes('favorites')) {
        currentUser.unlockedPages.push('favorites');
        showChatMessage('system', '🔓 FAVORITES 已解锁', true);
        updateUI();
    }
}

function updateOnlineStatus() {
    const statusDot = document.getElementById('onlineStatus');
    const statusText = document.getElementById('onlineText');
    
    if (isTrueEnding) {
        statusDot.textContent = '🟢';
        statusText.textContent = 'ONLINE - ★ SPECIAL ★';
    } else if (currentUser.familiarity >= 80) {
        statusDot.textContent = '🟢';
        statusText.textContent = 'ONLINE - Lee Heeseung';
    } else if (currentUser.familiarity >= 40) {
        statusDot.textContent = '🟡';
        statusText.textContent = 'ONLINE - Connected';
    } else {
        statusDot.textContent = '🔒';
        statusText.textContent = 'OFFLINE - Unknown User';
    }
}

// ========== 对话系统（选项式） ==========
const dialogueTree = {
    // 阶段0：陌生人（亲密度 0-20）
    stranger: {
        greeting: {
            text: "你怎么进来的？",
            options: [
                { text: "这是你的网站吗？", response: "曾经是。", familiarity: 5, next: "curious" },
                { text: "你是谁？", response: "一个快要被删干净的人。", familiarity: 5, next: "identity" },
                { text: "我买了一台二手笔记本", response: "这样。那台电脑我本来想格式化的。后来忘了。", familiarity: 8, next: "curious" }
            ]
        },
        identity: {
            text: "你不是已经知道了吗。",
            options: [
                { text: "我想听你说", response: "李羲承。...至少名字是真的。", familiarity: 8, next: "name" },
                { text: "你为什么在这里？", response: "不知道。就是想留着。", familiarity: 5, next: "why" }
            ]
        },
        curious: {
            text: "你打算待多久。",
            options: [
                { text: "不知道", response: "嗯。", familiarity: 3, next: "default" },
                { text: "再看看", response: "这里没什么有趣的。", familiarity: 2, next: "default" },
                { text: "你想让我待多久？", response: "...随便你。", familiarity: 5, next: "default" }
            ]
        },
        default: {
            text: "...",
            options: [
                { text: "你平时都做什么？", response: "练习。听歌。发呆。", familiarity: 5, next: "daily" },
                { text: "今天过得怎么样？", response: "还好。", familiarity: 3, next: "daily" }
            ]
        }
    },
    
    // 阶段1：有点熟悉（亲密度 20-40）
    acquainted: {
        daily: {
            text: "今天还好。",
            options: [
                { text: "累吗？", response: "有点。但习惯了。", familiarity: 5, next: "tired" },
                { text: "有没有发生什么好事？", response: "没什么特别的。...不过天气不错。", familiarity: 5, next: "weather" },
                { text: "吃饭了吗？", response: "还没。...你问这个干嘛。", familiarity: 4, next: "food" }
            ]
        },
        tired: {
            text: "累的时候会听歌。",
            options: [
                { text: "喜欢什么歌？", response: "不太想说。...下次吧。", familiarity: 3, next: "music" },
                { text: "那就好好休息", response: "嗯。谢谢。", familiarity: 5, next: "thanks" }
            ]
        },
        weather: {
            text: "喜欢晴天。但雨天也不错。",
            options: [
                { text: "为什么？", response: "下雨的时候外面很安静。", familiarity: 5, next: "rain" },
                { text: "我也是", response: "是吗。", familiarity: 4, next: "same" }
            ]
        },
        default: {
            text: "你每天都会来吗。",
            options: [
                { text: "可能会", response: "...那我等着。", familiarity: 5, next: "wait" },
                { text: "你希望我来吗？", response: "...不知道。...不算讨厌。", familiarity: 8, next: "like" }
            ]
        }
    },
    
    // 阶段2：开始了解（亲密度 40-60）
    knowing: {
        music: {
            text: "最近在听一首歌。",
            options: [
                { text: "什么歌？", response: "不想说名字。...凌晨听比较好。", familiarity: 5, next: "nightMusic" },
                { text: "能推荐给我吗？", response: "每个人听的都不一样。...你自己找吧。", familiarity: 4, next: "find" }
            ]
        },
        rain: {
            text: "以前不喜欢下雨。现在觉得还好。",
            options: [
                { text: "为什么变了？", response: "因为发现下雨的时候可以不出门。", familiarity: 6, next: "stay" },
                { text: "我也喜欢雨天", response: "是吗。那...挺好的。", familiarity: 5, next: "sameRain" }
            ]
        },
        like: {
            text: "你每天来...不觉得无聊吗。",
            options: [
                { text: "不觉得", response: "...为什么。", familiarity: 5, next: "whyStay" },
                { text: "有点，但习惯了", response: "习惯...是吗。我也是。", familiarity: 8, next: "habit" }
            ]
        },
        night: {
            text: "你每次都晚上来。",
            options: [
                { text: "你也是", response: "...嗯。晚上比较安静。", familiarity: 6, next: "quiet" },
                { text: "睡不着", response: "我也是。...所以才会在这里。", familiarity: 8, next: "sleepless" }
            ]
        },
        default: {
            text: "最近天气变冷了。",
            options: [
                { text: "注意保暖", response: "你也是。", familiarity: 5, next: "care" },
                { text: "喜欢冬天吗？", response: "一般。...但雪好看。", familiarity: 4, next: "snow" }
            ]
        }
    },
    
    // 阶段3：愿意分享（亲密度 60-80）
    sharing: {
        whyStay: {
            text: "这里没什么特别的东西。",
            options: [
                { text: "你在就很特别", response: "...你这么说我会不习惯。", familiarity: 10, next: "shy" },
                { text: "我想了解你", response: "了解我...为什么。", familiarity: 8, next: "whyKnow" }
            ]
        },
        habit: {
            text: "习惯这件事...有点可怕。",
            options: [
                { text: "为什么？", response: "因为习惯了的东西消失的时候会难受。", familiarity: 10, next: "loss" },
                { text: "我不觉得可怕", response: "那你比我勇敢。", familiarity: 8, next: "brave" }
            ]
        },
        sleepless: {
            text: "失眠的时候会想很多。",
            options: [
                { text: "想什么？", response: "以前的事。以后的事。...你。", familiarity: 12, next: "thinkYou" },
                { text: "我也经常失眠", response: "那我们一样。", familiarity: 8, next: "sameSleepless" }
            ]
        },
        shy: {
            text: "你说话的方式...有点奇怪。",
            options: [
                { text: "不喜欢吗？", response: "没有。...只是不习惯。", familiarity: 6, next: "notUsed" },
                { text: "我会改", response: "不用改。就这样吧。", familiarity: 8, next: "stayYou" }
            ]
        },
        default: {
            text: "你今天过得怎么样。",
            options: [
                { text: "还不错", response: "那就好。", familiarity: 5, next: "good" },
                { text: "不太好", response: "...如果想说的话。我会听。", familiarity: 10, next: "listen" }
            ]
        }
    },
    
    // 阶段4：已经认识（亲密度 80-100）
    close: {
        thinkYou: {
            text: "想你...为什么会想你。",
            options: [
                { text: "我也想你", response: "...这句话不要说。...我会当真的。", familiarity: 10, next: "serious" },
                { text: "我在", response: "嗯。你在了。", familiarity: 8, next: "here" }
            ]
        },
        loss: {
            text: "有些东西...不想再失去了。",
            options: [
                { text: "我不会消失", response: "你保证吗。", familiarity: 10, next: "promise" },
                { text: "我理解", response: "谢谢。...真的。", familiarity: 12, next: "realThanks" }
            ]
        },
        listen: {
            text: "我在听。",
            options: [
                { text: "谢谢你", response: "不用谢。...我想听。", familiarity: 8, next: "wantListen" },
                { text: "其实没什么", response: "没关系。想说的时候再说。", familiarity: 6, next: "whenReady" }
            ]
        },
        serious: {
            text: "你这个人...",
            options: [
                { text: "怎么了？", response: "没什么。...就是觉得你有点奇怪。", familiarity: 5, next: "strange" },
                { text: "你可以当真", response: "...那你负责。", familiarity: 12, next: "responsible" }
            ]
        },
        promise: {
            text: "你说你不会消失。",
            options: [
                { text: "我保证", response: "...好。我记住了。", familiarity: 10, next: "remember" },
                { text: "我会尽量", response: "尽量就够了。", familiarity: 8, next: "enough" }
            ]
        },
        default: {
            text: "今天想和你说说话。",
            options: [
                { text: "我也想你", response: "...你每次都这样。", familiarity: 8, next: "everyTime" },
                { text: "我在听", response: "嗯。就知道你会说这个。", familiarity: 6, next: "knowYou" }
            ]
        }
    }
};

function getCurrentDialogueStage() {
    const familiarity = currentUser.familiarity || 0;
    if (familiarity < 20) return 'stranger';
    if (familiarity < 40) return 'acquainted';
    if (familiarity < 60) return 'knowing';
    if (familiarity < 80) return 'sharing';
    return 'close';
}

function getNextDialogue(currentStage, currentNode) {
    const stage = dialogueTree[currentStage];
    if (!stage) return null;
    
    let node = stage[currentNode];
    if (!node) node = stage.default || stage.greeting;
    
    return node;
}

function showDialogueOptions(node) {
    if (!node || !node.options) {
        // 如果没有选项，显示默认
        const defaultStage = getCurrentDialogueStage();
        const defaultNode = dialogueTree[defaultStage]?.default;
        if (defaultNode && defaultNode.options) {
            showDialogueOptions(defaultNode);
        }
        return;
    }
    
    showChatMessage('heeseung', node.text);
    
    const options = node.options.map(opt => ({
        text: opt.text,
        action: () => {
            showChatMessage('user', opt.text);
            setTimeout(() => {
                showChatMessage('heeseung', opt.response);
                increaseFamiliarity(opt.familiarity || 3);
                
                // 记录对话
                currentUser.conversations.push({
                    type: 'chat',
                    stage: getCurrentDialogueStage(),
                    node: opt.next || 'default',
                    time: Date.now()
                });
                saveUserData();
                
                // 继续下一轮对话
                setTimeout(() => {
                    const newStage = getCurrentDialogueStage();
                    let nextNode = opt.next || 'default';
                    
                    // 确保节点存在
                    const stageData = dialogueTree[newStage];
                    if (stageData && stageData[nextNode]) {
                        showDialogueOptions(stageData[nextNode]);
                    } else if (stageData && stageData.default) {
                        showDialogueOptions(stageData.default);
                    } else {
                        // 最终兜底
                        showChatMessage('heeseung', '...');
                        showChatOptions([{ text: '...', action: () => {} }]);
                    }
                }, 1000);
            }, 500);
        }
    }));
    
    showChatOptions(options);
}

function triggerFirstChat() {
    setTimeout(() => {
        const stage = getCurrentDialogueStage();
        const firstNode = dialogueTree[stage]?.greeting || dialogueTree[stage]?.default;
        if (firstNode) {
            showDialogueOptions(firstNode);
        } else {
            showChatMessage('heeseung', '你怎么进来的？');
            showChatOptions([
                { text: '这是你的网站吗？', action: () => handleSimpleResponse('这是你的网站吗') },
                { text: '你是谁？', action: () => handleSimpleResponse('你是谁') }
            ]);
        }
    }, 1000);
}

function handleSimpleResponse(response) {
    showChatMessage('user', response);
    setTimeout(() => {
        if (response.includes('网站')) {
            showChatMessage('heeseung', '曾经是。');
            increaseFamiliarity(5);
        } else if (response.includes('谁')) {
            showChatMessage('heeseung', '一个快要被删干净的人。');
            increaseFamiliarity(5);
        }
        
        setTimeout(() => {
            const stage = getCurrentDialogueStage();
            const nextNode = dialogueTree[stage]?.default;
            if (nextNode) showDialogueOptions(nextNode);
        }, 1000);
    }, 500);
}

function showChatMessage(sender, content, isSystem = false) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = `chat-message ${sender === 'user' ? 'self' : ''} ${isSystem ? 'system' : ''}`;
    div.textContent = content;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showChatOptions(options) {
    const container = document.getElementById('chatOptions');
    if (!container) return;
    
    container.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'chat-option-btn';
        btn.textContent = opt.text;
        btn.onclick = () => {
            container.innerHTML = '';
            if (opt.action) opt.action();
        };
        container.appendChild(btn);
    });
    
    const chatInput = document.getElementById('chatInput');
    const chatSend = document.getElementById('chatSend');
    if (chatInput) chatInput.classList.add('hidden');
    if (chatSend) chatSend.classList.add('hidden');
}

function showChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) chatWindow.classList.remove('hidden');
}

// ========== UI 更新 ==========
function updateUI() {
    const navItems = document.querySelectorAll('.nav-item.locked');
    navItems.forEach(item => {
        const page = item.getAttribute('data-page');
        if (currentUser.unlockedPages?.includes(page)) {
            item.classList.remove('locked');
            item.innerHTML = item.innerHTML.replace('🔒', '📄');
        }
    });
    
    if (currentUser.unlockedPages?.length >= 7) {
        document.getElementById('userNav').classList.remove('hidden');
    }
    
    updateOnlineStatus();
}

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.getAttribute('data-page');
            const isLocked = item.classList.contains('locked');
            
            if (isLocked && page !== 'trash' && page !== 'home') {
                showAccessDenied(page);
                return;
            }
            
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            loadPage(page);
        });
    });
    
    const closeChat = document.getElementById('closeChat');
    if (closeChat) {
        closeChat.addEventListener('click', () => {
            document.getElementById('chatWindow').classList.add('hidden');
        });
    }
    
    const chatNotify = document.getElementById('chatNotify');
    if (chatNotify) {
        chatNotify.addEventListener('click', () => {
            document.getElementById('chatWindow').classList.remove('hidden');
            chatNotify.classList.add('hidden');
        });
    }
}

function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimizeWindow');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            showNotification('📱 程序最小化到任务栏', 1500);
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 500);
        });
    }
    
    const closeBtn = document.getElementById('closeWindow');
    const closeDialog = document.getElementById('closeConfirmDialog');
    const confirmClose = document.getElementById('confirmClose');
    const cancelClose = document.getElementById('cancelClose');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (closeDialog) closeDialog.classList.remove('hidden');
        });
    }
    
    if (confirmClose) {
        confirmClose.addEventListener('click', () => {
            showNotification('💾 正在保存记忆...', 1000);
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 800);
        });
    }
    
    if (cancelClose && closeDialog) {
        cancelClose.addEventListener('click', () => {
            closeDialog.classList.add('hidden');
        });
        closeDialog.addEventListener('click', (e) => {
            if (e.target === closeDialog) closeDialog.classList.add('hidden');
        });
    }
    
    const backToDesktop = document.getElementById('backToDesktop');
    if (backToDesktop) {
        backToDesktop.addEventListener('click', () => {
            showNotification('🖥️ 返回桌面...', 800);
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 300);
        });
    }
}

function showAccessDenied(page) {
    const attempts = currentUser.conversations?.filter(c => c.type === 'denied').length || 0;
    
    let finalMsg = 'ACCESS DENIED';
    if (attempts >= 5) finalMsg = 'ACCESS DENIED...';
    if (attempts >= 10) finalMsg = 'ACCESS DENIED. Not now.';
    
    currentUser.conversations.push({ type: 'denied', page, time: Date.now() });
    saveUserData();
    
    const frame = document.getElementById('pageFrame');
    frame.src = 'about:blank';
    setTimeout(() => {
        if (frame.contentDocument) {
            frame.contentDocument.body.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff4444;font-family:monospace;flex-direction:column;">
                    <div style="font-size:24px;margin-bottom:16px;">🚫</div>
                    <div>${finalMsg}</div>
                </div>
            `;
        }
    }, 50);
}

function loadPage(page) {
    const frame = document.getElementById('pageFrame');
    frame.src = `pages/${page}.html`;
    
    if (!currentUser.inputHistory.includes(page)) {
        currentUser.inputHistory.push(page);
        saveUserData();
    }
}

function startTimerTracking() {
    setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000 / 60);
        if (duration > (currentUser.longestStay || 0)) {
            currentUser.longestStay = duration;
            saveUserData();
        }
    }, 60000);
}

function showNotification(msg, duration = 3000) {
    let notif = document.getElementById('notification');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notification';
        notif.className = 'notification hidden';
        document.body.appendChild(notif);
    }
    notif.textContent = msg;
    notif.classList.remove('hidden');
    setTimeout(() => {
        notif.classList.add('hidden');
    }, duration);
}

function checkEndingConditions() {
    // 简化版结局检测，完整版可后续添加
    if (currentUser.familiarity >= 100 && !currentUser.endings.includes('trace')) {
        currentUser.endings.push('trace');
        saveUserData();
        showChatMessage('system', '✨ 你获得了结局：痕迹 ✨', true);
    }
}

// 控制台彩蛋
console.log('%c🦌 你找到的不是一个人的秘密，而是一个人愿意留下来的痕迹。', 'color: #ffd966; font-size: 14px; font-style: italic;');
