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
  roll,
  afterFight,
  bossFoes,
} from '../game/run';
import { MUTATORS, rules } from '../game/mutators';
import { rand } from '../game/rng';
import { RaccoonView } from '../game/views';
import { pickFoes, pickElite, eliteChance, fightRewards } from '../game/encounters';
import { text, panel, button, wait, Button, Floaters, BTN, LINE_H, shake } from '../ui';
import { onAction } from '../input';
import { sfx, areaTrack, bossTrack } from '../audio';
import { buzz } from '../haptics';
import { store, save } from '../save';
import { COL, hex } from '../gfx/palette';
import { ensureEnemy, enemyKey } from '../gfx/textures';
import { Parallax } from '../world/parallax';
import { addCaps } from '../meta/economy';
import { submitRun } from '../platform/online';
import { killerOf, type Killer } from '../game/share';
import { track, VERSION } from '../platform/track';
import { openLedger, fightStarts, fightEnds, closeLedger } from '../game/ledger';
import { skills } from '../content/registry';
import { FxDirector } from '../fx/Fx';
import { Element, LOOKS, skillElement, skillTier } from '../fx/elements';

const PX_PER_M = 6;
const COON_X = 72;
const WALK_SPEED = 80;
const BAR_Y = GROUND_Y + 8; // top of the bottom control band
const FLAG_AHEAD = 46; // the best-stage flag stands this far past where the raccoon stops

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

interface BestFlag {
  c: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.BitmapText;
  flutter: Phaser.Time.TimerEvent;
  at: number; // distance (m) where it stands
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
  private apG: Phaser.GameObjects.Graphics | null = null;
  private hazardText: Phaser.GameObjects.BitmapText | null = null;
  private busy = false;
  private walking = false;
  private walkLeft = 0;
  private pendingElite = false;
  private pendingBoss = false;
  // For the game-over recap: who landed the last blow, and the best stage before this run.
  private killer = '';
  private hazard = '';
  private bestBefore = 0;
  private tiersSeen = new Set<number>();
  private flag: BestFlag | null = null;
  private flagPassed = false;
  // PROTOTYPE combat VFX
  fx!: FxDirector;
  private fxEl: Element = 'steel';
  private fxTier = 1;
  private fxSt = new Map<Who, Partial<Record<StatusKey, number>>>();

  constructor() {
    super('Run');
  }

  create(data: { run?: RunState }) {
    // A normal run that never reached its end (the app was closed mid-run) counts as a
    // death, so closing the app in a losing fight can't keep the banked raccoon.
    if (!data.run && store.runOpen) store.kept = null;
    this.run = data.run ?? newRun();
    if (this.run.mode !== 'daily') store.runOpen = true;
    openLedger(this.run, VERSION);
    store.runs++;
    if (this.run.mode === 'daily') {
      if (store.dailyDay !== this.run.day) {
        store.dailyDay = this.run.day!;
        store.dailyBest = null;
        store.dailyRuns = 0;
      }
      store.dailyRuns++;
    }
    this.killer = '';
    this.hazard = '';
    this.bestBefore = this.run.mode === 'daily' ? (store.dailyBest?.stage ?? 0) : store.bestStage;
    save();
    track('run_start', { mode: this.run.mode, level: this.run.level });
    this.views.clear();
    this.ui = [];
    this.skillBtns = [];
    this.combat = null;
    this.busy = false;
    this.walking = false;
    this.tiersSeen = new Set();
    this.flag = null;
    this.flagPassed = false;

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
    this.fx = new FxDirector(this);
    this.fxSt.clear();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.fx.destroy());

    this.buildHud();
    this.buildTip();
    this.applyLight();

    sfx.playMusic(areaTrack(this.theme.id));
    onAction(this, ['pause', 'back'], () => this.pause());
    onAction(this, 'bag', () => this.inspect());
    onAction(this, ['slot1', 'slot2', 'slot3', 'slot4'], (a) => this.useSkill(Number(a.slice(4)) - 1));
    onAction(this, ['targetPrev', 'targetNext'], (a) => this.cycleTarget(a === 'targetPrev' ? -1 : 1));
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.autoPause, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.HIDDEN, this.autoPause, this));
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      sfx.resume();
      this.refreshHud();
      this.coon.setGear(this.run);
    });

    this.cameras.main.fadeIn(250, 26, 28, 44);
    // A daily run opens on the week's rule; the area name is on the HUD.
    const m = this.run.mutator;
    if (m) this.banner(`THIS WEEK: ${MUTATORS[m].name}`, MUTATORS[m].desc, COL.lime);
    else this.banner(this.theme.name, this.world.season ? this.world.season.banner : 'WHERE IT ALL STARTS', this.world.season ? COL.yellow : COL.white);
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
    // Bag: inspect gear, skills and passives without leaving the run.
    const bag = button(this, W - 70, 8, 26, 13, 'BAG', () => this.inspect(), { depth: 70 });
    bag.label.setTint(COL.yellow);
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
    this.stageText.setText(`${r.mode === 'daily' ? 'DAILY  ' : ''}STAGE ${r.stage + 1}  ${this.theme.name}`);
    this.stageText.setTint(r.mode === 'daily' ? COL.lime : COL.light);
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
    this.moveFlag();
    for (const v of this.views.values()) {
      v.shadow.setPosition(v.c.x, GROUND_Y + 1);
      if (v.glow) v.glow.setAlpha(0.5 + 0.4 * Math.sin(_t / 200));
    }
    if (this.combat) {
      const c = this.combat;
      this.fx.ambient('p', COON_X, GROUND_Y - 30, 30, c.status, dt);
      for (const v of this.views.values()) {
        const f = c.foe(v.uid);
        if (f && !f.dead) this.fx.ambient(String(v.uid), v.c.x, GROUND_Y - v.h, v.h, f.status, dt);
      }
    }
  }

  private walk(duration = 1.8) {
    this.clearCombatUi();
    this.walking = true;
    this.walkLeft = duration;
    this.coon.play('walk');
    this.plantFlag(duration);
    this.tip('');
  }

  // ---------------------------------------------------------------- best-stage flag

  // Once you have matched your best, a flag drops onto the road just past the next stop:
  // win there and you walk past it into a new record. A road stop instead of a fight
  // moves it on to the next one.
  private plantFlag(walk: number) {
    if (this.flagPassed || this.bestBefore <= 0 || this.run.stage !== this.bestBefore) return;
    const at = this.run.distance + (walk * WALK_SPEED + FLAG_AHEAD) / PX_PER_M;
    if (!this.flag) {
      const img = this.add.image(0, 0, 'bestflag0').setOrigin(2 / 13, 1);
      const label = text(this, 6, -29, `BEST ${this.bestBefore}`, { color: COL.yellow });
      const c = this.add.container(0, 0, [img, label]).setDepth(3);
      const flutter = this.time.addEvent({ delay: 260, loop: true, callback: () => img.setTexture(img.texture.key === 'bestflag0' ? 'bestflag1' : 'bestflag0') });
      this.flag = { c, img, label, flutter, at };
    }
    const f = this.flag;
    f.at = at;
    this.moveFlag();
    this.tweens.killTweensOf(f.c);
    f.c.y = GROUND_Y + 1 - 48;
    this.tweens.add({ targets: f.c, y: GROUND_Y + 1, duration: 420, ease: 'Bounce.out' });
  }

  // The flag is pinned to the road, so it scrolls with the ground.
  private moveFlag() {
    const f = this.flag;
    if (!f) return;
    f.c.x = Math.round(COON_X + (f.at - this.run.distance) * PX_PER_M);
    if (!this.flagPassed && f.c.x <= COON_X && this.run.stage > this.bestBefore) this.passFlag();
    if (f.c.x < -40) {
      f.flutter.remove();
      f.c.destroy();
      this.flag = null;
    }
  }

  private passFlag() {
    const f = this.flag!;
    this.flagPassed = true;
    // The one celebration for a new best: fanfare, buzz and a gold flash.
    sfx.record();
    buzz('record');
    this.cameras.main.flash(220, 255, 205, 117);
    // The label rises clear of the raccoon's head as it walks past.
    f.label.setText('NEW BEST!').setTint(COL.lime);
    this.tweens.add({ targets: f.label, y: -48, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: f.img, y: -5, yoyo: true, duration: 140, ease: 'Quad.out' });
    const x = f.c.x + 6;
    const y = GROUND_Y - 16;
    this.fx.emit(x, y, 14, 'pt_star', [hex('Y'), hex('y'), hex('O')], 'fall', { spread: 10 });
    this.fx.emit(x, y, 10, 'px1', [hex('w'), hex('L'), hex('G')], 'burst', { spread: 6 });
  }

  private arrive() {
    const r = this.run;
    roll(r, 'arrive');
    if (r.areaStage + 1 >= r.bossAt) return this.approach('boss');
    // A road stop every two or three fights.
    if (r.sinceStop >= 3 || (r.sinceStop >= 2 && rand() < 0.55)) {
      r.sinceStop = 0;
      return this.runSteps([{ key: 'Fork', data: { run: this.run } }], () => this.walk(1.2));
    }
    const elite = r.eliteNext || rand() < eliteChance(r);
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
    roll(r, 'area');
    r.bossAt = rollBossAt(r.area, rules(r).bossRush);
    r.theme = nextTheme(r);
    r.themesVisited.push(r.theme);
    this.theme = themes.get(r.theme) ?? this.theme;
    track('area_reached', { area: r.area + 1, theme: r.theme, stage: r.stage, mode: r.mode });
    this.cameras.main.fadeOut(400, 26, 28, 44);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.world.setTheme(this.theme);
      this.applyLight();
      this.markTheme();
      this.refreshHud();
      this.cameras.main.fadeIn(400, 26, 28, 44);
      this.banner(this.theme.name, `AREA ${r.area + 1}  STAGE ${r.stage + 1}`);
      sfx.playMusic(areaTrack(this.theme.id));
      this.time.delayedCall(700, () => this.walk());
    });
  }

  // ---------------------------------------------------------------- encounter

  private approach(kind: 'fight' | 'elite' | 'boss') {
    const boss = kind === 'boss';
    const elite = kind === 'elite';
    let foes: string[];
    let tiers: number[] = [];
    if (boss) foes = bossFoes(this.run, this.theme.boss);
    else {
      const pick = elite ? pickElite(this.run, this.theme) : pickFoes(this.run, this.theme);
      foes = pick.ids;
      tiers = pick.tiers;
    }
    this.pendingElite = elite;
    this.pendingBoss = boss;
    foes.forEach((id, i) => ensureEnemy(this, id, tiers[i] ?? 0));

    roll(this.run, 'combat');
    this.combat = new Combat(this.run, foes, danger(this.run), {
      elite,
      boss,
      tiers,
      hazard: this.theme.hazard,
      hooks: { shinies: () => this.run.shinies, addShinies: (n) => (this.run.shinies = Math.max(0, this.run.shinies + n)) },
    });
    fightStarts(this.run);
    this.layoutFoes(true);
    for (const f of this.combat.foes) if (!store.foesSeen.includes(f.def.id)) store.foesSeen.push(f.def.id);
    const newTier = Math.max(0, ...this.combat.foes.map((f) => f.tier));
    if (boss) {
      sfx.warn();
      sfx.playMusic(bossTrack(this.theme.id));
      shake(this, 400, 0.006);
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
    this.hint('retreat', 'RETREAT ENDS THE RUN BUT YOUR RACCOON KEEPS ITS LEVEL AND STATS.');
  }

  // One-time hints for new players.
  private hint(id: string, str: string) {
    if (store.tipsSeen.includes(id)) return;
    store.tipsSeen.push(id);
    save();
    this.tip(str, COL.yellow, 5000);
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
      ...(this.run.mode === 'daily'
        ? [
            ['END YOUR DAILY RUN HERE?', COL.yellow],
            [`STAGE ${this.run.stage} GOES ON TODAY'S BOARD`, COL.lime],
            [`+${caps} CAPS`, COL.lime],
            ['YOUR NORMAL RACCOON IS NOT AFFECTED', COL.light],
          ]
        : [
            ['RETREAT AND END THIS RUN?', COL.yellow],
            [`KEEP: LV ${this.run.level} AND YOUR STATS. +${caps} CAPS`, COL.lime],
            ['LOSE: ITEMS, SKILLS AND SHINIES', COL.orange],
            ['NEXT RUN STARTS FROM THE STREET', COL.light],
          ]),
    ] as [string, number][];
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
    // A daily run is its own fresh raccoon: it never banks or wipes the normal one.
    if (this.run.mode !== 'daily') store.kept = { level: this.run.level, stats: { ...this.run.stats }, statPoints: this.run.statPoints };
    this.finish('retreat');
  }

  private finish(reason: 'death' | 'retreat', killer: Killer | null = null) {
    const r = this.run;
    const d = Math.floor(r.distance);
    const daily = r.mode === 'daily';
    const timeMs = Date.now() - r.startedAt;
    let newBest = false;
    if (daily) {
      // Further, or as far and faster, beats this device's best daily run today.
      const b = store.dailyBest;
      newBest = !b || r.stage > b.stage || (r.stage === b.stage && timeMs < b.timeMs);
      if (newBest) store.dailyBest = { stage: r.stage, timeMs };
    } else {
      newBest = d > store.bestDistance;
      if (newBest) store.bestDistance = d;
      store.bestStage = Math.max(store.bestStage, r.stage);
      store.bestLevel = Math.max(store.bestLevel, r.level);
      if (reason === 'death') store.kept = null;
      store.runOpen = false;
    }
    store.lastRunGear = Object.entries(r.gear)
      .filter(([, o]) => !!o)
      .map(([slot, o]) => ({ slot, id: o!.id, lvl: o!.lvl }));
    const caps = capsForRun(r);
    addCaps(caps);
    save();
    track('run_end', { mode: r.mode, reason, stage: r.stage, area: r.area + 1, level: r.level, bosses: r.bosses, theme: r.theme, time_s: Math.round(timeMs / 1000) });
    const sent = submitRun({ mode: r.mode, day: r.day, stage: r.stage, level: r.level, distance: d, timeMs, skin: store.skin, log: closeLedger(r) });
    sfx.stopMusic();
    this.scene.pause();
    this.scene.launch('GameOver', { run: r, reason, newBest, caps, sent, killer: this.killer, bestBefore: this.bestBefore, blame: killer });
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
    this.hint('combat', 'SPEND ALL YOUR AP ON SKILLS. THE ICON OVER A FOE SHOWS ITS NEXT MOVE.');
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
    const left = 26;
    const avail = W - left - 6;
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
      const info = () => this.tip(`${s.def.name}: ${s.def.desc(s.lvl, c.ctx)}${s.def.cooldown ? `. COOLDOWN ${s.def.cooldown}` : ''}`, COL.ice);
      b.c.on('pointerdown', info);
      b.c.on('pointerover', info);
      this.skillBtns.push({ b, i, cd });
      this.ui.push(b.c);
    }
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
    // Out of AP (or nothing left it can buy): the turn ends by itself, after a beat.
    if (!c.canSpend()) {
      this.busy = true;
      this.refreshCombatUi();
      this.time.delayedCall(320, () => {
        this.busy = false;
        this.endTurn();
      });
    }
  }

  private cycleTarget(d: 1 | -1) {
    if (!this.combat || this.busy) return;
    const alive = this.combat.alive();
    const idx = alive.findIndex((f) => f.uid === this.target);
    const next = alive[(idx + (d < 0 ? alive.length - 1 : 1)) % alive.length];
    if (next) this.setTarget(next.uid, true);
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
          this.hazard = '';
          if (e.side === 'foes') await wait(this, 160);
          break;
        case 'act': {
          if (e.who === 'p') {
            if (e.kind === 'attack') {
              this.coon.play('attack', 0.3);
              this.tweens.add({ targets: this.coon, x: COON_X + 12, yoyo: true, duration: 90 });
            }
            this.floats.add(COON_X, GROUND_Y - 44, e.name, COL.ice);
            await this.fxCast(e.skill, e.target);
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
              buzz(e.dmg >= c.maxHp * 0.2 ? 'bigHurt' : 'hurt');
              this.killer = this.blameFor(e.src);
              shake(this, 140, e.dmg >= c.maxHp * 0.2 ? 0.016 : 0.008);
              this.flashCoon();
              if (e.src === 'env') this.fxTick('p', COON_X, GROUND_Y - 16);
              else this.fx.impact(COON_X + 4, GROUND_Y - 16, 'steel', e.dmg >= c.maxHp * 0.2 ? 3 : e.dmg >= c.maxHp * 0.08 ? 2 : 1, false);
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
              buzz('crit');
              shake(this, 120, 0.008);
              this.hitStop(70);
              const sl = this.add.image(v.c.x, GROUND_Y - v.h / 2, 'slash').setDepth(20).setScale(2);
              this.tweens.add({ targets: sl, alpha: 0, scale: 3, duration: 220, onComplete: () => sl.destroy() });
            } else sfx.hit();
            if (!this.fx.enabled) this.burst(v.c.x, GROUND_Y - v.h / 2, e.crit ? 12 : 5, e.crit ? [0xffcd75, 0xf4f4f4] : [0xf4f4f4]);
            else if (e.src === 'env') this.fxTick(e.who, v.c.x, GROUND_Y - v.h / 2);
            else this.fx.impact(v.c.x, GROUND_Y - v.h / 2, e.src === 'p' ? this.fxEl : 'steel', this.fxTier, !!e.crit);
            const label = e.dmg > 0 ? `${e.dmg}${e.crit ? '!' : ''}` : e.armor ? 'ARMOR' : 'BLOCKED';
            this.floats.add(v.c.x, GROUND_Y - v.h - 8, label, e.crit ? COL.yellow : e.dmg > 0 ? COL.white : COL.sky, !!e.crit);
          }
          await wait(this, e.src === 'p' ? 120 : 210);
          break;
        }
        case 'dodge':
          if (e.who === 'p') {
            this.tweens.add({ targets: this.coon, x: COON_X - 14, yoyo: true, duration: 120 });
            this.fx.dodge(COON_X, GROUND_Y, 1);
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
            if (e.amount > 0) this.fx.block(COON_X, GROUND_Y);
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
            this.fx.heal(COON_X, GROUND_Y, e.amount / c.maxHp);
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
          this.fxStatus(e.who, e.key, e.n);
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
              if (!this.fx.enabled) this.burst(v.c.x, GROUND_Y - v.h / 2, f.def.boss ? 48 : 16, f.def.colors);
              this.fx.death(v.c.x, GROUND_Y, f.def.colors, !!f.def.boss, v.h);
              if (f.def.boss) {
                sfx.bossDie();
                buzz('boss');
                shake(this, 500, 0.015);
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
          shake(this, 400, 0.012);
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
          this.hazard = e.name;
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

  // ---------------------------------------------------------------- PROTOTYPE combat VFX

  private async fxCast(id?: string, target?: Who) {
    const def = id ? skills.get(id) : undefined;
    if (!def) return;
    const lvl = this.run.skills.find((s) => s.id === id)?.lvl ?? 1;
    const e = def.effect(lvl);
    this.fxEl = skillElement(def, e);
    this.fxTier = skillTier(e);
    const L = LOOKS[this.fxEl];
    const self = def.target === 'self' || !e.dmg;
    this.fx.cast(COON_X, GROUND_Y, this.fxEl, this.fxTier, def.target === 'self');
    if (def.target === 'self') return;
    const foes = def.target === 'one' && target !== undefined ? [this.views.get(target as number)].filter(Boolean) : [...this.views.values()];
    const y0 = GROUND_Y - 16;
    if (def.target === 'random' || (self && def.target === 'all')) return;
    if (L.travel === 'shot') await Promise.all(foes.map((v, i) => wait(this, i * 40).then(() => this.fx.shot(COON_X + 10, y0, v!.c.x, GROUND_Y - v!.h / 2, this.fxEl, this.fxTier))));
    else if (L.travel === 'beam') foes.forEach((v) => this.fx.beam(COON_X + 10, y0, v!.c.x, GROUND_Y - v!.h / 2, L.ramp));
    else if (L.travel === 'drop') foes.forEach((v, i) => this.time.delayedCall(i * 60, () => this.fx.drop(v!.c.x, GROUND_Y - v!.h / 2, this.fxEl, this.fxTier)));
  }

  private fxRow(who: Who) {
    if (who === 'p') return { x: this.coonStatus.x, y: this.coonStatus.y, bx: COON_X, by: GROUND_Y - 16 };
    const v = this.views.get(who as number);
    return v ? { x: v.c.x, y: v.c.y + 24, bx: v.c.x, by: GROUND_Y - v.h / 2 } : null;
  }

  private fxStatus(who: Who, key: StatusKey, n: number) {
    const prev = this.fxSt.get(who) ?? {};
    const was = prev[key] ?? 0;
    prev[key] = n;
    this.fxSt.set(who, prev);
    const r = this.fxRow(who);
    if (!r) return;
    if (was <= 0 && n > 0) this.fx.statusApply(r.bx, r.by, r.x, r.y, key);
    else if (n > was) this.fx.statusStack(r.x, r.y, key);
    else if (was > 0 && n <= 0) this.fx.statusEnd(r.x, r.y, false);
  }

  private fxTick(who: Who, x: number, y: number) {
    const st = who === 'p' ? this.combat?.status : this.combat?.foe(who as number)?.status;
    const key = (['burn', 'poison', 'bleed'] as StatusKey[]).find((k) => st?.[k]);
    if (key) this.fx.statusTick(x, y, key);
    else this.fx.impact(x, y, 'earth', 1, false); // hazards: pots, quakes
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
    roll(r, 'after');
    const { xp, shinies: sh } = fightRewards(r, c.killed);
    fightEnds(r, c, true);
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
      track('boss_beaten', { area: r.area + 1, stage: r.stage, mode: r.mode });
    }
    if (elite) {
      r.elites++;
      r.eliteNext = false;
    }
    const ups = gainXp(r, xp);
    if (ups > 0) r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.1 * ups));
    const after = afterFight(r);
    this.combat = null;
    sfx.clear();
    this.coon.play('idle');
    this.floats.add(COON_X, GROUND_Y - 40, `+${xp} XP`, COL.yellow);
    this.floats.add(COON_X + 30, GROUND_Y - 40, `+${sh}`, COL.yellow);
    // Items that act between fights: a heal, the crash, the tax.
    if (after.heal) this.floats.add(COON_X - 20, GROUND_Y - 52, `+${after.heal} HP`, COL.lime);
    if (after.hurt) this.floats.add(COON_X - 20, GROUND_Y - 52, `-${after.hurt} HP`, COL.red);
    if (after.tax) this.floats.add(COON_X + 30, GROUND_Y - 52, `-${after.tax}`, COL.orange);
    this.refreshHud();
    this.views.forEach((v) => (v.c.destroy(), v.shadow.destroy()));
    this.views.clear();
    if (boss) sfx.playMusic(areaTrack(this.theme.id));
    await wait(this, 900);

    const steps: { key: string; data: object }[] = [];
    if (boss) steps.push({ key: 'Reward', data: { run: r, title: 'BOSS LOOT', min: 2 } });
    else if (elite) steps.push({ key: 'Reward', data: { run: r, title: 'ELITE STASH', min: 2 } });
    else if ((roll(r, 'drop'), rand() < 0.15 * rules(r).dropMul) && !rules(r).noDrops) {
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

  // Name for whatever just hurt the raccoon: the foe, the area's hazard, or else the
  // toughest foe still standing (burns, poison and the like come from the fight itself).
  private blameFor(src: Who | 'env') {
    const c = this.combat;
    if (!c) return this.killer;
    if (typeof src === 'number') return c.foe(src)?.def.name ?? this.killer;
    if (this.hazard) return this.hazard;
    const alive = c.foes.filter((f) => !f.dead).sort((a, b) => Number(!!b.def.boss) - Number(!!a.def.boss) || b.maxHp - a.maxHp);
    return alive[0]?.def.name ?? this.killer;
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
    fightEnds(this.run, this.combat!, false);
    const killer = killerOf(this.combat?.killedBy);
    this.clearCombatUi();
    this.run.hp = 0;
    sfx.die();
    buzz('bigHurt');
    this.coon.play('hurt', 99);
    this.tweens.add({ targets: this.coon, angle: -90, y: GROUND_Y - 4, duration: 500, ease: 'Bounce.out' });
    shake(this, 300, 0.01);
    await wait(this, 1300);
    this.finish('death', killer);
  }

  private autoPause() {
    if (this.scene.isActive()) this.pause();
  }

  private inspect() {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Inspect', { run: this.run, from: 'Run' });
  }

  private pause() {
    if (!this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch('Pause', { run: this.run });
    sfx.suspend();
  }
}

