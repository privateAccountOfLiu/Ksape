// Simple pub/sub state store
const S = {
  procs: [], selPid: null, detail: null,
  cpuStat: null, prevCpu: null, cpuPct: 0,
  mem: null, load: null, uptime: 0, cpuFreq: null,
  search: '', stateFilter: 'all', sortKey: 'pid', sortDir: 'asc',
  settings: { interval: 3000, showKernel: false, showSystem: true }
};

const subs = {};

export function getSt() { return S; }

export function setSt(o) {
  var ch = [];
  for (var k in o) { if (S[k] !== o[k]) { S[k] = o[k]; ch.push(k); } }
  ch.forEach(function(k) { if (subs[k]) subs[k].forEach(function(f) { f(S[k]); }); });
  if (subs['*']) subs['*'].forEach(function(f) { f(ch); });
}

export function sub(k, fn) {
  if (!subs[k]) subs[k] = [];
  subs[k].push(fn);
}
