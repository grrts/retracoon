import { W, H } from '../config';
import { Overlay, OverlayData, TITLE_BAND } from './Overlay';
import { text, button, panel, BTN } from '../ui';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import { STAT_INFO, skills } from '../content/registry';
import type { SkillDef, StatKey } from '../content/types';
import { STAT_KEYS, SKILL_SLOTS, apPerTurn, critChance, dodgeChance, maxHp, totalStat, skillChoices, learnSkill, attackPower } from '../game/run';

// Level up: spend stat points, then pick a skill.
export class LevelUpScene extends Overlay<OverlayData & { statsOnly?: boolean }> {
  private spent: Record<StatKey, number> = { str: 0, def: 0, agi: 0, lck: 0, vit: 0 };
  private rows: { k: StatKey; val: Phaser.GameObjects.BitmapText; plus: ReturnType<typeof button>; minus: ReturnType<typeof button> }[] = [];
  private pointsText!: Phaser.GameObjects.BitmapText;
  private derived!: Phaser.GameObjects.BitmapText;
  private layer: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('LevelUp');
  }

  create() {
    this.spent = { str: 0, def: 0, agi: 0, lck: 0, vit: 0 };
    this.rows = [];
    this.layer = [];
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
    const choices = skillChoices(r, 3);
    if (!choices.length) return this.close();
    this.layer.push(...this.title('NEW SKILL', COL.ice, 'PICK ONE. OWNED SKILLS GET STRONGER.'));
    const n = choices.length;
    const cw = Math.min(130, Math.floor((W - 16 - (n - 1) * 6) / n));
    const ch = 140;
    choices.forEach((s, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + 6);
      const y = TITLE_BAND + 12 + ch / 2;
      const owned = r.skills.find((o) => o.id === s.id);
      const lvl = owned ? owned.lvl + 1 : 1;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      panel(g, -cw / 2, -ch / 2, cw, ch, 0x29366f, owned ? 0xffcd75 : 0x73eff7, 0x3b5dc9);
      c.add(g);
      c.add(this.add.image(0, -ch / 2 + 16, `skill_${s.id}`).setScale(2));
      c.add(text(this, 0, -ch / 2 + 36, s.name, { color: COL.white, maxWidth: cw - 8, maxLines: 1 }));
      c.add(text(this, 0, -ch / 2 + 47, owned ? `LEVEL ${lvl}` : 'NEW', { color: owned ? COL.yellow : COL.lime }));
      c.add(text(this, 0, -ch / 2 + 56, s.desc(lvl), { originY: 0, color: COL.light, maxWidth: cw - 10, maxLines: 6 }));
      c.add(text(this, 0, ch / 2 - 10, `${s.cost} AP${s.cooldown ? `  WAIT ${s.cooldown}` : ''}`, { color: COL.ice }));
      c.setSize(cw, ch).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.pickSkill(s));
      c.setScale(0.8).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, delay: i * 70, duration: 200, ease: 'Back.out' });
      this.layer.push(c);
    });
    const skip = button(this, W / 2, H - 14, 90, 20, 'SKIP', () => this.close(), { depth: 5 });
    this.layer.push(skip.c);
    const kb = this.input.keyboard!;
    kb.on('keydown-ONE', () => choices[0] && this.pickSkill(choices[0]));
    kb.on('keydown-TWO', () => choices[1] && this.pickSkill(choices[1]));
    kb.on('keydown-THREE', () => choices[2] && this.pickSkill(choices[2]));
  }

  private pickSkill(s: SkillDef) {
    const r = this.d.run;
    sfx.select();
    if (r.skills.find((o) => o.id === s.id) || r.skills.length < SKILL_SLOTS) {
      learnSkill(r, s.id);
      sfx.upgrade();
      return this.close();
    }
    this.replaceStep(s);
  }

  // Slots are full: choose which skill to forget.
  private replaceStep(s: SkillDef) {
    this.input.keyboard!.removeAllListeners();
    this.clearLayer();
    const r = this.d.run;
    this.layer.push(...this.title('SKILLS FULL', COL.orange, `FORGET A SKILL TO LEARN ${s.name}`));
    r.skills.forEach((o, i) => {
      const def = skills.get(o.id)!;
      const y = TITLE_BAND + 26 + i * 30;
      const b = button(this, W / 2, y, 220, 26, '', () => {
        learnSkill(r, s.id, i);
        sfx.upgrade();
        this.close();
      }, { depth: 5 });
      b.label.destroy();
      b.c.add(this.add.image(-96, 0, `skill_${def.id}`));
      b.c.add(text(this, -84, 0, `${def.name} LV${o.lvl}`, { origin: 0, color: i === 0 ? COL.grey : COL.white }));
      if (i === 0) {
        b.setEnabled(false);
        b.c.add(text(this, 102, 0, 'ALWAYS KEPT', { origin: 1, color: COL.grey }));
      }
      this.layer.push(b.c);
    });
    const keep = button(this, W / 2, H - 16, 130, 22, 'KEEP MY SKILLS', () => this.close(), { depth: 5 });
    this.layer.push(keep.c);
  }
}
