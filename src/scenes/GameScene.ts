import Phaser from 'phaser';
import { W, H, IS_TOUCH } from '../config';
import { Background } from '../game/background';
import { Foe, Kind } from '../game/foes';
import { baseStats, Stats, Upgrade } from '../game/upgrades';
import { text, panel } from '../ui';
import { sfx } from '../audio';
import { store, save } from '../save';
import { COL } from '../gfx/palette';

interface Shot {
  s: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  crit: boolean;
  hit: Foe[];
}

interface EShot {
  s: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  r: number;
  spin: number;
}

interface Pickup {
  s: Phaser.GameObjects.Image;
  t: number;
}

interface Particle {
  s: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  max: number;
  grav: number;
}

type State = 'play' | 'clearing' | 'boss' | 'dead' | 'upgrade';

const SECTOR_LEN = 26; // seconds of spawning per normal sector
const BOSS_EVERY = 5;
const PX_PER_METER = 8;

export class GameScene extends Phaser.Scene {
  stats!: Stats;
  levels: Record<string, number> = {};
  private bg!: Background;
  private player!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Image;
  private shots: Shot[] = [];
  private eshots: EShot[] = [];
  private foes: Foe[] = [];
  private pickups: Pickup[] = [];
  private parts: Particle[] = [];
  private caps: Phaser.GameObjects.Image[] = [];

  sector = 1;
  private state: State = 'play';
  private sectorT = 0;
  private clearT = 0;
  private spawnT = 1.2;
  private canT = 3;
  distance = 0;
  kills = 0;
  bossesBeaten = 0;
  private pxTravelled = 0;
  private boss: Foe | null = null;

  private fireT = 0;
  private dashCd = 0;
  private dashT = 0;
  private dashDir = new Phaser.Math.Vector2(0, -1);
  private invuln = 0;
  private ghostT = 0;
  private killsSinceHeal = 0;
  private hitstop = 0;
  private slowmo = 1;
  private orbitA = 0;

  // input
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private movePointer: number | null = null;
  private lastPX = 0;
  private lastPY = 0;
  private pending = new Phaser.Math.Vector2();
  private moveDir = new Phaser.Math.Vector2(0, -1);
  private lastTap = 0;

  // HUD
  private hearts: Phaser.GameObjects.Image[] = [];
  private distText!: Phaser.GameObjects.BitmapText;
  private sectorText!: Phaser.GameObjects.BitmapText;
  private hud!: Phaser.GameObjects.Graphics;
  private dashBtn = { x: W - 24, y: H - 26, r: 15 };
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossName!: Phaser.GameObjects.BitmapText;
  private flashRect!: Phaser.GameObjects.Rectangle;
  private bannerObjs: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Game');
  }

  create() {
    this.stats = baseStats();
    this.levels = {};
    this.shots = [];
    this.eshots = [];
    this.foes = [];
    this.pickups = [];
    this.parts = [];
    this.caps = [];
    this.sector = 1;
    this.bannerObjs = [];
    this.state = 'play';
    this.sectorT = 0;
    this.spawnT = 1.5;
    this.canT = 3;
    this.distance = 0;
    this.pxTravelled = 0;
    this.kills = 0;
    this.bossesBeaten = 0;
    this.boss = null;
    this.fireT = 0.3;
    this.dashCd = 0;
    this.dashT = 0;
    this.invuln = 0;
    this.killsSinceHeal = 0;
    this.hitstop = 0;
    this.slowmo = 1;
    this.movePointer = null;
    this.pending.set(0, 0);

    store.runs++;
    save();

    this.bg = new Background(this, 0);
    this.shadow = this.add.image(W / 2, H - 50, 'shadow').setDepth(4);
    this.player = this.add.sprite(W / 2, H - 58, 'raccoon_0').play('raccoon_run').setDepth(5);

    this.setupInput();
    this.buildHud();
    this.banner(`SECTOR ${this.sector}`, this.bg.info.name);

    if (store.runs <= 2) {
      const tip = text(this, W / 2, H * 0.62, IS_TOUCH ? 'DRAG ANYWHERE TO MOVE' : 'ARROWS / WASD TO MOVE', { color: COL.white }).setDepth(50);
      const tip2 = text(this, W / 2, H * 0.62 + 10, IS_TOUCH ? 'TAP DASH TO DODGE THROUGH DANGER' : 'SPACE TO DASH THROUGH DANGER', { color: COL.light }).setDepth(50);
      this.tweens.add({ targets: [tip, tip2], alpha: 0, delay: 3500, duration: 600, onComplete: () => (tip.destroy(), tip2.destroy()) });
    }

    sfx.tempo = 1;
    sfx.playMusic('run');

    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.movePointer = null;
      this.pending.set(0, 0);
      sfx.resume();
    });
    this.game.events.on(Phaser.Core.Events.BLUR, this.autoPause, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.autoPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.autoPause, this);
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.autoPause, this);
    });
    this.cameras.main.fadeIn(200, 26, 28, 44);
  }

  // ---------------------------------------------------------------- input

  private setupInput() {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT,K,P,ESC') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-SPACE', () => this.tryDash());
    kb.on('keydown-SHIFT', () => this.tryDash());
    kb.on('keydown-K', () => this.tryDash());
    kb.on('keydown-P', () => this.pause());
    kb.on('keydown-ESC', () => this.pause());

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.state === 'dead') return;
      // Pause button
      if (p.x > W - 22 && p.y < 20) {
        this.pause();
        return;
      }
      const b = this.dashBtn;
      if (IS_TOUCH && Phaser.Math.Distance.Between(p.x, p.y, b.x, b.y) < b.r + 8) {
        this.tryDash();
        return;
      }
      // A quick second tap anywhere also dashes.
      const now = this.time.now;
      if (now - this.lastTap < 230) this.tryDash();
      this.lastTap = now;
      if (this.movePointer === null) {
        this.movePointer = p.id;
        this.lastPX = p.x;
        this.lastPY = p.y;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.movePointer || !p.isDown) return;
      const dx = p.x - this.lastPX;
      const dy = p.y - this.lastPY;
      this.lastPX = p.x;
      this.lastPY = p.y;
      this.pending.x += dx * 1.25;
      this.pending.y += dy * 1.25;
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (p.id === this.movePointer) this.movePointer = null;
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
  }

  private autoPause() {
    if (this.scene.isActive() && this.state !== 'dead' && this.state !== 'upgrade') this.pause();
  }

  private pause() {
    if (this.state === 'dead' || this.state === 'upgrade' || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause');
    sfx.suspend();
  }

  private tryDash() {
    if (this.state === 'dead' || this.state === 'upgrade' || this.dashCd > 0 || this.dashT > 0) return;
    this.dashT = 0.16;
    this.dashCd = this.stats.dashCooldown;
    this.dashDir.copy(this.moveDir.lengthSq() > 0 ? this.moveDir : new Phaser.Math.Vector2(0, -1)).normalize();
    this.invuln = Math.max(this.invuln, 0.3);
    sfx.dash();
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    this.hud = this.add.graphics().setDepth(60);
    this.distText = text(this, W / 2, 9, '0M', { scale: 2, color: COL.white }).setDepth(61);
    this.sectorText = text(this, W / 2, 21, '', { color: COL.light }).setDepth(61);
    this.bossBar = this.add.graphics().setDepth(61);
    this.bossName = text(this, W / 2, 36, '', { color: COL.red }).setDepth(62).setVisible(false);
    this.flashRect = this.add.rectangle(0, 0, W, H, 0xb13e53, 0).setOrigin(0).setDepth(70);
    this.refreshHearts();
  }

  private refreshHearts() {
    this.hearts.forEach((h) => h.destroy());
    this.hearts = [];
    for (let i = 0; i < this.stats.maxHp; i++) {
      const h = this.add.image(6 + i * 8, 7, i < this.stats.hp ? 'heart' : 'heart_empty').setDepth(61);
      this.hearts.push(h);
    }
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    this.distText.setText(`${Math.floor(this.distance)}M`);
    this.sectorText.setText(`SECTOR ${this.sector}`);
    // Sector progress bar
    if (this.state === 'play' || this.state === 'clearing') {
      const p = Phaser.Math.Clamp(this.sectorT / SECTOR_LEN, 0, 1);
      g.fillStyle(0x1a1c2c, 1).fillRect(W / 2 - 21, 26, 42, 4);
      g.fillStyle(0x333c57, 1).fillRect(W / 2 - 20, 27, 40, 2);
      g.fillStyle(0xffcd75, 1).fillRect(W / 2 - 20, 27, Math.round(40 * p), 2);
    }
    // Pause button
    g.fillStyle(0x1a1c2c, 1).fillRect(W - 13, 2, 11, 11);
    g.fillStyle(0x94b0c2, 1).fillRect(W - 11, 4, 2, 7).fillRect(W - 6, 4, 2, 7);

    // Dash button (touch) or a small meter (keyboard)
    const ready = this.dashCd <= 0;
    const frac = 1 - Phaser.Math.Clamp(this.dashCd / this.stats.dashCooldown, 0, 1);
    if (IS_TOUCH) {
      const b = this.dashBtn;
      g.fillStyle(0x1a1c2c, 0.55).fillCircle(b.x, b.y, b.r + 1);
      g.lineStyle(2, ready ? 0x73eff7 : 0x333c57, 1).strokeCircle(b.x, b.y, b.r);
      if (!ready) {
        g.lineStyle(2, 0x41a6f6, 1);
        g.beginPath();
        g.arc(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        g.strokePath();
      }
      // little arrow glyph
      g.fillStyle(ready ? 0x73eff7 : 0x566c86, 1);
      g.fillTriangle(b.x - 5, b.y + 3, b.x + 5, b.y + 3, b.x, b.y - 5);
      g.fillRect(b.x - 2, b.y + 3, 4, 3);
    } else {
      g.fillStyle(0x1a1c2c, 1).fillRect(this.player.x - 8, this.player.y + 11, 16, 3);
      g.fillStyle(ready ? 0x73eff7 : 0x3b5dc9, 1).fillRect(this.player.x - 7, this.player.y + 12, Math.round(14 * frac), 1);
    }

    // Boss bar
    this.bossBar.clear();
    if (this.boss && !this.boss.dead) {
      const p = this.boss.hp / this.boss.maxHp;
      this.bossBar.fillStyle(0x1a1c2c, 1).fillRect(20, 42, W - 40, 5);
      this.bossBar.fillStyle(0x5d275d, 1).fillRect(21, 43, W - 42, 3);
      this.bossBar.fillStyle(0xb13e53, 1).fillRect(21, 43, Math.round((W - 42) * p), 3);
    }
  }

  private banner(title: string, sub?: string, color = COL.white) {
    const y = H * 0.36;
    const g = this.add.graphics().setDepth(80);
    panel(g, -4, y - 12, W + 8, sub ? 28 : 20, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    const t = text(this, W / 2, y - 3, title, { scale: 2, color }).setDepth(81);
    const s = sub ? text(this, W / 2, y + 9, sub, { color: COL.yellow }).setDepth(81) : null;
    const all = [g, t, ...(s ? [s] : [])];
    this.bannerObjs.forEach((o) => {
      this.tweens.killTweensOf(o);
      o.destroy();
    });
    this.bannerObjs = all;
    all.forEach((o) => (o.x -= W));
    this.tweens.add({ targets: all, x: `+=${W}`, duration: 260, ease: 'Back.out' });
    this.tweens.add({
      targets: all,
      x: `+=${W}`,
      alpha: 0,
      delay: 1500,
      duration: 260,
      ease: 'Cubic.in',
      onComplete: () => all.forEach((o) => o.destroy()),
    });
  }

  private popText(x: number, y: number, str: string, color: number) {
    const t = text(this, x, y, str, { color }).setDepth(65);
    this.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: 800, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- main loop

  update(_time: number, deltaMs: number) {
    const raw = Math.min(deltaMs / 1000, 1 / 20);
    if (this.hitstop > 0) {
      this.hitstop -= raw;
      return;
    }
    const dt = raw * this.slowmo;

    const scroll = Math.min(60, 30 + this.sector * 1.5);
    const dy = this.state === 'dead' ? scroll * dt * 0.3 : scroll * dt;
    this.bg.update(dy, dt);
    if (this.state !== 'dead') {
      this.pxTravelled += dy;
      this.distance = this.pxTravelled / PX_PER_METER;
    }

    if (this.state !== 'dead') {
      this.updatePlayer(dt);
      this.updateFire(dt);
      this.updateCaps(dt);
    }
    this.updateShots(dt);
    this.updateFoes(dt, dy);
    this.updateEShots(dt);
    this.updatePickups(dt, dy);
    this.updateParticles(dt);
    if (this.state !== 'dead') {
      this.collide();
      this.updateDirector(dt);
    }
    this.drawHud();
  }

  // ---------------------------------------------------------------- player

  private updatePlayer(dt: number) {
    const s = this.stats;
    const k = this.keys;
    let kx = 0;
    let ky = 0;
    if (k.LEFT.isDown || k.A.isDown) kx -= 1;
    if (k.RIGHT.isDown || k.D.isDown) kx += 1;
    if (k.UP.isDown || k.W.isDown) ky -= 1;
    if (k.DOWN.isDown || k.S.isDown) ky += 1;

    let mx = 0;
    let my = 0;
    if (kx || ky) {
      const len = Math.hypot(kx, ky);
      mx = (kx / len) * s.moveSpeed * dt;
      my = (ky / len) * s.moveSpeed * dt;
      this.moveDir.set(kx, ky).normalize();
    }
    // Drag input moves toward the finger's accumulated motion, capped so speed upgrades still matter.
    const plen = this.pending.length();
    if (plen > 0.01) {
      const cap = s.moveSpeed * 2.6 * dt;
      const step = Math.min(plen, cap);
      mx += (this.pending.x / plen) * step;
      my += (this.pending.y / plen) * step;
      if (plen > 0.6) this.moveDir.set(this.pending.x, this.pending.y).normalize();
      this.pending.scale((plen - step) / plen);
    }

    if (this.dashT > 0) {
      this.dashT -= dt;
      mx += this.dashDir.x * 320 * dt;
      my += this.dashDir.y * 320 * dt;
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        this.ghostT = 0.025;
        const gh = this.add.image(this.player.x, this.player.y, 'raccoon_ghost').setDepth(4).setAlpha(0.7);
        this.tweens.add({ targets: gh, alpha: 0, duration: 220, onComplete: () => gh.destroy() });
      }
      if (this.dashT <= 0 && s.shock > 0) this.shockwave();
    }

    const b = this.bg.info;
    this.player.x = Phaser.Math.Clamp(this.player.x + mx, b.left + 6, b.right - 6);
    this.player.y = Phaser.Math.Clamp(this.player.y + my, H * 0.28, H - 12);
    // Lean into horizontal movement.
    this.player.setAngle(Phaser.Math.Linear(this.player.angle, Phaser.Math.Clamp(mx / Math.max(dt, 0.001) / 12, -10, 10), 0.3));
    this.shadow.setPosition(this.player.x, this.player.y + 8);

    if (this.dashCd > 0) {
      const before = this.dashCd;
      this.dashCd -= dt;
      if (before > 0 && this.dashCd <= 0) {
        // Ready ping
        this.burst(this.player.x, this.player.y, 4, [0x73eff7], 30);
      }
    }
    if (this.invuln > 0) {
      this.invuln -= dt;
      const blink = this.dashT <= 0 && Math.floor(this.invuln * 20) % 2 === 0;
      this.player.setAlpha(blink ? 0.35 : 1);
    } else this.player.setAlpha(1);
  }

  private shockwave() {
    const lvl = this.stats.shock;
    const r = 22 + lvl * 8;
    const dmg = 2 + lvl * 2 + this.stats.damage;
    sfx.shock();
    this.cameras.main.shake(120, 0.008);
    const ring = this.add.image(this.player.x, this.player.y, 'ring').setDepth(6).setTint(0x73eff7).setScale(0.2);
    this.tweens.add({ targets: ring, scale: r / 14, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
    for (const f of this.foes) {
      if (f.dead) continue;
      if (Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) < r + f.def.hw) this.damageFoe(f, dmg, false, true);
    }
    for (const e of this.eshots) {
      if (Phaser.Math.Distance.Between(e.s.x, e.s.y, this.player.x, this.player.y) < r) e.r = -1; // mark for removal
    }
  }

  private updateFire(dt: number) {
    const s = this.stats;
    let delay = s.fireDelay;
    if (s.rage && s.hp === 1) delay *= 0.5;
    this.fireT -= dt;
    if (this.fireT > 0) return;
    this.fireT += delay;
    if (this.fireT < 0) this.fireT = delay;

    const angles: number[] = [];
    const spread = 7;
    for (let i = 0; i < s.shots; i++) angles.push(-90 + (i - (s.shots - 1) / 2) * spread);
    if (s.side >= 1) angles.push(-90 - 32, -90 + 32);
    if (s.side >= 2) angles.push(-90 - 58, -90 + 58);
    for (const a of angles) {
      const crit = Math.random() < s.crit;
      const rad = Phaser.Math.DegToRad(a);
      const img = this.add.image(this.player.x + Math.cos(rad) * 4, this.player.y - 6, 'pebble').setDepth(6);
      if (crit) img.setTint(0xffcd75).setScale(1.5);
      if (s.damage >= 3 && !crit) img.setScale(1.25);
      this.shots.push({ s: img, vx: Math.cos(rad) * 250, vy: Math.sin(rad) * 250, dmg: s.damage * (crit ? 3 : 1), pierce: s.pierce, crit, hit: [] });
    }
    // little throw squash
    this.player.setScale(1.1, 0.9);
    this.time.delayedCall(50, () => this.player.setScale(1));
    sfx.shoot();
  }

  private updateCaps(dt: number) {
    const n = this.stats.orbit;
    while (this.caps.length < n) this.caps.push(this.add.image(0, 0, 'cap').setDepth(6));
    this.orbitA += dt * 4.2;
    const r = 20;
    this.caps.forEach((c, i) => {
      const a = this.orbitA + (i / n) * Math.PI * 2;
      c.setPosition(this.player.x + Math.cos(a) * r, this.player.y + Math.sin(a) * r * 0.9);
      c.setAngle(c.angle + 12);
    });
  }

  // ---------------------------------------------------------------- projectiles

  private updateShots(dt: number) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const sh = this.shots[i];
      sh.s.x += sh.vx * dt;
      sh.s.y += sh.vy * dt;
      if (sh.s.y < -8 || sh.s.x < -8 || sh.s.x > W + 8 || sh.pierce < 0) {
        sh.s.destroy();
        this.shots.splice(i, 1);
      }
    }
  }

  private fireAt(x: number, y: number, angle: number, speed: number, tex = 'orb', spin = 0) {
    const s = this.add.image(x, y, tex).setDepth(7);
    if (tex === 'feather') s.setRotation(angle - Math.PI / 2);
    this.eshots.push({ s, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 2, spin });
  }

  private updateEShots(dt: number) {
    for (let i = this.eshots.length - 1; i >= 0; i--) {
      const e = this.eshots[i];
      e.s.x += e.vx * dt;
      e.s.y += e.vy * dt;
      if (e.spin) e.s.rotation += e.spin * dt;
      const out = e.s.y > H + 8 || e.s.y < -16 || e.s.x < -8 || e.s.x > W + 8;
      if (out || e.r < 0) {
        if (e.r < 0) this.burst(e.s.x, e.s.y, 3, [0xf4f4f4], 20);
        e.s.destroy();
        this.eshots.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- foes

  private hpMul() {
    return 1 + 0.16 * (this.sector - 1) + 0.006 * (this.sector - 1) ** 2;
  }
  private spdMul() {
    return Math.min(1.65, 1 + 0.045 * (this.sector - 1));
  }

  private spawn(kind: Kind, x: number, y = -12): Foe {
    const f = new Foe(this, kind, x, y, kind === 'can' ? 1 : this.hpMul(), this.spdMul());
    const eliteChance = this.sector >= 7 ? Math.min(0.35, (this.sector - 6) * 0.05) : 0;
    if (kind !== 'can' && !f.def.boss && Math.random() < eliteChance) f.makeElite();
    this.foes.push(f);
    return f;
  }

  private updateFoes(dt: number, dy: number) {
    const px = this.player.x;
    const py = this.player.y;
    for (let i = this.foes.length - 1; i >= 0; i--) {
      const f = this.foes[i];
      if (f.dead) {
        this.foes.splice(i, 1);
        continue;
      }
      f.t += dt;
      f.stT += dt;
      if (f.flashT > 0) {
        f.flashT -= dt;
        if (f.flashT <= 0) f.restoreTint();
      }
      if (f.orbitCd > 0) f.orbitCd -= dt;
      const sp = f.spd;
      switch (f.kind) {
        case 'can':
          f.y += dy;
          break;
        case 'rat': {
          f.vy = 42 * sp;
          const want = Phaser.Math.Clamp((px - f.x) * 1.2, -35 * sp, 35 * sp);
          f.vx = Phaser.Math.Linear(f.vx, f.y < py ? want : 0, 0.05);
          f.x += f.vx * dt;
          f.y += f.vy * dt + dy;
          break;
        }
        case 'pigeon': {
          f.x += f.vx * dt + Math.cos(f.t * 5 + f.ax) * 20 * dt;
          f.y += f.vy * dt;
          f.setFlipX(f.vx < 0);
          break;
        }
        case 'cat':
          this.updateCat(f, dt, dy);
          break;
        case 'crow':
          this.updateCrow(f, dt);
          break;
        case 'dog': {
          f.vy = 20 * sp;
          const want = Phaser.Math.Clamp((px - f.x) * 0.8, -22 * sp, 22 * sp);
          f.vx = Phaser.Math.Linear(f.vx, want, 0.03);
          f.x += f.vx * dt;
          f.y += f.vy * dt + dy;
          // Woof: a short spread of barks every few seconds.
          f.shootT -= dt;
          if (f.shootT <= 0 && f.y > 10 && f.y < py - 20) {
            f.shootT = 3.2 / sp;
            const a = Phaser.Math.Angle.Between(f.x, f.y, px, py);
            for (let k = -1; k <= 1; k++) this.fireAt(f.x, f.y + 6, a + k * 0.28, 70 * sp);
            sfx.enemyShot();
            this.tweens.add({ targets: f, scaleX: 1.2, scaleY: 0.85, yoyo: true, duration: 80 });
          }
          break;
        }
        case 'van':
          this.updateVan(f, dt);
          break;
        case 'ratking':
          this.updateRatKing(f, dt);
          break;
      }
      f.syncShadow();
      if (!f.def.boss && (f.y > H + 20 || f.y < -60 || f.x < -30 || f.x > W + 30)) {
        f.dead = true;
        f.destroy();
        this.foes.splice(i, 1);
      }
    }
  }

  private updateCat(f: Foe, dt: number, dy: number) {
    const sp = f.spd;
    if (f.st === 0) {
      // walk in
      f.y += 34 * sp * dt + dy;
      if (f.y > f.ay) {
        f.st = 1;
        f.stT = 0;
        f.anims.pause();
      }
    } else if (f.st === 1) {
      // crouch + flash: the telegraph
      f.y += dy * 0.5;
      f.setScale(1.15, 0.85);
      if (Math.floor(f.stT * 12) % 2 === 0) f.setTintFill(0xffcd75);
      else f.restoreTint();
      if (f.stT > 0.6 / Math.min(sp, 1.3)) {
        f.st = 2;
        f.stT = 0;
        f.setScale(0.9, 1.15);
        f.restoreTint();
        const a = Phaser.Math.Angle.Between(f.x, f.y, this.player.x, this.player.y);
        f.vx = Math.cos(a) * 200 * sp;
        f.vy = Math.sin(a) * 200 * sp;
        sfx.thud();
      }
    } else if (f.st === 2) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vx *= Math.pow(0.08, dt);
      f.vy *= Math.pow(0.08, dt);
      if (f.stT > 0.7) {
        f.st = f.y < H * 0.5 ? 0 : 3;
        f.ay = f.y + 60;
        f.stT = 0;
        f.setScale(1);
        f.anims.resume();
      }
    } else {
      f.y += 50 * sp * dt + dy;
    }
  }

  private updateCrow(f: Foe, dt: number) {
    const sp = f.spd;
    if (f.st === 0) {
      f.y = Phaser.Math.Linear(f.y, f.ay, 1 - Math.pow(0.05, dt));
      f.x += Math.sin(f.t * 1.4 + f.ax) * 40 * dt;
      f.shootT -= dt;
      if (f.shootT <= 0 && f.t > 0.8) {
        f.shootT = 1.7 / sp;
        const a = Phaser.Math.Angle.Between(f.x, f.y, this.player.x, this.player.y);
        this.fireAt(f.x, f.y + 4, a, 95 * sp, 'feather');
        if (this.sector >= 9) {
          this.fireAt(f.x, f.y + 4, a - 0.3, 95 * sp, 'feather');
          this.fireAt(f.x, f.y + 4, a + 0.3, 95 * sp, 'feather');
        }
        sfx.enemyShot();
      }
      if (f.t > 8) f.st = 1;
    } else {
      f.y += 110 * dt;
    }
    f.x = Phaser.Math.Clamp(f.x, 12, W - 12);
  }

  private updateVan(f: Foe, dt: number) {
    const sp = 1 + (f.hp < f.maxHp / 2 ? 0.25 : 0);
    const enraged = f.hp < f.maxHp / 2;
    switch (f.st) {
      case 0: // drive in
        f.y = Phaser.Math.Linear(f.y, 52, 1 - Math.pow(0.15, dt));
        if (f.stT > 1.6) this.setSt(f, 1);
        break;
      case 1: {
        // strafe + nets
        f.x = W / 2 + Math.sin(f.stT * 1.1 * sp) * 50;
        f.y = Phaser.Math.Linear(f.y, 52, 0.1);
        f.shootT -= dt;
        if (f.shootT <= 0) {
          f.shootT = 1.15 / sp;
          const a = Phaser.Math.Angle.Between(f.x, f.y, this.player.x, this.player.y);
          const n = enraged ? 5 : 3;
          for (let k = 0; k < n; k++) this.fireAt(f.x, f.y + 12, a + (k - (n - 1) / 2) * 0.24, 85 * this.spdMul(), 'net', 3);
          sfx.enemyShot();
        }
        if (f.stT > 5.5) this.setSt(f, f.ax++ % 2 === 0 ? 2 : 4);
        break;
      }
      case 2: // telegraph a charge: flash headlights and track the raccoon
        f.x = Phaser.Math.Linear(f.x, this.player.x, 0.05);
        if (Math.floor(f.stT * 10) % 2 === 0) f.setTintFill(0xffcd75);
        else f.restoreTint();
        if (f.stT > 0.85) {
          f.restoreTint();
          sfx.thud();
          this.cameras.main.shake(150, 0.006);
          this.setSt(f, 3);
        }
        break;
      case 3: // charge
        f.y += 240 * sp * dt;
        if (f.y > H - 30) {
          this.cameras.main.shake(200, 0.012);
          sfx.thud();
          this.setSt(f, 5);
        }
        break;
      case 4: // throw open the back door: rats!
        if (f.stT > 0.3 && f.ay === 0) {
          f.ay = 1;
          const n = enraged ? 5 : 3;
          for (let k = 0; k < n; k++) {
            const r = this.spawn('rat', f.x + (k - (n - 1) / 2) * 10, f.y + 8);
            r.spd = 1.3;
          }
          sfx.enemyShot();
        }
        if (f.stT > 1.2) {
          f.ay = 0;
          this.setSt(f, 1);
        }
        break;
      case 5: // reverse back up
        f.y -= 90 * dt;
        if (f.y < 52) this.setSt(f, 1);
        break;
    }
  }

  private updateRatKing(f: Foe, dt: number) {
    const enraged = f.hp < f.maxHp / 2;
    if (f.st === 0) {
      f.y = Phaser.Math.Linear(f.y, 70, 1 - Math.pow(0.15, dt));
      if (f.stT > 1.6) this.setSt(f, 1);
      return;
    }
    f.x = W / 2 + Math.sin(f.t * 0.9) * 50;
    f.y = 70 + Math.sin(f.t * 1.8) * 18;
    f.shootT -= dt;
    if (f.shootT <= 0) {
      f.shootT = enraged ? 1.6 : 2.2;
      const n = enraged ? 14 : 10;
      const off = f.t;
      for (let k = 0; k < n; k++) this.fireAt(f.x, f.y, off + (k / n) * Math.PI * 2, 60 * this.spdMul());
      sfx.enemyShot();
      this.tweens.add({ targets: f, scaleX: 1.15, scaleY: 0.9, yoyo: true, duration: 90 });
    }
    if (enraged) {
      f.vx -= dt;
      if (f.vx <= 0) {
        f.vx = 0.13;
        this.fireAt(f.x, f.y, f.t * 3.1, 70 * this.spdMul());
      }
    }
    f.ax -= dt;
    if (f.ax <= -7) {
      f.ax = 0;
      for (let k = 0; k < 4; k++) this.spawn('rat', 20 + k * ((W - 40) / 3), -10);
    }
  }

  private setSt(f: Foe, st: number) {
    f.st = st;
    f.stT = 0;
  }

  private damageFoe(f: Foe, dmg: number, crit: boolean, big = false) {
    if (f.dead) return;
    f.hp -= dmg;
    f.flash();
    if (crit) {
      sfx.crit();
      this.burst(f.x, f.y, 5, [0xffcd75, 0xf4f4f4], 50);
    } else sfx.hit();
    if (!f.def.boss && f.kind !== 'can') f.y -= big ? 6 : 1.5;
    if (f.hp <= 0) this.killFoe(f);
  }

  private killFoe(f: Foe) {
    f.dead = true;
    const boss = !!f.def.boss;
    if (f.kind !== 'can') {
      this.kills++;
      if (this.stats.vamp) {
        this.killsSinceHeal++;
        if (this.killsSinceHeal >= this.stats.vamp) {
          this.killsSinceHeal = 0;
          if (this.stats.hp < this.stats.maxHp) this.heal(1);
        }
      }
    }
    const colors: Record<string, number[]> = {
      rat: [0x566c86, 0x94b0c2, 0xf5a5b8],
      pigeon: [0x94b0c2, 0xf4f4f4, 0x38b764],
      cat: [0xef7d57, 0xffcd75, 0x8f563b],
      crow: [0x333c57, 0x1a1c2c, 0xb13e53],
      dog: [0x8f563b, 0xf4f4f4, 0x5c3a2e],
      can: [0x94b0c2, 0x566c86, 0xf4f4f4],
      van: [0xf4f4f4, 0xb13e53, 0x3b5dc9, 0xffcd75],
      ratking: [0x566c86, 0xffcd75, 0xf5a5b8],
    };
    this.burst(f.x, f.y, boss ? 40 : 10, colors[f.kind], boss ? 120 : 60);
    if (boss) {
      this.bossDeath(f);
      return;
    }
    sfx.kill();
    this.cameras.main.shake(60, f.kind === 'dog' ? 0.006 : 0.002);
    if (f.kind === 'dog' || f.elite) this.hitstop = 0.04;
    // Drops: cans are the main source of food; enemies rarely drop it.
    const foodChance = f.kind === 'can' ? 0.4 : f.kind === 'dog' ? 0.2 : 0.025;
    if (Math.random() < foodChance) this.dropPizza(f.x, f.y);
    f.destroy();
  }

  private bossDeath(f: Foe) {
    this.boss = null;
    this.bossName.setVisible(false);
    this.bossesBeaten++;
    this.eshots.forEach((e) => (e.r = -1));
    this.slowmo = 0.25;
    this.cameras.main.shake(600, 0.015);
    this.cameras.main.flash(200, 255, 255, 255);
    sfx.bossDie();
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 110, () => this.burst(f.x + Phaser.Math.Between(-14, 14), f.y + Phaser.Math.Between(-10, 10), 14, [0xf4f4f4, 0xffcd75, 0xef7d57], 90));
    }
    this.tweens.add({
      targets: f,
      alpha: 0,
      angle: 20,
      duration: 700,
      onComplete: () => {
        f.destroy();
        this.slowmo = 1;
        this.dropPizza(f.x - 8, f.y);
        this.dropPizza(f.x + 8, f.y);
        this.time.delayedCall(1200, () => this.sectorClear());
      },
    });
  }

  // ---------------------------------------------------------------- pickups & particles

  private dropPizza(x: number, y: number) {
    const s = this.add.image(x, y, 'pizza').setDepth(2);
    this.tweens.add({ targets: s, y: y - 8, yoyo: true, duration: 180, ease: 'Quad.out' });
    this.pickups.push({ s, t: 0 });
  }

  private updatePickups(dt: number, dy: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.t += dt;
      p.s.y += dy;
      // gentle pull when close
      const d = Phaser.Math.Distance.Between(p.s.x, p.s.y, this.player.x, this.player.y);
      if (d < 26 && this.state !== 'dead') {
        p.s.x = Phaser.Math.Linear(p.s.x, this.player.x, 0.15);
        p.s.y = Phaser.Math.Linear(p.s.y, this.player.y, 0.15);
      }
      p.s.setScale(1 + Math.sin(p.t * 8) * 0.08);
      if (d < 9 && this.state !== 'dead') {
        this.burst(p.s.x, p.s.y, 8, [0xffcd75, 0xb13e53], 40);
        if (this.stats.hp < this.stats.maxHp) this.heal(1);
        else {
          sfx.pickup();
          this.popText(p.s.x, p.s.y - 6, 'YUM!', COL.yellow);
        }
        p.s.destroy();
        this.pickups.splice(i, 1);
      } else if (p.s.y > H + 10) {
        p.s.destroy();
        this.pickups.splice(i, 1);
      }
    }
  }

  private heal(n: number) {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + n);
    this.refreshHearts();
    sfx.heal();
    this.popText(this.player.x, this.player.y - 12, '+1 HEART', COL.pink);
    const h = this.hearts[this.stats.hp - 1];
    if (h) this.tweens.add({ targets: h, scale: 1.8, yoyo: true, duration: 120 });
  }

  private burst(x: number, y: number, n: number, colors: number[], speed: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      const s = this.add.image(x, y, 'px').setDepth(8).setTint(colors[i % colors.length]);
      if (Math.random() < 0.5) s.setScale(0.5);
      const life = 0.25 + Math.random() * 0.35;
      this.parts.push({ s, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, life, max: life, grav: 120 });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      p.vy += p.grav * dt;
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.s.setAlpha(Math.min(1, (p.life / p.max) * 2));
      if (p.life <= 0) {
        p.s.destroy();
        this.parts.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------- collisions

  private collide() {
    // pebbles vs foes
    for (const sh of this.shots) {
      if (sh.pierce < 0) continue;
      for (const f of this.foes) {
        if (f.dead || sh.hit.includes(f)) continue;
        if (Math.abs(sh.s.x - f.x) < f.def.hw + 2 && Math.abs(sh.s.y - f.y) < f.def.hh + 2) {
          sh.hit.push(f);
          this.damageFoe(f, sh.dmg, sh.crit);
          this.burst(sh.s.x, sh.s.y, 2, [0xf4f4f4], 30);
          sh.pierce--;
          if (sh.pierce < 0) break;
        }
      }
    }
    // caps vs foes
    if (this.caps.length) {
      for (const c of this.caps) {
        for (const f of this.foes) {
          if (f.dead || f.orbitCd > 0) continue;
          if (Math.abs(c.x - f.x) < f.def.hw + 3 && Math.abs(c.y - f.y) < f.def.hh + 3) {
            f.orbitCd = 0.35;
            this.damageFoe(f, Math.max(1, Math.ceil(this.stats.damage * 0.75)), false);
          }
        }
      }
      for (const e of this.eshots) {
        for (const c of this.caps) if (Math.abs(c.x - e.s.x) < 4 && Math.abs(c.y - e.s.y) < 4) e.r = -1;
      }
    }

    if (this.invuln > 0) return;
    const px = this.player.x;
    const py = this.player.y + 1;
    // small, forgiving player hitbox
    for (const f of this.foes) {
      if (f.dead || !f.def.touch) continue;
      if (Math.abs(px - f.x) < f.def.hw + 3 && Math.abs(py - f.y) < f.def.hh + 3) {
        this.hurt();
        return;
      }
    }
    for (const e of this.eshots) {
      if (e.r < 0) continue;
      if (Math.abs(px - e.s.x) < 4 && Math.abs(py - e.s.y) < 4) {
        e.r = -1;
        this.hurt();
        return;
      }
    }
  }

  private hurt() {
    const s = this.stats;
    s.hp--;
    this.refreshHearts();
    sfx.hurt();
    this.cameras.main.shake(220, 0.014);
    this.flashRect.setAlpha(0.45);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 260 });
    this.hitstop = 0.09;
    this.invuln = 1.3;
    this.burst(this.player.x, this.player.y, 12, [0xb13e53, 0xf4f4f4], 70);
    // Clear nearby bullets so a hit isn't followed by an unfair second one.
    for (const e of this.eshots) if (Phaser.Math.Distance.Between(e.s.x, e.s.y, this.player.x, this.player.y) < 30) e.r = -1;
    if (s.hp <= 0) this.die();
    else if (s.hp === 1) this.popText(this.player.x, this.player.y - 14, 'LAST HEART!', COL.red);
  }

  private die() {
    this.state = 'dead';
    sfx.die();
    this.slowmo = 0.35;
    this.player.setAlpha(1);
    this.player.anims.stop();
    this.player.setTintFill(0xf4f4f4);
    this.tweens.add({ targets: this.player, angle: 720, scale: 0, duration: 1100, ease: 'Cubic.in' });
    this.tweens.add({ targets: this.shadow, alpha: 0, duration: 600 });
    this.caps.forEach((c) => c.destroy());
    this.caps = [];

    const d = Math.floor(this.distance);
    const newBest = d > store.bestDistance;
    if (newBest) store.bestDistance = d;
    store.bestSector = Math.max(store.bestSector, this.sector);
    save();

    this.time.delayedCall(1300, () => {
      this.slowmo = 1;
      this.scene.launch('GameOver', { distance: d, sector: this.sector, kills: this.kills, bosses: this.bossesBeaten, newBest, levels: this.levels });
    });
  }

  // ---------------------------------------------------------------- director

  private isBossSector() {
    return this.sector % BOSS_EVERY === 0;
  }

  private updateDirector(dt: number) {
    if (this.state === 'upgrade') return;
    if (this.state === 'boss') return;

    if (this.state === 'play') {
      this.sectorT += dt;
      if (this.isBossSector()) {
        this.startBoss();
        return;
      }
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = Math.max(0.5, 1.85 - 0.11 * (this.sector - 1)) * (0.8 + Math.random() * 0.4);
        this.spawnPattern();
        // From sector 8 on, combinations stack up.
        if (this.sector >= 8 && Math.random() < Math.min(0.5, (this.sector - 7) * 0.08)) this.spawnPattern();
      }
      this.canT -= dt;
      if (this.canT <= 0) {
        this.canT = 4 + Math.random() * 4;
        const b = this.bg.info;
        this.spawn('can', Phaser.Math.Between(b.left + 10, b.right - 10));
      }
      if (this.sectorT >= SECTOR_LEN) {
        this.state = 'clearing';
        this.clearT = 0;
      }
    } else if (this.state === 'clearing') {
      this.clearT += dt;
      const hostile = this.foes.some((f) => !f.dead && f.kind !== 'can');
      if (!hostile || this.clearT > 7) this.sectorClear();
    }
  }

  private spawnPattern() {
    const s = this.sector;
    const table: [Kind, number][] = [['rat', 4]];
    if (s >= 2) table.push(['pigeon', 3]);
    if (s >= 3) table.push(['cat', 2 + s * 0.1]);
    if (s >= 4) table.push(['crow', 1.6 + s * 0.1]);
    if (s >= 6) table.push(['dog', 1 + s * 0.08]);
    const total = table.reduce((a, [, w]) => a + w, 0);
    let roll = Math.random() * total;
    let kind: Kind = 'rat';
    for (const [k, w] of table) {
      roll -= w;
      if (roll <= 0) {
        kind = k;
        break;
      }
    }
    const b = this.bg.info;
    const rx = () => Phaser.Math.Between(b.left + 8, b.right - 8);
    switch (kind) {
      case 'rat': {
        const n = 1 + Math.floor(Math.random() * Math.min(5, 1 + s / 2));
        const x = rx();
        for (let i = 0; i < n; i++) {
          const f = this.spawn('rat', Phaser.Math.Clamp(x + (i - n / 2) * 10, b.left + 6, b.right - 6), -12 - i * 8);
          f.vx = 0;
        }
        break;
      }
      case 'pigeon': {
        const n = Math.min(7, 3 + Math.floor(s / 3));
        const fromLeft = Math.random() < 0.5;
        const startX = fromLeft ? b.left - 4 : b.right + 4;
        for (let i = 0; i < n; i++) {
          const f = this.spawn('pigeon', startX + (fromLeft ? -i * 9 : i * 9), -10 - i * 7);
          f.vx = (fromLeft ? 1 : -1) * (38 + Math.random() * 10) * f.spd;
          f.vy = 62 * f.spd;
          f.ax = i * 0.6;
        }
        break;
      }
      case 'cat': {
        const f = this.spawn('cat', rx());
        f.ay = Phaser.Math.Between(50, Math.round(H * 0.45));
        break;
      }
      case 'crow': {
        const n = s >= 10 && Math.random() < 0.5 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const f = this.spawn('crow', rx());
          f.ay = Phaser.Math.Between(34, 80);
          f.ax = Math.random() * 6;
          f.shootT = 0.6 + i * 0.5;
        }
        break;
      }
      case 'dog': {
        const f = this.spawn('dog', rx());
        f.shootT = 1.5;
        break;
      }
      default:
        break;
    }
  }

  private startBoss() {
    this.state = 'boss';
    const kind: Kind = Math.floor(this.sector / BOSS_EVERY) % 2 === 1 ? 'van' : 'ratking';
    sfx.warn();
    sfx.playMusic('boss');
    this.banner('WARNING!', kind === 'van' ? 'ANIMAL CONTROL' : 'THE RAT KING', COL.red);
    this.time.delayedCall(1800, () => {
      if (this.state === 'dead') return;
      const f = this.spawn(kind, W / 2, -30);
      f.hp = f.maxHp = Math.round(f.def.hp * (1 + 0.45 * this.bossesBeaten) * (1 + 0.05 * (this.sector - 1)));
      f.shootT = 1.5;
      this.boss = f;
      this.bossName.setText(kind === 'van' ? 'ANIMAL CONTROL' : 'RAT KING').setVisible(true);
    });
  }

  private sectorClear() {
    if (this.state === 'dead' || this.state === 'upgrade') return;
    this.state = 'upgrade';
    sfx.clear();
    this.eshots.forEach((e) => (e.r = -1));
    this.banner('CLEAR!', `SECTOR ${this.sector} SURVIVED`, COL.lime);
    this.time.delayedCall(1100, () => {
      if (this.stats.hp <= 0) return;
      this.scene.pause();
      this.scene.launch('Upgrade', { sector: this.sector });
    });
  }

  // Called by the upgrade scene.
  applyUpgrade(u: Upgrade) {
    u.apply(this.stats);
    this.levels[u.id] = (this.levels[u.id] ?? 0) + 1;
    this.refreshHearts();
    sfx.upgrade();
    const ring = this.add.image(this.player.x, this.player.y, 'ring').setDepth(6).setTint(0xffcd75).setScale(0.2);
    this.tweens.add({ targets: ring, scale: 2.5, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
    this.popText(this.player.x, this.player.y - 14, u.name, COL.yellow);
    this.burst(this.player.x, this.player.y, 16, [0xffcd75, 0xf4f4f4, 0xa7f070], 70);

    const wasBoss = this.isBossSector();
    this.sector++;
    this.sectorT = 0;
    this.spawnT = 1.2;
    this.state = 'play';
    sfx.tempo = Math.min(1.25, 1 + (this.sector - 1) * 0.015);
    sfx.playMusic('run');
    if (wasBoss) this.bg.setBiome(this.bg.biome + 1);
    this.time.delayedCall(wasBoss ? 300 : 0, () => this.banner(`SECTOR ${this.sector}`, this.bg.info.name));
  }
}
