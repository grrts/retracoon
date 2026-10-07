import Phaser from 'phaser';
import { W, H } from '../config';
import { Overlay, OverlayData } from './Overlay';
import { text, button } from '../ui';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import { events, items, RARITY } from '../content/registry';
import type { EventDef, ItemDef, RunAPI, StatKey } from '../content/types';
import { danger, equip, itemPrice, maxHp, randomItem, gainXp, RunState } from '../game/run';
import { itemCard, wrap } from '../game/views';

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
    this.title(this.d.title, COL.yellow);
    text(this, W / 2, 26, 'TAKE ONE. IT SHOWS UP ON YOUR RACCOON.', { color: COL.light });
    let choices: ItemDef[] = [];
    if (this.d.fixed) choices = this.d.fixed.map((id) => items.get(id)!).filter(Boolean);
    else {
      for (let i = 0; i < 3; i++) {
        const it = randomItem(r, this.d.min ?? 0, 4, choices.map((c) => c.id));
        if (it) choices.push(it);
      }
    }
    const n = choices.length;
    const cw = Math.min(118, Math.floor((W - 12 - (n - 1) * 5) / Math.max(n, 2)));
    const ch = 92;
    choices.forEach((it, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + 5);
      const card = itemCard(this, x, 36 + ch / 2, cw, ch, it, r);
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
    button(this, W / 2, H - 12, 80, 14, 'SKIP', () => this.close(), { depth: 5 });
  }

  private flashText(s: string) {
    const t = text(this, W / 2, H / 2, s, { scale: 2, color: COL.yellow }).setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 10, duration: 400 });
  }
}

// ---------------------------------------------------------------- fork in the road

const STOPS = {
  shop: { label: 'SHOP', desc: 'SPEND SHINIES', weight: 3 },
  event: { label: '???', desc: 'SOMETHING HAPPENS', weight: 3 },
  camp: { label: 'CAMP', desc: 'REST OR TRAIN', weight: 2 },
  chest: { label: 'TREASURE', desc: 'A FREE ITEM', weight: 1 },
} as const;
type StopKind = keyof typeof STOPS;

export class ForkScene extends Overlay<OverlayData> {
  constructor() {
    super('Fork');
  }

  create() {
    this.backdrop(0.5);
    this.title('A FORK IN THE ROAD', COL.white);
    text(this, W / 2, 26, 'WHICH WAY?', { color: COL.light });
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
      const x = W / 2 + (i === 0 ? -1 : 1) * Math.min(70, W * 0.22);
      const c = this.add.container(x, 112);
      const sign = this.add.image(0, 0, 'sign').setScale(4).setOrigin(0.5, 1);
      c.add(sign);
      c.add(text(this, 0, -32, STOPS[k].label, { color: COL.white }));
      c.add(text(this, 0, 10, STOPS[k].desc, { color: COL.yellow }));
      const icon = k === 'shop' ? 'coin' : k === 'event' ? 'in_debuff' : k === 'camp' ? 'pizza' : 'chest';
      c.add(this.add.image(0, -22, icon));
      c.setSize(56, 60).setInteractive(new Phaser.Geom.Rectangle(-28, -42, 56, 60), Phaser.Geom.Rectangle.Contains);
      c.on('pointerup', () => this.go(k));
      this.tweens.add({ targets: c, y: 110, yoyo: true, repeat: -1, duration: 700 + i * 90, ease: 'Sine.inOut' });
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
  private layer: Phaser.GameObjects.GameObject[] = [];
  private cash!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Shop');
  }

  create() {
    this.backdrop(0.85);
    this.rerolls = 0;
    this.title('POSSUM PAWN SHOP', COL.yellow);
    this.add.image(18, 18, 'possum_0').setScale(2);
    this.cash = text(this, W - 8, 9, '', { origin: 1, color: COL.yellow });
    this.add.image(W - 8 - 40, 9, 'coin');
    this.roll();
    button(this, W / 2 + 70, H - 12, 64, 14, 'LEAVE', () => this.close(), { depth: 5 });
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
    this.cash.setText(`${r.shinies}`);
    const n = this.stock.length;
    const cw = Math.min(104, Math.floor((W - 12 - (n - 1) * 5) / n));
    const ch = 96;
    this.stock.forEach((it, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + 5);
      if (!it) {
        this.layer.push(text(this, x, 30 + ch / 2, 'SOLD', { scale: 2, color: COL.grey }));
        return;
      }
      const price = itemPrice(r, it);
      const card = itemCard(this, x, 30 + ch / 2, cw, ch, it, r);
      const afford = r.shinies >= price;
      const pt = text(this, cw / 2 - 5, -ch / 2 + 26, `${price}`, { origin: 1, color: afford ? COL.yellow : COL.red });
      card.add(pt);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.buy(i, price));
      if (!afford) card.setAlpha(0.6);
      this.layer.push(card);
    });
    // services
    const healPrice = Math.round(10 * (1 + r.area * 0.3));
    const heal = button(this, W / 2 - 70, H - 12, 70, 14, `HEAL ${healPrice}`, () => {
      if (r.shinies < healPrice || r.hp >= maxHp(r)) return;
      r.shinies -= healPrice;
      r.hp = Math.min(maxHp(r), r.hp + Math.round(maxHp(r) * 0.4));
      sfx.heal();
      this.draw();
    }, { depth: 5 });
    heal.setEnabled(r.shinies >= healPrice && r.hp < maxHp(r));
    const rerollPrice = 4 + this.rerolls * 3;
    const reroll = button(this, W / 2, H - 12, 66, 14, `NEW STOCK ${rerollPrice}`, () => {
      if (r.shinies < rerollPrice) return;
      r.shinies -= rerollPrice;
      this.rerolls++;
      sfx.pickup();
      this.roll();
    }, { depth: 5 });
    reroll.setEnabled(r.shinies >= rerollPrice);
    this.layer.push(heal.c, reroll.c);
    this.layer.push(text(this, W / 2, 28, `HP ${r.hp}/${maxHp(r)}`, { color: COL.pink }));
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
    this.title('COZY CARDBOARD BOX', COL.yellow);
    text(this, W / 2, 28, `HP ${r.hp}/${maxHp(r)}`, { color: COL.pink });
    this.add.image(W / 2, 62, 'can').setScale(3);
    const nap = Math.round(maxHp(r) * 0.4);
    button(this, W / 2, 100, 190, 18, `NAP: HEAL ${nap}`, () => {
      r.hp = Math.min(maxHp(r), r.hp + nap);
      sfx.heal();
      this.close();
    }, { fill: 0x257179, light: 0x38b764, depth: 5 });
    button(this, W / 2, 124, 190, 18, 'TRAIN: +1 STAT POINT', () => {
      r.statPoints += 1;
      sfx.upgrade();
      this.close({ key: 'LevelUp', data: { statsOnly: true } });
    }, { depth: 5 });
    button(this, W / 2, 148, 190, 18, 'FORAGE: +12 SHINIES', () => {
      r.shinies += 12;
      r.shiniesEarned += 12;
      sfx.pickup();
      this.close();
    }, { depth: 5 });
  }
}

// ---------------------------------------------------------------- events

export class EventScene extends Overlay<OverlayData> {
  constructor() {
    super('Event');
  }

  create() {
    this.backdrop(0.85);
    const r = this.d.run;
    const d = danger(r);
    const pool = events.filter((e) => !e.minDanger || d >= e.minDanger);
    const ev: EventDef = pool[Math.floor(Math.random() * pool.length)];
    const bw = Math.min(W - 16, 300);
    this.box(W / 2 - bw / 2, 6, bw, H - 12);
    text(this, W / 2, 16, ev.title, { scale: 2, color: COL.yellow });
    if (ev.art) this.add.image(W / 2, 40, this.textures.exists(ev.art) ? ev.art : `${ev.art}_0`).setScale(2);
    const ty = ev.art ? 56 : 34;
    ev.text.forEach((ln, i) => text(this, W / 2, ty + i * 9, ln, { color: COL.white }));
    const api = this.api(r);
    const optY = ty + ev.text.length * 9 + 10;
    const buttons: ReturnType<typeof button>[] = [];
    ev.options.forEach((o, i) => {
      const y = optY + i * 24;
      const ok = !o.can || o.can(api);
      const b = button(this, W / 2, y, bw - 20, 20, '', () => {
        if (!ok) return;
        buttons.forEach((x) => x.c.destroy());
        const res = o.run(api);
        sfx.upgrade();
        wrap(res, Math.floor(bw / 4) - 4).forEach((ln, j) => text(this, W / 2, optY + j * 9, ln, { color: COL.lime }));
        button(this, W / 2, H - 18, 100, 16, 'CONTINUE', () => {
          if (r.hp <= 0) r.hp = 1;
          this.close();
        }, { depth: 5 });
      }, { depth: 5 });
      b.label.setText(o.label).setY(-4);
      b.c.add(text(this, 0, 4, o.detail, { color: ok ? COL.yellow : COL.grey }));
      b.setEnabled(ok);
      buttons.push(b);
    });
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
      get itemCount() {
        return Object.values(r.gear).filter(Boolean).length;
      },
      addShinies: (n) => {
        r.shinies = Math.max(0, r.shinies + n);
        if (n > 0) r.shiniesEarned += n;
      },
      hurt: (n) => (r.hp = Math.max(1, r.hp - n)),
      heal: (n) => (r.hp = Math.min(maxHp(r), r.hp + n)),
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
