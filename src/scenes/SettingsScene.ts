import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, panel, BTN, Button } from '../ui';
import { sfx } from '../audio';
import { store, save } from '../save';
import { COL } from '../gfx/palette';
import { isNative } from '../platform/native';
import { hasDisplaySettings, hasWindowSize, isFullscreen, setFullscreen, setWindowSize, WINDOW_SIZES } from '../platform/display';
import { ACTIONS, ACTION_NAMES, Action, onAction, captureNext, keyBinds, padBinds, keyName, padName, rebind, resetBinds, padConnected } from '../input';

type Tab = 'sound' | 'display' | 'keys' | 'pad';
const TAB_NAMES: Record<Tab, string> = { sound: 'SOUND', display: 'DISPLAY', keys: 'KEYBOARD', pad: 'CONTROLLER' };
const TOP = 46;

// Settings: volume, full screen or window, screen shake, and key and controller
// bindings. Opened from the title screen and the pause screen.
export class SettingsScene extends Phaser.Scene {
  private from = 'Title';
  private tab: Tab = 'sound';
  private layer: Phaser.GameObjects.GameObject[] = [];
  private tabs = {} as Record<Tab, Button>;
  private listening: { kind: 'keys' | 'pad'; a: Action } | null = null;

  constructor() {
    super('Settings');
  }

  create(data: { from?: string; tab?: Tab }) {
    this.from = data.from ?? 'Title';
    this.layer = [];
    this.listening = null;
    this.tabs = {} as Record<Tab, Button>;
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.96).setOrigin(0).setInteractive();
    text(this, W / 2, 12, 'SETTINGS', { scale: 2, color: COL.white });
    // Phones have no keyboard or windows; a controller works everywhere.
    const tabs: Tab[] = isNative() ? ['sound', 'display', 'pad'] : ['sound', 'display', 'keys', 'pad'];
    const tw = Math.min(90, Math.floor((W - 16 - (tabs.length - 1) * 4) / tabs.length));
    tabs.forEach((t, i) => {
      this.tabs[t] = button(this, W / 2 + (i - (tabs.length - 1) / 2) * (tw + 4), 30, tw, 16, TAB_NAMES[t], () => this.show(t), { depth: 5 });
    });
    onAction(this, 'back', () => this.leave());
    this.scale.on('enterfullscreen', this.redraw, this);
    this.scale.on('leavefullscreen', this.redraw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('enterfullscreen', this.redraw, this);
      this.scale.off('leavefullscreen', this.redraw, this);
      captureNext(null);
    });
    this.show(data.tab && tabs.includes(data.tab) ? data.tab : 'sound');
  }

  private leave() {
    captureNext(null);
    this.scene.stop();
    this.scene.resume(this.from);
  }

  private redraw() {
    if (this.scene.isActive()) this.show(this.tab);
  }

  private show(t: Tab) {
    if (this.tab !== t) captureNext(null), (this.listening = null);
    this.tab = t;
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
    (Object.keys(this.tabs) as Tab[]).forEach((k) => this.tabs[k].setColors(k === t ? BTN.gold.fill : BTN.blue.fill, 0x1a1c2c, k === t ? BTN.gold.light : BTN.blue.light));
    if (t === 'sound') this.soundTab();
    else if (t === 'display') this.displayTab();
    else this.bindTab(t);
    const back = button(this, W - 50, H - 14, 84, 20, 'BACK', () => this.leave(), { ...BTN.green, depth: 5 });
    this.layer.push(back.c);
  }

  private add_<T extends Phaser.GameObjects.GameObject>(o: T) {
    this.layer.push(o);
    return o;
  }

  // A labelled settings row: name on the left, controls added by the caller.
  private rowBox(y: number, label: string) {
    const bw = Math.min(W - 16, 340);
    const x0 = W / 2 - bw / 2;
    const g = this.add_(this.add.graphics());
    panel(g, x0, y - 10, bw, 20, 0x29366f, 0x1a1c2c);
    this.add_(text(this, x0 + 8, y, label, { origin: 0, color: COL.light }));
    return { x0, bw };
  }

  // ---------------------------------------------------------------- sound

  private soundTab() {
    const vols: [keyof typeof store.vol, string][] = [
      ['master', 'VOLUME'],
      ['music', 'MUSIC'],
      ['sfx', 'EFFECTS'],
    ];
    vols.forEach(([k, label], i) => {
      const y = TOP + 14 + i * 26;
      const { x0, bw } = this.rowBox(y, label);
      const bar = this.add_(this.add.graphics());
      const val = this.add_(text(this, x0 + bw - 54, y, '', { origin: 1, color: COL.white }));
      const draw = () => {
        bar.clear();
        const v = store.vol[k];
        for (let p = 0; p < 10; p++) {
          const px = x0 + 72 + p * 9;
          bar.fillStyle(0x1a1c2c, 1).fillRect(px, y - 4, 8, 8);
          bar.fillStyle(p < v ? 0x73eff7 : 0x333c57, 1).fillRect(px + 1, y - 3, 6, 6);
        }
        val.setText(`${v * 10}%`);
      };
      const change = (d: number) => {
        sfx.unlock();
        store.vol = { ...store.vol, [k]: Math.max(0, Math.min(10, store.vol[k] + d)) };
        save();
        sfx.applyVolume();
        draw();
      };
      this.add_(button(this, x0 + bw - 38, y, 22, 16, '-', () => change(-1), { depth: 5 }).c);
      this.add_(button(this, x0 + bw - 14, y, 22, 16, '+', () => change(1), { ...BTN.green, depth: 5 }).c);
      draw();
    });
    const y = TOP + 14 + 3 * 26;
    const { x0, bw } = this.rowBox(y, 'SOUND');
    const mute = button(this, x0 + bw - 40, y, 74, 16, sfx.muted ? 'OFF' : 'ON', () => {
      sfx.unlock();
      sfx.setMuted(!sfx.muted);
      mute.setLabel(sfx.muted ? 'OFF' : 'ON');
    }, { depth: 5 });
    this.add_(mute.c);
  }

  // ---------------------------------------------------------------- display

  private displayTab() {
    let y = TOP + 14;
    if (hasDisplaySettings()) {
      const { x0, bw } = this.rowBox(y, 'SCREEN');
      const full = isFullscreen();
      this.add_(
        button(this, x0 + bw - 56, y, 106, 16, full ? 'FULL SCREEN' : 'WINDOWED', () => {
          setFullscreen(!isFullscreen());
          this.time.delayedCall(250, () => this.redraw());
          this.redraw();
        }, { depth: 5 }).c,
      );
      y += 26;
      if (hasWindowSize()) {
        const r = this.rowBox(y, 'WINDOW SIZE');
        const [w, h] = WINDOW_SIZES[store.windowSize] ?? WINDOW_SIZES[1];
        const prev = button(this, r.x0 + r.bw - 98, y, 18, 16, '<', () => (setWindowSize(store.windowSize - 1), this.redraw()), { depth: 5 });
        this.add_(text(this, r.x0 + r.bw - 56, y, `${w} X ${h}`, { color: full ? COL.grey : COL.white }));
        const next = button(this, r.x0 + r.bw - 14, y, 18, 16, '>', () => (setWindowSize(store.windowSize + 1), this.redraw()), { depth: 5 });
        prev.setEnabled(!full);
        next.setEnabled(!full);
        this.add_(prev.c);
        this.add_(next.c);
        y += 26;
      }
    }
    const { x0, bw } = this.rowBox(y, 'SCREEN SHAKE');
    const shake = button(this, x0 + bw - 40, y, 74, 16, store.shake ? 'ON' : 'OFF', () => {
      store.shake = !store.shake;
      save();
      shake.setLabel(store.shake ? 'ON' : 'OFF');
      if (store.shake) this.cameras.main.shake(120, 0.008);
    }, { depth: 5 });
    this.add_(shake.c);
    y += 22;
    if (hasWindowSize()) this.add_(text(this, W / 2, y, 'F11 OR ALT+ENTER ALSO SWITCHES FULL SCREEN', { color: COL.grey, maxWidth: W - 16, maxLines: 1 }));
  }

  // ---------------------------------------------------------------- bindings

  private bindTab(kind: 'keys' | 'pad') {
    const colW = Math.floor((W - 16 - 6) / 2);
    const rowH = 18;
    const half = Math.ceil(ACTIONS.length / 2);
    ACTIONS.forEach((a, i) => {
      const col = Math.floor(i / half);
      const x = 8 + col * (colW + 6) + colW / 2;
      const y = TOP + 8 + (i % half) * rowH;
      const on = this.listening?.kind === kind && this.listening.a === a;
      const b = button(this, x, y, colW, rowH - 2, '', () => this.listen(kind, a), on ? { ...BTN.gold, depth: 5 } : { depth: 5 });
      b.label.destroy();
      const binds = kind === 'keys' ? keyBinds(a).map(keyName) : padBinds(a).map(padName);
      b.c.add(text(this, -colW / 2 + 6, 0, ACTION_NAMES[a], { origin: 0, color: COL.light }));
      b.c.add(
        text(this, colW / 2 - 6, 0, on ? (kind === 'keys' ? 'PRESS A KEY' : 'PRESS A BUTTON') : binds.join(' ') || '-', {
          origin: 1,
          color: on ? COL.yellow : COL.white,
          maxWidth: colW - 70,
          maxLines: 1,
        }),
      );
      this.add_(b.c);
    });
    const infoY = TOP + 8 + half * rowH + 2;
    const info =
      kind === 'keys'
        ? 'TAP AN ACTION, THEN PRESS ITS NEW KEY. ESC CANCELS.'
        : padConnected()
          ? `${padConnected()}. THE LEFT STICK MOVES TOO.`
          : 'NO CONTROLLER YET. CONNECT ONE AND PRESS A BUTTON.';
    this.add_(text(this, W / 2, infoY, info, { color: COL.grey, maxWidth: W - 16, maxLines: 1 }));
    const reset = button(this, 50, H - 14, 84, 20, 'RESET', () => {
      captureNext(null);
      this.listening = null;
      resetBinds(kind);
      this.redraw();
    }, { ...BTN.red, depth: 5 });
    this.add_(reset.c);
    // Redraw when a controller is plugged in or out, so the line above stays true.
    const had = padConnected();
    if (kind === 'pad') this.time.delayedCall(1000, () => this.tab === 'pad' && !this.listening && padConnected() !== had && this.redraw());
  }

  private listen(kind: 'keys' | 'pad', a: Action) {
    this.listening = { kind, a };
    this.redraw();
    captureNext((v) => {
      this.listening = null;
      if (kind === 'keys' && v.key && (v.key !== 'Escape' || a === 'back')) rebind('keys', a, v.key);
      if (kind === 'pad' && v.pad !== undefined) rebind('pad', a, v.pad);
      sfx.select();
      this.redraw();
    });
  }
}
