// KernelSU bridge — uses ksu global object directly (no npm package needed)
// Pattern based on: https://github.com/ChiseWaguri/systemapp_nuker

let cbCounter = 0;

export function exec(command) {
  return new Promise((resolve) => {
    const cbName = 'ksape_' + (Date.now()) + '_' + (cbCounter++);
    window[cbName] = function(errno, stdout, stderr) {
      resolve({ errno: errno || 0, stdout: stdout || '', stderr: stderr || '' });
      delete window[cbName];
    };
    try {
      ksu.exec(command, '{}', cbName);
    } catch (e) {
      resolve({ errno: -1, stdout: '', stderr: String(e) });
      delete window[cbName];
    }
  });
}

export function toast(msg) {
  try { ksu.toast(msg); } catch(e) {}
}

export function fullScreen(enable) {
  try { ksu.fullScreen(enable); } catch(e) {}
}

export function moduleInfo() {
  try { return ksu.moduleInfo(); } catch(e) { return { id: 'Ksape', name: 'Ksape', version: 'v0.1.0' }; }
}
