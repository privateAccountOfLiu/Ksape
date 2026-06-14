import { getState, setState, subscribe } from './store.js';
import { collectOverview, collectFreq, collectCores } from './collector.js';
import { render as renderTable } from './table.js';
import { init as initDetail } from './detail.js';
import { update as updateStatus } from './status.js';
import { update as updatePerf } from './perf.js';
import { toggle as toggleSettings } from './settings.js';
import { toggle as toggleSysInfo } from './sysinfo.js';
import { toggle as toggleFindWin } from './findwin.js';

// Poller
var prevCpu = null, pollTimer = null, polling = false, pollPaused = false;

function startPoll(intervalMs) {
  stopPoll();
  function tick() {
    if (pollPaused || polling) { pollTimer = setTimeout(tick, intervalMs || 3000); return; }
    polling = true;
    collectOverview().then(function(data) {
      polling = false; if (!data) return;
      var cpuPct = 0;
      if (data.cpuStat) {
        if (prevCpu) {
          var usedDiff = data.cpuStat.used - prevCpu.used;
          var totalDiff = data.cpuStat.total - prevCpu.total;
          cpuPct = totalDiff > 0 ? Math.max(0, Math.min(100, (usedDiff / totalDiff) * 100)) : 0;
        }
        prevCpu = data.cpuStat;
      }
      setState({ procs: data.procs, cpuStat: data.cpuStat, cpuPct: cpuPct, mem: data.mem, load: data.load, uptime: data.uptime });
    }).catch(function() { polling = false; });
    pollTimer = setTimeout(tick, intervalMs || 3000);
  }
  pollTimer = setTimeout(tick, 600);
}

function stopPoll() { if (pollTimer) clearTimeout(pollTimer); pollTimer = null; }
function forceRefresh() { collectOverview().then(function(d) { if (!d) return; setState(d); }).catch(function() {}); }
document.addEventListener('visibilitychange', function() { pollPaused = document.hidden; if (!document.hidden) forceRefresh(); });

// Init
function init() {
  // Load settings
  try {
    var saved = localStorage.getItem('ksape_st');
    if (saved) {
      var s = JSON.parse(saved);
      var S = getState();
      S.settings.interval = s.interval || 3000;
      S.settings.showKernel = s.showKernel || false;
      S.settings.showSystem = s.showSystem !== false;
    }
  } catch (e) {}

  // Search input
  var searchInput = document.getElementById('search-in');
  var searchTimer = null;
  if (searchInput) searchInput.addEventListener('input', function() {
    var self = this;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function() { getState().search = self.value; renderTable(); }, 150);
  });

  // Toolbar buttons
  var btnSettings = document.getElementById('btn-settings');
  if (btnSettings) btnSettings.addEventListener('click', toggleSettings);
  var btnSysinfo = document.getElementById('btn-sysinfo');
  if (btnSysinfo) btnSysinfo.addEventListener('click', toggleSysInfo);
  var btnFindWin = document.getElementById('btn-findwin');
  if (btnFindWin) btnFindWin.addEventListener('click', toggleFindWin);

  // Globals (used by inline onclick)
  window._ksRefresh = forceRefresh;
  window._ksRestartPoller = function(ms) { stopPoll(); startPoll(ms); renderTable(); };

  // Init UI
  initDetail();
  renderTable();
  updateStatus();
  updatePerf();

  // Background: collect CPU freq + core count
  collectFreq().then(function(f) { if (f > 0) setState({ cpuFreq: [f] }); }).catch(function() {});
  collectCores().then(function(c) { if (c > 0) setState({ cpuCores: c }); }).catch(function() {});

  // Start polling
  startPoll(getState().settings.interval);

  // Subscribe to state changes
  subscribe('*', function() { updateStatus(); updatePerf(); });
  subscribe('procs', function() { renderTable(); });
  subscribe('selPid', function() { renderTable(); });
}

// Error handler
window.addEventListener('error', function(e) {
  var el = document.getElementById('process-list');
  if (el) el.innerHTML = '<div class="empty"><span class="txd">Error: ' + (e.message || 'unknown') + '</span></div>';
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
