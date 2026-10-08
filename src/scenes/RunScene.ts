import Phaser from 'phaser';
import { W, H, GROUND_Y } from '../config';
import { themes } from '../content/registry';
import type { StatusKey } from '../content/types';
import type { ThemeDef } from '../world/types';
import { Combat, Ev, Foe, Who, ELITE_INFO, TIERS } from '../game/combat';
import {
  RunState,
  newRun,
  danger,
  maxHp,
  gainXp,
  xpToLevel,
  randomItem,
  apPerTurn,
  nextTheme,
  rollBossAt,
  tickBlessings,
  capsForRun,
  BLESSING_INFO,
} from '../game/run';
import { RaccoonView } from '../game/views';
import { pickFoes, pickElite, eliteChance, fightRewards } from '../game/encounters';
import { text, panel, button, wait, Button, Floaters, BTN, LINE_H } from '../ui';
import { sfx } from '../audio';
import { store, save } from '../save';
import { COL } from '../gfx/palette';
import { ensureEnemy, enemyKey } from '../gfx/textures';
import { Parallax } from '../world/parallax';
import { addCaps } from '../meta/economy';

const PX_PER_M = 6;
const COON_X = 72;
const WALK_SPEED = 80;
const BAR_Y = GROUND_Y + 8; // top of the bottom control band

interface FoeView {
  uid: number;
  c: Phaser.GameObjects.Container;
  spr: Phaser.GameObjects.Sprite;
  glow?: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  bars: Phaser.GameObjects.Graphics;
  hpText: Phaser.GameObjects.BitmapText;
  blockText: Phaser.GameObjects.BitmapText;
  intent: Phaser.GameObjects.Container;
  status: Phaser.GameObjects.Container;
  tag: Phaser.GameObjects.BitmapText;
  hp: number;
  block: number;
  w: number;
  h: number;
  tint?: number;
}

interface SkillBtn {
  b: Button;
  i: number;
  cd: Phaser.GameObjects.BitmapText;
}

export class RunScene extends Phaser.Scene {
  run!: RunState;
  theme!: ThemeDef;
  private world!: Parallax;
  coon!: RaccoonView;
  private floats!: Floaters;
  private hud!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.BitmapText;
  private lvText!: Phaser.GameObjects.BitmapText;
  private distText!: Phaser.GameObjects.BitmapText;
  private stageText!: Phaser.GameObjects.BitmapText;
  private shinyText!: Phaser.GameObjects.BitmapText;
  private blessIcons!: Phaser.GameObjects.Container;
  private coonBars!: Phaser.GameObjects.Graphics;
  private coonBlock!: Phaser.GameObjects.BitmapText;
  private coonStatus!: Phaser.GameObjects.Container;
  private tipBox!: Phaser.GameObjects.Container;
  private tipG!: Phaser.GameObjects.Graphics;
  private tipText!: Phaser.GameObjects.BitmapText;
  private tipTimer?: Phaser.Time.TimerEvent;

  private combat: Combat | null = null;
  private views = new Map<number, FoeView>();
  private target: number | null = null;
  private arrow!: Phaser.GameObjects.Image;
  private ui: Phaser.GameObjects.GameObject[] = [];
  private skillBtns: SkillBtn[] = [];
  private endBtn: Button | null = null;
  private apG: Phaser.GameObjects.Graphics | null = null;
  private hazardText: Phaser.GameObjects.BitmapText | null = null;
  private busy = false;
  private walking = false;
  private walkLeft = 0;
  private pendingElite = false;
  private pendingBoss = false;
  private tiersSeen = new Set<number>();

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
    this.tiersSeen = new Set();

    this.theme = themes.get(this.run.theme) ?? [...themes.values()][0];
    this.world = new Parallax(this, this.theme);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.world.destroy());

    this.add.image(COON_X, GROUND_Y + 1, 'shadow').setScale(2, 1).setDepth(1);
    this.coon = new RaccoonView(this, COON_X, GROUND_Y + 1, this.run, store.skin).setDepth(10);
    this.coonBars = this.add.graphics().setDepth(11);
    this.coonBlock = text(this, 0, 0, '', { color: COL.white }).setDepth(12);
    this.coonStatus = this.add.container(COON_X - 18, GROUND_Y + 14).setDepth(11);
    this.arrow = this.add.image(0, 0, 'arrow').setDepth(30).setVisible(false);
    this.tweens.add({ targets: this.arrow, y: '+=2', yoyo: true, repeat: -1, duration: 300 });
    this.floats = new Floaters(this);

    this.buildHud();
    this.buildTip();
    this.applyLight();

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
    this.banner(this.theme.name, this.world.season ? this.world.season.banner : 'WHERE IT ALL STARTS', this.world.season ? COL.yellow : COL.white);
    this.markTheme();
    this.time.delayedCall(500, () => this.walk());
  }

  private markTheme() {
    if (!store.themesSeen.includes(this.theme.id)) {
      store.themesSeen.push(this.theme.id);
      save();
    }
  }

  private applyLight() {
    const l = this.theme.light ?? 0xffffff;
    if (l === 0xffffff) this.coon.base.clearTint();
    else this.coon.base.setTint(l);
  }

  // ---------------------------------------------------------------- HUD

  private buildHud() {
    this.hud = this.add.graphics().setDepth(60);
    this.hpText = text(this, 36, 8, '', { color: COL.white }).setDepth(61);
    this.lvText = text(this, 78, 8, '', { origin: 0, color: COL.yellow }).setDepth(61);
    this.distText = text(this, W / 2, 8, '', { color: COL.white }).setDepth(61);
    this.stageText = text(this, W / 2, 20, '', { color: COL.light }).setDepth(61);
    this.shinyText = text(this, W - 26, 8, '', { origin: 1, color: COL.yellow }).setDepth(61);
    this.add.image(W - 24, 8, 'coin').setDepth(61).setOrigin(0, 0.5);
    this.blessIcons = this.add.container(4, 22).setDepth(61);
    const pz = this.add.zone(W - 8, 8, 22, 22).setInteractive({ useHandCursor: true }).setDepth(70);
    pz.on('pointerup', () => this.pause());
    this.refreshHud();
  }

  refreshHud() {
    const r = this.run;
    const g = this.hud;
    const mhp = this.combat ? this.combat.maxHp : maxHp(r);
    const hp = this.combat ? this.combat.hp : r.hp;
    g.clear();
    g.fillStyle(0x1a1c2c, 0.7).fillRect(0, 0, W, 15);
    g.fillStyle(0x1a1c2c, 1).fillRect(2, 2, 68, 12);
    g.fillStyle(0x5d275d, 1).fillRect(3, 3, 66, 10);
    g.fillStyle(hp / mhp < 0.35 ? 0xef7d57 : 0xb13e53, 1).fillRect(3, 3, Math.round((66 * Math.max(0, hp)) / mhp), 10);
    g.fillStyle(0xffffff, 0.25).fillRect(3, 3, Math.round((66 * Math.max(0, hp)) / mhp), 2);
    this.hpText.setText(`${hp}/${mhp}`);
    this.lvText.setText(`LV${r.level}`);
    const lx = 78 + this.lvText.width + 2;
    g.fillStyle(0x1a1c2c, 1).fillRect(lx, 5, 34, 6);
    g.fillStyle(0x333c57, 1).fillRect(lx + 1, 6, 32, 4);
    g.fillStyle(0xffcd75, 1).fillRect(lx + 1, 6, Math.round((32 * r.xp) / xpToLevel(r.level)), 4);
    this.distText.setText(`${Math.floor(r.distance)}M`);
    this.stageText.setText(`STAGE ${r.stage + 1}  ${this.theme.name}`);
    this.shinyText.setText(`${r.shinies}`);
    g.fillStyle(0x94b0c2, 1).fillRect(W - 11, 3, 3, 9).fillRect(W - 6, 3, 3, 9);
    // blessings and curses
    this.blessIcons.removeAll(true);
    r.blessings.forEach((b, i) => {
      const info = BLESSING_INFO[b.id];
      const t = text(this, 0, i * LINE_H, `${info.name} ${b.fights}`, { origin: 0, color: info.color });
      this.blessIcons.add(t);
    });
    this.drawCoonBars();
  }

  private drawCoonBars() {
    const b = this.coonBars;
    b.clear();
    this.coonBlock.setVisible(false);
    if (!this.combat) return;
    const x = COON_X - 16;
    const y = GROUND_Y + 4;
    b.fillStyle(0x1a1c2c, 1).fillRect(x, y, 32, 5);
    b.fillStyle(0x5d275d, 1).fillRect(x + 1, y + 1, 30, 3);
    b.fillStyle(0xb13e53, 1).fillRect(x + 1, y + 1, Math.round((30 * Math.max(0, this.combat.hp)) / this.combat.maxHp), 3);
    if (this.combat.block > 0) {
      const bx = x - 14;
      b.fillStyle(0x1a1c2c, 1).fillRect(bx, y - 3, 13, 11);
      b.fillStyle(0x41a6f6, 1).fillRect(bx + 1, y - 2, 11, 9);
      this.coonBlock.setText(`${this.combat.block}`).setPosition(bx + 6.5, y + 2.5).setVisible(true);
    }
  }

  private banner(title: string, sub?: string, color = COL.white) {
    const y = 60;
    const g = this.add.graphics().setDepth(80);
    const h = sub ? 38 : 26;
    panel(g, -4, y - 14, W + 8, h, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    const t = text(this, W / 2, y - 3, title, { scale: 2, color, maxWidth: W - 16, maxLines: 1 }).setDepth(81);
    const s = sub ? text(this, W / 2, y + 13, sub, { color: COL.yellow, maxWidth: W - 16, maxLines: 1 }).setDepth(81) : null;
    const all = [g, t, ...(s ? [s] : [])];
    all.forEach((o) => (o.x -= W));
    this.tweens.add({ targets: all, x: `+=${W}`, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: all, x: `+=${W}`, alpha: 0, delay: 1500, duration: 260, ease: 'Cubic.in', onComplete: () => all.forEach((o) => o.destroy()) });
  }

  // One tooltip panel, reused for everything, so tips never stack on each other.
  private buildTip() {
    this.tipBox = this.add.container(W / 2, 40).setDepth(75).setVisible(false);
    this.tipG = this.add.graphics();
    this.tipText = text(this, 0, 0, '', { color: COL.white });
    this.tipBox.add([this.tipG, this.tipText]);
  }

  private tip(str: string, color = COL.white, ms = 2600) {
    if (!str) {
      this.tipBox.setVisible(false);
      return;
    }
    const maxW = Math.min(W - 24, 300);
    this.tipText.destroy();
    this.tipText = text(this, 0, 0, str, { color, maxWidth: maxW - 12, maxLines: 3 });
    this.tipBox.add(this.tipText);
    const w = Math.min(maxW, this.tipText.width + 14);
    const h = this.tipText.height + 8;
    this.tipG.clear();
    panel(this.tipG, -w / 2, -h / 2, w, h, 0x1a1c2c, 0x566c86);
    this.tipBox.setY(30 + h / 2).setVisible(true);
    this.tipTimer?.remove();
    this.tipTimer = this.time.delayedCall(ms, () => this.tipBox.setVisible(false));
  }

  // ---------------------------------------------------------------- walking

  update(_t: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    this.coon.update(dt);
    let dx = 0;
    if (this.walking) {
      dx = WALK_SPEED * dt;
      this.run.distance += dx / PX_PER_M;
      this.walkLeft -= dt;
      this.distText.setText(`${Math.floor(this.run.distance)}M`);
      if (this.walkLeft <= 0) {
        this.walking = false;
        this.coon.play('idle');
        this.arrive();
      }
    }
    this.world.update(dt, this.walking, dx);
    for (const v of this.views.values()) {
      v.shadow.setPosition(v.c.x, GROUND_Y + 1);
      if (v.glow) v.glow.setAlpha(0.5 + 0.4 * Math.sin(_t / 200));
    }
  }

  private walk(duration = 1.8) {
    this.clearCombatUi();
    this.walking = true;
    this.walkLeft = duration;
    this.coon.play('walk');
    this.tip('');
  }

  private arrive() {
    const r = this.run;
    if (r.areaStage + 1 >= r.bossAt) return this.approach('boss');
    // A road stop every two or three fights.
    if (r.sinceStop >= 3 || (r.sinceStop >= 2 && Math.random() < 0.55)) {
      r.sinceStop = 0;
      return this.runSteps([{ key: 'Fork', data: { run: this.run } }], () => this.walk(1.2));
    }
    const elite = r.eliteNext || Math.random() < eliteChance(r);
    this.approach(elite ? 'elite' : 'fight');
  }

  // Called by overlay scenes when they are done.
  continueRun() {
    this.refreshHud();
    this.coon.setGear(this.run);
    this.walk();
  }

  private changeArea() {
    const r = this.run;
    r.area++;
    r.areaStage = 0;
    r.bossAt = rollBossAt();
    r.theme = nextTheme(r);
    r.themesVisited.push(r.theme);
    this.theme = themes.get(r.theme) ?? this.theme;
    this.cameras.main.fadeOut(400, 26, 28, 44);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.world.setTheme(this.theme);
      this.applyLight();
      this.markTheme();
      this.refreshHud();
      this.cameras.main.fadeIn(400, 26, 28, 44);
      this.banner(this.theme.name, `AREA ${r.area + 1}  STAGE ${r.stage + 1}`);
      sfx.playMusic('run');
      this.time.delayedCall(700, () => this.walk());
    });
  }

  // ---------------------------------------------------------------- encounter

  private approach(kind: 'fight' | 'elite' | 'boss') {
    const boss = kind === 'boss';
    const elite = kind === 'elite';
    let foes: string[];
    let tiers: number[] = [];
    if (boss) foes = [this.theme.boss];
    else {
      const pick = elite ? pickElite(this.run, this.theme) : pickFoes(this.run, this.theme);
      foes = pick.ids;
      tiers = pick.tiers;
    }
    this.pendingElite = elite;
    this.pendingBoss = boss;
    foes.forEach((id, i) => ensureEnemy(this, id, tiers[i] ?? 0));

    this.combat = new Combat(this.run, foes, danger(this.run), {
      elite,
      boss,
      tiers,
      hazard: this.theme.hazard,
      hooks: { shinies: () => this.run.shinies, addShinies: (n) => (this.run.shinies = Math.max(0, this.run.shinies + n)) },
    });
    this.layoutFoes(true);
    for (const f of this.combat.foes) if (!store.foesSeen.includes(f.def.id)) store.foesSeen.push(f.def.id);
    const newTier = Math.max(0, ...this.combat.foes.map((f) => f.tier));
    if (boss) {
      sfx.warn();
      sfx.playMusic('boss');
      this.cameras.main.shake(400, 0.006);
      this.floats.add(COON_X, GROUND_Y - 40, '?!', COL.red, true);
    }
    this.time.delayedCall(boss ? 1000 : 700, () => {
      if (newTier > 0 && !this.tiersSeen.has(newTier)) {
        this.tiersSeen.add(newTier);
        sfx.warn();
        this.banner(`${TIERS[newTier].name} CRITTERS!`, 'TOUGHER, MEANER, NEW TRICKS', TIERS[newTier].color);
      } else if (boss) this.banner(this.combat!.foes[0].def.name, 'BOSS FIGHT', COL.red);
      this.showPrompt();
    });
  }

  private showPrompt() {
    const c = this.combat!;
    const boss = this.pendingBoss;
    const elite = this.pendingElite;
    const names = c.foes.map((f) => [f.tier ? TIERS[f.tier].name : '', f.elite ? ELITE_INFO[f.elite].name : '', f.def.name].filter(Boolean).join(' '));
    const title = boss ? 'BOSS FIGHT!' : elite ? 'ELITE FIGHT!' : 'CRITTERS AHEAD!';
    this.foeLabels(false); // the prompt panel covers the space under the foes
    const g = this.add.graphics().setDepth(50);
    const pw = Math.min(W - 16, 300);
    const px = W / 2 - pw / 2;
    const py = BAR_Y - 2;
    panel(g, px, py, pw, H - py - 3, 0x29366f, boss ? 0xb13e53 : 0x1a1c2c, 0x3b5dc9);
    const t1 = text(this, W / 2, py + 9, title, { color: boss ? COL.red : elite ? COL.orange : COL.yellow }).setDepth(51);
    const t2 = text(this, W / 2, py + 20, names.join(', '), { color: COL.light, maxWidth: pw - 12, maxLines: 1 }).setDepth(51);
    const fight = button(this, W / 2 - pw / 4, H - 13, pw / 2 - 10, 18, 'FIGHT', () => this.beginFight(), { ...BTN.red, depth: 52 });
    const retreat = button(this, W / 2 + pw / 4, H - 13, pw / 2 - 10, 18, 'RETREAT', () => this.confirmRetreat(), { depth: 52 });
    this.ui.push(g, t1, t2, fight.c, retreat.c);
  }

  private confirmRetreat() {
    this.clearCombatUi();
    const g = this.add.graphics().setDepth(50);
    const pw = Math.min(W - 16, 320);
    const px = W / 2 - pw / 2;
    const py = BAR_Y - 30;
    panel(g, px, py, pw, H - py - 3, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    const caps = capsForRun(this.run);
    const lines = [
      ['RETREAT AND END THIS RUN?', COL.yellow],
      [`KEEP: LV ${this.run.level} AND YOUR STATS. +${caps} CAPS`, COL.lime],
      ['LOSE: ITEMS, SKILLS AND SHINIES', COL.orange],
      ['NEXT RUN STARTS FROM THE STREET', COL.light],
    ] as const;
    const ts = lines.map(([s, c], i) => text(this, W / 2, py + 9 + i * LINE_H, s, { color: c, maxWidth: pw - 10, maxLines: 1 }).setDepth(51));
    const yes = button(this, W / 2 + pw / 4, H - 13, pw / 2 - 10, 18, 'RETREAT', () => this.retreat(), { depth: 52 });
    const no = button(
      this,
      W / 2 - pw / 4,
      H - 13,
      pw / 2 - 10,
      18,
      'BACK',
      () => {
        this.clearCombatUi();
        this.showPrompt();
      },
      { ...BTN.red, depth: 52 },
    );
    this.ui.push(g, ...ts, yes.c, no.c);
  }

  private retreat() {
    this.clearCombatUi();
    store.kept = { level: this.run.level, stats: { ...this.run.stats }, statPoints: this.run.statPoints };
    this.finish('retreat');
  }

  private finish(reason: 'death' | 'retreat') {
    const r = this.run;
    const d = Math.floor(r.distance);
    const newBest = d > store.bestDistance;
    if (newBest) store.bestDistance = d;
    store.bestStage = Math.max(store.bestStage, r.stage);
    store.bestLevel = Math.max(store.bestLevel, r.level);
    if (reason === 'death') store.kept = null;
    store.lastRunGear = Object.entries(r.gear)
      .filter(([, o]) => !!o)
      .map(([slot, o]) => ({ slot, id: o!.id, lvl: o!.lvl }));
    const caps = capsForRun(r);
    addCaps(caps);
    save();
    sfx.stopMusic();
    this.scene.pause();
    this.scene.launch('GameOver', { run: r, reason, newBest, caps });
  }

  // ---------------------------------------------------------------- foes on screen

  private layoutFoes(walkIn: boolean) {
    const c = this.combat!;
    const alive = c.foes.filter((f) => !f.dead);
    const n = alive.length;
    const left = Math.max(COON_X + 80, W * 0.42);
    const right = W - 22;
    alive.forEach((f, i) => {
      const x = Math.round(n === 1 ? (left + right) / 2 + 10 : left + ((right - left) * (i + 0.5)) / n);
      let v = this.views.get(f.uid);
      if (!v) {
        v = this.makeFoeView(f, walkIn ? W + 40 + i * 24 : x);
        this.views.set(f.uid, v);
      }
      this.tweens.add({ targets: v.c, x, duration: walkIn ? 750 : 300, ease: walkIn ? 'Quad.out' : 'Sine.inOut' });
    });
  }

  private makeFoeView(f: Foe, x: number): FoeView {
    const c = this.add.container(x, GROUND_Y + 1).setDepth(9);
    const key0 = enemyKey(f.def.id, 0, f.tier);
    const spr = this.add.sprite(0, 0, key0).setOrigin(0.5, 1);
    const frames = f.def.frames.map((_, i) => ({ key: enemyKey(f.def.id, i, f.tier) }));
    const animKey = `anim_${f.def.id}_${f.tier}`;
    if (!this.anims.exists(animKey)) this.anims.create({ key: animKey, frames, frameRate: f.def.fps ?? 3, repeat: -1 });
    spr.play({ key: animKey, startFrame: Math.floor(Math.random() * frames.length) });
    let glow: Phaser.GameObjects.Image | undefined;
    if (f.tier >= 3 && this.textures.exists(`${f.def.id}_glow`)) {
      glow = this.add.image(0, 1, `${f.def.id}_glow`).setOrigin(0.5, 1).setTint(TIERS[3].color);
    }
    const tint = f.elite ? ELITE_INFO[f.elite].color : undefined;
    if (tint) spr.setTint(tint);
    const light = this.theme.light;
    if (!tint && light && light !== 0xffffff) spr.setTint(light);
    if (f.def.flyer) spr.y = -16;
    const w = spr.width;
    const h = spr.height + (f.def.flyer ? 16 : 0);
    const shadow = this.add.image(x, GROUND_Y + 1, 'shadow').setScale(Math.max(1, w / 16), 1).setDepth(1);
    if (f.def.flyer) this.tweens.add({ targets: spr, y: -19, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.inOut' });
    const bars = this.add.graphics();
    const hpText = text(this, 0, 15, '', { color: COL.white });
    const blockText = text(this, 0, 7, '', { color: COL.white });
    const intent = this.add.container(0, -h - 10);
    const status = this.add.container(0, 24);
    const label = [f.tier ? TIERS[f.tier].name : '', f.elite ? ELITE_INFO[f.elite].name : ''].filter(Boolean).join(' ');
    const tag = text(this, 0, -h - 22, label, { color: f.elite ? ELITE_INFO[f.elite].color : TIERS[f.tier].color });
    c.add([...(glow ? [glow] : []), spr, bars, hpText, blockText, intent, status, tag]);
    const hitW = Math.max(28, w + 8);
    c.setSize(hitW, h + 30);
    c.setInteractive(new Phaser.Geom.Rectangle(-hitW / 2, -h - 16, hitW, h + 40), Phaser.Geom.Rectangle.Contains);
    c.on('pointerdown', () => this.setTarget(f.uid, true));
    const v: FoeView = { uid: f.uid, c, spr, glow, shadow, bars, hpText, blockText, intent, status, tag, hp: f.hp, block: f.block, w, h, tint };
    this.drawFoeBars(v, f);
    this.drawIntent(v, f);
    return v;
  }

  private drawFoeBars(v: FoeView, f: Foe) {
    const g = v.bars;
    g.clear();
    const bw = Math.max(26, Math.min(48, v.w));
    const x = -bw / 2;
    const y = 4;
    g.fillStyle(0x1a1c2c, 1).fillRect(x, y, bw, 5);
    g.fillStyle(0x5d275d, 1).fillRect(x + 1, y + 1, bw - 2, 3);
    g.fillStyle(f.def.boss ? 0xffa300 : 0xb13e53, 1).fillRect(x + 1, y + 1, Math.round(((bw - 2) * Math.max(0, v.hp)) / f.maxHp), 3);
    v.hpText.setText(`${Math.max(0, v.hp)}`);
    if (v.block > 0) {
      g.fillStyle(0x1a1c2c, 1).fillRect(x - 14, y - 3, 13, 11);
      g.fillStyle(0x41a6f6, 1).fillRect(x - 13, y - 2, 11, 9);
      v.blockText.setText(`${v.block}`).setPosition(x - 7.5, y + 2.5).setVisible(true);
    } else v.blockText.setVisible(false);
    if (f.armor > 0) {
      g.fillStyle(0x1a1c2c, 1).fillRect(x + bw + 1, y - 3, 11, 11);
      g.fillStyle(0x94b0c2, 1).fillRect(x + bw + 2, y - 2, 9, 9);
    }
    this.drawStatuses(v.status, f.status);
  }

  private drawStatuses(cont: Phaser.GameObjects.Container, st: Partial<Record<StatusKey, number>>) {
    cont.removeAll(true);
    const entries = Object.entries(st).filter(([, n]) => n && n > 0);
    let x = -((entries.length * 18) / 2);
    for (const [k, n] of entries) {
      cont.add(this.add.image(x, 0, 'st_' + k).setOrigin(0, 0.5));
      cont.add(text(this, x + 8, 0, `${n}`, { origin: 0, color: COL.white }));
      x += 18;
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
    const parts: Phaser.GameObjects.GameObject[] = [];
    const icon = this.add.image(0, 0, 'in_' + m.intent).setOrigin(0, 0.5);
    parts.push(icon);
    let label = '';
    if (m.dmg && this.combat) {
      const d = this.combat.intentDamage(f);
      label = m.hits && m.hits > 1 ? `${d}x${m.hits}` : `${d}`;
    }
    const t = label ? text(this, 9, 0, label, { origin: 0, color: m.intent === 'charge' ? COL.orange : COL.white }) : null;
    if (t) parts.push(t);
    const total = 8 + (t ? t.width + 1 : 0);
    parts.forEach((p) => ((p as Phaser.GameObjects.Image).x -= total / 2));
    v.intent.add(parts);
    if (m.intent === 'charge') this.tweens.add({ targets: icon, scale: 1.4, yoyo: true, repeat: 2, duration: 160 });
  }

  private setTarget(uid: number, fromTap = false) {
    const f = this.combat?.foe(uid);
    if (!f || f.dead) return;
    this.target = uid;
    const v = this.views.get(uid);
    if (v) this.arrow.setPosition(v.c.x, GROUND_Y + 1 - v.h - 34);
    this.arrow.setVisible(!!this.combat && !this.busy && this.skillBtns.length > 0 && this.combat.alive().length > 1);
    if (fromTap) {
      const m = f.intent;
      const d = this.combat!.intentDamage(f);
      const what: Record<string, string> = {
        attack: `WILL HIT YOU FOR ${d}`,
        multi: `WILL HIT YOU ${m.hits} TIMES FOR ${d}`,
        block: 'WILL BLOCK',
        buff: 'WILL POWER UP',
        debuff: 'WILL CURSE YOU',
        heal: 'WILL HEAL',
        summon: 'WILL CALL FOR HELP',
        charge: 'IS WINDING UP A HUGE HIT!',
        steal: 'WILL STEAL SHINIES',
        flee: 'WILL RUN',
      };
      const extra = [f.armor ? `ARMOR ${f.armor}: CRITS IGNORE IT` : '', f.def.dodge ? `DODGES ${Math.round(f.def.dodge * 100)}%` : '', f.regen ? `REGEN ${f.regen}` : ''].filter(Boolean).join('. ');
      this.tip(`${f.def.name} ${f.hp}/${f.maxHp}: ${m.name}, ${f.status.stun ? 'STUNNED' : what[m.intent]}${extra ? '. ' + extra : ''}`);
    }
  }

  // ---------------------------------------------------------------- combat

  // HP numbers and statuses under the foes share the bottom band with the prompt panel.
  private foeLabels(on: boolean) {
    this.views.forEach((v) => (v.hpText.setVisible(on), v.status.setVisible(on)));
  }

  private beginFight() {
    this.clearCombatUi();
    this.foeLabels(true);
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
    const g = this.add.graphics().setDepth(48);
    g.fillStyle(0x1a1c2c, 0.75).fillRect(0, BAR_Y + 10, W, H - BAR_Y - 10);
    this.ui.push(g);
    this.apG = this.add.graphics().setDepth(50);
    this.ui.push(this.apG, text(this, 12, BAR_Y + 18, 'AP', { color: COL.ice }).setDepth(50));
    const n = this.run.skills.length;
    const endW = 60;
    const left = 26;
    const avail = W - left - endW - 10;
    const bw = Math.min(76, Math.floor((avail - 3 * 3) / 4));
    const bh = 34;
    const y = H - bh / 2 - 3;
    this.skillBtns = [];
    for (let i = 0; i < n; i++) {
      const s = c.skillAt(i)!;
      const x = left + bw / 2 + i * (bw + 3);
      const b = button(this, x, y, bw, bh, '', () => this.useSkill(i), { depth: 50 });
      b.label.destroy();
      const icon = this.add.image(-bw / 2 + 10, -6, `skill_${s.def.id}`);
      const nm = text(this, 0, 9, s.def.name, { color: COL.white, maxWidth: bw - 4, maxLines: 1 });
      const lv = s.lvl > 1 ? text(this, bw / 2 - 6, -11, `${s.lvl}`, { color: COL.yellow }) : null;
      const cost = this.add.graphics();
      for (let k = 0; k < s.def.cost; k++) {
        cost.fillStyle(0x1a1c2c, 1).fillRect(-bw / 2 + 20 + k * 6, -10, 5, 5);
        cost.fillStyle(0x73eff7, 1).fillRect(-bw / 2 + 21 + k * 6, -9, 3, 3);
      }
      const dmg = c.previewDamage(i);
      const dmgT = dmg ? text(this, bw / 2 - 4, -3, `${dmg}`, { origin: 1, color: COL.orange }) : null;
      const cd = text(this, 0, -2, '', { scale: 2, color: COL.white });
      b.c.add([icon, nm, cost, ...(dmgT ? [dmgT] : []), cd, ...(lv ? [lv] : [])]);
      // Pressing a skill shows what it does; releasing uses it.
      const info = () => this.tip(`${s.def.name}: ${s.def.desc(s.lvl)}${s.def.cooldown ? `. COOLDOWN ${s.def.cooldown}` : ''}`, COL.ice);
      b.c.on('pointerdown', info);
      b.c.on('pointerover', info);
      this.skillBtns.push({ b, i, cd });
      this.ui.push(b.c);
    }
    this.endBtn = button(this, W - endW / 2 - 4, y, endW, bh, 'END TURN', () => this.endTurn(), { ...BTN.green, depth: 50 });
    this.ui.push(this.endBtn.c);
    if (this.theme.hazard) {
      this.hazardText = text(this, W - 4, 32, '', { origin: 1, color: COL.orange }).setDepth(50);
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
    }
    this.endBtn?.setEnabled(!this.busy);
    const stuck = !this.busy && !this.skillBtns.some((s) => c.canUse(s.i));
    if (stuck) this.endBtn?.setColors(BTN.red.fill, 0x1a1c2c, BTN.red.light);
    else this.endBtn?.setColors(BTN.green.fill, 0x1a1c2c, BTN.green.light);
    if (this.apG) {
      const g = this.apG;
      g.clear();
      const max = Math.max(c.ap, apPerTurn(this.run));
      for (let k = 0; k < max; k++) {
        const x = 6 + (k % 2) * 8;
        const y = BAR_Y + 26 + Math.floor(k / 2) * 8;
        g.fillStyle(0x1a1c2c, 1).fillRect(x, y, 7, 7);
        g.fillStyle(k < c.ap ? 0x73eff7 : 0x333c57, 1).fillRect(x + 1, y + 1, 5, 5);
      }
    }
    if (this.hazardText && this.theme.hazard) this.hazardText.setText(`${this.theme.hazard.name} IN ${c.hazardIn}`);
    if (this.target === null || c.foe(this.target)?.dead || !c.foe(this.target)) {
      const first = c.alive()[0];
      if (first) this.setTarget(first.uid);
    } else this.setTarget(this.target);
    this.drawStatuses(this.coonStatus, c.status);
    this.drawCoonBars();
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
    this.tip('');
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

  private foeX(uid: Who) {
    return uid === 'p' ? COON_X : this.views.get(uid as number)?.c.x ?? W / 2;
  }

  private async playEvents(evs: Ev[]) {
    const c = this.combat!;
    for (const e of evs) {
      switch (e.t) {
        case 'turn':
          if (e.side === 'foes') await wait(this, 160);
          break;
        case 'act': {
          if (e.who === 'p') {
            if (e.kind === 'attack') {
              this.coon.play('attack', 0.3);
              this.tweens.add({ targets: this.coon, x: COON_X + 12, yoyo: true, duration: 90 });
            }
            this.floats.add(COON_X, GROUND_Y - 44, e.name, COL.ice);
            await wait(this, 170);
          } else {
            const v = this.views.get(e.who);
            if (!v) break;
            this.floats.add(v.c.x, GROUND_Y - v.h - 30, e.name, e.kind === 'charge' ? COL.orange : COL.white);
            if (e.kind === 'attack' || e.kind === 'multi' || e.kind === 'steal' || e.kind === 'debuff') {
              this.tweens.add({ targets: v.c, x: v.c.x - 16, yoyo: true, duration: 110 });
            } else this.tweens.add({ targets: v.spr, scaleY: 1.15, yoyo: true, duration: 100 });
            await wait(this, 280);
          }
          break;
        }
        case 'hit': {
          if (e.who === 'p') {
            if (e.dmg > 0) {
              this.coon.play('hurt', 0.3);
              sfx.hurt();
              this.cameras.main.shake(140, e.dmg >= c.maxHp * 0.2 ? 0.016 : 0.008);
              this.flashCoon();
            } else sfx.thud();
            this.floats.add(COON_X, GROUND_Y - 30, e.dmg > 0 ? `-${e.dmg}` : 'BLOCKED', e.dmg > 0 ? COL.red : COL.sky, e.dmg >= c.maxHp * 0.2);
            this.refreshHud();
          } else {
            const v = this.views.get(e.who);
            if (!v) break;
            v.hp = e.hp;
            v.block = e.block;
            const f = c.foe(e.who)!;
            this.drawFoeBars(v, f);
            v.spr.setTintFill(0xffffff);
            this.time.delayedCall(70, () => (v.tint ? v.spr.setTint(v.tint) : this.theme.light && this.theme.light !== 0xffffff ? v.spr.setTint(this.theme.light) : v.spr.clearTint()));
            this.tweens.add({ targets: v.spr, x: 3, yoyo: true, duration: 50 });
            if (e.crit) {
              sfx.crit();
              this.cameras.main.shake(120, 0.008);
              this.hitStop(70);
              const sl = this.add.image(v.c.x, GROUND_Y - v.h / 2, 'slash').setDepth(20).setScale(2);
              this.tweens.add({ targets: sl, alpha: 0, scale: 3, duration: 220, onComplete: () => sl.destroy() });
            } else sfx.hit();
            this.burst(v.c.x, GROUND_Y - v.h / 2, e.crit ? 12 : 5, e.crit ? [0xffcd75, 0xf4f4f4] : [0xf4f4f4]);
            const label = e.dmg > 0 ? `${e.dmg}${e.crit ? '!' : ''}` : e.armor ? 'ARMOR' : 'BLOCKED';
            this.floats.add(v.c.x, GROUND_Y - v.h - 8, label, e.crit ? COL.yellow : e.dmg > 0 ? COL.white : COL.sky, !!e.crit);
          }
          await wait(this, e.src === 'p' ? 120 : 210);
          break;
        }
        case 'dodge':
          if (e.who === 'p') {
            this.tweens.add({ targets: this.coon, x: COON_X - 14, yoyo: true, duration: 120 });
            this.floats.add(COON_X, GROUND_Y - 34, 'DODGE!', COL.ice);
          } else {
            const v = this.views.get(e.who);
            if (v) {
              this.tweens.add({ targets: v.c, x: v.c.x + 12, yoyo: true, duration: 120 });
              this.floats.add(v.c.x, GROUND_Y - v.h - 8, 'MISS', COL.light);
            }
          }
          sfx.select();
          await wait(this, 190);
          break;
        case 'block':
          if (e.who === 'p') {
            this.drawCoonBars();
            if (e.amount > 0) this.floats.add(COON_X, GROUND_Y - 38, `+${e.amount} BLOCK`, COL.sky);
          } else {
            const v = this.views.get(e.who);
            if (v) {
              v.block = e.block;
              this.drawFoeBars(v, c.foe(e.who)!);
              if (e.amount > 0) this.floats.add(v.c.x, GROUND_Y - v.h - 8, `+${e.amount} BLOCK`, COL.sky);
            }
          }
          sfx.thud();
          await wait(this, 150);
          break;
        case 'heal':
          if (e.who === 'p') {
            this.floats.add(COON_X, GROUND_Y - 38, `+${e.amount}`, COL.lime);
            this.refreshHud();
          } else {
            const v = this.views.get(e.who);
            if (v) {
              v.hp = e.hp;
              this.drawFoeBars(v, c.foe(e.who)!);
              this.floats.add(v.c.x, GROUND_Y - v.h - 8, `+${e.amount}`, COL.lime);
            }
          }
          sfx.heal();
          await wait(this, 160);
          break;
        case 'status':
          if (e.who === 'p') this.drawStatuses(this.coonStatus, c.status);
          else {
            const v = this.views.get(e.who);
            const f = c.foe(e.who);
            if (v && f) {
              this.drawStatuses(v.status, f.status);
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
              this.burst(v.c.x, GROUND_Y - v.h / 2, f.def.boss ? 48 : 16, f.def.colors);
              if (f.def.boss) {
                sfx.bossDie();
                this.cameras.main.shake(500, 0.015);
                this.cameras.main.flash(200, 255, 255, 255);
                this.hitStop(200);
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
        case 'phase': {
          const v = e.who === 'p' ? undefined : this.views.get(e.who);
          const f = e.who === 'p' ? undefined : c.foe(e.who);
          sfx.warn();
          this.cameras.main.shake(400, 0.012);
          this.cameras.main.flash(150, 177, 62, 83);
          if (v && f && f.def.phase2?.frames?.length) {
            const key = `anim_${f.def.id}_p2`;
            if (!this.anims.exists(key)) this.anims.create({ key, frames: f.def.phase2.frames.map((_, i) => ({ key: enemyKey(f.def.id, i, 0, 2) })), frameRate: f.def.fps ?? 3, repeat: -1 });
            v.spr.play(key);
          }
          this.banner(e.name, 'PHASE 2', COL.red);
          await wait(this, 900);
          break;
        }
        case 'summon': {
          const v0 = e.who === 'p' ? undefined : c.foe(e.who);
          if (v0) ensureEnemy(this, v0.def.id, v0.tier);
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
          this.floats.add(COON_X, GROUND_Y - 44, `-${e.n} SHINIES`, COL.yellow);
          this.refreshHud();
          await wait(this, 200);
          break;
        case 'ap':
          this.refreshCombatUi();
          break;
        case 'hazard':
          this.banner(e.name + '!', e.desc, COL.orange);
          await wait(this, 600);
          break;
        case 'combo':
          this.floats.add(W / 2, 90, `COMBO x${e.n}!`, COL.yellow, true);
          this.run.shinies += e.n * 2;
          this.run.shiniesEarned += e.n * 2;
          sfx.upgrade();
          await wait(this, 200);
          break;
        case 'msg': {
          this.floats.add(this.foeX(e.who), GROUND_Y - 50, e.text, e.color ?? COL.white);
          await wait(this, 180);
          break;
        }
      }
    }
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

  // A tiny freeze on big hits so they land with weight.
  private hitStop(ms: number) {
    this.tweens.timeScale = 0.1;
    this.time.delayedCall(ms * 0.1, () => (this.tweens.timeScale = 1));
  }

  private flashCoon() {
    this.coon.base.setTintFill(0xffffff);
    this.time.delayedCall(80, () => this.applyLight());
  }

  private burst(x: number, y: number, n: number, colors: number[]) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, 'px').setDepth(20).setTint(colors[i % colors.length]);
      if (Math.random() < 0.5) p.setScale(0.5);
      const a = Math.random() * Math.PI * 2;
      const v = 20 + Math.random() * 44;
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
    const r = this.run;
    this.clearCombatUi();
    r.hp = c.hp;
    const boss = this.pendingBoss;
    const elite = this.pendingElite;
    const { xp, shinies: sh } = fightRewards(r, c.killed);
    r.shinies += sh;
    r.shiniesEarned += sh;
    r.bestCombo = Math.max(r.bestCombo, c.bestCombo);
    r.stage++;
    r.areaStage++;
    r.sinceStop++;
    tickBlessings(r);
    if (boss) {
      r.bosses++;
      store.bossKills++;
      save();
    }
    if (elite) {
      r.elites++;
      r.eliteNext = false;
    }
    const ups = gainXp(r, xp);
    if (ups > 0) r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.1 * ups));
    this.combat = null;
    sfx.clear();
    this.coon.play('idle');
    this.floats.add(COON_X, GROUND_Y - 40, `+${xp} XP`, COL.yellow);
    this.floats.add(COON_X + 30, GROUND_Y - 40, `+${sh}`, COL.yellow);
    this.refreshHud();
    this.views.forEach((v) => (v.c.destroy(), v.shadow.destroy()));
    this.views.clear();
    if (boss) sfx.playMusic('run');
    await wait(this, 900);

    const steps: { key: string; data: object }[] = [];
    if (boss) steps.push({ key: 'Reward', data: { run: r, title: 'BOSS LOOT', min: 2 } });
    else if (elite) steps.push({ key: 'Reward', data: { run: r, title: 'ELITE STASH', min: 2 } });
    else if (Math.random() < 0.15) {
      const it = randomItem(r, 0, 2);
      if (it) steps.push({ key: 'Reward', data: { run: r, title: 'A CRITTER DROPPED THIS', fixed: [it.id] } });
    }
    for (let i = 0; i < ups; i++) steps.push({ key: 'LevelUp', data: { run: r } });
    this.runSteps(steps, () => {
      this.coon.setGear(r);
      this.refreshHud();
      if (boss) this.changeArea();
      else this.walk();
    });
  }

  // Launch overlay scenes one after another, then carry on.
  runSteps(steps: { key: string; data: object }[], then?: () => void) {
    const next = steps.shift();
    if (!next) {
      if (then) then();
      else this.continueRun();
      return;
    }
    this.scene.pause();
    this.scene.launch(next.key, { ...next.data, run: this.run, done: () => this.runSteps(steps, then) });
  }

  private async defeat() {
    this.clearCombatUi();
    this.run.hp = 0;
    sfx.die();
    this.coon.play('hurt', 99);
    this.tweens.add({ targets: this.coon, angle: -90, y: GROUND_Y - 4, duration: 500, ease: 'Bounce.out' });
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

