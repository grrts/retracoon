import Phaser from 'phaser';
import { W, H } from './config';
import { BootScene, TitleScene, PauseScene, GameOverScene } from './scenes/MetaScenes';
import { RunScene } from './scenes/RunScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { RewardScene, ForkScene, ShopScene, CampScene, EventScene } from './scenes/StopScenes';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#1a1c2c',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  disableContextMenu: true,
  banner: false,
  scene: [BootScene, TitleScene, RunScene, LevelUpScene, RewardScene, ForkScene, ShopScene, CampScene, EventScene, PauseScene, GameOverScene],
});

// Handy for debugging from the console.
(window as unknown as { __game: Phaser.Game }).__game = game;
