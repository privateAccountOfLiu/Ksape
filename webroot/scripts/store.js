// Simple pub/sub state store
var state = {
  procs: [], selPid: null, detail: null,
  cpuStat: null, prevCpu: null, cpuPct: 0,
  mem: null, load: null, uptime: 0, cpuFreq: null, cpuCores: 4,
  search: '', stateFilter: 'all', sortKey: 'pid', sortDir: 'asc',
  settings: { interval: 3000, showKernel: false, showSystem: true }
};

var subscribers = {};

export function getState()         { return state; }
export function subscribe(key, fn) { if (!subscribers[key]) subscribers[key] = []; subscribers[key].push(fn); }

export function setState(o) {
  var changed = [];
  for (var k in o) { if (state[k] !== o[k]) { state[k] = o[k]; changed.push(k); } }
  changed.forEach(function(k) { if (subscribers[k]) subscribers[k].forEach(function(f) { f(state[k]); }); });
  if (subscribers['*']) subscribers['*'].forEach(function(f) { f(changed); });
}
