import { getState, setState, subscribe } from './store.js';
import { collectDetail, collectProcNet, killProc, reniceProc } from './collector.js';
import { toast } from './bridge.js';
import { formatBytes, stateLabel, stateDotClass } from './utils.js';

export function init() {
  // Back button for narrow screens
  var detailEl = document.getElementById('detail');
  var backBtn = document.createElement('div');
  backBtn.id = 'detail-back';
  backBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg> Back';
  backBtn.addEventListener('click', function() { setState({ selPid: null }); });
  detailEl.insertBefore(backBtn, detailEl.firstChild);

  subscribe('selPid', function(pid) {
    var d = document.getElementById('detail');
    var db = document.getElementById('dbody');
    if (pid) {
      d.classList.add('on');
      db.innerHTML = '<div class="empty"><div class="spin"></div><span>Loading...</span></div>';
      loadDetail(pid);
    } else {
      d.classList.remove('on');
    }
  });
}

async function loadDetail(pid) {
  var db = document.getElementById('dbody');
  var detail = await collectDetail(pid);
  if (detail.error) { db.innerHTML = '<div class="empty"><span class="txd">Error: ' + detail.error + '</span></div>'; return; }
  getState().detail = detail;
  renderDetail(detail);
}

function renderDetail(d) {
  var status     = d.status || {};
  var stat       = d.stat || {};
  var mem        = d.memory || {};
  var name       = d.cmdline || status.name || '?';
  var stateChar  = (status.state || stat.state || 'S')[0];
  var db = document.getElementById('dbody');
  db.innerHTML = '';

  // Header bar
  db.appendChild(createEl('div', { c: 'dhdr' },
    createEl('span', { c: 'dn' }, name),
    createEl('div', { c: 'flex aic gap8' },
      createEl('span', { c: 'txs tx2' }, 'Nice:'),
      createEl('input', { type: 'number', min: '-20', max: '19', value: stat.nice || 0, id: 'rnv',
        s: { width: '44px', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: '4px', color: 'var(--tx)', fontSize: '12px', textAlign: 'center', padding: '2px' } }),
      createEl('button', { c: 'btn', s: { height: '26px', fontSize: '11px' }, on: { click: function() { onRenice(d.pid); } } }, 'Set'),
      createEl('button', { c: 'btn btn-danger', s: { height: '26px', fontSize: '11px' }, on: { click: function() { onKill(d.pid, name); } } }, 'Kill')
    )
  ));

  // Overview
  var overview = [];
  overview.push(kv('PID', d.pid), kv('PPID', status.ppid || stat.ppid || '--'), kv('Name', name));
  overview.push(kv('State', createEl('span', { c: 'flex aic gap4' }, createEl('span', { c: 'state-dot ' + stateDotClass(stateChar) }), stateLabel(stateChar))));
  if (status.uid) overview.push(kv('User', status.uid.slice(0, 2).join(',')));
  overview.push(kv('Threads', status.threads || stat.threads || '--'), kv('Nice', stat.nice || 0), kv('Cmdline', d.cmdline || '--'));
  db.appendChild(section('Overview', true, createEl('dl', { c: 'dkv' }, overview)));

  // Memory
  var memKvs = [];
  if (Object.keys(mem).length > 0) {
    for (var mk in mem) { if (mem[mk] != null) memKvs.push(kv(mk.replace(/_/g, ' '), formatBytes(mem[mk] * 1024))); }
  } else {
    if (status.rss)  memKvs.push(kv('RSS', formatBytes(status.rss * 1024)));
    if (status.vsz)  memKvs.push(kv('VSS', formatBytes(status.vsz * 1024)));
    if (status.swap) memKvs.push(kv('Swap', formatBytes(status.swap * 1024)));
  }
  db.appendChild(section('Memory', false, createEl('dl', { c: 'dkv' }, memKvs)));

  // File Descriptors
  var fds = d.fds || [], fdRows = [];
  for (var i = 0; i < Math.min(fds.length, 80); i++) {
    fdRows.push(createEl('tr', {}, createEl('td', { s: { width: '44px' } }, fds[i].fd), createEl('td', { s: { wordBreak: 'break-all' } }, fds[i].target)));
  }
  db.appendChild(section('Files (' + fds.length + ')', false,
    fdRows.length > 0 ? createEl('table', { c: 'dtbl' }, createEl('thead', {}, createEl('tr', {}, createEl('th', {}, 'FD'), createEl('th', {}, 'Target'))), createEl('tbody', {}, fdRows))
    : createEl('span', { c: 'tx3' }, 'No data')));

  // Environment
  var envs = d.environ || [], envRows = [];
  for (var j = 0; j < Math.min(envs.length, 40); j++) {
    envRows.push(createEl('tr', {}, createEl('td', { s: { fontWeight: '500', width: '40%' } }, envs[j].k), createEl('td', { s: { wordBreak: 'break-all' } }, envs[j].v)));
  }
  db.appendChild(section('Environment (' + envs.length + ')', false,
    envRows.length > 0 ? createEl('table', { c: 'dtbl' }, createEl('thead', {}, createEl('tr', {}, createEl('th', {}, 'Key'), createEl('th', {}, 'Value'))), createEl('tbody', {}, envRows))
    : createEl('span', { c: 'tx3' }, 'No data')));

  // Threads
  var tids = d.threads || [], threadRows = [];
  for (var k = 0; k < tids.length; k++) {
    threadRows.push(createEl('tr', {}, createEl('td', {}, String(tids[k])), createEl('td', {}, tids[k] == d.pid ? name : 'Thread-' + tids[k])));
  }
  db.appendChild(section('Threads (' + tids.length + ')', false,
    threadRows.length > 0 ? createEl('table', { c: 'dtbl' }, createEl('thead', {}, createEl('tr', {}, createEl('th', {}, 'TID'), createEl('th', {}, 'Name'))), createEl('tbody', {}, threadRows))
    : createEl('span', { c: 'tx3' }, 'No data')));

  // Network
  db.appendChild(section('Network', false,
    createEl('button', { c: 'btn txsm', on: { click: function() { loadNetwork(d.pid); } } }, 'Load'),
    createEl('div', { id: 'net-body', s: { marginTop: '8px' } })));
}

// DOM helper (local copy for self-contained detail rendering)
function createEl(tag, attrs) {
  var el = document.createElement(tag);
  if (attrs) for (var k in attrs) {
    if (k === 'c') el.className = attrs[k];
    else if (k === 't') el.textContent = attrs[k];
    else if (k === 'h') el.innerHTML = attrs[k];
    else if (k === 's') for (var sk in attrs[k]) el.style[sk] = attrs[k][sk];
    else if (k === 'on') for (var ek in attrs[k]) el.addEventListener(ek, attrs[k][ek]);
    else el.setAttribute(k, attrs[k]);
  }
  for (var i = 2; i < arguments.length; i++) appendChildren(el, arguments[i]);
  return el;
}

function appendChildren(el, c) {
  if (c == null) return;
  if (Array.isArray(c)) { for (var j = 0; j < c.length; j++) appendChildren(el, c[j]); }
  else if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(c));
  else if (c instanceof Node) el.appendChild(c);
}

function section(title, open) {
  var args = Array.prototype.slice.call(arguments, 2);
  return createEl('details', { c: 'sec', open: open ? 'open' : undefined },
    createEl('summary', {}, title),
    createEl('div', { c: 'sb' }, args)
  );
}

function kv(k, v) {
  return [createEl('dt', {}, k), createEl('dd', {}, v instanceof Node ? v : String(v))];
}

async function loadNetwork(pid) {
  var el = document.getElementById('net-body'); if (!el) return;
  el.innerHTML = '<div class="spin"></div>';
  var conns = await collectProcNet(pid), rows = [];
  for (var i = 0; i < Math.min(conns.length, 50); i++) {
    var c = conns[i];
    rows.push(createEl('tr', {}, createEl('td', {}, c.proto), createEl('td', { c: 'tmono' }, c.local), createEl('td', { c: 'tmono' }, c.remote), createEl('td', {}, c.state)));
  }
  el.innerHTML = '';
  el.appendChild(rows.length > 0
    ? createEl('table', { c: 'dtbl' }, createEl('thead', {}, createEl('tr', {}, createEl('th', {}, 'Proto'), createEl('th', {}, 'Local'), createEl('th', {}, 'Remote'), createEl('th', {}, 'State'))), createEl('tbody', {}, rows))
    : createEl('span', { c: 'tx3' }, 'No connections'));
}

async function onKill(pid, name) {
  if (!confirm('Kill ' + name + ' (PID: ' + pid + ')?')) return;
  var r = await killProc(pid);
  if (r.success) { toast('Killed PID ' + pid); setState({ selPid: null }); }
  else { toast('Failed: ' + (r.stderr || 'error')); }
}

function onRenice(pid) {
  var v = parseInt(document.getElementById('rnv').value, 10);
  if (isNaN(v) || v < -20 || v > 19) { toast('Priority: -20 to 19'); return; }
  reniceProc(pid, v).then(function(r) {
    if (r.success) { toast('Priority set to ' + v); loadDetail(pid); }
    else { toast('Failed: ' + (r.stderr || 'error')); }
  });
}
