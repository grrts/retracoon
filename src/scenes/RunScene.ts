import Phaser from 'phaser';
import { W, H } from '../config';
import { GROUND_Y } from '../gfx/textures';
import { biomes, sharedEncounters } from '../content/registry';
import type { BiomeDef, StatusKey } from '../content/types';
import { Combat, Ev, Foe, ELITE_INFO } from '../game/combat';
import {
  RunState,
  newRun,
  danger,
  maxHp,
  gainXp,
  xpToLevel,
  shinyMult,
  computeBonus,
  LEG_NODES,
  randomItem,
  apPerTurn,
} from '../game/run';
import { RaccoonView, wrap } from '../game/views';
import { text, panel, button, wait, Button } from '../ui';
import { sfx } from '../audio';
import { store, save } from '../save';
import { COL } from '../gfx/palette';

const PX_PER_M = 6;
const COON_X = 64;

interface FoeView {
  uid: number;
  c: Phaser.GameObjects.Container;
  spr: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Graphics;
  intent: Phaser.GameObjects.Container;
  status: Phaser.GameObjects.Container;
  name: Phaser.GameObjects.BitmapText;
  hp: number;
  block: number;
  w: number;
  h: number;
}

export class RunScene extends Phaser.Scene {
  run!: RunState;
  private biome!: BiomeDef;
  private sky!: Phaser.GameObjects.TileSprite;
  private far!: Phaser.GameObjects.TileSprite;
  private near!: Phaser.GameObjects.TileSprite;
  private ground!: Phaser.GameObjects.TileSprite;
  coon!: RaccoonView;
  private hud!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.BitmapText;
  private lvText!: Phaser.GameObjects.BitmapText;
  private distText!: Phaser.GameObjects.BitmapText;
  private areaText!: Phaser.GameObjects.BitmapText;
  private shinyText!: Phaser.GameObjects.BitmapText;
  private coonBars!: Phaser.GameObjects.Graphics;
  private coonStatus!: Phaser.GameObjects.Container;

  private combat: Combat | null = null;
  private views = new Map<number, FoeView>();
  private target: number | null = null;
  private arrow!: Phaser.GameObjects.Image;
  private ui: Phaser.GameObjects.GameObject[] = [];
  private skillBtns: { b: Button; i: number; cd: Phaser.GameObjects.BitmapText; cost: Phaser.GameObjects.Graphics }[] = [];
  private endBtn: Button | null = null;
  private apG: Phaser.GameObjects.Graphics | null = null;
  private tip!: Phaser.GameObjects.BitmapText;
  private hazardText: Phaser.GameObjects.BitmapText | null = null;
  private busy = false;
  private walking = false;
  private walkLeft = 0;
  private scroll = 0;
  private pendingElite = false;
  private walkedPx = 0;

  constructor() {
    super('Run');
  }

  create(data: { run?: RunState }) {
    this.run = data.run ?? newRun();
    store.runs++;
    save();
    this.views.clear();
    this.ui = [];
    this.skillBtns = [];
    this.combat = null;
    this.busy = false;
    this.walking = false;

    this.biome = biomes[this.run.area % biomes.length];
    this.sky = this.add.tileSprite(0, 0, W, H, `sky_${this.biome.id}`).setOrigin(0).setDepth(-20);
    this.far = this.add.tileSprite(0, 0, W, GROUND_Y + 4, `far_${this.biome.id}`).setOrigin(0).setDepth(-19);
    this.near = this.add.tileSprite(0, 0, W, GROUND_Y + 2, `near_${this.biome.id}`).setOrigin(0).setDepth(-18);
    this.ground = this.add.tileSprite(0, GROUND_Y - 2, W, H - GROUND_Y + 2, `ground_${this.biome.id}`).setOrigin(0).setDepth(-17);

    this.add.image(COON_X, GROUND_Y + 1, 'shadow').setDepth(1);
    this.coon = new RaccoonView(this, COON_X, GROUND_Y + 1, this.run).setDepth(10);
    this.coonBars = this.add.graphics().setDepth(11);
    this.coonStatus = this.add.container(COON_X - 10, GROUND_Y + 10).setDepth(11);
    this.arrow = this.add.image(0, 0, 'arrow').setDepth(30).setVisible(false);
    this.tweens.add({ targets: this.arrow, y: '+=2', yoyo: true, repeat: -1, duration: 300 });

    this.buildHud();
    this.tip = text(this, W / 2, GROUND_Y + 8, '', { color: COL.light }).setDepth(40);

    sfx.playMusic('run');
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => this.onKey(e));
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.autoPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.HIDDEN, this.autoPause, this));
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      sfx.resume();
      this.refreshHud();
      this.coon.setGear(this.run);
    });

    this.cameras.main.fadeIn(250, 26, 28, 44);
    this.banner(this.biome.name, `AREA ${this.run.area + 1}`);
    this.time.delayedCall(400, () => this.walk());
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    this.hud = this.add.graphics().setDepth(60);
    this.hpText = text(this, 30, 6, '', { color: COL.white }).setDepth(61);
    this.lvText = text(this, 72, 6, '', { origin: 0, color: COL.yellow }).setDepth(61);
    this.distText = text(this, W / 2, 6, '', { color: COL.white }).setDepth(61);
    this.areaText = text(this, W / 2, 15, '', { color: COL.light }).setDepth(61);
    this.shinyText = text(this, W - 22, 6, '', { origin: 1, color: COL.yellow }).setDepth(61);
    this.add.image(W - 20 - 0, 6, 'coin').setDepth(61).setOrigin(0, 0.5);
    const pz = this.add.zone(W - 8, 7, 18, 16).setInteractive({ useHandCursor: true }).setDepth(70);
    pz.on('pointerup', () => this.pause());
    this.refreshHud();
  }

  refreshHud() {
    const r = this.run;
    const g = this.hud;
    const mhp = maxHp(r);
    const hp = this.combat ? this.combat.hp : r.hp;
    g.clear();
    g.fillStyle(0x1a1c2c, 0.65).fillRect(0, 0, W, 12);
    // hp bar
    g.fillStyle(0x1a1c2c, 1).fillRect(2, 2, 56, 8);
    g.fillStyle(0x5d275d, 1).fillRect(3, 3, 54, 6);
    g.fillStyle(hp / mhp < 0.35 ? 0xef7d57 : 0xb13e53, 1).fillRect(3, 3, Math.round((54 * hp) / mhp), 6);
    this.hpText.setText(`${hp}/${mhp}`);
    // xp bar
    this.lvText.setText(`LV${r.level}`);
    const lx = 72 + this.lvText.width + 3;
    g.fillStyle(0x1a1c2c, 1).fillRect(lx, 4, 32, 4);
    g.fillStyle(0x333c57, 1).fillRect(lx + 1, 5, 30, 2);
    g.fillStyle(0xffcd75, 1).fillRect(lx + 1, 5, Math.round((30 * r.xp) / xpToLevel(r.level)), 2);
    this.distText.setText(`${Math.floor(r.distance)}M`);
    const pips = LEG_NODES.map((n, i) => (i < r.node ? '#' : i === r.node ? (n === 'boss' ? '*' : '+') : n === 'boss' ? '*' : '-')).join('');
    this.areaText.setText(`${this.biome.name} ${pips}`);
    this.shinyText.setText(`${r.shinies}`);
    // pause icon
    g.fillStyle(0x94b0c2, 1).fillRect(W - 11, 3, 2, 6).fillRect(W - 7, 3, 2, 6);

    // bars under the raccoon
    const b = this.coonBars;
    b.clear();
    this.blockTexts.forEach((t) => t.destroy());
    this.blockTexts = [];
    if (this.combat) {
      const x = COON_X - 12;
      const y = GROUND_Y + 4;
      b.fillStyle(0x1a1c2c, 1).fillRect(x, y, 24, 4);
      b.fillStyle(0x5d275d, 1).fillRect(x + 1, y + 1, 22, 2);
      b.fillStyle(0xb13e53, 1).fillRect(x + 1, y + 1, Math.round((22 * this.combat.hp) / this.combat.maxHp), 2);
      if (this.combat.block > 0) this.drawBlock(b, x - 9, y - 2, this.combat.block);
    }
  }

  private blockTexts: Phaser.GameObjects.BitmapText[] = [];
  private drawBlock(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number) {
    g.fillStyle(0x1a1c2c, 1).fillRect(x, y, 9, 8);
    g.fillStyle(0x41a6f6, 1).fillRect(x + 1, y + 1, 7, 6);
    const t = text(this, x + 4.5, y + 4, `${n}`, { color: COL.white }).setDepth(12);
    this.blockTexts.push(t);
  }

  private banner(title: string, sub?: string, color = COL.white) {
    const y = 46;
    const g = this.add.graphics().setDepth(80);
    panel(g, -4, y - 12, W + 8, sub ? 28 : 20, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    const t = text(this, W / 2, y - 3, title, { scale: 2, color }).setDepth(81);
    const s = sub ? text(this, W / 2, y + 9, sub, { color: COL.yellow }).setDepth(81) : null;
    const all = [g, t, ...(s ? [s] : [])];
    all.forEach((o) => (o.x -= W));
    this.tweens.add({ targets: all, x: `+=${W}`, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: all, x: `+=${W}`, alpha: 0, delay: 1300, duration: 260, ease: 'Cubic.in', onComplete: () => all.forEach((o) => o.destroy()) });
  }

  private float(x: number, y: number, str: string, color: number, big = false) {
    const t = text(this, x, y, str, { color, scale: big ? 2 : 1 }).setDepth(65);
    this.tweens.add({ targets: t, y: y - 14, duration: 650, ease: 'Cubic.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 400, duration: 300, onComplete: () => t.destroy() });
  }

  // ---------------------------------------------------------------- walking

  update(_t: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    this.coon.update(dt);
    if (this.walking) {
      const speed = 70;
      const dx = speed * dt;
      this.scroll += dx;
      this.walkedPx += dx;
      this.run.distance += dx / PX_PER_M;
      this.walkLeft -= dt;
      this.sky.tilePositionX = this.scroll * 0.05;
      this.far.tilePositionX = this.scroll * 0.25;
      this.near.tilePositionX = this.scroll * 0.6;
      this.ground.tilePositionX = this.scroll;
      this.distText.setText(`${Math.floor(this.run.distance)}M`);
      if (this.walkLeft <= 0) {
        this.walking = false;
        this.coon.play('idle');
        this.arrive();
      }
    }
    // keep foe sprites bobbing in their containers
    for (const v of this.views.values()) v.shadow.setPosition(v.c.x, GROUND_Y + 1);
  }

  private walk(duration = 1.7) {
    this.clearCombatUi();
    this.walking = true;
    this.walkLeft = duration;
    this.coon.play('walk');
    this.tip.setText('');
  }

  private arrive() {
    const kind = LEG_NODES[this.run.node];
    if (kind === 'fork') this.runSteps([{ key: 'Fork', data: { run: this.run } }]);
    else this.approach(kind === 'boss');
  }

  // Called by overlay scenes when they are done.
  continueRun() {
    this.refreshHud();
    this.coon.setGear(this.run);
    this.advance();
  }

  private advance() {
    this.run.node++;
    if (this.run.node >= LEG_NODES.length) {
      this.run.node = 0;
      this.run.area++;
      this.changeArea();
      return;
    }
    this.refreshHud();
    this.walk();
  }

  private changeArea() {
    this.biome = biomes[this.run.area % biomes.length];
    this.cameras.main.fadeOut(400, 26, 28, 44);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.sky.setTexture(`sky_${this.biome.id}`);
      this.far.setTexture(`far_${this.biome.id}`);
      this.near.setTexture(`near_${this.biome.id}`);
      this.ground.setTexture(`ground_${this.biome.id}`);
      this.refreshHud();
      this.cameras.main.fadeIn(400, 26, 28, 44);
      this.banner(this.biome.name, `AREA ${this.run.area + 1}  DANGER ${danger(this.run)}`);
      sfx.playMusic('run');
      this.time.delayedCall(600, () => this.walk());
    });
  }

  // ---------------------------------------------------------------- encounter

  private pickEncounter(): string[] {
    const d = danger(this.run);
    const pool = [...sharedEncounters, ...this.biome.encounters].filter((e) => d >= e.minDanger && (!e.maxDanger || d <= e.maxDanger));
    const total = pool.reduce((a, e) => a + e.weight, 0);
    let x = Math.random() * total;
    for (const e of pool) {
      x -= e.weight;
      if (x <= 0) return e.foes;
    }
    return pool[0]?.foes ?? ['rat'];
  }

  private approach(boss: boolean) {
    const elite = !boss && this.run.eliteNext;
    let foes: string[];
    if (boss) foes = [this.biome.boss];
    else if (elite) {
      const e = this.biome.elites;
      foes = [e[Math.floor(Math.random() * e.length)]];
      if (danger(this.run) >= 6) foes.push(e[Math.floor(Math.random() * e.length)]);
    } else foes = this.pickEncounter();
    this.pendingElite = elite;

    // Preview: create a throwaway combat to get scaled HP for the cards.
    this.combat = new Combat(this.run, foes, danger(this.run), {
      elite,
      boss,
      hazard: this.biome.hazard,
      hooks: { shinies: () => this.run.shinies, addShinies: (n) => (this.run.shinies = Math.max(0, this.run.shinies + n)) },
    });
    this.layoutFoes(true);
    if (boss) {
      sfx.warn();
      sfx.playMusic('boss');
    }
    this.time.delayedCall(boss ? 900 : 650, () => this.showPrompt(boss, elite));
  }

  private showPrompt(boss: boolean, elite: boolean) {
    const c = this.combat!;
    const names = c.foes.map((f) => (f.elite ? `${ELITE_INFO[f.elite].name} ` : '') + f.def.name);
    const title = boss ? 'BOSS FIGHT!' : elite ? 'ELITE FIGHT!' : 'CRITTERS AHEAD!';
    const g = this.add.graphics().setDepth(50);
    const pw = Math.min(W - 16, 260);
    const px = W / 2 - pw / 2;
    const py = GROUND_Y + 6;
    panel(g, px, py, pw, H - py - 4, 0x29366f, boss ? 0xb13e53 : 0x1a1c2c, 0x3b5dc9);
    const t1 = text(this, W / 2, py + 9, title, { color: boss ? COL.red : elite ? COL.orange : COL.yellow }).setDepth(51);
    const summary = wrap(names.join(', '), Math.floor(pw / 4) - 2).slice(0, 1).join(' ');
    const t2 = text(this, W / 2, py + 18, summary, { color: COL.light }).setDepth(51);
    const fight = button(this, W / 2 - pw / 4, H - 15, pw / 2 - 12, 18, 'FIGHT', () => this.beginFight(), { fill: 0xb13e53, light: 0xef7d57, depth: 52 });
    const retreat = button(this, W / 2 + pw / 4, H - 15, pw / 2 - 12, 18, 'RETREAT', () => this.confirmRetreat(), { depth: 52 });
    this.ui.push(g, t1, t2, fight.c, retreat.c);
    this.tip.setText('');
  }

  private confirmRetreat() {
    this.clearCombatUi();
    const g = this.add.graphics().setDepth(50);
    const pw = Math.min(W - 16, 270);
    const px = W / 2 - pw / 2;
    const py = GROUND_Y + 2;
    panel(g, px, py, pw, H - py - 4, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    const kept = `LV ${this.run.level} AND YOUR STATS`;
    const t1 = text(this, W / 2, py + 9, 'RETREAT AND END THIS RUN?', { color: COL.yellow }).setDepth(51);
    const t2 = text(this, W / 2, py + 19, `YOU KEEP ${kept}.`, { color: COL.lime }).setDepth(51);
    const t3 = text(this, W / 2, py + 28, 'YOU LOSE ITEMS, SKILLS AND SHINIES.', { color: COL.orange }).setDepth(51);
    const yes = button(this, W / 2 + pw / 4, H - 12, pw / 2 - 12, 14, 'RETREAT', () => this.retreat(), { depth: 52 });
    const no = button(this, W / 2 - pw / 4, H - 12, pw / 2 - 12, 14, 'BACK', () => {
      this.clearCombatUi();
      this.showPrompt(LEG_NODES[this.run.node] === 'boss', this.pendingElite);
    }, { fill: 0xb13e53, light: 0xef7d57, depth: 52 });
    this.ui.push(g, t1, t2, t3, yes.c, no.c);
  }

  private retreat() {
    this.clearCombatUi();
    store.kept = { level: this.run.level, stats: { ...this.run.stats }, statPoints: this.run.statPoints };
    this.finish('retreat');
  }

  private finish(reason: 'death' | 'retreat') {
    const d = Math.floor(this.run.distance);
    const newBest = d > store.bestDistance;
    if (newBest) store.bestDistance = d;
    store.bestLevel = Math.max(store.bestLevel, this.run.level);
    if (reason === 'death') store.kept = null;
    save();
    sfx.stopMusic();
    this.scene.pause();
    this.scene.launch('GameOver', { run: this.run, reason, newBest });
  }

  // ---------------------------------------------------------------- foes on screen

  private layoutFoes(walkIn: boolean) {
    const c = this.combat!;
    const alive = c.foes.filter((f) => !f.dead);
    const n = alive.length;
    const left = Math.max(COON_X + 60, W * 0.45);
    const right = W - 18;
    alive.forEach((f, i) => {
      const x = n === 1 ? (left + right) / 2 + 10 : left + ((right - left) * (i + 0.5)) / n;
      let v = this.views.get(f.uid);
      if (!v) {
        v = this.makeFoeView(f, walkIn ? W + 30 + i * 20 : x);
        this.views.set(f.uid, v);
      }
      this.tweens.add({ targets: v.c, x, duration: walkIn ? 700 : 300, ease: walkIn ? 'Quad.out' : 'Sine.inOut' });
    });
  }

  private makeFoeView(f: Foe, x: number): FoeView {
    const c = this.add.container(x, GROUND_Y + 1).setDepth(9);
    const spr = this.add.sprite(0, 0, `${f.def.id}_0`).setOrigin(0.5, 1);
    const frames = f.def.frames.map((_, i) => ({ key: `${f.def.id}_${i}` }));
    const animKey = `anim_${f.def.id}`;
    if (!this.anims.exists(animKey)) this.anims.create({ key: animKey, frames, frameRate: f.def.fps ?? 4, repeat: -1 });
    spr.play({ key: animKey, startFrame: Math.floor(Math.random() * frames.length) });
    if (f.def.flyer) spr.y = -14;
    if (f.elite) spr.setTint(ELITE_INFO[f.elite].color);
    const w = spr.width;
    const h = spr.height + (f.def.flyer ? 14 : 0);
    const shadow = this.add.image(x, GROUND_Y + 1, 'shadow').setScale(w / 16, 1).setDepth(1);
    if (f.def.flyer) this.tweens.add({ targets: spr, y: -17, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
    const hpBar = this.add.graphics();
    const intent = this.add.container(0, -h - 9);
    const status = this.add.container(-12, 13);
    const name = text(this, 0, -h - 18, f.elite ? ELITE_INFO[f.elite].name : '', { color: f.elite ? ELITE_INFO[f.elite].color : COL.light });
    c.add([spr, hpBar, intent, status, name]);
    c.setSize(Math.max(20, w + 6), h + 20);
    c.setInteractive(new Phaser.Geom.Rectangle(-Math.max(10, w / 2 + 3), -h - 12, Math.max(20, w + 6), h + 26), Phaser.Geom.Rectangle.Contains);
    c.on('pointerdown', () => this.setTarget(f.uid, true));
    const v: FoeView = { uid: f.uid, c, spr, shadow, hpBar, intent, status, name, hp: f.hp, block: f.block, w, h };
    this.drawFoeBars(v, f);
    this.drawIntent(v, f);
    return v;
  }

  private drawFoeBars(v: FoeView, f: Foe) {
    const g = v.hpBar;
    g.clear();
    const bw = Math.max(20, Math.min(36, v.w));
    const x = -bw / 2;
    const y = 4;
    g.fillStyle(0x1a1c2c, 1).fillRect(x, y, bw, 4);
    g.fillStyle(0x5d275d, 1).fillRect(x + 1, y + 1, bw - 2, 2);
    g.fillStyle(f.def.boss ? 0xffa300 : 0xb13e53, 1).fillRect(x + 1, y + 1, Math.round(((bw - 2) * Math.max(0, v.hp)) / f.maxHp), 2);
    v.c.list.filter((o) => o.getData && o.getData('hpnum')).forEach((o) => o.destroy());
    const num = text(this, 0, y + 9, `${Math.max(0, v.hp)}`, { color: COL.white }).setData('hpnum', true);
    v.c.add(num);
    if (v.block > 0) {
      g.fillStyle(0x1a1c2c, 1).fillRect(x - 10, y - 2, 9, 8);
      g.fillStyle(0x41a6f6, 1).fillRect(x - 9, y - 1, 7, 6);
      const bt = text(this, x - 5.5, y + 2, `${v.block}`, { color: COL.white }).setData('hpnum', true);
      v.c.add(bt);
    }
    this.drawStatuses(v.status, f.status, 0);
  }

  private drawStatuses(cont: Phaser.GameObjects.Container, st: Partial<Record<StatusKey, number>>, _x: number) {
    cont.removeAll(true);
    let i = 0;
    for (const [k, n] of Object.entries(st)) {
      if (!n || k === 'thorns' && n <= 0) continue;
      const x = i * 10;
      cont.add(this.add.image(x, 0, 'st_' + k).setOrigin(0, 0.5));
      cont.add(text(this, x + 8, 2, `${n}`, { origin: 0, color: COL.white }));
      i++;
    }
  }

  private drawIntent(v: FoeView, f: Foe) {
    v.intent.removeAll(true);
    if (f.dead) return;
    if (f.status.stun) {
      v.intent.add(this.add.image(0, 0, 'st_stun'));
      return;
    }
    const m = f.intent;
    const icon = this.add.image(-3, 0, 'in_' + m.intent);
    v.intent.add(icon);
    if (m.dmg && this.combat) {
      const d = this.combat.intentDamage(f);
      v.intent.add(text(this, 3, 1, m.hits && m.hits > 1 ? `${d}x${m.hits}` : `${d}`, { origin: 0, color: m.intent === 'charge' ? COL.orange : COL.white }));
    }
    if (m.intent === 'charge') this.tweens.add({ targets: icon, scale: 1.4, yoyo: true, repeat: 2, duration: 160 });
  }

  private setTarget(uid: number, fromTap = false) {
    const f = this.combat?.foe(uid);
    if (!f || f.dead) return;
    this.target = uid;
    const v = this.views.get(uid);
    if (v) {
      this.arrow.setVisible(!!this.combat && !this.busy && this.skillBtns.length > 0);
      this.arrow.setPosition(v.c.x, GROUND_Y + 1 - v.h - 26);
    }
    if (fromTap) {
      const m = f.intent;
      const d = this.combat!.intentDamage(f);
      const what: Record<string, string> = {
        attack: `WILL ATTACK FOR ${d}`,
        multi: `WILL HIT ${m.hits} TIMES FOR ${d}`,
        block: 'WILL BLOCK',
        buff: 'WILL POWER UP',
        debuff: 'WILL CURSE YOU',
        heal: 'WILL HEAL',
        summon: 'WILL CALL FOR HELP',
        charge: 'IS WINDING UP A HUGE HIT!',
        steal: 'WILL STEAL SHINIES',
        flee: 'WILL RUN',
      };
      this.tip.setText(`${f.def.name} ${f.hp}/${f.maxHp}: ${m.name} - ${f.status.stun ? 'STUNNED' : what[m.intent]}`);
    }
  }

  // ---------------------------------------------------------------- combat

  private beginFight() {
    this.clearCombatUi();
    this.run.fights++;
    const c = this.combat!;
    this.layoutFoes(false);
    this.refreshHud();
    this.busy = true;
    void this.playEvents(c.start()).then(() => this.afterEvents());
  }

  private buildCombatUi() {
    this.clearCombatUi();
    const c = this.combat!;
    const y = H - 22;
    const g = this.add.graphics().setDepth(48);
    g.fillStyle(0x1a1c2c, 0.7).fillRect(0, GROUND_Y + 14, W, H - GROUND_Y - 14);
    this.ui.push(g);
    // AP pips
    this.apG = this.add.graphics().setDepth(50);
    this.ui.push(this.apG, text(this, 12, GROUND_Y + 22, 'AP', { color: COL.ice }).setDepth(50));
    // skills
    const n = this.run.skills.length;
    const endW = 52;
    const avail = W - 26 - endW - 8;
    const bw = Math.min(54, Math.floor((avail - (n - 1) * 3) / Math.max(n, 4)));
    this.skillBtns = [];
    this.run.skills.forEach((_, i) => {
      const s = c.skillAt(i)!;
      const x = 26 + bw / 2 + i * (bw + 3);
      const b = button(this, x, y, bw, 30, '', () => this.useSkill(i), { depth: 50 });
      b.label.destroy();
      const icon = this.add.image(0, -5, `skill_${s.def.id}`).setScale(1);
      const nm = text(this, 0, 7, s.def.name.length > 10 ? s.def.name.split(' ')[0] : s.def.name, { color: COL.white });
      const lv = s.lvl > 1 ? text(this, bw / 2 - 5, -9, `${s.lvl}`, { color: COL.yellow }) : null;
      const cost = this.add.graphics();
      for (let k = 0; k < s.def.cost; k++) {
        cost.fillStyle(0x1a1c2c, 1).fillRect(-bw / 2 + 3 + k * 5, -12, 4, 4);
        cost.fillStyle(0x73eff7, 1).fillRect(-bw / 2 + 4 + k * 5, -11, 2, 2);
      }
      const cd = text(this, 0, -4, '', { scale: 2, color: COL.white });
      b.c.add([icon, nm, cost, cd, ...(lv ? [lv] : [])]);
      // hover / long-press shows what the skill does
      b.c.on('pointerover', () => this.tip.setText(`${s.def.name}: ${s.def.desc(s.lvl)}`));
      this.skillBtns.push({ b, i, cd, cost });
      this.ui.push(b.c);
    });
    this.endBtn = button(this, W - endW / 2 - 4, y, endW, 30, 'END TURN', () => this.endTurn(), { fill: 0x257179, light: 0x38b764, depth: 50 });
    this.ui.push(this.endBtn.c);
    if (this.biome.hazard) {
      this.hazardText = text(this, W - 4, 22, '', { origin: 1, color: COL.orange }).setDepth(50);
      this.ui.push(this.hazardText);
    }
    this.refreshCombatUi();
  }

  private refreshCombatUi() {
    const c = this.combat;
    if (!c) return;
    for (const s of this.skillBtns) {
      const usable = c.canUse(s.i) && !this.busy;
      s.b.setEnabled(usable);
      s.cd.setText(c.cooldowns[s.i] > 0 ? `${c.cooldowns[s.i]}` : '');
      s.b.c.setAlpha(c.cooldowns[s.i] > 0 ? 0.7 : 1);
    }
    this.endBtn?.setEnabled(!this.busy);
    // Nothing left to do this turn: make END TURN the obvious next tap.
    const stuck = !this.busy && !this.skillBtns.some((s) => c.canUse(s.i));
    if (stuck) this.endBtn?.setColors(0xb13e53, 0x1a1c2c, 0xef7d57);
    else this.endBtn?.setColors(0x257179, 0x1a1c2c, 0x38b764);
    if (this.apG) {
      const g = this.apG;
      g.clear();
      const max = Math.max(c.ap, apPerTurn(this.run));
      for (let k = 0; k < max; k++) {
        const x = 7 + (k % 2) * 7;
        const y = GROUND_Y + 30 + Math.floor(k / 2) * 7;
        g.fillStyle(0x1a1c2c, 1).fillRect(x, y, 6, 6);
        g.fillStyle(k < c.ap ? 0x73eff7 : 0x333c57, 1).fillRect(x + 1, y + 1, 4, 4);
      }
    }
    if (this.hazardText && this.biome.hazard) this.hazardText.setText(`${this.biome.hazard.name} IN ${c.hazardIn}`);
    if (this.target === null || c.foe(this.target)?.dead) {
      const first = c.alive()[0];
      if (first) this.setTarget(first.uid);
    } else this.setTarget(this.target);
    this.arrow.setVisible(!this.busy && c.alive().length > 1);
    this.drawStatuses(this.coonStatus, c.status, 0);
  }

  private clearCombatUi() {
    this.ui.forEach((o) => o.destroy());
    this.ui = [];
    this.skillBtns = [];
    this.endBtn = null;
    this.apG = null;
    this.hazardText = null;
    this.arrow?.setVisible(false);
  }

  private useSkill(i: number) {
    const c = this.combat;
    if (!c || this.busy || !c.canUse(i)) return;
    this.busy = true;
    this.refreshCombatUi();
    void this.playEvents(c.use(i, this.target ?? undefined)).then(() => this.afterEvents());
  }

  private endTurn() {
    const c = this.combat;
    if (!c || this.busy) return;
    this.busy = true;
    this.refreshCombatUi();
    this.tip.setText('');
    void this.playEvents(c.endTurn()).then(() => this.afterEvents());
  }

  private afterEvents() {
    const c = this.combat!;
    this.busy = false;
    const o = c.outcome();
    if (o === 'win') return void this.victory();
    if (o === 'lose') return void this.defeat();
    if (!this.skillBtns.length) this.buildCombatUi();
    this.refreshCombatUi();
    this.refreshHud();
  }

  private onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') return this.pause();
    if (!this.combat || this.busy) return;
    if (e.key >= '1' && e.key <= '4') this.useSkill(Number(e.key) - 1);
    else if (e.key === ' ' || e.key === 'Enter') {
      if (this.skillBtns.length) this.endTurn();
    } else if (e.key === 'Tab' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const alive = this.combat.alive();
      const idx = alive.findIndex((f) => f.uid === this.target);
      const next = alive[(idx + (e.key === 'ArrowLeft' ? alive.length - 1 : 1)) % alive.length];
      if (next) this.setTarget(next.uid, true);
    }
  }

  // ---------------------------------------------------------------- event playback

  private async playEvents(evs: Ev[]) {
    const c = this.combat!;
    for (const e of evs) {
      switch (e.t) {
        case 'turn':
          if (e.side === 'foes') await wait(this, 150);
          break;
        case 'act': {
          if (e.who === 'p') {
            if (e.kind === 'attack') {
              this.coon.play('attack', 0.3);
              this.tweens.add({ targets: this.coon, x: COON_X + 10, yoyo: true, duration: 90 });
            }
            this.float(COON_X, GROUND_Y - 30, e.name, COL.ice);
            await wait(this, 160);
          } else {
            const v = this.views.get(e.who);
            if (!v) break;
            this.float(v.c.x, GROUND_Y - v.h - 16, e.name, e.kind === 'charge' ? COL.orange : COL.white);
            if (e.kind === 'attack' || e.kind === 'multi' || e.kind === 'steal' || e.kind === 'debuff') {
              this.tweens.add({ targets: v.c, x: v.c.x - 14, yoyo: true, duration: 110 });
            } else this.tweens.add({ targets: v.spr, scaleY: 1.15, yoyo: true, duration: 100 });
            await wait(this, 260);
          }
          break;
        }
        case 'hit': {
          if (e.who === 'p') {
            if (e.dmg > 0) {
              this.coon.play('hurt', 0.3);
              sfx.hurt();
              this.cameras.main.shake(140, 0.01);
              this.flashCoon();
            } else sfx.thud();
            this.float(COON_X, GROUND_Y - 20, e.dmg > 0 ? `-${e.dmg}` : 'BLOCKED', e.dmg > 0 ? COL.red : COL.sky, e.dmg >= 10);
            c.block >= 0 && this.refreshHud();
            this.hpText.setText(`${e.hp}/${c.maxHp}`);
          } else {
            const v = this.views.get(e.who);
            if (!v) break;
            v.hp = e.hp;
            v.block = e.block;
            const f = c.foe(e.who)!;
            this.drawFoeBars(v, f);
            v.spr.setTintFill(0xffffff);
            this.time.delayedCall(70, () => (f.elite ? v.spr.setTint(ELITE_INFO[f.elite].color) : v.spr.clearTint()));
            this.tweens.add({ targets: v.spr, x: 3, yoyo: true, duration: 50 });
            if (e.crit) {
              sfx.crit();
              this.cameras.main.shake(100, 0.006);
            } else sfx.hit();
            this.burst(v.c.x, GROUND_Y - v.h / 2, e.crit ? 10 : 5, e.crit ? [0xffcd75, 0xf4f4f4] : [0xf4f4f4]);
            this.float(v.c.x, GROUND_Y - v.h - 4, e.dmg > 0 ? `${e.dmg}${e.crit ? '!' : ''}` : 'BLOCKED', e.crit ? COL.yellow : e.dmg > 0 ? COL.white : COL.sky, e.crit);
          }
          await wait(this, e.src === 'p' ? 110 : 200);
          break;
        }
        case 'dodge':
          if (e.who === 'p') {
            this.tweens.add({ targets: this.coon, x: COON_X - 12, yoyo: true, duration: 120 });
            this.float(COON_X, GROUND_Y - 22, 'DODGE!', COL.ice);
          } else {
            const v = this.views.get(e.who);
            if (v) {
              this.tweens.add({ targets: v.c, x: v.c.x + 10, yoyo: true, duration: 120 });
              this.float(v.c.x, GROUND_Y - v.h - 4, 'MISS', COL.light);
            }
          }
          sfx.select();
          await wait(this, 180);
          break;
        case 'block':
          if (e.who === 'p') {
            this.refreshHud();
            if (e.amount > 0) this.float(COON_X, GROUND_Y - 26, `+${e.amount} BLOCK`, COL.sky);
          } else {
            const v = this.views.get(e.who);
            if (v) {
              v.block = e.block;
              this.drawFoeBars(v, c.foe(e.who)!);
              this.float(v.c.x, GROUND_Y - v.h - 4, `+${e.amount}`, COL.sky);
            }
          }
          sfx.thud();
          await wait(this, 150);
          break;
        case 'heal':
          if (e.who === 'p') {
            this.float(COON_X, GROUND_Y - 26, `+${e.amount}`, COL.lime);
            this.refreshHud();
            this.hpText.setText(`${e.hp}/${c.maxHp}`);
          } else {
            const v = this.views.get(e.who);
            if (v) {
              v.hp = e.hp;
              this.drawFoeBars(v, c.foe(e.who)!);
              this.float(v.c.x, GROUND_Y - v.h - 4, `+${e.amount}`, COL.lime);
            }
          }
          sfx.heal();
          await wait(this, 160);
          break;
        case 'status':
          if (e.who === 'p') this.drawStatuses(this.coonStatus, c.status, 0);
          else {
            const v = this.views.get(e.who);
            const f = c.foe(e.who);
            if (v && f) {
              this.drawStatuses(v.status, f.status, 0);
              this.drawIntent(v, f);
            }
          }
          break;
        case 'die':
          if (e.who === 'p') {
            await wait(this, 200);
            break;
          }
          {
            const v = this.views.get(e.who);
            const f = c.foe(e.who);
            if (v && f) {
              sfx.kill();
              this.burst(v.c.x, GROUND_Y - v.h / 2, f.def.boss ? 40 : 14, f.def.colors);
              if (f.def.boss) {
                sfx.bossDie();
                this.cameras.main.shake(500, 0.015);
                this.cameras.main.flash(200, 255, 255, 255);
              }
              this.tweens.add({ targets: [v.c, v.shadow], alpha: 0, duration: 300, onComplete: () => (v.c.destroy(), v.shadow.destroy()) });
              this.views.delete(e.who);
              this.run.kills++;
            }
            await wait(this, 220);
          }
          break;
        case 'revive': {
          if (e.who === 'p') break;
          const v = this.views.get(e.who);
          if (v) {
            v.hp = e.hp;
            this.drawFoeBars(v, c.foe(e.who)!);
            this.tweens.add({ targets: v.spr, angle: 180, yoyo: true, duration: 250 });
          }
          await wait(this, 350);
          break;
        }
        case 'summon': {
          this.layoutFoes(false);
          const v = e.who === 'p' ? undefined : this.views.get(e.who);
          if (v) {
            v.c.setAlpha(0);
            this.tweens.add({ targets: v.c, alpha: 1, duration: 250 });
          }
          await wait(this, 250);
          break;
        }
        case 'steal':
          this.float(COON_X, GROUND_Y - 32, `-${e.n} SHINIES`, COL.yellow);
          this.refreshHud();
          await wait(this, 200);
          break;
        case 'ap':
          this.refreshCombatUi();
          break;
        case 'hazard':
          this.banner(e.name + '!', this.biome.hazard?.desc, COL.orange);
          await wait(this, 500);
          break;
        case 'msg': {
          const x = e.who === 'p' ? COON_X : this.views.get(e.who)?.c.x ?? W / 2;
          this.float(x, GROUND_Y - 40, e.text, e.color ?? COL.white);
          await wait(this, 180);
          break;
        }
      }
    }
    // refresh every intent after a full exchange
    for (const [uid, v] of this.views) {
      const f = c.foe(uid);
      if (f) {
        v.hp = f.hp;
        v.block = f.block;
        this.drawFoeBars(v, f);
        this.drawIntent(v, f);
      }
    }
    this.refreshHud();
  }

  private flashCoon() {
    this.coon.base.setTintFill(0xffffff);
    this.time.delayedCall(80, () => this.coon.base.clearTint());
  }

  private burst(x: number, y: number, n: number, colors: number[]) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, 'px').setDepth(20).setTint(colors[i % colors.length]);
      if (Math.random() < 0.5) p.setScale(0.5);
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 40;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(a) * v,
        y: y + Math.sin(a) * v + 10,
        alpha: 0,
        duration: 350 + Math.random() * 250,
        ease: 'Cubic.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ---------------------------------------------------------------- outcomes

  private async victory() {
    const c = this.combat!;
    this.clearCombatUi();
    this.run.hp = c.hp;
    const boss = LEG_NODES[this.run.node] === 'boss';
    const elite = this.pendingElite;
    let xp = 0;
    let sh = 0;
    for (const f of c.killed) {
      xp += Math.round(f.def.xp * (1 + 0.1 * (danger(this.run) - 1)) * (f.elite ? 2 : 1));
      sh += f.def.shinies * (f.elite ? 2 : 1) * (0.7 + Math.random() * 0.6);
    }
    const fx = computeBonus(this.run).fx;
    sh = Math.round(sh * shinyMult(this.run));
    if (fx.interest) sh += Math.floor((this.run.shinies * fx.interest) / 100);
    this.run.shinies += sh;
    this.run.shiniesEarned += sh;
    if (boss) {
      this.run.bosses++;
      store.bossKills++;
      save();
    }
    if (elite) {
      this.run.elites++;
      this.run.eliteNext = false;
    }
    // Lick your wounds a bit after every fight.
    const before = this.run.hp;
    this.run.hp = Math.min(maxHp(this.run), this.run.hp + Math.round(maxHp(this.run) * 0.12));
    const ups = gainXp(this.run, xp);
    if (ups > 0) this.run.hp = Math.min(maxHp(this.run), this.run.hp + Math.round(maxHp(this.run) * 0.3));
    this.combat = null;
    sfx.clear();
    this.coon.play('idle');
    this.float(COON_X, GROUND_Y - 30, `+${xp} XP`, COL.yellow);
    this.time.delayedCall(250, () => this.float(COON_X + 30, GROUND_Y - 30, `+${sh}`, COL.yellow));
    if (this.run.hp > before) this.time.delayedCall(500, () => this.float(COON_X - 20, GROUND_Y - 22, `+${this.run.hp - before}`, COL.lime));
    this.refreshHud();
    this.views.forEach((v) => (v.c.destroy(), v.shadow.destroy()));
    this.views.clear();
    if (boss) sfx.playMusic('run');
    await wait(this, 900);

    // Rewards chain: item choice (elites and bosses), then level-ups.
    const steps: { key: string; data: object }[] = [];
    if (boss) steps.push({ key: 'Reward', data: { run: this.run, title: 'BOSS LOOT', min: 2 } });
    else if (elite) steps.push({ key: 'Reward', data: { run: this.run, title: 'ELITE STASH', min: 3 } });
    else if (Math.random() < 0.12) {
      const it = randomItem(this.run, 0, 2);
      if (it) steps.push({ key: 'Reward', data: { run: this.run, title: 'A CRITTER DROPPED SOMETHING', fixed: [it.id] } });
    }
    for (let i = 0; i < ups; i++) steps.push({ key: 'LevelUp', data: { run: this.run } });
    this.runSteps(steps);
  }

  // Launch overlay scenes one after another, then keep walking.
  runSteps(steps: { key: string; data: object }[]) {
    const next = steps.shift();
    if (!next) {
      this.continueRun();
      return;
    }
    this.scene.pause();
    this.scene.launch(next.key, { ...next.data, done: () => this.runSteps(steps) });
  }

  private async defeat() {
    this.clearCombatUi();
    this.run.hp = 0;
    sfx.die();
    this.coon.play('hurt', 99);
    this.tweens.add({ targets: this.coon, angle: -90, y: GROUND_Y - 2, duration: 500, ease: 'Bounce.out' });
    this.cameras.main.shake(300, 0.01);
    await wait(this, 1300);
    this.finish('death');
  }

  private autoPause() {
    if (this.scene.isActive()) this.pause();
  }

  private pause() {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause', { run: this.run });
    sfx.suspend();
  }

}
