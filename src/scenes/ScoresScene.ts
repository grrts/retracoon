// Online scoreboard: the world's best runs, and you against your friends.
// Friends are added with a 6-letter friend code. Works offline (shows a notice).
import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, panel, BTN, type Button } from '../ui';
import { sfx } from '../audio';
import { store } from '../save';
import { COL } from '../gfx/palette';
import { askText } from '../textInput';
import { onlineConfigured, profile, rename, worldScores, friendScores, addFriend, removeFriend, submitBest, type ScoreRow, type Me } from '../platform/online';

type Tab = 'world' | 'friends';
const TOP = 22;
const TAB_Y = 32;
const BODY = 42;
const LEFT_W = 128;
const ROW_H = 14;

export class ScoresScene extends Phaser.Scene {
  private back = 'Title';
  private tab: Tab = 'world';
  private page = 0;
  private me: Me | null = null;
  private rows: ScoreRow[] | null = null;
  private loading = false;
  private demo = false;
  private left: Phaser.GameObjects.GameObject[] = [];
  private right: Phaser.GameObjects.GameObject[] = [];
  private tabBtns: Button[] = [];
  private toastText?: Phaser.GameObjects.BitmapText;

  constructor() {
    super('Scores');
  }

  // `demo` fills the board with sample rows (used by tools/ui-check.mjs).
  init(data: { back?: string; tab?: Tab; demo?: { me: Me; rows: ScoreRow[] } }) {
    this.back = data.back ?? 'Title';
    this.tab = data.tab ?? 'world';
    this.page = 0;
    this.left = [];
    this.right = [];
    this.tabBtns = [];
    this.demo = !!data.demo;
    this.me = data.demo?.me ?? null;
    this.rows = data.demo?.rows ?? null;
    this.loading = false;
  }

  create() {
    this.add.rectangle(0, 0, W, H, 0x1a1c2c).setOrigin(0);
    this.add.rectangle(0, 0, W, TOP, 0x29366f).setOrigin(0);
    text(this, W / 2, 11, 'SCOREBOARD', { scale: 2, color: COL.yellow });
    button(this, W - 30, 11, 52, 16, 'BACK', () => this.leave(), BTN.red);
    const g = this.add.graphics();
    panel(g, 4, BODY, LEFT_W, H - BODY - 4, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    const rx = LEFT_W + 8;
    const tw = (W - rx - 4) / 2;
    (['world', 'friends'] as Tab[]).forEach((t, i) => {
      this.tabBtns.push(
        button(this, rx + tw * i + tw / 2, TAB_Y, tw - 2, 16, t === 'world' ? 'WORLD' : 'FRIENDS', () => {
          if (this.tab === t) return;
          sfx.select();
          this.tab = t;
          this.page = 0;
          void this.fetchRows();
        }),
      );
    });
    this.input.keyboard?.on('keydown-ESC', () => this.leave());
    this.drawLeft();
    if (this.demo) this.drawRight();
    else void this.boot();
  }

  private leave() {
    sfx.select();
    this.scene.start(this.back);
  }

  private async boot() {
    if (!onlineConfigured()) return this.drawRight();
    this.loading = true;
    this.drawRight();
    await submitBest();
    this.me = await profile();
    if (!this.scene.isActive()) return;
    this.drawLeft();
    await this.fetchRows();
  }

  private async fetchRows() {
    if (this.demo) return this.drawRight();
    this.loading = true;
    this.drawRight();
    const tab = this.tab;
    const rows = tab === 'world' ? await worldScores(50) : await friendScores();
    if (!this.scene.isActive() || tab !== this.tab) return;
    this.rows = rows;
    this.loading = false;
    this.drawRight();
  }

  private toast(s: string, color: number = COL.yellow) {
    this.toastText?.destroy();
    const t = text(this, W / 2, H - 26, s, { color }).setDepth(100);
    this.toastText = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 2200, duration: 400, onComplete: () => t.destroy() });
  }

  private drawLeft() {
    this.left.forEach((o) => o.destroy());
    this.left = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (this.left.push(o), o);
    const cx = 4 + LEFT_W / 2;
    const online = !!this.me;
    add(text(this, cx, BODY + 10, 'YOU', { color: COL.light }));
    add(text(this, cx, BODY + 22, this.me?.name ?? (store.playerName || 'RACCOON'), { color: COL.white, maxWidth: LEFT_W - 8, maxLines: 1 }));
    add(text(this, cx, BODY + 36, `BEST STAGE ${Math.max(store.bestStage, this.me?.bestStage ?? 0)}`, { color: COL.yellow }));
    add(text(this, cx, BODY + 47, `BEST LEVEL ${Math.max(store.bestLevel, this.me?.bestLevel ?? 0)}`, { color: COL.light }));
    add(text(this, cx, BODY + 64, 'FRIEND CODE', { color: COL.light }));
    add(text(this, cx, BODY + 77, this.me?.friendCode ?? '------', { scale: 2, color: online ? COL.lime : COL.grey }));
    const bw = LEFT_W - 12;
    const btns = [
      button(this, cx, BODY + 98, bw, 16, 'CHANGE NAME', () => void this.doRename()),
      button(this, cx, BODY + 117, bw, 16, 'COPY MY CODE', () => void this.doCopy()),
      button(this, cx, BODY + 136, bw, 18, 'ADD FRIEND', () => void this.doAdd(), BTN.green),
    ];
    for (const b of btns) {
      add(b.c);
      b.setEnabled(online);
    }
  }

  private drawRight() {
    this.right.forEach((o) => o.destroy());
    this.right = [];
    this.tabBtns.forEach((b, i) => {
      const on = (i === 0 ? 'world' : 'friends') === this.tab;
      b.setColors(on ? 0x8f563b : 0x29366f, 0x1a1c2c, on ? 0xffcd75 : 0x3b5dc9);
    });
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => (this.right.push(o), o);
    const rx = LEFT_W + 8;
    const rw = W - rx - 4;
    const cx = rx + rw / 2;
    const msg = (lines: string[], color: number = COL.light) => {
      let y = BODY + 40;
      for (const l of lines) {
        const t = add(text(this, cx, y, l, { color, maxWidth: rw - 8, maxLines: 3 }));
        y += t.height + 6;
        color = COL.light;
      }
    };
    if (!onlineConfigured() && !this.demo) return msg(['SCOREBOARD NOT CONNECTED YET', 'YOUR BEST RUNS ARE STILL SAVED ON THIS DEVICE.'], COL.orange);
    if (this.loading) return msg(['LOADING...'], COL.yellow);
    if (!this.rows) return msg(["CAN'T REACH THE SCOREBOARD", 'CHECK YOUR CONNECTION AND TRY AGAIN.'], COL.orange);
    const friends = this.tab === 'friends';
    if (!this.rows.length || (friends && this.rows.length < 2)) {
      if (friends) return msg(['NO FRIENDS YET', 'SHARE YOUR FRIEND CODE, OR TAP ADD FRIEND AND TYPE THEIRS.'], COL.yellow);
      return msg(['NO SCORES YET', 'BE THE FIRST ON THE BOARD.'], COL.yellow);
    }
    // header
    const xRank = rx + 4;
    const xName = rx + 24;
    const xStage = rx + rw - (friends ? 52 : 34);
    const xLvl = rx + rw - (friends ? 24 : 6);
    const hy = BODY + 6;
    add(text(this, xRank, hy, '#', { origin: 0, color: COL.grey }));
    add(text(this, xName, hy, 'NAME', { origin: 0, color: COL.grey }));
    add(text(this, xStage, hy, 'STAGE', { origin: 1, color: COL.grey }));
    add(text(this, xLvl, hy, 'LV', { origin: 1, color: COL.grey }));
    const per = Math.floor((H - BODY - 16 - 26) / ROW_H);
    const pages = Math.max(1, Math.ceil(this.rows.length / per));
    this.page = Math.min(this.page, pages - 1);
    const g = add(this.add.graphics());
    this.rows.slice(this.page * per, this.page * per + per).forEach((r, k) => {
      const i = this.page * per + k;
      const y = BODY + 18 + k * ROW_H;
      const mine = r.id === this.me?.id;
      g.fillStyle(mine ? 0x8f563b : k % 2 ? 0x1f2440 : 0x262b4d, 1);
      g.fillRect(rx, y, rw, ROW_H - 2);
      const col = mine ? COL.yellow : i < 3 ? [COL.yellow, COL.light, COL.orange][i] : COL.white;
      const ty = y + (ROW_H - 2) / 2;
      add(text(this, xRank, ty, `${r.rank ?? i + 1}`, { origin: 0, color: col }));
      add(text(this, xName, ty, r.name, { origin: 0, color: col, maxWidth: xStage - xName - 26, maxLines: 1 }));
      add(text(this, xStage, ty, `${r.bestStage}`, { origin: 1, color: col }));
      add(text(this, xLvl, ty, `${r.bestLevel}`, { origin: 1, color: col }));
      if (friends && !mine) add(button(this, rx + rw - 10, ty, 16, 12, 'X', () => void this.doRemove(r), BTN.red).c);
    });
    if (pages > 1) {
      const by = H - 14;
      const prev = button(this, cx - 50, by, 40, 16, '<', () => (this.page--, this.drawRight()));
      const next = button(this, cx + 50, by, 40, 16, '>', () => (this.page++, this.drawRight()));
      prev.setEnabled(this.page > 0);
      next.setEnabled(this.page < pages - 1);
      add(prev.c);
      add(next.c);
      add(text(this, cx, by, `${this.page + 1}/${pages}`, { color: COL.light }));
    }
  }

  private async doRename() {
    const v = await askText('YOUR NAME (3-16 LETTERS)', this.me?.name ?? store.playerName);
    if (v === null) return;
    if (await rename(v)) {
      this.toast('NAME SAVED', COL.lime);
      this.me = await profile();
      this.drawLeft();
      void this.fetchRows();
    } else this.toast('USE 3-16 LETTERS OR NUMBERS', COL.orange);
  }

  private async doCopy() {
    if (!this.me) return;
    try {
      await navigator.clipboard.writeText(this.me.friendCode);
      this.toast('CODE COPIED. SEND IT TO A FRIEND!', COL.lime);
    } catch {
      this.toast(`YOUR CODE IS ${this.me.friendCode}`);
    }
  }

  private async doAdd() {
    const v = await askText("FRIEND'S CODE", '', 6);
    if (!v) return;
    if (v.trim().toUpperCase() === this.me?.friendCode) return this.toast("THAT'S YOUR OWN CODE", COL.orange);
    const res = await addFriend(v);
    if (!res.ok) {
      const why = { unknown: 'NO PLAYER WITH THAT CODE', self: "THAT'S YOUR OWN CODE", already: 'YOU ARE ALREADY FRIENDS', full: 'FRIENDS LIST IS FULL', busy: 'TOO MANY TRIES. WAIT A BIT.', offline: "CAN'T REACH THE SCOREBOARD" };
      return this.toast(why[res.why], COL.orange);
    }
    sfx.select();
    this.toast(`ADDED ${res.name}`, COL.lime);
    this.tab = 'friends';
    this.page = 0;
    void this.fetchRows();
  }

  private async doRemove(r: ScoreRow) {
    const v = await askText(`REMOVE ${r.name}? TYPE YES`, '', 3);
    if (v?.trim().toUpperCase() !== 'YES') return;
    await removeFriend(r.id);
    this.toast(`REMOVED ${r.name}`);
    void this.fetchRows();
  }
}
