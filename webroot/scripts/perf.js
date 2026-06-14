import { getState } from './store.js';
import { formatNum, formatUptime } from './utils.js';

var cpuHistory = [], memHistory = [];

function push(arr, val) { arr.push(Number(val) || 0); if (arr.length > 30) arr.shift(); }

export function update() {
  var s = getState();
  var cpu = s.cpuPct || 0;
  var total = (s.mem && s.mem.MemTotal) ? s.mem.MemTotal : 0;
  var avail = (s.mem && (s.mem.MemAvailable || s.mem.MemFree)) ? (s.mem.MemAvailable || s.mem.MemFree) : 0;
  var memPct = total > 0 ? ((total - avail) / total) * 100 : 0;
  var cpuFreq = (s.cpuFreq && s.cpuFreq[0]) ? s.cpuFreq[0] : 0;

  push(cpuHistory, cpu);
  push(memHistory, memPct);

  var el = document.getElementById('perf-dash');
  if (!el) return;
  el.innerHTML =
    '<div class="perf-card"><div class="pc-h"><span>CPU</span><span class="tmono">' + formatNum(cpu) + '%</span></div>' +
    '<div class="pc-bar"><div class="pc-bf cpu" style="width:' + Math.min(cpu, 100).toFixed(0) + '%"></div></div>' + sparkline(cpuHistory, 'ac') + '</div>' +
    '<div class="perf-card"><div class="pc-h"><span>Memory</span><span class="tmono">' + formatNum(memPct) + '%</span></div>' +
    '<div class="pc-bar"><div class="pc-bf mem" style="width:' + Math.min(memPct, 100).toFixed(0) + '%"></div></div>' + sparkline(memHistory, 'gr') + '</div>' +
    '<div class="perf-card"><div class="pc-h"><span>Load</span></div>' +
    '<div class="pc-v">' + (s.load ? formatNum(s.load.l1, 2) : '--') + '</div>' +
    '<div class="txs tx2">1m/5m/15m: ' + (s.load ? formatNum(s.load.l5, 2) + '/' + formatNum(s.load.l15, 2) : '--/--') + '</div></div>' +
    '<div class="perf-card"><div class="pc-h"><span>CPU Clock</span></div>' +
    '<div class="pc-v">' + (cpuFreq > 0 ? (cpuFreq / 1000).toFixed(0) : '--') + ' <span class="txs tx2">MHz</span></div>' +
    '<div class="txs tx2">Up: ' + formatUptime(s.uptime) + '</div></div>';
}

function sparkline(arr, colorVar) {
  var max = 1; for (var i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
  var html = '';
  for (var i = 0; i < arr.length; i++) {
    var pct = max > 0 ? (arr[i] / max) * 100 : 0;
    if (pct < 2) pct = 2;
    html += '<span class="sk" style="height:' + pct.toFixed(0) + '%;background:var(--' + colorVar + ')"></span>';
  }
  return '<div class="spark">' + html + '</div>';
}
