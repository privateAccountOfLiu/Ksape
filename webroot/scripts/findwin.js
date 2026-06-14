import { exec } from './bridge.js';
import { getState, setState } from './store.js';

var overlay = null;

export function toggle() {
  if (overlay) { close(); return; }
  open();
}

function open() {
  overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal" style="max-width:520px">' +
    '<div class="modal-h">Find Window Process</div>' +
    '<div class="modal-b" id="fw-body" style="max-height:60vh;overflow-y:auto">' +
    '<div style="text-align:center;padding:24px"><div class="spin"></div></div></div>' +
    '<div class="modal-f">' +
    '<button class="btn" id="fw-refresh">Refresh</button>' +
    '<button class="btn" id="fw-close">Close</button></div></div>';

  overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
  document.body.appendChild(overlay);
  document.getElementById('fw-close').addEventListener('click', close);
  document.getElementById('fw-refresh').addEventListener('click', fetchWindows);
  fetchWindows();
}

function close() {
  if (overlay) { overlay.remove(); overlay = null; }
}

async function fetchWindows() {
  var body = document.getElementById('fw-body');
  if (!body) return;

  try {
    // Get the top resumed activity (foreground app, excluding Ksape itself)
    var actR = await exec("dumpsys activity activities 2>/dev/null | grep -E 'topResumedActivity|mResumedActivity|mFocusedActivity' | grep -v kernelsu | head -5");
    var actLines = (actR.stdout || '').trim().split('\n').filter(Boolean);

    if (actLines.length === 0) {
      body.innerHTML = '<div class="empty"><span class="tx2">No foreground app detected.<br>Switch to another app first, then come back and tap Find Window.</span></div>';
      return;
    }

    var procs = getState().procs;
    var entries = [];

    for (var i = 0; i < actLines.length; i++) {
      var line = actLines[i].trim();
      // Extract package name: u0 com.example.app/...
      var m = line.match(/u0\s+([^\s\/}]+)/);
      if (m && m[1] !== 'me.weishu.kernelsu') {
        var pkg = m[1];
        var proc = findProc(procs, pkg);
        // Avoid duplicates
        if (!entries.some(function(e) { return e.label === pkg; })) {
          entries.push({ pkg: pkg, pid: proc ? proc.pid : null, name: proc ? proc.name : pkg, state: proc ? proc.state : '?', rss: proc ? proc.rssKb : 0, cpu: proc ? proc.cpuPct : 0 });
        }
      }
    }

    if (entries.length === 0) {
      body.innerHTML = '<div class="empty"><span class="tx2">Foreground app is Ksape itself.<br>Switch to a different app, then switch back and tap Find Window.</span></div>';
      return;
    }

    // Show the top match with details
    var top = entries[0];
    var html = '<div style="margin-bottom:12px;padding:12px;background:var(--bg3);border-radius:var(--r);border:1px solid var(--ac2)">' +
      '<div style="font-size:10px;color:var(--ac);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Detected Foreground App</div>' +
      '<div style="font-size:14px;font-weight:600;margin-bottom:4px">' + esc(top.name) + '</div>' +
      '<div style="font-size:11px;color:var(--tx2);margin-bottom:8px">' + esc(top.pkg) + (top.pid ? ' &middot; PID ' + top.pid : '') + '</div>';

    if (top.pid) {
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">' +
        '<div class="perf-card"><div class="pc-h">State</div><div class="pc-v" style="font-size:14px"><span class="state-dot ' + dotClass(top.state) + '"></span></div></div>' +
        '<div class="perf-card"><div class="pc-h">CPU</div><div class="pc-v" style="font-size:14px">' + (top.cpu / (getState().cpuCores || 4)).toFixed(1) + '%</div></div>' +
        '<div class="perf-card"><div class="pc-h">RSS</div><div class="pc-v" style="font-size:14px">' + formatBytes((top.rss || 0) * 1024) + '</div></div>' +
        '</div>';
      html += '<button class="btn btn-primary" style="width:100%" id="fw-select-top">Select This Process</button>';
    } else {
      html += '<span class="tx2 txsm">Process not found in current list — it may be a short-lived process or already terminated.</span>';
    }
    html += '</div>';

    // Also show other entries if any
    if (entries.length > 1) {
      html += '<div style="font-size:11px;color:var(--tx3);margin:12px 0 4px">Other detected activities:</div>';
      for (var j = 1; j < entries.length; j++) {
        var e = entries[j];
        html += '<div class="fw-entry" data-pid="' + (e.pid || '') + '" style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid var(--bd2);cursor:pointer">' +
          '<div style="flex:1;min-width:0;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(e.name) + '</div>' +
          '<span class="state-dot ' + dotClass(e.state) + '" style="margin-left:8px;flex-shrink:0"></span></div>';
      }
    }

    body.innerHTML = html + '<style>.fw-entry:hover{background:var(--bg3)}</style>';

    // Click handler for top entry
    var topBtn = document.getElementById('fw-select-top');
    if (topBtn) topBtn.addEventListener('click', function() {
      if (top.pid) { setState({ selPid: top.pid }); close(); }
    });

    // Click handlers for other entries
    var entries2 = body.querySelectorAll('.fw-entry');
    for (var k = 0; k < entries2.length; k++) {
      entries2[k].addEventListener('click', function() {
        var pid = parseInt(this.getAttribute('data-pid'), 10);
        if (pid) { setState({ selPid: pid }); close(); }
      });
    }
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

function esc(s)  { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function dotClass(c) { var m = { R: 'R', S: 'S', D: 'S', I: 'S', T: 'T', t: 'T', Z: 'Z' }; return m[c] || 'S'; }
function formatBytes(b) { if (b == null || isNaN(b)) return '--'; var a = Math.abs(b); if (a >= 1073741824) return (b / 1073741824).toFixed(1) + 'GB'; if (a >= 1048576) return (b / 1048576).toFixed(1) + 'MB'; if (a >= 1024) return (b / 1024).toFixed(0) + 'KB'; return b + 'B'; }
