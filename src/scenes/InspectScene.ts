import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, panel, wrapPx, BTN, Button } from '../ui';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import { items, skills, RARITY, SLOT_NAMES, TAGS } from '../content/registry';
import { passives } from '../content/passives';
import type { Slot } from '../content/types';
import type { RunState } from '../game/run';

type Tab = 'gear' | 'skills' | 'passives';

interface Row {
  icon: string;
  name: string;
  sub: string;
  color: number;
  detail: string;
  detailColor?: number;
}

const SLOTS: Slot[] = ['head', 'face', 'body', 'back', 'paw', 'tail', 'aura'];

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
    const tw = Math.min(110, Math.floor((W - 24) / 3));
    (['gear', 'skills', 'passives'] as Tab[]).forEach((t, i) => {
      this.tabs[t] = button(this, W / 2 + (i - 1) * (tw + 4), 32, tw, 18, t.toUpperCase(), () => this.show(t), { depth: 5 });
    });
    button(this, W / 2, H - 14, 120, 20, 'BACK', () => this.back(), { ...BTN.green, depth: 5 });
    this.input.keyboard!.on('keydown-ESC', () => this.back());
    this.show(this.tab);
  }

  private rows(): Row[] {
    const r = this.run;
    if (this.tab === 'gear') {
      return SLOTS.map((sl) => {
        const o = r.gear[sl];
        const def = o && items.get(o.id);
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
          detail: `${def.name}: ${def.desc(o.lvl)}. COSTS ${def.cost} AP${def.cooldown ? `, WAIT ${def.cooldown} TURNS` : ''}.`,
        };
      });
    }
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
