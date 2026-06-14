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
    // Get all visible windows from dumpsys
    var winR = await exec("dumpsys window windows 2>/dev/null | grep 'Window{' | head -30");
    var winLines = (winR.stdout || '').trim().split('\n').filter(Boolean);

    // Also get top activities
    var actR = await exec("dumpsys activity activities 2>/dev/null | grep -E 'ActivityRecord|Hist ' | head -20");
    var actLines = (actR.stdout || '').trim().split('\n').filter(Boolean);

    if (winLines.length === 0 && actLines.length === 0) {
      body.innerHTML = '<div class="empty"><span class="tx2">No windows detected</span></div>';
      return;
    }

    // Parse windows
    var entries = [];
    var procs = getState().procs;

    for (var i = 0; i < winLines.length; i++) {
      var line = winLines[i];
      var m = line.match(/Window\{[^}]*\s+u0\s+([^\s}]+)/);
      if (m) {
        var pkg = m[1].split('/')[0];
        var proc = findProc(procs, pkg);
        entries.push({ label: pkg, pid: proc ? proc.pid : null, name: proc ? proc.name : pkg, state: proc ? proc.state : '?', rss: proc ? proc.rssKb : 0, cpu: proc ? proc.cpuPct : 0 });
      }
    }

    // Also add activities if not already covered
    for (var j = 0; j < actLines.length; j++) {
      var aline = actLines[j];
      var am = aline.match(/u0\s+([^\s}]+)\//);
      if (am) {
        var apkg = am[1];
        if (!entries.some(function(e) { return e.label === apkg; })) {
          var aproc = findProc(procs, apkg);
          entries.push({ label: apkg, pid: aproc ? aproc.pid : null, name: aproc ? aproc.name : apkg, state: aproc ? aproc.state : '?', rss: aproc ? aproc.rssKb : 0, cpu: aproc ? aproc.cpuPct : 0 });
        }
      }
    }

    if (entries.length === 0) {
      body.innerHTML = '<div class="empty"><span class="tx2">No apps detected</span></div>';
      return;
    }

    var html = '';
    for (var k = 0; k < entries.length; k++) {
      var e = entries[k];
      html += '<div class="fw-entry" data-pid="' + (e.pid || '') + '" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--bd2);cursor:pointer;transition:background .1s">' +
        '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(e.name) + '</div>' +
        '<div style="font-size:10px;color:var(--tx3)">' + esc(e.label) + (e.pid ? ' (PID ' + e.pid + ')' : ' (not in list)') + '</div>' +
        '</div>' +
        '<span class="state-dot ' + dotClass(e.state) + '" style="margin-left:8px;flex-shrink:0"></span>' +
        '</div>';
    }
    html += '<style>.fw-entry:hover{background:var(--bg3)}</style>';
    body.innerHTML = html;

    // Click handlers
    var entries2 = body.querySelectorAll('.fw-entry');
    for (var l = 0; l < entries2.length; l++) {
      entries2[l].addEventListener('click', function() {
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
