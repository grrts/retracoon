import Phaser from 'phaser';
import { W, H } from '../config';
import { Overlay, OverlayData, TITLE_BAND } from './Overlay';
import { text, button, panel, BTN, LINE_H, wrapPx, measure, fmt, Button, shake } from '../ui';
import { onAction } from '../input';
import { sfx } from '../audio';
import { buzz } from '../haptics';
import { COL } from '../gfx/palette';
import { items, SLOT_NAMES } from '../content/registry';
import type { EventDef, ItemDef } from '../content/types';
import { rules } from '../game/mutators';
import { itemPrice, maxHp, RunState } from '../game/run';
import { forageShinies, napHeal, restockPrice, shopHealPrice, type StopKind } from '../game/flow';
import { itemCard, RaccoonView } from '../game/views';
import { store } from '../save';
import { mapTexture, ensureEnemy, enemyKey } from '../gfx/textures';

const CARD_H = 112;

function cardWidth(n: number, max = 130) {
  return Math.min(max, Math.floor((W - 16 - (n - 1) * 6) / Math.max(n, 2)));
}

// ---------------------------------------------------------------- item reward

export class RewardScene extends Overlay {
  private picked = -1;
  private choices: ItemDef[] = [];
  private cards: Phaser.GameObjects.Container[] = [];
  private ring!: Phaser.GameObjects.Graphics;
  private note!: Phaser.GameObjects.BitmapText;
  private take!: Button;
  private preview!: RaccoonView;

  constructor() {
    super('Reward');
  }

  // Tap a card to see it on your raccoon and what it replaces, then TAKE it
  // (or tap the same card again). Keys: 1-3 pick, Enter takes.
  create() {
    this.backdrop();
    const r = this.d.run;
    this.picked = -1;
    this.cards = [];
    const step = this.step('Reward');
    this.title(step.title, COL.yellow, 'TAP AN ITEM TO TRY IT ON. IT SHOWS UP ON YOUR RACCOON.');
    const choices = step.choices;
    this.choices = choices;
    const n = choices.length;
    const cw = cardWidth(n);
    const cy = TITLE_BAND + 12 + CARD_H / 2;
    this.ring = this.add.graphics().setDepth(1);
    choices.forEach((it, i) => {
      const x = W / 2 + (i - (n - 1) / 2) * (cw + 6);
      const card = itemCard(this, x, cy, cw, CARD_H, it, r).setDepth(2);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerup', () => (this.picked === i ? this.confirm() : this.pick(i)));
      card.setAlpha(0).setScale(0.85);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, delay: i * 80, duration: 200, ease: 'Back.out' });
      this.cards.push(card);
    });
    // Bottom band: your raccoon wearing the picked item, what it replaces, TAKE and SKIP.
    const by = H - 16;
    this.add.image(42, H - 5, 'shadow').setScale(1.5);
    this.preview = new RaccoonView(this, 42, H - 5, r, store.skin).setScale(2);
    const tick = (_t: number, d: number) => this.preview.update(d / 1000);
    this.events.on('update', tick);
    this.events.once('shutdown', () => this.events.off('update', tick));
    this.note = text(this, W / 2 + 10, by - 22, 'PICK ONE', { color: COL.light, maxWidth: W - 170, maxLines: 1 });
    this.take = button(this, W / 2 + 10, by, Math.min(170, W - 190), 22, 'TAKE', () => this.confirm(), { ...BTN.green, depth: 5 });
    this.take.setEnabled(false);
    button(this, W - 34, by, 56, 20, 'SKIP', () => this.picked !== -2 && this.d.flow.skip() && this.close(), { depth: 5 });
    onAction(this, ['slot1', 'slot2', 'slot3'], (a) => {
      const i = Number(a.slice(4)) - 1;
      if (i < n) this.pick(i);
    });
    onAction(this, 'confirm', () => this.confirm());
    if (n === 1) this.pick(0);
    // Epic and legendary loot gets a buzz as the cards land.
    if (choices.some((it) => it.rarity >= 3)) this.time.delayedCall(200 + n * 80, () => buzz('loot'));
  }

  private pick(i: number) {
    const r = this.d.run;
    const it = this.choices[i];
    this.picked = i;
    sfx.select();
    const c = this.cards[i];
    const w = c.width + 6;
    const h = c.height + 6;
    this.ring.clear().lineStyle(2, 0xffcd75, 1).strokeRect(c.x - w / 2, c.y - h / 2, w, h);
    this.cards.forEach((k, j) => k.setAlpha(j === i ? 1 : 0.6));
    // Try it on: a copy of the run with this item equipped, drawn on the preview raccoon.
    const trial = { ...r, gear: { ...r.gear }, stats: { ...r.stats } } as RunState;
    const cur = trial.gear[it.slot];
    trial.gear[it.slot] = cur?.id === it.id ? { id: it.id, lvl: Math.min(3, cur.lvl + 1) } : { id: it.id, lvl: 1 };
    this.preview.setGear(trial);
    const old = cur && cur.id !== it.id ? items.get(cur.id) : undefined;
    this.note.setText(fmt(cur?.id === it.id ? `LEVELS UP YOUR ${it.name}` : old ? `REPLACES ${old.name}: ${old.desc}` : `NEW ${SLOT_NAMES[it.slot]} ITEM`));
    this.note.setTint(old ? COL.orange : COL.lime);
    if (measure(this.note.text) > W - 170) this.note.setText(wrapPx(this.note.text, W - 176)[0] + '..');
    this.take.setEnabled(true);
    this.take.setLabel(`TAKE ${it.name}`);
  }

  private confirm() {
    if (this.picked < 0 || !this.take.c.active) return;
    const r = this.d.run;
    const it = this.choices[this.picked];
    const lvlUp = r.gear[it.slot]?.id === it.id;
    if (!this.d.flow.take(this.picked)) return;
    this.picked = -2;
    sfx.upgrade();
    this.flashText(lvlUp ? `${it.name} LEVELED UP!` : `EQUIPPED ${it.name}`);
    this.time.delayedCall(450, () => this.close());
  }

  private flashText(s: string) {
    const t = text(this, W / 2, H / 2, s, { scale: 2, color: COL.yellow, maxWidth: W - 16, maxLines: 1 }).setDepth(20);
    this.tweens.add({ targets: t, y: t.y - 10, duration: 400 });
  }
}

// ---------------------------------------------------------------- fork in the road

const STOPS: Record<StopKind, { label: string; desc: string; icon: string }> = {
  shop: { label: 'SHOP', desc: 'SPEND SHINIES', icon: 'coin' },
  event: { label: '???', desc: 'SOMETHING HAPPENS', icon: 'in_debuff' },
  camp: { label: 'CAMP', desc: 'REST OR TRAIN', icon: 'pizza' },
  chest: { label: 'TREASURE', desc: 'A FREE ITEM', icon: 'chest' },
};

export class ForkScene extends Overlay<OverlayData> {
  constructor() {
    super('Fork');
  }

  // Same flow as item rewards: tap a card to pick a way, then GO (or tap it again).
  create() {
    this.backdrop(0.7);
    this.title('A FORK IN THE ROAD', COL.white, 'TAP A ROAD, THEN GO.');
    const picks = this.step('Fork').picks;
    let picked = -1;
    const cw = Math.min(150, Math.floor((W - 22) / 2));
    const ch = 112;
    const cy = TITLE_BAND + 12 + ch / 2;
    const ring = this.add.graphics().setDepth(1);
    const cards: Phaser.GameObjects.Container[] = [];
    const goBtn = button(this, W / 2, H - 16, Math.min(200, W - 40), 22, 'GO', () => picked >= 0 && this.go(picked), { ...BTN.green, depth: 5 });
    goBtn.setEnabled(false);
    const pick = (i: number) => {
      if (picked === i) return this.go(i);
      picked = i;
      sfx.select();
      const c = cards[i];
      ring.clear().lineStyle(2, 0xffcd75, 1).strokeRect(c.x - cw / 2 - 3, c.y - ch / 2 - 3, cw + 6, ch + 6);
      cards.forEach((k, j) => k.setAlpha(j === i ? 1 : 0.6));
      goBtn.setEnabled(true);
      goBtn.setLabel(`GO TO ${STOPS[picks[i]].label}`);
    };
    picks.forEach((k, i) => {
      const x = W / 2 + (i - 0.5) * (cw + 6);
      const c = this.add.container(x, cy).setDepth(2);
      const g = this.add.graphics();
      panel(g, -cw / 2, -ch / 2, cw, ch, 0x29366f, 0x73eff7, 0x3b5dc9);
      c.add(g);
      c.add(this.add.image(0, -ch / 2 + 32, STOPS[k].icon).setScale(3));
      c.add(text(this, 0, -ch / 2 + 66, STOPS[k].label, { scale: 2, color: COL.white }));
      c.add(text(this, 0, -ch / 2 + 92, STOPS[k].desc, { color: COL.yellow, maxWidth: cw - 10, maxLines: 2 }));
      c.setSize(cw, ch).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => pick(i));
      c.setAlpha(0).setScale(0.85);
      this.tweens.add({ targets: c, alpha: 1, scale: 1, delay: i * 80, duration: 200, ease: 'Back.out' });
      cards.push(c);
    });
    onAction(this, ['slot1', 'slot2'], (a) => pick(a === 'slot1' ? 0 : 1));
    onAction(this, 'confirm', () => picked >= 0 && this.go(picked));
  }

  private go(i: number) {
    if (!this.d.flow.road(i)) return;
    sfx.select();
    this.close();
  }
}

// ---------------------------------------------------------------- shop

export class ShopScene extends Overlay<OverlayData> {
  private sel = -1;
  private layer: Phaser.GameObjects.GameObject[] = [];
  private cash!: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Shop');
  }

  create() {
    this.backdrop(0.88);
    this.sel = -1;
    this.title('POSSUM PAWN SHOP', COL.yellow);
    this.cash = text(this, W - 8, 11, '', { origin: 1, color: COL.yellow });
    this.draw();
  }

  private draw() {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
    const r = this.d.run;
    const shop = this.step('Shop');
    this.cash.setText(`${r.shinies} SHINIES`);
    const n = shop.stock.length;
    const cw = cardWidth(n, 124);
    const cy = TITLE_BAND + 16 + CARD_H / 2;
    this.layer.push(text(this, 8, 11, `HP ${r.hp}/${maxHp(r)}`, { origin: 0, color: COL.pink }));
    shop.stock.forEach((it, i) => {
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
      // First tap picks the item, a second tap (or BUY) buys it, so nothing is bought by accident.
      card.on('pointerup', () => {
        if (this.sel === i) return this.buy(i, price);
        this.sel = i;
        sfx.select();
        this.draw();
      });
      if (this.sel === i) {
        const ring = this.add.graphics().lineStyle(2, 0xffcd75, 1).strokeRect(x - cw / 2 - 3, cy - CARD_H / 2 - 3, cw + 6, CARD_H + 6);
        const hint = text(this, W / 2, cy + CARD_H / 2 + 12, afford ? `TAP AGAIN TO BUY ${it.name} FOR ${price}` : `NOT ENOUGH SHINIES FOR ${it.name}`, {
          color: afford ? COL.lime : COL.red,
          maxWidth: W - 16,
          maxLines: 1,
        });
        this.layer.push(ring, hint);
      }
      this.layer.push(card);
    });
    // Healing gets pricier each time in the same shop and with depth: HP is the scarce resource.
    const healPrice = shopHealPrice(r, shop.healed);
    const by = H - 16;
    const bw = Math.min(110, (W - 24) / 3);
    const heal = button(this, W / 2 - bw - 4, by, bw, 20, `HEAL 30% - ${healPrice}`, () => {
      if (!this.d.flow.heal()) return;
      sfx.heal();
      this.draw();
    }, { ...BTN.green, depth: 5 });
    heal.setEnabled(r.shinies >= healPrice && r.hp < maxHp(r));
    const rerollPrice = restockPrice(shop.rerolls);
    const reroll = button(this, W / 2, by, bw, 20, `RESTOCK - ${rerollPrice}`, () => {
      if (!this.d.flow.restock()) return;
      this.sel = -1;
      sfx.pickup();
      this.draw();
    }, { depth: 5 });
    reroll.setEnabled(r.shinies >= rerollPrice);
    const leave = button(this, W / 2 + bw + 4, by, bw, 20, 'LEAVE', () => this.d.flow.skip() && this.close(), { ...BTN.red, depth: 5 });
    this.layer.push(heal.c, reroll.c, leave.c);
  }

  private buy(i: number, _price: number) {
    if (!this.d.flow.buy(i)) {
      shake(this, 80, 0.004);
      return;
    }
    sfx.pickup();
    sfx.upgrade();
    this.sel = -1;
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
    const nap = napHeal(r);
    const forage = forageShinies(r);
    const bw = Math.min(W - 40, 240);
    // NO NAPS week: the box is too cold to sleep in.
    const noNaps = rules(r).noNaps;
    const opts: [string, string, () => void, object][] = [
      [`NAP`, noNaps ? 'NO NAPS THIS WEEK' : `HEAL ${nap} HP`, () => {
        if (!this.d.flow.camp(0)) return;
        sfx.heal();
        this.close();
      }, BTN.green],
      ['TRAIN', '+1 STAT POINT', () => {
        if (!this.d.flow.camp(1)) return;
        sfx.upgrade();
        this.close();
      }, BTN.blue],
      ['FORAGE', `+${forage} SHINIES`, () => {
        if (!this.d.flow.camp(2)) return;
        sfx.pickup();
        this.close();
      }, BTN.gold],
    ];
    opts.forEach(([label, detail, fn, col], i) => {
      const b = button(this, W / 2, 104 + i * 32, bw, 26, '', fn, { ...(col as object), depth: 5 });
      if (noNaps && i === 0) {
        b.setEnabled(false);
        b.c.setAlpha(0.7);
      }
      b.c.add(text(this, -bw / 2 + 10, 0, label, { origin: 0, color: COL.white }));
      b.c.add(text(this, bw / 2 - 10, 0, detail, { origin: 1, color: COL.yellow }));
    });
  }
}

// ---------------------------------------------------------------- events

export class EventScene extends Overlay<OverlayData> {
  constructor() {
    super('Event');
  }

  create() {
    this.backdrop(0.88);
    const ev = this.step('Event').ev;
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
    const flow = this.d.flow;
    const n = ev.options.length;
    const optH = 24;
    const optTop = H - 10 - n * (optH + 3);
    // The story text gets whatever room is left above the options, never overlapping them.
    const maxLines = Math.max(1, Math.floor((optTop - y - 4) / LINE_H));
    const body = text(this, W / 2, y, ev.text.join(' '), { originY: 0, color: COL.white, maxWidth: bw - 16, maxLines });
    const buttons: Button[] = [];
    ev.options.forEach((o, i) => {
      const by = optTop + i * (optH + 3) + optH / 2;
      const ok = flow.canChoose(i);
      const b = button(this, W / 2, by, bw - 16, optH, '', () => {
        if (!ok) return;
        const res = flow.choose(i);
        if (res === false) return;
        buttons.forEach((x) => x.c.destroy());
        body.destroy();
        sfx.upgrade();
        text(this, W / 2, y + 4, res, { originY: 0, color: COL.lime, maxWidth: bw - 16, maxLines: Math.floor((H - 40 - y) / LINE_H) });
        button(this, W / 2, H - 22, 120, 22, 'CONTINUE', () => this.close(), { ...BTN.green, depth: 5 });
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
}
