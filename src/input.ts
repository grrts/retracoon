// Keyboard and controller input for desktop and Steam Deck. Raw keys and gamepad
// buttons become actions through the player's bindings (Settings > Keyboard/Controller).
// Scenes listen for actions with onAction(); anything they don't handle drives a focus
// ring that moves between the buttons and cards on screen, so every menu works with
// a d-pad and A without per-scene code.
import Phaser from 'phaser';
import { W, H } from './config';
import { store, save } from './save';

export const ACTIONS = ['confirm', 'back', 'pause', 'up', 'down', 'left', 'right', 'slot1', 'slot2', 'slot3', 'slot4', 'targetPrev', 'targetNext', 'bag'] as const;
export type Action = (typeof ACTIONS)[number];

export const ACTION_NAMES: Record<Action, string> = {
  confirm: 'CONFIRM',
  back: 'BACK',
  pause: 'PAUSE',
  up: 'UP',
  down: 'DOWN',
  left: 'LEFT',
  right: 'RIGHT',
  slot1: 'SKILL 1',
  slot2: 'SKILL 2',
  slot3: 'SKILL 3',
  slot4: 'SKILL 4',
  targetPrev: 'PREV FOE',
  targetNext: 'NEXT FOE',
  bag: 'BAG',
};

// Keys are KeyboardEvent.code values, so a binding sticks to the physical key.
export const DEFAULT_KEYS: Record<Action, string[]> = {
  confirm: ['Enter', 'Space'],
  back: ['Escape', 'Backspace'],
  pause: ['KeyP'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  slot1: ['Digit1'],
  slot2: ['Digit2'],
  slot3: ['Digit3'],
  slot4: ['Digit4'],
  targetPrev: ['KeyQ'],
  targetNext: ['KeyE', 'Tab'],
  bag: ['KeyI'],
};

// Standard gamepad layout (Xbox naming; the Steam Deck reports the same layout).
export const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'LS', 'RS', 'D-UP', 'D-DOWN', 'D-LEFT', 'D-RIGHT', 'HOME'];
export const DEFAULT_PAD: Record<Action, number[]> = {
  confirm: [0],
  back: [1],
  pause: [9],
  up: [12],
  down: [13],
  left: [14],
  right: [15],
  slot1: [2],
  slot2: [],
  slot3: [],
  slot4: [],
  targetPrev: [4],
  targetNext: [5],
  bag: [3],
};

export const keyBinds = (a: Action) => store.keys[a] ?? DEFAULT_KEYS[a];
export const padBinds = (a: Action) => store.pad[a] ?? DEFAULT_PAD[a];

export function keyName(code: string) {
  const named: Record<string, string> = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Escape: 'ESC', Backspace: 'BKSP', Space: 'SPACE', Enter: 'ENTER', Tab: 'TAB' };
  if (named[code]) return named[code];
  return code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/^Numpad/, 'NUM ')
    .replace(/(Left|Right)$/, (m) => ` ${m[0]}`)
    .toUpperCase();
}
export const padName = (b: number) => PAD_NAMES[b] ?? `B${b}`;

// Bind one key (or pad button) to an action. It leaves any other action it was on;
// an action left with nothing takes this action's old binding, so nothing gets lost.
export function rebind(kind: 'keys' | 'pad', a: Action, v: string | number) {
  const get = (x: Action) => (kind === 'keys' ? keyBinds(x) : padBinds(x)) as (string | number)[];
  const old = get(a);
  const set = (x: Action, list: (string | number)[]) => ((store[kind] as Record<string, unknown>)[x] = list);
  for (const x of ACTIONS) {
    if (x === a || !get(x).includes(v)) continue;
    const rest = get(x).filter((k) => k !== v);
    set(x, rest.length || !needed(x) ? rest : old.filter((k) => k !== v).slice(0, 1));
  }
  set(a, [v]);
  save();
}
// Menus can't be used without these.
const needed = (a: Action) => ['confirm', 'back', 'up', 'down', 'left', 'right'].includes(a);

export function resetBinds(kind: 'keys' | 'pad') {
  store[kind] = {};
  save();
}

// ---------------------------------------------------------------- scene listeners

type Handler = { scene: Phaser.Scene; actions: Action[]; cb: (a: Action) => void };
let handlers: Handler[] = [];

/** Call cb when one of the actions is pressed while this scene is the one on top. */
export function onAction(scene: Phaser.Scene, actions: Action | Action[], cb: (a: Action) => void) {
  const h: Handler = { scene, actions: Array.isArray(actions) ? actions : [actions], cb };
  handlers.push(h);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (handlers = handlers.filter((x) => x !== h)));
}

// While set, the next raw key or pad button goes here instead (rebinding).
let capture: ((v: { key?: string; pad?: number }) => void) | null = null;
export function captureNext(cb: typeof capture) {
  capture = cb;
}

// ---------------------------------------------------------------- focus ring

type Obj = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.GetBounds & Phaser.GameObjects.Components.Visible & { alpha?: number };

let game: Phaser.Game;
let focus: Obj | null = null;
let navMode = false; // the player is using keys or a pad to move around menus
let auto = true; // the ring sits on the scene's default, and follows it until the player moves
let ring: Phaser.GameObjects.Graphics | null = null;

function topScene(): Phaser.Scene | null {
  const list = game.scene.getScenes(true) as Phaser.Scene[];
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if (s.input?.enabled !== false) return s;
  }
  return null;
}

function shown(o: Obj) {
  for (let x: Obj | null = o; x; x = (x.parentContainer as unknown as Obj) ?? null) if (!x.visible || x.alpha === 0) return false;
  return true;
}

function candidates(s: Phaser.Scene): Obj[] {
  const list = ((s.input as unknown as { _list: Obj[] })._list ?? []) as Obj[];
  return list.filter((o) => {
    if (!o.active || !o.input?.enabled || !shown(o) || o.getData?.('disabled') || o.getData?.('nofocus')) return false;
    const b = o.getBounds();
    // Full-screen backdrops and blockers aren't things to press.
    return b.width > 1 && b.height > 1 && !(b.width >= W * 0.9 && b.height >= H * 0.9);
  });
}

const center = (o: Obj) => {
  const b = o.getBounds();
  return { x: b.centerX, y: b.centerY };
};

// Where the ring starts: a scene's marked default, else the biggest button.
function pickDefault(s: Phaser.Scene) {
  const c = candidates(s);
  const marked = c.find((o) => o.getData?.('focus'));
  if (marked) return marked;
  let best: Obj | null = null;
  let area = -1;
  const buttons = c.filter((o) => o.getData?.('button'));
  for (const o of buttons.length ? buttons : c) {
    const b = o.getBounds();
    // Same size (a row of skills or cards): the leftmost one.
    if (b.width * b.height > area + 1 || (Math.abs(b.width * b.height - area) <= 1 && best && b.x < best.getBounds().x)) {
      area = b.width * b.height;
      best = o;
    }
  }
  return best;
}

function setFocus(o: Obj | null) {
  if (focus === o) return;
  if (focus?.active) focus.emit('pointerout');
  focus = o;
  if (o) o.emit('pointerover');
}

function move(s: Phaser.Scene, dir: 'up' | 'down' | 'left' | 'right') {
  if (!focus) return setFocus(pickDefault(s));
  auto = false;
  const from = center(focus);
  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  // Nearest thing that way, preferring ones roughly in line; something far off to the
  // side only when nothing is.
  let best: Obj | null = null;
  let score = Infinity;
  for (const o of candidates(s)) {
    if (o === focus) continue;
    const p = center(o);
    const along = (p.x - from.x) * dx + (p.y - from.y) * dy;
    if (along <= 2) continue;
    const across = Math.abs((p.x - from.x) * dy + (p.y - from.y) * dx);
    const sc = along + across * 2.5 + (across > along * 1.5 ? 10000 : 0);
    if (sc < score) {
      score = sc;
      best = o;
    }
  }
  if (best) setFocus(best);
}

function press(o: Obj) {
  const { x, y } = center(o);
  const ev = { preventDefault() {}, stopPropagation() {} };
  const p = { x, y, worldX: x, worldY: y, downX: x, downY: y, upX: x, upY: y, event: ev, getDistance: () => 0 };
  o.emit('pointerdown', p, 0, 0, ev);
  if (o.active) o.emit('pointerup', p, 0, 0, ev);
}

function drawRing() {
  const s = topScene();
  if (focus && (!focus.active || !focus.input?.enabled || focus.scene !== s || !shown(focus) || focus.getData?.('disabled'))) focus = null;
  if (!focus) auto = true;
  // A prompt or overlay that shows up later (FIGHT, LEARN) takes the ring until the player moves it.
  if (navMode && auto && s) setFocus(pickDefault(s));
  if (ring && (!ring.active || ring.scene !== s)) {
    if (ring.active) ring.destroy();
    ring = null;
  }
  if (!navMode || !focus || !s) {
    ring?.clear();
    return;
  }
  if (!ring) ring = s.add.graphics().setDepth(100000);
  const b = focus.getBounds();
  const blink = Math.floor(performance.now() / 260) % 2 ? 1 : 0.55;
  ring.clear().lineStyle(2, 0xffcd75, blink).strokeRect(Math.round(b.x) - 2, Math.round(b.y) - 2, Math.round(b.width) + 4, Math.round(b.height) + 4);
}

// ---------------------------------------------------------------- dispatch

function fire(a: Action) {
  const s = topScene();
  if (!s) return;
  if (a === 'confirm' && navMode && focus && focus.scene === s) return press(focus);
  const hs = handlers.filter((h) => h.scene === s && h.actions.includes(a));
  if (hs.length) {
    hs.forEach((h) => h.cb(a));
    return;
  }
  const dir = a === 'up' || a === 'down' || a === 'left' || a === 'right';
  // The first direction (or a confirm nothing listens to) only shows the ring.
  if (dir && navMode) move(s, a);
  if (dir || a === 'confirm') navMode = true;
}

function onKey(e: KeyboardEvent) {
  const el = document.activeElement;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
  if (capture) {
    e.preventDefault();
    if (e.repeat) return;
    const c = capture;
    capture = null;
    c({ key: e.code });
    return;
  }
  const hit = ACTIONS.filter((a) => keyBinds(a).includes(e.code));
  if (!hit.length) return;
  e.preventDefault();
  for (const a of hit) {
    if (e.repeat && !['up', 'down', 'left', 'right'].includes(a)) continue;
    fire(a);
  }
}

// Gamepads are polled; held directions repeat like a held key.
const prev = new Map<number, boolean[]>();
const stickHeld: Record<string, number> = {};
let padSeen = false;

function pollPads(now: number) {
  const pads = navigator.getGamepads?.() ?? [];
  for (const pad of pads) {
    if (!pad || !pad.connected) continue;
    padSeen = true;
    const was = prev.get(pad.index) ?? [];
    const is = pad.buttons.map((b) => b.pressed);
    // The left stick works as a d-pad.
    const [ax, ay] = [pad.axes[0] ?? 0, pad.axes[1] ?? 0];
    const stick: Record<number, boolean> = { 12: ay < -0.55, 13: ay > 0.55, 14: ax < -0.55, 15: ax > 0.55 };
    for (let b = 0; b < Math.max(is.length, 16); b++) {
      const down = !!is[b] || !!stick[b];
      const key = `${pad.index}:${b}`;
      if (down && !was[b]) {
        stickHeld[key] = now + 380;
        if (capture) {
          const c = capture;
          capture = null;
          c({ pad: b });
        } else for (const a of ACTIONS) if (padBinds(a).includes(b)) fire(a);
      } else if (down && b >= 12 && b <= 15 && now >= (stickHeld[key] ?? Infinity)) {
        stickHeld[key] = now + 120;
        for (const a of ACTIONS) if ((a === 'up' || a === 'down' || a === 'left' || a === 'right') && padBinds(a).includes(b)) fire(a);
      }
      was[b] = down;
    }
    prev.set(pad.index, was);
  }
}

/** Name of a connected controller, if any. */
export function padConnected(): string | null {
  for (const p of navigator.getGamepads?.() ?? []) if (p?.connected) return p.id.replace(/\(.*?\)/g, '').trim().slice(0, 28) || 'CONTROLLER';
  return null;
}
export const padUsed = () => padSeen;

export function initInput(g: Phaser.Game) {
  game = g;
  window.addEventListener('keydown', onKey);
  // Touch or mouse: hide the ring until keys or a pad are used again.
  const off = () => {
    navMode = false;
    focus = null;
  };
  window.addEventListener('pointerdown', off);
  window.addEventListener('mousemove', (e) => (e.movementX || e.movementY) && off());
  game.events.on(Phaser.Core.Events.POST_STEP, (t: number) => {
    pollPads(t);
    drawRing();
  });
}
