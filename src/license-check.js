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

  // 验证已保存的密钥
  if (savedKey) {
    const res = verifyLicense(savedKey, machineCode);
    authorized = res.valid;
  }

  // 未授权则显示美化弹窗
  if (!authorized) {
    // 创建半透明遮罩层
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

    // 创建授权弹窗主体
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

    // 弹窗内容（美化版）
    modal.innerHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #4e6ef2, #2dd4bf); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-size: 36px; font-weight: bold;">🔑</span>
        </div>
        <h2 style="color: #1f2937; margin: 20px 0 10px; font-size: 24px;">应用授权验证</h2>
        <p style="color: #6b7280; font-size: 14px; margin: 0;">请输入有效的授权密钥以继续使用</p>
      </div>

      <!-- 机器码展示卡片 -->
      <div style="background: #f9fafb; border-radius: 10px; padding: 15px; margin: 20px 0;">
        <p style="color: #4b5563; font-size: 13px; margin: 0 0 8px;">你的设备机器码：</p>
        <div style="display: flex; align-items: center; gap: 10px;">
          <code style="flex: 1; background: #e5e7eb; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #1f2937; word-break: break-all;">${machineCode}</code>
          <button onclick="copyMachineCode()" style="background: #4e6ef2; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 12px;">复制</button>
        </div>
      </div>

      <!-- 密钥输入框 -->
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

      <!-- 错误提示 -->
      <p id="errMsg" style="color: #ef4444; font-size: 13px; margin: 10px 0; text-align: center; min-height: 16px;"></p>

      <!-- 验证按钮 -->
      <button 
        onclick="doVerify()" 
        style="width: 100%; padding: 14px; background: linear-gradient(135deg, #4e6ef2, #2dd4bf); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: opacity 0.3s;"
        onmouseover="this.style.opacity='0.9'"
        onmouseout="this.style.opacity='1'"
      >
        验证并进入应用
      </button>

      <!-- 底部说明 -->
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
        若无授权密钥，请联系开发者获取 | 密钥仅绑定当前设备使用
      </p>
    `;

    document.body.appendChild(modal);

    // 复制机器码功能
    window.copyMachineCode = function () {
      navigator.clipboard.writeText(machineCode).then(() => {
        alert('机器码已复制到剪贴板！');
      }).catch(() => {
        // 降级方案：手动选中
        const tempInput = document.createElement('input');
        tempInput.value = machineCode;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        alert('机器码已复制到剪贴板！');
      });
    };

    // 验证授权功能
    window.doVerify = function () {
      const keyInput = document.getElementById('licenseInput');
      const errMsg = document.getElementById('errMsg');
      const key = keyInput.value.trim();

      // 清空错误提示
      errMsg.textContent = '';

      // 验证输入
      if (!key) {
        errMsg.textContent = '请输入授权密钥';
        keyInput.style.borderColor = '#ef4444';
        return;
      }

      // 验证密钥
      const res = verifyLicense(key, machineCode);
      if (res.valid) {
        // 验证成功：保存密钥，关闭弹窗
        localStorage.setItem('my_app_license_key', key);
        overlay.remove();
        modal.remove();
        // 成功提示（可选）
        alert('授权验证成功！欢迎使用应用。');
      } else {
        // 验证失败：显示错误
        errMsg.textContent = res.reason;
        keyInput.style.borderColor = '#ef4444';
      }
    };
  }
});