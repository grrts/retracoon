// The skin shop: skins for Bottle Caps (earned by playing) or Gems (bought), a weekly
// sale that is the same for everyone, holiday skins sold only in their season, and the
// gem packs and No Ads purchase. In test mode (browser, or no store keys yet) every real
// money purchase asks for confirmation and says no money is charged.
import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, panel, BTN, Button } from '../ui';
import { sfx } from '../audio';
import { store } from '../save';
import { COL } from '../gfx/palette';
import { skins, seasons } from '../content/registry';
import type { SkinDef } from '../meta/types';
import { SKIN_RARITY, weeklySale, isAvailable, skinPrice, owns, buySkin, equipSkin } from '../meta/economy';
import { RaccoonView } from '../game/views';
import { coonKey, ensureCoon } from '../gfx/coonTex';
import { ANCHORS, COON_W, COON_H } from '../gfx/coon';
import { PRODUCTS } from '../platform/config';
import { buy, restore, priceLabel, testMode, storeAvailable } from '../platform/iap';
import { mustSignInFor } from '../platform/online';
import { wallet } from './MetaScenes';

type Tab = 'sale' | 'holiday' | 'fur' | 'outfit' | 'owned' | 'gems';
const ALL_TABS: { id: Tab; label: string }[] = [
  { id: 'sale', label: 'SALE' },
  { id: 'holiday', label: 'HOLIDAY' },
  { id: 'fur', label: 'FUR' },
  { id: 'outfit', label: 'OUTFITS' },
  { id: 'owned', label: 'MINE' },
  { id: 'gems', label: 'GEMS' },
];
// No gem shop on Steam: the game is paid there and skins cost caps.
const TABS = () => ALL_TABS.filter((t) => t.id !== 'gems' || storeAvailable());

const TOP = 22; // bottom of the header
const TAB_Y = 32;
const BODY = 44; // top of the content area
const LEFT_W = 132; // preview column
const TILE_W = 44;
const TILE_H = 38;

export class StoreScene extends Phaser.Scene {
  private tab: Tab = 'sale';
  private page = 0;
  private sel = 'classic';
  private back = 'Title';
  private layer: Phaser.GameObjects.GameObject[] = [];
  private tabBtns: Button[] = [];
  private wallet!: ReturnType<typeof wallet>;
  private preview!: RaccoonView;
  private previewParts: Phaser.GameObjects.GameObject[] = [];
  private busy = false;

  constructor() {
    super('Store');
  }

  init(data: { back?: string; tab?: Tab }) {
    this.back = data.back ?? 'Title';
    this.tab = data.tab ?? 'sale';
    this.page = 0;
    this.sel = store.skin;
    this.layer = [];
    this.tabBtns = [];
    this.previewParts = [];
    this.busy = false;
  }

  create() {
    this.add.rectangle(0, 0, W, H, 0x1a1c2c).setOrigin(0);
    this.add.rectangle(0, 0, W, TOP, 0x29366f).setOrigin(0);
    this.wallet = wallet(this, 6, 11);
    text(this, W / 2, 11, 'SKIN SHOP', { scale: 2, color: COL.yellow });
    button(this, W - 30, 11, 52, 16, 'BACK', () => this.leave(), BTN.red);
    const tw = Math.floor((W - 8) / TABS().length);
    TABS().forEach((t, i) => {
      const b = button(this, 4 + tw * i + tw / 2, TAB_Y, tw - 2, 16, t.label, () => {
        this.tab = t.id;
        this.page = 0;
        this.draw();
      });
      this.tabBtns.push(b);
    });
    // Preview column.
    const g = this.add.graphics();
    panel(g, 4, BODY, LEFT_W, H - BODY - 4, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    this.add.image(4 + LEFT_W / 2, BODY + 86, 'shadow').setScale(2);
    this.preview = new RaccoonView(this, 4 + LEFT_W / 2, BODY + 86, null, this.sel).setScale(2);
    this.preview.setGear(null, store.lastRunGear);
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    this.draw();
  }

  update(_t: number, d: number) {
    this.preview.update(d / 1000);
  }

  private leave() {
    sfx.select();
    this.scene.start(this.back);
  }

  private list(): SkinDef[] {
    const all = [...skins.values()];
    switch (this.tab) {
      case 'sale': {
        const s = weeklySale();
        return s.deals.map((d) => skins.get(d.id)!).filter(Boolean);
      }
      case 'holiday':
        // In-season first, then the rest (locked until their season comes around).
        return all.filter((s) => s.group === 'holiday').sort((a, b) => Number(isAvailable(b)) - Number(isAvailable(a)));
      case 'owned':
        return all.filter((s) => owns(s.id));
      default:
        return all.filter((s) => s.group === this.tab);
    }
  }

  private draw() {
    this.layer.forEach((o) => o.destroy());
    this.layer = [];
    this.tabBtns.forEach((b, i) => b.setColors(TABS()[i].id === this.tab ? 0x8f563b : 0x29366f, 0x1a1c2c, TABS()[i].id === this.tab ? 0xffcd75 : 0x3b5dc9));
    this.wallet.refresh();
    this.drawPreview();
    if (this.tab === 'gems') return this.drawGems();
    const x0 = LEFT_W + 10;
    const areaW = W - x0 - 4;
    let y0 = BODY;
    if (this.tab === 'sale') {
      const s = weeklySale();
      this.layer.push(text(this, x0, y0 + 5, `THIS WEEK'S DEALS. NEW ONES IN ${s.endsInDays} DAY${s.endsInDays === 1 ? '' : 'S'}`, { origin: 0, color: COL.lime, maxWidth: areaW, maxLines: 1 }));
      y0 += 12;
    }
    if (this.tab === 'holiday') {
      const on = seasons.filter((s) => skins.size && [...skins.values()].some((k) => k.season === s.id && isAvailable(k)));
      this.layer.push(text(this, x0, y0 + 5, on.length ? `${on.map((s) => s.name).join(', ')} SKINS ON SALE NOW` : 'HOLIDAY SKINS RETURN EVERY YEAR IN SEASON', { origin: 0, color: COL.lime, maxWidth: areaW, maxLines: 1 }));
      y0 += 12;
    }
    const cols = Math.max(1, Math.floor(areaW / TILE_W));
    const rows = Math.max(1, Math.floor((H - y0 - 22) / TILE_H));
    const per = cols * rows;
    const list = this.list();
    const pages = Math.max(1, Math.ceil(list.length / per));
    this.page = Math.min(this.page, pages - 1);
    const sale = weeklySale();
    list.slice(this.page * per, this.page * per + per).forEach((s, i) => {
      const x = x0 + (i % cols) * TILE_W + TILE_W / 2;
      const y = y0 + Math.floor(i / cols) * TILE_H + TILE_H / 2;
      this.tile(s, x, y, sale.deals.find((d) => d.id === s.id)?.off);
    });
    if (!list.length) this.layer.push(text(this, x0 + areaW / 2, y0 + 40, 'NOTHING HERE YET', { color: COL.grey }));
    const py = H - 13;
    const prev = button(this, x0 + 24, py, 44, 16, '<', () => {
      this.page = Math.max(0, this.page - 1);
      this.draw();
    });
    const next = button(this, W - 28, py, 44, 16, '>', () => {
      this.page = Math.min(pages - 1, this.page + 1);
      this.draw();
    });
    prev.setEnabled(this.page > 0);
    next.setEnabled(this.page < pages - 1);
    this.layer.push(prev.c, next.c, text(this, (x0 + 48 + W - 52) / 2, py, `${this.page + 1}/${pages}  (${list.length} SKINS)`, { color: COL.light }));
  }

  private tile(s: SkinDef, x: number, y: number, off?: number) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = SKIN_RARITY[s.rarity];
    const selected = s.id === this.sel;
    panel(g, -TILE_W / 2 + 1, -TILE_H / 2 + 1, TILE_W - 2, TILE_H - 2, selected ? 0x3b5dc9 : 0x29366f, selected ? 0xf4f4f4 : r.color);
    c.add(g);
    ensureCoon(this, s.id);
    const img = this.add.image(0, -1, coonKey(s.id, 'idle0'));
    if (!isAvailable(s) && !owns(s.id)) img.setTint(0x333c57);
    c.add(img);
    // Outfit pieces sit on the tile the same way they sit on the raccoon.
    s.outfit?.forEach((o, i) => {
      const a = ANCHORS[o.anchor];
      const k = `outfit_${s.id}_${i}`;
      if (this.textures.exists(k)) c.add(this.add.image(img.x - COON_W / 2 + a.x + o.x, img.y - COON_H / 2 + a.y + o.y, k).setOrigin(0));
    });
    if (owns(s.id)) c.add(text(this, TILE_W / 2 - 4, TILE_H / 2 - 6, store.skin === s.id ? 'ON' : 'OWN', { origin: 1, color: COL.lime }));
    else if (off) c.add(text(this, TILE_W / 2 - 4, -TILE_H / 2 + 6, `-${off}%`, { origin: 1, color: COL.yellow }));
    else if (!isAvailable(s)) c.add(this.add.image(TILE_W / 2 - 7, -TILE_H / 2 + 7, 'lock'));
    c.setSize(TILE_W, TILE_H).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => {
      sfx.select();
      this.sel = s.id;
      this.draw();
    });
    this.layer.push(c);
  }

  private drawPreview() {
    this.previewParts.forEach((o) => o.destroy());
    this.previewParts = [];
    const s = skins.get(this.sel) ?? skins.get('classic');
    if (!s) return;
    this.preview.setSkin(s.id);
    this.preview.setGear(null, store.lastRunGear);
    const cx = 4 + LEFT_W / 2;
    const r = SKIN_RARITY[s.rarity];
    const add = (o: Phaser.GameObjects.GameObject) => this.previewParts.push(o);
    add(text(this, cx, BODY + 10, s.name, { color: COL.white, maxWidth: LEFT_W - 8, maxLines: 1 }));
    add(text(this, cx, BODY + 20, `${r.name} ${s.group === 'outfit' ? 'OUTFIT' : s.group === 'holiday' ? 'HOLIDAY' : 'FUR'}`, { color: r.color }));
    const y = BODY + 98;
    if (owns(s.id)) {
      const on = store.skin === s.id;
      const b = button(this, cx, y + 12, LEFT_W - 16, 22, on ? 'EQUIPPED' : 'EQUIP', () => {
        equipSkin(s.id);
        sfx.upgrade();
        this.draw();
      }, BTN.green);
      b.setEnabled(!on);
      add(b.c);
      return;
    }
    if (!isAvailable(s)) {
      const season = seasons.find((x) => x.id === s.season);
      add(text(this, cx, y + 6, 'ONLY SOLD DURING', { color: COL.light }));
      add(text(this, cx, y + 17, season ? season.name : 'ITS SEASON', { color: COL.yellow, maxWidth: LEFT_W - 8, maxLines: 1 }));
      return;
    }
    const p = skinPrice(s);
    if (p.off) add(text(this, cx, y, `${p.off}% OFF THIS WEEK`, { color: COL.lime }));
    let by = y + 14;
    const opt = (currency: 'caps' | 'gems', cost: number, was?: number) => {
      const have = currency === 'caps' ? store.caps : store.gems;
      const b = button(this, cx + 6, by, LEFT_W - 28, 22, `${cost}${was ? ` (WAS ${was})` : ''}`, async () => {
        if (this.busy) return;
        if (currency === 'gems' && mustSignInFor()) return this.scene.start('SignIn', { then: 'Store' });
        this.busy = true;
        const res = await buySkin(s.id, currency);
        this.busy = false;
        if (!this.scene.isActive()) return;
        if (res !== 'ok') {
          if (res === 'offline') this.toast('GEMS NEED A CONNECTION');
          this.cameras.main.shake(80, 0.004);
          return;
        }
        sfx.upgrade();
        this.cameras.main.flash(150, 255, 205, 117);
        this.draw();
      }, currency === 'caps' ? BTN.gold : BTN.violet);
      b.setEnabled(have >= cost);
      add(b.c);
      add(this.add.image(cx - LEFT_W / 2 + 12, by, currency === 'caps' ? 'bottlecap' : 'gem'));
      by += 26;
    };
    if (p.caps) opt('caps', p.caps, p.was?.caps);
    if (p.gems) opt('gems', p.gems, p.was?.gems);
    if (!p.caps && !p.gems) add(text(this, cx, by, 'FREE', { color: COL.lime }));
  }

  private drawGems() {
    const x0 = LEFT_W + 10;
    const areaW = W - x0 - 4;
    const rowH = Math.min(30, Math.floor((H - BODY - 18) / PRODUCTS.length));
    const add = (o: Phaser.GameObjects.GameObject) => this.layer.push(o);
    add(text(this, x0, BODY + 5, testMode() ? 'TEST MODE: NO MONEY IS CHARGED' : 'PAYMENTS GO THROUGH YOUR APP STORE', { origin: 0, color: testMode() ? COL.orange : COL.light, maxWidth: areaW, maxLines: 1 }));
    PRODUCTS.forEach((p, i) => {
      const y = BODY + 14 + i * rowH + rowH / 2;
      const owned = p.noAds && store.noAds && !p.gems;
      const b = button(this, x0 + areaW / 2, y, areaW, rowH - 3, '', () => this.purchase(p.id, p.title, priceLabel(p)), p.noAds ? BTN.gold : BTN.violet);
      b.c.add(text(this, -areaW / 2 + 8, -4, p.title, { origin: 0, color: COL.white, maxWidth: areaW - 70, maxLines: 1 }));
      b.c.add(text(this, -areaW / 2 + 8, 5, p.desc, { origin: 0, color: COL.light, maxWidth: areaW - 70, maxLines: 1 }));
      b.c.add(text(this, areaW / 2 - 8, 0, owned ? 'OWNED' : priceLabel(p), { origin: 1, color: COL.yellow }));
      b.setEnabled(!owned);
      add(b.c);
    });
    // Restore sits in the preview column, which has nothing to preview on this tab.
    const rb = button(this, 4 + LEFT_W / 2, H - 22, LEFT_W - 16, 22, 'RESTORE PURCHASES', async () => {
      if (this.busy) return;
      this.busy = true;
      const ok = await restore();
      this.busy = false;
      this.toast(ok ? 'NO ADS RESTORED' : 'NOTHING TO RESTORE');
      this.draw();
    });
    add(rb.c);
  }

  private async purchase(id: string, title: string, price: string) {
    if (this.busy) return;
    // Purchases belong to an account (iPhone guests sign in here).
    if (mustSignInFor()) return this.scene.start('SignIn', { then: 'Store' });
    this.busy = true;
    const res = await buy(id, () => this.confirm(`${title} FOR ${price}`));
    this.busy = false;
    if (res === 'ok') {
      sfx.upgrade();
      this.cameras.main.flash(150, 115, 239, 247);
      this.toast('THANK YOU!');
    } else if (res === 'pending') this.toast('THANKS! YOUR GEMS ARRIVE IN A MOMENT.');
    else if (res === 'error') this.toast('PURCHASE FAILED. TRY AGAIN LATER.');
    this.draw();
  }

  // Test-mode confirmation, so a fake purchase is never mistaken for a real one.
  private confirm(what: string): Promise<boolean> {
    return new Promise((resolve) => {
      const parts: Phaser.GameObjects.GameObject[] = [];
      const dim = this.add.rectangle(0, 0, W, H, 0x1a1c2c, 0.85).setOrigin(0).setInteractive().setDepth(100);
      const g = this.add.graphics().setDepth(101);
      const bw = Math.min(W - 24, 280);
      panel(g, W / 2 - bw / 2, 50, bw, 110, 0x29366f, 0xef7d57, 0x3b5dc9);
      parts.push(dim, g);
      parts.push(text(this, W / 2, 64, 'TEST PURCHASE', { scale: 2, color: COL.orange }).setDepth(102));
      parts.push(text(this, W / 2, 84, what, { color: COL.white, maxWidth: bw - 16, maxLines: 1 }).setDepth(102));
      parts.push(text(this, W / 2, 98, 'NO MONEY IS CHARGED. THE STORE IS NOT CONNECTED YET.', { color: COL.light, maxWidth: bw - 16, maxLines: 2 }).setDepth(102));
      const done = (v: boolean) => {
        parts.forEach((p) => p.destroy());
        resolve(v);
      };
      const ok = button(this, W / 2 + 54, 142, 96, 20, 'CONFIRM', () => done(true), { ...BTN.green, depth: 103 });
      const no = button(this, W / 2 - 54, 142, 96, 20, 'CANCEL', () => done(false), { ...BTN.red, depth: 103 });
      parts.push(ok.c, no.c);
    });
  }

  private toast(s: string) {
    const t = text(this, W / 2, H / 2, s, { scale: 2, color: COL.yellow, maxWidth: W - 16, maxLines: 1 }).setDepth(120);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, delay: 700, duration: 500, onComplete: () => t.destroy() });
  }
}
