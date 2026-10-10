import Phaser from 'phaser';
import { W, H } from '../config';
import { Overlay, OverlayData, TITLE_BAND } from './Overlay';
import { text, button, panel, BTN } from '../ui';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import { STAT_INFO } from '../content/registry';
import type { StatKey } from '../content/types';
import { STAT_KEYS, SKILL_SLOTS, apPerTurn, critChance, dodgeChance, maxHp, totalStat, levelUpChoices, learnSkill, addPassive, attackPower, LevelChoice } from '../game/run';

// Level up: spend stat points, then pick a skill.
export class LevelUpScene extends Overlay<OverlayData & { statsOnly?: boolean }> {
  private spent: Record<StatKey, number> = { str: 0, def: 0, agi: 0, lck: 0, vit: 0 };
  private rows: { k: StatKey; val: Phaser.GameObjects.BitmapText; plus: ReturnType<typeof button>; minus: ReturnType<typeof button> }[] = [];
  private pointsText!: Phaser.GameObjects.BitmapText;
  private derived!: Phaser.GameObjects.BitmapText;
  private layer: Phaser.GameObjects.GameObject[] = [];
  private taken = false;

  constructor() {
    super('LevelUp');
  }

  create() {
    this.spent = { str: 0, def: 0, agi: 0, lck: 0, vit: 0 };
    this.rows = [];
    this.layer = [];
    this.taken = false;
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
    this.input.keyboard!.once('keydown-ENTER', () => this.confirmStats());
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

  private skillStep() {
    const r = this.d.run;
    const choices = levelUpChoices(r, 3);
    if (!choices.length) return this.close();
    const allPassive = choices.every((c) => c.kind === 'passive');
    this.layer.push(
      ...this.title(
        allPassive ? 'PASSIVE SKILL' : 'NEW SKILL',
        allPassive ? COL.lime : COL.ice,
        allPassive ? 'SKILLS MAXED. PASSIVES STACK FOREVER.' : r.skills.length >= SKILL_SLOTS ? 'SLOTS FULL: UPGRADE A SKILL OR TAKE A PASSIVE.' : 'TAP ONE, THEN LEARN. OWNED SKILLS GET STRONGER.',
      ),
    );
    let picked = -1;
    const cards: Phaser.GameObjects.Container[] = [];
    const ring = this.add.graphics();
    this.layer.push(ring);
    const learn = button(this, W / 2 + 50, H - 14, 150, 20, 'LEARN', () => picked >= 0 && this.pickChoice(choices[picked]), { ...BTN.green, depth: 5 });
    learn.setEnabled(false);
    const select = (i: number) => {
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
    const skip = button(this, W / 2 - 80, H - 14, 70, 20, 'SKIP', () => this.close(), { depth: 5 });
    this.layer.push(skip.c, learn.c);
    const kb = this.input.keyboard!;
    ['ONE', 'TWO', 'THREE'].forEach((k, i) => kb.on(`keydown-${k}`, () => i < choices.length && select(i)));
    kb.on('keydown-ENTER', () => picked >= 0 && this.pickChoice(choices[picked]));
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
