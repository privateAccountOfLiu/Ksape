import { getSt, setSt, sub } from './store.js';
import { collectDetail, collectProcNet, killProc, reniceProc } from './collector.js';
import { toast } from './bridge.js';
import { fb, fs, fd } from './utils.js';

export function init() {
  sub('selPid', function(pid) {
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
  var dt = await collectDetail(pid);
  if (dt.error) { db.innerHTML = '<div class="empty"><span class="txd">Error: ' + dt.error + '</span></div>'; return; }
  getSt().detail = dt;
  renderDetail(dt);
}

function renderDetail(d) {
  var s = d.status || {}, st = d.stat || {}, mem = d.memory || {}, name = d.cmdline || s.name || '?', state = (s.state || st.state || 'S')[0];
  var db = document.getElementById('dbody');
  db.innerHTML = '';

  // Header
  db.appendChild(H('div', { c: 'dhdr' },
    H('span', { c: 'dn' }, name),
    H('div', { c: 'flex aic gap8' },
      H('span', { c: 'txs tx2' }, 'Nice:'),
      H('input', { type: 'number', min: '-20', max: '19', value: st.nice || 0, id: 'rnv', s: { width: '44px', background: 'var(--bg)', border: '1px solid var(--bd)', borderRadius: '4px', color: 'var(--tx)', fontSize: '12px', textAlign: 'center', padding: '2px' } }),
      H('button', { c: 'btn', s: { height: '26px', fontSize: '11px' }, on: { click: function() { onRenice(d.pid); } } }, 'Set'),
      H('button', { c: 'btn btn-danger', s: { height: '26px', fontSize: '11px' }, on: { click: function() { onKill(d.pid, name); } } }, 'Kill')
    )
  ));

  // Overview
  var ov = [];
  ov.push(kv('PID', d.pid), kv('PPID', s.ppid || st.ppid || '--'), kv('Name', name));
  ov.push(kv('State', H('span', { c: 'flex aic gap4' }, H('span', { c: 'state-dot ' + fd(state) }), fs(state))));
  if (s.uid) ov.push(kv('User', s.uid.slice(0, 2).join(',')));
  ov.push(kv('Threads', s.threads || st.threads || '--'), kv('Nice', st.nice || 0), kv('Cmdline', d.cmdline || '--'));
  db.appendChild(sec('Overview', true, H('dl', { c: 'dkv' }, ov)));

  // Memory
  var mk = [];
  if (Object.keys(mem).length > 0) { for (var mk2 in mem) { if (mem[mk2] != null) mk.push(kv(mk2.replace(/_/g, ' '), fb(mem[mk2] * 1024))); } }
  else { if (s.rss) mk.push(kv('RSS', fb(s.rss * 1024))); if (s.vsz) mk.push(kv('VSS', fb(s.vsz * 1024))); if (s.swap) mk.push(kv('Swap', fb(s.swap * 1024))); }
  db.appendChild(sec('Memory', false, H('dl', { c: 'dkv' }, mk)));

  // Files
  var fds = d.fds || [], frows = [];
  for (var fi = 0; fi < Math.min(fds.length, 80); fi++) frows.push(H('tr', {}, H('td', { s: { width: '44px' } }, fds[fi].fd), H('td', { s: { wordBreak: 'break-all' } }, fds[fi].target)));
  db.appendChild(sec('Files (' + fds.length + ')', false, frows.length > 0 ? H('table', { c: 'dtbl' }, H('thead', {}, H('tr', {}, H('th', {}, 'FD'), H('th', {}, 'Target'))), H('tbody', {}, frows)) : H('span', { c: 'tx3' }, 'No data')));

  // Env
  var envs = d.environ || [], erows = [];
  for (var ei = 0; ei < Math.min(envs.length, 40); ei++) erows.push(H('tr', {}, H('td', { s: { fontWeight: '500', width: '40%' } }, envs[ei].k), H('td', { s: { wordBreak: 'break-all' } }, envs[ei].v)));
  db.appendChild(sec('Environment (' + envs.length + ')', false, erows.length > 0 ? H('table', { c: 'dtbl' }, H('thead', {}, H('tr', {}, H('th', {}, 'Key'), H('th', {}, 'Value'))), H('tbody', {}, erows)) : H('span', { c: 'tx3' }, 'No data')));

  // Threads
  var tids = d.threads || [], trows = [];
  for (var ti = 0; ti < tids.length; ti++) trows.push(H('tr', {}, H('td', {}, String(tids[ti])), H('td', {}, tids[ti] == d.pid ? name : 'Thread-' + tids[ti])));
  db.appendChild(sec('Threads (' + tids.length + ')', false, trows.length > 0 ? H('table', { c: 'dtbl' }, H('thead', {}, H('tr', {}, H('th', {}, 'TID'), H('th', {}, 'Name'))), H('tbody', {}, trows)) : H('span', { c: 'tx3' }, 'No data')));

  // Network
  db.appendChild(sec('Network', false, H('button', { c: 'btn txsm', on: { click: function() { loadNet(d.pid); } } }, 'Load'), H('div', { id: 'net-body', s: { marginTop: '8px' } })));
}

function H(t, a) { var e = document.createElement(t); if (a) for (var k in a) { if (k === 'c') e.className = a[k]; else if (k === 't') e.textContent = a[k]; else if (k === 'h') e.innerHTML = a[k]; else if (k === 's') for (var sk in a[k]) e.style[sk] = a[k][sk]; else if (k === 'on') for (var ek in a[k]) e.addEventListener(ek, a[k][ek]); else e.setAttribute(k, a[k]); } for (var i = 2; i < arguments.length; i++) appendChildren(e, arguments[i]); return e; }
function appendChildren(e, c) { if (c == null) return; if (Array.isArray(c)) { for (var j = 0; j < c.length; j++) appendChildren(e, c[j]); } else if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c)); else if (c instanceof Node) e.appendChild(c); }
function sec(title, open) { var args = Array.prototype.slice.call(arguments, 2); return H('details', { c: 'sec', open: open ? 'open' : undefined }, H('summary', {}, title), H('div', { c: 'sb' }, args)); }
function kv(k, v) { return [H('dt', {}, k), H('dd', {}, v instanceof Node ? v : String(v))]; }

async function loadNet(pid) {
  var el = document.getElementById('net-body'); if (!el) return;
  el.innerHTML = '<div class="spin"></div>';
  var conns = await collectProcNet(pid); var rows = [];
  for (var i = 0; i < Math.min(conns.length, 50); i++) { var c = conns[i]; rows.push(H('tr', {}, H('td', {}, c.proto), H('td', { c: 'tmono' }, c.local), H('td', { c: 'tmono' }, c.remote), H('td', {}, c.state))); }
  el.innerHTML = '';
  el.appendChild(rows.length > 0 ? H('table', { c: 'dtbl' }, H('thead', {}, H('tr', {}, H('th', {}, 'Proto'), H('th', {}, 'Local'), H('th', {}, 'Remote'), H('th', {}, 'State'))), H('tbody', {}, rows)) : H('span', { c: 'tx3' }, 'No connections'));
}

async function onKill(pid, name) {
  var ok = confirm('Kill ' + name + ' (PID:' + pid + ')?');
  if (!ok) return;
  var r = await killProc(pid);
  if (r.success) { toast('Killed PID ' + pid); setSt({ selPid: null }); }
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
