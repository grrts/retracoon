// PROTOTYPE (combat VFX study). One director per scene: a handful of pooled Phaser
// particle emitters (one per shape), pooled pixel rings, and a Graphics layer for bolts
// and beams. Every effect in the catalogue is a mix of these few parts, coloured by an
// element ramp, sized by a power tier.
import Phaser from 'phaser';
import type { StatusKey } from '../content/types';
import { W } from '../config';
import { hex } from '../gfx/palette';
import { store } from '../save';
import { LOOKS, Element, Motion } from './elements';
import { buildFxTextures, RINGS, SPARKS } from './textures';

type Range = [number, number];
interface Spec {
  ramp: number[];
  life: Range;
  speed: Range;
  angle: Range;
  acc: number;
  scale: number;
  tx: number;
  ty: number;
}
type P = Phaser.GameObjects.Particles.Particle & { ramp: number[] };

const MOTION: Record<Motion, Omit<Spec, 'ramp' | 'scale' | 'tx' | 'ty'>> = {
  rise: { life: [400, 750], speed: [12, 36], angle: [235, 305], acc: -40 },
  burst: { life: [220, 420], speed: [30, 80], angle: [0, 360], acc: 70 },
  fall: { life: [420, 700], speed: [45, 95], angle: [200, 340], acc: 280 },
  drift: { life: [650, 1050], speed: [8, 26], angle: [200, 340], acc: -14 },
  implode: { life: [220, 320], speed: [0, 0], angle: [0, 360], acc: 0 },
};

export interface StatusLook {
  ramp: number[];
  shape: string;
  motion: Motion;
  rate: number; // ambient particles per second while the status is up (0 = icon only)
}

const R = (keys: string) => [...keys].map(hex);
export const STATUS_LOOKS: Record<StatusKey, StatusLook> = {
  poison: { ramp: R('LGF'), shape: 'pt_bubble', motion: 'rise', rate: 1.6 },
  burn: { ramp: R('Yyoq'), shape: 'pt_flame', motion: 'rise', rate: 2.4 },
  bleed: { ramp: R('rrR'), shape: 'pt_drop', motion: 'fall', rate: 1.4 },
  chill: { ramp: R('iCc'), shape: 'pt_flake', motion: 'drift', rate: 1.2 },
  stun: { ramp: R('Yyy'), shape: 'pt_star', motion: 'drift', rate: 2 },
  mark: { ramp: R('rRk'), shape: 'fx_ring_3', motion: 'implode', rate: 0 },
  weak: { ramp: R('vep'), shape: 'fx_arrow_d', motion: 'fall', rate: 0.8 },
  vuln: { ramp: R('oon'), shape: 'fx_crack', motion: 'burst', rate: 0 },
  rage: { ramp: R('rRp'), shape: 'fx_puff', motion: 'rise', rate: 1.4 },
  thorns: { ramp: R('wlg'), shape: 'fx_spike', motion: 'burst', rate: 0 },
  regen: { ramp: R('mLG'), shape: 'fx_plus', motion: 'rise', rate: 1 },
  focus: { ramp: R('Yyo'), shape: 'pt_spark', motion: 'rise', rate: 0.6 },
  evade: { ramp: R('wCc'), shape: 'fx_streak', motion: 'burst', rate: 0 },
};
// Order of ambient priority: damage over time first, then control, then the rest.
const AMBIENT_ORDER: StatusKey[] = ['burn', 'poison', 'bleed', 'stun', 'chill', 'rage', 'regen', 'weak', 'focus'];
const AMBIENT_MAX = 2; // per unit: more than two moving layers turns into soup

// Hard ceiling on live particles, across every emitter. Ambient sheds first.
const CAP = 260;
const AMBIENT_CAP = 120;

const between = (r: Range) => r[0] + Math.random() * (r[1] - r[0]);

export class FxDirector {
  private emitters = new Map<string, Phaser.GameObjects.Particles.ParticleEmitter>();
  private cur: Spec = { ramp: [0xffffff], life: [300, 300], speed: [0, 0], angle: [0, 0], acc: 0, scale: 1, tx: 0, ty: 0 };
  private rings: Phaser.GameObjects.Image[] = [];
  private sparks: Phaser.GameObjects.Image[] = [];
  private g: Phaser.GameObjects.Graphics;
  private flashRect: Phaser.GameObjects.Rectangle;
  private ambientT = new Map<string, number>();
  quality = 1; // 0.5 low, 1 normal: multiplies counts. A settings toggle in the real thing.
  enabled = true;
  stats = { bursts: 0, shed: 0, peak: 0 };

  constructor(private scene: Phaser.Scene, private depth = 22) {
    buildFxTextures(scene);
    this.g = scene.add.graphics().setDepth(depth + 1);
    this.flashRect = scene.add.rectangle(0, 0, W, 400, 0xffffff, 1).setOrigin(0).setDepth(59).setVisible(false);
  }

  destroy() {
    this.emitters.forEach((e) => e.destroy());
    this.emitters.clear();
  }

  alive() {
    let n = 0;
    this.emitters.forEach((e) => (n += e.getAliveParticleCount()));
    this.stats.peak = Math.max(this.stats.peak, n);
    return n;
  }

  private emitter(tex: string, implode: boolean) {
    const key = tex + (implode ? ':in' : '');
    let em = this.emitters.get(key);
    if (em) return em;
    const s = this;
    const cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig = {
      emitting: false,
      lifespan: { onEmit: () => between(s.cur.life) },
      scale: { onEmit: () => s.cur.scale },
      tint: {
        onEmit: (p?: Phaser.GameObjects.Particles.Particle) => {
          (p as P).ramp = s.cur.ramp;
          return s.cur.ramp[0];
        },
        onUpdate: (p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => {
          const r = (p as P).ramp;
          return r[Math.min(r.length - 1, Math.floor(t * r.length))];
        },
      },
      // No soft fades: particles step down the ramp, then blink out like an 8-bit sprite.
      alpha: { onEmit: () => 1, onUpdate: (_p: Phaser.GameObjects.Particles.Particle, _k: string, t: number) => (t > 0.78 && Math.floor(t * 36) % 2 ? 0 : 1) },
    };
    if (implode) {
      cfg.moveToX = { onEmit: () => s.cur.tx };
      cfg.moveToY = { onEmit: () => s.cur.ty };
    } else {
      cfg.angle = { onEmit: () => between(s.cur.angle) };
      cfg.speed = { onEmit: () => between(s.cur.speed) };
      cfg.accelerationY = { onEmit: () => s.cur.acc };
    }
    em = this.scene.add.particles(0, 0, tex, cfg).setDepth(this.depth);
    this.emitters.set(key, em);
    return em;
  }

  // The one primitive everything else calls.
  emit(x: number, y: number, n: number, shape: string, ramp: number[], motion: Motion, opts: { scale?: number; spread?: number; ambient?: boolean; radius?: number } = {}) {
    if (!this.enabled) return;
    const live = this.alive();
    if (opts.ambient && live > AMBIENT_CAP) return void this.stats.shed++;
    let count = Math.max(1, Math.round(n * (opts.ambient ? 1 : this.quality)));
    if (live + count > CAP) {
      count = Math.max(0, CAP - live);
      this.stats.shed++;
      if (!count) return;
    }
    this.stats.bursts++;
    const m = MOTION[motion];
    Object.assign(this.cur, m, { ramp, scale: opts.scale ?? 1, tx: x, ty: y });
    const em = this.emitter(shape, motion === 'implode');
    const sp = opts.spread ?? 0;
    for (let i = 0; i < count; i++) {
      if (motion === 'implode') {
        const a = Math.random() * Math.PI * 2;
        const r = opts.radius ?? 16;
        em.emitParticleAt(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.7, 1);
      } else em.emitParticleAt(x + (Math.random() - 0.5) * sp, y + (Math.random() - 0.5) * sp, 1);
    }
  }

  // A pixel shockwave: steps through 1px ring sizes, colour stepping down the ramp.
  ring(x: number, y: number, ramp: number[], size: number, opts: { inward?: boolean; ms?: number } = {}) {
    if (!this.enabled) return;
    const steps = RINGS.slice(0, Math.max(2, Math.min(RINGS.length, size)));
    if (opts.inward) steps.reverse();
    const img = this.rings.find((r) => !r.visible) ?? this.rings[this.rings.push(this.scene.add.image(0, 0, 'fx_ring_2').setDepth(this.depth)) - 1];
    img.setPosition(Math.round(x), Math.round(y)).setVisible(true).setScale(1, 0.75);
    let i = 0;
    const step = opts.ms ?? 40;
    const tick = () => {
      if (i >= steps.length) return void img.setVisible(false);
      img.setTexture(`fx_ring_${steps[i]}`).setTint(ramp[Math.min(ramp.length - 1, Math.floor((i / steps.length) * ramp.length))]);
      i++;
      this.scene.time.delayedCall(step, tick);
    };
    tick();
  }

  // Hit spark: solid star (white), then ray tips (element colour), then gone. 3 frames.
  hitSpark(x: number, y: number, size: number, ramp: number[]) {
    if (!this.enabled) return;
    const r = SPARKS[Math.max(0, Math.min(SPARKS.length - 1, size))];
    const img = this.sparks.find((s) => !s.visible) ?? this.sparks[this.sparks.push(this.scene.add.image(0, 0, 'fx_hit_3').setDepth(this.depth + 2)) - 1];
    img.setPosition(Math.round(x), Math.round(y)).setVisible(true).setTexture(`fx_hit_${r}`).setTint(0xffffff);
    this.scene.time.delayedCall(50, () => img.setTexture(`fx_hit_${r}`).setTint(ramp[0]));
    this.scene.time.delayedCall(100, () => img.setTexture(`fx_hit_${r}_b`).setTint(ramp[1] ?? ramp[0]));
    this.scene.time.delayedCall(160, () => img.setVisible(false));
  }

  // Lightning: a jagged 1px path from the top of the stage, three frames of flicker.
  bolt(x: number, y: number, ramp: number[], forks = 1) {
    if (!this.enabled) return;
    const pts: [number, number][] = [];
    let cx = x + (Math.random() - 0.5) * 20;
    for (let cy = 28; cy < y; cy += 6) {
      pts.push([Math.round(cx), cy]);
      cx += (Math.random() - 0.5) * 10;
      cx += (x - cx) * 0.25;
    }
    pts.push([x, y]);
    const draw = (col: number, w: number) => {
      this.g.clear();
      this.g.fillStyle(col, 1);
      for (let i = 1; i < pts.length; i++) this.line(pts[i - 1], pts[i], w);
      for (let f = 0; f < forks; f++) {
        const j = 1 + Math.floor(Math.random() * (pts.length - 2));
        const [fx, fy] = pts[j];
        this.line([fx, fy], [fx + (Math.random() < 0.5 ? -8 : 8), fy + 7], 1);
      }
    };
    draw(ramp[0], 2);
    this.scene.time.delayedCall(50, () => this.g.clear());
    this.scene.time.delayedCall(80, () => draw(ramp[1], 1));
    this.scene.time.delayedCall(130, () => this.g.clear());
  }

  // Straight beam (neon, lasers), two pixels thick, flickering.
  beam(x0: number, y0: number, x1: number, y1: number, ramp: number[]) {
    if (!this.enabled) return;
    const frames = [ramp[0], ramp[1], ramp[0], -1, ramp[2]];
    frames.forEach((c, i) =>
      this.scene.time.delayedCall(i * 35, () => {
        this.g.clear();
        if (c < 0) return;
        this.g.fillStyle(c, 1);
        this.line([x0, y0], [x1, y1], i === 0 ? 3 : 2);
      }),
    );
    this.scene.time.delayedCall(frames.length * 35, () => this.g.clear());
  }

  private line(a: [number, number], b: [number, number], w: number) {
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (let i = 0; i <= n; i++) this.g.fillRect(Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n), w, w);
  }

  // A shape flies from caster to target leaving a trail. Resolves on arrival.
  shot(x0: number, y0: number, x1: number, y1: number, el: Element, tier: number): Promise<void> {
    const L = LOOKS[el];
    if (!this.enabled) return Promise.resolve();
    const head = this.scene.add.image(x0, y0, L.shape).setDepth(this.depth + 1).setTint(L.ramp[0]).setScale(tier >= 3 ? 2 : 1);
    const ms = 150 + Math.abs(x1 - x0) * 0.4;
    return new Promise((res) => {
      let k = 0;
      this.scene.tweens.add({
        targets: head,
        x: x1,
        y: y1,
        duration: ms,
        ease: 'Quad.in',
        onUpdate: () => {
          if (k++ % 2 === 0) this.emit(head.x, head.y, tier, L.shape, L.ramp.slice(1), 'drift', { spread: 2, ambient: true });
        },
        onComplete: () => {
          head.destroy();
          res();
        },
      });
    });
  }

  // Falls on the target from above: a light column (holy), a bolt (storm), a rune (void).
  drop(x: number, y: number, el: Element, tier: number) {
    const L = LOOKS[el];
    if (L.bolt) return this.bolt(x, y, L.ramp, tier);
    if (!this.enabled) return;
    const w = 2 + tier * 2;
    [L.ramp[0], L.ramp[1], -1, L.ramp[2]].forEach((c, i) =>
      this.scene.time.delayedCall(i * 40, () => {
        this.g.clear();
        if (c < 0) return;
        this.g.fillStyle(c, 1).fillRect(Math.round(x - w / 2 + i / 2), 28, Math.max(1, w - i), y - 28);
      }),
    );
    this.scene.time.delayedCall(200, () => this.g.clear());
  }

  flash(color: number, ms = 50) {
    if (!this.enabled || store.shake === false) return; // reuse the shake switch: "screen effects"
    this.flashRect.setFillStyle(color, 0.28).setVisible(true);
    this.scene.time.delayedCall(ms, () => this.flashRect.setVisible(false));
  }

  // ---------------------------------------------------------------- composed cues

  // Wind-up on the caster: element motes sucked into the paw. Self-casts ring the feet.
  cast(x: number, y: number, el: Element, tier: number, self: boolean) {
    const L = LOOKS[el];
    this.emit(x + 8, y - 14, 3 + tier * 2, 'px1', L.ramp, 'implode', { radius: 10 + tier * 3 });
    if (self) {
      this.ring(x, y - 2, L.ramp, 3 + tier, { ms: 45 });
      this.emit(x, y - 10, 4 + tier * 3, L.shape, L.ramp, 'rise', { spread: 16 });
    }
  }

  impact(x: number, y: number, el: Element, tier: number, crit: boolean) {
    const L = LOOKS[el];
    const n = [0, 6, 10, 16][tier] * (crit ? 1.5 : 1);
    this.hitSpark(x, y, tier - 1 + (crit ? 1 : 0), L.ramp);
    this.emit(x, y, n, L.shape, L.ramp, L.motion, { spread: 6, scale: tier >= 3 || crit ? 2 : 1 });
    this.emit(x, y, Math.ceil(n / 2), 'px1', [0xf4f4f4, ...L.ramp], 'burst');
    if (L.ring || tier >= 3 || crit) this.ring(x, y, crit ? [0xf4f4f4, ...L.ramp] : L.ramp, 3 + tier + (crit ? 1 : 0));
    if (tier >= 3) this.flash(L.ramp[0]);
  }

  heal(x: number, y: number, frac: number) {
    const ramp = R('wmLG');
    this.emit(x, y - 12, 4 + Math.round(frac * 30), 'fx_plus', ramp, 'rise', { spread: 18 });
    this.ring(x, y, ramp, 4, { ms: 50 });
  }

  block(x: number, y: number) {
    const ramp = R('wCc');
    this.ring(x, y - 14, ramp, 5, { inward: true, ms: 30 });
    this.emit(x, y - 14, 4, 'pt_spark', ramp, 'burst');
  }

  dodge(x: number, y: number, dir: number) {
    const ramp = R('wCc');
    for (let i = 0; i < 4; i++) this.emit(x - dir * 4, y - 6 - i * 5, 1, 'fx_streak', ramp, 'implode', { radius: 0 });
  }

  death(x: number, y: number, colors: number[], boss: boolean, h: number) {
    const ramp = [...colors.slice(0, 3), hex('g'), hex('d')];
    this.emit(x, y - h / 2, boss ? 40 : 14, 'fx_chunk', ramp, 'fall', { spread: 10 });
    this.emit(x, y - 4, boss ? 12 : 6, 'fx_puff_l', R('lgd'), 'rise', { spread: 14 });
    // The little skull that floats off a dead critter: the joke that tells you it's gone.
    this.emit(x, y - h, 1, 'fx_skull', R('wwl'), 'rise');
    if (boss) [0, 160, 320].forEach((d, i) => this.scene.time.delayedCall(d, () => this.ring(x, y - h / 2, [0xf4f4f4, ...ramp], 6 + i)));
  }

  // ---------------------------------------------------------------- statuses

  // Applied: the icon is stamped out of the hit point and flies to the unit's status row.
  statusApply(x: number, y: number, rowX: number, rowY: number, key: StatusKey) {
    const S = STATUS_LOOKS[key];
    if (!this.enabled) return;
    const icon = this.scene.add.image(x, y, 'st_' + key).setDepth(this.depth + 2).setScale(2);
    this.emit(x, y, 5, S.shape, S.ramp, S.motion === 'implode' ? 'burst' : S.motion, { spread: 4 });
    if (key === 'mark') this.ring(x, y, S.ramp, 6, { inward: true, ms: 35 });
    this.scene.tweens.add({ targets: icon, x: rowX, y: rowY, scale: 1, duration: 260, ease: 'Back.in', onComplete: () => icon.destroy() });
  }

  // Stacked: the row icon kicks and spits two motes.
  statusStack(rowX: number, rowY: number, key: StatusKey) {
    const S = STATUS_LOOKS[key];
    this.emit(rowX, rowY, 2, 'px1', S.ramp, 'burst');
  }

  // Ticked (damage over time): a puff of its particles on the body, number in its colour.
  statusTick(x: number, y: number, key: StatusKey) {
    const S = STATUS_LOOKS[key];
    this.emit(x, y, 6, S.shape, S.ramp, S.motion === 'implode' ? 'burst' : S.motion, { spread: 10 });
  }

  // Expired: icon pops into four grey pixels. Cleansed: a white flash ring instead.
  statusEnd(rowX: number, rowY: number, cleansed: boolean) {
    if (cleansed) this.ring(rowX, rowY, R('wl'), 3, { ms: 30 });
    this.emit(rowX, rowY, 4, 'px1', R('lgd'), 'burst');
  }

  // Called each frame per unit: thin, rate-limited emission for the top two statuses.
  ambient(id: string, x: number, top: number, h: number, st: Partial<Record<StatusKey, number>>, dt: number) {
    if (!this.enabled) return;
    let shown = 0;
    for (const k of AMBIENT_ORDER) {
      if (!st[k] || shown >= AMBIENT_MAX) continue;
      const S = STATUS_LOOKS[k];
      if (!S.rate) continue;
      shown++;
      const tk = id + k;
      const t = (this.ambientT.get(tk) ?? Math.random()) - dt * S.rate * this.quality;
      if (t > 0) {
        this.ambientT.set(tk, t);
        continue;
      }
      this.ambientT.set(tk, t + 1);
      const y = k === 'stun' || k === 'focus' ? top - 2 : k === 'chill' || k === 'weak' ? top + 2 : top + h * (0.3 + Math.random() * 0.6);
      this.emit(x + (Math.random() - 0.5) * 14, y, 1, S.shape, S.ramp, S.motion === 'fall' ? 'drift' : S.motion, { ambient: true });
    }
  }
}
