# Ksape — KernelSU 安卓进程管理器

[![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)
[![KernelSU](https://img.shields.io/badge/KernelSU-WebUI-58a6ff)](https://kernelsu.org)

Ksape 是一个 KernelSU WebUI 模块，提供专业级安卓进程监控与管理功能。通过 KernelSU 的 root 权限直接读取 `/proc` 文件系统，实现深度进程信息查看和实时性能监控。

## 功能

- **进程列表** — 实时刷新，支持按 PID、名称、内存排序和搜索过滤
- **性能仪表板** — CPU/内存用量、负载均值、CPU 频率，含 Sparkline 趋势图
- **进程详情** — 概览、内存(PSS/USS/RSS)、文件句柄、环境变量、线程、网络连接
- **进程操作** — Kill 进程（带确认对话框）、Renice 调整优先级
- **系统信息** — 内核版本、CPU 信息、内存详情、挂载点、dmesg、logcat
- **设置** — 刷新频率调节、内核线程过滤、系统进程过滤

## 截图

*(待补充)*

## 安装

1. 在 [Releases](../../releases) 下载 `Ksape-*.zip`
2. 打开 KernelSU Manager → 模块 → 从存储安装 → 选择 ZIP
3. 安装完成后，在模块列表点击 Ksape → 打开 WebUI

## 项目结构

```
Ksape/
├── module.prop              # KernelSU 模块元数据
├── action.sh                # Action 按钮脚本
├── package.json             # npm 配置
├── scripts/
│   └── package.js           # ZIP 打包脚本 (Node.js, 正斜杠路径)
└── webroot/                 # WebUI 根目录
    ├── index.html           # 入口 (ES modules 直接加载)
    ├── scripts/
    │   ├── app.js           # 入口：初始化、轮询、事件绑定
    │   ├── bridge.js        # KernelSU API 封装 (ksu.exec 回调模式)
    │   ├── collector.js     # 数据采集 + 解析器
    │   ├── store.js         # 发布/订阅状态管理
    │   ├── table.js         # 进程列表组件
    │   ├── detail.js        # 进程详情组件
    │   ├── status.js        # 底部状态栏
    │   ├── perf.js          # 性能仪表板
    │   ├── settings.js      # 设置弹窗
    │   ├── sysinfo.js       # 系统信息弹窗
    │   └── utils.js         # 格式化 + DOM 工具
    └── styles/
        ├── base.css         # Reset + CSS 变量
        ├── layout.css       # Grid 布局
        └── components.css   # 组件样式
```

## 架构

- **零构建步骤** — ES modules 直接通过 `<script type="module">` 加载，无需 Parcel/Webpack
- **ksu 全局对象** — 直接调用 `ksu.exec(command, "{}", callbackName)`，不依赖 npm 包
- **`/proc` 文件系统** — 所有数据来源于 Linux `/proc`，跨 Android 版本兼容
- **发布/订阅状态** — 轻量级 `setSt()`/`sub()` 模式，UI 组件订阅状态键自动重渲染

## 开发

```bash
git clone <repo-url>
cd Ksape
npm install                 # 仅打包需要
npm run build               # 输出 dist/Ksape-v0.1.0.zip

# 直接推送到设备测试
MSYS_NO_PATHCONV=1 adb push webroot/ /data/adb/modules/Ksape/webroot/
```

## Toybox / BusyBox 兼容性

KernelSU 使用 BusyBox `ash` shell 独立模式执行命令。注意以下语法：

| GNU | BusyBox/Toybox |
|-----|---------------|
| `head -1` | `head -n 1` |
| `tail -10` | `tail -n 10` |
| `sed -E` | `sed` (仅 BRE) |

## 致谢

- [KernelSU](https://github.com/tiann/KernelSU) — 内核级 root 方案
- [systemapp_nuker](https://github.com/ChiseWaguri/systemapp_nuker) — WebUI 架构参考

## 许可

Apache 2.0

---

# Ksape — Android Process Manager for KernelSU

Ksape is a KernelSU WebUI module providing professional-grade Android process monitoring and management. Leveraging KernelSU's root access, it reads `/proc` directly for deep process inspection and real-time performance monitoring.

## Features

- **Process List** — Real-time refresh with sorting by PID, name, memory and search/filter
- **Performance Dashboard** — CPU/Memory usage, load average, CPU frequency with sparkline trend charts
- **Process Detail** — Overview, Memory (PSS/USS/RSS), File Descriptors, Environment, Threads, Network
- **Process Actions** — Kill (with confirmation dialog), Renice priority adjustment
- **System Info** — Kernel version, CPU info, memory details, mount points, dmesg, logcat
- **Settings** — Refresh interval, kernel thread filter, system process filter

## Screenshots

*(To be added)*

## Installation

1. Download `Ksape-*.zip` from [Releases](../../releases)
2. Open KernelSU Manager → Modules → Install from storage → Select ZIP
3. After installation, tap Ksape in the module list → Open WebUI

## Project Structure

```
Ksape/
├── module.prop              # KernelSU module metadata
├── action.sh                # Action button script
├── package.json             # npm configuration
├── scripts/
│   └── package.js           # ZIP packaging script (Node.js, forward-slash paths)
└── webroot/                 # WebUI root directory
    ├── index.html           # Entry point (ES modules, loaded directly)
    ├── scripts/
    │   ├── app.js           # Entry: init, poller, event wiring
    │   ├── bridge.js        # KernelSU API wrapper (ksu.exec callback pattern)
    │   ├── collector.js     # Data collection + parsers
    │   ├── store.js         # Pub/sub state management
    │   ├── table.js         # Process list component
    │   ├── detail.js        # Process detail component
    │   ├── status.js        # Bottom status bar
    │   ├── perf.js          # Performance dashboard
    │   ├── settings.js      # Settings modal
    │   ├── sysinfo.js       # System info modal
    │   └── utils.js         # Formatters + DOM helpers
    └── styles/
        ├── base.css         # Reset + CSS variables
        ├── layout.css       # Grid layout
        └── components.css   # Component styles
```

## Architecture

- **Zero build step** — ES modules loaded directly via `<script type="module">`, no Parcel/Webpack needed
- **ksu global object** — Direct `ksu.exec(command, "{}", callbackName)` calls, no npm dependency at runtime
- **`/proc` filesystem** — All data sourced from Linux `/proc`, compatible across Android versions
- **Pub/sub state** — Lightweight `setSt()`/`sub()` pattern, UI components subscribe to state keys for auto re-render

## Development

```bash
git clone <repo-url>
cd Ksape
npm install                 # For packaging only
npm run build               # Output: dist/Ksape-v0.1.0.zip

# Push directly to device for testing
MSYS_NO_PATHCONV=1 adb push webroot/ /data/adb/modules/Ksape/webroot/
```

## Toybox / BusyBox Compatibility

KernelSU executes commands in BusyBox `ash` shell standalone mode. Note these syntax differences:

| GNU | BusyBox/Toybox |
|-----|---------------|
| `head -1` | `head -n 1` |
| `tail -10` | `tail -n 10` |
| `sed -E` | `sed` (BRE only) |

## Credits

- [KernelSU](https://github.com/tiann/KernelSU) — Kernel-level root solution
- [systemapp_nuker](https://github.com/ChiseWaguri/systemapp_nuker) — WebUI architecture reference

## License

Apache 2.0
