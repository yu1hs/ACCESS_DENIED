<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <title>HEE_ARCHIVE</title>
    <style>
        .hidden { display: none !important; }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        body {
            margin: 0;
            background: #0d0d0d;
            color: #ccc;
            font-family: 'Courier New', monospace;
            overflow: hidden;
            height: 100vh;
        }

        /* 侧边栏 */
        .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            width: 200px;
            height: 100vh;
            background: #121212;
            border-right: 1px solid #222;
            padding: 20px 0;
            display: flex;
            flex-direction: column;
            z-index: 100;
        }
        .sidebar-title {
            padding: 20px;
            color: #ffd966;
            font-size: 16px;
            letter-spacing: 2px;
            border-bottom: 1px solid #222;
            margin-bottom: 10px;
        }
        .nav-item {
            padding: 12px 20px;
            color: #666;
            cursor: pointer;
            font-size: 12px;
            transition: 0.3s;
            border-left: 2px solid transparent;
        }
        .nav-item:hover {
            color: #ccc;
            background: #1a1a1a;
        }
        .nav-item.active {
            color: #ffd966;
            border-left-color: #ffd966;
            background: #1a1a1a;
        }
        .nav-item.locked {
            color: #333;
            cursor: not-allowed;
        }
        .nav-item.locked:hover {
            color: #444;
            background: transparent;
        }
        .nav-icon { margin-right: 8px; }
        .sidebar-footer {
            margin-top: auto;
            padding: 20px;
            border-top: 1px solid #222;
            font-size: 11px;
            color: #555;
        }

        /* iframe */
        #pageFrame {
            margin-left: 200px;
            width: calc(100% - 200px);
            height: 100vh;
            border: none;
            background: #0d0d0d;
        }

        /* 聊天通知按钮 */
        #chatNotify {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            z-index: 9998;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.3s;
        }
        #chatNotify:hover {
            border-color: #ffd966;
            box-shadow: 0 0 12px rgba(255, 217, 102, 0.2);
        }

        /* 聊天窗口 */
        #chatWindow {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 380px;
            height: 520px;
            background: #141414;
            border: 1px solid #2a2a2a;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            z-index: 9999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        }
        .chat-header {
            padding: 12px 16px;
            border-bottom: 1px solid #222;
            color: #aaa;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        #closeChat {
            background: none;
            border: none;
            color: #555;
            cursor: pointer;
            font-size: 16px;
            transition: 0.2s;
        }
        #closeChat:hover { color: #ff4444; }

        #chatMessages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .chat-message {
            padding: 10px 14px;
            border-radius: 10px;
            max-width: 80%;
            font-size: 13px;
            line-height: 1.6;
            color: #bbb;
            background: #1e1e1e;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .chat-message.self {
            background: #2a4a3a;
            color: #c8e6c9;
            align-self: flex-end;
            border-bottom-right-radius: 2px;
        }
        .chat-message.system {
            background: #1a1a0a;
            color: #ffd966;
            text-align: center;
            max-width: 100%;
            font-size: 11px;
            border: 1px dashed #333;
        }

        #chatOptions {
            padding: 10px 16px;
            border-top: 1px solid #222;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .chat-option-btn {
            background: #1a1a1a;
            border: 1px solid #333;
            color: #999;
            padding: 8px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            transition: 0.2s;
        }
        .chat-option-btn:hover {
            background: #222;
            border-color: #ffd966;
            color: #ffd966;
        }

        #chatInputArea {
            padding: 10px 16px;
            border-top: 1px solid #222;
            display: flex;
            gap: 8px;
        }
        #chatInput {
            flex: 1;
            background: #1a1a1a;
            border: 1px solid #333;
            color: #ccc;
            padding: 10px 14px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            outline: none;
            transition: 0.2s;
        }
        #chatInput:focus {
            border-color: #ffd966;
        }
        #chatSend {
            background: #2a4a3a;
            border: none;
            color: #c8e6c9;
            padding: 10px 18px;
            border-radius: 8px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            transition: 0.2s;
        }
        #chatSend:hover {
            background: #3a6b4f;
        }

        #notification {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #1a1a1a;
            border: 1px solid #ffd966;
            color: #ffd966;
            padding: 10px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 12px;
            transition: 0.3s;
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="sidebar-title">HEE_ARCHIVE</div>
        <div class="nav-item active" data-page="home"><span class="nav-icon">🏠</span> HOME</div>
        <div class="nav-item locked" data-page="profile"><span class="nav-icon">🔒</span> PROFILE</div>
        <div class="nav-item locked" data-page="photo"><span class="nav-icon">🔒</span> PHOTO</div>
        <div class="nav-item locked" data-page="audio"><span class="nav-icon">🔒</span> AUDIO</div>
        <div class="nav-item locked" data-page="log"><span class="nav-icon">🔒</span> LOG</div>
        <div class="nav-item locked" data-page="favorites"><span class="nav-icon">🔒</span> FAVORITES</div>
        <div class="nav-item" data-page="trash"><span class="nav-icon">🗑️</span> TRASH</div>
        <div class="sidebar-footer">
            <div id="onlineStatus">🔒</div>
            <div id="onlineText">OFFLINE</div>
            <div id="loginCount" style="margin-top:6px;"></div>
            <div id="lastLogin"></div>
        </div>
    </div>

    <iframe id="pageFrame" src="pages/home.html"></iframe>

    <div id="chatNotify" class="hidden">💬</div>

    <div id="chatWindow" class="hidden">
        <div class="chat-header">
            <span>💬 Lee Heeseung</span>
            <button id="closeChat">✕</button>
        </div>
        <div id="chatMessages"></div>
        <div id="chatOptions"></div>
        <div id="chatInputArea" class="hidden">
            <input type="text" id="chatInput" placeholder="输入你想说的话..." onkeydown="if(event.key==='Enter')document.getElementById('chatSend').click()">
            <button id="chatSend">发送</button>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
