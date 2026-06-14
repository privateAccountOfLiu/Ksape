(() => {
  // node_modules/kernelsu/index.js
  var callbackCounter = 0;
  function getUniqueCallbackName(prefix) {
    return `${prefix}_callback_${Date.now()}_${callbackCounter++}`;
  }
  function exec(command, options) {
    if (typeof options === "undefined") {
      options = {};
    }
    return new Promise((resolve, reject) => {
      const callbackFuncName = getUniqueCallbackName("exec");
      window[callbackFuncName] = (errno, stdout, stderr) => {
        resolve({ errno, stdout, stderr });
        cleanup(callbackFuncName);
      };
      function cleanup(successName) {
        delete window[successName];
      }
      try {
        ksu.exec(command, JSON.stringify(options), callbackFuncName);
      } catch (error) {
        reject(error);
        cleanup(callbackFuncName);
      }
    });
  }
  function Stdio() {
    this.listeners = {};
  }
  Stdio.prototype.on = function(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  };
  Stdio.prototype.emit = function(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => listener(...args));
    }
  };
  function ChildProcess() {
    this.listeners = {};
    this.stdin = new Stdio();
    this.stdout = new Stdio();
    this.stderr = new Stdio();
  }
  ChildProcess.prototype.on = function(event, listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  };
  ChildProcess.prototype.emit = function(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => listener(...args));
    }
  };
  function spawn(command, args, options) {
    if (typeof args === "undefined") {
      args = [];
    } else if (!(args instanceof Array)) {
      options = args;
    }
    if (typeof options === "undefined") {
      options = {};
    }
    const child = new ChildProcess();
    const childCallbackName = getUniqueCallbackName("spawn");
    window[childCallbackName] = child;
    function cleanup(name) {
      delete window[name];
    }
    child.on("exit", (code) => {
      cleanup(childCallbackName);
    });
    try {
      ksu.spawn(
        command,
        JSON.stringify(args),
        JSON.stringify(options),
        childCallbackName
      );
    } catch (error) {
      child.emit("error", error);
      cleanup(childCallbackName);
    }
    return child;
  }
  function fullScreen(isFullScreen) {
    ksu.fullScreen(isFullScreen);
  }
  function enableEdgeToEdge(enable) {
    ksu.enableEdgeToEdge(enable);
  }
  function toast(message) {
    ksu.toast(message);
  }
  function moduleInfo() {
    return ksu.moduleInfo();
  }
  function listPackages(type) {
    try {
      return JSON.parse(ksu.listPackages(type));
    } catch (error) {
      return [];
    }
  }
  function getPackagesInfo(packages) {
    try {
      if (typeof packages !== "string") {
        packages = JSON.stringify(packages);
      }
      return JSON.parse(ksu.getPackagesInfo(packages));
    } catch (error) {
      return [];
    }
  }
  function exit() {
    ksu.exit();
  }

  // src/js/app.js
  var S = { procs: [], selPid: null, detail: null, cpuStat: null, prevCpu: null, cpuPct: 0, mem: null, load: null, uptime: 0, cpuFreq: null, search: "", sortKey: "pid", sortDir: "asc", settings: { interval: 3e3, showKernel: false, showSystem: true } };
  var subs = {};
  function setSt(o) {
    var ch = [];
    for (var k in o) {
      if (S[k] !== o[k]) {
        S[k] = o[k];
        ch.push(k);
      }
    }
    ch.forEach(function(k2) {
      if (subs[k2]) subs[k2].forEach(function(f) {
        f(S[k2]);
      });
    });
    if (subs["*"]) subs["*"].forEach(function(f) {
      f(ch);
    });
  }
  function sub(k, fn) {
    if (!subs[k]) subs[k] = [];
    subs[k].push(fn);
  }
  function getSt() {
    return S;
  }
  function fx(v, d) {
    var n = Number(v);
    return isNaN(n) ? "--" : n.toFixed(d || 1);
  }
  function fb(b) {
    if (b == null || isNaN(b)) return "--";
    var a = Math.abs(b);
    if (a >= 1073741824) return (b / 1073741824).toFixed(1) + "GB";
    if (a >= 1048576) return (b / 1048576).toFixed(1) + "MB";
    if (a >= 1024) return (b / 1024).toFixed(0) + "KB";
    return b + "B";
  }
  function ft(s) {
    if (!s || isNaN(s)) return "--";
    var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return d > 0 ? d + "d" + h + "h" : h > 0 ? h + "h" + m + "m" : m + "m";
  }
  function fs(s) {
    var m = { R: "Running", S: "Sleeping", D: "Unint", T: "Stopped", Z: "Zombie", I: "Idle" };
    return m[s] || s || "?";
  }
  function fd(s) {
    var m = { R: "R", S: "S", D: "S", I: "S", T: "T", t: "T", Z: "Z" };
    return m[s] || "S";
  }
  function H(t, a) {
    var e = document.createElement(t);
    if (a) for (var k in a) {
      if (k === "c") e.className = a[k];
      else if (k === "t") e.textContent = a[k];
      else if (k === "h") e.innerHTML = a[k];
      else if (k === "s") for (var sk in a[k]) e.style[sk] = a[k][sk];
      else if (k === "on") for (var ek in a[k]) e.addEventListener(ek, a[k][ek]);
      else e.setAttribute(k, a[k]);
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c != null) {
        if (typeof c === "string" || typeof c === "number") e.appendChild(document.createTextNode(c));
        else if (c instanceof Node) e.appendChild(c);
      }
    }
    return e;
  }
  function $(s) {
    return document.getElementById(s);
  }
  var CMD = {
    procs: function() {
      return `awk 'function x(s){gsub(/[()]/,"",s);return s} FNR==1{printf "%s %s %s %s %d\\n",$1,$4,x($2),$3,$24*4}' /proc/[0-9]*/stat 2>/dev/null`;
    },
    sys: function() {
      return 'echo "CPU:$(head -n 1 /proc/stat)";echo "MEM:$(cat /proc/meminfo | base64)";echo "LOAD:$(cat /proc/loadavg)";echo "UP:$(cat /proc/uptime)"';
    },
    detail: function(pid) {
      return [
        "cat /proc/" + pid + "/status 2>/dev/null",
        "cat /proc/" + pid + "/stat 2>/dev/null",
        "cat /proc/" + pid + "/cmdline 2>/dev/null | tr '\\0' ' '",
        "cat /proc/" + pid + "/smaps_rollup 2>/dev/null",
        "ls -l /proc/" + pid + "/fd/ 2>/dev/null",
        "cat /proc/" + pid + "/environ 2>/dev/null | tr '\\0' '\\n'",
        "ls /proc/" + pid + "/task/ 2>/dev/null"
      ];
    },
    kill: function(pid) {
      return "kill -9 " + pid + " 2>/dev/null";
    },
    renice: function(pid, pri) {
      return "renice " + pri + " -p " + pid + " 2>/dev/null";
    },
    freq: function() {
      return "cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null";
    },
    net: function() {
      return "cat /proc/net/tcp /proc/net/udp 2>/dev/null";
    },
    sysinfo: function() {
      return "uname -a 2>/dev/null; echo '---'; cat /proc/meminfo 2>/dev/null; echo '---'; df -h 2>/dev/null; echo '---'; dmesg 2>/dev/null | tail -n 30";
    }
  };
  function parsePs(raw) {
    if (!raw) return [];
    var lines = raw.trim().split("\n"), procs = [];
    for (var i = 0; i < lines.length; i++) {
      var f = lines[i].trim().split(/\s+/);
      if (f.length < 5) continue;
      procs.push({ pid: parseInt(f[0], 10) || 0, ppid: parseInt(f[1], 10) || 0, name: f[2] || "?", state: f[3] || "S", rssKb: parseInt(f[4], 10) || 0, user: "-", cpuPct: 0, memPct: 0 });
    }
    return procs;
  }
  function parseSys(raw) {
    if (!raw) return {};
    var r = {}, cpuM = raw.match(/CPU:(.*)/), memM = raw.match(/MEM:(.*)/), loadM = raw.match(/LOAD:(.*)/), upM = raw.match(/UP:(.*)/);
    if (cpuM) {
      var f = cpuM[1].trim().split(/\s+/).slice(1).map(Number);
      r.cpuStat = { total: f.reduce(function(a, b) {
        return a + b;
      }, 0), used: f[0] + f[1] + f[2] + f[5] + f[6] + (f[7] || 0), idle: f[3] };
    }
    if (memM) {
      try {
        var memRaw = atob(memM[1].trim());
        r.mem = {};
        var ml = memRaw.split("\n");
        for (var i = 0; i < ml.length; i++) {
          var m = ml[i].match(/^(\w+):\s+(\d+)\s*kB/i);
          if (m) r.mem[m[1]] = parseInt(m[2], 10);
        }
      } catch (e) {
      }
    }
    if (loadM) {
      var lf = loadM[1].trim().split(/\s+/);
      r.load = { l1: parseFloat(lf[0]) || 0, l5: parseFloat(lf[1]) || 0, l15: parseFloat(lf[2]) || 0 };
    }
    if (upM) {
      r.uptime = parseFloat(upM[1].trim().split(/\s+/)[0]) || 0;
    }
    return r;
  }
  function parseStatus(raw) {
    if (!raw) return {};
    var r = {}, lines = raw.trim().split("\n");
    for (var i = 0; i < lines.length; i++) {
      var ci = lines[i].indexOf(":");
      if (ci < 0) continue;
      var k = lines[i].slice(0, ci).trim(), v = lines[i].slice(ci + 1).trim();
      if (k === "Name") r.name = v;
      else if (k === "Pid") r.pid = parseInt(v, 10);
      else if (k === "PPid") r.ppid = parseInt(v, 10);
      else if (k === "Uid") r.uid = v.split(/\s+/);
      else if (k === "Threads") r.threads = parseInt(v, 10);
      else if (k === "VmSize") r.vsz = parseInt(v, 10);
      else if (k === "VmRSS") r.rss = parseInt(v, 10);
      else if (k === "VmSwap") r.swap = parseInt(v, 10);
    }
    return r;
  }
  function parseStat(raw) {
    if (!raw) return null;
    var p = raw.indexOf(")");
    if (p < 0) return null;
    var f = raw.slice(p + 2).trim().split(/\s+/);
    return { state: f[0], ppid: parseInt(f[1], 10) || 0, nice: parseInt(f[16], 10) || 0, pri: parseInt(f[15], 10) || 0, threads: parseInt(f[17], 10) || 0 };
  }
  function parseSmaps(raw) {
    if (!raw) return {};
    var r = {}, lines = raw.trim().split("\n");
    for (var i = 0; i < lines.length; i++) {
      var ci = lines[i].indexOf(":");
      if (ci < 0) continue;
      r[lines[i].slice(0, ci).trim()] = parseInt(lines[i].slice(ci + 1).replace(/kB/i, "").trim(), 10) || 0;
    }
    return r;
  }
  function parseFd(raw) {
    if (!raw) return [];
    var lines = raw.trim().split("\n"), fds = [];
    for (var i = 0; i < lines.length; i++) {
      var ai = lines[i].indexOf("->");
      if (ai < 0) continue;
      var left = lines[i].slice(0, ai).trim().split(/\s+/);
      fds.push({ fd: left[left.length - 1], target: lines[i].slice(ai + 2).trim() });
    }
    return fds;
  }
  function parseEnv(raw) {
    if (!raw) return [];
    return raw.trim().split("\n").filter(Boolean).map(function(l) {
      var ei = l.indexOf("=");
      return ei < 0 ? { k: l, v: "" } : { k: l.slice(0, ei), v: l.slice(ei + 1) };
    });
  }
  function h2i(h) {
    if (h.length !== 8) return h;
    return parseInt(h.slice(6, 8), 16) + "." + parseInt(h.slice(4, 6), 16) + "." + parseInt(h.slice(2, 4), 16) + "." + parseInt(h.slice(0, 2), 16);
  }
  var TS = { "01": "ESTABLISHED", "02": "SYN_SENT", "03": "SYN_RECV", "04": "FIN_WAIT1", "05": "FIN_WAIT2", "06": "TIME_WAIT", "07": "CLOSE", "08": "CLOSE_WAIT", "09": "LAST_ACK", "0A": "LISTEN", "0B": "CLOSING" };
  function parseNet(raw) {
    if (!raw) return [];
    var lines = raw.trim().split("\n"), conns = [];
    for (var i = 1; i < lines.length; i++) {
      var f = lines[i].trim().split(/\s+/);
      if (f.length < 4) continue;
      var lc = f[1].lastIndexOf(":"), rc = f[2].lastIndexOf(":");
      conns.push({ proto: "tcp", local: h2i(f[1].slice(0, lc)) + ":" + parseInt(f[1].slice(lc + 1), 16), remote: h2i(f[2].slice(0, rc)) + ":" + parseInt(f[2].slice(rc + 1), 16), state: TS[f[3]] || f[3] });
    }
    return conns;
  }
  async function collectOverview() {
    try {
      var sr = await exec(CMD.sys());
      var pr = await exec(CMD.procs());
      var sysData = parseSys(sr.stdout);
      var procs = parsePs(pr.stdout);
      return { procs, cpuStat: sysData.cpuStat || null, mem: sysData.mem || null, load: sysData.load || null, uptime: sysData.uptime || 0 };
    } catch (e) {
      return { procs: [], cpuStat: null, mem: null, load: null, uptime: 0 };
    }
  }
  async function collectDetail(pid) {
    try {
      var cmds = CMD.detail(pid);
      var results = [];
      for (var i = 0; i < cmds.length; i++) {
        var r = await exec(cmds[i]);
        results.push(r.stdout || "");
      }
      var st = parseStat(results[1]), status = parseStatus(results[0]), mem = parseSmaps(results[3]);
      if (Object.keys(mem).length === 0) {
        var fb2 = await exec("cat /proc/" + pid + "/smaps 2>/dev/null | grep '^Pss:' | awk '{sum+=$2}END{print sum}'");
        mem = { Pss: parseInt(fb2.stdout, 10) || 0 };
      }
      return { pid, stat: st, status, cmdline: (results[2] || "").trim(), memory: mem, fds: parseFd(results[4]), environ: parseEnv(results[5]), threads: (results[6] || "").trim().split("\n").filter(Boolean) };
    } catch (e) {
      return { pid, error: String(e) };
    }
  }
  async function collectNet() {
    try {
      var r = await exec(CMD.net());
      return parseNet(r.stdout);
    } catch (e) {
      return [];
    }
  }
  var prevCpu = null, timer = null, polling = false, paused = false;
  function startPoll(ms) {
    stopPoll();
    function tick() {
      if (paused || polling) {
        timer = setTimeout(tick, ms || 3e3);
        return;
      }
      polling = true;
      collectOverview().then(function(d) {
        polling = false;
        if (!d) return;
        var cpuPct = 0;
        if (d.cpuStat) {
          if (prevCpu) {
            var uDiff = d.cpuStat.used - prevCpu.used, tDiff = d.cpuStat.total - prevCpu.total;
            cpuPct = tDiff > 0 ? Math.max(0, Math.min(100, uDiff / tDiff * 100)) : 0;
          }
          prevCpu = d.cpuStat;
        }
        setSt({ procs: d.procs, cpuStat: d.cpuStat, cpuPct, mem: d.mem, load: d.load, uptime: d.uptime });
        if (S.selPid) refreshDetail(S.selPid);
      }).catch(function() {
      }).then(function() {
        timer = setTimeout(tick, ms || 3e3);
      });
    }
    timer = setTimeout(tick, 600);
  }
  function stopPoll() {
    if (timer) clearTimeout(timer);
    timer = null;
  }
  function forceRefresh() {
    collectOverview().then(function(d) {
      if (!d) return;
      setSt(d);
    }).catch(function() {
    });
  }
  document.addEventListener("visibilitychange", function() {
    paused = document.hidden;
    if (!document.hidden) forceRefresh();
  });
  var pSortKey = "pid", pSortDir = "asc";
  function renderTable() {
    var list = S.procs.slice(), q = S.search.toLowerCase();
    if (q) list = list.filter(function(p2) {
      return String(p2.pid).indexOf(q) >= 0 || p2.name && p2.name.toLowerCase().indexOf(q) >= 0;
    });
    if (!S.settings.showKernel) list = list.filter(function(p2) {
      return p2.name && !p2.name.startsWith("[");
    });
    if (!S.settings.showSystem) list = list.filter(function(p2) {
      return p2.user !== "root" && p2.user !== "system";
    });
    list.sort(function(a, b) {
      var va = a[pSortKey], vb = b[pSortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      var c = va < vb ? -1 : va > vb ? 1 : 0;
      return pSortDir === "desc" ? -c : c;
    });
    var fl = $("filter-r"), pc = $("proc-count");
    if (q) {
      fl.classList.remove("h");
      fl.textContent = "Showing " + list.length + " of " + S.procs.length + " processes";
    } else {
      fl.classList.add("h");
    }
    if (pc) pc.textContent = list.length + " procs";
    var h = '<table class="proc-table"><thead><tr><th style="width:24px"></th><th style="width:55px" data-sk="pid" class="' + (pSortKey === "pid" ? "sorted" : "") + '">PID' + (pSortKey === "pid" ? pSortDir === "asc" ? " \u25B4" : " \u25BE" : "") + '</th><th data-sk="name" class="' + (pSortKey === "name" ? "sorted" : "") + '">Name' + (pSortKey === "name" ? pSortDir === "asc" ? " \u25B4" : " \u25BE" : "") + '</th><th style="width:60px;text-align:right" data-sk="rssKb" class="' + (pSortKey === "rssKb" ? "sorted" : "") + '">RSS' + (pSortKey === "rssKb" ? pSortDir === "asc" ? " \u25B4" : " \u25BE" : "") + '</th><th style="width:60px">User</th></tr></thead><tbody>';
    for (var i = 0; i < list.length; i++) {
      var p = list[i], sel = p.pid === S.selPid ? ' class="selected"' : "";
      h += '<tr data-pid="' + p.pid + '"' + sel + '><td><span class="state-dot ' + fd(p.state) + '"></span></td><td>' + p.pid + '</td><td style="max-width:160px">' + esc(p.name) + '</td><td style="text-align:right">' + fb((p.rssKb || 0) * 1024) + "</td><td>" + esc(p.user) + "</td></tr>";
    }
    h += "</tbody></table>";
    $("process-list").innerHTML = list.length === 0 ? '<div class="empty"><span>No processes</span></div>' : h;
    var rows = $("process-list").querySelectorAll("tbody tr");
    for (var j = 0; j < rows.length; j++) {
      rows[j].addEventListener("click", function() {
        var pid = parseInt(this.getAttribute("data-pid"), 10);
        if (!isNaN(pid)) selectProc(pid);
      });
    }
    var ths = $("process-list").querySelectorAll("th[data-sk]");
    for (var k = 0; k < ths.length; k++) {
      ths[k].addEventListener("click", function() {
        var sk = this.getAttribute("data-sk");
        if (pSortKey === sk) pSortDir = pSortDir === "asc" ? "desc" : "asc";
        else {
          pSortKey = sk;
          pSortDir = "asc";
        }
        renderTable();
      });
    }
  }
  function onSort(sk) {
    if (pSortKey === sk) pSortDir = pSortDir === "asc" ? "desc" : "asc";
    else {
      pSortKey = sk;
      pSortDir = "asc";
    }
    renderTable();
  }
  function selectProc(pid) {
    S.selPid = pid;
    var d = $("detail");
    d.classList.add("on");
    var db = $("dbody");
    db.innerHTML = '<div class="empty"><div class="spin"></div><span>Loading...</span></div>';
    setSt({ selPid: pid });
    renderTable();
    collectDetail(pid).then(function(dt) {
      if (dt.error) {
        db.innerHTML = '<div class="empty"><span class="txd">Error: ' + dt.error + "</span></div>";
        return;
      }
      S.detail = dt;
      renderDetail(dt);
    }).catch(function(e) {
      db.innerHTML = '<div class="empty"><span class="txd">Error: ' + String(e) + "</span></div>";
    });
  }
  function refreshDetail(pid) {
    if (S.selPid !== pid) return;
    collectDetail(pid).then(function(dt) {
      if (!dt.error) {
        S.detail = dt;
        renderDetail(dt);
      }
    }).catch(function() {
    });
  }
  function renderDetail(d) {
    var s = d.status || {}, st = d.stat || {}, mem = d.memory || {}, name = s.name || "?", state = s.state || st.state || "S";
    var db = $("dbody");
    db.innerHTML = "";
    db.appendChild(H(
      "div",
      { c: "dhdr" },
      H("span", { c: "dn" }, name),
      H(
        "div",
        { c: "flex aic gap8" },
        H("span", { c: "txs tx2" }, "Nice:"),
        H("input", { type: "number", min: "-20", max: "19", value: st.nice || 0, id: "rnv", s: { width: "44px", background: "var(--bg)", border: "1px solid var(--bd)", borderRadius: "4px", color: "var(--tx)", fontSize: "12px", textAlign: "center", padding: "2px" } }),
        H("button", { c: "btn", s: { height: "26px", fontSize: "11px" }, on: { click: function() {
          onRenice(d.pid);
        } } }, "Set"),
        H("button", { c: "btn btn-danger", s: { height: "26px", fontSize: "11px" }, on: { click: function() {
          onKill(d.pid, name);
        } } }, "Kill")
      )
    ));
    var ov = [];
    ov.push(kv("PID", d.pid), kv("PPID", s.ppid || st.ppid || "--"), kv("Name", name));
    ov.push(kv("State", H("span", { c: "flex aic gap4" }, H("span", { c: "state-dot " + fd(state) }), fs(state))));
    if (s.uid) ov.push(kv("User", s.uid.slice(0, 2).join(",")));
    ov.push(kv("Threads", s.threads || st.threads || "--"));
    ov.push(kv("Nice", st.nice || 0), kv("Cmdline", d.cmdline || "--"));
    db.appendChild(sec("Overview", true, H("dl", { c: "dkv" }, ov)));
    var mk = [];
    if (Object.keys(mem).length > 0) {
      for (var mk2 in mem) {
        if (mem[mk2] != null) mk.push(kv(mk2.replace(/_/g, " "), fb(mem[mk2] * 1024)));
      }
    } else {
      if (s.rss) mk.push(kv("RSS", fb(s.rss * 1024)));
      if (s.vsz) mk.push(kv("VSS", fb(s.vsz * 1024)));
      if (s.swap) mk.push(kv("Swap", fb(s.swap * 1024)));
    }
    db.appendChild(sec("Memory", false, H("dl", { c: "dkv" }, mk)));
    var fds = d.fds || [], frows = [];
    for (var fi = 0; fi < Math.min(fds.length, 80); fi++) frows.push(H("tr", {}, H("td", { s: { width: "44px" } }, fds[fi].fd), H("td", { s: { wordBreak: "break-all" } }, fds[fi].target)));
    db.appendChild(sec("Files (" + fds.length + ")", false, frows.length > 0 ? H("table", { c: "dtbl" }, H("thead", {}, H("tr", {}, H("th", {}, "FD"), H("th", {}, "Target"))), H("tbody", {}, frows)) : H("span", { c: "tx3" }, "No data")));
    var envs = d.environ || [], erows = [];
    for (var ei = 0; ei < Math.min(envs.length, 40); ei++) erows.push(H("tr", {}, H("td", { s: { fontWeight: "500", width: "40%" } }, envs[ei].k), H("td", { s: { wordBreak: "break-all" } }, envs[ei].v)));
    db.appendChild(sec("Environment (" + envs.length + ")", false, erows.length > 0 ? H("table", { c: "dtbl" }, H("thead", {}, H("tr", {}, H("th", {}, "Key"), H("th", {}, "Value"))), H("tbody", {}, erows)) : H("span", { c: "tx3" }, "No data")));
    var tids = d.threads || [], trows = [];
    for (var ti = 0; ti < tids.length; ti++) trows.push(H("tr", {}, H("td", {}, String(tids[ti])), H("td", {}, tids[ti] == d.pid ? name : "Thread-" + tids[ti])));
    db.appendChild(sec("Threads (" + tids.length + ")", false, trows.length > 0 ? H("table", { c: "dtbl" }, H("thead", {}, H("tr", {}, H("th", {}, "TID"), H("th", {}, "Name"))), H("tbody", {}, trows)) : H("span", { c: "tx3" }, "No data")));
    db.appendChild(sec("Network", false, H("button", { c: "btn txsm", on: { click: loadNet } }, "Load"), H("div", { id: "net-body", s: { marginTop: "8px" } })));
  }
  function sec(title, open) {
    var args = Array.prototype.slice.call(arguments, 2);
    return H("details", { c: "sec", open: open ? "open" : void 0 }, H("summary", {}, title), H("div", { c: "sb" }, args));
  }
  function kv(k, v) {
    return [H("dt", {}, k), H("dd", {}, v instanceof Node ? v : String(v))];
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  async function loadNet() {
    var el = $("net-body");
    if (!el) return;
    el.innerHTML = '<div class="spin"></div>';
    var conns = await collectNet();
    var rows = [];
    for (var i = 0; i < Math.min(conns.length, 50); i++) {
      var c = conns[i];
      rows.push(H("tr", {}, H("td", {}, c.proto), H("td", { c: "tmono" }, c.local), H("td", { c: "tmono" }, c.remote), H("td", {}, c.state)));
    }
    el.innerHTML = "";
    el.appendChild(rows.length > 0 ? H("table", { c: "dtbl" }, H("thead", {}, H("tr", {}, H("th", {}, "Proto"), H("th", {}, "Local"), H("th", {}, "Remote"), H("th", {}, "State"))), H("tbody", {}, rows)) : H("span", { c: "tx3" }, "No connections"));
  }
  async function onKill(pid, name) {
    var ok = await confirm("Kill " + name + " (PID:" + pid + ")?");
    if (!ok) return;
    var r = await exec(CMD.kill(pid));
    if (r.errno === 0) {
      try {
        toast("Process " + pid + " killed");
      } catch (e) {
      }
      S.selPid = null;
      $("detail").classList.remove("on");
      renderTable();
      forceRefresh();
    } else {
      try {
        toast("Failed: " + (r.stderr || "error"));
      } catch (e) {
      }
    }
  }
  function onRenice(pid) {
    var v = parseInt($("rnv").value, 10);
    if (isNaN(v) || v < -20 || v > 19) {
      try {
        toast("Priority: -20 to 19");
      } catch (e) {
      }
      return;
    }
    exec(CMD.renice(pid, v)).then(function(r) {
      if (r.errno === 0) {
        selectProc(pid);
        try {
          toast("Priority set to " + v);
        } catch (e) {
        }
      } else {
        try {
          toast("Failed: " + (r.stderr || "error"));
        } catch (e) {
        }
      }
    });
  }
  function confirm(msg) {
    return new Promise(function(resolve) {
      var ov = H("div", { c: "modal-overlay" });
      ov.innerHTML = '<div class="modal"><div class="modal-h">Confirm</div><div class="modal-b">' + msg + '</div><div class="modal-f"><button class="btn" id="cf-no">Cancel</button><button class="btn btn-danger" id="cf-yes">Confirm</button></div></div>';
      ov.addEventListener("click", function(e) {
        if (e.target === ov) {
          ov.remove();
          resolve(false);
        }
      });
      document.body.appendChild(ov);
      $("cf-no").addEventListener("click", function() {
        ov.remove();
        resolve(false);
      });
      $("cf-yes").addEventListener("click", function() {
        ov.remove();
        resolve(true);
      });
    });
  }
  function toggleSettings() {
    var iv = S.settings.interval / 1e3, ov = H("div", { c: "modal-overlay" });
    ov.innerHTML = '<div class="modal"><div class="modal-h">Settings</div><div class="modal-b"><div class="setting-row"><label>Refresh (s)</label><input id="st-ref" type="range" min="1" max="30" value="' + iv + '" style="width:120px"><span id="st-rv" style="width:32px">' + iv + 's</span></div><div class="setting-row"><label>Show kernel threads</label><label class="toggle"><input id="st-k" type="checkbox"' + (S.settings.showKernel ? " checked" : "") + '><span class="slider"></span></label></div><div class="setting-row"><label>Show system</label><label class="toggle"><input id="st-s" type="checkbox"' + (S.settings.showSystem ? " checked" : "") + '><span class="slider"></span></label></div></div><div class="modal-f"><button class="btn" id="st-cancel">Cancel</button><button class="btn btn-primary" id="st-save">Save</button></div></div>';
    ov.addEventListener("click", function(e) {
      if (e.target === ov) ov.remove();
    });
    document.body.appendChild(ov);
    $("st-ref").addEventListener("input", function() {
      $("st-rv").textContent = this.value + "s";
    });
    $("st-cancel").addEventListener("click", function() {
      ov.remove();
    });
    $("st-save").addEventListener("click", function() {
      S.settings.interval = parseInt($("st-ref").value, 10) * 1e3;
      S.settings.showKernel = $("st-k").checked;
      S.settings.showSystem = $("st-s").checked;
      try {
        localStorage.setItem("ksape_st", JSON.stringify(S.settings));
      } catch (e) {
      }
      stopPoll();
      startPoll(S.settings.interval);
      renderTable();
      ov.remove();
    });
  }
  function toggleSysInfo() {
    var ov = H("div", { c: "modal-overlay" });
    ov.innerHTML = '<div class="modal" style="max-width:520px"><div class="modal-h">System Info</div><div class="modal-b" id="si-body"><div style="text-align:center;padding:24px"><div class="spin"></div></div></div><div class="modal-f"><button class="btn" id="si-close">Close</button></div></div>';
    ov.addEventListener("click", function(e) {
      if (e.target === ov) ov.remove();
    });
    document.body.appendChild(ov);
    $("si-close").addEventListener("click", function() {
      ov.remove();
    });
    exec(CMD.sysinfo()).then(function(r) {
      var t = (r.stdout || "").replace(/</g, "&lt;"), p = t.split("---\n");
      $("si-body").innerHTML = '<details class="sec" open><summary>System</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;margin:0">' + (p[0] || "N/A") + '</pre></div></details><details class="sec"><summary>Memory</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;margin:0">' + (p[1] || "N/A") + '</pre></div></details><details class="sec"><summary>Storage</summary><div class="sb"><pre style="font-size:11px;font-family:var(--mono);white-space:pre-wrap;margin:0">' + (p[2] || "N/A") + '</pre></div></details><details class="sec"><summary>Kernel Log</summary><div class="sb"><pre style="font-size:10px;font-family:var(--mono);white-space:pre-wrap;max-height:160px;overflow-y:auto;margin:0">' + (p[3] || "N/A") + "</pre></div></details>";
    }).catch(function(e) {
      $("si-body").innerHTML = '<span class="txd">Error: ' + String(e) + "</span>";
    });
  }
  function updateStatus() {
    var s = S, total = s.mem && s.mem.MemTotal ? s.mem.MemTotal : 0, avail = s.mem && (s.mem.MemAvailable || s.mem.MemFree) ? s.mem.MemAvailable || s.mem.MemFree : 0;
    var memPct = total > 0 ? (total - avail) / total * 100 : 0;
    $("sbar").innerHTML = '<span class="sbar-item"><span class="sl">CPU</span><span class="sbar-b"><span class="bt"><span class="bf bf-cpu" style="width:' + Math.min(s.cpuPct, 100).toFixed(0) + '%"></span></span><span class="sv">' + fx(s.cpuPct) + '%</span></span></span><span class="sbar-item"><span class="sl">MEM</span><span class="sbar-b"><span class="bt"><span class="bf bf-mem" style="width:' + Math.min(memPct, 100).toFixed(0) + '%"></span></span><span class="sv">' + fb((total - avail) * 1024) + " / " + fb(total * 1024) + '</span></span></span><span class="sbar-item"><span class="sl">Load</span><span class="sv">' + (s.load ? fx(s.load.l1, 2) : "--") + " " + (s.load ? fx(s.load.l5, 2) : "--") + " " + (s.load ? fx(s.load.l15, 2) : "--") + '</span></span><span class="sbar-item"><span class="sl">Up</span><span class="sv">' + ft(s.uptime) + '</span></span><span class="sbar-item"><span class="sl">Procs</span><span class="sv">' + s.procs.length + "</span></span>";
  }
  var cpuHist = [], memHist = [];
  function pushH(a, v) {
    a.push(Number(v) || 0);
    if (a.length > 30) a.shift();
  }
  function renderPerf() {
    var s = S, cpu = s.cpuPct || 0;
    var total = s.mem && s.mem.MemTotal ? s.mem.MemTotal : 0, avail = s.mem && (s.mem.MemAvailable || s.mem.MemFree) ? s.mem.MemAvailable || s.mem.MemFree : 0;
    var memPct = total > 0 ? (total - avail) / total * 100 : 0;
    var load = s.load, cf = s.cpuFreq && s.cpuFreq[0] ? s.cpuFreq[0] : 0;
    pushH(cpuHist, cpu);
    pushH(memHist, memPct);
    var el = $("perf-dash");
    if (!el) return;
    el.innerHTML = '<div class="perf-card"><div class="pc-h"><span>CPU</span><span class="tmono">' + fx(cpu) + '%</span></div><div class="pc-bar"><div class="pc-bf cpu" style="width:' + Math.min(cpu, 100).toFixed(0) + '%"></div></div>' + spark(cpuHist, "ac") + '</div><div class="perf-card"><div class="pc-h"><span>Memory</span><span class="tmono">' + fx(memPct) + '%</span></div><div class="pc-bar"><div class="pc-bf mem" style="width:' + Math.min(memPct, 100).toFixed(0) + '%"></div></div>' + spark(memHist, "gr") + '</div><div class="perf-card"><div class="pc-h"><span>Load</span></div><div class="pc-v">' + (load ? fx(load.l1, 2) : "--") + '</div><div class="txs tx2">1m/5m/15m: ' + (load ? fx(load.l5, 2) + "/" + fx(load.l15, 2) : "--/--") + '</div></div><div class="perf-card"><div class="pc-h"><span>CPU Clock</span></div><div class="pc-v">' + (cf > 0 ? (cf / 1e3).toFixed(0) : "--") + ' <span class="txs tx2">MHz</span></div><div class="txs tx2">Up: ' + ft(s.uptime) + "</div></div>";
  }
  function spark(arr, cv) {
    var max = 1;
    for (var i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
    var h = "";
    for (var i = 0; i < arr.length; i++) {
      var pct = max > 0 ? arr[i] / max * 100 : 0;
      if (pct < 2) pct = 2;
      h += '<span class="sk" style="height:' + pct.toFixed(0) + "%;background:var(--" + cv + ')"></span>';
    }
    return '<div class="spark">' + h + "</div>";
  }
  function init() {
    try {
      var saved = localStorage.getItem("ksape_st");
      if (saved) {
        var s = JSON.parse(saved);
        S.settings.interval = s.interval || 3e3;
        S.settings.showKernel = s.showKernel || false;
        S.settings.showSystem = s.showSystem !== false;
      }
    } catch (e) {
    }
    $("search-in").addEventListener("input", function() {
      var self = this;
      clearTimeout(self._t);
      self._t = setTimeout(function() {
        S.search = self.value;
        renderTable();
      }, 150);
    });
    $("btn-settings").addEventListener("click", toggleSettings);
    $("btn-sysinfo").addEventListener("click", toggleSysInfo);
    window._ksRefresh = forceRefresh;
    renderTable();
    updateStatus();
    renderPerf();
    exec(CMD.freq()).then(function(r) {
      var f = parseInt((r.stdout || "").trim(), 10);
      if (f > 0) S.cpuFreq = [f];
    }).catch(function() {
    });
    startPoll(S.settings.interval);
    sub("*", function() {
      updateStatus();
      renderPerf();
    });
    sub("procs", function() {
      renderTable();
    });
  }
  window.addEventListener("error", function(e) {
    var el = $("process-list");
    if (el) el.innerHTML = '<div class="empty"><span class="txd">Error: ' + (e.message || "unknown") + "</span></div>";
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
//# sourceMappingURL=bundle.js.map
