import { getSt } from './store.js';

export function toggle() {
  var S = getSt(), iv = S.settings.interval / 1000;
  var ov = document.createElement('div'); ov.className = 'modal-overlay';
  ov.innerHTML = '<div class="modal"><div class="modal-h">Settings</div><div class="modal-b">' +
    '<div class="setting-row"><label>Refresh (s)</label><input id="st-ref" type="range" min="1" max="30" value="' + iv + '" style="width:120px"><span id="st-rv" style="width:32px">' + iv + 's</span></div>' +
    '<div class="setting-row"><label>Show kernel threads</label><label class="toggle"><input id="st-k" type="checkbox"' + (S.settings.showKernel ? ' checked' : '') + '><span class="slider"></span></label></div>' +
    '<div class="setting-row"><label>Show system processes</label><label class="toggle"><input id="st-s" type="checkbox"' + (S.settings.showSystem ? ' checked' : '') + '><span class="slider"></span></label></div>' +
    '</div><div class="modal-f"><button class="btn" id="st-cancel">Cancel</button><button class="btn btn-primary" id="st-save">Save</button></div></div>';
  ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov);
  document.getElementById('st-ref').addEventListener('input', function() { document.getElementById('st-rv').textContent = this.value + 's'; });
  document.getElementById('st-cancel').addEventListener('click', function() { ov.remove(); });
  document.getElementById('st-save').addEventListener('click', function() {
    S.settings.interval = parseInt(document.getElementById('st-ref').value, 10) * 1000;
    S.settings.showKernel = document.getElementById('st-k').checked;
    S.settings.showSystem = document.getElementById('st-s').checked;
    try { localStorage.setItem('ksape_st', JSON.stringify(S.settings)); } catch(e) {}
    ov.remove();
    // Restart poller with new interval
    window._ksRestartPoller(S.settings.interval);
  });
}
