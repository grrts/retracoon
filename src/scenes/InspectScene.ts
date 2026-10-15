import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, panel, wrapPx, BTN, Button } from '../ui';
import { onAction } from '../input';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import { items, sets, skills, RARITY, SLOT_NAMES, TAGS } from '../content/registry';
import { passives } from '../content/passives';
import { ensureItem } from '../gfx/textures';
import type { SkillDef, Slot, StatusKey } from '../content/types';
import { setCounts, skillCtx, tagCounts, type RunState } from '../game/run';
import { reqLabel, STATUS_WORD } from '../content/skills/book';

type Tab = 'gear' | 'skills' | 'passives' | 'sets' | 'words';

interface Row {
  icon: string;
  name: string;
  sub: string;
  color: number;
  detail: string;
  detailColor?: number;
}

const SLOTS: Slot[] = ['head', 'face', 'body', 'back', 'paw', 'tail', 'aura'];
const TABS: Tab[] = ['gear', 'skills', 'passives', 'sets', 'words'];

// What the status words on skills and items mean.
const WORDS: [StatusKey, string, number][] = [
  ['poison', 'LOSES THAT MUCH AT THE START OF ITS TURN, THEN 1 LESS EACH TURN.', COL.lime],
  ['burn', 'LOSES THAT MUCH AT THE START OF ITS TURN, THEN THE BURN HALVES. BIG AND FAST.', COL.orange],
  ['bleed', 'EVERY HIT THAT LANDS ON IT DEALS THAT MUCH MORE. FADES 1 A TURN. LOVES MULTI-HITS.', COL.red],
  ['chill', 'AT 5 CHILL (8 FOR BOSSES) IT FREEZES: STUNNED FOR A TURN. FADES 1 A TURN.', COL.ice],
  ['mark', 'HITS ON A MARKED FOE ALWAYS CRIT. EACH CRIT USES ONE MARK.', COL.yellow],
  ['stun', 'LOSES ITS NEXT TURN.', COL.yellow],
  ['weak', 'WEAKENED: DEALS 25% LESS DAMAGE FOR THAT MANY TURNS.', COL.light],
  ['vuln', 'EXPOSED: TAKES 50% MORE DAMAGE FOR THAT MANY TURNS.', COL.orange],
  ['rage', 'YOU DEAL 50% MORE DAMAGE FOR THAT MANY TURNS.', COL.red],
  ['thorns', 'ATTACKERS TAKE THAT MUCH WHEN THEY HIT YOU THIS ROUND.', COL.light],
  ['focus', 'YOUR NEXT HITS ALWAYS CRIT, ONE FOCUS PER HIT.', COL.yellow],
  ['evade', 'YOU DODGE THAT MANY HITS BEFORE YOUR NEXT TURN.', COL.ice],
  ['regen', 'HEALS THAT MUCH AT THE START OF THE TURN, THEN 1 LESS EACH TURN.', COL.green],
];

// Words skill and item cards use that aren't statuses.
const TERMS: [string, string, number][] = [
  ['DRAIN', 'HEAL THAT SHARE OF THE DAMAGE THE SKILL DEALS.', COL.red],
  ['PIERCES', 'IGNORES THE FOE\'S BLOCK.', COL.light],
  ['COMBO', 'COUNTS THE SKILLS YOU ALREADY USED THIS TURN.', COL.yellow],
  ['LOW HP', 'THE FULL BONUS AT 1 HP, NONE AT FULL HEALTH.', COL.orange],
  ['CHEAT DEATH', 'ONCE A FIGHT, A BLOW THAT WOULD KILL YOU LEAVES YOU AT 1 HP INSTEAD.', COL.yellow],
  ['RISKY', 'AN ITEM OR SET WITH A REAL CATCH. ITS CATCH NEVER GROWS WHEN THE ITEM LEVELS UP.', COL.red],
];

const STAT_NAME = { str: 'STR', def: 'DEF', agi: 'AGI', lck: 'LCK', vit: 'VIT' };
const scaleNote = (def: SkillDef) => {
  const q = def.req;
  if (!q) return '';
  const grows = [q.level ? 'YOUR LEVEL' : '', q.stat ? STAT_NAME[q.stat] : ''].filter(Boolean).join(' AND ');
  return ` UNLOCKED AT ${reqLabel(q)}, GROWS WITH ${grows}.`;
};

// Look at everything the raccoon carries: tap a tab, then tap a row for the full text.
// Opened from the bag button in a run, or from the pause screen.
export class InspectScene extends Phaser.Scene {
  private run!: RunState;
  private from!: string;
  private tab: Tab = 'gear';
  private layer: Phaser.GameObjects.GameObject[] = [];
  private tabs: Record<Tab, Button> = {} as Record<Tab, Button>;

  constructor() {
    super('Inspect');
  }

  create(data: { run: RunState; from: string; tab?: Tab }) {
    this.run = data.run;
    this.from = data.from;
    this.tab = data.tab ?? 'gear';
    this.layer = [];
    this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.94).setOrigin(0).setInteractive();
    text(this, W / 2, 12, 'YOUR STUFF', { scale: 2, color: COL.white });
    const tw = Math.min(84, Math.floor((W - 12 - 4 * 3) / TABS.length));
    TABS.forEach((t, i) => {
      this.tabs[t] = button(this, W / 2 + (i - (TABS.length - 1) / 2) * (tw + 3), 32, tw, 18, t.toUpperCase(), () => this.show(t), { depth: 5 });
    });
    button(this, W / 2, H - 14, 120, 20, 'BACK', () => this.back(), { ...BTN.green, depth: 5 });
    onAction(this, 'back', () => this.back());
    this.show(this.tab);
  }

  private rows(): Row[] {
    const r = this.run;
    if (this.tab === 'gear') {
      return SLOTS.map((sl) => {
        const o = r.gear[sl];
        const def = o && items.get(o.id);
        if (def) ensureItem(this, def.id);
        if (!def) return { icon: '', name: `NO ${SLOT_NAMES[sl]} ITEM`, sub: '', color: COL.grey, detail: `NOTHING WORN ON YOUR ${SLOT_NAMES[sl]} YET.` };
        const tags = def.tags.map((t) => TAGS[t].name).join(' ');
        return {
          icon: `item_${def.id}`,
          name: def.name,
          sub: `${RARITY[def.rarity].name} LV${o!.lvl}`,
          color: RARITY[def.rarity].color,
          detail: `${def.name} (${SLOT_NAMES[sl]}, LEVEL ${o!.lvl}/3): ${def.desc}${tags ? `  TAGS: ${tags}` : ''}`,
        };
      });
    }
    if (this.tab === 'skills') {
      return r.skills.map((o) => {
        const def = skills.get(o.id)!;
        return {
          icon: `skill_${def.id}`,
          name: def.name,
          sub: o.lvl >= def.max ? `LV${o.lvl} MAX` : `LV${o.lvl}/${def.max}`,
          color: o.lvl >= def.max ? COL.yellow : COL.white,
          detail: `${def.name}: ${def.desc(o.lvl, skillCtx(r))}. COSTS ${def.cost} AP${def.cooldown ? `, WAIT ${def.cooldown} TURNS` : ''}.${scaleNote(def)}`,
        };
      });
    }
    if (this.tab === 'sets') {
      const out: Row[] = [];
      for (const [id, n] of Object.entries(setCounts(r))) {
        const set = sets.get(id);
        if (!set) continue;
        const steps = set.bonuses.map((b) => `${b.n}: ${b.desc}${n >= b.n ? '' : ' (OFF)'}`).join('. ');
        out.push({ icon: '', name: set.name, sub: `${n}/${set.pieces.length}`, color: set.color, detail: `${set.name}${set.risky ? ' (RISKY)' : ''}. ${steps}.` });
      }
      for (const [k, n] of Object.entries(tagCounts(r))) {
        if (n < 2) continue;
        const t = TAGS[k];
        out.push({ icon: '', name: `${t.name} TAG`, sub: `${n}/4`, color: t.color, detail: `${t.name} ITEMS. 2: ${t.two}. 4: ${t.four}${n >= 4 ? '' : ' (OFF)'}.` });
      }
      if (!out.length) return [{ icon: '', name: 'NO SETS YET', sub: '', color: COL.grey, detail: 'WEAR 2 PIECES OF A SET (OR 2 ITEMS WITH THE SAME TAG) FOR A BONUS. MORE PIECES, MORE BONUS. WEARING ONE PIECE MAKES THE REST TURN UP MORE OFTEN.' }];
      return out;
    }
    if (this.tab === 'words')
      return [
        ...WORDS.map(([k, d, color]) => ({ icon: `st_${k}`, name: STATUS_WORD[k], sub: '', color, detail: `${STATUS_WORD[k]}: ${d}` })),
        ...TERMS.map(([k, d, color]) => ({ icon: '', name: k, sub: '', color, detail: `${k}: ${d}` })),
      ];
    const owned = Object.entries(r.passives).filter(([id, n]) => n > 0 && passives.has(id));
    if (!owned.length) return [{ icon: '', name: 'NO PASSIVES YET', sub: '', color: COL.grey, detail: 'PASSIVES SHOW UP AT LEVEL-UP ONCE YOUR SKILLS RUN OUT OF UPGRADES. THEY STACK FOREVER.' }];
    return owned.map(([id, n]) => {
      const p = passives.get(id)!;
      return { icon: `passive_${id}`, name: p.name, sub: `X${n}`, color: p.color, detail: `${p.name} X${n}: ${p.desc(n)}. EACH STACK: ${p.each}.` };
    });
  }

  private show(tab: Tab) {
    this.tab = tab;
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
    for (const [t, b] of Object.entries(this.tabs)) b.setColors(t === tab ? BTN.gold.fill : BTN.blue.fill, 0x1a1c2c, t === tab ? BTN.gold.light : BTN.blue.light);
    const rows = this.rows();
    const top = 46;
    const detailH = 44;
    const listH = H - 28 - top - detailH - 4;
    const cols = rows.length > 6 ? 2 : 1;
    const perCol = Math.ceil(rows.length / cols);
    const rh = Math.max(14, Math.min(20, Math.floor(listH / Math.max(1, perCol))));
    const cw = Math.min(cols === 2 ? 210 : 300, Math.floor((W - 16 - (cols - 1) * 6) / cols));
    const g = this.add.graphics();
    panel(g, W / 2 - Math.min(W - 12, 420) / 2, H - 28 - detailH, Math.min(W - 12, 420), detailH, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    const detail = text(this, W / 2, H - 28 - detailH / 2, 'TAP SOMETHING TO READ IT', { color: COL.light, maxWidth: Math.min(W - 24, 408), maxLines: 4 });
    this.layer.push(g, detail);
    rows.forEach((row, i) => {
      const col = Math.floor(i / perCol);
      const x = W / 2 + (col - (cols - 1) / 2) * (cw + 6);
      const y = top + (i % perCol) * rh + rh / 2;
      const b = button(this, x, y, cw, rh - 2, '', () => {
        detail.setText(wrapPx(row.detail, Math.min(W - 24, 408)).slice(0, 4).join('\n'));
        detail.setTint(COL.white);
      }, { depth: 5 });
      b.label.destroy();
      if (row.icon && this.textures.exists(row.icon)) {
        const img = this.add.image(-cw / 2 + 10, 0, row.icon);
        img.setScale(Math.min(1, (rh - 4) / Math.max(img.width, img.height)));
        b.c.add(img);
      }
      b.c.add(text(this, -cw / 2 + 20, 0, row.name, { origin: 0, color: row.color, maxWidth: cw - 70, maxLines: 1 }));
      if (row.sub) b.c.add(text(this, cw / 2 - 5, 0, row.sub, { origin: 1, color: COL.ice }));
      this.layer.push(b.c);
    });
  }

  private back() {
    sfx.select();
    this.scene.stop();
    this.scene.resume(this.from);
  }
}
