import Phaser from 'phaser';
import { W, H } from './config';
import { BootScene, TitleScene, PauseScene, GameOverScene, AdScene } from './scenes/MetaScenes';
import { StoreScene } from './scenes/StoreScene';
import { TutorialScene } from './scenes/TutorialScene';
import { InspectScene } from './scenes/InspectScene';
import { SignInScene, AccountScene } from './scenes/AccountScenes';
import { ScoresScene } from './scenes/ScoresScene';
import { initNative } from './platform/native';
import { events } from './content/registry';
import { store } from './save';
import { forceSeason } from './world/calendar';
import { newRun } from './game/run';
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
  scene: [BootScene, SignInScene, AccountScene, AdScene, TitleScene, StoreScene, TutorialScene, ScoresScene, RunScene, LevelUpScene, RewardScene, ForkScene, ShopScene, CampScene, EventScene, PauseScene, InspectScene, GameOverScene],
});

void initNative();

// Handy for debugging from the console, and used by tools/ui-check.mjs.
Object.assign(window, { __game: game, __debug: { events, store, forceSeason, newRun } });
