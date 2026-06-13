# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ksape is a KernelSU WebUI module — an Android process manager running inside KernelSU Manager's WebView with root access via the `kernelsu` JavaScript bridge.

## Build & Package

```bash
npm run build    # Parcel build → webroot/ + ZIP → dist/
```

Output: `dist/Ksape-v0.1.0.zip` — flashable via KernelSU Manager.

## Architecture

```
src/
├── index.html              # Entry HTML (Parcel processes this)
├── css/                    # Stylesheets linked from index.html
└── js/
    ├── app.js              # Entry: init, poller, perf dash, event wiring
    ├── core/
    │   ├── bridge.js       # kernelsu npm API wrapper (ksu global detection)
    │   ├── commands.js     # Shell command factory (ALL commands originate here)
    │   ├── collector.js    # Orchestrates data collection
    │   └── parser.js       # Parse shell stdout → structured objects
    ├── state/
    │   ├── store.js        # Pub/sub state: setState() / subscribe(key, fn)
    │   ├── cache.js        # localStorage wrapper with TTL
    │   └── poller.js       # Adaptive polling with visibility awareness
    └── ui/
        ├── processList.js      # Left panel: process table
        ├── processDetail.js    # Right panel: detail with collapsible sections
        ├── statusBar.js        # Bottom bar: CPU/MEM/Load/Procs
        ├── settingsPanel.js    # Settings modal
        ├── sysInfoPanel.js     # System info modal (kernel, dmesg, logcat)
        ├── confirmDialog.js    # Reusable confirmation modal
        ├── searchBar.js        # Search/filter input
        ├── toolbar.js          # Top toolbar (unused — see note)
        └── dom.js              # DOM helpers: h(), $(), delegate(), svgIcon()
```

**Data flow:** `Poller → Collector → Bridge.exec() → Root Shell → /proc` → `Parser → Store.setState() → UI re-renders`

## Critical Rules

### Building

1. **Always use Parcel with `--no-scope-hoist`** to prevent tree-shaking from removing UI module code that's only referenced via DOM event listeners or global assignments.
2. **ZIP packaging MUST use forward slashes** (`/` not `\`). PowerShell `Compress-Archive` produces backslash paths that break on Android. Use `scripts/package.js` (Node.js) which writes correct Unix paths.

### Shell Commands (Toybox Compatibility)

KernelSU uses BusyBox in "standalone mode" — all shell commands run through BusyBox, NOT Android's `/system/bin`. This means:

| ✅ BusyBox/Toybox | ❌ GNU-only (will fail silently) |
|---|---|
| `head -n 1` | `head -1` |
| `tail -n 10` | `tail -10` |
| `grep -E` | `grep -P` |
| `awk` (BusyBox) | `mawk` extensions |

**Always test commands in BusyBox ash.**

### JavaScript Bridge

```javascript
import { exec } from 'kernelsu';

// exec() runs commands as root via KernelSU's BusyBox ash shell
const { errno, stdout } = await exec("cat /proc/meminfo");

// ksu global is injected by KernelSU WebView before page load
// The npm package wraps window.ksu.exec() with a callback pattern
```

### State Management

- `setState({ key: value })` merges into global state, notifies `subscribe(key, fn)` handlers
- Always use consistent keys: `mem` (not `memInfo`), `load` (not `loadAvg`)
- When adding numeric displays, use `safeToFixed(val, n)` which handles NaN/undefined

### Data Collection

- Process list: `awk 'FNR==1{...}' /proc/[0-9]*/stat` — single invocation, reads all processes
- CPU: `head -n 1 /proc/stat` — compare two samples to calculate %
- Memory: `cat /proc/meminfo` — parse key-value pairs
- All commands in `commands.js` as factory functions — never concatenate user input into shell commands

### Known Pitfalls

1. **Parcel tree-shaking**: UI modules imported only through `addEventListener('click', ...)` or `document.getElementById()` will be removed. Use `--no-scope-hoist` AND assign imports to `window.__KSAPE = {...}` global object.
2. **`.toFixed()` crashes**: Always wrap with `safeToFixed(val, n)` — values from `/proc` can be NaN or undefined.
3. **Memory shows 100%**: When `/proc/meminfo` read fails, `MemTotal` defaults to 1. Use `(mem && mem.MemTotal) ? mem.MemTotal : 0` NOT `(mem || {}).MemTotal || 1`.
4. **ZIP backslash paths**: Never use PowerShell `Compress-Archive`. Always use `scripts/package.js`.
5. **action.sh**: Runs in BusyBox ash standalone mode. Use `#!/system/bin/sh` shebang. Don't use `sleep` unless necessary.

### Module Structure (KernelSU Standard)

```
Ksape-v0.1.0.zip
├── module.prop         # id=Ksape, name=Ksape, version=v0.1.0, versionCode=1
├── action.sh           # (optional) Executed when user clicks "Action" in Manager
└── webroot/
    └── index.html      # Entry point (plus bundled .js, .css, .map files)
```

- `module.prop` `id` must match `^[a-zA-Z][a-zA-Z0-9._-]+$`
- `module.prop` MUST use Unix (LF) line endings
- KernelSU Manager auto-sets permissions and SELinux context for `webroot/`
- CSS and JS go inside `webroot/` alongside `index.html`
