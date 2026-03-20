window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// PakePlus 独立应用 - 数据持久化 + 托盘功能 最终版
// 适配：Windows X64 独立桌面应用，内置浏览器内核，无系统浏览器依赖

// ==================== 1. 核心：数据持久化工具（脱离浏览器存储） ====================
const DataPersistence = {
  async init() {
    try {
      await PathUtils.init();
      // 数据文件路径：C:\Users\用户名\AppData\Local\应用名\app-data.json
      this.dataFilePath = await PathUtils.getConfigFilePath('app-data.json');
      this.localData = await this.loadData();
      // 首次启动迁移内置内核的localStorage数据
      await this.migrateInternalStorage();
      // 接管localStorage操作（原有代码无需修改）
      this.overrideLocalStorage();
      console.log('✅ 数据持久化初始化完成，文件路径：', this.dataFilePath);
    } catch (err) {
      console.error('❌ 数据初始化失败，降级使用内置存储：', err);
      this.localData = JSON.parse(localStorage.getItem('app_backup') || '{}');
    }
  },

  // 从系统目录加载数据文件（独立应用专属）
  async loadData() {
    try {
      const { fs } = window.__TAURI__.fs;
      if (await fs.exists(this.dataFilePath)) {
        const content = await fs.readTextFile(this.dataFilePath);
        return JSON.parse(content || '{}');
      } else {
        await fs.writeTextFile(this.dataFilePath, '{}');
        return {};
      }
    } catch (err) {
      console.warn('⚠️ 读取数据文件失败，使用空数据：', err);
      return {};
    }
  },

  // 保存数据到系统目录（独立进程安全写入）
  async saveData() {
    try {
      const { fs } = window.__TAURI__.fs;
      await fs.writeTextFile(this.dataFilePath, JSON.stringify(this.localData, null, 2));
    } catch (err) {
      console.error('❌ 保存数据失败，降级备份到内置存储：', err);
      localStorage.setItem('app_backup', JSON.stringify(this.localData));
    }
  },

  // 迁移内置浏览器内核的localStorage数据（独立应用首次执行）
  async migrateInternalStorage() {
    if (this.localData._migrated) return;
    const browserData = {};
    // 读取内置内核的localStorage（和系统浏览器无关）
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      browserData[key] = localStorage.getItem(key);
    }
    this.localData = { ...this.localData, ...browserData, _migrated: true };
    await this.saveData();
    console.log('✅ 内置内核数据已迁移到系统目录');
  },

  // 接管localStorage操作（透明替换，原有代码无感知）
  overrideLocalStorage() {
    const self = this;
    // 重写getItem
    localStorage.getItem = function (key) {
      return self.localData[key] || '';
    };
    // 重写setItem（自动保存到系统文件）
    localStorage.setItem = function (key, value) {
      self.localData[key] = value;
      self.saveData();
    };
    // 重写removeItem
    localStorage.removeItem = function (key) {
      delete self.localData[key];
      self.saveData();
    };
    // 重写clear
    localStorage.clear = function () {
      self.localData = { _migrated: true };
      self.saveData();
    };
  },

  // 备份数据到下载目录
  async backupData() {
    const backupName = `app-data-backup-${new Date().getTime()}.json`;
    const backupPath = await PathUtils.getDownloadFilePath(backupName);
    const { fs } = window.__TAURI__.fs;
    await fs.copyFile(this.dataFilePath, backupPath);
    return backupPath;
  },

  // 从备份恢复数据
  async restoreData(backupFilePath) {
    try {
      const { fs } = window.__TAURI__.fs;
      if (await fs.exists(backupFilePath)) {
        const content = await fs.readTextFile(backupFilePath);
        this.localData = JSON.parse(content);
        await this.saveData();
        return true;
      }
      return false;
    } catch (err) {
      console.error('恢复数据失败：', err);
      return false;
    }
  }
};

// ==================== 2. 路径工具（适配Windows独立应用） ====================
const PathUtils = {
  async init() {
    try {
      const { path } = window.__TAURI__;
      this.paths = {
        appCacheDir: await path.appCacheDir(),     // 应用缓存目录
        appConfigDir: await path.appConfigDir(),   // 应用配置目录（数据文件存放处）
        appDataDir: await path.appDataDir(),       // 应用数据目录
        appLocalDataDir: await path.appLocalDataDir(), // 本地应用数据目录
        downloadDir: await path.downloadDir(),     // 下载目录（备份用）
        resourceDir: await path.resourceDir()      // 应用内置资源目录
      };
      return this.paths;
    } catch (err) {
      console.error('❌ 路径初始化失败：', err);
      return null;
    }
  },
  async join(...segments) {
    const { path } = window.__TAURI__;
    return await path.join(...segments); // 自动适配Windows路径分隔符 \
  },
  async getConfigFilePath(fileName = 'app-data.json') {
    if (!this.paths) await this.init();
    return await this.join(this.paths.appConfigDir, fileName);
  },
  async getDownloadFilePath(fileName) {
    if (!fileName) return this.paths.downloadDir;
    if (!this.paths) await this.init();
    return await this.join(this.paths.downloadDir, fileName);
  }
};

// ==================== 3. 原有链接拦截功能（保留） ====================
const hookClick = (e) => {
  const origin = e.target.closest('a');
  const isBaseTargetBlank = document.querySelector('head base[target="_blank"]');
  if ((origin && origin.href && origin.target === '_blank') || (origin && origin.href && isBaseTargetBlank)) {
    e.preventDefault();
    location.href = origin.href;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', hookClick);
});

// ==================== 4. 托盘功能（独立应用适配） ====================
if (window.__TAURI__) {
  // 应用初始化入口（确保顺序：路径→数据→托盘）
  const initApp = async () => {
    try {
      // 1. 初始化路径和数据持久化
      await PathUtils.init();
      await DataPersistence.init();

      const { TrayIcon } = window.__TAURI__.tray;
      const { Menu } = window.__TAURI__.menu;
      const { app, shell, dialog } = window.__TAURI__;

      // 2. 创建托盘菜单（适配Windows独立应用）
      const menuInstance = await Menu.new({
        items: [
          {
            id: 'show_window',
            text: '显示窗口',
            action: async () => {
              await app.show();
              await app.focus();
            }
          },
          {
            id: 'open_data_dir',
            text: '打开数据目录',
            action: async () => {
              await shell.open(PathUtils.paths.appConfigDir); // 打开数据文件所在文件夹
            }
          },
          {
            id: 'backup_data',
            text: '备份数据到下载目录',
            action: async () => {
              const backupPath = await DataPersistence.backupData();
              alert(`✅ 数据备份成功！\n文件路径：\n${backupPath}`);
            }
          },
          {
            id: 'restore_data',
            text: '从备份恢复数据',
            action: async () => {
              const filePath = await dialog.open({
                title: '选择数据备份文件',
                filters: [{ name: 'JSON文件', extensions: ['json'] }],
                defaultPath: PathUtils.paths.downloadDir // 默认打开下载目录
              });
              if (filePath) {
                const success = await DataPersistence.restoreData(filePath);
                alert(success ? '✅ 数据恢复成功！' : '❌ 数据恢复失败！');
                success && window.location.reload();
              }
            }
          },
          {
            id: 'separator_1',
            type: 'separator'
          },
          {
            id: 'hide_tray',
            text: '隐藏托盘图标',
            action: async () => {
              await trayInstance.setVisible(false);
              await menuInstance.setVisible('hide_tray', false);
              await menuInstance.setVisible('show_tray', true);
            }
          },
          {
            id: 'show_tray',
            text: '显示托盘图标',
            visible: false,
            action: async () => {
              await trayInstance.setVisible(true);
              await menuInstance.setVisible('hide_tray', true);
              await menuInstance.setVisible('show_tray', false);
            }
          },
          {
            id: 'separator_2',
            type: 'separator'
          },
          {
            id: 'quit',
            text: '退出应用',
            action: async () => {
              await DataPersistence.saveData(); // 退出前强制保存数据
              await trayInstance.close();
              await app.exit();
            }
          }
        ]
      });

      // 3. 创建托盘图标（内置Base64，无需额外文件）
      const trayInstance = await TrayIcon.new({
        id: 'app_tray',
        menu: menuInstance,
        menuOnLeftClick: false, // 左键点击切换窗口显隐
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjE8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgICAgIDx0aWZmOlBob3RvbWV0cmljPjE8L3RpZmY6UGhvdG9tZXRyaWM+CiAgICAgICAgIDx0aWZmOkNvbG9yU3BhY2U+MTwvdGlmZjpDb2xvclNwYWNlPgogICAgICAgICA8dGlmZjpDb21wcmVzc2lvbj41PC90aWZmOkNvbXByZXNzaW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8dGlmZjpDb2xvclNwYWNlPjE8L3RpZmY6Q29sb3JTcGFjZT4KICAgICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+WlBVSVY=',
        tooltip: '四艺堂管理系统' // 替换为你的应用名
      });

      // 4. 托盘左键点击：切换窗口显隐
      trayInstance.on('click', async () => {
        if (await app.isVisible()) {
          await app.hide();
        } else {
          await app.show();
          await app.focus();
        }
      });

      // 5. 拦截窗口关闭：最小化到托盘（独立应用不退出）
      window.addEventListener('beforeunload', async (e) => {
        e.preventDefault();
        await DataPersistence.saveData(); // 关闭前保存数据
        await app.hide();
        return false;
      });

      // 6. 双重保险：拦截Tauri窗口关闭事件
      app.on('window-close-requested', async (e) => {
        e.preventDefault();
        await DataPersistence.saveData();
        await app.hide();
      });

      console.log('✅ 独立应用初始化完成（Windows X64）');
    } catch (err) {
      console.error('❌ 应用初始化失败：', err);
      alert('应用初始化失败，请检查配置！');
    }
  };

  // 启动应用
  initApp();

  // 暴露全局工具（调试用，可删除）
  window.PathUtils = PathUtils;
  window.DataPersistence = DataPersistence;
} else {
  console.warn('⚠️ 未检测到Tauri环境，使用内置存储降级方案');
  // 纯浏览器环境降级（备用）
  document.addEventListener('DOMContentLoaded', () => {
    alert('当前环境非独立应用，数据将保存在浏览器中！');
  });
}