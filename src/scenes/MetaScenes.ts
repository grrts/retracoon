import Phaser from 'phaser';
import { W, H, IS_TOUCH } from '../config';
import { text, button, panel } from '../ui';
import { sfx } from '../audio';
import { store, save } from '../save';
import { COL } from '../gfx/palette';
import { items, skills, RARITY, STAT_INFO, TAGS } from '../content/registry';
import type { Slot } from '../content/types';
import { RunState, STAT_KEYS, totalStat, maxHp, apPerTurn, critChance, dodgeChance, attackPower, tagCounts } from '../game/run';
import { RaccoonView } from '../game/views';
import { GROUND_Y } from '../gfx/textures';
import { startupAd } from '../ads';
import { buildTextures } from '../gfx/textures';
import { loadContent } from '../content';

// ---------------------------------------------------------------- shared character sheet

function sheet(scene: Phaser.Scene, r: RunState, x: number, y: number, w: number) {
  const g = scene.add.graphics();
  panel(g, x, y, w, 132, 0x29366f, 0x1a1c2c, 0x3b5dc9);
  // stats column
  STAT_KEYS.forEach((k, i) => {
    const bonus = totalStat(r, k) - r.stats[k];
    text(scene, x + 8, y + 10 + i * 9, STAT_INFO[k].short, { origin: 0, color: STAT_INFO[k].color });
    text(scene, x + 30, y + 10 + i * 9, `${r.stats[k]}${bonus ? `+${bonus}` : ''}`, { origin: 0, color: COL.white });
  });
  const dy = y + 60;
  [`HP ${r.hp}/${maxHp(r)}`, `ATK ${Math.round(attackPower(r))}`, `AP ${apPerTurn(r)}`, `CRIT ${Math.round(critChance(r) * 100)}%`, `DODGE ${Math.round(dodgeChance(r) * 100)}%`].forEach((s, i) =>
    text(scene, x + 8, dy + i * 9, s, { origin: 0, color: COL.ice }),
  );
  // skills
  const sx = x + 74;
  text(scene, sx, y + 10, 'SKILLS', { origin: 0, color: COL.yellow });
  r.skills.forEach((s, i) => {
    const def = skills.get(s.id);
    if (!def) return;
    scene.add.image(sx + 5, y + 21 + i * 11, `skill_${def.id}`);
    text(scene, sx + 12, y + 21 + i * 11, `${def.name}${s.lvl > 1 ? ` ${s.lvl}` : ''}`, { origin: 0, color: COL.white });
  });
  // gear
  const gx = x + Math.max(150, w / 2 + 10);
  text(scene, gx, y + 10, 'GEAR', { origin: 0, color: COL.yellow });
  const slots: Slot[] = ['head', 'face', 'body', 'back', 'paw', 'tail', 'aura'];
  slots.forEach((sl, i) => {
    const o = r.gear[sl];
    const def = o && items.get(o.id);
    text(scene, gx, y + 20 + i * 9, def ? `${def.name}${o!.lvl > 1 ? ` ${o!.lvl}` : ''}` : `- ${sl.toUpperCase()}`, {
      origin: 0,
      color: def ? RARITY[def.rarity].color : COL.grey,
    });
  });
  // set bonuses
  const t = tagCounts(r);
  let line = 0;
  for (const [k, n] of Object.entries(t)) {
    if (n < 2) continue;
    const tag = TAGS[k];
    text(scene, gx, y + 88 + line * 9, `${tag.name} ${n}: ${n >= 4 ? tag.four : tag.two}`, { origin: 0, color: tag.color });
    line++;
  }
  if (!line) text(scene, gx, y + 88, '2 ITEMS OF A TAG = SET BONUS', { origin: 0, color: COL.grey });
}

// ---------------------------------------------------------------- pause

export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(data: { run: RunState }) {
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.85).setOrigin(0);
    text(this, W / 2, 10, 'PAUSED', { scale: 2, color: COL.white });
    const sw = Math.min(W - 12, 330);
    sheet(this, data.run, W / 2 - sw / 2, 20, sw);
    const resume = () => {
      sfx.resume();
      this.scene.stop();
      this.scene.resume('Run');
    };
    button(this, W / 2 - 90, H - 14, 76, 16, 'RESUME', resume, { fill: 0x257179, light: 0x38b764 });
    const snd = button(this, W / 2, H - 14, 76, 16, sfx.muted ? 'SOUND OFF' : 'SOUND ON', () => {
      sfx.resume();
      sfx.setMuted(!sfx.muted);
      snd.label.setText(sfx.muted ? 'SOUND OFF' : 'SOUND ON');
    });
    let armed = false;
    const quit = button(this, W / 2 + 90, H - 14, 76, 16, 'GIVE UP', () => {
      if (!armed) {
        armed = true;
        quit.label.setText('SURE? TAP');
        return;
      }
      store.kept = null;
      save();
      sfx.resume();
      sfx.stopMusic();
      this.scene.stop('Run');
      this.scene.stop();
      this.scene.start('Title');
    });
    this.input.keyboard!.on('keydown-ESC', resume);
    this.input.keyboard!.on('keydown-P', resume);
  }
}

// ---------------------------------------------------------------- run over

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: { run: RunState; reason: 'death' | 'retreat'; newBest: boolean }) {
    const r = data.run;
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.92).setOrigin(0);
    this.cameras.main.fadeIn(300, 26, 28, 44);
    const dead = data.reason === 'death';
    const t = text(this, W / 2, 12, dead ? 'WIPED OUT' : 'RETREATED', { scale: 2, color: dead ? COL.red : COL.lime });
    t.setScale(0);
    this.tweens.add({ targets: t, scale: 2, duration: 300, ease: 'Back.out' });

    // the final raccoon, gear and all
    const coon = new RaccoonView(this, 52, 92, r).setScale(3);
    this.events.on('update', (_t: number, d: number) => coon.update(d / 1000));
    if (dead) coon.setAlpha(0.85);
    text(this, 52, 102, `LV ${r.level}`, { color: COL.yellow });

    const x = 104;
    const g = this.add.graphics();
    panel(g, x - 6, 24, W - x, 112, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    text(this, x, 32, 'DISTANCE', { origin: 0, color: COL.light });
    text(this, x, 44, `${Math.floor(r.distance)}M`, { origin: 0, scale: 2, color: COL.white });
    text(this, x + 90, 44, data.newBest ? 'NEW BEST!' : `BEST ${store.bestDistance}M`, { origin: 0, color: COL.yellow });
    const mins = Math.floor((Date.now() - r.startedAt) / 60000);
    const rows: [string, string][] = [
      ['AREAS CLEARED', `${r.area}`],
      ['FIGHTS WON', `${r.fights - (dead ? 1 : 0)}`],
      ['CRITTERS BONKED', `${r.kills}`],
      ['ELITES / BOSSES', `${r.elites} / ${r.bosses}`],
      ['SHINIES EARNED', `${r.shiniesEarned}`],
      ['ITEMS FOUND', `${r.itemsFound}`],
      ['RUN TIME', `${mins} MIN`],
    ];
    rows.forEach(([k, v], i) => {
      text(this, x, 60 + i * 9, k, { origin: 0, color: COL.light });
      text(this, W - 12, 60 + i * 9, v, { origin: 1, color: COL.white });
    });
    text(
      this,
      W / 2,
      H - 34,
      dead ? 'ALL ITEMS, SKILLS AND STATS ARE LOST.' : `KEPT FOR NEXT RUN: LV ${r.level} AND YOUR STATS`,
      { color: dead ? COL.orange : COL.lime },
    );

    let armed = false;
    this.time.delayedCall(700, () => (armed = true));
    const again = () => {
      if (!armed) return;
      armed = false;
      this.scene.stop('Run');
      this.scene.stop();
      this.scene.start('Run', {});
    };
    button(this, W / 2 - 55, H - 14, 100, 18, 'NEW RUN', again, { fill: 0xb13e53, light: 0xef7d57 });
    button(this, W / 2 + 55, H - 14, 80, 18, 'MENU', () => {
      if (!armed) return;
      this.scene.stop('Run');
      this.scene.stop();
      this.scene.start('Title');
    });
    this.input.keyboard!.on('keydown-SPACE', again);
    this.input.keyboard!.on('keydown-ENTER', again);
  }
}

// ---------------------------------------------------------------- title

export class TitleScene extends Phaser.Scene {
  private started = false;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private coon!: RaccoonView;

  constructor() {
    super('Title');
  }

  create() {
    this.started = false;
    this.layers = [
      this.add.tileSprite(0, 0, W, H, 'sky_alley').setOrigin(0),
      this.add.tileSprite(0, 0, W, GROUND_Y + 4, 'far_alley').setOrigin(0),
      this.add.tileSprite(0, 0, W, GROUND_Y + 2, 'near_alley').setOrigin(0),
      this.add.tileSprite(0, GROUND_Y - 2, W, H - GROUND_Y + 2, 'ground_alley').setOrigin(0),
    ];
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.3).setOrigin(0);
    this.add.image(W / 2 - 40, GROUND_Y + 1, 'shadow').setScale(1.5);
    this.coon = new RaccoonView(this, W / 2 - 40, GROUND_Y + 1).setScale(2);
    this.coon.play('walk');

    const l = text(this, W / 2 + 30, 34, 'RETRACOON', { scale: 3, color: COL.white });
    this.tweens.add({ targets: l, y: 32, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });
    text(this, W / 2 + 30, 54, 'A TURN-BASED TRASH ROGUELIKE', { color: COL.yellow });

    const start = text(this, W / 2 + 30, 76, IS_TOUCH ? 'TAP TO START' : 'CLICK OR PRESS SPACE', { color: COL.white });
    this.tweens.add({ targets: start, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    if (store.kept) text(this, W / 2 + 30, 88, `RETREAT BONUS: START AT LV ${store.kept.level}`, { color: COL.lime });
    if (store.bestDistance > 0) text(this, W / 2 + 30, 98, `BEST ${store.bestDistance}M  ITEMS SEEN ${store.seen.length}/${items.size}`, { color: COL.light });
    text(this, W / 2, H - 8, 'FIGHT, LOOT, LEVEL UP. RETREAT TO KEEP YOUR STATS.', { color: COL.light });

    const mute = text(this, W - 6, 8, sfx.muted ? 'SOUND OFF' : 'SOUND ON', { origin: 1, color: COL.light });
    const mz = this.add.zone(W - 30, 8, 56, 14).setInteractive({ useHandCursor: true });
    mz.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e: Phaser.Types.Input.EventData) => {
      e.stopPropagation();
      sfx.unlock();
      sfx.setMuted(!sfx.muted);
      mute.setText(sfx.muted ? 'SOUND OFF' : 'SOUND ON');
    });

    const go = () => {
      if (this.started) return;
      this.started = true;
      sfx.unlock();
      sfx.select();
      this.cameras.main.fadeOut(220, 26, 28, 44);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Run', {}));
    };
    this.input.on('pointerdown', go);
    this.input.keyboard?.on('keydown-SPACE', go);
    this.input.keyboard?.on('keydown-ENTER', go);
    this.cameras.main.fadeIn(250, 26, 28, 44);
  }

  update(_t: number, delta: number) {
    const dt = delta / 1000;
    this.coon.update(dt);
    [0.05, 0.25, 0.6, 1].forEach((f, i) => (this.layers[i].tilePositionX += 50 * dt * f));
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
    // The one allowed ad slot: before the menu, never during a run.
    void startupAd().then(() => this.scene.start('Title'));
  }
}
