import Phaser from 'phaser';
import { W, H } from '../config';

export const BIOMES = [
  { key: 'bg_alley', name: 'BACK ALLEY', decals: ['decal_manhole', 'decal_puddle', 'decal_grate'], left: 22, right: W - 22 },
  { key: 'bg_park', name: 'CITY PARK', decals: ['decal_bush', 'decal_flower', 'decal_flower', 'decal_puddle'], left: 14, right: W - 14 },
  { key: 'bg_sewer', name: 'THE SEWERS', decals: ['decal_slime', 'decal_grate', 'decal_slime'], left: 30, right: W - 30 },
];

// Scrolling ground with a crossfade between biomes and decals drifting past.
export class Background {
  base: Phaser.GameObjects.TileSprite;
  next: Phaser.GameObjects.TileSprite | null = null;
  decals: Phaser.GameObjects.Image[] = [];
  biome = 0;
  private decalTimer = 0;

  constructor(private scene: Phaser.Scene, biome = 0) {
    this.biome = biome % BIOMES.length;
    this.base = scene.add.tileSprite(0, 0, W, H, BIOMES[this.biome].key).setOrigin(0).setDepth(-10);
  }

  get info() {
    return BIOMES[this.biome];
  }

  setBiome(i: number) {
    const b = i % BIOMES.length;
    if (b === this.biome) return;
    this.biome = b;
    this.next?.destroy();
    const nx = this.scene.add.tileSprite(0, 0, W, H, BIOMES[b].key).setOrigin(0).setDepth(-9).setAlpha(0);
    nx.tilePositionY = this.base.tilePositionY;
    this.next = nx;
    this.scene.tweens.add({
      targets: nx,
      alpha: 1,
      duration: 900,
      onComplete: () => {
        this.base.destroy();
        this.base = nx;
        this.base.setDepth(-10);
        this.next = null;
      },
    });
  }

  update(dy: number, dt: number) {
    this.base.tilePositionY -= dy;
    if (this.next) this.next.tilePositionY = this.base.tilePositionY;
    this.decalTimer -= dt;
    if (this.decalTimer <= 0) {
      this.decalTimer = 1.2 + Math.random() * 2.2;
      const b = this.info;
      const key = b.decals[Math.floor(Math.random() * b.decals.length)];
      const x = Phaser.Math.Between(b.left + 8, b.right - 8);
      this.decals.push(this.scene.add.image(x, -12, key).setDepth(-8));
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i];
      d.y += dy;
      if (d.y > H + 16) {
        d.destroy();
        this.decals.splice(i, 1);
      }
    }
  }
}
