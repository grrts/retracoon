// Retracoon for Steam: the same web game in an Electron window, plus Steamworks for
// sign-in (a Web API auth ticket the server checks) and the Steam overlay.
// Build the game into ./game first: `npm run build:steam` in the repo root.
const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// The App ID from the Steamworks partner site. 480 is Valve's public test app
// (Spacewar), handy while the real App ID isn't set up yet.
const APP_ID = Number(process.env.STEAM_APP_ID || require('./package.json').steamAppId || 480);
// Must match AccountVerifier::STEAM_IDENTITY on the server.
const TICKET_IDENTITY = 'retracoon';

let steam = null;
try {
  const steamworks = require('steamworks.js');
  steam = steamworks.init(APP_ID);
  steamworks.electronEnableSteamOverlay();
} catch (e) {
  // Not started from Steam (or Steam isn't running). The game shows sign-in failing.
  console.warn('Steamworks unavailable:', e && e.message);
}

// Serve the game from app://game/ so module scripts and fetch work like on the web.
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 640,
    minHeight: 360,
    fullscreen: true,
    backgroundColor: '#1a1c2c',
    autoHideMenuBar: true,
    title: 'Retracoon',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  });
  win.removeMenu();
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11' || (input.key === 'Enter' && input.alt))) win.setFullScreen(!win.isFullScreen());
  });
  // Links (privacy policy and such) open in the player's browser, not in the game.
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
  win.loadURL('app://game/index.html');
}

app.whenReady().then(() => {
  const root = path.join(__dirname, 'game');
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const file = path.normalize(path.join(root, decodeURIComponent(pathname)));
    if (!file.startsWith(root)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  ipcMain.handle('steam:ticket', async () => {
    if (!steam) return null;
    try {
      const ticket = await steam.auth.getAuthTicketForWebApi(TICKET_IDENTITY);
      return ticket.getBytes().toString('hex');
    } catch (e) {
      console.warn('Steam ticket failed:', e && e.message);
      return null;
    }
  });
  ipcMain.handle('steam:name', () => (steam ? steam.localplayer.getName() : ''));
  ipcMain.on('steam:quit', () => app.quit());
  ipcMain.on('steam:fullscreen', (e, on) => BrowserWindow.fromWebContents(e.sender)?.setFullScreen(!!on));

  createWindow();
});

app.on('window-all-closed', () => app.quit());
