import Phaser from 'phaser';
import { W, H } from '../config';
import { text, button, panel, BTN } from '../ui';
import { sfx } from '../audio';
import { COL } from '../gfx/palette';
import { store } from '../save';
import { providers, type Provider } from '../platform/auth';
import { isSteam } from '../platform/native';
import { signIn, signOut, deleteAccount, profile, fullName } from '../platform/online';
import { loginPurchases } from '../platform/iap';
import { adsEnabled } from '../platform/ads';
import { askText } from '../textInput';

const LABEL: Record<Provider, string> = { google: 'SIGN IN WITH GOOGLE', apple: 'SIGN IN WITH APPLE', steam: 'SIGN IN WITH STEAM' };
const STYLE: Record<Provider, { fill: number; light: number }> = {
  google: { fill: 0xf4f4f4, light: 0xffffff },
  apple: { fill: 0x1a1c2c, light: 0x566c86 },
  steam: { fill: 0x29366f, light: 0x41a6f6 },
};

// After sign-in (or when it isn't needed): tutorial on the very first launch, then the
// launch ad (with its note first), then the title screen.
export function continueBoot(scene: Phaser.Scene, adsOn: boolean) {
  if (!store.tutorialDone) return scene.scene.start('Tutorial', { next: 'Title', forced: true });
  scene.scene.start(adsOn ? 'Ad' : 'Title');
}

// ---------------------------------------------------------------- sign in

// Playing needs an account, so names and purchases belong to someone. One account per
// player: the same Google, Apple or Steam account on another device is the same player.
export class SignInScene extends Phaser.Scene {
  private status!: Phaser.GameObjects.BitmapText;
  private busy = false;
  private then: 'boot' | 'title' = 'boot';

  constructor() {
    super('SignIn');
  }

  init(data: { then?: 'boot' | 'title' }) {
    this.then = data.then ?? 'boot';
    this.busy = false;
  }

  create() {
    this.add.rectangle(0, 0, W, H, 0x1a1c2c).setOrigin(0);
    const g = this.add.graphics();
    const bw = Math.min(W - 24, 300);
    panel(g, W / 2 - bw / 2, 20, bw, 70, 0x29366f, 0x1a1c2c, 0x3b5dc9);
    text(this, W / 2, 36, 'RETRACOON', { scale: 2, color: COL.yellow });
    text(this, W / 2, 58, 'SIGN IN TO PLAY. YOUR NAME, SCORES', { color: COL.light, maxWidth: bw - 16 });
    text(this, W / 2, 70, 'AND PURCHASES STAY WITH YOUR ACCOUNT.', { color: COL.light, maxWidth: bw - 16 });
    const list = providers();
    list.forEach((p, i) => {
      const b = button(this, W / 2, 112 + i * 28, Math.min(W - 40, 220), 22, LABEL[p], () => void this.go(p), { ...STYLE[p], depth: 5 });
      if (p === 'google') b.label.setTint(COL.black);
    });
    this.status = text(this, W / 2, H - 20, '', { color: COL.orange, maxWidth: W - 24, maxLines: 2 });
    // Steam signs in by itself: the player is already logged in to Steam.
    if (isSteam()) void this.go('steam');
  }

  private async go(p: Provider) {
    if (this.busy) return;
    this.busy = true;
    this.status.setText('SIGNING IN...').setTint(COL.ice);
    const res = await signIn(p);
    this.busy = false;
    if (!this.scene.isActive()) return;
    if (!res.ok) {
      const why = {
        cancel: '',
        rejected: "THAT DIDN'T WORK. TRY AGAIN.",
        offline: 'NO CONNECTION. CHECK YOUR INTERNET AND TRY AGAIN.',
        busy: 'TOO MANY TRIES. WAIT A MINUTE.',
      }[res.why];
      this.status.setText(why).setTint(COL.orange);
      return;
    }
    sfx.upgrade();
    void loginPurchases(res.me.id);
    this.status.setText(res.created ? `WELCOME, ${fullName(res.me)}!` : `WELCOME BACK, ${fullName(res.me)}!`).setTint(COL.lime);
    this.time.delayedCall(700, () => (this.then === 'boot' ? continueBoot(this, adsEnabled()) : this.scene.start('Title')));
  }
}

// ---------------------------------------------------------------- account

export class AccountScene extends Phaser.Scene {
  constructor() {
    super('Account');
  }

  async create() {
    this.add.rectangle(0, 0, W, H, 0x1a1c2c).setOrigin(0);
    text(this, W / 2, 14, 'ACCOUNT', { scale: 2, color: COL.yellow });
    button(this, W - 30, 11, 52, 16, 'BACK', () => this.scene.start('Scores'), BTN.red);
    const info = text(this, W / 2, 50, 'LOADING...', { color: COL.light, maxWidth: W - 24, maxLines: 3 });
    const me = await profile(true);
    if (!this.scene.isActive()) return;
    info.setText(me ? `${fullName(me)}\nSIGNED IN WITH ${me.provider.toUpperCase()}` : 'OFFLINE. TRY AGAIN WHEN CONNECTED.');
    info.setTint(me ? COL.white : COL.orange);
    if (!me) return;
    const toSignIn = () => this.scene.start('SignIn', { then: 'title' });
    if (!isSteam())
      button(this, W / 2, 100, 180, 22, 'SIGN OUT', () => {
        signOut();
        toSignIn();
      });
    button(this, W / 2, 130, 180, 22, 'DELETE ACCOUNT', async () => {
      const v = await askText('DELETES NAME, SCORES, FRIENDS AND GEMS. TYPE DELETE', '', 6);
      if (v?.trim().toUpperCase() !== 'DELETE') return;
      if (await deleteAccount()) toSignIn();
      else info.setText("COULDN'T DELETE. TRY AGAIN.").setTint(COL.orange);
    }, BTN.red);
    text(this, W / 2, H - 20, 'PURCHASES ARE TIED TO THIS ACCOUNT.', { color: COL.grey, maxWidth: W - 24 });
  }
}
