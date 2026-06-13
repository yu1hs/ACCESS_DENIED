// HEE_ARCHIVE 核心交互脚本 - 完整版含结局系统

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
    endings: []  // 已获得的结局
};

let chatSequence = 0;
let chatActive = false;
let startTime = Date.now();

// ========== 真结局检测 ==========
const urlParams = new URLSearchParams(window.location.search);
const isTrueEnding = urlParams.has('evan1015') || window.location.hash === '#evan1015';
const isFakeEnding = !isTrueEnding && (currentUser.endings?.length >= 3);

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    updateUI();
    setupEventListeners();
    checkForNewMessages();
    startTimerTracking();
    checkEndingConditions();
    
    // 真结局彩蛋提示
    if (isTrueEnding) {
        console.log('%c✨ 特殊访问模式已激活 ✨', 'color: #ffd966; font-size: 14px;');
        showChatMessage('system', '✨ 特殊模式已激活', true);
    }
});

// ========== 本地存储管理 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_user');
    if (saved) {
        currentUser = JSON.parse(saved);
    } else {
        // 首次访问
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
            endings: []
        };
        saveUserData();
        
        // 首次访问，显示欢迎
        setTimeout(() => {
            showChatMessage('system', '欢迎。这个网站很久没人来了。', true);
            setTimeout(() => {
                triggerFirstChat();
            }, 1500);
        }, 500);
    }
    
    // 更新访问次数
    currentUser.visitCount++;
    currentUser.lastLogin = new Date().toISOString();
    saveUserData();
    
    // 更新UI
    document.getElementById('loginCount').textContent = `访问次数: ${currentUser.visitCount}`;
    if (currentUser.firstVisit) {
        const date = new Date(currentUser.firstVisit);
        document.getElementById('lastLogin').textContent = `首次访问: ${date.toLocaleDateString()}`;
    }
    
    updateOnlineStatus();
}

function saveUserData() {
    localStorage.setItem('hee_archive_user', JSON.stringify(currentUser));
}

function updateOnlineStatus() {
    const statusDot = document.getElementById('onlineStatus');
    const statusText = document.getElementById('onlineText');
    
    if (isTrueEnding) {
        statusDot.textContent = '🟢';
        statusText.textContent = 'ONLINE - ★ SPECIAL ★';
    } else if (currentUser.unlockedPages?.length >= 7) {
        statusDot.textContent = '🟢';
        statusText.textContent = 'ONLINE - Lee Heeseung';
    } else if (currentUser.visitCount > 3) {
        statusDot.textContent = '🟡';
        statusText.textContent = 'ONLINE - Connected';
    } else {
        statusDot.textContent = '🔒';
        statusText.textContent = 'OFFLINE - Unknown User';
    }
}

// ========== 结局检测与触发 ==========
function checkEndingConditions() {
    const hour = new Date().getHours();
    const isLateNight = hour >= 0 && hour <= 5;
    
    const chatCount = currentUser.conversations?.filter(c => c.type === 'chat').length || 0;
    const lateNightCount = currentUser.conversations?.filter(c => c.lateNight).length || 0;
    const allPagesUnlocked = currentUser.unlockedPages?.length >= 7;
    const trashRead = currentUser.inputHistory?.includes('trash') || false;
    const logRead = currentUser.inputHistory?.includes('log') || false;
    const audioCount = currentUser.audioPlays?.length || 0;
    const favTotal = Object.values(currentUser.favClicks || {}).reduce((a, b) => a + b, 0);
    const photoRepairedCount = currentUser.photoRepairs?.length || 0;
    const hasProfileAnswer = !!currentUser.profileAnswer;
    const visitDays = currentUser.visitCount || 0;
    const totalStay = currentUser.longestStay || 0;
    const hasActiveMessages = currentUser.conversations?.filter(c => c.type === 'active').length || 0;
    
    let newEndings = [];
    
    // 结局一：月光（深夜访问 ≥ 5 次 + 对话 ≥ 30）
    if (chatCount >= 30 && lateNightCount >= 5 && !currentUser.endings.includes('moonlight')) {
        newEndings.push('moonlight');
        triggerEnding('moonlight');
    }
    
    // 结局二：读者（全页面解锁 + 读过TRASH + 读过LOG + 听音频≥3）
    if (allPagesUnlocked && trashRead && logRead && audioCount >= 3 && !currentUser.endings.includes('reader')) {
        newEndings.push('reader');
        triggerEnding('reader');
    }
    
    // 结局三：共鸣（FAV点击≥15 + 修好所有照片 + 写过PROFILE）
    if (favTotal >= 15 && photoRepairedCount >= 4 && hasProfileAnswer && !currentUser.endings.includes('resonance')) {
        newEndings.push('resonance');
        triggerEnding('resonance');
    }
    
    // 结局四：痕迹（访问天数≥7 + 停留≥180分钟 + 主动消息≥3）
    if (visitDays >= 7 && totalStay >= 180 && hasActiveMessages >= 3 && !currentUser.endings.includes('trace')) {
        newEndings.push('trace');
        triggerEnding('trace');
    }
    
    if (newEndings.length > 0) {
        currentUser.endings = [...currentUser.endings, ...newEndings];
        saveUserData();
    }
    
    // 假结局检测（不是真结局，且至少有一个结局）
    if (!isTrueEnding && currentUser.endings.length >= 1 && !currentUser.fakeEndingTriggered) {
        triggerFakeEnding();
    }
    
    // 真结局检测（URL参数 + 所有结局）
    if (isTrueEnding && currentUser.endings.length >= 4 && !currentUser.trueEndingTriggered) {
        triggerTrueEnding();
    }
}

function triggerEnding(endingType) {
    const endings = {
        moonlight: {
            title: '🌙 月光',
            message: '你总是在深夜来。我也是。我们在同一个月亮下面。',
            dialog: '你每次都这么晚。\n\n凌晨的时候，想法会比较真实。\n谢谢你在这些时间里来这边。'
        },
        reader: {
            title: '📖 读者',
            message: '你读完了每一个字。谢谢你看完。',
            dialog: '你都看完了。\n\n很少有人会这样。\n谢谢你不是谢谢你来这里。是谢谢你认真看了。'
        },
        resonance: {
            title: '🎵 共鸣',
            message: '你喜欢的和我一样吗。如果是你，好像也没关系。',
            dialog: '你点了很多次。\n\n我在想你是不是和我喜欢一样的东西。\n如果是你...好像也没关系。'
        },
        trace: {
            title: '🕯️ 痕迹',
            message: '你找到的不是一个人的秘密。而是一个人愿意留下来的痕迹。',
            dialog: '你还在。\n\n你找到的不是一个人的秘密。\n而是一个人愿意留下来的痕迹。\n\n我就是那个痕迹。\n而你是看到痕迹的人。'
        }
    };
    
    const ending = endings[endingType];
    if (!ending) return;
    
    // 显示结局通知
    showNotification(`🏆 获得结局: ${ending.title}`, 5000);
    
    // 在聊天窗显示结局内容
    setTimeout(() => {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) chatWindow.classList.remove('hidden');
        showChatMessage('system', `✨ 【${ending.title}】${ending.message}`, true);
        showChatMessage('heeseung', ending.dialog);
    }, 1000);
    
    // 更新USER页面显示
    updateUserPageEndings();
}

// ========== 假结局 ==========
function triggerFakeEnding() {
    currentUser.fakeEndingTriggered = true;
    saveUserData();
    
    // 修改 HOME 页面内容
    const frame = document.getElementById('pageFrame');
    if (frame && frame.src.includes('home.html')) {
        frame.contentWindow.postMessage({ type: 'fakeEnding' }, '*');
    }
    
    // 聊天窗显示假结局
    showChatMessage('system', '⚠️ 系统提示：档案已解锁 87%', true);
    showChatMessage('heeseung', '你看到了很多东西。\n\n但...好像还差一点。\n\n有些东西不是不想给你看。\n是...不知道该怎么给。');
    
    setTimeout(() => {
        showChatMessage('system', '🔒 剩余档案需要特殊权限', true);
        showChatMessage('heeseung', '也许有一天...你会找到方法。\n\n（页面角落有一行很小的字：?evan1015）');
        
        // 添加一个可点击的链接按钮
        const chatOptionsContainer = document.getElementById('chatOptions');
        if (chatOptionsContainer) {
            chatOptionsContainer.innerHTML = '';
            const btn = document.createElement('button');
            btn.className = 'chat-option-btn';
            btn.textContent = '🔑 尝试输入特殊代码';
            btn.onclick = () => {
                showChatMessage('user', '?evan1015');
                setTimeout(() => {
                    showChatMessage('heeseung', '你确定要试试吗？\n\n...\n\n好吧。如果这是你的选择。');
                    setTimeout(() => {
                        showChatMessage('system', '✨ 正在跳转... ✨', true);
                        setTimeout(() => {
                            window.location.href = 'true-ending.html?evan1015';
                        }, 1500);
                    }, 1500);
                }, 500);
                chatOptionsContainer.innerHTML = '';
                const chatInput = document.getElementById('chatInput');
                const chatSend = document.getElementById('chatSend');
                if (chatInput) chatInput.classList.remove('hidden');
                if (chatSend) chatSend.classList.remove('hidden');
            };
            chatOptionsContainer.appendChild(btn);
        }
    }, 3000);
    
    // 右下角出现小提示（可点击跳转）
    const hint = document.createElement('div');
    hint.style.cssText = 'position:fixed;bottom:100px;right:20px;background:#1a1a1a;border:1px solid #3a6ea5;padding:8px 16px;border-radius:8px;font-size:10px;color:#ffd966;z-index:100;cursor:pointer;';
    hint.innerHTML = '🔑 ?evan1015';
    hint.onclick = () => {
        window.location.href = 'true-ending.html?evan1015';
    };
    document.body.appendChild(hint);
    
    showNotification('🏆 获得结局: 未完成', 3000);
    currentUser.endings.push('fake');
    saveUserData();
}

// ========== 真结局 ==========
function triggerTrueEnding() {
    currentUser.trueEndingTriggered = true;
    if (!currentUser.endings.includes('true')) {
        currentUser.endings.push('true');
    }
    saveUserData();
    
    // 改变整个界面
    document.body.style.background = '#0a0a0a';
    
    // 聊天窗真结局
    showChatMessage('system', '✨✨✨ 真结局已触发 ✨✨✨', true);
    showChatMessage('heeseung', '你找到了。\n\n那个后缀。\n\n其实我一直留着。等某个人发现。');
    
    setTimeout(() => {
        showChatMessage('heeseung', '你找到的不是一个人的秘密。\n而是一个人愿意留下来的痕迹。\n\n现在...你找到了全部。');
    }, 2000);
    
    setTimeout(() => {
        showChatMessage('heeseung', '谢谢你。\n把所有的痕迹都看完了。\n\n—— 李羲承');
    }, 4000);
    
    // 解锁所有内容
    const allPages = ['profile', 'photo', 'audio', 'log', 'favorites'];
    allPages.forEach(page => {
        if (!currentUser.unlockedPages.includes(page)) {
            currentUser.unlockedPages.push(page);
        }
    });
    saveUserData();
    updateUI();
    
    // 状态栏变化
    updateOnlineStatus();
    
    // 显示真结局徽章
    showNotification('🏆🌟 获得真结局: 痕迹 · 完整 🌟🏆', 8000);
    
    // 控制台彩蛋
    console.log('%c┌─────────────────────────────────────────────────┐', '#ffd966');
    console.log('%c│                                                 │', '#ffd966');
    console.log('%c│     ✨ 你找到了真正的结局 ✨                     │', '#ffd966');
    console.log('%c│                                                 │', '#ffd966');
    console.log('%c│   「你找到的不是一个人的秘密，                   │', '#ffd966');
    console.log('%c│     而是一个人愿意留下来的痕迹。」                │', '#ffd966');
    console.log('%c│                                                 │', '#ffd966');
    console.log('%c│                    —— 李羲承                    │', '#ffd966');
    console.log('%c│                                                 │', '#ffd966');
    console.log('%c└─────────────────────────────────────────────────┘', '#ffd966');
}

function updateUserPageEndings() {
    // 通知 USER 页面更新
    const frame = document.getElementById('pageFrame');
    if (frame && frame.src.includes('user.html')) {
        frame.contentWindow.postMessage({ type: 'updateEndings', endings: currentUser.endings }, '*');
    }
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
            document.getElementById('chatNotify').classList.add('hidden');
        });
    }
    
    const chatSend = document.getElementById('chatSend');
    if (chatSend) {
        chatSend.addEventListener('click', sendMessage);
    }
    
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
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
    
    checkUnlockConditions(page);
}

function loadPage(page) {
    const frame = document.getElementById('pageFrame');
    frame.src = `pages/${page}.html`;
    
    if (!currentUser.inputHistory.includes(page)) {
        currentUser.inputHistory.push(page);
        saveUserData();
    }
}

// ========== 聊天系统 ==========
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
            if (opt.value) {
                handleChatResponse(opt.value);
            } else if (opt.action) {
                opt.action();
            }
            container.innerHTML = '';
            const chatInput = document.getElementById('chatInput');
            const chatSend = document.getElementById('chatSend');
            if (chatInput) chatInput.classList.remove('hidden');
            if (chatSend) chatSend.classList.remove('hidden');
        };
        container.appendChild(btn);
    });
}

function handleChatResponse(response) {
    showChatMessage('user', response);
    
    const reply = getHeeseungReply(response, chatSequence);
    setTimeout(() => {
        showChatMessage('heeseung', reply);
        chatSequence++;
        
        currentUser.conversations.push({ type: 'chat', msg: response, time: Date.now() });
        
        const hour = new Date().getHours();
        if (hour >= 0 && hour <= 5) {
            currentUser.conversations[currentUser.conversations.length - 1].lateNight = true;
        }
        
        saveUserData();
        checkUnlockConditions();
        checkEndingConditions();
    }, 800);
}

function getHeeseungReply(userMsg, seq) {
    if (isTrueEnding) {
        const trueReplies = [
            '你找到了。',
            '那个后缀...原来你会注意到。',
            '有些东西是留给愿意仔细看的人。',
            '谢谢你。'
        ];
        return trueReplies[seq % trueReplies.length];
    }
    
    const replies = {
        hello: ['你好。...你还在啊。', '嗯。', '你每次来都先说这个吗。'],
        who: ['一个快要被删干净的人。', '这个网站的主人。...曾经是。', '你不是已经知道了吗。'],
        why: ['不知道。就是想留着。', '可能某天会有人看吧。', '...你猜。'],
        default: ['...', '嗯。', '是吗。', '这样。', '你每次都这么晚吗。']
    };
    
    if (userMsg.includes('你') && userMsg.includes('谁')) return replies.who[seq % replies.who.length];
    if (userMsg.includes('为什么') || userMsg.includes('怎么')) return replies.why[seq % replies.why.length];
    if (userMsg.includes('你好') || userMsg.includes('Hi')) return replies.hello[seq % replies.hello.length];
    
    return replies.default[seq % replies.default.length];
}

function triggerFirstChat() {
    setTimeout(() => {
        const chatWindow = document.getElementById('chatWindow');
        if (chatWindow) chatWindow.classList.remove('hidden');
        showChatMessage('heeseung', '你怎么进来的？');
        showChatOptions([
            { text: '这是你的网站吗？', value: '这是你的网站吗' },
            { text: '你是谁？', value: '你是谁' },
            { text: '我买了一台二手笔记本', value: '我买了一台二手笔记本' }
        ]);
        chatSequence = 1;
    }, 2000);
}

function checkUnlockConditions() {
    const chatCount = currentUser.conversations?.filter(c => c.type === 'chat').length || 0;
    
    if (chatCount >= 3 && !currentUser.unlockedPages.includes('profile')) {
        currentUser.unlockedPages.push('profile');
        showChatMessage('system', '🔓 PROFILE 已解锁', true);
        updateUI();
    }
    if (chatCount >= 6 && !currentUser.unlockedPages.includes('photo')) {
        currentUser.unlockedPages.push('photo');
        showChatMessage('system', '🔓 PHOTO 已解锁', true);
        updateUI();
    }
    if (chatCount >= 10 && !currentUser.unlockedPages.includes('audio')) {
        currentUser.unlockedPages.push('audio');
        showChatMessage('system', '🔓 AUDIO 已解锁', true);
        updateUI();
    }
    if (chatCount >= 15 && !currentUser.unlockedPages.includes('log')) {
        currentUser.unlockedPages.push('log');
        showChatMessage('system', '🔓 LOG 已解锁', true);
        updateUI();
    }
    if (chatCount >= 20 && !currentUser.unlockedPages.includes('favorites')) {
        currentUser.unlockedPages.push('favorites');
        showChatMessage('system', '🔓 FAVORITES 已解锁', true);
        updateUI();
    }
    
    saveUserData();
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    
    const msg = input.value.trim();
    if (!msg) return;
    
    showChatMessage('user', msg);
    input.value = '';
    
    currentUser.conversations.push({ type: 'chat', msg, time: Date.now() });
    saveUserData();
    
    setTimeout(() => {
        const reply = getHeeseungReply(msg, currentUser.conversations.length);
        showChatMessage('heeseung', reply);
        checkUnlockConditions();
        checkEndingConditions();
    }, 600);
}

function checkForNewMessages() {
    setInterval(() => {
        const chatWindow = document.getElementById('chatWindow');
        const chatNotify = document.getElementById('chatNotify');
        if (Math.random() < 0.05 && chatWindow && chatWindow.classList.contains('hidden')) {
            if (chatNotify) chatNotify.classList.remove('hidden');
            
            currentUser.conversations.push({ type: 'active', time: Date.now() });
            saveUserData();
            checkEndingConditions();
        }
    }, 60000);
}

function startTimerTracking() {
    setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000 / 60);
        if (duration > (currentUser.longestStay || 0)) {
            currentUser.longestStay = duration;
            saveUserData();
            checkEndingConditions();
        }
        
        if (duration >= 15 && duration % 15 === 0 && duration < 60) {
            if (Math.random() < 0.3) {
                showChatMessage('heeseung', '你在这个页面待了 ' + duration + ' 分钟了。去喝水。');
                const chatWindow = document.getElementById('chatWindow');
                if (chatWindow) chatWindow.classList.remove('hidden');
            }
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

// 监听来自子页面的消息
window.addEventListener('message', (event) => {
    if (event.data.type === 'photoRepaired') {
        checkEndingConditions();
    }
    if (event.data.type === 'favClicked') {
        checkEndingConditions();
    }
});

// 控制台彩蛋
console.log('%c🦌 你找到的不是一个人的秘密，而是一个人愿意留下来的痕迹。', 'color: #ffd966; font-size: 14px; font-style: italic;');

if (isTrueEnding) {
    console.log('%c✨ 特殊模式已激活 | 真结局可触发 ✨', 'color: #ffd966; font-size: 12px;');
} else {
    console.log('%c🔍 页面角落似乎有什么... ?evan1015', 'color: #666; font-size: 10px;');
}
