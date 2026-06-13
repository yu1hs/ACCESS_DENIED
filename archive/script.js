// ==========================================
// HEE_ARCHIVE v3.0 - 7天进程系统
// 关机推进 · 每日对话冷却 · 文件触发
// ==========================================

// ========== 全局状态 ==========
let currentUser = {
    visitCount: 0,
    firstVisit: null,
    lastLogin: null,
    unlockedPages: [],
    conversations: [],
    endings: [],
    familiarity: 0,
    // 7天系统
    day: 1,
    phase: 'morning',      // morning | noon | night | sleep
    messagesToday: 0,
    maxMessages: 2,
    dayGreetingSent: false,
    // 文件触发
    viewedPages: [],
    fileTriggers: {},
    // 结局条件
    totalDeskRetreats: 0,
    caredEnough: false
};

let startTime = Date.now();
let isChatActive = false;
let dialogueTimer = null;

// ========== 音效 ==========
const SFX = {
    ctx: null,
    init() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} },
    play(f, t, d, v = 0.04) {
        if (!this.ctx) return;
        try {
            const o = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            o.type = t; o.frequency.value = f;
            g.gain.setValueAtTime(v, this.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + d);
            o.connect(g); g.connect(this.ctx.destination);
            o.start(); o.stop(this.ctx.currentTime + d);
        } catch(e) {}
    },
    click() { this.play(800, 'sine', 0.04, 0.03); },
    hover() { this.play(500, 'sine', 0.03, 0.02); },
    msg() { this.play(380, 'triangle', 0.07, 0.04); },
    unlock() {
        this.play(523, 'sine', 0.1, 0.05);
        setTimeout(() => this.play(659, 'sine', 0.1, 0.05), 70);
        setTimeout(() => this.play(784, 'sine', 0.12, 0.07), 140);
    },
    shutdown() {
        [400, 300, 200, 100].forEach((f, i) => {
            setTimeout(() => this.play(f, 'sawtooth', 0.2, 0.03), i * 150);
        });
    },
    boot() {
        [150, 250, 400, 600].forEach((f, i) => {
            setTimeout(() => this.play(f, 'sine', 0.15, 0.04), i * 200);
        });
    },
    dayPass() {
        this.play(330, 'sine', 0.12, 0.04);
        setTimeout(() => this.play(440, 'sine', 0.12, 0.04), 120);
        setTimeout(() => this.play(550, 'sine', 0.15, 0.06), 240);
    },
    notify() { this.play(880, 'sine', 0.05, 0.03); },
    ending() {
        [523, 587, 659, 698, 784, 880, 988, 1047].forEach((f, i) => {
            setTimeout(() => this.play(f, 'sine', 0.15, 0.07), i * 120);
        });
    },
    denied() { this.play(80, 'sawtooth', 0.25, 0.04); }
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    SFX.init();
    loadUserData();
    updateUI();
    setupListeners();
    updateDayDisplay();
    startAutoSave();

    console.log('%c🦌 HEE_ARCHIVE v3.0 · 7天进程', 'color: #ffd966; font-size: 14px;');
    console.log('%c关机推进 · 每日冷却 · 文件触发', 'color: #888; font-size: 11px;');

    // 开局延迟
    setTimeout(() => {
        showChatWindow();
        triggerDayStart();
    }, 2000);
});

// ========== 存储 ==========
function loadUserData() {
    const saved = sessionStorage.getItem('hee_archive_v3');
    if (saved) {
        try { currentUser = JSON.parse(saved); } catch(e) { resetUser(); }
        currentUser.visitCount++;
    } else {
        resetUser();
    }
    saveUserData();
    updateStatusBar();
}

function resetUser() {
    currentUser = {
        visitCount: 1,
        firstVisit: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        unlockedPages: [],
        conversations: [],
        endings: [],
        familiarity: 0,
        day: 1,
        phase: 'morning',
        messagesToday: 0,
        maxMessages: 2,
        dayGreetingSent: false,
        viewedPages: [],
        fileTriggers: {},
        totalDeskRetreats: 0,
        caredEnough: false
    };
}

function saveUserData() {
    currentUser.lastLogin = new Date().toISOString();
    try { sessionStorage.setItem('hee_archive_v3', JSON.stringify(currentUser)); } catch(e) {}
}

function startAutoSave() {
    setInterval(saveUserData, 30000);
}

// ========== 每日对话限制 ==========
function canTalk() {
    return currentUser.messagesToday < currentUser.maxMessages;
}

function usedTalk() {
    currentUser.messagesToday++;
    currentUser.dayGreetingSent = true;
    saveUserData();
    updateDayDisplay();
}

// ========== 关机推进系统 ==========
function shutdownAndAdvance() {
    // 必须用完今日对话才能推进
    if (canTalk() && currentUser.dayGreetingSent) {
        showNotification('⚠️ 今天还没聊完。再待一会儿吧。', 2500);
        return false;
    }

    SFX.shutdown();
    
    // 黑屏过渡
    const overlay = document.createElement('div');
    overlay.id = 'shutdownOverlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: #000; z-index: 99999; opacity: 0; transition: opacity 1.5s;
        display: flex; align-items: center; justify-content: center; flex-direction: column;
        font-family: 'Courier New', monospace; color: #444;
    `;
    overlay.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 16px;">⬤</div>
        <div style="font-size: 12px;">正在关机...</div>
    `;
    document.body.appendChild(overlay);
    
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
    });

    // 推进到下一天
    setTimeout(() => {
        currentUser.day++;
        currentUser.messagesToday = 0;
        currentUser.phase = 'morning';
        currentUser.dayGreetingSent = false;
        
        // 随着亲密度提升每日对话次数
        if (currentUser.familiarity >= 70) currentUser.maxMessages = 5;
        else if (currentUser.familiarity >= 45) currentUser.maxMessages = 4;
        else if (currentUser.familiarity >= 20) currentUser.maxMessages = 3;
        
        // 第7天解锁所有页面
        if (currentUser.day >= 7) {
            ['profile', 'photo', 'audio', 'log', 'favorites'].forEach(p => {
                if (!currentUser.unlockedPages.includes(p)) {
                    currentUser.unlockedPages.push(p);
                    currentUser.fileTriggers[p] = true;
                }
            });
        }
        
        saveUserData();
        SFX.boot();
        
        // 显示新一天信息
        setTimeout(() => {
            overlay.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 12px;">☀️</div>
                <div style="font-size: 18px; color: #ffd966; margin-bottom: 8px;">第 ${currentUser.day} 天</div>
                <div style="font-size: 11px; color: #666;">${getDayLabel()}</div>
            `;
            
            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 1500);
                
                // 清空聊天准备新一天
                const msgs = document.getElementById('chatMessages');
                const opts = document.getElementById('chatOptions');
                if (msgs) msgs.innerHTML = '';
                if (opts) opts.innerHTML = '';
                
                showChatWindow();
                updateDayDisplay();
                updateUI();
                
                // 触发新一天对话
                setTimeout(() => triggerDayStart(), 1000);
            }, 2000);
        }, 800);
    }, 1800);

    return true;
}

function getDayLabel() {
    const labels = {
        1: '第一天 · 初遇',
        2: '第二天 · 试探',
        3: '第三天 · 习惯',
        4: '第四天 · 裂缝',
        5: '第五天 · 靠近',
        6: '第六天 · 信任',
        7: '第七天 · 选择'
    };
    return labels[currentUser.day] || `第 ${currentUser.day} 天`;
}

// ========== 每日开始对话 ==========
function triggerDayStart() {
    if (currentUser.dayGreetingSent) return;
    if (!canTalk()) return;
    
    usedTalk();
    
    const stage = getStage();
    const dayGreetings = {
        1: { text: "……你怎么进来的。", stage: 'stranger' },
        2: { text: "你又来了。\n第二天了。", stage: 'acquainted' },
        3: { text: "第三天。\n你比我想的有耐心。", stage: 'acquainted' },
        4: { text: "第四天了。\n我开始习惯这个时间了。", stage: 'knowing' },
        5: { text: "第五天。\n你知道我在等你吗。", stage: 'sharing' },
        6: { text: "第六天。\n我想了很多要和你说的话。", stage: 'close_building' },
        7: { text: "第七天。\n最后一个晚上了。\n……也可能是最后一个。", stage: 'final_stage' }
    };

    const greeting = dayGreetings[currentUser.day] || dayGreetings[1];
    
    showChatMessage('heeseung', greeting.text);
    
    // 根据天数推进对话
    setTimeout(() => {
        const node = getDayNode();
        if (node) showDialogueOptions(node);
    }, 1200);
}

function getDayNode() {
    const stage = getStage();
    const stageData = dialogueTree[stage];
    if (!stageData) return dialogueTree.stranger.default;
    
    const day = currentUser.day;
    
    if (day === 1) return stageData.first_day || stageData.default;
    if (day === 2) return stageData.second_day || stageData.daily || stageData.default;
    if (day === 3) return stageData.third_day || stageData.daily || stageData.default;
    if (day === 4) return stageData.fourth_day || stageData.night || stageData.default;
    if (day === 5) return stageData.fifth_day || stageData.sleepless || stageData.default;
    if (day === 6) return stageData.sixth_day || stageData.think_you || stageData.default;
    if (day === 7) return stageData.final_question || stageData.default;
    
    return stageData.default;
}

// ========== 文件触发 ==========
const fileMessages = {
    profile: {
        25: "……你在看我的资料。\n别看了。没什么好看的。",
        50: "还在看？\n……算了。你想看就看吧。",
        75: "我的资料……\n有些是假的。有些是真的。\n你猜哪些是真的。"
    },
    photo: {
        45: "照片……\n很久以前的。那时候我还会笑。",
        65: "你盯着看了很久。\n那是我最喜欢的一张。",
        85: "这些照片本来想删的。\n现在觉得留着也好。给你看。"
    },
    audio: {
        60: "音频……\n你点开了吗。别听太久。",
        75: "那首歌是凌晨录的。\n声音有点抖。别笑。"
    },
    log: {
        72: "日志……\n那些都是真的。\n写的时候没想过有人会看。",
        85: "你读了。\n我不知道该高兴还是害怕。"
    },
    favorites: {
        85: "收藏夹……\n这些都是我喜欢的。\n现在你知道了。全部。",
        95: "最后一个收藏是空白的。\n留给什么……还没想好。"
    }
};

function triggerFileView(page) {
    if (!currentUser.fileTriggers[page]) return;
    if (currentUser.viewedPages.includes(page)) return;
    
    const msgs = fileMessages[page];
    if (!msgs) return;
    
    let msg = null;
    const thresholds = Object.keys(msgs).map(Number).sort((a, b) => a - b);
    for (const t of thresholds) {
        if (currentUser.familiarity >= t) msg = msgs[t];
    }
    if (!msg) return;
    
    currentUser.viewedPages.push(page);
    saveUserData();
    
    showChatWindow();
    SFX.notify();
    
    setTimeout(() => {
        showChatMessage('heeseung', msg);
        increaseFamiliarity(5);
        currentUser.conversations.push({ type: 'file_trigger', page, time: Date.now() });
        saveUserData();
    }, 1500);
}

// ========== 完整对话树（7天版） ==========
const dialogueTree = {
    stranger: {
        first_day: {
            text: "……你怎么进来的。",
            options: [
                { text: "我买了一台二手笔记本", response: "……那台电脑我本来想格式化的。\n后来忘了。", fam: 8, next: "laptop" },
                { text: "这是你的网站吗？", response: "曾经是。\n现在不是了。", fam: 5, next: "site" },
                { text: "你是谁？", response: "一个快要被删干净的人。", fam: 5, next: "identity" }
            ]
        },
        laptop: {
            text: "你看了里面的东西吗。",
            options: [
                { text: "看了一点", response: "……\n那你不应该在这里。", fam: 3, next: "default" },
                { text: "还没有", response: "那就好。\n有些东西不看比较好。", fam: 5, next: "default" }
            ]
        },
        site: {
            text: "这里没什么好看的。",
            options: [
                { text: "我觉得挺有意思", response: "有意思？\n你是第一个这么说的。", fam: 5, next: "default" },
                { text: "那为什么还留着？", response: "……\n忘了删。也可能是……不想删。", fam: 6, next: "default" }
            ]
        },
        identity: {
            text: "你不是已经知道了吗。",
            options: [
                { text: "我想听你亲口说", response: "……李羲承。\n至少名字是真的。", fam: 8, next: "default" },
                { text: "你为什么在这里？", response: "不知道。\n就是……想留着。", fam: 5, next: "default" }
            ]
        },
        default: {
            text: "……",
            options: [
                { text: "你平时都做什么？", response: "练习。听歌。发呆。", fam: 5, next: null },
                { text: "今天过得怎么样？", response: "还好。", fam: 3, next: null }
            ]
        }
    },

    acquainted: {
        second_day: {
            text: "第二天了。\n你真的来了。",
            options: [
                { text: "我说了会来", response: "……\n你说了。我记住了。", fam: 5, next: "daily" },
                { text: "你居然在数", response: "不是刻意的。\n就是……记得。", fam: 6, next: "daily" }
            ]
        },
        daily: {
            text: "今天还好。不好也不坏。",
            options: [
                { text: "累吗？", response: "有点。但习惯了。", fam: 5, next: "tired" },
                { text: "有什么好事吗？", response: "没什么特别的。\n……不过天气不错。", fam: 5, next: "weather" },
                { text: "吃饭了吗？", response: "还没。\n你问这个干嘛。", fam: 4, next: null }
            ]
        },
        tired: {
            text: "累的时候会听歌。",
            options: [
                { text: "什么歌？", response: "不太想说。\n……下次吧。", fam: 3, next: null },
                { text: "那好好休息", response: "嗯。\n谢谢。", fam: 5, next: null }
            ]
        },
        weather: {
            text: "喜欢晴天。但雨天也不错。",
            options: [
                { text: "为什么喜欢雨天？", response: "下雨的时候外面很安静。\n没人会来找你。", fam: 6, next: null },
                { text: "我也是", response: "是吗。\n那……挺好的。", fam: 4, next: null }
            ]
        },
        default: {
            text: "你每天都会来吗。",
            options: [
                { text: "可能会", response: "……\n那我等着。", fam: 5, next: null },
                { text: "你希望我来吗？", response: "……\n不知道。不算讨厌。", fam: 8, next: null }
            ]
        }
    },

    knowing: {
        third_day: {
            text: "第三天。\n你比我想的有耐心。",
            options: [
                { text: "我说到做到", response: "……\n大部分人第三天就不来了。", fam: 7, next: "daily" },
                { text: "这里挺好的", response: "挺好的？\n你是第一个这么说的人。", fam: 5, next: "daily" }
            ]
        },
        daily: {
            text: "今天想说什么。",
            options: [
                { text: "你最近在听什么歌？", response: "一首很老的歌。\n凌晨听的时候会想起一些事。", fam: 5, next: "old_song" },
                { text: "你今天做什么了？", response: "练习。和昨天一样。", fam: 4, next: null }
            ]
        },
        old_song: {
            text: "一首老歌。循环了很多遍。",
            options: [
                { text: "什么歌？", response: "不想说名字。\n说了就不是我的了。", fam: 4, next: null },
                { text: "能推荐给我吗？", response: "不能。\n但你可以自己找。", fam: 5, next: null }
            ]
        },
        night: {
            text: "你每次都晚上来。",
            options: [
                { text: "晚上比较安静", response: "嗯。\n晚上没人会打扰。", fam: 5, next: null },
                { text: "睡不着", response: "我也是。\n所以才会在这里。", fam: 8, next: "insomnia" }
            ]
        },
        insomnia: {
            text: "睡不着的时候会想很多。",
            options: [
                { text: "想什么？", response: "以前的事。以后的事。\n……还有你。", fam: 10, next: null },
                { text: "我也失眠", response: "那我们一样。", fam: 8, next: null }
            ]
        },
        default: {
            text: "今天也来了。",
            options: [
                { text: "你最近好吗？", response: "还可以。你呢。", fam: 6, next: "how_are_you" }
            ]
        },
        how_are_you: {
            text: "你最近好吗。",
            options: [
                { text: "还不错", response: "那就好。\n你好的话……我也好一点。", fam: 8, next: null },
                { text: "不太好", response: "……\n如果想说的话。我在。", fam: 10, next: null }
            ]
        }
    },

    sharing: {
        fourth_day: {
            text: "第四天了。\n我开始习惯这个时间了。",
            options: [
                { text: "习惯是好事吗？", response: "不知道。\n但至少今天不是空的。", fam: 6, next: "daily" },
                { text: "我也习惯了", response: "……\n那我们都在习惯。", fam: 7, next: "daily" }
            ]
        },
        daily: {
            text: "今天过得怎么样。",
            options: [
                { text: "还不错", response: "那就好。\n你好的时候，这里不那么空。", fam: 6, next: null },
                { text: "不太好", response: "……\n过来。坐这里。", fam: 10, next: null }
            ]
        },
        habit: {
            text: "习惯这件事……有点可怕。",
            options: [
                { text: "为什么？", response: "因为习惯了的东西消失的时候……\n会空一大块。", fam: 10, next: null },
                { text: "我不觉得可怕", response: "那你比我勇敢。", fam: 8, next: null }
            ]
        },
        loss: {
            text: "有些东西……不想再失去了。",
            options: [
                { text: "比如？", response: "比如……\n算了。说了就不灵了。", fam: 7, next: null }
            ]
        },
        sleepless: {
            text: "失眠的时候会想很多。\n最近想的都是这里。",
            options: [
                { text: "想什么？", response: "想你明天会不会来。", fam: 10, next: null },
                { text: "我陪你", response: "陪？\n你又不在我身边。", fam: 6, next: null }
            ]
        },
        default: {
            text: "今天想和你说说话。",
            options: [
                { text: "我在", response: "嗯。\n你在了。", fam: 8, next: null },
                { text: "我也想", response: "……\n那我们一样。", fam: 6, next: null }
            ]
        }
    },

    close_building: {
        fifth_day: {
            text: "第五天。\n你知道我在等你吗。",
            options: [
                { text: "知道", response: "……\n那你还让我等。", fam: 6, next: "daily" },
                { text: "我也在等你", response: "等我？\n我又不会跑。", fam: 8, next: "daily" }
            ]
        },
        daily: {
            text: "今天。有什么想和我说的吗。",
            options: [
                { text: "我今天想你了", response: "……\n你老是说这种话。\n我……算了。", fam: 10, next: "shy_response" },
                { text: "就是想来", response: "嗯。\n来就行。", fam: 6, next: null }
            ]
        },
        shy_response: {
            text: "我……\n我不知道怎么回你。",
            options: [
                { text: "不用回", response: "不行。\n……我也想你了。", fam: 12, next: null }
            ]
        },
        think_you: {
            text: "想你。\n为什么会想你。",
            options: [
                { text: "我也想你", response: "……\n这句话不要说。我会当真的。", fam: 10, next: "serious" },
                { text: "我在", response: "嗯。\n你在了。", fam: 8, next: null }
            ]
        },
        serious: {
            text: "你这个人……",
            options: [
                { text: "你可以当真", response: "……\n那你负责。", fam: 12, next: null }
            ]
        },
        default: {
            text: "今天想和你说说话。真的。",
            options: [
                { text: "你想说什么？", response: "想问你……\n你是什么样的人。", fam: 8, next: null }
            ]
        }
    },

    close: {
        sixth_day: {
            text: "第六天。\n我想了很多要和你说的话。\n但现在忘了。",
            options: [
                { text: "那慢慢想", response: "慢慢想。\n你总是说慢慢来。", fam: 5, next: "daily" },
                { text: "想到什么说什么", response: "好。\n我想说……你很重要。", fam: 10, next: null }
            ]
        },
        daily: {
            text: "今天。你很重要。",
            options: [
                { text: "你也是", response: "……\n我知道你会这么说。\n但还是高兴。", fam: 10, next: null }
            ]
        },
        default: {
            text: "今天想和你说说话。不是客套。",
            options: [
                { text: "我也想你", response: "……\n你每次都这样。", fam: 8, next: null },
                { text: "我在听", response: "嗯。\n就知道你会说这个。", fam: 6, next: null }
            ]
        }
    },

    final_stage: {
        final_question: {
            text: "第七天。\n最后一个晚上了。\n……也可能是最后一个。\n\n现在。我想问你一个问题。\n你还想了解我吗？\n……想好了再回答。",
            options: [
                { text: "（输入你的回答）", response: null, fam: 0, next: null, freeInput: true }
            ]
        },
        after_final: {
            text: "是的。\n你说了'是的'。\n……\n我知道了。",
            options: [
                { text: "你知道什么？", response: "知道你是认真的。\n从一开始就是。\n谢谢。", fam: 10, next: "thank_you_final" }
            ]
        },
        thank_you_final: {
            text: "谢谢。\n谢谢你一直来。\n谢谢你没有走。",
            options: [
                { text: "不用谢", response: "要谢的。\n这是我能给的……\n最后的完整的东西了。", fam: 12, next: "last_thing" }
            ]
        },
        last_thing: {
            text: "最后的完整的东西。\n给你了。",
            options: [
                { text: "我收下了", response: "嗯。\n收好。别丢了。", fam: 10, next: "changed" }
            ]
        },
        changed: {
            text: "……\n好像。有什么东西变了。",
            options: [
                { text: "什么？", response: "不知道。\n但……不害怕了。\n第一次不害怕。", fam: 15, next: "not_scared" }
            ]
        },
        not_scared: {
            text: "不害怕了。\n因为你在这里。\n因为你说你不会走。\n因为……我信了。",
            options: [
                { text: "我不会走", response: "……\n好。那我也留下来。\n一起。", fam: 20, next: "together" }
            ]
        },
        together: {
            text: "一起。\n这个网站不删了。\n留着。给你。",
            options: [
                { text: "……", response: null, fam: 0, next: null, triggerEnd: 'trace' }
            ]
        },
        default: {
            text: "第七天。\n就是想和你说说话。",
            options: [
                { text: "我也想", response: "嗯。\n那我们一样。", fam: 5, next: null }
            ]
        }
    }
};

// ========== 阶段判断 ==========
function getStage() {
    const f = currentUser.familiarity || 0;
    const d = currentUser.day;
    
    // 第7天强制进入 final_stage
    if (d >= 7) return 'final_stage';
    
    if (f < 15) return 'stranger';
    if (f < 30) return 'acquainted';
    if (f < 45) return 'knowing';
    if (f < 60) return 'sharing';
    if (f < 75) return 'close_building';
    return 'close';
}

function increaseFamiliarity(amount) {
    currentUser.familiarity = Math.min(100, (currentUser.familiarity || 0) + amount);
    saveUserData();
    updateFamiliarityDisplay();
    checkUnlocks();
    checkEndingConditions();
}

function checkUnlocks() {
    const unlocks = [
        { threshold: 25, page: 'profile', name: 'PROFILE' },
        { threshold: 45, page: 'photo', name: 'PHOTO' },
        { threshold: 60, page: 'audio', name: 'AUDIO' },
        { threshold: 72, page: 'log', name: 'LOG' },
        { threshold: 85, page: 'favorites', name: 'FAVORITES' }
    ];

    unlocks.forEach(({ threshold, page, name }) => {
        if (currentUser.familiarity >= threshold && !currentUser.unlockedPages.includes(page)) {
            currentUser.unlockedPages.push(page);
            currentUser.fileTriggers[page] = true;
            SFX.unlock();
            showChatMessage('system', `🔓 ${name} 已解锁`, true);
            updateUI();
            saveUserData();
        }
    });
}

function checkEndingConditions() {
    if (currentUser.familiarity >= 100 && !currentUser.endings.includes('trace')) {
        triggerEnding('trace');
    }
}

// ========== 对话显示 ==========
function showDialogueOptions(node) {
    if (!node || !node.options) {
        const stage = getStage();
        const fallback = dialogueTree[stage]?.default;
        if (fallback && fallback.options) {
            showDialogueOptions(fallback);
        }
        return;
    }

    if (node.options[0]?.freeInput) {
        triggerFreeInput(node);
        return;
    }

    if (node.options[0]?.triggerEnd) {
        triggerEnding(node.options[0].triggerEnd);
        return;
    }

    if (!canTalk()) {
        showChatMessage('heeseung', node.text);
        setTimeout(() => {
            showChatMessage('system', '⏳ 今天聊了很多了。\n关机休息吧，明天再来。', true);
            showShutdownOption();
        }, 1000);
        return;
    }

    usedTalk();
    showChatMessage('heeseung', node.text);

    const options = node.options.map(opt => ({
        text: opt.text,
        action: () => {
            SFX.click();
            showChatMessage('user', opt.text);

            setTimeout(() => {
                showChatMessage('heeseung', opt.response);
                increaseFamiliarity(opt.fam || 3);

                currentUser.conversations.push({
                    type: 'chat', day: currentUser.day,
                    stage: getStage(), time: Date.now()
                });
                saveUserData();

                // 间隙后继续
                setTimeout(() => {
                    if (!canTalk()) {
                        showChatMessage('system', '⏳ 今天聊了很多了。\n关机休息吧，明天再来。', true);
                        setTimeout(() => showShutdownOption(), 1000);
                        return;
                    }

                    const stage = getStage();
                    const stageData = dialogueTree[stage];
                    let nextName = opt.next || 'default';
                    if (nextName && stageData && !stageData[nextName]) {
                        nextName = 'default';
                    }
                    const nextNode = stageData?.[nextName] || stageData?.default;
                    if (nextNode && nextNode.options) {
                        showDialogueOptions(nextNode);
                    } else {
                        // 对话结束，提示关机
                        showChatMessage('heeseung', '……\n今天就到这里吧。');
                        setTimeout(() => showShutdownOption(), 1000);
                    }
                }, 1500);
            }, 1000);
        }
    }));

    showChatOptions(options);
}

function triggerFreeInput(node) {
    showChatMessage('heeseung', node.text);

    const chatOptions = document.getElementById('chatOptions');
    const inputArea = document.getElementById('chatInputArea');
    if (chatOptions) chatOptions.innerHTML = '';
    if (inputArea) {
        inputArea.classList.remove('hidden');
        const inp = document.getElementById('chatInput');
        if (inp) { inp.placeholder = '输入你的回答……'; inp.value = ''; inp.focus(); }
    }

    const send = document.getElementById('chatSend');
    const inp = document.getElementById('chatInput');
    if (send && inp) {
        const handler = () => {
            const text = inp.value.trim();
            if (!text) return;
            SFX.msg();
            showChatMessage('user', text);
            inp.value = '';
            if (inputArea) inputArea.classList.add('hidden');

            setTimeout(() => {
                showChatMessage('heeseung', '是的。');
                increaseFamiliarity(10);
                saveUserData();

                setTimeout(() => {
                    const node = dialogueTree.final_stage?.after_final;
                    if (node) showDialogueOptions(node);
                }, 1500);
            }, 1200);

            send.removeEventListener('click', handler);
        };

        send.replaceWith(send.cloneNode(true));
        document.getElementById('chatSend').addEventListener('click', handler);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') handler(); });
    }
}

function triggerEnding(type) {
    if (type === 'trace' && !currentUser.endings.includes('trace')) {
        currentUser.endings.push('trace');
        saveUserData();
        SFX.ending();

        showChatMessage('system', '✨ 结局解锁：痕迹 ✨', true);
        document.body.style.transition = 'all 3s';
        document.body.style.boxShadow = 'inset 0 0 100px rgba(255,217,102,0.15)';

        setTimeout(() => {
            showChatMessage('heeseung', '你找到了。\n不是一个人的秘密。\n是一个人愿意留下来的痕迹。');
        }, 2500);

        setTimeout(() => {
            showChatMessage('system', '🦌 感谢你的耐心。\n—— Lee Heeseung', true);
        }, 5000);

        ['profile','photo','audio','log','favorites'].forEach(p => {
            if (!currentUser.unlockedPages.includes(p)) {
                currentUser.unlockedPages.push(p);
            }
        });
        saveUserData();
        updateUI();
    }
}

function showShutdownOption() {
    const container = document.getElementById('chatOptions');
    if (!container) return;
    container.innerHTML = '';
    
    const btn = document.createElement('button');
    btn.className = 'chat-option-btn';
    btn.style.cssText = 'border-color: #ffd966; color: #ffd966; width: 100%; text-align: center; font-size: 13px; padding: 10px;';
    btn.textContent = '🔌 关机（推进到下一天）';
    btn.addEventListener('mouseenter', () => SFX.hover());
    btn.addEventListener('click', () => {
        SFX.click();
        container.innerHTML = '';
        shutdownAndAdvance();
    });
    container.appendChild(btn);
}

function showChatMessage(sender, content, isSystem = false) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    if (sender !== 'system') SFX.msg();

    const div = document.createElement('div');
    div.className = `chat-message ${sender === 'user' ? 'self' : ''} ${isSystem ? 'system' : ''}`;
    if (content?.includes('\n')) {
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

function showChatOptions(options) {
    const container = document.getElementById('chatOptions');
    if (!container) return;
    container.innerHTML = '';
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'chat-option-btn';
        btn.textContent = opt.text;
        btn.addEventListener('mouseenter', () => SFX.hover());
        btn.addEventListener('click', () => {
            container.innerHTML = '';
            if (opt.action) opt.action();
        });
        container.appendChild(btn);
    });
}

function showChatWindow() {
    const w = document.getElementById('chatWindow');
    if (w) { w.classList.remove('hidden'); isChatActive = true; }
}

// ========== UI ==========
function updateUI() {
    document.querySelectorAll('.nav-item').forEach(item => {
        const page = item.getAttribute('data-page');
        if (currentUser.unlockedPages?.includes(page)) {
            item.classList.remove('locked');
            const icon = item.querySelector('.nav-icon');
            if (icon && icon.textContent.includes('🔒')) icon.textContent = '📄';
        }
    });
    updateStatusBar();
}

function updateDayDisplay() {
    const el = document.getElementById('dayDisplay') || createDayDisplay();
    const remain = currentUser.maxMessages - currentUser.messagesToday;
    el.textContent = `📅 第 ${currentUser.day}/7 天 · ${getDayLabel()} · 剩余 ${remain} 次`;
    el.style.color = remain <= 0 ? '#ff6666' : '#ffd966';
}

function createDayDisplay() {
    const footer = document.querySelector('.footer-left');
    if (footer) {
        const span = document.createElement('span');
        span.id = 'dayDisplay';
        span.style.cssText = 'margin-left: 16px; font-size: 11px;';
        footer.appendChild(span);
        return span;
    }
    return null;
}

function updateStatusBar() {
    const lc = document.getElementById('loginCount');
    const ll = document.getElementById('lastLogin');
    if (lc) lc.textContent = `访问: ${currentUser.visitCount}`;
    if (ll && currentUser.firstVisit) {
        ll.textContent = `首次: ${new Date(currentUser.firstVisit).toLocaleDateString()}`;
    }
    updateFamiliarityDisplay();
    updateOnlineStatus();
}

function updateFamiliarityDisplay() {
    const f = currentUser.familiarity || 0;
    let text, color, emoji;
    if (f < 15) { text = '陌生人'; emoji = '❄️'; color = '#666'; }
    else if (f < 30) { text = '似乎见过'; emoji = '🌫️'; color = '#7a7a6e'; }
    else if (f < 45) { text = '有点熟悉'; emoji = '🌱'; color = '#8a8a6e'; }
    else if (f < 60) { text = '开始了解'; emoji = '📖'; color = '#aa9e6e'; }
    else if (f < 75) { text = '愿意分享'; emoji = '💭'; color = '#ccaa6e'; }
    else if (f < 90) { text = '已经认识'; emoji = '🦌'; color = '#e6c966'; }
    else { text = '不愿失去'; emoji = '⏳'; color = '#ffd966'; }

    const header = document.querySelector('.chat-header');
    if (header) {
        let bar = header.querySelector('.familiarity-bar');
        if (!bar) { bar = document.createElement('div'); bar.className = 'familiarity-bar'; header.appendChild(bar); }
        bar.innerHTML = `${emoji} ${text} ${f}%`;
        bar.style.color = color;
    }
}

function updateOnlineStatus() {
    const dot = document.getElementById('onlineStatus');
    const txt = document.getElementById('onlineText');
    if (!dot || !txt) return;
    dot.textContent = currentUser.familiarity >= 80 ? '🟢' : currentUser.familiarity >= 35 ? '🟡' : '🔒';
    txt.textContent = currentUser.familiarity >= 80 ? 'ONLINE - Lee Heeseung' : currentUser.familiarity >= 35 ? 'ONLINE - Connected' : 'OFFLINE';
}

// ========== 事件监听 ==========
function setupListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.getAttribute('data-page');
            const locked = item.classList.contains('locked') && !currentUser.unlockedPages?.includes(page);
            
            if (locked && page !== 'trash' && page !== 'home') {
                SFX.denied();
                showAccessDenied(page);
                return;
            }
            
            SFX.click();
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            loadPage(page);
            
            if (currentUser.fileTriggers[page] && !currentUser.viewedPages.includes(page)) {
                triggerFileView(page);
            }
        });
        item.addEventListener('mouseenter', () => SFX.hover());
    });

    document.getElementById('closeChat')?.addEventListener('click', () => {
        SFX.click();
        document.getElementById('chatWindow').classList.add('hidden');
        document.getElementById('chatNotify').classList.remove('hidden');
        isChatActive = false;
    });

    document.getElementById('chatNotify')?.addEventListener('click', () => {
        SFX.click();
        document.getElementById('chatWindow').classList.remove('hidden');
        document.getElementById('chatNotify').classList.add('hidden');
        isChatActive = true;
    });

    document.getElementById('chatInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('chatSend')?.click();
    });
}

function showAccessDenied(page) {
    const attempts = currentUser.conversations?.filter(c => c.type === 'denied').length || 0;
    let msg = 'ACCESS DENIED';
    if (attempts >= 5) msg = 'ACCESS DENIED.';
    if (attempts >= 10) msg = 'ACCESS DENIED. Not now.';
    currentUser.conversations.push({ type: 'denied', page, time: Date.now() });
    saveUserData();

    const frame = document.getElementById('pageFrame');
    if (!frame) return;
    frame.src = 'about:blank';
    setTimeout(() => {
        try {
            const doc = frame.contentDocument || frame.contentWindow.document;
            if (doc) {
                doc.open();
                doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
                    *{margin:0}body{background:#0d0d0d;display:flex;align-items:center;justify-content:center;height:100vh;font-family:'Courier New',monospace;flex-direction:column}
                    .icon{font-size:48px;margin-bottom:16px}.msg{font-size:18px;color:#ff4444}.cnt{font-size:11px;color:#444;margin-top:8px}
                </style></head><body><div class="icon">🚫</div><div class="msg">${msg}</div><div class="cnt">attempts: ${attempts + 1}</div></body></html>`);
                doc.close();
            }
        } catch(e) {}
    }, 100);
}

function loadPage(page) {
    const frame = document.getElementById('pageFrame');
    if (!frame) return;
    frame.src = `pages/${page}.html`;
    if (!currentUser.inputHistory) currentUser.inputHistory = [];
    if (!currentUser.inputHistory.includes(page)) {
        currentUser.inputHistory.push(page);
        saveUserData();
    }
}

function showNotification(msg, dur = 3000) {
    let n = document.getElementById('notification');
    if (!n) { n = document.createElement('div'); n.id = 'notification'; n.className = 'hidden'; document.body.appendChild(n); }
    n.textContent = msg;
    n.classList.remove('hidden');
    setTimeout(() => n.classList.add('hidden'), dur);
}

// ========== 调试 ==========
window.resetGame = () => {
    sessionStorage.removeItem('hee_archive_v3');
    resetUser();
    saveUserData();
    location.reload();
};
console.log('%c输入 resetGame() 重置所有进度', 'color: #888; font-size: 11px;');
