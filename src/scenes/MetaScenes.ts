import Phaser from 'phaser';
import { W, H, GROUND_Y, IS_TOUCH } from '../config';
import { text, button, panel, BTN, LINE_H } from '../ui';
import { sfx } from '../audio';
import { store, save } from '../save';
import { COL } from '../gfx/palette';
import { items, skills, themes, RARITY, STAT_INFO, TAGS } from '../content/registry';
import type { Slot } from '../content/types';
import { RunState, STAT_KEYS, totalStat, maxHp, apPerTurn, critChance, dodgeChance, attackPower, tagCounts } from '../game/run';
import { RaccoonView } from '../game/views';
import { buildTextures } from '../gfx/textures';
import { loadContent } from '../content';
import { Parallax } from '../world/parallax';
import { adsEnabled, showNativeLaunchAd } from '../platform/ads';
import { initIap } from '../platform/iap';
import { isNative } from '../platform/native';

// ---------------------------------------------------------------- shared bits

const SHEET_H = 152;

function sheet(scene: Phaser.Scene, r: RunState, x: number, y: number, w: number) {
  const g = scene.add.graphics();
  panel(g, x, y, w, SHEET_H, 0x29366f, 0x1a1c2c, 0x3b5dc9);
  const L = LINE_H;
  STAT_KEYS.forEach((k, i) => {
    const bonus = totalStat(r, k) - r.stats[k];
    text(scene, x + 8, y + 10 + i * L, STAT_INFO[k].short, { origin: 0, color: STAT_INFO[k].color });
    text(scene, x + 32, y + 10 + i * L, `${r.stats[k]}${bonus ? `+${bonus}` : ''}`, { origin: 0, color: COL.white });
  });
  const dy = y + 10 + 5 * L + 6;
  [`HP ${r.hp}/${maxHp(r)}`, `ATK ${Math.round(attackPower(r))}`, `AP ${apPerTurn(r)}`, `CRIT ${Math.round(critChance(r) * 100)}%`, `DODGE ${Math.round(dodgeChance(r) * 100)}%`].forEach((s, i) =>
    text(scene, x + 8, dy + i * L, s, { origin: 0, color: COL.ice }),
  );
  const colW = Math.floor((w - 84) / 2);
  const sx = x + 80;
  text(scene, sx, y + 10, 'SKILLS', { origin: 0, color: COL.yellow });
  r.skills.forEach((s, i) => {
    const def = skills.get(s.id);
    if (!def) return;
    scene.add.image(sx + 5, y + 24 + i * 13, `skill_${def.id}`);
    text(scene, sx + 13, y + 24 + i * 13, `${def.name}${s.lvl > 1 ? ` ${s.lvl}` : ''}`, { origin: 0, color: COL.white, maxWidth: colW - 16, maxLines: 1 });
  });
  const gx = sx + colW;
  text(scene, gx, y + 10, 'GEAR', { origin: 0, color: COL.yellow });
  const slots: Slot[] = ['head', 'face', 'body', 'back', 'paw', 'tail', 'aura'];
  slots.forEach((sl, i) => {
    const o = r.gear[sl];
    const def = o && items.get(o.id);
    text(scene, gx, y + 22 + i * L, def ? `${def.name}${o!.lvl > 1 ? ` ${o!.lvl}` : ''}` : `- ${sl}`, {
      origin: 0,
      color: def ? RARITY[def.rarity].color : COL.grey,
      maxWidth: colW - 4,
      maxLines: 1,
    });
  });
  const t = tagCounts(r);
  let line = 0;
  const by = y + 22 + 7 * L + 4;
  for (const [k, n] of Object.entries(t)) {
    if (n < 2 || line >= 3) continue;
    const tag = TAGS[k];
    text(scene, sx, by + line * L, `${tag.name} ${n}: ${n >= 4 ? tag.four : tag.two}`, { origin: 0, color: tag.color, maxWidth: w - 88, maxLines: 1 });
    line++;
  }
  if (!line) text(scene, sx, by, '2 ITEMS OF A TAG = SET BONUS', { origin: 0, color: COL.grey });
}

// Caps and gems counters for the top-left of menu screens.
export function wallet(scene: Phaser.Scene, x = 8, y = 10) {
  const capImg = scene.add.image(x + 3, y, 'bottlecap');
  const caps = text(scene, x + 10, y, `${store.caps}`, { origin: 0, color: COL.yellow });
  const gemImg = scene.add.image(x + 18 + caps.width, y, 'gem');
  const gems = text(scene, x + 25 + caps.width, y, `${store.gems}`, { origin: 0, color: COL.ice });
  return {
    parts: [capImg, caps, gemImg, gems],
    refresh() {
      caps.setText(`${store.caps}`);
      gemImg.x = x + 18 + caps.width;
      gems.setText(`${store.gems}`).setX(x + 25 + caps.width);
    },
  };
}

// ---------------------------------------------------------------- pause

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(data: { run: RunState }) {
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.88).setOrigin(0).setInteractive();
    text(this, W / 2, 14, 'PAUSED', { scale: 2, color: COL.white });
    const sw = Math.min(W - 12, 360);
    sheet(this, data.run, W / 2 - sw / 2, 28, sw);
    const resume = () => {
      sfx.resume();
      this.scene.stop();
      this.scene.resume('Run');
    };
    const bw = Math.min(100, (W - 24) / 3);
    button(this, W / 2 - bw - 4, H - 16, bw, 22, 'RESUME', resume, BTN.green);
    const snd = button(this, W / 2, H - 16, bw, 22, sfx.muted ? 'SOUND OFF' : 'SOUND ON', () => {
      sfx.resume();
      sfx.setMuted(!sfx.muted);
      snd.setLabel(sfx.muted ? 'SOUND OFF' : 'SOUND ON');
    });
    let armed = false;
    const quit = button(this, W / 2 + bw + 4, H - 16, bw, 22, 'GIVE UP', () => {
      if (!armed) {
        armed = true;
        quit.setLabel('SURE? TAP');
        return;
      }
      // Giving up counts as dying: the banked character is gone.
      store.kept = null;
      save();
      sfx.resume();
      sfx.stopMusic();
      this.scene.stop('Run');
      this.scene.stop();
      this.scene.start('Title');
    }, BTN.red);
    this.input.keyboard!.on('keydown-ESC', resume);
    this.input.keyboard!.on('keydown-P', resume);
  }
}

// ---------------------------------------------------------------- run over

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: { run: RunState; reason: 'death' | 'retreat'; newBest: boolean; caps: number }) {
    const r = data.run;
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.92).setOrigin(0).setInteractive();
    this.cameras.main.fadeIn(300, 26, 28, 44);
    const dead = data.reason === 'death';
    const t = text(this, W / 2, 14, dead ? 'WIPED OUT' : 'RETREATED', { scale: 2, color: dead ? COL.red : COL.lime });
    t.setScale(0);
    this.tweens.add({ targets: t, scale: 2, duration: 300, ease: 'Back.out' });

    // The final raccoon, gear and all.
    const cx = Math.min(70, W * 0.16);
    const coon = new RaccoonView(this, cx, 128, r, store.skin).setScale(3);
    this.events.on('update', (_t: number, d: number) => coon.update(d / 1000));
    if (dead) coon.setAlpha(0.85);
    text(this, cx, 140, `LV ${r.level}`, { color: COL.yellow });

    const x = cx * 2 + 4;
    const pw = W - x - 6;
    const g = this.add.graphics();
    panel(g, x - 6, 28, pw + 6, 130, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    text(this, x, 37, 'STAGE REACHED', { origin: 0, color: COL.light });
    text(this, x, 51, `${r.stage}`, { origin: 0, scale: 2, color: COL.white });
    text(this, x + 40, 51, r.stage > 0 && r.stage >= store.bestStage ? 'NEW BEST!' : `BEST ${store.bestStage}`, { origin: 0, color: COL.yellow });
    const capX = x + pw - 10;
    this.add.image(capX - 4, 37, 'bottlecap');
    text(this, capX - 12, 37, 'CAPS EARNED', { origin: 1, color: COL.light });
    const capsT = text(this, capX, 51, `+0`, { origin: 1, scale: 2, color: COL.yellow });
    this.tweens.addCounter({ from: 0, to: data.caps, duration: 900, onUpdate: (tw) => capsT.setText(`+${Math.round(tw.getValue() ?? 0)}`) });
    const mins = Math.floor((Date.now() - r.startedAt) / 60000);
    const rows: [string, string][] = [
      ['DISTANCE', `${Math.floor(r.distance)}M`],
      ['AREAS CLEARED', `${r.area}`],
      ['CRITTERS BONKED', `${r.kills}`],
      ['ELITES / BOSSES', `${r.elites} / ${r.bosses}`],
      ['ITEMS FOUND', `${r.itemsFound}`],
      ['BEST COMBO', `${r.bestCombo}`],
      ['RUN TIME', `${mins} MIN`],
    ];
    rows.forEach(([k, v], i) => {
      text(this, x, 70 + i * LINE_H, k, { origin: 0, color: COL.light });
      text(this, x + pw - 10, 70 + i * LINE_H, v, { origin: 1, color: COL.white });
    });
    text(
      this,
      W / 2,
      H - 40,
      dead ? 'YOUR RACCOON IS GONE. NEXT RUN STARTS AT LEVEL 1.' : `KEPT: LV ${r.level} AND YOUR STATS. ITEMS AND SKILLS ARE LOST.`,
      { color: dead ? COL.orange : COL.lime, maxWidth: W - 16, maxLines: 1 },
    );

    let armed = false;
    this.time.delayedCall(700, () => (armed = true));
    const leave = (key: string, d: object = {}) => {
      if (!armed) return;
      armed = false;
      this.scene.stop('Run');
      this.scene.stop();
      this.scene.start(key, d);
    };
    const again = () => leave('Run');
    const bw = Math.min(110, (W - 24) / 3);
    button(this, W / 2 - bw - 4, H - 16, bw, 22, dead ? 'NEW RUN' : 'GO AGAIN', again, BTN.red);
    button(this, W / 2, H - 16, bw, 22, 'SKIN SHOP', () => leave('Store', { back: 'Title' }), BTN.gold);
    button(this, W / 2 + bw + 4, H - 16, bw, 22, 'MENU', () => leave('Title'));
    this.input.keyboard!.on('keydown-SPACE', again);
    this.input.keyboard!.on('keydown-ENTER', again);
  }
}

// ---------------------------------------------------------------- title

export class TitleScene extends Phaser.Scene {
  private started = false;
  private world!: Parallax;
  private coon!: RaccoonView;

  constructor() {
    super('Title');
  }

  create() {
    this.started = false;
    const theme = themes.get('street') ?? [...themes.values()][0];
    this.world = new Parallax(this, theme);
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.3).setOrigin(0).setDepth(-1);
    const cx = Math.round(W * 0.2);
    this.add.image(cx, GROUND_Y + 1, 'shadow').setScale(2.5);
    this.coon = new RaccoonView(this, cx, GROUND_Y + 1, null, store.skin).setScale(3);
    this.coon.play('walk', 99);

    const mx = Math.round(W * 0.6);
    const logo = text(this, mx, 34, 'RETRACOON', { scale: 3, color: COL.white });
    this.tweens.add({ targets: logo, y: 32, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    text(this, mx, 56, 'A TURN-BASED TRASH ROGUELIKE', { color: COL.yellow });

    const go = () => {
      if (this.started) return;
      this.started = true;
      sfx.unlock();
      sfx.select();
      this.cameras.main.fadeOut(220, 26, 28, 44);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Run', {}));
    };
    const play = button(this, mx, 84, 140, 28, store.kept ? `CONTINUE AT LV ${store.kept.level}` : 'PLAY', go, BTN.red);
    this.tweens.add({ targets: play.c, scale: 1.04, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.inOut' });
    button(this, mx, 118, 140, 24, 'SKIN SHOP', () => {
      sfx.unlock();
      this.scene.start('Store', { back: 'Title' });
    }, BTN.gold);
    const sub = store.kept
      ? 'YOUR RETREATED RACCOON KEEPS ITS LEVEL AND STATS'
      : store.bestStage > 0
        ? `BEST STAGE ${store.bestStage}   LEVEL ${store.bestLevel}   BOSSES ${store.bossKills}`
        : 'FIGHT, LOOT, LEVEL UP. RETREAT IN TIME TO KEEP YOUR RACCOON.';
    text(this, mx, 140, sub, { color: store.kept ? COL.lime : COL.light, maxWidth: W - mx + (W - mx) - 8, maxLines: 1 });

    wallet(this);
    const mute = text(this, W - 6, 10, sfx.muted ? 'SOUND OFF' : 'SOUND ON', { origin: 1, color: COL.light });
    const mz = this.add.zone(W - 30, 10, 60, 16).setInteractive({ useHandCursor: true });
    mz.on('pointerup', () => {
      sfx.unlock();
      sfx.setMuted(!sfx.muted);
      mute.setText(sfx.muted ? 'SOUND OFF' : 'SOUND ON');
    });
    text(this, W / 2, H - 10, IS_TOUCH ? 'TAP PLAY TO START' : 'PRESS SPACE TO PLAY', { color: COL.light });
    this.input.keyboard?.on('keydown-SPACE', go);
    this.input.keyboard?.on('keydown-ENTER', go);
    this.cameras.main.fadeIn(250, 26, 28, 44);
    this.events.once('shutdown', () => this.world.destroy());
  }

  update(_t: number, delta: number) {
    const dt = delta / 1000;
    this.coon.update(dt);
    this.world.update(dt, true, 40 * dt);
  }
}

// ---------------------------------------------------------------- the one ad

// Web placeholder for the launch ad: the only ad in the game. On phones the real
// AdMob interstitial shows instead (see platform/ads.ts).
export class AdScene extends Phaser.Scene {
  constructor() {
    super('Ad');
  }

  create() {
    const g = this.add.graphics();
    g.fillStyle(0x333c57, 1).fillRect(0, 0, W, H);
    for (let x = -H; x < W; x += 16) {
      g.fillStyle(0x29366f, 1);
      g.fillTriangle(x, H, x + 8, H, x + H + 8, 0);
    }
    const bw = Math.min(W - 40, 300);
    panel(g, W / 2 - bw / 2, 30, bw, 120, 0x1a1c2c, 0x566c86);
    text(this, W / 2, 48, 'ADVERTISEMENT', { scale: 2, color: COL.white });
    text(this, W / 2, 72, 'THIS IS WHERE THE LAUNCH AD PLAYS ON PHONES.', { color: COL.light, maxWidth: bw - 16 });
    text(this, W / 2, 86, 'IT IS THE ONLY AD IN RETRACOON.', { color: COL.yellow, maxWidth: bw - 16 });
    text(this, W / 2, 100, 'NO ADS DURING RUNS. NO BANNERS. EVER.', { color: COL.light, maxWidth: bw - 16 });
    const count = text(this, W / 2, 128, '', { color: COL.ice });
    let left = 5;
    const skip = button(this, W / 2 + 70, H - 26, 120, 24, 'SKIP', () => this.scene.start('Title'), BTN.green);
    skip.setEnabled(false);
    button(this, W / 2 - 70, H - 26, 120, 24, 'REMOVE ADS', () => this.scene.start('Store', { back: 'Title', tab: 'gems' }), BTN.gold);
    const tick = () => {
      count.setText(left > 0 ? `YOU CAN SKIP IN ${left}` : 'THANKS FOR WATCHING');
      if (left <= 0) skip.setEnabled(true);
      left--;
    };
    tick();
    this.time.addEvent({ delay: 1000, repeat: 5, callback: tick });
  }
}

// ---------------------------------------------------------------- boot

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }
  create() {
    loadContent();
    buildTextures(this);
    void initIap();
    if (!adsEnabled()) return this.scene.start('Title');
    if (isNative()) {
      void showNativeLaunchAd().then(() => this.scene.start('Title'));
      return;
    }
    this.scene.start('Ad');
  }
}
