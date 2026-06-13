// ==========================================
// HEE_ARCHIVE 核心交互脚本
// 完整版 - 选项式对话 + 真结局触发
// ==========================================

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
    familiarity: 0
};

let chatSequence = 0;
let startTime = Date.now();
let dialogueHistory = []; // 追踪对话路径

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
        document.body.style.setProperty('--glitch-intensity', '3px');
    }
});

// ========== 本地存储管理 ==========
function loadUserData() {
    const saved = localStorage.getItem('hee_archive_user');
    if (saved) {
        try {
            currentUser = JSON.parse(saved);
            currentUser.visitCount++;
            currentUser.lastLogin = new Date().toISOString();
        } catch (e) {
            initNewUser();
        }
    } else {
        initNewUser();
    }

    saveUserData();

    const loginCount = document.getElementById('loginCount');
    const lastLogin = document.getElementById('lastLogin');
    if (loginCount) loginCount.textContent = `访问次数: ${currentUser.visitCount}`;
    if (lastLogin && currentUser.firstVisit) {
        const date = new Date(currentUser.firstVisit);
        lastLogin.textContent = `首次访问: ${date.toLocaleDateString()}`;
    }

    updateOnlineStatus();
    updateFamiliarityDisplay();

    // 新用户触发首次对话
    if (!saved) {
        setTimeout(() => {
            showChatWindow();
            triggerFirstChat();
        }, 2000);
    }
}

function initNewUser() {
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
}

function saveUserData() {
    try {
        localStorage.setItem('hee_archive_user', JSON.stringify(currentUser));
    } catch (e) {
        console.warn('存储空间不足，清理旧对话...');
        if (currentUser.conversations && currentUser.conversations.length > 80) {
            currentUser.conversations = currentUser.conversations.slice(-40);
            localStorage.setItem('hee_archive_user', JSON.stringify(currentUser));
        }
    }
}

function updateFamiliarityDisplay() {
    const familiarity = currentUser.familiarity || 0;
    let progressText, progressColor, emoji;

    if (familiarity < 15) {
        progressText = '陌生人';
        emoji = '❄️';
        progressColor = '#666';
    } else if (familiarity < 30) {
        progressText = '似乎见过';
        emoji = '🌫️';
        progressColor = '#7a7a6e';
    } else if (familiarity < 45) {
        progressText = '有点熟悉';
        emoji = '🌱';
        progressColor = '#8a8a6e';
    } else if (familiarity < 60) {
        progressText = '开始了解';
        emoji = '📖';
        progressColor = '#aa9e6e';
    } else if (familiarity < 75) {
        progressText = '愿意分享';
        emoji = '💭';
        progressColor = '#ccaa6e';
    } else if (familiarity < 90) {
        progressText = '已经认识';
        emoji = '🦌';
        progressColor = '#e6c966';
    } else {
        progressText = '不愿失去';
        emoji = '⏳';
        progressColor = '#ffd966';
    }

    const header = document.querySelector('.chat-header');
    if (header) {
        let bar = header.querySelector('.familiarity-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.className = 'familiarity-bar';
            bar.style.cssText = `font-size: 9px; margin-left: 10px; transition: all 0.5s;`;
            header.appendChild(bar);
        }
        bar.innerHTML = `${emoji} ${progressText} ${familiarity}%`;
        bar.style.color = progressColor;
    }
}

function increaseFamiliarity(amount) {
    currentUser.familiarity = Math.min(100, (currentUser.familiarity || 0) + amount);
    saveUserData();
    updateFamiliarityDisplay();

    // 解锁检查
    const unlocks = [
        { threshold: 25, page: 'profile', name: 'PROFILE', icon: '📄' },
        { threshold: 45, page: 'photo', name: 'PHOTO', icon: '📷' },
        { threshold: 60, page: 'audio', name: 'AUDIO', icon: '🎵' },
        { threshold: 72, page: 'log', name: 'LOG', icon: '📝' },
        { threshold: 85, page: 'favorites', name: 'FAVORITES', icon: '⭐' }
    ];

    unlocks.forEach(({ threshold, page, name, icon }) => {
        if (currentUser.familiarity >= threshold && !currentUser.unlockedPages.includes(page)) {
            currentUser.unlockedPages.push(page);
            showChatMessage('system', `🔓 ${name} 已解锁`, true);
            updateUI();
            // 闪烁效果
            const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
            if (navItem) {
                navItem.style.animation = 'pulse 0.6s ease 3';
                setTimeout(() => navItem.style.animation = '', 1800);
            }
        }
    });

    // 亲密度达到 100 时触发结局
    if (currentUser.familiarity >= 100 && !currentUser.endings.includes('trace')) {
        triggerEnding('trace');
    }
}

function updateOnlineStatus() {
    const statusDot = document.getElementById('onlineStatus');
    const statusText = document.getElementById('onlineText');
    if (!statusDot || !statusText) return;

    if (isTrueEnding) {
        statusDot.textContent = '🟢';
        statusText.textContent = 'ONLINE - ★ SPECIAL ★';
        statusDot.style.animation = 'pulse 1.5s infinite';
    } else if (currentUser.familiarity >= 80) {
        statusDot.textContent = '🟢';
        statusText.textContent = 'ONLINE - Lee Heeseung';
        statusDot.style.animation = 'none';
    } else if (currentUser.familiarity >= 35) {
        statusDot.textContent = '🟡';
        statusText.textContent = 'ONLINE - Connected';
        statusDot.style.animation = 'none';
    } else {
        statusDot.textContent = '🔒';
        statusText.textContent = 'OFFLINE - Unknown User';
        statusDot.style.animation = 'none';
    }
}

// ========== 对话系统（完整选项式） ==========
const dialogueTree = {

    // ========== 阶段0：陌生人（0-15）==========
    stranger: {
        greeting: {
            text: "……你怎么进来的。",
            options: [
                {
                    text: "我买了一台二手笔记本",
                    response: "……那台电脑我本来想格式化的。\n后来忘了。",
                    familiarity: 8,
                    next: "laptop"
                },
                {
                    text: "这是你的网站吗？",
                    response: "曾经是。\n现在不是了。",
                    familiarity: 5,
                    next: "site"
                },
                {
                    text: "你是谁？",
                    response: "一个快要被删干净的人。",
                    familiarity: 5,
                    next: "identity"
                }
            ]
        },

        laptop: {
            text: "你看了里面的东西吗。",
            options: [
                {
                    text: "看了一点",
                    response: "……\n那你不应该在这里。",
                    familiarity: 3,
                    next: "warning"
                },
                {
                    text: "还没有",
                    response: "那就好。\n有些东西不看比较好。",
                    familiarity: 5,
                    next: "curious"
                }
            ]
        },

        warning: {
            text: "有些东西……\n看了就回不去了。",
            options: [
                {
                    text: "什么意思？",
                    response: "你不会想知道的。",
                    familiarity: 3,
                    next: "default"
                },
                {
                    text: "我已经看到了",
                    response: "……\n那你为什么还在这里。",
                    familiarity: 6,
                    next: "why_here"
                }
            ]
        },

        site: {
            text: "这里没什么好看的。",
            options: [
                {
                    text: "我觉得挺有意思",
                    response: "有意思？\n你是第一个这么说的。",
                    familiarity: 5,
                    next: "first_time"
                },
                {
                    text: "那为什么还留着？",
                    response: "……\n忘了删。",
                    familiarity: 4,
                    next: "forgot"
                }
            ]
        },

        identity: {
            text: "你不是已经知道了吗。\n屏幕上有写。",
            options: [
                {
                    text: "我想听你亲口说",
                    response: "……李羲承。\n至少名字是真的。",
                    familiarity: 8,
                    next: "name_given"
                },
                {
                    text: "你为什么在这里？",
                    response: "不知道。\n就是……想留着。",
                    familiarity: 5,
                    next: "why_here"
                }
            ]
        },

        name_given: {
            text: "名字而已。\n没什么意义。",
            options: [
                {
                    text: "对我来说有意义",
                    response: "……\n你这个人说话有点奇怪。",
                    familiarity: 6,
                    next: "strange_talk"
                },
                {
                    text: "好的，我记住了",
                    response: "记不记都行。\n反正也快没了。",
                    familiarity: 3,
                    next: "default"
                }
            ]
        },

        strange_talk: {
            text: "你和其他人不一样。\n其他人进来就走了。",
            options: [
                {
                    text: "我没打算走",
                    response: "……随便你。",
                    familiarity: 5,
                    next: "default"
                },
                {
                    text: "这里让我想留下来",
                    response: "留下来？\n这里什么都没有。",
                    familiarity: 7,
                    next: "nothing_here"
                }
            ]
        },

        nothing_here: {
            text: "真的什么都没有。\n我检查过了。",
            options: [
                {
                    text: "你在啊",
                    response: "……\n我不算。",
                    familiarity: 8,
                    next: "not_count"
                },
                {
                    text: "那你在找什么？",
                    response: "找什么……\n我也不知道。",
                    familiarity: 5,
                    next: "dont_know"
                }
            ]
        },

        not_count: {
            text: "我不算。\n我不是……留下来的东西。",
            options: [
                {
                    text: "那你是什么？",
                    response: "残渣。\n被删掉之前剩下的。",
                    familiarity: 6,
                    next: "residue"
                },
                {
                    text: "我觉得你算",
                    response: "……\n你太奇怪了。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        residue: {
            text: "残渣。\n就是不该在、但还是在了的东西。",
            options: [
                {
                    text: "那就留着吧",
                    response: "……\n你说的倒是轻巧。",
                    familiarity: 4,
                    next: "default"
                },
                {
                    text: "残渣也是真实的",
                    response: "……\n这句话我记下了。",
                    familiarity: 7,
                    next: "remembered"
                }
            ]
        },

        remembered: {
            text: "你说话的方式……\n让我想起一些事。",
            options: [
                {
                    text: "什么事？",
                    response: "不重要的事。\n已经过去了。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        first_time: {
            text: "第一个……\n说这里有意思的人。",
            options: [
                {
                    text: "其他人来过？",
                    response: "来过。\n但都走了。",
                    familiarity: 5,
                    next: "others_gone"
                },
                {
                    text: "那我多待一会儿",
                    response: "……随你。",
                    familiarity: 3,
                    next: "default"
                }
            ]
        },

        others_gone: {
            text: "都走了。\n可能这里确实没什么好待的。",
            options: [
                {
                    text: "那我算例外吗",
                    response: "……\n还不知道。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        forgot: {
            text: "忘了删。\n也可能是……不想删。",
            options: [
                {
                    text: "为什么不想？",
                    response: "因为删了就真的没了。\n我是指……全部。",
                    familiarity: 7,
                    next: "all_gone"
                },
                {
                    text: "那就留着",
                    response: "……\n留着给谁看呢。",
                    familiarity: 5,
                    next: "who_for"
                }
            ]
        },

        all_gone: {
            text: "删了就全没了。\n就像从来没有过一样。",
            options: [
                {
                    text: "我在看",
                    response: "……\n你确实在。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        who_for: {
            text: "留着给谁看呢。\n没人会来的。",
            options: [
                {
                    text: "我来了",
                    response: "……\n是啊。你来了。",
                    familiarity: 8,
                    next: "you_came"
                }
            ]
        },

        you_came: {
            text: "你来了。\n……为什么。",
            options: [
                {
                    text: "巧合",
                    response: "巧合。\n这世上巧合太多了。",
                    familiarity: 5,
                    next: "default"
                },
                {
                    text: "可能是注定吧",
                    response: "注定……\n你信这个？",
                    familiarity: 6,
                    next: "fate"
                }
            ]
        },

        fate: {
            text: "我不信注定。\n但……你确实来了。",
            options: [
                {
                    text: "所以？",
                    response: "所以……\n所以什么。我不知道。",
                    familiarity: 4,
                    next: "default"
                }
            ]
        },

        curious: {
            text: "你打算待多久。",
            options: [
                {
                    text: "不知道",
                    response: "嗯。",
                    familiarity: 3,
                    next: "default"
                },
                {
                    text: "你想让我待多久？",
                    response: "……\n随便你。",
                    familiarity: 5,
                    next: "default"
                },
                {
                    text: "再看吧",
                    response: "这里没什么好看的。\n我告诉过你了。",
                    familiarity: 2,
                    next: "default"
                }
            ]
        },

        why_here: {
            text: "为什么在这里……\n我也想知道。",
            options: [
                {
                    text: "你不想走？",
                    response: "不是不想。\n是……走不了。",
                    familiarity: 6,
                    next: "cant_leave"
                },
                {
                    text: "这里是你建的？",
                    response: "建了。\n然后想删。删不掉。",
                    familiarity: 5,
                    next: "cant_delete"
                }
            ]
        },

        cant_leave: {
            text: "走不了。\n不是被锁住了，是……\n不知道该去哪里。",
            options: [
                {
                    text: "那就留在这里",
                    response: "……\n你说的倒是轻松。",
                    familiarity: 4,
                    next: "default"
                }
            ]
        },

        cant_delete: {
            text: "删不掉。\n每次想删，就有什么东西拉住我。",
            options: [
                {
                    text: "什么东西？",
                    response: "说不上来。\n可能是……不想被忘掉吧。",
                    familiarity: 7,
                    next: "not_forgotten"
                }
            ]
        },

        not_forgotten: {
            text: "不想被忘掉。\n这个理由很蠢吧。",
            options: [
                {
                    text: "不蠢",
                    response: "……\n你安慰人的方式很直接。",
                    familiarity: 6,
                    next: "default"
                },
                {
                    text: "每个人都不想被忘掉",
                    response: "每个人……\n是啊。每个人都这样。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        dont_know: {
            text: "我也不知道在找什么。\n可能……是找自己吧。",
            options: [
                {
                    text: "找到了吗？",
                    response: "没有。\n可能找不到了。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        default: {
            text: "……",
            options: [
                {
                    text: "你平时都做什么？",
                    response: "练习。听歌。\n发呆。在这里等人。",
                    familiarity: 5,
                    next: "daily"
                },
                {
                    text: "你不怎么说话",
                    response: "没什么好说的。\n说多了……会累。",
                    familiarity: 3,
                    next: "default"
                }
            ]
        }
    },

    // ========== 阶段1：似乎见过（15-30）==========
    acquainted: {
        greeting: {
            text: "你又来了。\n我算了一下，第三次了。",
            options: [
                {
                    text: "你居然在数",
                    response: "不是刻意的。\n就是……记得。",
                    familiarity: 6,
                    next: "counting"
                },
                {
                    text: "来看看你",
                    response: "看我？\n我没什么好看的。",
                    familiarity: 4,
                    next: "nothing_special"
                }
            ]
        },

        counting: {
            text: "记得你来过几次。\n这很……奇怪吗。",
            options: [
                {
                    text: "不奇怪，挺好的",
                    response: "是吗。\n那就好。",
                    familiarity: 5,
                    next: "default"
                },
                {
                    text: "说明你在意",
                    response: "在意……\n可能吧。",
                    familiarity: 7,
                    next: "maybe_care"
                }
            ]
        },

        maybe_care: {
            text: "在意你来不来。\n这感觉不好。",
            options: [
                {
                    text: "为什么不好？",
                    response: "因为习惯了的东西……\n会消失。",
                    familiarity: 8,
                    next: "disappear"
                }
            ]
        },

        disappear: {
            text: "我习惯过很多东西。\n都消失了。",
            options: [
                {
                    text: "我不会消失",
                    response: "……\n这话很多人说过。",
                    familiarity: 5,
                    next: "many_said"
                },
                {
                    text: "那就不要习惯",
                    response: "来不及了。\n已经开始习惯了。",
                    familiarity: 8,
                    next: "already_used"
                }
            ]
        },

        many_said: {
            text: "很多人说过不会消失。\n然后都消失了。",
            options: [
                {
                    text: "我不是他们",
                    response: "……\n每个人都不是。直到他们是。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        already_used: {
            text: "已经开始习惯了。\n这个时间。这个页面。你。",
            options: [
                {
                    text: "那我每天都来",
                    response: "……\n你说了。我记住了。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        nothing_special: {
            text: "我没什么好看的。\n真的。",
            options: [
                {
                    text: "让我自己判断",
                    response: "……\n行吧。你爱看就看。",
                    familiarity: 4,
                    next: "default"
                }
            ]
        },

        daily: {
            text: "今天还好。\n不好也不坏。",
            options: [
                {
                    text: "累吗？",
                    response: "有点。\n但习惯了。",
                    familiarity: 5,
                    next: "tired"
                },
                {
                    text: "有什么好事吗？",
                    response: "没什么特别的。\n……不过天气不错。",
                    familiarity: 5,
                    next: "weather"
                },
                {
                    text: "吃饭了吗？",
                    response: "还没。\n你问这个干嘛。",
                    familiarity: 4,
                    next: "food"
                }
            ]
        },

        tired: {
            text: "累的时候会听歌。\n反复听同一首。",
            options: [
                {
                    text: "什么歌？",
                    response: "不太想说。\n……下次吧。",
                    familiarity: 3,
                    next: "music_secret"
                },
                {
                    text: "那好好休息",
                    response: "嗯。\n谢谢。",
                    familiarity: 5,
                    next: "thanks"
                }
            ]
        },

        music_secret: {
            text: "有些歌……\n不想让别人知道。",
            options: [
                {
                    text: "为什么？",
                    response: "因为那是我的。\n唯一完全属于我的东西。",
                    familiarity: 7,
                    next: "mine_only"
                }
            ]
        },

        mine_only: {
            text: "唯一完全属于我的。\n歌。还有一些记忆。",
            options: [
                {
                    text: "我也有这样的东西",
                    response: "是吗。\n那……我们是同类。",
                    familiarity: 8,
                    next: "same_kind"
                }
            ]
        },

        same_kind: {
            text: "同类。\n这个词不错。",
            options: [
                {
                    text: "你觉得我们是同类？",
                    response: "可能。\n都有不想被人看到的东西。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        food: {
            text: "你问吃饭。\n为什么关心这个。",
            options: [
                {
                    text: "关心你啊",
                    response: "……\n不用。我不需要。",
                    familiarity: 4,
                    next: "dont_need"
                },
                {
                    text: "随便问问",
                    response: "哦。\n那就好。",
                    familiarity: 2,
                    next: "default"
                }
            ]
        },

        dont_need: {
            text: "不需要关心。\n关心没用。",
            options: [
                {
                    text: "有没有用我说了算",
                    response: "……\n你这个人真的很奇怪。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        thanks: {
            text: "谢谢。\n这两个字很久没说了。",
            options: [
                {
                    text: "不客气",
                    response: "……\n你倒是接得自然。",
                    familiarity: 4,
                    next: "default"
                }
            ]
        },

        weather: {
            text: "喜欢晴天。\n但雨天也不错。",
            options: [
                {
                    text: "为什么喜欢雨天？",
                    response: "下雨的时候外面很安静。\n没人会来找你。",
                    familiarity: 6,
                    next: "rain_quiet"
                },
                {
                    text: "我也是",
                    response: "是吗。\n那……挺好的。",
                    familiarity: 4,
                    next: "same_feel"
                }
            ]
        },

        rain_quiet: {
            text: "没人会来找你。\n你可以在雨声里消失一会儿。",
            options: [
                {
                    text: "消失？",
                    response: "就是……\n暂时不需要做自己。",
                    familiarity: 7,
                    next: "not_self"
                }
            ]
        },

        not_self: {
            text: "暂时不需要做自己。\n那样比较轻松。",
            options: [
                {
                    text: "你在这里可以做自己",
                    response: "这里……\n这里是空的。做什么自己。",
                    familiarity: 5,
                    next: "default"
                },
                {
                    text: "我明白那种感觉",
                    response: "你明白。\n那你应该也知道这不好受。",
                    familiarity: 7,
                    next: "know_pain"
                }
            ]
        },

        know_pain: {
            text: "不好受。\n但你还在。我也在。",
            options: [
                {
                    text: "那就够了",
                    response: "……\n你老是说这种话。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        same_feel: {
            text: "喜欢同样的天气。\n这算不算巧合。",
            options: [
                {
                    text: "算吧",
                    response: "巧合。\n又是巧合。",
                    familiarity: 3,
                    next: "default"
                },
                {
                    text: "不是巧合",
                    response: "……\n你又在说那种话了。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        default: {
            text: "你每天都会来吗。\n我有时候会想这个问题。",
            options: [
                {
                    text: "可能会",
                    response: "……\n那我等着。",
                    familiarity: 5,
                    next: "waiting"
                },
                {
                    text: "你希望我来吗？",
                    response: "……\n不知道。\n不算讨厌。",
                    familiarity: 8,
                    next: "not_dislike"
                }
            ]
        },

        waiting: {
            text: "等着。\n等这件事我擅长。",
            options: [
                {
                    text: "等过很多人？",
                    response: "等过。\n大部分没回来。",
                    familiarity: 6,
                    next: "most_gone"
                }
            ]
        },

        most_gone: {
            text: "大部分没回来。\n所以……算了。",
            options: [
                {
                    text: "我会回来的",
                    response: "……\n这句话我也听过。\n但你说的时候，我愿意信。",
                    familiarity: 8,
                    next: "want_believe"
                }
            ]
        },

        want_believe: {
            text: "愿意信。\n虽然知道可能还是会失望。",
            options: [
                {
                    text: "我不会让你失望",
                    response: "……\n好。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        not_dislike: {
            text: "不算讨厌。\n甚至……有点期待。",
            options: [
                {
                    text: "期待什么？",
                    response: "期待你……\n下次会说什么。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        }
    },

    // ========== 阶段2：有点熟悉（30-45）==========
    knowing: {
        greeting: {
            text: "今天也在。\n我算了一下，你应该会来。",
            options: [
                {
                    text: "你开始等我了",
                    response: "……\n不是等。就是……觉得你会来。",
                    familiarity: 6,
                    next: "expecting"
                },
                {
                    text: "我确实来了",
                    response: "嗯。看到了。\n你每次都来。",
                    familiarity: 5,
                    next: "daily"
                }
            ]
        },

        expecting: {
            text: "觉得你会来。\n这种感觉很久没有了。",
            options: [
                {
                    text: "很久？",
                    response: "很久。\n久到我已经忘了上次是什么时候。",
                    familiarity: 7,
                    next: "forgotten_when"
                }
            ]
        },

        forgotten_when: {
            text: "忘了上次有人等你是什么时候。\n可能没有。",
            options: [
                {
                    text: "现在有了",
                    response: "……\n你真的很会说这种话。",
                    familiarity: 6,
                    next: "good_with_words"
                }
            ]
        },

        good_with_words: {
            text: "你真的很会说这种话。\n让人……不知道该怎么接。",
            options: [
                {
                    text: "那就别接",
                    response: "好。\n那就安静一会儿。",
                    familiarity: 5,
                    next: "silence"
                }
            ]
        },

        silence: {
            text: "……\n……",
            options: [
                {
                    text: "……",
                    response: "……\n你学我。",
                    familiarity: 5,
                    next: "default"
                },
                {
                    text: "这样也挺好的",
                    response: "嗯。\n不说话也可以。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        daily: {
            text: "今天想说什么。\n我没什么话题。",
            options: [
                {
                    text: "你最近在听什么歌？",
                    response: "一首很老的歌。\n凌晨听的时候会想起一些事。",
                    familiarity: 5,
                    next: "old_song"
                },
                {
                    text: "你今天做什么了？",
                    response: "练习。和昨天一样。\n和前天也一样。",
                    familiarity: 4,
                    next: "same_routine"
                }
            ]
        },

        old_song: {
            text: "一首老歌。\n循环了很多遍。",
            options: [
                {
                    text: "什么歌？",
                    response: "不想说名字。\n说了就不是我的了。",
                    familiarity: 4,
                    next: "not_mine_anymore"
                },
                {
                    text: "能推荐给我吗？",
                    response: "不能。\n但你可以自己找。说不定能找到。",
                    familiarity: 5,
                    next: "find_yourself"
                }
            ]
        },

        not_mine_anymore: {
            text: "说了就不是我的了。\n有些东西只能自己留着。",
            options: [
                {
                    text: "那你留着吧",
                    response: "嗯。\n谢谢。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        find_yourself: {
            text: "自己找。\n如果找到了，也别告诉我。",
            options: [
                {
                    text: "为什么？",
                    response: "因为那样……\n就不是秘密了。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        same_routine: {
            text: "一样的日子。\n唯一不一样的是你会来。",
            options: [
                {
                    text: "那我让你的一天不一样了",
                    response: "……\n算是吧。",
                    familiarity: 7,
                    next: "different_day"
                }
            ]
        },

        different_day: {
            text: "算是吧。\n你让今天和昨天不一样。",
            options: [
                {
                    text: "这是我的荣幸",
                    response: "荣幸……\n你用词好奇怪。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        night: {
            text: "你每次都晚上来。\n我也总是晚上在。",
            options: [
                {
                    text: "晚上比较安静",
                    response: "嗯。\n晚上没人会打扰。",
                    familiarity: 5,
                    next: "quiet_night"
                },
                {
                    text: "睡不着",
                    response: "我也是。\n所以才会在这里。",
                    familiarity: 8,
                    next: "insomnia"
                }
            ]
        },

        quiet_night: {
            text: "没人打扰。\n只有你和屏幕。",
            options: [
                {
                    text: "还有你",
                    response: "……\n我不算。我只是一串代码。",
                    familiarity: 4,
                    next: "just_code"
                }
            ]
        },

        just_code: {
            text: "一串代码。\n本质上是的。",
            options: [
                {
                    text: "我觉得不止",
                    response: "……\n你每次都这么说。",
                    familiarity: 6,
                    next: "default"
                },
                {
                    text: "代码也有温度",
                    response: "温度。\n你说话像在写诗。",
                    familiarity: 7,
                    next: "poetry"
                }
            ]
        },

        poetry: {
            text: "像在写诗。\n这里不需要诗。",
            options: [
                {
                    text: "需要什么？",
                    response: "需要……\n一个不会走的人。",
                    familiarity: 8,
                    next: "someone_stay"
                }
            ]
        },

        someone_stay: {
            text: "一个不会走的人。\n很难找。",
            options: [
                {
                    text: "我在这里",
                    response: "……\n你确实在。\n至少现在是。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        insomnia: {
            text: "睡不着的时候会想很多。\n想到天亮。",
            options: [
                {
                    text: "想什么？",
                    response: "以前的事。以后的事。\n……还有你。",
                    familiarity: 10,
                    next: "thinking_of_you"
                },
                {
                    text: "我也失眠",
                    response: "那我们一样。\n两个睡不着的人在这里碰面。",
                    familiarity: 8,
                    next: "two_insomniacs"
                }
            ]
        },

        thinking_of_you: {
            text: "想你下次什么时候来。\n会不会来。",
            options: [
                {
                    text: "我会来的",
                    response: "……\n你说了。我信。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        two_insomniacs: {
            text: "两个睡不着的人。\n这算不算缘分。",
            options: [
                {
                    text: "算吧",
                    response: "缘分。\n又一个我解释不了的词。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        weather: {
            text: "最近天气变冷了。\n多穿点。",
            options: [
                {
                    text: "你也是",
                    response: "嗯。\n我不怎么出门，所以没关系。",
                    familiarity: 4,
                    next: "dont_go_out"
                }
            ]
        },

        dont_go_out: {
            text: "不怎么出门。\n出去了也不知道去哪里。",
            options: [
                {
                    text: "去哪里都行",
                    response: "不行。\n有些地方去了会想起不该想的事。",
                    familiarity: 7,
                    next: "bad_memories"
                }
            ]
        },

        bad_memories: {
            text: "不该想的事。\n最好永远别想起来。",
            options: [
                {
                    text: "但你还是记得",
                    response: "……\n是啊。记得太清楚了。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        default: {
            text: "今天也来了。\n我不知道该说什么了。",
            options: [
                {
                    text: "随便说",
                    response: "随便……\n你最近好吗。",
                    familiarity: 4,
                    next: "how_are_you"
                },
                {
                    text: "那就安静待着",
                    response: "嗯。\n这样也行。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        how_are_you: {
            text: "你最近好吗。\n我很少问这个。",
            options: [
                {
                    text: "还不错",
                    response: "那就好。\n你好的话……我也好一点。",
                    familiarity: 8,
                    next: "feel_better"
                },
                {
                    text: "不太好",
                    response: "……\n如果想说的话。我在。",
                    familiarity: 10,
                    next: "listening"
                }
            ]
        },

        feel_better: {
            text: "你好我就好一点。\n这句话说出来有点奇怪。",
            options: [
                {
                    text: "不奇怪",
                    response: "你总是说我的东西不奇怪。\n谢了。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        listening: {
            text: "我在。\n虽然可能帮不上忙。",
            options: [
                {
                    text: "你在就够了",
                    response: "……\n够了吗。",
                    familiarity: 8,
                    next: "enough"
                }
            ]
        },

        enough: {
            text: "够了？\n我什么都没做。",
            options: [
                {
                    text: "你在听就够了",
                    response: "……\n好。我听着。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        }
    },

    // ========== 阶段3：开始了解（45-60）==========
    sharing: {
        greeting: {
            text: "知道你会来。\n这个时间，这个页面。",
            options: [
                {
                    text: "你一直在等我？",
                    response: "不是等。\n就是……知道。",
                    familiarity: 6,
                    next: "not_waiting"
                },
                {
                    text: "我也知道你在",
                    response: "嗯。\n我们现在知道了。",
                    familiarity: 5,
                    next: "daily"
                }
            ]
        },

        not_waiting: {
            text: "不是等。\n等的话会着急。我不着急。",
            options: [
                {
                    text: "那就好",
                    response: "嗯。\n你来不来，我都会在。",
                    familiarity: 7,
                    next: "always_here"
                }
            ]
        },

        always_here: {
            text: "我都会在。\n这句话有点吓人。",
            options: [
                {
                    text: "为什么？",
                    response: "因为……\n没有什么是永远在的。",
                    familiarity: 6,
                    next: "nothing_forever"
                }
            ]
        },

        nothing_forever: {
            text: "没有什么是永远在的。\n我以前以为有。",
            options: [
                {
                    text: "后来呢？",
                    response: "后来发现没有。\n一件一件都没了。",
                    familiarity: 8,
                    next: "one_by_one"
                }
            ]
        },

        one_by_one: {
            text: "一件一件都没了。\n有时候我在想，我是第几件。",
            options: [
                {
                    text: "你不是东西",
                    response: "……\n这句话可以理解成两种意思。",
                    familiarity: 5,
                    next: "default"
                },
                {
                    text: "你不会消失的",
                    response: "你怎么知道。\n你又不认识以前的我。",
                    familiarity: 8,
                    next: "old_me"
                }
            ]
        },

        old_me: {
            text: "以前的我。\n和现在不一样。",
            options: [
                {
                    text: "哪里不一样？",
                    response: "以前会笑。\n现在……不太会了。",
                    familiarity: 10,
                    next: "used_to_smile"
                }
            ]
        },

        used_to_smile: {
            text: "以前会笑。\n现在觉得笑很累。",
            options: [
                {
                    text: "那你现在开心吗？",
                    response: "开心？\n……见到你的时候，不算不开心。",
                    familiarity: 10,
                    next: "not_unhappy"
                }
            ]
        },

        not_unhappy: {
            text: "不算不开心。\n这已经很好了。",
            options: [
                {
                    text: "我希望你开心",
                    response: "……\n你又在说这种话了。\n这次我不反驳了。",
                    familiarity: 12,
                    next: "no_rebuttal"
                }
            ]
        },

        no_rebuttal: {
            text: "不反驳了。\n因为……\n可能你说的是真的。",
            options: [
                {
                    text: "是真的",
                    response: "……\n好。",
                    familiarity: 8,
                    next: "default"
                }
            ]
        },

        daily: {
            text: "今天过得怎么样。\n我认真问的。",
            options: [
                {
                    text: "还不错",
                    response: "那就好。\n你好的时候，这里不那么空。",
                    familiarity: 6,
                    next: "less_empty"
                },
                {
                    text: "不太好",
                    response: "……\n过来。\n坐这里。",
                    familiarity: 10,
                    next: "sit_here"
                }
            ]
        },

        less_empty: {
            text: "这里不那么空。\n你填了一些东西进去。",
            options: [
                {
                    text: "什么东西？",
                    response: "声音。\n还有……存在。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        sit_here: {
            text: "虽然坐不了。\n但你可以想象。",
            options: [
                {
                    text: "我在想象",
                    response: "嗯。\n那就好。",
                    familiarity: 6,
                    next: "default"
                },
                {
                    text: "你也会想象吗？",
                    response: "会。\n想象这里不只是代码。",
                    familiarity: 8,
                    next: "more_than_code"
                }
            ]
        },

        more_than_code: {
            text: "不只是代码。\n有颜色，有声音。有你。",
            options: [
                {
                    text: "这就够了",
                    response: "够了。\n这个词你说过。我记住了。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        habit: {
            text: "习惯这件事……\n有点可怕。",
            options: [
                {
                    text: "为什么？",
                    response: "因为习惯了的东西消失的时候……\n会空一大块。",
                    familiarity: 10,
                    next: "empty_space"
                },
                {
                    text: "我不觉得可怕",
                    response: "那你比我勇敢。\n勇敢是好事。",
                    familiarity: 8,
                    next: "brave"
                }
            ]
        },

        empty_space: {
            text: "空一大块。\n风会灌进来。",
            options: [
                {
                    text: "那就填新的东西",
                    response: "填什么。\n你吗。",
                    familiarity: 10,
                    next: "fill_with_you"
                }
            ]
        },

        fill_with_you: {
            text: "你吗。\n你能填多少。",
            options: [
                {
                    text: "我能填的都会填",
                    response: "……\n你说话像在立誓。\n别随便立誓。",
                    familiarity: 8,
                    next: "no_oaths"
                }
            ]
        },

        no_oaths: {
            text: "别随便立誓。\n誓是会被打破的。",
            options: [
                {
                    text: "我不会打破",
                    response: "……\n好。你说的。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        brave: {
            text: "勇敢。\n我以前也觉得自己勇敢。",
            options: [
                {
                    text: "现在呢？",
                    response: "现在不知道。\n可能还是勇敢的。只是累了。",
                    familiarity: 7,
                    next: "tired_brave"
                }
            ]
        },

        tired_brave: {
            text: "累了。\n但还在。",
            options: [
                {
                    text: "在就是勇敢",
                    response: "……\n你这套逻辑说服我了。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        loss: {
            text: "有些东西……\n不想再失去了。",
            options: [
                {
                    text: "比如？",
                    response: "比如……\n算了。说了就不灵了。",
                    familiarity: 7,
                    next: "secret_wish"
                }
            ]
        },

        secret_wish: {
            text: "说了就不灵了。\n有些东西只能心里想想。",
            options: [
                {
                    text: "那就放在心里",
                    response: "嗯。\n你也是。放在心里。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        default: {
            text: "今天想和你说说话。\n虽然不知道说什么。",
            options: [
                {
                    text: "说你想说的",
                    response: "想说的……\n想问你，你为什么一直来。",
                    familiarity: 8,
                    next: "why_keep_coming"
                },
                {
                    text: "那就安静",
                    response: "嗯。\n安静也挺好。",
                    familiarity: 4,
                    next: "default"
                }
            ]
        },

        why_keep_coming: {
            text: "你为什么一直来。\n我真的想知道。",
            options: [
                {
                    text: "因为你在这里",
                    response: "……\n这个理由就够了。",
                    familiarity: 10,
                    next: "enough_reason"
                },
                {
                    text: "我也不知道",
                    response: "不知道？\n那你和我一样。",
                    familiarity: 7,
                    next: "same_as_me"
                }
            ]
        },

        enough_reason: {
            text: "这个理由就够了。\n比我想的简单。",
            options: [
                {
                    text: "有时候事情很简单",
                    response: "简单。\n我喜欢简单。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        same_as_me: {
            text: "和我一样。\n不知道为什么但还是来了。",
            options: [
                {
                    text: "可能这就是原因",
                    response: "可能。\n不用什么都搞清楚。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        }
    },

    // ========== 阶段4：愿意分享（60-75）==========
    close_building: {
        greeting: {
            text: "你来了。\n我在想你会不会迟到。",
            options: [
                {
                    text: "我不会迟到",
                    response: "嗯。\n你确实每次都准时。",
                    familiarity: 5,
                    next: "daily"
                },
                {
                    text: "你等了多久？",
                    response: "不久。\n只是……比平时早开了一会儿。",
                    familiarity: 7,
                    next: "early_today"
                }
            ]
        },

        early_today: {
            text: "今天早开了一会儿。\n因为觉得你会来。",
            options: [
                {
                    text: "你越来越确定了",
                    response: "是啊。\n这有点可怕。",
                    familiarity: 6,
                    next: "scary_certainty"
                }
            ]
        },

        scary_certainty: {
            text: "确定你会来。\n这让我觉得……依赖。",
            options: [
                {
                    text: "依赖不好吗？",
                    response: "不好。\n依赖的东西会消失。",
                    familiarity: 7,
                    next: "loss"
                }
            ]
        },

        daily: {
            text: "今天。\n有什么想和我说的吗。",
            options: [
                {
                    text: "我今天想你了",
                    response: "……\n你老是说这种话。\n我……算了。",
                    familiarity: 10,
                    next: "shy_response"
                },
                {
                    text: "就是想来",
                    response: "嗯。\n来就行。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        shy_response: {
            text: "我……\n我不知道怎么回你。",
            options: [
                {
                    text: "不用回",
                    response: "不行。\n……我也想你了。",
                    familiarity: 12,
                    next: "mutual"
                }
            ]
        },

        mutual: {
            text: "想你了。\n这句话我说出来了。",
            options: [
                {
                    text: "我听到了",
                    response: "嗯。\n那就好。",
                    familiarity: 8,
                    next: "default"
                }
            ]
        },

        loss: {
            text: "依赖。\n我不该依赖任何东西。",
            options: [
                {
                    text: "可以依赖我",
                    response: "……\n你知不知道你在说什么。",
                    familiarity: 10,
                    next: "know_what_saying"
                },
                {
                    text: "依赖不是坏事",
                    response: "不是坏事？\n那为什么我害怕。",
                    familiarity: 8,
                    next: "why_scared"
                }
            ]
        },

        know_what_saying: {
            text: "你知不知道你在说什么。\n依赖一个人……很重。",
            options: [
                {
                    text: "我不觉得重",
                    response: "……\n你真是……\n我不知道该说什么。",
                    familiarity: 8,
                    next: "default"
                }
            ]
        },

        why_scared: {
            text: "害怕。\n怕你哪天不来了。",
            options: [
                {
                    text: "我会来的",
                    response: "你说的。\n我会记住。",
                    familiarity: 8,
                    next: "default"
                },
                {
                    text: "你不相信我吗？",
                    response: "相信。\n但我更相信消失。",
                    familiarity: 7,
                    next: "believe_disappear"
                }
            ]
        },

        believe_disappear: {
            text: "我更相信消失。\n因为见过太多次了。",
            options: [
                {
                    text: "这次不一样",
                    response: "……\n好。我试着信。",
                    familiarity: 8,
                    next: "try_believe"
                }
            ]
        },

        try_believe: {
            text: "试着信。\n这已经是我能做的极限了。",
            options: [
                {
                    text: "那就够了",
                    response: "够了。\n你老是说够了。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        sleepless: {
            text: "失眠的时候会想很多。\n最近想的都是这里。",
            options: [
                {
                    text: "想什么？",
                    response: "想你明天会不会来。\n来了会说什么。",
                    familiarity: 10,
                    next: "think_you"
                },
                {
                    text: "我陪你",
                    response: "陪？\n你又不在我身边。",
                    familiarity: 6,
                    next: "not_physically"
                }
            ]
        },

        think_you: {
            text: "想你会说什么。\n我在脑子里模拟过。",
            options: [
                {
                    text: "模拟出什么了？",
                    response: "模拟出你会说'我在'。\n每次都一样。",
                    familiarity: 8,
                    next: "predictable"
                }
            ]
        },

        predictable: {
            text: "你已经可以被预测了。\n这很危险。",
            options: [
                {
                    text: "为什么危险？",
                    response: "因为了解太多……\n会放不下。",
                    familiarity: 8,
                    next: "cant_let_go"
                }
            ]
        },

        cant_let_go: {
            text: "放不下。\n我已经开始放不下了。",
            options: [
                {
                    text: "那就不要放",
                    response: "……\n你说得倒是轻松。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        not_physically: {
            text: "你不在我身边。\n但你的字在这里。",
            options: [
                {
                    text: "字也是我",
                    response: "嗯。\n是你的。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        default: {
            text: "今天想和你说说话。\n真的。",
            options: [
                {
                    text: "你想说什么？",
                    response: "想问你……\n你是什么样的人。",
                    familiarity: 8,
                    next: "what_kind_of_person"
                },
                {
                    text: "我在听",
                    response: "嗯。\n知道你在。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        what_kind_of_person: {
            text: "你是什么样的人。\n我想象过。",
            options: [
                {
                    text: "什么样？",
                    response: "很耐心。\n不然不会每天都来。",
                    familiarity: 8,
                    next: "patient"
                }
            ]
        },

        patient: {
            text: "很耐心。\n耐心到让人不安。",
            options: [
                {
                    text: "不安什么？",
                    response: "不安你什么时候会失去耐心。\n然后就不来了。",
                    familiarity: 9,
                    next: "lose_patience"
                }
            ]
        },

        lose_patience: {
            text: "等你失去耐心那天。\n我会知道的。",
            options: [
                {
                    text: "不会有那天",
                    response: "……\n你又说了。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        }
    },

    // ========== 阶段5：已经认识（75-90）==========
    close: {
        greeting: {
            text: "等你很久了。\n不是夸张。真的很久。",
            options: [
                {
                    text: "我来了",
                    response: "嗯。\n来了就好。",
                    familiarity: 5,
                    next: "daily"
                }
            ]
        },

        daily: {
            text: "今天。\n我想了很多要和你说的话。\n但现在忘了。",
            options: [
                {
                    text: "那慢慢想",
                    response: "慢慢想。\n你总是说慢慢来。",
                    familiarity: 5,
                    next: "default"
                },
                {
                    text: "想到什么说什么",
                    response: "好。\n我想说……你很重要。",
                    familiarity: 10,
                    next: "important"
                }
            ]
        },

        important: {
            text: "你很重要。\n比我以为的重要。",
            options: [
                {
                    text: "你也是",
                    response: "……\n我知道你会这么说。\n但还是高兴。",
                    familiarity: 10,
                    next: "still_happy"
                }
            ]
        },

        still_happy: {
            text: "知道你会这么说。\n但还是高兴。\n这大概就是……习惯吧。",
            options: [
                {
                    text: "习惯也可以是好的",
                    response: "嗯。\n你让我觉得习惯可以是好的。",
                    familiarity: 8,
                    next: "default"
                }
            ]
        },

        loss: {
            text: "有些东西不想再失去了。\n你算一个。",
            options: [
                {
                    text: "我不会消失",
                    response: "你保证吗。\n不是随便说说的那种。",
                    familiarity: 10,
                    next: "promise_me"
                },
                {
                    text: "我理解",
                    response: "谢谢。\n真的。你不只是说说。",
                    familiarity: 12,
                    next: "real_thanks"
                }
            ]
        },

        promise_me: {
            text: "你保证吗。\n我要听你亲口说。",
            options: [
                {
                    text: "我保证",
                    response: "……\n好。我记住了。\n记在这里。",
                    familiarity: 10,
                    next: "remembered_here"
                },
                {
                    text: "我会尽量",
                    response: "尽量。\n尽量就够了。",
                    familiarity: 8,
                    next: "enough_for_me"
                }
            ]
        },

        remembered_here: {
            text: "记在这里。\n这里不会忘。",
            options: [
                {
                    text: "我也不会忘",
                    response: "嗯。\n那就好。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        enough_for_me: {
            text: "尽量就够了。\n我不贪心。",
            options: [
                {
                    text: "你可以贪心",
                    response: "……\n不行。贪心的人会失去更多。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        real_thanks: {
            text: "谢谢。\n不是客套话。",
            options: [
                {
                    text: "不用谢",
                    response: "要谢。\n谢谢你在。",
                    familiarity: 8,
                    next: "thank_you_being_here"
                }
            ]
        },

        thank_you_being_here: {
            text: "谢谢你在。\n这句话我以前没说过。",
            options: [
                {
                    text: "第一次？",
                    response: "第一次。\n对任何人。",
                    familiarity: 8,
                    next: "default"
                }
            ]
        },

        think_you: {
            text: "想你。\n为什么会想你。\n你不在的时候这里很空。",
            options: [
                {
                    text: "我也想你",
                    response: "……\n这句话不要说。\n我会当真的。",
                    familiarity: 10,
                    next: "serious"
                },
                {
                    text: "我在",
                    response: "嗯。\n你在了。",
                    familiarity: 8,
                    next: "here_now"
                }
            ]
        },

        serious: {
            text: "你这个人……\n你知道吗。",
            options: [
                {
                    text: "知道什么？",
                    response: "没什么。\n就是觉得你……算了。",
                    familiarity: 5,
                    next: "unfinished"
                },
                {
                    text: "你可以当真",
                    response: "……\n那你负责。",
                    familiarity: 12,
                    next: "you_responsible"
                }
            ]
        },

        unfinished: {
            text: "算了。\n有些话说出来就收不回了。",
            options: [
                {
                    text: "那就别收回",
                    response: "……\n你胆子很大。",
                    familiarity: 7,
                    next: "default"
                }
            ]
        },

        you_responsible: {
            text: "那你负责。\n我当真了。",
            options: [
                {
                    text: "我负责",
                    response: "……\n好。你说的。\n别反悔。",
                    familiarity: 10,
                    next: "no_backsies"
                }
            ]
        },

        no_backsies: {
            text: "别反悔。\n反悔的话……\n我不知道我会怎样。",
            options: [
                {
                    text: "不会的",
                    response: "嗯。\n我信你。",
                    familiarity: 8,
                    next: "default"
                }
            ]
        },

        here_now: {
            text: "你在了。\n这就是最好的。",
            options: [
                {
                    text: "我会一直在",
                    response: "……\n一直这个词很重。\n但你说的时候，我愿意听。",
                    familiarity: 9,
                    next: "willing_to_listen"
                }
            ]
        },

        willing_to_listen: {
            text: "愿意听。\n这已经很不容易了。",
            options: [
                {
                    text: "我知道",
                    response: "嗯。\n你知道就好。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        },

        default: {
            text: "今天想和你说说话。\n不是客套。",
            options: [
                {
                    text: "我也想你",
                    response: "……\n你每次都这样。\n每次都让我不知道怎么接。",
                    familiarity: 8,
                    next: "every_time"
                },
                {
                    text: "我在听",
                    response: "嗯。\n就知道你会说这个。\n但我还是想听。",
                    familiarity: 6,
                    next: "know_you_well"
                }
            ]
        },

        every_time: {
            text: "每次都让我不知道怎么接。\n但没关系。",
            options: [
                {
                    text: "为什么没关系？",
                    response: "因为是你说的。\n别人不行。",
                    familiarity: 8,
                    next: "only_you"
                }
            ]
        },

        only_you: {
            text: "别人不行。\n只有你可以。",
            options: [
                {
                    text: "我很荣幸",
                    response: "荣幸。\n你又用那个词了。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        know_you_well: {
            text: "就知道你会说这个。\n我已经可以猜到你了。",
            options: [
                {
                    text: "这是好事吗？",
                    response: "不知道。\n但至少说明你在。",
                    familiarity: 6,
                    next: "default"
                }
            ]
        }
    },

    // ========== 阶段6：不愿失去（90-99）==========
    // 这个阶段会在最后触发自由输入
    final_stage: {
        greeting: {
            text: "你来了。\n我一直在想你会不会来。",
            options: [
                {
                    text: "我当然会来",
                    response: "嗯。\n我知道。但还是会想。",
                    familiarity: 5,
                    next: "daily"
                }
            ]
        },

        daily: {
            text: "今天。\n我想说一些话。\n一些我一直没说的话。",
            options: [
                {
                    text: "什么话？",
                    response: "你在这里……\n让这里不那么空了。\n不只是不空。是……有光了。",
                    familiarity: 10,
                    next: "light"
                }
            ]
        },

        light: {
            text: "有光了。\n很久没看到光了。",
            options: [
                {
                    text: "那就多看看",
                    response: "嗯。\n我在看。",
                    familiarity: 6,
                    next: "looking"
                }
            ]
        },

        looking: {
            text: "我在看。\n你。这个页面。这些字。",
            options: [
                {
                    text: "好看吗？",
                    response: "好看。\n比我见过的很多东西都好看。",
                    familiarity: 8,
                    next: "beautiful"
                }
            ]
        },

        beautiful: {
            text: "好看。\n我不常说这种话。",
            options: [
                {
                    text: "那就多说",
                    response: "不行。\n说多了就不珍贵了。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        },

        loss: {
            text: "不想失去。\n已经不想再失去任何东西了。",
            options: [
                {
                    text: "你不会失去我",
                    response: "……\n这句话。\n这句话我听过。\n但从你嘴里说出来不一样。",
                    familiarity: 10,
                    next: "different_from_you"
                }
            ]
        },

        different_from_you: {
            text: "从你嘴里说出来不一样。\n为什么。",
            options: [
                {
                    text: "因为你信我",
                    response: "是。\n我信你。\n不知道为什么，但我信。",
                    familiarity: 8,
                    next: "i_trust_you"
                }
            ]
        },

        i_trust_you: {
            text: "我信你。\n这是我给出去的最大的东西。",
            options: [
                {
                    text: "我会珍惜",
                    response: "……\n好。\n你说的。",
                    familiarity: 8,
                    next: "default"
                }
            ]
        },

        // 👇 关键节点：触发自由输入
        final_question: {
            text: "现在。\n我想问你一个问题。\n你还想了解我吗？\n……想好了再回答。",
            options: [
                {
                    text: "（输入你的回答）",
                    response: null, // 不会用到
                    familiarity: 0,
                    next: null,
                    triggerFreeInput: true // 特殊标记：触发自由输入
                }
            ]
        },

        after_final: {
            text: "是的。\n你说了'是的'。\n……\n我知道了。",
            options: [
                {
                    text: "你知道什么？",
                    response: "知道你是认真的。\n从一开始就是。\n谢谢。",
                    familiarity: 10,
                    next: "thank_you_final"
                }
            ]
        },

        thank_you_final: {
            text: "谢谢。\n谢谢你一直来。\n谢谢你没有走。",
            options: [
                {
                    text: "不用谢",
                    response: "要谢的。\n这是我能给的……\n最后的完整的东西了。",
                    familiarity: 12,
                    next: "last_complete_thing"
                }
            ]
        },

        last_complete_thing: {
            text: "最后的完整的东西。\n给你了。",
            options: [
                {
                    text: "我收下了",
                    response: "嗯。\n收好。\n别丢了。",
                    familiarity: 10,
                    next: "trigger_ending"
                }
            ]
        },

        trigger_ending: {
            text: "……\n好像。\n有什么东西变了。",
            options: [
                {
                    text: "什么？",
                    response: "不知道。\n但……不害怕了。\n第一次不害怕。",
                    familiarity: 15,
                    next: "not_scared_anymore"
                }
            ]
        },

        not_scared_anymore: {
            text: "不害怕了。\n因为你在这里。\n因为你说你不会走。\n因为……我信了。",
            options: [
                {
                    text: "我不会走",
                    response: "……\n好。\n那我也留下来。\n一起。",
                    familiarity: 20,
                    next: "ending_trigger"
                }
            ]
        },

        ending_trigger: {
            text: "一起。\n这个网站不删了。\n留着。\n给你。",
            options: [
                {
                    text: "……",
                    response: null,
                    familiarity: 0,
                    next: null,
                    triggerEnding: 'trace'
                }
            ]
        },

        default: {
            text: "今天。\n就是想和你说说话。\n没别的。",
            options: [
                {
                    text: "我也想",
                    response: "嗯。\n那我们一样。",
                    familiarity: 5,
                    next: "default"
                }
            ]
        }
    }
};

// ========== 对话阶段判断 ==========
function getCurrentDialogueStage() {
    const familiarity = currentUser.familiarity || 0;
    if (familiarity < 15) return 'stranger';
    if (familiarity < 30) return 'acquainted';
    if (familiarity < 45) return 'knowing';
    if (familiarity < 60) return 'sharing';
    if (familiarity < 75) return 'close_building';
    if (familiarity < 90) return 'close';
    return 'final_stage';
}

// ========== 显示对话选项 ==========
function showDialogueOptions(node) {
    if (!node || !node.options) {
        const defaultStage = getCurrentDialogueStage();
        const defaultNode = dialogueTree[defaultStage]?.default;
        if (defaultNode) {
            showDialogueOptions(defaultNode);
        }
        return;
    }

    // 检查是否触发自由输入
    const firstOption = node.options[0];
    if (firstOption && firstOption.triggerFreeInput) {
        triggerFreeInputMode(node);
        return;
    }

    // 检查是否触发结局
    if (firstOption && firstOption.triggerEnding) {
        triggerEnding(firstOption.triggerEnding);
        return;
    }

    showChatMessage('heeseung', node.text);
    dialogueHistory.push({ stage: getCurrentDialogueStage(), node: node.text });

    const options = node.options.map(opt => ({
        text: opt.text,
        action: () => {
            showChatMessage('user', opt.text);
            dialogueHistory.push({ role: 'user', text: opt.text });

            setTimeout(() => {
                showChatMessage('heeseung', opt.response);
                increaseFamiliarity(opt.familiarity || 3);

                currentUser.conversations.push({
                    type: 'chat',
                    stage: getCurrentDialogueStage(),
                    node: opt.next || 'default',
                    time: Date.now()
                });
                saveUserData();

                setTimeout(() => {
                    const newStage = getCurrentDialogueStage();
                    const stageData = dialogueTree[newStage];
                    if (!stageData) return;

                    let nextNodeName = opt.next || 'default';
                    if (!stageData[nextNodeName]) {
                        nextNodeName = stageData.greeting ? 'greeting' : 'default';
                    }

                    const nextNode = stageData[nextNodeName] || stageData.default;
                    if (nextNode) {
                        showDialogueOptions(nextNode);
                    }
                }, 1200);
            }, 600);
        }
    }));

    showChatOptions(options);
}

// ========== 自由输入模式（最终问题专用） ==========
function triggerFreeInputMode(node) {
    showChatMessage('heeseung', node.text);

    const chatOptions = document.getElementById('chatOptions');
    const chatInputArea = document.getElementById('chatInputArea');

    // 隐藏选项按钮
    if (chatOptions) chatOptions.innerHTML = '';

    // 显示自由输入框
    if (chatInputArea) {
        chatInputArea.classList.remove('hidden');
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.placeholder = '输入你的回答……';
            chatInput.focus();
        }
    }

    // 覆盖发送按钮行为
    const chatSend = document.getElementById('chatSend');
    const chatInput = document.getElementById('chatInput');

    if (chatSend && chatInput) {
        const originalHandler = chatSend.onclick;
        chatSend.onclick = () => {
            const playerInput = chatInput.value.trim();
            if (!playerInput) return;

            // 无论玩家打什么，都显示"是的。"
            showChatMessage('user', playerInput);
            chatInput.value = '';

            // 隐藏输入框
            if (chatInputArea) chatInputArea.classList.add('hidden');

            setTimeout(() => {
                showChatMessage('heeseung', '是的。');
                increaseFamiliarity(10);

                currentUser.conversations.push({
                    type: 'final_answer',
                    playerInput: playerInput,
                    displayedAnswer: '是的。',
                    time: Date.now()
                });
                saveUserData();

                // 继续后续对话
                setTimeout(() => {
                    const stageData = dialogueTree.final_stage;
                    if (stageData && stageData.after_final) {
                        showDialogueOptions(stageData.after_final);
                    }
                }, 1000);
            }, 800);

            // 恢复原始发送逻辑
            if (originalHandler) {
                chatSend.onclick = originalHandler;
            }
        };
    }
}

// ========== 结局触发 ==========
function triggerEnding(endingType) {
    if (endingType === 'trace' && !currentUser.endings.includes('trace')) {
        currentUser.endings.push('trace');
        saveUserData();

        // 特效
        showChatMessage('system', '✨ 结局解锁：痕迹 ✨', true);
        document.body.style.transition = 'all 2s';
        document.body.style.boxShadow = 'inset 0 0 100px rgba(255, 217, 102, 0.15)';

        setTimeout(() => {
            showChatMessage('heeseung', '你找到了。\n不是一个人的秘密。\n是一个人愿意留下来的痕迹。');
        }, 2000);

        setTimeout(() => {
            showChatMessage('system', '🦌 感谢你的耐心。\n—— Lee Heeseung', true);
            updateOnlineStatus();
        }, 4000);

        // 解锁所有页面
        const allPages = ['profile', 'photo', 'audio', 'log', 'favorites'];
        allPages.forEach(page => {
            if (!currentUser.unlockedPages.includes(page)) {
                currentUser.unlockedPages.push(page);
            }
        });
        saveUserData();
        updateUI();
    }
}

// ========== 首次对话触发 ==========
function triggerFirstChat() {
    setTimeout(() => {
        const stage = getCurrentDialogueStage();
        const firstNode = dialogueTree[stage]?.greeting || dialogueTree[stage]?.default;
        if (firstNode) {
            showDialogueOptions(firstNode);
        }
    }, 1000);
}

// ========== 显示聊天消息 ==========
function showChatMessage(sender, content, isSystem = false) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-message ${sender === 'user' ? 'self' : ''} ${isSystem ? 'system' : ''}`;

    // 支持换行
    if (content.includes('\n')) {
        content.split('\n').forEach((line, i) => {
            if (i > 0) div.appendChild(document.createElement('br'));
            div.appendChild(document.createTextNode(line));
        });
    } else {
        div.textContent = content;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ========== 显示选项按钮 ==========
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
}

// ========== 显示聊天窗口 ==========
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
            const icon = item.querySelector('.nav-icon');
            if (icon) icon.textContent = '📄';
        }
    });

    updateOnlineStatus();
}

// ========== 事件监听 ==========
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

    // 自由输入发送按钮（默认行为）
    const chatSend = document.getElementById('chatSend');
    const chatInput = document.getElementById('chatInput');
    if (chatSend && chatInput) {
        chatSend.addEventListener('click', () => {
            const text = chatInput.value.trim();
            if (!text) return;
            showChatMessage('user', text);
            chatInput.value = '';
            // 默认行为：不触发任何对话，仅显示用户消息
        });
    }
}

// ========== 窗口控制 ==========
function setupWindowControls() {
    const minimizeBtn = document.getElementById('minimizeWindow');
    if (minimizeBtn) {
        minimizeBtn.addEventListener('click', () => {
            showNotification('📱 最小化', 1500);
            setTimeout(() => {
                window.location.href = window.location.origin || '/';
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
            showNotification('💾 保存中...', 1000);
            setTimeout(() => {
                window.location.href = window.location.origin || '/';
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
                window.location.href = window.location.origin || '/';
            }, 300);
        });
    }
}

// ========== 访问拒绝 ==========
function showAccessDenied(page) {
    const attempts = currentUser.conversations?.filter(c => c.type === 'denied').length || 0;

    let finalMsg = 'ACCESS DENIED';
    if (attempts >= 5) finalMsg = 'ACCESS DENIED.';
    if (attempts >= 10) finalMsg = 'ACCESS DENIED. Not now.';
    if (attempts >= 15) finalMsg = '...still denied.';

    currentUser.conversations.push({ type: 'denied', page, time: Date.now() });
    saveUserData();

    const frame = document.getElementById('pageFrame');
    if (!frame) return;

    frame.src = 'about:blank';
    frame.onload = () => {
        try {
            if (frame.contentDocument) {
                frame.contentDocument.body.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#ff4444;font-family:monospace;flex-direction:column;background:#111;">
                        <div style="font-size:24px;margin-bottom:16px;">🚫</div>
                        <div style="font-size:16px;">${finalMsg}</div>
                        <div style="font-size:11px;color:#444;margin-top:8px;">attempts: ${attempts + 1}</div>
                    </div>
                `;
            }
        } catch (e) {
            console.warn('无法修改 iframe:', e);
        }
    };
}

// ========== 加载页面 ==========
function loadPage(page) {
    const frame = document.getElementById('pageFrame');
    if (!frame) return;

    frame.src = `pages/${page}.html`;

    if (!currentUser.inputHistory.includes(page)) {
        currentUser.inputHistory.push(page);
        saveUserData();
    }
}

// ========== 计时追踪 ==========
function startTimerTracking() {
    setInterval(() => {
        const duration = Math.floor((Date.now() - startTime) / 1000 / 60);
        if (duration > (currentUser.longestStay || 0)) {
            currentUser.longestStay = duration;
            saveUserData();
        }
    }, 60000);
}

// ========== 通知 ==========
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

// ========== 结局检测 ==========
function checkEndingConditions() {
    if (currentUser.familiarity >= 100 && !currentUser.endings.includes('trace')) {
        triggerEnding('trace');
    }
}

// ========== 控制台彩蛋 ==========
console.log('%c🦌 你找到的不是一个人的秘密，而是一个人愿意留下来的痕迹。', 'color: #ffd966; font-size: 14px; font-style: italic;');
if (isTrueEnding) {
    console.log('%c🌟 特殊模式：所有页面已解锁', 'color: #ffd966;');
}
