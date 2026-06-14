import { getSt, setSt, sub } from './store.js';
import { collectOverview, collectFreq, collectCores } from './collector.js';
import { render as renderTable } from './table.js';
import { init as initDetail } from './detail.js';
import { update as updateStatus } from './status.js';
import { update as updatePerf } from './perf.js';
import { toggle as toggleSettings } from './settings.js';
import { toggle as toggleSysInfo } from './sysinfo.js';

// Poller
var prevCpu = null, timer = null, polling = false, paused = false;

function startPoll(ms) {
  stopPoll();
  function tick() {
    if (paused || polling) { timer = setTimeout(tick, ms || 3000); return; }
    polling = true;
    collectOverview().then(function(d) {
      polling = false; if (!d) return;
      var cpuPct = 0;
      if (d.cpuStat) {
        if (prevCpu) { var uDiff = d.cpuStat.used - prevCpu.used, tDiff = d.cpuStat.total - prevCpu.total; cpuPct = tDiff > 0 ? Math.max(0, Math.min(100, (uDiff / tDiff) * 100)) : 0; }
        prevCpu = d.cpuStat;
      }
      setSt({ procs: d.procs, cpuStat: d.cpuStat, cpuPct: cpuPct, mem: d.mem, load: d.load, uptime: d.uptime });
    }).catch(function() { polling = false; });
    timer = setTimeout(tick, ms || 3000);
  }
  timer = setTimeout(tick, 600);
}

function stopPoll() { if (timer) clearTimeout(timer); timer = null; }
function forceRefresh() { collectOverview().then(function(d) { if (!d) return; setSt(d); }).catch(function() {}); }
document.addEventListener('visibilitychange', function() { paused = document.hidden; if (!document.hidden) forceRefresh(); });

// Init
function init() {
  // Load settings
  try { var saved = localStorage.getItem('ksape_st'); if (saved) { var s = JSON.parse(saved); var S = getSt(); S.settings.interval = s.interval || 3000; S.settings.showKernel = s.showKernel || false; S.settings.showSystem = s.showSystem !== false; } } catch(e) {}

  // Event wiring
  document.getElementById('search-in').addEventListener('input', function() {
    var self = this; clearTimeout(self._t); self._t = setTimeout(function() { getSt().search = self.value; renderTable(); }, 150);
  });
  document.getElementById('btn-settings').addEventListener('click', toggleSettings);
  document.getElementById('btn-sysinfo').addEventListener('click', toggleSysInfo);
  window._ksRefresh = forceRefresh;
  window._ksRestartPoller = function(ms) { stopPoll(); startPoll(ms); renderTable(); };

  // Init UI
  initDetail();
  renderTable();
  updateStatus();
  updatePerf();

  // Collect CPU freq + core count
  collectFreq().then(function(f) { if (f > 0) setSt({ cpuFreq: [f] }); }).catch(function() {});
  collectCores().then(function(c) { if (c > 0) setSt({ cpuCores: c }); }).catch(function() {});

  // Start polling
  startPoll(getSt().settings.interval);

  // Subscribe to state changes
  sub('*', function() { updateStatus(); updatePerf(); });
  sub('procs', function() { renderTable(); });
  sub('selPid', function() { renderTable(); });
}

// Error handler
window.addEventListener('error', function(e) {
  var el = document.getElementById('process-list');
  if (el) el.innerHTML = '<div class="empty"><span class="txd">Error: ' + (e.message || 'unknown') + '</span></div>';
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
