import { exec } from './bridge.js';
import { getState } from './store.js';

// Shell commands
var CMD = {
  procs: "ps -A -o PID,PPID,USER,S,RSS,%CPU,ARGS 2>/dev/null | tail -n +2",
  cpu:   "head -n 1 /proc/stat 2>/dev/null",
  mem:   "cat /proc/meminfo 2>/dev/null",
  load:  "cat /proc/loadavg 2>/dev/null",
  uptime:"cat /proc/uptime 2>/dev/null",
  freq:  "cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null",
  cores: "grep -c ^processor /proc/cpuinfo 2>/dev/null",
  net:   "cat /proc/net/tcp /proc/net/udp 2>/dev/null",
  sysinfo: "echo 'SYS:';uname -a 2>/dev/null;echo 'MEM:';cat /proc/meminfo 2>/dev/null;echo 'STO:';df -h 2>/dev/null;echo 'LOG:';dmesg 2>/dev/null | tail -n 30",
};

/* ===== Parsers ===== */

function parseProcs(raw) {
  if (!raw) return [];
  var lines = raw.trim().split('\n'), procs = [];
  for (var i = 0; i < lines.length; i++) {
    var f = lines[i].trim().split(/\s+/); if (f.length < 7) continue;
    procs.push({ pid: parseInt(f[0], 10) || 0, ppid: parseInt(f[1], 10) || 0, user: f[2] || '-', state: (f[3] || 'S')[0], rssKb: parseInt(f[4], 10) || 0, cpuPct: parseFloat(f[5]) || 0, name: f.slice(6).join(' ') || '?', memPct: 0 });
  }
  return procs;
}

function parseCpu(raw) {
  if (!raw) return null;
  var m = raw.trim().match(/^cpu\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
  if (!m) return null;
  var v = m.slice(1).map(Number), total = v[0] + v[1] + v[2] + v[3] + v[4];
  return { total: total, used: total - v[3] - v[4], idle: v[3] };
}

function parseMem(raw) {
  if (!raw) return null;
  var r = {}, lines = raw.trim().split('\n');
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^(\w+):\s+(\d+)\s*kB/i);
    if (m) r[m[1]] = parseInt(m[2], 10);
  }
  return r;
}

function parseLoad(raw) {
  if (!raw) return null;
  var p = raw.trim().split(/\s+/);
  return { l1: parseFloat(p[0]) || 0, l5: parseFloat(p[1]) || 0, l15: parseFloat(p[2]) || 0 };
}

/* ===== Collectors ===== */

export async function collectOverview() {
  try {
    var pr = await exec(CMD.procs), cr = await exec(CMD.cpu), mr = await exec(CMD.mem);
    var lr = await exec(CMD.load), ur = await exec(CMD.uptime);
    return {
      procs: parseProcs(pr.stdout), cpuStat: parseCpu(cr.stdout),
      mem: parseMem(mr.stdout), load: parseLoad(lr.stdout),
      uptime: parseFloat((ur.stdout || '0').trim().split(/\s+/)[0]) || 0,
    };
  } catch (e) { return { procs: [], cpuStat: null, mem: null, load: null, uptime: 0 }; }
}

export async function collectDetail(pid) {
  try {
    var cmds = [
      exec("cat /proc/" + pid + "/status 2>/dev/null"),
      exec("cat /proc/" + pid + "/stat 2>/dev/null"),
      exec("cat /proc/" + pid + "/cmdline 2>/dev/null | tr '\\0' ' '"),
      exec("cat /proc/" + pid + "/smaps_rollup 2>/dev/null"),
      exec("ls -l /proc/" + pid + "/fd/ 2>/dev/null"),
      exec("cat /proc/" + pid + "/environ 2>/dev/null | tr '\\0' '\\n'"),
      exec("ls /proc/" + pid + "/task/ 2>/dev/null"),
    ];
    var results = []; for (var i = 0; i < cmds.length; i++) { var res = await cmds[i]; results.push(res.stdout || ''); }
    var st = parseStat(results[1]), status = parseStatus(results[0]), mem = parseSmaps(results[3]);
    if (Object.keys(mem).length === 0) {
      var fb = await exec("cat /proc/" + pid + "/smaps 2>/dev/null | grep '^Pss:' | awk '{sum+=$2}END{print sum}'");
      mem = { Pss: parseInt(fb.stdout, 10) || 0 };
    }
    return { pid: pid, stat: st, status: status, cmdline: results[2].trim(), memory: mem, fds: parseFd(results[4]), environ: parseEnv(results[5]), threads: results[6].trim().split('\n').filter(Boolean) };
  } catch (e) { return { pid: pid, error: String(e) }; }
}

export async function collectNet()     { try { var r = await exec(CMD.net); return parseNet(r.stdout); } catch (e) { return []; } }
export async function collectFreq()    { try { var r = await exec(CMD.freq); return parseInt((r.stdout || '').trim(), 10) || 0; } catch (e) { return 0; } }
export async function collectCores()   { try { var r = await exec(CMD.cores); return parseInt((r.stdout || '').trim(), 10) || 4; } catch (e) { return 4; } }
export async function collectSysInfo() { try { var r = await exec(CMD.sysinfo); return (r.stdout || '').replace(/</g, '&lt;'); } catch (e) { return 'Error: ' + String(e); } }
export async function killProc(pid)    { var r = await exec("kill -9 " + pid + " 2>/dev/null"); return { success: r.errno === 0, stderr: r.stderr }; }
export async function reniceProc(pid, pri) { var r = await exec("renice -n " + pri + " " + pid + " 2>/dev/null"); return { success: r.errno === 0, stderr: r.stderr }; }

export async function collectProcNet(pid) {
  try {
    var fdR = await exec("ls -l /proc/" + pid + "/fd/ 2>/dev/null");
    var inodes = [], re = /socket:\[(\d+)\]/g, m;
    while ((m = re.exec(fdR.stdout || '')) !== null) { inodes.push(m[1]); }
    var netR = await exec(CMD.net);
    return parseNet(netR.stdout).filter(function(c) { return inodes.indexOf(String(c.inode)) >= 0; });
  } catch (e) { return []; }
}

/* ===== Sub-parsers ===== */

function parseStat(raw) {
  if (!raw) return null;
  var p = raw.indexOf(')'); if (p < 0) return null;
  var f = raw.slice(p + 2).trim().split(/\s+/);
  return { state: f[0], ppid: parseInt(f[1], 10) || 0, nice: parseInt(f[16], 10) || 0, pri: parseInt(f[15], 10) || 0, threads: parseInt(f[17], 10) || 0 };
}

function parseStatus(raw) {
  if (!raw) return {};
  var r = {}, lines = raw.trim().split('\n');
  for (var i = 0; i < lines.length; i++) {
    var ci = lines[i].indexOf(':'); if (ci < 0) continue;
    var k = lines[i].slice(0, ci).trim(), v = lines[i].slice(ci + 1).trim();
    if (k === 'Name') r.name = v; else if (k === 'Pid') r.pid = parseInt(v, 10); else if (k === 'PPid') r.ppid = parseInt(v, 10);
    else if (k === 'Uid') r.uid = v.split(/\s+/); else if (k === 'Threads') r.threads = parseInt(v, 10);
    else if (k === 'VmSize') r.vsz = parseInt(v, 10); else if (k === 'VmRSS') r.rss = parseInt(v, 10); else if (k === 'VmSwap') r.swap = parseInt(v, 10);
  }
  return r;
}

function parseSmaps(raw) {
  if (!raw) return {};
  var r = {}, lines = raw.trim().split('\n');
  for (var i = 0; i < lines.length; i++) { var ci = lines[i].indexOf(':'); if (ci < 0) continue; r[lines[i].slice(0, ci).trim()] = parseInt(lines[i].slice(ci + 1).replace(/kB/i, '').trim(), 10) || 0; }
  return r;
}

function parseFd(raw) {
  if (!raw) return [];
  var lines = raw.trim().split('\n'), fds = [];
  for (var i = 0; i < lines.length; i++) { var ai = lines[i].indexOf('->'); if (ai < 0) continue; var left = lines[i].slice(0, ai).trim().split(/\s+/); fds.push({ fd: left[left.length - 1], target: lines[i].slice(ai + 2).trim() }); }
  return fds;
}

function parseEnv(raw) {
  if (!raw) return [];
  return raw.trim().split('\n').filter(Boolean).map(function(l) { var ei = l.indexOf('='); return ei < 0 ? { k: l, v: '' } : { k: l.slice(0, ei), v: l.slice(ei + 1) }; });
}

function h2i(h) { if (h.length !== 8) return h; return parseInt(h.slice(6, 8), 16) + '.' + parseInt(h.slice(4, 6), 16) + '.' + parseInt(h.slice(2, 4), 16) + '.' + parseInt(h.slice(0, 2), 16); }
var TCP_STATES = { '01': 'ESTABLISHED', '02': 'SYN_SENT', '03': 'SYN_RECV', '04': 'FIN_WAIT1', '05': 'FIN_WAIT2', '06': 'TIME_WAIT', '07': 'CLOSE', '08': 'CLOSE_WAIT', '09': 'LAST_ACK', '0A': 'LISTEN', '0B': 'CLOSING' };

function parseNet(raw) {
  if (!raw) return [];
  var lines = raw.trim().split('\n'), conns = [];
  for (var i = 1; i < lines.length; i++) {
    var f = lines[i].trim().split(/\s+/); if (f.length < 10) continue;
    var lc = f[1].lastIndexOf(':'), rc = f[2].lastIndexOf(':');
    conns.push({ proto: 'tcp', local: h2i(f[1].slice(0, lc)) + ':' + parseInt(f[1].slice(lc + 1), 16), remote: h2i(f[2].slice(0, rc)) + ':' + parseInt(f[2].slice(rc + 1), 16), state: TCP_STATES[f[3]] || f[3], inode: parseInt(f[9], 10) || 0 });
  }
  return conns;
}
