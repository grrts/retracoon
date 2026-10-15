// Online scoreboard: the world's best runs, you against your friends, today's daily
// run (#1 wins gems) and this season (a calendar month; #1 wins gems).
// Friends are added with a 6-letter friend code. Works offline (shows a notice).
import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, panel, BTN, type Button } from '../ui';
import { onAction } from '../input';
import { sfx, menuMusic } from '../audio';
import { store } from '../save';
import { COL } from '../gfx/palette';
import { askText } from '../textInput';
import { onlineConfigured, profile, rename, worldScores, friendScores, dailyBoard, seasonBoard, addFriend, removeFriend, submitBest, flushRuns, fullName, mustSignInFor, type ScoreRow, type BoardRow, type Board, type Me } from '../platform/online';
import { isSteam } from '../platform/native';
import { track } from '../platform/track';

type Tab = 'world' | 'friends' | 'daily' | 'season';
const TABS: Tab[] = ['world', 'friends', 'daily', 'season'];
const TAB_NAMES: Record<Tab, string> = { world: 'WORLD', friends: 'FRIENDS', daily: 'DAILY', season: 'SEASON' };
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
  private rows: (ScoreRow | BoardRow)[] | null = null;
  private board: Board | null = null;
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
  init(data: { back?: string; tab?: Tab; demo?: { me: Me; rows: ScoreRow[]; board?: Board } }) {
    this.back = data.back ?? 'Title';
    this.tab = data.tab ?? 'world';
    this.page = 0;
    this.left = [];
    this.right = [];
    this.tabBtns = [];
    this.demo = !!data.demo;
    this.me = data.demo?.me ?? null;
    this.rows = data.demo?.rows ?? null;
    this.board = data.demo?.board ?? null;
    this.loading = false;
  }

  create() {
    menuMusic(this);
    this.add.rectangle(0, 0, W, H, 0x1a1c2c).setOrigin(0);
    this.add.rectangle(0, 0, W, TOP, 0x29366f).setOrigin(0);
    text(this, W / 2, 11, 'SCOREBOARD', { scale: 2, color: COL.yellow });
    button(this, W - 30, 11, 52, 16, 'BACK', () => this.leave(), BTN.red);
    if (onlineConfigured()) button(this, 38, 11, 64, 16, 'ACCOUNT', () => this.scene.start('Account'), BTN.blue);
    const g = this.add.graphics();
    panel(g, 4, BODY, LEFT_W, H - BODY - 4, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    const rx = LEFT_W + 8;
    const tw = (W - rx - 4) / TABS.length;
    TABS.forEach((t, i) => {
      this.tabBtns.push(
        button(this, rx + tw * i + tw / 2, TAB_Y, tw - 2, 16, TAB_NAMES[t], () => {
          if (this.tab === t) return;
          sfx.select();
          this.tab = t;
          this.page = 0;
          this.drawLeft();
          void this.fetchRows();
        }),
      );
    });
    onAction(this, 'back', () => this.leave());
    if (!this.demo) track('scores_open');
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
    // iPhone guests sign in when they first open the scoreboard.
    if (!this.demo && mustSignInFor()) return this.scene.start('SignIn', { then: 'Scores' });
    this.loading = true;
    this.drawRight();
    await flushRuns();
    await submitBest();
    this.me = await profile(true);
    if (!this.scene.isActive()) return;
    this.drawLeft();
    await this.fetchRows();
  }

  private async fetchRows() {
    if (this.demo) return this.drawRight();
    this.loading = true;
    this.drawRight();
    const tab = this.tab;
    let rows: (ScoreRow | BoardRow)[] | null;
    let board: Board | null = null;
    if (tab === 'daily' || tab === 'season') {
      board = tab === 'daily' ? await dailyBoard(50) : await seasonBoard(50);
      rows = board?.players ?? null;
    } else rows = tab === 'world' ? await worldScores(50) : await friendScores();
    if (!this.scene.isActive() || tab !== this.tab) return;
    this.rows = rows;
    this.board = board;
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
    add(text(this, cx, BODY + 22, this.me ? fullName(this.me) : store.playerName || 'RACCOON', { color: COL.white, maxWidth: LEFT_W - 8, maxLines: 1 }));
    const [l1, l2] = this.tab === 'daily' || this.tab === 'season' ? this.standing() : [`BEST STAGE ${Math.max(store.bestStage, this.me?.bestStage ?? 0)}`, `BEST LEVEL ${Math.max(store.bestLevel, this.me?.bestLevel ?? 0)}`];
    add(text(this, cx, BODY + 36, l1, { color: COL.yellow, maxWidth: LEFT_W - 6, maxLines: 1 }));
    add(text(this, cx, BODY + 47, l2, { color: COL.light, maxWidth: LEFT_W - 6, maxLines: 1 }));
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
      const on = TABS[i] === this.tab;
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
    const daily = this.tab === 'daily';
    const timed = daily || this.tab === 'season';
    // Daily and season boards: what's at stake and when it closes.
    let top = 0;
    if (timed && this.board) {
      const prize = isSteam() ? `${this.board.prize * 10} CAPS` : `${this.board.prize} GEMS`;
      const info = daily ? `SAME ROAD FOR ALL TODAY. #1 WINS ${prize}. ENDS IN ${until(this.board.endsAt)}` : `SEASON ${this.board.period}: #1 WINS ${prize}. ENDS IN ${until(this.board.endsAt)}`;
      add(text(this, cx, BODY + 6, info, { color: COL.lime, maxWidth: rw - 6, maxLines: 1 }));
      top = 12;
    }
    if (!this.rows.length || (friends && this.rows.length < 2)) {
      if (friends) return msg(['NO FRIENDS YET', 'SHARE YOUR FRIEND CODE, OR TAP ADD FRIEND AND TYPE THEIRS.'], COL.yellow);
      const last = this.board?.lastWinner;
      if (timed)
        return msg(
          [daily ? 'NOBODY HAS RUN TODAY YET' : 'NO RUNS THIS SEASON YET', daily ? 'PLAY THE DAILY RUN FROM THE TITLE SCREEN.' : 'EVERY NORMAL RUN COUNTS.', ...(last ? [`LAST WINNER: ${fullName(last)}`] : [])],
          COL.yellow,
        );
      return msg(['NO SCORES YET', 'BE THE FIRST ON THE BOARD.'], COL.yellow);
    }
    // header
    const xRank = rx + 4;
    const xName = rx + 24;
    const xStage = rx + rw - (friends ? 52 : daily ? 44 : 34);
    const xLvl = rx + rw - (friends ? 24 : 6);
    const hy = BODY + 6 + top;
    add(text(this, xRank, hy, '#', { origin: 0, color: COL.grey }));
    add(text(this, xName, hy, 'NAME', { origin: 0, color: COL.grey }));
    add(text(this, xStage, hy, 'STAGE', { origin: 1, color: COL.grey }));
    add(text(this, xLvl, hy, daily ? 'TIME' : 'LV', { origin: 1, color: COL.grey }));
    const per = Math.floor((H - BODY - 16 - 26 - top) / ROW_H);
    const pages = Math.max(1, Math.ceil(this.rows.length / per));
    this.page = Math.min(this.page, pages - 1);
    const g = add(this.add.graphics());
    this.rows.slice(this.page * per, this.page * per + per).forEach((r, k) => {
      const i = this.page * per + k;
      const y = BODY + 18 + top + k * ROW_H;
      const mine = r.id === this.me?.id;
      g.fillStyle(mine ? 0x8f563b : k % 2 ? 0x1f2440 : 0x262b4d, 1);
      g.fillRect(rx, y, rw, ROW_H - 2);
      const col = mine ? COL.yellow : i < 3 ? [COL.yellow, COL.light, COL.orange][i] : COL.white;
      const ty = y + (ROW_H - 2) / 2;
      add(text(this, xRank, ty, `${r.rank ?? i + 1}`, { origin: 0, color: col }));
      add(text(this, xName, ty, fullName(r), { origin: 0, color: col, maxWidth: xStage - xName - 26, maxLines: 1 }));
      const b = r as BoardRow;
      add(text(this, xStage, ty, `${timed ? b.stage : r.bestStage}`, { origin: 1, color: col }));
      add(text(this, xLvl, ty, daily ? clock(b.timeMs ?? 0) : `${timed ? b.level : r.bestLevel}`, { origin: 1, color: col }));
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

  // Daily and season tabs: your own standing on the left.
  private standing(): string[] {
    const d = this.me?.daily;
    const s = this.me?.season;
    return [d ? `TODAY: STAGE ${d.stage} #${d.rank}` : 'TODAY: NO DAILY RUN', s ? `SEASON: STAGE ${s.stage} #${s.rank}` : 'SEASON: NO RUNS YET'];
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

// 5:07 for a run time.
function clock(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// "5H 12M" or "17D" until a board closes.
function until(iso: string) {
  const left = Math.max(0, new Date(iso).getTime() - Date.now());
  const m = Math.floor(left / 60000);
  if (m >= 48 * 60) return `${Math.floor(m / 1440)}D`;
  return m >= 60 ? `${Math.floor(m / 60)}H ${m % 60}M` : `${m}M`;
}
