import { getSt } from './store.js';
import { fx, fb, ft } from './utils.js';

export function update() {
  var s = getSt();
  var total = (s.mem && s.mem.MemTotal) ? s.mem.MemTotal : 0;
  var avail = (s.mem && (s.mem.MemAvailable || s.mem.MemFree)) ? (s.mem.MemAvailable || s.mem.MemFree) : 0;
  var memPct = total > 0 ? ((total - avail) / total) * 100 : 0;

  document.getElementById('sbar').innerHTML =
    '<span class="sbar-item"><span class="sl">CPU</span>' +
    '<span class="sbar-b"><span class="bt"><span class="bf bf-cpu" style="width:' + Math.min(s.cpuPct, 100).toFixed(0) + '%"></span></span>' +
    '<span class="sv">' + fx(s.cpuPct) + '%</span></span></span>' +
    '<span class="sbar-item"><span class="sl">MEM</span>' +
    '<span class="sbar-b"><span class="bt"><span class="bf bf-mem" style="width:' + Math.min(memPct, 100).toFixed(0) + '%"></span></span>' +
    '<span class="sv">' + fb((total - avail) * 1024) + ' / ' + fb(total * 1024) + '</span></span></span>' +
    '<span class="sbar-item"><span class="sl">Load</span><span class="sv">' + (s.load ? fx(s.load.l1, 2) : '--') + ' ' + (s.load ? fx(s.load.l5, 2) : '--') + ' ' + (s.load ? fx(s.load.l15, 2) : '--') + '</span></span>' +
    '<span class="sbar-item"><span class="sl">Up</span><span class="sv">' + ft(s.uptime) + '</span></span>' +
    '<span class="sbar-item"><span class="sl">Procs</span><span class="sv">' + s.procs.length + '</span></span>';
}
