# Ksape — Android Process Manager for KernelSU

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![KernelSU](https://img.shields.io/badge/KernelSU-WebUI-58a6ff)](https://kernelsu.org)

Ksape 是一个 KernelSU WebUI 模块，提供专业级安卓进程监控与管理功能。通过 KernelSU 的 root 权限直接读取 `/proc` 文件系统，实现深度进程信息查看和实时性能监控。

Ksape is a KernelSU WebUI module providing professional-grade Android process monitoring and management. With KernelSU root access, it reads `/proc` directly for deep process inspection and real-time performance monitoring.

---

## 功能 Features

- **进程列表 Process List** — 实时刷新，支持排序和搜索 Real-time refresh with sorting and search
- **性能仪表板 Performance Dashboard** — CPU/内存用量、负载均值、CPU 频率，含 Sparkline 趋势图 CPU/Memory usage, load average, CPU frequency with sparkline trends
- **进程详情 Process Detail** — 概览、内存(PSS/USS/RSS)、文件句柄、环境变量、线程、网络连接 Overview, Memory (PSS/USS/RSS), File Descriptors, Environment, Threads, Network
- **进程操作 Process Actions** — Kill 进程（带确认）、Renice 调整优先级 Kill (with confirmation), Renice priority adjustment
- **系统信息 System Info** — 内核版本、CPU 信息、内存详情、挂载点、dmesg、logcat Kernel, CPU info, memory details, mount points, dmesg, logcat
- **设置 Settings** — 刷新频率、内核线程过滤、系统进程过滤 Refresh interval, kernel thread filter, system process filter

## 截图 Screenshots

*(待补充 / To be added)*

## 安装 Installation

1. 在 [Releases](../../releases) 下载 `Ksape-*.zip`
2. 打开 KernelSU Manager → 模块 → 从存储安装 → 选择 ZIP
3. 安装完成后，在模块列表点击 Ksape → 打开 WebUI

---

1. Download `Ksape-*.zip` from [Releases](../../releases)
2. Open KernelSU Manager → Modules → Install from storage → Select ZIP
3. After installation, tap Ksape in the module list → Open WebUI

## 项目结构 Project Structure

```
Ksape/
├── module.prop              # KernelSU 模块元数据 Module metadata
├── action.sh                # Action 按钮脚本 Action button script
├── package.json             # npm 配置 npm config
├── scripts/
│   └── package.js           # ZIP 打包脚本 (Node.js, 正斜杠路径)
│                            # ZIP packaging (Node.js, forward-slash paths)
└── webroot/                 # WebUI 根目录 WebUI root
    ├── index.html           # 入口 Entry point
    ├── scripts/             # JavaScript 模块 (ES modules, 无 bundler)
    │   ├── app.js           # 入口：初始化、轮询、事件绑定 Entry: init, poller, event wiring
    │   ├── bridge.js        # KernelSU API 封装 (ksu.exec 回调模式) ksu.exec callback pattern
    │   ├── collector.js     # 数据采集 + 解析器 Data collection + parsers
    │   ├── store.js         # 发布/订阅状态管理 Pub/sub state management
    │   ├── table.js         # 进程列表组件 Process list component
    │   ├── detail.js        # 进程详情组件 Process detail component
    │   ├── status.js        # 底部状态栏 Bottom status bar
    │   ├── perf.js          # 性能仪表板 Performance dashboard
    │   ├── settings.js      # 设置弹窗 Settings modal
    │   ├── sysinfo.js       # 系统信息弹窗 System info modal
    │   └── utils.js         # 格式化 + DOM 工具 Formatters + DOM helpers
    └── styles/              # CSS 样式表 Stylesheets
        ├── base.css         # Reset + CSS 变量 Reset + CSS variables
        ├── layout.css       # Grid 布局 Grid layout
        └── components.css   # 所有组件样式 All component styles
```

## 架构 Architecture

- **零构建步骤 / Zero build step** — ES modules 直接加载，无需 Parcel/Webpack。ES modules loaded directly, no Parcel/Webpack needed.
- **ksu 全局对象 / ksu global** — 直接调用 `ksu.exec(command, "{}", callbackName)`，不依赖 npm 包。Direct ksu global calls, no npm dependency at runtime.
- **`/proc` 文件系统 / `/proc` filesystem** — 所有数据来源于 Linux `/proc`，跨 Android 版本兼容。All data from Linux `/proc`, compatible across Android versions.
- **发布订阅状态 / Pub/sub state** — 轻量级 `setSt()`/`sub()` 模式，UI 组件订阅状态键自动更新。Lightweight setSt()/sub() pattern, UI components subscribe to state keys for auto-update.

## 开发 Development

```bash
# 克隆仓库 Clone repo
git clone <repo-url>
cd Ksape

# 安装依赖 (仅打包需要) Install deps (packaging only)
npm install

# 打包为模块 ZIP Package as module ZIP
npm run build
# 输出 / Output: dist/Ksape-v0.1.0.zip

# 直接推送到设备测试 Push directly to device for testing
# (需 adb 连接 Need adb connected)
MSYS_NO_PATHCONV=1 adb push webroot/ /data/adb/modules/Ksape/webroot/
```

## Toybox / BusyBox 兼容性 Compatibility

KernelSU 使用 BusyBox `ash` shell 独立模式执行命令。注意以下语法差异：
KernelSU uses BusyBox `ash` shell in standalone mode. Note these syntax differences:

| GNU | BusyBox/Toybox (正确) |
|-----|----------------------|
| `head -1` | `head -n 1` |
| `tail -10` | `tail -n 10` |
| `sed -E` | `sed` (BRE only) |

## 许可 License

Apache 2.0

## 致谢 Credits

- [KernelSU](https://github.com/tiann/KernelSU) — 内核级 root 方案 Kernel-level root solution
- [systemapp_nuker](https://github.com/ChiseWaguri/systemapp_nuker) — WebUI 架构参考 WebUI architecture reference
