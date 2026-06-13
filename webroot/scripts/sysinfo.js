import { collectSysInfo } from './collector.js';

export function toggle() {
  var ov = document.createElement('div'); ov.className = 'modal-overlay';
  ov.innerHTML = '<div class="modal" style="max-width:520px"><div class="modal-h">System Info</div>' +
    '<div class="modal-b" id="si-body"><div style="text-align:center;padding:24px"><div class="spin"></div></div></div>' +
    '<div class="modal-f"><button class="btn" id="si-close">Close</button></div></div>';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  document.getElementById('si-close').addEventListener('click', function() { ov.remove(); });

  collectSysInfo().then(function(t) {
    var p = t.split('SYS:');
    var sysInfo = p[1] || '';
    var parts = sysInfo.split(/MEM:|STO:|LOG:/);
    document.getElementById('si-body').innerHTML =
      '<details class="sec" open><summary>System</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;margin:0">' + (parts[0] || 'N/A').trim() + '</pre></div></details>' +
      '<details class="sec"><summary>Memory</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;max-height:200px;overflow-y:auto;margin:0">' + (parts[1] || 'N/A').trim() + '</pre></div></details>' +
      '<details class="sec"><summary>Storage</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;max-height:200px;overflow-y:auto;margin:0">' + (parts[2] || 'N/A').trim() + '</pre></div></details>' +
      '<details class="sec"><summary>Kernel Log</summary><div class="sb"><pre style="font-size:10px;font-family:var(--mono);white-space:pre-wrap;max-height:160px;overflow-y:auto;margin:0">' + (parts[3] || 'N/A').trim() + '</pre></div></details>';
  }).catch(function(e) {
    document.getElementById('si-body').innerHTML = '<span class="txd">Error: ' + String(e) + '</span>';
  });
}
