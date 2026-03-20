window.addEventListener("DOMContentLoaded",()=>{const t=document.createElement("script");t.src="https://www.googletagmanager.com/gtag/js?id=G-W5GKHM0893",t.async=!0,document.head.appendChild(t);const n=document.createElement("script");n.textContent="window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-W5GKHM0893');",document.body.appendChild(n)});// very important, if you don't know what it is, don't touch it
// 非常重要, 不懂代码不要动, 这里可以解决80%的问题,也可以生产1000+的bug
const hookClick = (e) => {
  const origin = e.target.closest('a')
  const isBaseTargetBlank = document
    .querySelector('head base[target="_blank"]')
  console.log('origin', origin, isBaseTargetBlank)
  if (
    (origin && origin.href && origin.target == '_blank') ||
    (origin && origin.href && isBaseTargetBlank)
  ) {
    e.preventDefault()
    console.log('handle origin', origin)
    location.href = origin.href
  } else {
    console.log('not handle origin', origin)
  }
}

// --- 以下为新增的托盘功能代码 ---
// 确保在Tauri环境加载完毕后执行
if (window.__TAURI__) {
  // 从Tauri API导入所需模块
  const { TrayIcon } = window.__TAURI__.tray;
  const { Menu } = window.__TAURI__.menu;

  // 异步函数，用于创建托盘
  async function createAppTray() {
    try {
      // 创建菜单项
      const menu = await Menu.new({
        items: [
          {
            id: 'quit',
            text: '退出程序', // 您可以自定义菜单文本
            action: async () => {
              // 这里是点击“退出程序”菜单后执行的操作
              // 参考内容中未提供具体的退出命令，此处仅打印日志
              console.log('退出菜单被点击，需要执行退出命令');
              // 您可能需要调用 Tauri 的 app.exit() 或类似API来彻底退出程序
              // 例如: await window.__TAURI__.process.exit(0);
            },
          },
        ],
      });

      // 创建托盘图标
      const tray = await TrayIcon.new({
        id: 'pakeplus', // 使用您的软件标识
        menu: menu,
        menuOnLeftClick: true, // 左键点击托盘图标时显示菜单
        icon: 'icons/icon.png', // 托盘图标路径，请确保您的项目中有此图标文件
        tooltip: 'PakePlus 应用', // 鼠标悬停在托盘图标上时显示的提示文本
      });

      console.log('托盘创建成功');
    } catch (error) {
      console.error('创建托盘时出错:', error);
    }
  }

  // 调用函数创建托盘
  createAppTray();
} else {
  console.log('未检测到Tauri环境，跳过托盘创建。');
}
