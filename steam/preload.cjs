// The small bridge the game sees as window.retracoonSteam (src/platform/native.ts).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('retracoonSteam', {
  ticket: () => ipcRenderer.invoke('steam:ticket'),
  name: () => ipcRenderer.invoke('steam:name'),
  quit: () => ipcRenderer.send('steam:quit'),
  setFullscreen: (on) => ipcRenderer.send('steam:fullscreen', !!on),
});
