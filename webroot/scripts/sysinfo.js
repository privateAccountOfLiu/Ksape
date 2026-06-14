import { collectSysInfo } from './collector.js';

export function toggle() {
  var overlay = document.createElement('div'); overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal" style="max-width:520px"><div class="modal-h">System Info</div>' +
    '<div class="modal-b" id="si-body"><div style="text-align:center;padding:24px"><div class="spin"></div></div></div>' +
    '<div class="modal-f"><button class="btn" id="si-close">Close</button></div></div>';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  document.getElementById('si-close').addEventListener('click', function() { overlay.remove(); });

  collectSysInfo().then(function(raw) {
    var sysInfo = raw.split('SYS:')[1] || '';
    var parts = sysInfo.split(/MEM:|STO:|LOG:/);
    document.getElementById('si-body').innerHTML =
      '<details class="sec" open><summary>System</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;margin:0">' + esc(parts[0]) + '</pre></div></details>' +
      '<details class="sec"><summary>Memory</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;max-height:200px;overflow-y:auto;margin:0">' + esc(parts[1]) + '</pre></div></details>' +
      '<details class="sec"><summary>Storage</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;max-height:200px;overflow-y:auto;margin:0">' + esc(parts[2]) + '</pre></div></details>' +
      '<details class="sec"><summary>Kernel Log</summary><div class="sb"><pre style="font-size:10px;font-family:var(--mono);white-space:pre-wrap;max-height:160px;overflow-y:auto;margin:0">' + esc(parts[3]) + '</pre></div></details>';
  }).catch(function(e) {
    document.getElementById('si-body').innerHTML = '<span class="txd">Error: ' + String(e) + '</span>';
  });
}

function esc(s) { return String(s || 'N/A').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
