// Safe number formatting — all return '--' on invalid input
export function formatNum(v, d)   { var n = Number(v); return isNaN(n) ? '--' : n.toFixed(d || 1); }
export function formatBytes(b)    { if (b == null || isNaN(b)) return '--'; var a = Math.abs(b); if (a >= 1073741824) return (b / 1073741824).toFixed(1) + 'GB'; if (a >= 1048576) return (b / 1048576).toFixed(1) + 'MB'; if (a >= 1024) return (b / 1024).toFixed(0) + 'KB'; return b + 'B'; }
export function formatUptime(s)   { if (!s || isNaN(s)) return '--'; var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d > 0 ? d + 'd' + h + 'h' : h > 0 ? h + 'h' + m + 'm' : m + 'm'; }
export function stateLabel(c)     { var m = { R: 'Running', S: 'Sleeping', D: 'Unint', T: 'Stopped', Z: 'Zombie', I: 'Idle' }; return m[c] || c || '?'; }
export function stateDotClass(c)  { var m = { R: 'R', S: 'S', D: 'S', I: 'S', T: 'T', t: 'T', Z: 'Z' }; return m[c] || 'S'; }
export function escapeHtml(s)     { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
export function getEl(s)          { return document.getElementById(s); }

// DOM element builder: createEl('div', {c:'cls', t:'text', h:'<b>html</b>', s:{color:'red'}, on:{click:fn}}, ...children)
export function createEl(tag, attrs) {
  var el = document.createElement(tag);
  if (attrs) for (var k in attrs) {
    if (k === 'c') el.className = attrs[k];
    else if (k === 't') el.textContent = attrs[k];
    else if (k === 'h') el.innerHTML = attrs[k];
    else if (k === 's') for (var sk in attrs[k]) el.style[sk] = attrs[k][sk];
    else if (k === 'on') for (var ek in attrs[k]) el.addEventListener(ek, attrs[k][ek]);
    else el.setAttribute(k, attrs[k]);
  }
  for (var i = 2; i < arguments.length; i++) appendKids(el, arguments[i]);
  return el;
}

function appendKids(el, c) {
  if (c == null) return;
  if (Array.isArray(c)) { for (var j = 0; j < c.length; j++) appendKids(el, c[j]); }
  else if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(c));
  else if (c instanceof Node) el.appendChild(c);
}
