import { getSt, setSt } from './store.js';
import { fb, fd } from './utils.js';

var sortKey = 'pid', sortDir = 'asc';

export function render() {
  var S = getSt();
  var list = S.procs.slice(), q = S.search.toLowerCase();
  if (q) list = list.filter(function(p) { return String(p.pid).indexOf(q) >= 0 || (p.name && p.name.toLowerCase().indexOf(q) >= 0); });
  if (!S.settings.showKernel) list = list.filter(function(p) { return p.name && !p.name.startsWith('['); });
  if (!S.settings.showSystem) list = list.filter(function(p) { return p.user !== 'root' && p.user !== 'system'; });

  list.sort(function(a, b) {
    var va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    var c = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'desc' ? -c : c;
  });

  var pc = document.getElementById('proc-count');
  if (pc) pc.textContent = list.length + ' procs';

  var h = '<table class="proc-table"><thead><tr>' +
    '<th style="width:24px;text-align:center"></th>' +
    '<th style="width:50px" data-sk="pid"' + (sortKey === 'pid' ? ' class="sorted"' : '') + '>PID' + (sortKey === 'pid' ? (sortDir === 'asc' ? ' ▴' : ' ▾') : '') + '</th>' +
    '<th data-sk="name"' + (sortKey === 'name' ? ' class="sorted"' : '') + '>Name' + (sortKey === 'name' ? (sortDir === 'asc' ? ' ▴' : ' ▾') : '') + '</th>' +
    '<th style="width:48px;text-align:right" data-sk="cpuPct"' + (sortKey === 'cpuPct' ? ' class="sorted"' : '') + '>CPU%' + (sortKey === 'cpuPct' ? (sortDir === 'asc' ? ' ▴' : ' ▾') : '') + '</th>' +
    '<th style="width:58px;text-align:right" data-sk="rssKb"' + (sortKey === 'rssKb' ? ' class="sorted"' : '') + '>RSS' + (sortKey === 'rssKb' ? (sortDir === 'asc' ? ' ▴' : ' ▾') : '') + '</th>' +
    '<th style="width:60px">User</th></tr></thead><tbody>';

  for (var i = 0; i < list.length; i++) {
    var p = list[i], sel = p.pid === S.selPid ? ' class="selected"' : '';
    h += '<tr data-pid="' + p.pid + '"' + sel + '>' +
      '<td style="text-align:center"><span class="state-dot ' + fd(p.state) + '"></span></td>' +
      '<td>' + p.pid + '</td><td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">' + esc(p.name) + '</td>' +
      '<td style="text-align:right">' + normalizeCpu(p.cpuPct) + '</td>' +
      '<td style="text-align:right">' + fb((p.rssKb || 0) * 1024) + '</td>' +
      '<td>' + esc(p.user) + '</td></tr>';
  }
  h += '</tbody></table>';

  var el = document.getElementById('process-list');
  el.innerHTML = list.length === 0 ? '<div class="empty"><span>No processes</span></div>' : h;

  // Click handlers
  var rows = el.querySelectorAll('tbody tr');
  for (var j = 0; j < rows.length; j++) {
    rows[j].addEventListener('click', function() {
      var pid = parseInt(this.getAttribute('data-pid'), 10);
      if (!isNaN(pid)) setSt({ selPid: pid });
    });
  }

  // Sort handlers
  var ths = el.querySelectorAll('th[data-sk]');
  for (var k = 0; k < ths.length; k++) {
    ths[k].addEventListener('click', function() {
      var sk = this.getAttribute('data-sk');
      if (sortKey === sk) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = sk; sortDir = 'asc'; }
      render();
    });
  }
}

function normalizeCpu(val) {
  var cores = getSt().cpuCores || 4;
  var pct = (val || 0) / cores;
  return Math.min(pct, 100).toFixed(1);
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
