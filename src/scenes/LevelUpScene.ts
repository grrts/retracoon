import Phaser from 'phaser';
import { W, H } from '../config';
import { Overlay, OverlayData, TITLE_BAND } from './Overlay';
import { text, button, panel, BTN } from '../ui';
import { onAction } from '../input';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import { STAT_INFO, skills } from '../content/registry';
import type { StatKey } from '../content/types';
import { STAT_KEYS, SKILL_SLOTS, apPerTurn, critChance, dodgeChance, maxHp, totalStat, levelUpChoices, learnSkill, addPassive, forgetSkill, attackPower, LevelChoice } from '../game/run';

// Level up: spend stat points, then pick a skill.
export class LevelUpScene extends Overlay<OverlayData & { statsOnly?: boolean }> {
  private spent: Record<StatKey, number> = { str: 0, def: 0, agi: 0, lck: 0, vit: 0 };
  private rows: { k: StatKey; val: Phaser.GameObjects.BitmapText; plus: ReturnType<typeof button>; minus: ReturnType<typeof button> }[] = [];
  private pointsText!: Phaser.GameObjects.BitmapText;
  private derived!: Phaser.GameObjects.BitmapText;
  private layer: Phaser.GameObjects.GameObject[] = [];
  private taken = false;
  // What keys and the pad do on the current step.
  private keys: { confirm?: () => void; slot?: (i: number) => void; back?: () => void } = {};

  constructor() {
    super('LevelUp');
  }

  create() {
    this.spent = { str: 0, def: 0, agi: 0, lck: 0, vit: 0 };
    this.rows = [];
    this.layer = [];
    this.taken = false;
    this.keys = {};
    onAction(this, 'confirm', () => this.keys.confirm?.());
    onAction(this, 'back', () => this.keys.back?.());
    onAction(this, ['slot1', 'slot2', 'slot3', 'slot4'], (a) => this.keys.slot?.(Number(a.slice(4)) - 1));
    this.backdrop();
    sfx.upgrade();
    if (this.d.run.statPoints > 0) this.statStep();
    else this.skillStep();
  }

  private clearLayer() {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
  }

  // ---------------------------------------------------------------- stats

  private statStep() {
    const r = this.d.run;
    this.layer.push(...this.title(this.d.statsOnly ? 'TRAINING' : `LEVEL ${r.level}!`, COL.yellow));
    this.pointsText = text(this, W / 2, TITLE_BAND + 6, '', { color: COL.lime });
    this.layer.push(this.pointsText);
    const top = TITLE_BAND + 16;
    const rowH = 22;
    const bw = Math.min(W - 16, 340);
    const x0 = W / 2 - bw / 2;
    this.layer.push(this.box(x0, top - 3, bw, rowH * 5 + 6));
    STAT_KEYS.forEach((k, i) => {
      const y = top + 6 + i * rowH;
      const info = STAT_INFO[k];
      this.layer.push(text(this, x0 + 8, y, info.short, { origin: 0, color: info.color }));
      this.layer.push(text(this, x0 + 30, y, info.desc, { origin: 0, color: COL.light, maxWidth: bw - 120, maxLines: 1 }));
      const val = text(this, x0 + bw - 62, y, '', { origin: 1, color: COL.white });
      const minus = button(this, x0 + bw - 46, y, 22, 18, '-', () => this.change(k, -1), { depth: 5 });
      const plus = button(this, x0 + bw - 18, y, 26, 18, '+', () => this.change(k, 1), { ...BTN.green, depth: 5 });
      this.layer.push(val, minus.c, plus.c);
      this.rows.push({ k, val, plus, minus });
    });
    this.derived = text(this, W / 2, top + rowH * 5 + 10, '', { color: COL.ice, maxWidth: W - 16, maxLines: 1 });
    this.layer.push(this.derived);
    const ok = button(this, W / 2, H - 16, 120, 22, 'CONFIRM', () => this.confirmStats(), { ...BTN.red, depth: 5 });
    this.layer.push(ok.c);
    this.keys = { confirm: () => this.confirmStats() };
    this.refresh();
  }

  private change(k: StatKey, d: number) {
    const r = this.d.run;
    if (d > 0 && r.statPoints <= 0) return;
    if (d < 0 && this.spent[k] <= 0) return;
    r.stats[k] += d;
    r.statPoints -= d;
    this.spent[k] += d;
    if (k === 'vit') r.hp = Math.max(1, Math.min(maxHp(r), r.hp + 6 * d));
    this.refresh();
  }

  private refresh() {
    const r = this.d.run;
    this.pointsText.setText(r.statPoints > 0 ? `${r.statPoints} POINTS TO SPEND` : 'ALL POINTS SPENT');
    for (const row of this.rows) {
      const bonus = totalStat(r, row.k) - r.stats[row.k];
      row.val.setText(`${r.stats[row.k]}${bonus ? `+${bonus}` : ''}`);
      row.val.setTint(this.spent[row.k] > 0 ? COL.lime : COL.white);
      row.plus.setEnabled(r.statPoints > 0);
      row.minus.setEnabled(this.spent[row.k] > 0);
    }
    this.derived.setText(
      `HP ${maxHp(r)}  ATK ${Math.round(attackPower(r))}  AP ${apPerTurn(r)}  CRIT ${Math.round(critChance(r) * 100)}%  DODGE ${Math.round(dodgeChance(r) * 100)}%`,
    );
  }

  private confirmStats() {
    if (!this.pointsText?.active) return;
    sfx.upgrade();
    this.clearLayer();
    this.rows = [];
    if (this.d.statsOnly) return this.close();
    this.skillStep();
  }

  // ---------------------------------------------------------------- skills

  private skillStep(keep?: LevelChoice[]) {
    const r = this.d.run;
    const choices = keep ?? levelUpChoices(r, 3);
    if (!choices.length) return this.close();
    const allPassive = choices.every((c) => c.kind === 'passive');
    const full = r.skills.length >= SKILL_SLOTS;
    this.layer.push(
      ...this.title(
        allPassive ? 'PASSIVE SKILL' : 'NEW SKILL',
        allPassive ? COL.lime : COL.ice,
        allPassive ? 'SKILLS MAXED. PASSIVES STACK FOREVER.' : full ? 'SLOTS FULL: UPGRADE A SKILL OR TAKE A PASSIVE.' : 'TAP ONE, THEN LEARN. OWNED SKILLS GET STRONGER.',
      ),
    );
    let picked = -1;
    const cards: Phaser.GameObjects.Container[] = [];
    const ring = this.add.graphics();
    this.layer.push(ring);
    // Bottom row: SKIP, FORGET (once the slots are full) and LEARN.
    const row = full ? [56, 76, 150] : [70, 0, 150];
    const x0 = W / 2 - (row[0] + row[1] + row[2] + (full ? 12 : 60)) / 2;
    const learnX = x0 + row[0] + row[1] + (full ? 12 : 60) + row[2] / 2;
    const learn = button(this, learnX, H - 14, row[2], 20, 'LEARN', () => picked >= 0 && this.pickChoice(choices[picked]), { ...BTN.green, depth: 5 });
    learn.setEnabled(false);
    const select = (i: number) => {
      if (i >= choices.length) return;
      if (picked === i) return this.pickChoice(choices[i]);
      picked = i;
      sfx.select();
      const c = cards[i];
      ring.clear().lineStyle(2, 0xffcd75, 1).strokeRect(c.x - c.width / 2 - 3, c.y - c.height / 2 - 3, c.width + 6, c.height + 6);
      cards.forEach((k, j) => k.setAlpha(j === i ? 1 : 0.6));
      learn.setEnabled(true);
      learn.setLabel(`${choices[i].kind === 'passive' ? 'TAKE' : 'LEARN'} ${choices[i].def.name}`);
    };
    const n = choices.length;
    const cw = Math.min(130, Math.floor((W - 16 - (n - 1) * 6) / n));
    const ch = 140;
    choices.forEach((choice, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + 6);
      const y = TITLE_BAND + 12 + ch / 2;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      c.add(g);
      if (choice.kind === 'skill') {
        const s = choice.def;
        const owned = r.skills.find((o) => o.id === s.id);
        const lvl = owned ? owned.lvl + 1 : 1;
        panel(g, -cw / 2, -ch / 2, cw, ch, 0x29366f, owned ? 0xffcd75 : 0x73eff7, 0x3b5dc9);
        c.add(this.add.image(0, -ch / 2 + 16, `skill_${s.id}`).setScale(2));
        c.add(text(this, 0, -ch / 2 + 36, s.name, { color: COL.white, maxWidth: cw - 8, maxLines: 1 }));
        c.add(text(this, 0, -ch / 2 + 47, owned ? (lvl >= s.max ? `LEVEL ${lvl} (MAX)` : `LEVEL ${lvl}`) : 'NEW', { color: owned ? COL.yellow : COL.lime }));
        c.add(text(this, 0, -ch / 2 + 56, s.desc(lvl), { originY: 0, color: COL.light, maxWidth: cw - 10, maxLines: 6 }));
        c.add(text(this, 0, ch / 2 - 10, `${s.cost} AP${s.cooldown ? `  WAIT ${s.cooldown}` : ''}`, { color: COL.ice }));
      } else {
        const p = choice.def;
        const have = r.passives[p.id] ?? 0;
        panel(g, -cw / 2, -ch / 2, cw, ch, 0x1f3a2c, 0xa7f070, 0x38b764);
        c.add(this.add.image(0, -ch / 2 + 16, `passive_${p.id}`).setScale(2));
        c.add(text(this, 0, -ch / 2 + 36, p.name, { color: COL.white, maxWidth: cw - 8, maxLines: 1 }));
        c.add(text(this, 0, -ch / 2 + 47, have ? `PASSIVE X${have + 1}` : 'PASSIVE', { color: COL.lime }));
        c.add(text(this, 0, -ch / 2 + 56, p.each, { originY: 0, color: COL.light, maxWidth: cw - 10, maxLines: 3 }));
        c.add(text(this, 0, ch / 2 - 17, `TOTAL ${p.desc(have + 1)}`, { color: COL.ice, maxWidth: cw - 8, maxLines: 2 }));
      }
      c.setSize(cw, ch).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => select(i));
      cards.push(c);
      c.setScale(0.8).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, delay: i * 70, duration: 200, ease: 'Back.out' });
      this.layer.push(c);
    });
    const skip = button(this, x0 + row[0] / 2, H - 14, row[0], 20, 'SKIP', () => this.close(), { depth: 5 });
    this.layer.push(skip.c, learn.c);
    if (full) {
      const forget = button(this, x0 + row[0] + 6 + row[1] / 2, H - 14, row[1], 20, 'FORGET', () => {
        sfx.select();
        this.clearLayer();
        this.forgetStep(choices);
      }, { ...BTN.red, depth: 5 });
      this.layer.push(forget.c);
    }
    this.keys = { slot: select, confirm: () => picked >= 0 && this.pickChoice(choices[picked]) };
  }

  // Instead of a card: drop one of your skills. Its slot opens, so later level-ups can
  // offer new skills again. Uses up this level-up's pick.
  private forgetStep(choices: LevelChoice[]) {
    const r = this.d.run;
    this.layer.push(...this.title('FORGET A SKILL', COL.orange, 'USES THIS PICK. THE FREE SLOT BRINGS NEW SKILLS LATER.'));
    let picked = -1;
    const cards: Phaser.GameObjects.Container[] = [];
    const ring = this.add.graphics();
    this.layer.push(ring);
    const forget = button(this, W / 2 + 50, H - 14, 150, 20, 'FORGET', () => picked >= 0 && this.forget(r.skills[picked].id), { ...BTN.red, depth: 5 });
    forget.setEnabled(false);
    const select = (i: number) => {
      const s = r.skills[i];
      if (!s) return;
      if (picked === i) return this.forget(s.id);
      picked = i;
      sfx.select();
      const c = cards[i];
      ring.clear().lineStyle(2, 0xef7d57, 1).strokeRect(c.x - c.width / 2 - 3, c.y - c.height / 2 - 3, c.width + 6, c.height + 6);
      cards.forEach((k, j) => k.setAlpha(j === i ? 1 : 0.6));
      forget.setEnabled(true);
      forget.setLabel(`FORGET ${skills.get(s.id)?.name ?? ''}`);
    };
    const n = r.skills.length;
    const cw = Math.min(110, Math.floor((W - 16 - (n - 1) * 6) / n));
    const ch = 140;
    r.skills.forEach((o, i) => {
      const s = skills.get(o.id);
      if (!s) return;
      const c = this.add.container(W / 2 + (i - (n - 1) / 2) * (cw + 6), TITLE_BAND + 12 + ch / 2);
      const g = this.add.graphics();
      panel(g, -cw / 2, -ch / 2, cw, ch, 0x3b1f2c, 0xef7d57, 0xb13e53);
      c.add(g);
      c.add(this.add.image(0, -ch / 2 + 16, `skill_${s.id}`).setScale(2));
      c.add(text(this, 0, -ch / 2 + 36, s.name, { color: COL.white, maxWidth: cw - 8, maxLines: 1 }));
      c.add(text(this, 0, -ch / 2 + 47, `LEVEL ${o.lvl}`, { color: COL.yellow }));
      c.add(text(this, 0, -ch / 2 + 56, s.desc(o.lvl), { originY: 0, color: COL.light, maxWidth: cw - 10, maxLines: 6 }));
      c.add(text(this, 0, ch / 2 - 10, `${s.cost} AP${s.cooldown ? `  WAIT ${s.cooldown}` : ''}`, { color: COL.ice }));
      c.setSize(cw, ch).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => select(i));
      cards.push(c);
      this.layer.push(c);
    });
    const back = () => {
      sfx.select();
      this.clearLayer();
      this.skillStep(choices);
    };
    const bb = button(this, W / 2 - 80, H - 14, 70, 20, 'BACK', back, { depth: 5 });
    this.layer.push(bb.c, forget.c);
    this.keys = { slot: select, confirm: () => picked >= 0 && this.forget(r.skills[picked].id), back };
  }

  private forget(id: string) {
    if (this.taken) return;
    this.taken = true;
    forgetSkill(this.d.run, id);
    sfx.thud();
    this.close();
  }

  private pickChoice(c: LevelChoice) {
    if (this.taken) return;
    this.taken = true;
    const r = this.d.run;
    sfx.select();
    if (c.kind === 'skill') learnSkill(r, c.def.id);
    else addPassive(r, c.def.id);
    sfx.upgrade();
    this.close();
  }
}
