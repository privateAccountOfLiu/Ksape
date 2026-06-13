import { getSt } from './store.js';
import { fx, ft } from './utils.js';

var cpuHist = [], memHist = [];

function push(a, v) { a.push(Number(v) || 0); if (a.length > 30) a.shift(); }

export function update() {
  var s = getSt();
  var cpu = s.cpuPct || 0;
  var total = (s.mem && s.mem.MemTotal) ? s.mem.MemTotal : 0;
  var avail = (s.mem && (s.mem.MemAvailable || s.mem.MemFree)) ? (s.mem.MemAvailable || s.mem.MemFree) : 0;
  var memPct = total > 0 ? ((total - avail) / total) * 100 : 0;
  var cf = (s.cpuFreq && s.cpuFreq[0]) ? s.cpuFreq[0] : 0;

  push(cpuHist, cpu);
  push(memHist, memPct);

  var el = document.getElementById('perf-dash');
  if (!el) return;
  el.innerHTML =
    '<div class="perf-card"><div class="pc-h"><span>CPU</span><span class="tmono">' + fx(cpu) + '%</span></div>' +
    '<div class="pc-bar"><div class="pc-bf cpu" style="width:' + Math.min(cpu, 100).toFixed(0) + '%"></div></div>' +
    spark(cpuHist, 'ac') + '</div>' +
    '<div class="perf-card"><div class="pc-h"><span>Memory</span><span class="tmono">' + fx(memPct) + '%</span></div>' +
    '<div class="pc-bar"><div class="pc-bf mem" style="width:' + Math.min(memPct, 100).toFixed(0) + '%"></div></div>' +
    spark(memHist, 'gr') + '</div>' +
    '<div class="perf-card"><div class="pc-h"><span>Load</span></div>' +
    '<div class="pc-v">' + (s.load ? fx(s.load.l1, 2) : '--') + '</div>' +
    '<div class="txs tx2">1m/5m/15m: ' + (s.load ? fx(s.load.l5, 2) + '/' + fx(s.load.l15, 2) : '--/--') + '</div></div>' +
    '<div class="perf-card"><div class="pc-h"><span>CPU Clock</span></div>' +
    '<div class="pc-v">' + (cf > 0 ? (cf / 1000).toFixed(0) : '--') + ' <span class="txs tx2">MHz</span></div>' +
    '<div class="txs tx2">Up: ' + ft(s.uptime) + '</div></div>';
}

function spark(arr, cv) {
  var max = 1; for (var i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
  var h = ''; for (var i = 0; i < arr.length; i++) { var pct = max > 0 ? (arr[i] / max) * 100 : 0; if (pct < 2) pct = 2; h += '<span class="sk" style="height:' + pct.toFixed(0) + '%;background:var(--' + cv + ')"></span>'; }
  return '<div class="spark">' + h + '</div>';
}
