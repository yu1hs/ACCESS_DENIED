// HEE_ARCHIVE - 所有动态数据

// ========== 羲承的对话回复库 ==========
const heeseungDialogues = {
    // 初次见面
    greetings: [
        "你怎么进来的？",
        "这个网站很久没人来了。",
        "你是...新来的？"
    ],
    
    // 关于身份
    identity: [
        "一个快要被删干净的人。",
        "这个网站的主人。...曾经是。",
        "你不是已经知道了吗。",
        "李羲承。...至少名字是真的。"
    ],
    
    // 关于网站
    aboutSite: [
        "本来想删掉的。后来忘了。",
        "留着也没什么不好。",
        "这里记录了一些东西。...但不是全部。"
    ],
    
    // 关于日常
    daily: [
        "今天还好。",
        "练习结束了。",
        "买了冰美式。太冰了。",
        "今天有人说了'辛苦了'。没什么特别的意思。"
    ],
    
    // 深夜
    lateNight: [
        "你还不睡吗。",
        "这个时间还在。...我也是。",
        "凌晨的时候想法比较多。"
    ],
    
    // 反问
    questions: [
        "你觉得呢。",
        "你为什么会想知道这个。",
        "你每次都这么晚吗。"
    ],
    
    // 沉默
    silence: [
        "...",
        "……",
        "嗯。"
    ],
    
    // 解锁时的反应
    onUnlock: {
        profile: "你看到我的资料了。...其实没什么特别的。",
        photo: "那些照片...有些我都不记得是什么时候拍的。",
        audio: "录音的时候没想到有人会听。所以不完整。抱歉。",
        log: "那些日志。...很无聊吧。",
        favorites: "你喜欢的东西和我一样吗。不一定吧。",
        user: "你看到了。...那个页面是后来加的。"
    },
    
    // 特定场景
    onLongStay: "你在这个页面待了很久。在看什么。",
    onReturn: "你又来了。",
    onPhotoRepair: "那张照片...谢谢你帮我想起来。",
    onProfileEdit: "你写的东西我看到了。"
};

// ========== 根据上下文获取回复 ==========
function getHeeseungDialogue(context, count = 0) {
    let replies = [];
    
    switch(context) {
        case 'greeting':
            replies = heeseungDialogues.greetings;
            break;
        case 'identity':
            replies = heeseungDialogues.identity;
            break;
        case 'about':
            replies = heeseungDialogues.aboutSite;
            break;
        case 'daily':
            replies = heeseungDialogues.daily;
            break;
        case 'night':
            replies = heeseungDialogues.lateNight;
            break;
        case 'question':
            replies = heeseungDialogues.questions;
            break;
        default:
            replies = heeseungDialogues.silence;
    }
    
    return replies[count % replies.length];
}

// ========== PROFILE 页面动态内容 ==========
const profileContent = {
    name: "Lee Heeseung",
    birthPlace: "韩国",
    mbti: "INFP",
    likes: ["音乐", "夜晚", "安静", "冰美式"],
    dislikes: ["吵闹", "被打扰", "解释自己"],
    motto: "不用特意记住我。"
};

// ========== TRASH 回收站内容 ==========
const trashFiles = [
    {
        name: "draft_01.txt",
        date: "2024-03-15",
        content: "今天很累。\n\n想说的话打到一半。\n不想说了。\n\n删掉。"
    },
    {
        name: "note_02.txt",
        date: "2024-06-22",
        content: "想发一条消息。\n\n「最近还好吗」\n\n算了。\n谁会回答。\n\n删掉。"
    },
    {
        name: "memo_03.txt",
        date: "2024-09-01",
        content: "凌晨 02:47\n\n睡不着。\n\n练习室的灯很亮。\n亮得有点刺眼。\n\n但我喜欢。\n因为亮的时候不会想太多。\n\n…写这些干嘛。\n\n删掉。"
    },
    {
        name: "unsent_04.txt",
        date: "2024-11-11",
        content: "写给某个人的。\n\n但我不知道你是谁。\n也许不存在。\n\n「今天发生了很好的事」\n「想让你知道」\n\n但不能这样。\n\n删掉。"
    },
    {
        name: "night_05.txt",
        date: "2024-12-20",
        content: "凌晨 04:12\n\n又失眠了。\n\n今天在想一件事。\n…忘了。\n\n不重要。\n\n删掉。"
    }
];

// ========== PHOTO 照片数据 ==========
const photosData = [
    {
        id: 1,
        title: "天空",
        thumbnail: "🌅",
        needRepair: true,
        repairHint: "请描述你记忆中最喜欢的天空",
        description: "某天练习完出来看到的。",
        imageUrl: null  // 实际项目中可放图片链接
    },
    {
        id: 2,
        title: "练习室",
        thumbnail: "🪞",
        needRepair: true,
        repairHint: "请描述你记忆中练习室的样子",
        description: "那时候每天都在这里。…还在。",
        imageUrl: null
    },
    {
        id: 3,
        title: "便利店",
        thumbnail: "🏪",
        needRepair: true,
        repairHint: "当时买的饮料是？",
        description: "两点。很安静。只有自动门开开合合的声音。",
        imageUrl: null
    },
    {
        id: 4,
        title: "侧影",
        thumbnail: "👤",
        needRepair: false,
        description: "拍太久了。有点忘了那天是什么心情。但应该不是不好的心情。",
        imageUrl: null
    }
];

// ========== AUDIO 音频数据 ==========
const audioData = [
    {
        id: 1,
        title: "voice_01",
        duration: "00:06",
        transcript: "今天结束得有点晚。",
        note: "录的时候没想到有人会听。"
    },
    {
        id: 2,
        title: "voice_02",
        duration: "00:12",
        transcript: "再来一次。...算了，今天就这样。",
        note: "练习室。那天很累。"
    },
    {
        id: 3,
        title: "voice_03",
        duration: "00:08",
        transcript: "下雨了。忘记带伞了。...也不是第一次了。",
        note: "便利店门口。"
    },
    {
        id: 4,
        title: "voice_04",
        duration: "00:05",
        transcript: "想说什么来着。...忘了。",
        note: "深夜。"
    }
];

// ========== LOG 日志数据 ==========
const logEntries = [
    { date: "2024-03-11", content: "下雨。没出门。" },
    { date: "2024-03-15", content: "买了冰美式。太冰了。" },
    { date: "2024-04-02", content: "练习结束。累。" },
    { date: "2024-04-18", content: "今天有人说了「辛苦了」。没什么特别的意思。但听了还是有点…" },
    { date: "2024-05-07", content: "梦到以前的事。醒来忘了。" },
    { date: "2024-06-21", content: "夏至。白天很长。但待在室内没感觉。" },
    { date: "2024-07-30", content: "热。" },
    { date: "2024-08-14", content: "凌晨四点还没睡。看了以前的照片。不知道那时候在想什么。" },
    { date: "2024-09-02", content: "买了新耳机。音质还行。但旧的那副其实还没坏。" },
    { date: "2024-10-11", content: "风很大。树叶掉了很多。" },
    { date: "2024-11-23", content: "今天想联系一个人。想了很久。没联系。" },
    { date: "2024-12-31", content: "一年结束了。没什么特别的感想。明年再说。" }
];

// ========== FAVORITES 收藏数据 ==========
const favoritesData = {
    songs: [
        { title: "未命名", note: "凌晨三点听比较好。", emoji: "🎵" },
        { title: "未命名", note: "第一次听的时候觉得这是写给别人的。后来发现写给谁都行。", emoji: "🎶" },
        { title: "未命名", note: "这首不常听。但每次听都会想起某天。", emoji: "🎧" }
    ],
    movies: [
        { title: "未命名", note: "第二次看比第一次好。第三次比第二次差一点。第四次...还没看第四次。", emoji: "🎬" },
        { title: "未命名", note: "结局不喜欢。但前面的部分看了很多遍。", emoji: "📽️" },
        { title: "未命名", note: "不知道在讲什么。画面很好看。够了。", emoji: "🎞️" }
    ],
    photos: [
        { title: "未命名", note: "天气很好那天。", emoji: "📷" },
        { title: "未命名", note: "没人。", emoji: "🌅" },
        { title: "未命名", note: "那天本来想发出去的。", emoji: "🌃" }
    ]
};

// ========== UNKNOWN 未完成内容 ==========
const unfinishedContent = [
    "有时候会觉得…",
    "如果有人能…",
    "今天想说的其实是…",
    "我不太确定…但也许…",
    "最后的最后想说…"
];

// ========== 导出供其他文件使用 ==========
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        heeseungDialogues,
        getHeeseungDialogue,
        profileContent,
        trashFiles,
        photosData,
        audioData,
        logEntries,
        favoritesData,
        unfinishedContent
    };
}
