// The small bridge the game sees as window.retracoonSteam (src/platform/native.ts).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('retracoonSteam', {
  ticket: () => ipcRenderer.invoke('steam:ticket'),
  name: () => ipcRenderer.invoke('steam:name'),
  quit: () => ipcRenderer.send('steam:quit'),
  setFullscreen: (on) => ipcRenderer.send('steam:fullscreen', !!on),
  setWindowSize: (w, h) => ipcRenderer.send('steam:window-size', Number(w), Number(h)),
  onFullscreen: (cb) => ipcRenderer.on('steam:fullscreen-changed', (_e, on) => cb(!!on)),
});
