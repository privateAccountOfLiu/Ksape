// Safe number formatting
export function fx(v, d) { var n = Number(v); return isNaN(n) ? '--' : n.toFixed(d || 1); }
export function fb(b) { if (b == null || isNaN(b)) return '--'; var a = Math.abs(b); if (a >= 1073741824) return (b / 1073741824).toFixed(1) + 'GB'; if (a >= 1048576) return (b / 1048576).toFixed(1) + 'MB'; if (a >= 1024) return (b / 1024).toFixed(0) + 'KB'; return b + 'B'; }
export function ft(s) { if (!s || isNaN(s)) return '--'; var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d > 0 ? d + 'd' + h + 'h' : h > 0 ? h + 'h' + m + 'm' : m + 'm'; }
export function fs(s) { var m = { R: 'Running', S: 'Sleeping', D: 'Unint', T: 'Stopped', Z: 'Zombie', I: 'Idle' }; return m[s] || s || '?'; }
export function fd(s) { var m = { R: 'R', S: 'S', D: 'S', I: 'S', T: 'T', t: 'T', Z: 'Z' }; return m[s] || 'S'; }
export function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// DOM helpers
export function $(s) { return document.getElementById(s); }
export function H(t, a) {
  var e = document.createElement(t);
  if (a) for (var k in a) {
    if (k === 'c') e.className = a[k];
    else if (k === 't') e.textContent = a[k];
    else if (k === 'h') e.innerHTML = a[k];
    else if (k === 's') for (var sk in a[k]) e.style[sk] = a[k][sk];
    else if (k === 'on') for (var ek in a[k]) e.addEventListener(ek, a[k][ek]);
    else e.setAttribute(k, a[k]);
  }
  for (var i = 2; i < arguments.length; i++) appendKids(e, arguments[i]);
  return e;
}
function appendKids(e, c) {
  if (c == null) return;
  if (Array.isArray(c)) { for (var j = 0; j < c.length; j++) appendKids(e, c[j]); }
  else if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(c));
  else if (c instanceof Node) e.appendChild(c);
}
