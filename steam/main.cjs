// Retracoon for Steam: the same web game in an Electron window, plus Steamworks for
// sign-in (a Web API auth ticket the server checks), the Steam overlay, achievements and
// stats, rich presence, Steam Cloud saves and the Steam Deck keyboard (docs/STEAM.md).
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

let pendingSize = null;

// Steam Cloud: one file holding the same JSON the game keeps in localStorage. The game
// saves often, so writes wait a moment and the last one wins; quitting writes at once.
const CLOUD_FILE = 'retracoon-save.json';
const cloudOn = () => {
  try {
    return !!steam && steam.cloud.isEnabledForAccount() && steam.cloud.isEnabledForApp();
  } catch {
    return false;
  }
};
let cloudPending = null;
let cloudTimer = null;
function flushCloud() {
  clearTimeout(cloudTimer);
  cloudTimer = null;
  if (cloudPending === null || !cloudOn()) return;
  try {
    steam.cloud.writeFile(CLOUD_FILE, cloudPending);
  } catch (e) {
    console.warn('Steam Cloud write failed:', e && e.message);
  }
  cloudPending = null;
}

// Rich presence strings live in Steamworks (steam/richpresence.vdf); these pick one.
const PRESENCE = { menu: '#Status_Menu', run: '#Status_Run', daily: '#Status_Daily' };

// Never bigger than the screen the window is on.
function setSize(win, w, h) {
  const { workAreaSize } = require('electron').screen.getDisplayMatching(win.getBounds());
  win.setContentSize(Math.min(w, workAreaSize.width), Math.min(h, workAreaSize.height));
  win.center();
}

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
  // Tell the game when full screen changes (F11, Alt+Enter), so its setting stays right.
  win.on('enter-full-screen', () => win.webContents.send('steam:fullscreen-changed', true));
  win.on('leave-full-screen', () => {
    win.webContents.send('steam:fullscreen-changed', false);
    if (pendingSize) setSize(win, ...pendingSize);
    pendingSize = null;
  });
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

  // Achievements the game has earned, and its stats. Steam ignores ones it already has.
  ipcMain.on('steam:achievements', (_e, ids, stats) => {
    if (!steam) return;
    try {
      for (const [name, v] of Object.entries(stats || {})) {
        const n = Math.floor(Number(v));
        if (Number.isFinite(n) && (steam.stats.getInt(name) ?? 0) < n) steam.stats.setInt(name, n);
      }
      for (const id of ids || []) if (!steam.achievement.isActivated(id)) steam.achievement.activate(id);
      steam.stats.store();
    } catch (e) {
      console.warn('Steam achievements failed:', e && e.message);
    }
  });
  ipcMain.on('steam:presence', (_e, status, vars) => {
    if (!steam || !PRESENCE[status]) return;
    try {
      for (const [k, v] of Object.entries(vars || {})) steam.localplayer.setRichPresence(k, String(v).slice(0, 64));
      steam.localplayer.setRichPresence('steam_display', PRESENCE[status]);
    } catch (e) {
      console.warn('Steam rich presence failed:', e && e.message);
    }
  });
  ipcMain.on('steam:cloud-read', (e) => {
    try {
      e.returnValue = cloudOn() && steam.cloud.fileExists(CLOUD_FILE) ? steam.cloud.readFile(CLOUD_FILE) : null;
    } catch {
      e.returnValue = null;
    }
  });
  ipcMain.on('steam:cloud-write', (_e, json) => {
    cloudPending = json;
    if (!cloudTimer) cloudTimer = setTimeout(flushCloud, 3000);
  });
  // Text boxes on a Steam Deck: show Steam's floating keyboard next to the box.
  ipcMain.on('steam:keyboard', (_e, x, y, w, h) => {
    try {
      if (steam && steam.utils.isSteamRunningOnSteamDeck()) void steam.utils.showFloatingGamepadTextInput(0, x, y, w, h).catch(() => {});
    } catch {
      /* older Steam client */
    }
  });
  ipcMain.on('steam:fullscreen', (e, on) => BrowserWindow.fromWebContents(e.sender)?.setFullScreen(!!on));
  // Windowed size from the game's settings. Leaving full screen can take a moment, so a
  // size asked for meanwhile is applied once the window is out of it.
  ipcMain.on('steam:window-size', (e, w, h) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    if (!win) return;
    if (win.isFullScreen()) pendingSize = [w, h];
    else setSize(win, w, h);
  });

  createWindow();
});

app.on('before-quit', flushCloud);
app.on('window-all-closed', () => app.quit());
