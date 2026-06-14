import { exec } from './bridge.js';
import { getState, setState } from './store.js';

var overlay = null, autoRefresh = false, refreshTimer = null;

export function toggle() {
  if (overlay) { close(); return; }
  open();
}

function open() {
  autoRefresh = false;
  overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal" style="max-width:520px">' +
    '<div class="modal-h" style="display:flex;align-items:center;justify-content:space-between">' +
    '<span>Find Window Process</span>' +
    '<div style="display:flex;align-items:center;gap:8px">' +
    '<span style="font-size:10px;color:var(--tx3)">Auto</span>' +
    '<label class="toggle"><input id="fw-auto" type="checkbox"><span class="slider"></span></label>' +
    '</div></div>' +
    '<div class="modal-b" id="fw-body" style="max-height:60vh;overflow-y:auto">' +
    '<div style="text-align:center;padding:24px"><div class="spin"></div></div></div>' +
    '<div class="modal-f">' +
    '<button class="btn" id="fw-refresh">Refresh</button>' +
    '<button class="btn" id="fw-close">Close</button></div></div>';

  overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  document.getElementById('fw-close').addEventListener('click', close);
  document.getElementById('fw-refresh').addEventListener('click', fetchForeground);
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
  var interval = (getState().settings && getState().settings.interval) || 3000;
  refreshTimer = setInterval(fetchForeground, interval);
}

function stopAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

async function fetchForeground() {
  var body = document.getElementById('fw-body');
  if (!body) return;

  try {
    var actR = await exec("dumpsys activity activities 2>/dev/null | grep -E 'topResumedActivity|mResumedActivity' | grep -v kernelsu | head -3");
    var actLines = (actR.stdout || '').trim().split('\n').filter(Boolean);

    if (actLines.length === 0) {
      body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--tx2);font-size:12px">No foreground app detected.<br><span style="font-size:10px;color:var(--tx3)">Switch to another app, then come back to see it here.</span></div>';
      return;
    }

    var procs = getState().procs;
    var topPkg = null;

    for (var i = 0; i < actLines.length; i++) {
      var m = actLines[i].trim().match(/u0\s+([^\s\/}]+)/);
      if (m && m[1] !== 'me.weishu.kernelsu') { topPkg = m[1]; break; }
    }

    if (!topPkg) {
      body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--tx2);font-size:12px">Ksape is in the foreground.<br><span style="font-size:10px;color:var(--tx3)">Switch to a different app to detect it.</span></div>';
      return;
    }

    var proc = findProc(procs, topPkg);
    var cores = getState().cpuCores || 4;

    var html = '<div style="padding:12px;background:var(--bg3);border-radius:var(--r);border:1px solid var(--ac2);margin-bottom:8px">' +
      '<div style="font-size:10px;color:var(--ac);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Detected Foreground App</div>' +
      '<div style="font-size:14px;font-weight:600;margin-bottom:3px">' + esc(proc ? proc.name : topPkg) + '</div>' +
      '<div style="font-size:11px;color:var(--tx2);margin-bottom:10px">' + esc(topPkg) + (proc ? '  &middot;  PID ' + proc.pid : '') + '</div>';

    if (proc) {
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">' +
        '<div class="perf-card"><div class="pc-h">State</div><div class="pc-v" style="font-size:14px"><span class="state-dot ' + dotClass(proc.state) + '"></span> ' + stateLabel(proc.state) + '</div></div>' +
        '<div class="perf-card"><div class="pc-h">CPU</div><div class="pc-v" style="font-size:14px">' + (proc.cpuPct / cores).toFixed(1) + '%</div></div>' +
        '<div class="perf-card"><div class="pc-h">RSS</div><div class="pc-v" style="font-size:14px">' + formatBytes((proc.rssKb || 0) * 1024) + '</div></div>' +
        '<div class="perf-card"><div class="pc-h">User</div><div class="pc-v" style="font-size:14px">' + esc(proc.user) + '</div></div>' +
        '</div>';
      html += '<button class="btn btn-primary" style="width:100%" id="fw-select-top">Select This Process</button>';
    } else {
      html += '<div style="font-size:11px;color:var(--tx3);margin-bottom:8px">Process not found in current process list.</div>';
    }
    html += '</div>';
    html += '<div style="font-size:10px;color:var(--tx3);text-align:center">' + (autoRefresh ? 'Auto-refreshing every ' + ((getState().settings.interval || 3000) / 1000) + 's' : 'Tap Refresh to update') + '</div>';

    body.innerHTML = html;

    var topBtn = document.getElementById('fw-select-top');
    if (topBtn) topBtn.addEventListener('click', function() {
      if (proc && proc.pid) { setState({ selPid: proc.pid }); close(); }
    });
  } catch (e) {
    body.innerHTML = '<div class="empty"><span class="txd">Error: ' + String(e) + '</span></div>';
  }
}

function findProc(procs, pkg) {
  for (var i = 0; i < procs.length; i++) {
    if (procs[i].name && procs[i].name.indexOf(pkg) >= 0) return procs[i];
  }
  var short = pkg.split('.').pop();
  for (var j = 0; j < procs.length; j++) {
    if (procs[j].name && procs[j].name.indexOf(short) >= 0) return procs[j];
  }
  return null;
}

function esc(s)          { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function dotClass(c)     { var m = { R: 'R', S: 'S', D: 'S', I: 'S', T: 'T', t: 'T', Z: 'Z' }; return m[c] || 'S'; }
function stateLabel(c)   { var m = { R: 'Running', S: 'Sleeping', D: 'Unint', T: 'Stopped', Z: 'Zombie', I: 'Idle' }; return m[c] || c || '?'; }
function formatBytes(b)  { if (b == null || isNaN(b)) return '--'; var a = Math.abs(b); if (a >= 1073741824) return (b / 1073741824).toFixed(1) + 'GB'; if (a >= 1048576) return (b / 1048576).toFixed(1) + 'MB'; if (a >= 1024) return (b / 1024).toFixed(0) + 'KB'; return b + 'B'; }
