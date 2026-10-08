import Phaser from 'phaser';
import { W, H } from '../config';
import { Overlay, OverlayData, TITLE_BAND } from './Overlay';
import { text, button, BTN, LINE_H, wrapPx, Button } from '../ui';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import { events, items, skills, RARITY } from '../content/registry';
import type { EventDef, ItemDef, RunAPI, StatKey } from '../content/types';
import { addBlessing, danger, equip, itemPrice, maxHp, randomItem, gainXp, learnSkill, skillChoices, SKILL_SLOTS, RunState } from '../game/run';
import { itemCard } from '../game/views';
import { mapTexture, ensureEnemy, enemyKey } from '../gfx/textures';

const CARD_H = 112;

function cardWidth(n: number, max = 130) {
  return Math.min(max, Math.floor((W - 16 - (n - 1) * 6) / Math.max(n, 2)));
}

// ---------------------------------------------------------------- item reward

interface RewardData extends OverlayData {
  title: string;
  min?: number;
  fixed?: string[];
}

export class RewardScene extends Overlay<RewardData> {
  constructor() {
    super('Reward');
  }

  create() {
    this.backdrop();
    const r = this.d.run;
    this.title(this.d.title, COL.yellow, 'TAKE ONE. IT SHOWS UP ON YOUR RACCOON.');
    let choices: ItemDef[] = [];
    if (this.d.fixed) choices = this.d.fixed.map((id) => items.get(id)!).filter(Boolean);
    else {
      for (let i = 0; i < 3; i++) {
        const it = randomItem(r, this.d.min ?? 0, 4, choices.map((c) => c.id));
        if (it) choices.push(it);
      }
    }
    const n = choices.length;
    const cw = cardWidth(n);
    const cy = TITLE_BAND + 12 + CARD_H / 2;
    choices.forEach((it, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + 6);
      const card = itemCard(this, x, cy, cw, CARD_H, it, r);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => {
        const res = equip(r, it);
        sfx.upgrade();
        this.flashText(res === 'level' ? `${it.name} LEVELED UP!` : `EQUIPPED ${it.name}`);
        this.time.delayedCall(450, () => this.close());
      });
      card.setAlpha(0).setScale(0.85);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, delay: i * 80, duration: 200, ease: 'Back.out' });
    });
    button(this, W / 2, H - 16, 90, 20, 'SKIP', () => this.close(), { depth: 5 });
  }

  private flashText(s: string) {
    const t = text(this, W / 2, H / 2, s, { scale: 2, color: COL.yellow, maxWidth: W - 16, maxLines: 1 }).setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 10, duration: 400 });
  }
}

// ---------------------------------------------------------------- fork in the road

const STOPS = {
  shop: { label: 'SHOP', desc: 'SPEND SHINIES', weight: 3, icon: 'coin' },
  event: { label: '???', desc: 'SOMETHING HAPPENS', weight: 4, icon: 'in_debuff' },
  camp: { label: 'CAMP', desc: 'REST OR TRAIN', weight: 2, icon: 'pizza' },
  chest: { label: 'TREASURE', desc: 'A FREE ITEM', weight: 1, icon: 'chest' },
} as const;
type StopKind = keyof typeof STOPS;

export class ForkScene extends Overlay<OverlayData> {
  constructor() {
    super('Fork');
  }

  create() {
    this.backdrop(0.5);
    this.title('A FORK IN THE ROAD', COL.white, 'WHICH WAY?');
    const kinds = Object.keys(STOPS) as StopKind[];
    const picks: StopKind[] = [];
    while (picks.length < 2) {
      const total = kinds.filter((k) => !picks.includes(k)).reduce((a, k) => a + STOPS[k].weight, 0);
      let x = Math.random() * total;
      for (const k of kinds) {
        if (picks.includes(k)) continue;
        x -= STOPS[k].weight;
        if (x <= 0) {
          picks.push(k);
          break;
        }
      }
    }
    picks.forEach((k, i) => {
      const x = W / 2 + (i === 0 ? -1 : 1) * Math.min(90, W * 0.22);
      const y = 140;
      const c = this.add.container(x, y);
      c.add(this.add.image(0, 0, 'sign').setScale(4).setOrigin(0.5, 1));
      c.add(text(this, 0, -60, STOPS[k].label, { scale: 2, color: COL.white }));
      c.add(this.add.image(0, -40, STOPS[k].icon).setScale(2));
      c.add(text(this, 0, 10, STOPS[k].desc, { color: COL.yellow }));
      c.setSize(100, 90).setInteractive(new Phaser.Geom.Rectangle(-50, -76, 100, 92), Phaser.Geom.Rectangle.Contains);
      c.on('pointerup', () => this.go(k));
      this.tweens.add({ targets: c, y: y - 3, yoyo: true, repeat: -1, duration: 700 + i * 90, ease: 'Sine.inOut' });
      this.input.keyboard!.once(i === 0 ? 'keydown-LEFT' : 'keydown-RIGHT', () => this.go(k));
    });
  }

  private go(k: StopKind) {
    sfx.select();
    if (k === 'shop') this.close({ key: 'Shop', data: {} });
    else if (k === 'event') this.close({ key: 'Event', data: {} });
    else if (k === 'camp') this.close({ key: 'Camp', data: {} });
    else this.close({ key: 'Reward', data: { title: 'TREASURE!', min: 1 } });
  }
}

// ---------------------------------------------------------------- shop

export class ShopScene extends Overlay<OverlayData> {
  private stock: (ItemDef | null)[] = [];
  private rerolls = 0;
  private healed = 0;
  private layer: Phaser.GameObjects.GameObject[] = [];
  private cash!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Shop');
  }

  create() {
    this.backdrop(0.88);
    this.rerolls = 0;
    this.healed = 0;
    this.title('POSSUM PAWN SHOP', COL.yellow);
    this.cash = text(this, W - 8, 11, '', { origin: 1, color: COL.yellow });
    this.roll();
  }

  private roll() {
    const r = this.d.run;
    this.stock = [];
    for (let i = 0; i < 3; i++) this.stock.push(randomItem(r, 0, 4, this.stock.filter(Boolean).map((s) => s!.id)));
    this.draw();
  }

  private draw() {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
    const r = this.d.run;
    this.cash.setText(`${r.shinies} SHINIES`);
    const n = this.stock.length;
    const cw = cardWidth(n, 124);
    const cy = TITLE_BAND + 16 + CARD_H / 2;
    this.layer.push(text(this, 8, 11, `HP ${r.hp}/${maxHp(r)}`, { origin: 0, color: COL.pink }));
    this.stock.forEach((it, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + 6);
      if (!it) {
        this.layer.push(text(this, x, cy, 'SOLD', { scale: 2, color: COL.grey }));
        return;
      }
      const price = itemPrice(r, it);
      const afford = r.shinies >= price;
      const card = itemCard(this, x, cy, cw, CARD_H, it, r, `BUY FOR ${price}`);
      if (!afford) card.setAlpha(0.55);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.buy(i, price));
      this.layer.push(card);
    });
    // Healing gets pricier each time in the same shop and with depth: HP is the scarce resource.
    const healPrice = Math.round((8 + r.stage * 0.8) * (1 + this.healed * 0.6));
    const by = H - 16;
    const bw = Math.min(110, (W - 24) / 3);
    const heal = button(this, W / 2 - bw - 4, by, bw, 20, `HEAL 30% - ${healPrice}`, () => {
      if (r.shinies < healPrice || r.hp >= maxHp(r)) return;
      r.shinies -= healPrice;
      this.healed++;
      r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.3));
      sfx.heal();
      this.draw();
    }, { ...BTN.green, depth: 5 });
    heal.setEnabled(r.shinies >= healPrice && r.hp < maxHp(r));
    const rerollPrice = 5 + this.rerolls * 4;
    const reroll = button(this, W / 2, by, bw, 20, `RESTOCK - ${rerollPrice}`, () => {
      if (r.shinies < rerollPrice) return;
      r.shinies -= rerollPrice;
      this.rerolls++;
      sfx.pickup();
      this.roll();
    }, { depth: 5 });
    reroll.setEnabled(r.shinies >= rerollPrice);
    const leave = button(this, W / 2 + bw + 4, by, bw, 20, 'LEAVE', () => this.close(), { ...BTN.red, depth: 5 });
    this.layer.push(heal.c, reroll.c, leave.c);
  }

  private buy(i: number, price: number) {
    const r = this.d.run;
    const it = this.stock[i];
    if (!it || r.shinies < price) {
      this.cameras.main.shake(80, 0.004);
      return;
    }
    r.shinies -= price;
    equip(r, it);
    sfx.pickup();
    sfx.upgrade();
    this.stock[i] = null;
    this.draw();
  }
}

// ---------------------------------------------------------------- camp

export class CampScene extends Overlay<OverlayData> {
  constructor() {
    super('Camp');
  }

  create() {
    this.backdrop();
    const r = this.d.run;
    this.title('COZY CARDBOARD BOX', COL.yellow, `HP ${r.hp}/${maxHp(r)}`, COL.pink);
    this.add.image(W / 2, 64, 'can').setScale(3);
    const nap = Math.round(maxHp(r) * 0.25);
    const forage = 8 + Math.round(danger(r) * 1.5);
    const bw = Math.min(W - 40, 240);
    const opts: [string, string, () => void, object][] = [
      [`NAP`, `HEAL ${nap} HP`, () => {
        r.hp = Math.min(maxHp(r), r.hp + nap);
        sfx.heal();
        this.close();
      }, BTN.green],
      ['TRAIN', '+1 STAT POINT', () => {
        r.statPoints += 1;
        sfx.upgrade();
        this.close({ key: 'LevelUp', data: { statsOnly: true } });
      }, BTN.blue],
      ['FORAGE', `+${forage} SHINIES`, () => {
        r.shinies += forage;
        r.shiniesEarned += forage;
        sfx.pickup();
        this.close();
      }, BTN.gold],
    ];
    opts.forEach(([label, detail, fn, col], i) => {
      const b = button(this, W / 2, 104 + i * 32, bw, 26, '', fn, { ...(col as object), depth: 5 });
      b.c.add(text(this, -bw / 2 + 10, 0, label, { origin: 0, color: COL.white }));
      b.c.add(text(this, bw / 2 - 10, 0, detail, { origin: 1, color: COL.yellow }));
    });
  }
}

// ---------------------------------------------------------------- events

function pickEvent(r: RunState): EventDef {
  const d = danger(r);
  const pool = events.filter((e) => (!e.minDanger || d >= e.minDanger) && (!e.themes || e.themes.includes(r.theme)));
  // Theme-specific events are rarer overall, so give them a nudge when they fit.
  const w = (e: EventDef) => (e.weight ?? 1) * (e.themes ? 2 : 1);
  const total = pool.reduce((a, e) => a + w(e), 0);
  let x = Math.random() * total;
  for (const e of pool) {
    x -= w(e);
    if (x <= 0) return e;
  }
  return pool[0];
}

export class EventScene extends Overlay<OverlayData> {
  constructor() {
    super('Event');
  }

  create() {
    this.backdrop(0.88);
    const r = this.d.run;
    const ev = pickEvent(r);
    const bw = Math.min(W - 16, 340);
    const x0 = W / 2 - bw / 2;
    this.box(x0, 4, bw, H - 8);
    const tScale = wrapPx(ev.title, bw - 16).length === 1 && wrapPx(ev.title, (bw - 16) / 2).length === 1 ? 2 : 1;
    text(this, W / 2, 16, ev.title, { scale: tScale, color: COL.yellow, maxWidth: bw - 16, maxLines: 1 });
    let y = 28;
    const art = this.art(ev);
    if (art) {
      const img = this.add.image(W / 2, y, art).setOrigin(0.5, 0);
      const s = img.height <= 16 && img.width <= 40 ? 2 : 1;
      img.setScale(s);
      y += img.height * s + 4;
    }
    const api = this.api(r);
    const n = ev.options.length;
    const optH = 24;
    const optTop = H - 10 - n * (optH + 3);
    // The story text gets whatever room is left above the options, never overlapping them.
    const maxLines = Math.max(1, Math.floor((optTop - y - 4) / LINE_H));
    const body = text(this, W / 2, y, ev.text.join(' '), { originY: 0, color: COL.white, maxWidth: bw - 16, maxLines });
    const buttons: Button[] = [];
    ev.options.forEach((o, i) => {
      const by = optTop + i * (optH + 3) + optH / 2;
      const ok = !o.can || o.can(api);
      const b = button(this, W / 2, by, bw - 16, optH, '', () => {
        if (!ok) return;
        buttons.forEach((x) => x.c.destroy());
        body.destroy();
        const res = o.run(api);
        sfx.upgrade();
        text(this, W / 2, y + 4, res, { originY: 0, color: COL.lime, maxWidth: bw - 16, maxLines: Math.floor((H - 40 - y) / LINE_H) });
        button(this, W / 2, H - 22, 120, 22, 'CONTINUE', () => {
          if (r.hp <= 0) r.hp = 1;
          this.close();
        }, { ...BTN.green, depth: 5 });
      }, { depth: 5 });
      b.c.add(text(this, 0, -5, o.label, { color: COL.white, maxWidth: bw - 28, maxLines: 1 }));
      b.c.add(text(this, 0, 5, o.detail, { color: ok ? COL.yellow : COL.grey, maxWidth: bw - 28, maxLines: 1 }));
      b.setEnabled(ok);
      buttons.push(b);
    });
  }

  private art(ev: EventDef): string | null {
    if (ev.artRows) {
      const key = `ev_${ev.id}`;
      mapTexture(this, key, ev.artRows);
      return key;
    }
    if (!ev.art) return null;
    if (this.textures.exists(ev.art)) return ev.art;
    const id = ev.art.replace(/_\d+$/, '');
    ensureEnemy(this, id);
    const key = enemyKey(id, 0);
    return this.textures.exists(key) ? key : null;
  }

  private api(r: RunState): RunAPI {
    return {
      get hp() {
        return r.hp;
      },
      get maxHp() {
        return maxHp(r);
      },
      get shinies() {
        return r.shinies;
      },
      get danger() {
        return danger(r);
      },
      get stage() {
        return r.stage;
      },
      get theme() {
        return r.theme;
      },
      get itemCount() {
        return Object.values(r.gear).filter(Boolean).length;
      },
      addCaps: (n) => (r.bonusCaps += Math.round(n)),
      addBlessing: (id, fights) => addBlessing(r, id, fights),
      learnRandomSkill: () => {
        const owned = new Set(r.skills.map((s) => s.id));
        const pick = skillChoices(r, 6).find((s) => !owned.has(s.id) && r.skills.length < SKILL_SLOTS) ?? skillChoices(r, 1)[0];
        if (!pick) return '';
        learnSkill(r, pick.id);
        return pick.name;
      },
      upgradeRandomSkill: () => {
        const up = r.skills.filter((s) => s.lvl < (skills.get(s.id)?.max ?? 1));
        if (!up.length) return '';
        const o = up[Math.floor(Math.random() * up.length)];
        o.lvl++;
        return skills.get(o.id)!.name;
      },
      giveItem: (id) => {
        const it = items.get(id);
        if (!it) return '';
        equip(r, it);
        return it.name;
      },
      addShinies: (n) => {
        r.shinies = Math.max(0, r.shinies + Math.round(n));
        if (n > 0) r.shiniesEarned += Math.round(n);
      },
      hurt: (n) => (r.hp = Math.max(1, r.hp - Math.round(n))),
      heal: (n) => (r.hp = Math.min(maxHp(r), r.hp + Math.round(n))),
      addStat: (k: StatKey, n: number) => {
        r.stats[k] = Math.max(0, r.stats[k] + n);
        r.hp = Math.min(r.hp, maxHp(r));
      },
      giveRandomItem: (min, max) => {
        const it = randomItem(r, min, max ?? 4);
        if (!it) return 'NOTHING';
        equip(r, it);
        return `${RARITY[it.rarity].name} ${it.name}`;
      },
      removeRandomItem: () => {
        const slots = Object.keys(r.gear).filter((k) => r.gear[k as keyof typeof r.gear]);
        if (!slots.length) return null;
        const k = slots[Math.floor(Math.random() * slots.length)] as keyof typeof r.gear;
        const name = items.get(r.gear[k]!.id)?.name ?? '';
        delete r.gear[k];
        r.hp = Math.min(r.hp, maxHp(r));
        return name;
      },
      addXp: (n) => {
        r.pendingLevelUps += gainXp(r, n);
      },
      addDistance: (m) => (r.distance += m),
      addHeat: (n) => (r.heat += n),
      eliteNext: () => (r.eliteNext = true),
    };
  }
}
