import { exec } from './bridge.js';
import { getState, setState } from './store.js';

var overlay = null, autoRefresh = false, refreshTimer = null;

export function toggle() {
  if (overlay) { close(); return; }
  open();
}

function open() {
  overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal" style="max-width:480px">' +
    '<div class="modal-h" style="display:flex;align-items:center;justify-content:space-between">' +
    '<span>Find Window Process</span>' +
    '<label class="toggle" style="flex-shrink:0" title="Auto-refresh"><input id="fw-auto" type="checkbox"' + (autoRefresh ? ' checked' : '') + '><span class="slider"></span></label>' +
    '</div>' +
    '<div class="modal-b" id="fw-body"><div style="text-align:center;padding:24px"><div class="spin"></div></div></div>' +
    '<div class="modal-f">' +
    '<button class="btn" id="fw-refresh">Refresh</button>' +
    '<button class="btn btn-primary" id="fw-select">Select This Process</button>' +
    '<button class="btn" id="fw-close">Close</button></div></div>';

  overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);

  document.getElementById('fw-close').addEventListener('click', close);
  document.getElementById('fw-refresh').addEventListener('click', fetchForeground);
  document.getElementById('fw-select').addEventListener('click', selectForeground);
  document.getElementById('fw-auto').addEventListener('change', function() {
    autoRefresh = this.checked;
    if (autoRefresh) startAutoRefresh(); else stopAutoRefresh();
  });

  fetchForeground();
}

function close() {
  stopAutoRefresh();
  if (overlay) { overlay.remove(); overlay = null; }
}

function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(fetchForeground, 2000);
}

function stopAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

async function fetchForeground() {
  var body = document.getElementById('fw-body');
  if (!body) return;

  try {
    // Get top activity package name
    var topR = await exec("dumpsys activity activities 2>/dev/null | grep -E 'topResumedActivity' | head -1");
    var topLine = (topR.stdout || '').trim();
    var pkgMatch = topLine.match(/u0\s+([^/]+)\//);
    var pkgName = pkgMatch ? pkgMatch[1] : null;

    // Fallback: try window focus
    if (!pkgName) {
      var winR = await exec("dumpsys window 2>/dev/null | grep 'mCurrentFocus' | head -1");
      var winLine = (winR.stdout || '').trim();
      var winMatch = winLine.match(/u0\s+([^/}]+)/);
      pkgName = winMatch ? winMatch[1].trim() : null;
    }

    if (!pkgName) {
      body.innerHTML = '<div class="empty"><span class="tx2">No foreground app detected</span></div>';
      return;
    }

    // Find PID from process list
    var procs = getState().procs;
    var found = null;
    for (var i = 0; i < procs.length; i++) {
      if (procs[i].name && procs[i].name.indexOf(pkgName) >= 0) { found = procs[i]; break; }
    }

    // Also try matching by package name prefix
    if (!found) {
      var shortName = pkgName.split('.').pop();
      for (var j = 0; j < procs.length; j++) {
        if (procs[j].name && procs[j].name.indexOf(shortName) >= 0) { found = procs[j]; break; }
      }
    }

    if (found) {
      body.innerHTML =
        '<div class="perf-card" style="margin-bottom:12px">' +
        '<div class="pc-h"><span>Foreground App</span><span class="tmono">PID ' + found.pid + '</span></div>' +
        '<div class="pc-v">' + esc(found.name) + '</div>' +
        '<div class="txs tx2">Package: ' + esc(pkgName) + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
        '<div class="perf-card"><div class="pc-h">State</div><div class="pc-v"><span class="state-dot ' + dotClass(found.state) + '"></span> ' + stateLabel(found.state) + '</div></div>' +
        '<div class="perf-card"><div class="pc-h">CPU</div><div class="pc-v">' + normalizeCpu(found.cpuPct) + '%</div></div>' +
        '<div class="perf-card"><div class="pc-h">RSS</div><div class="pc-v">' + formatBytes((found.rssKb || 0) * 1024) + '</div></div>' +
        '<div class="perf-card"><div class="pc-h">User</div><div class="pc-v">' + esc(found.user) + '</div></div>' +
        '</div>';
      body._foundPid = found.pid;
    } else {
      body.innerHTML = '<div class="empty"><span class="tx2">Package <b>' + esc(pkgName) + '</b> not found in process list</span></div>';
      body._foundPid = null;
    }
  } catch (e) {
    body.innerHTML = '<div class="empty"><span class="txd">Error: ' + String(e) + '</span></div>';
    body._foundPid = null;
  }
}

function selectForeground() {
  var body = document.getElementById('fw-body');
  var pid = body && body._foundPid;
  if (pid) {
    setState({ selPid: pid });
    close();
  }
}

function esc(s)  { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function dotClass(c) { var m = { R: 'R', S: 'S', D: 'S', I: 'S', T: 'T', t: 'T', Z: 'Z' }; return m[c] || 'S'; }
function stateLabel(c) { var m = { R: 'Running', S: 'Sleeping', D: 'Unint', T: 'Stopped', Z: 'Zombie', I: 'Idle' }; return m[c] || c || '?'; }
function formatBytes(b) { if (b == null || isNaN(b)) return '--'; var a = Math.abs(b); if (a >= 1073741824) return (b / 1073741824).toFixed(1) + 'GB'; if (a >= 1048576) return (b / 1048576).toFixed(1) + 'MB'; if (a >= 1024) return (b / 1024).toFixed(0) + 'KB'; return b + 'B'; }
function normalizeCpu(val) { var cores = (typeof getState === 'function' ? getState() : {}).cpuCores || 4; var pct = (val || 0) / cores; return Math.min(pct, 100).toFixed(1); }
