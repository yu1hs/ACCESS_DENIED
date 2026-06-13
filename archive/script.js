// HEE_ARCHIVE 核心交互脚本

// ========== 全局变量 ==========
let currentUser = {
    visitCount: 0,
    lastLogin: null,
    unlockedPages: [],
    conversations: [],
    profileAnswer: null,
    skyDescription: null,
    favoriteSong: null,
    photoRepairs: 0,
    longestStay: 0,
    inputHistory: []
};

let chatSequence = 0; // 对话进度
let chatActive = false;
let pendingMessages = [];

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    updateUI();
    setupEventListeners();
    checkForNewMessages();
    startTimerTracking();
});

// ========== 本地存储管理 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_user');
    if (saved) {
        currentUser = JSON.parse(saved);
    } else {
        // 首次访问
        currentUser.visitCount = 1;
        currentUser.lastLogin = new Date().toISOString();
        currentUser.unlockedPages = [];
        currentUser.conversations = [];
        saveUserData();
        
        // 首次访问，显示欢迎
        setTimeout(() => {
            showChatMessage('system', '欢迎。这个网站很久没人来了。', true);
            setTimeout(() => {
                triggerFirstChat();
            }, 1500);
        }, 500);
    }
    
    // 更新访问次数显示
    document.getElementById('loginCount').textContent = `访问次数: ${currentUser.visitCount}`;
    if (currentUser.lastLogin) {
        const date = new Date(currentUser.lastLogin);
        document.getElementById('lastLogin').textContent = `上次登录: ${date.toLocaleDateString()}`;
    }
    
    // 更新在线状态显示
    updateOnlineStatus();
}

function saveUserData() {
    localStorage.setItem('hee_archive_user', JSON.stringify(currentUser));
}

function updateOnlineStatus() {
    const statusDot = document.getElementById('onlineStatus');
    const statusText = document.getElementById('onlineText');
    if (currentUser.unlockedPages.length >= 7) {
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

// ========== UI 更新 ==========
function updateUI() {
    // 更新锁定的导航项
    const navItems = document.querySelectorAll('.nav-item.locked');
    navItems.forEach(item => {
        const page = item.getAttribute('data-page');
        if (currentUser.unlockedPages.includes(page)) {
            item.classList.remove('locked');
            item.innerHTML = item.innerHTML.replace('🔒', '📄');
        }
    });
    
    // 显示 USER 导航（完全解锁后）
    if (currentUser.unlockedPages.length >= 7) {
        document.getElementById('userNav').classList.remove('hidden');
    }
    
    updateOnlineStatus();
}

function setupEventListeners() {
    // 导航点击
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = item.getAttribute('data-page');
            const isLocked = item.classList.contains('locked');
            
            if (isLocked && page !== 'trash' && page !== 'home') {
                showAccessDenied(page);
                return;
            }
            
            // 激活样式
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // 加载页面
            loadPage(page);
        });
    });
    
    // 聊天窗口
    document.getElementById('closeChat').addEventListener('click', () => {
        document.getElementById('chatWindow').classList.add('hidden');
    });
    
    document.getElementById('chatNotify').addEventListener('click', () => {
        document.getElementById('chatWindow').classList.remove('hidden');
        document.getElementById('chatNotify').classList.add('hidden');
    });
    
    document.getElementById('chatSend').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

function showAccessDenied(page) {
    const deniedMessages = {
        'profile': 'ACCESS DENIED',
        'photo': 'ACCESS DENIED',
        'audio': 'ACCESS DENIED',
        'log': 'ACCESS DENIED',
        'favorites': 'ACCESS DENIED'
    };
    
    const msg = deniedMessages[page] || 'ACCESS DENIED';
    
    // 根据访问次数改变消息
    const attempts = currentUser.conversations.filter(c => c.type === 'denied').length;
    
    let finalMsg = msg;
    if (attempts >= 5) {
        finalMsg = msg + '\n...';
    } else if (attempts >= 10) {
        finalMsg = msg + '\nNot now.';
    }
    
    // 记录拒绝尝试
    currentUser.conversations.push({ type: 'denied', page, time: Date.now() });
    saveUserData();
    
    // 在 iframe 中显示拒绝消息
    const frame = document.getElementById('pageFrame');
    frame.src = 'about:blank';
    setTimeout(() => {
        frame.contentDocument.body.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#ff4444;font-family:monospace;flex-direction:column;">
                <div style="font-size:24px;margin-bottom:16px;">🚫</div>
                <div>${finalMsg}</div>
            </div>
        `;
    }, 50);
    
    // 触发可能的对话
    checkUnlockConditions(page);
}

function loadPage(page) {
    const frame = document.getElementById('pageFrame');
    frame.src = `pages/${page}.html`;
    
    // 记录访问
    if (!currentUser.inputHistory.includes(page)) {
        currentUser.inputHistory.push(page);
        saveUserData();
    }
}

// ========== 聊天系统 ==========
function showChatMessage(sender, content, isSystem = false) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-message ${sender === 'user' ? 'self' : ''} ${isSystem ? 'system' : ''}`;
    div.textContent = content;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showChatOptions(options) {
    const container = document.getElementById('chatOptions');
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
            document.getElementById('chatInput').classList.remove('hidden');
            document.getElementById('chatSend').classList.remove('hidden');
        };
        container.appendChild(btn);
    });
}

function handleChatResponse(response) {
    showChatMessage('user', response);
    
    // 根据对话进度和回复内容，决定羲承的回应
    const reply = getHeeseungReply(response, chatSequence);
    setTimeout(() => {
        showChatMessage('heeseung', reply);
        chatSequence++;
        saveUserData();
        
        // 检查解锁条件
        checkUnlockConditions();
    }, 800);
}

function getHeeseungReply(userMsg, seq) {
    // 基础对话池
    const replies = {
        hello: [
            '你好。...你还在啊。',
            '嗯。',
            '你每次来都先说这个吗。'
        ],
        who: [
            '一个快要被删干净的人。',
            '这个网站的主人。...曾经是。',
            '你不是已经知道了吗。'
        ],
        why: [
            '不知道。就是想留着。',
            '可能某天会有人看吧。',
            '...你猜。'
        ],
        default: [
            '...',
            '嗯。',
            '是吗。',
            '这样。',
            '你每次都这么晚吗。'
        ]
    };
    
    // 根据用户消息关键词选择回复
    if (userMsg.includes('你') && userMsg.includes('谁')) {
        return replies.who[seq % replies.who.length];
    }
    if (userMsg.includes('为什么') || userMsg.includes('怎么')) {
        return replies.why[seq % replies.why.length];
    }
    if (userMsg.includes('你好') || userMsg.includes('Hi') || userMsg.includes('hi')) {
        return replies.hello[seq % replies.hello.length];
    }
    
    return replies.default[seq % replies.default.length];
}

function triggerFirstChat() {
    setTimeout(() => {
        document.getElementById('chatWindow').classList.remove('hidden');
        showChatMessage('heeseung', '你怎么进来的？');
        showChatOptions([
            { text: '这是你的网站吗？', value: '这是你的网站吗' },
            { text: '你是谁？', value: '你是谁' },
            { text: '我买了一台二手笔记本', value: '我买了一台二手笔记本' }
        ]);
        chatSequence = 1;
    }, 2000);
}

function checkUnlockConditions(page) {
    // 根据对话次数解锁页面
    const chatCount = currentUser.conversations.filter(c => c.type === 'chat').length;
    
    // PROFILE 解锁条件：对话 >= 3 次
    if (chatCount >= 3 && !currentUser.unlockedPages.includes('profile')) {
        currentUser.unlockedPages.push('profile');
        showChatMessage('system', '🔓 PROFILE 已解锁', true);
        updateUI();
    }
    
    // PHOTO 解锁条件：对话 >= 6 次
    if (chatCount >= 6 && !currentUser.unlockedPages.includes('photo')) {
        currentUser.unlockedPages.push('photo');
        showChatMessage('system', '🔓 PHOTO 已解锁', true);
        updateUI();
    }
    
    // AUDIO 解锁条件：对话 >= 10 次
    if (chatCount >= 10 && !currentUser.unlockedPages.includes('audio')) {
        currentUser.unlockedPages.push('audio');
        showChatMessage('system', '🔓 AUDIO 已解锁', true);
        updateUI();
    }
    
    // LOG 解锁条件：对话 >= 15 次
    if (chatCount >= 15 && !currentUser.unlockedPages.includes('log')) {
        currentUser.unlockedPages.push('log');
        showChatMessage('system', '🔓 LOG 已解锁', true);
        updateUI();
    }
    
    // FAVORITES 解锁条件：对话 >= 20 次
    if (chatCount >= 20 && !currentUser.unlockedPages.includes('favorites')) {
        currentUser.unlockedPages.push('favorites');
        showChatMessage('system', '🔓 FAVORITES 已解锁', true);
        updateUI();
    }
    
    saveUserData();
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    
    showChatMessage('user', msg);
    input.value = '';
    
    // 记录对话
    currentUser.conversations.push({ type: 'chat', msg, time: Date.now() });
    saveUserData();
    
    // 羲承回复
    setTimeout(() => {
        const reply = getHeeseungReply(msg, currentUser.conversations.length);
        showChatMessage('heeseung', reply);
        
        // 检查解锁
        checkUnlockConditions();
    }, 600);
}

function checkForNewMessages() {
    // 定时检查是否有新消息（模拟羲承主动发消息）
    setInterval(() => {
        if (Math.random() < 0.05 && document.getElementById('chatWindow').classList.contains('hidden')) {
            document.getElementById('chatNotify').classList.remove('hidden');
        }
    }, 60000); // 每分钟检查一次
}

// ========== 停留时间追踪 ==========
let startTime = Date.now();

function startTimerTracking() {
    setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000 / 60);
        if (duration > currentUser.longestStay) {
            currentUser.longestStay = duration;
            saveUserData();
        }
        
        // 停留超过 15 分钟触发消息
        if (duration >= 15 && duration % 15 === 0 && duration < 60) {
            if (Math.random() < 0.3) {
                showChatMessage('heeseung', '你在这个页面待了 ' + duration + ' 分钟了。去喝水。');
                document.getElementById('chatWindow').classList.remove('hidden');
            }
        }
    }, 60000);
}

// ========== 照片修复功能（从 PHOTO 页面调用） ==========
window.repairPhoto = function(photoId, description) {
    if (photoId === 1 && !currentUser.skyDescription) {
        currentUser.skyDescription = description;
        currentUser.photoRepairs++;
        saveUserData();
        return true;
    }
    return false;
};

// ========== 控制台彩蛋 ==========
console.log('%c🦌 你找到的不是一个人的秘密，而是一个人愿意留下来的痕迹。', 'color: #ffd966; font-size: 14px; font-style: italic;');
