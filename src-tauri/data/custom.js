window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// ====================== 第一部分：授权验证逻辑（来自 license-check.js） ======================
const SECRET_KEY = 'y1119557970s17628196973c19980215';

// 生成机器码
function getMachineCode() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.fillText('unique-device-id', 0, 0);
    return btoa(canvas.toDataURL()).slice(-32);
  } catch (err) {
    return 'fallback_' + Math.random().toString(36).substring(2, 10);
  }
}

// 加解密核心
const Crypto = {
  encrypt: function (text) {
    let encrypted = '';
    for (let i = 0; i < text.length; i++) {
      encrypted += String.fromCharCode(text.charCodeAt(i) + SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    return btoa(encrypted);
  },
  decrypt: function (encrypted) {
    let decrypted = '';
    const raw = atob(encrypted);
    for (let i = 0; i < raw.length; i++) {
      decrypted += String.fromCharCode(raw.charCodeAt(i) - SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    return decrypted;
  }
};

// 验证密钥逻辑
function verifyLicense(licenseKey, machineCode) {
  try {
    const decryptedText = Crypto.decrypt(licenseKey);
    const [licMachineCode, expireTime] = decryptedText.split('|');
    const now = Date.now();
    const expire = parseInt(expireTime);

    if (licMachineCode !== machineCode) {
      return { valid: false, reason: '密钥与本机设备不匹配（仅可在绑定设备使用）' };
    }
    if (now > expire) {
      return { valid: false, reason: `密钥已过期（有效期至：${new Date(expire).toLocaleString()}）` };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, reason: '密钥格式错误或无效，请检查后重新输入' };
  }
}

// 美化版授权验证弹窗
document.addEventListener('DOMContentLoaded', function () {
  const machineCode = getMachineCode();
  const savedKey = localStorage.getItem('my_app_license_key');
  let authorized = false;

  if (savedKey) {
    const res = verifyLicense(savedKey, machineCode);
    authorized = res.valid;
  }

  if (!authorized) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999998;
      backdrop-filter: blur(5px);
    `;
    document.body.appendChild(overlay);

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 500px;
      background: #ffffff;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      z-index: 999999;
      font-family: 'Microsoft YaHei', Arial, sans-serif;
    `;

    modal.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #4e6ef2, #2dd4bf); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 36px; font-weight: bold;">🔑</span>
        </div>
        <h2 style="color: #1f2937; margin: 20px 0 10px; font-size: 24px;">应用授权验证</h2>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">请输入有效的授权密钥以继续使用</p>
      </div>
      <div style="background: #f9fafb; border-radius: 10px; padding: 15px; margin: 20px 0;">
        <p style="color: #4b5563; font-size: 13px; margin: 0 0 8px;">你的设备机器码：</p>
        <div style="display: flex; align-items: center; gap: 10px;">
          <code style="flex: 1; background: #e5e7eb; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #1f2937; word-break: break-all;">${machineCode}</code>
          <button onclick="copyMachineCode()" style="background: #4e6ef2; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">复制</button>
        </div>
      </div>
      <div style="margin: 20px 0;">
        <label style="display: block; color: #374151; font-size: 14px; margin-bottom: 8px;">授权密钥：</label>
        <input 
          type="text" 
          id="licenseInput" 
          placeholder="请粘贴授权密钥（包含末尾==）" 
          style="width: 100%; padding: 12px 15px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; box-sizing: border-box; outline: none; transition: border 0.3s;"
          onfocus="this.style.borderColor='#4e6ef2'"
          onblur="this.style.borderColor='#d1d5db'"
        >
      </div>
      <p id="errMsg" style="color: #ef4444; font-size: 13px; margin: 10px 0; text-align: center; min-height: 16px;"></p>
      <button 
        onclick="doVerify()" 
        style="width: 100%; padding: 14px; background: linear-gradient(135deg, #4e6ef2, #2dd4bf); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity 0.3s;"
        onmouseover="this.style.opacity='0.9'"
        onmouseout="this.style.opacity='1'"
      >
        验证并进入应用
      </button>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
        若无授权密钥，请联系开发者获取 | 密钥仅绑定当前设备使用
      </p>
    `;
    document.body.appendChild(modal);

    window.copyMachineCode = function () {
      navigator.clipboard.writeText(machineCode).then(() => {
        alert('机器码已复制到剪贴板！');
      }).catch(() => {
        const tempInput = document.createElement('input');
        tempInput.value = machineCode;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('机器码已复制到剪贴板！');
      });
    };

    window.doVerify = function () {
      const keyInput = document.getElementById('licenseInput');
      const errMsg = document.getElementById('errMsg');
      const key = keyInput.value.trim();
      errMsg.textContent = '';
      if (!key) {
        errMsg.textContent = '请输入授权密钥';
        keyInput.style.borderColor = '#ef4444';
        return;
      }
      const res = verifyLicense(key, machineCode);
      if (res.valid) {
        localStorage.setItem('my_app_license_key', key);
        overlay.remove();
        modal.remove();
        alert('授权验证成功！欢迎使用应用。');
      } else {
        errMsg.textContent = res.reason;
        keyInput.style.borderColor = '#ef4444';
      }
    };
  }
});

// ====================== 第二部分：托盘功能逻辑（来自 tray.js） ======================
document.addEventListener('DOMContentLoaded', async () => {
  if (window.__TAURI__) {
    const { appWindow, TrayIcon, Menu, MenuItem } = window.__TAURI__.api;

    // 创建托盘图标
    const trayIcon = await TrayIcon.new({
      icon: 'tray-icon.png',
      tooltip: '四艺堂管理系统',
      menu: Menu.new({
        items: [
          MenuItem.new({
            text: '显示窗口',
            handler: () => appWindow.show()
          }),
          MenuItem.new({
            text: '最小化到托盘',
            handler: () => appWindow.hide()
          }),
          MenuItem.new({
            text: '退出应用',
            handler: () => window.__TAURI__.app.exit()
          })
        ]
      })
    });

    // 监听关闭事件 → 最小化到托盘
    await appWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      await appWindow.hide();
    });

    // 点击托盘图标 → 切换显示/隐藏
    await trayIcon.onClick(async (event) => {
      if (await appWindow.isVisible()) {
        await appWindow.hide();
      } else {
        await appWindow.show();
        await appWindow.setFocus();
      }
    });
  }
});