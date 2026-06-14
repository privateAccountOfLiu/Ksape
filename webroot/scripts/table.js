import { getState, setState } from './store.js';
import { formatBytes, stateDotClass } from './utils.js';

var sortKey = 'pid', sortDir = 'asc';

export function render() {
  var S = getState();
  var list = S.procs.slice(), query = S.search.toLowerCase();

  // Filters
  if (query) list = list.filter(function(p) { return String(p.pid).indexOf(query) >= 0 || (p.name && p.name.toLowerCase().indexOf(query) >= 0); });
  if (!S.settings.showKernel)  list = list.filter(function(p) { return p.name && !p.name.startsWith('['); });
  if (!S.settings.showSystem)  list = list.filter(function(p) { return p.user !== 'root' && p.user !== 'system'; });
  if (S.stateFilter && S.stateFilter !== 'all') list = list.filter(function(p) { return p.state === S.stateFilter; });

  // Sort
  list.sort(function(a, b) {
    var va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    var cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === 'desc' ? -cmp : cmp;
  });

  // Count
  var procCount = document.getElementById('proc-count');
  if (procCount) procCount.textContent = list.length + ' procs';

  // Render state filter bar (outside #process-list so it persists)
  renderFilterBar(S);

  // Table header
  var html = '<table class="proc-table"><thead><tr>' +
    '<th style="width:24px;text-align:center"></th>' +
    '<th style="width:52px" data-sk="pid"'    + (sortKey === 'pid'    ? ' class="sorted"' : '') + '>PID'  + sortMarker('pid')    + '</th>' +
    '<th data-sk="name"'                       + (sortKey === 'name'   ? ' class="sorted"' : '') + '>Name' + sortMarker('name')   + '</th>' +
    '<th style="width:50px;text-align:right" data-sk="cpuPct"' + (sortKey === 'cpuPct' ? ' class="sorted"' : '') + '>CPU%' + sortMarker('cpuPct') + '</th>' +
    '<th style="width:60px;text-align:right" data-sk="rssKb"'  + (sortKey === 'rssKb'  ? ' class="sorted"' : '') + '>RSS'  + sortMarker('rssKb')  + '</th>' +
    '<th style="width:62px">User</th></tr></thead><tbody>';

  // Table body
  for (var i = 0; i < list.length; i++) {
    var p = list[i], selected = p.pid === S.selPid ? ' class="selected"' : '';
    html += '<tr data-pid="' + p.pid + '"' + selected + '>' +
      '<td style="text-align:center"><span class="state-dot ' + stateDotClass(p.state) + '"></span></td>' +
      '<td>' + p.pid + '</td>' +
      '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(p.name) + '</td>' +
      '<td style="text-align:right">' + normalizeCpu(p.cpuPct) + '</td>' +
      '<td style="text-align:right">' + formatBytes((p.rssKb || 0) * 1024) + '</td>' +
      '<td>' + escapeHtml(p.user) + '</td></tr>';
  }
  html += '</tbody></table>';

  var container = document.getElementById('process-list');
  container.innerHTML = list.length === 0 ? '<div class="empty"><span>No processes</span></div>' : html;

  // Row click → select process
  var rows = container.querySelectorAll('tbody tr');
  for (var j = 0; j < rows.length; j++) {
    rows[j].addEventListener('click', function() {
      var pid = parseInt(this.getAttribute('data-pid'), 10);
      if (!isNaN(pid)) setState({ selPid: pid });
    });
  }

  // Column header click → sort
  var headers = container.querySelectorAll('th[data-sk]');
  for (var k = 0; k < headers.length; k++) {
    headers[k].addEventListener('click', function() {
      var key = this.getAttribute('data-sk');
      if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = key; sortDir = 'asc'; }
      render();
    });
  }
}

function sortMarker(key) {
  if (sortKey !== key) return '';
  return sortDir === 'asc' ? ' ▴' : ' ▾';
}

function normalizeCpu(val) {
  var cores = getState().cpuCores || 4;
  var pct = (val || 0) / cores;
  return Math.min(pct, 100).toFixed(1);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderFilterBar(S) {
  var el = document.getElementById('state-filter-bar');
  if (!el) return;
  var states = [
    { key: 'all', label: 'All' },
    { key: 'R',   label: 'Run' },
    { key: 'S',   label: 'Sleep' },
    { key: 'D',   label: 'Disk' },
    { key: 'T',   label: 'Stop' },
    { key: 'Z',   label: 'Zombie' }
  ];
  var html = '';
  for (var i = 0; i < states.length; i++) {
    var st = states[i], active = S.stateFilter === st.key ? ' active' : '';
    html += '<span class="sf-item' + active + '" data-sf="' + st.key + '">';
    if (st.key !== 'all') html += '<span class="state-dot ' + stateDotClass(st.key) + '"></span>';
    html += st.label + '</span>';
  }
  el.innerHTML = html;
  var items = el.querySelectorAll('.sf-item');
  for (var j = 0; j < items.length; j++) {
    items[j].addEventListener('click', function() {
      S.stateFilter = this.getAttribute('data-sf');
      render();
    });
  }
}
