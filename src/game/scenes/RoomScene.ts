import Phaser from 'phaser';
import { Monster } from '../entities/Monster';
import type { PetAction } from '../../domain/pet';
import type { PetKind } from '../../domain/onboarding';
import { decorations } from '../../domain/shop';
export class RoomScene extends Phaser.Scene {
  private monster!: Monster;
  private busy = false;
  private rug?: Phaser.GameObjects.Graphics;
  private decoration?: string;
  onPetTouch?: () => void;
  setDecoration(id?: string): void {
    this.decoration = id;
    if (!this.rug?.scene) return;
    const color = decorations.find(item => item.id === id)?.color ?? 0xb9a0ba;
    this.rug.clear().fillStyle(color).fillRect(99, 266, 216, 16).fillRect(115, 258, 184, 32);
    this.rug.fillStyle(0xf6e6ba, .5).fillRect(123, 262, 168, 4).fillRect(123, 282, 168, 4);
  }
  constructor(private kind: PetKind = 'buba') { super('Room'); }
  create(): void {
    const g = this.add.graphics();
    g.fillStyle(0xeee4d3); g.fillRect(0, 0, 400, 320);
    g.lineStyle(1, 0xe1d4c0); for (let x = 0; x < 400; x += 40) g.lineBetween(x, 0, x, 240);
    g.fillStyle(0xd8bfa5); g.fillRect(0, 238, 400, 82);
    g.fillStyle(0xb79a81); g.fillRect(0, 238, 400, 5);
    g.lineStyle(1, 0xc4a98e); for (let y = 262; y < 320; y += 27) g.lineBetween(0, y, 400, y);
    g.fillStyle(0xa88c78); g.fillRect(37, 39, 84, 99);
    g.fillStyle(0xbcd8d5); g.fillRect(43, 45, 72, 87);
    g.fillStyle(0xeaf3df); g.fillRect(52, 55, 14, 5); g.fillRect(62, 50, 17, 10);
    g.fillStyle(0xead8bb); g.fillRect(76, 45, 5, 87); g.fillRect(43, 85, 72, 5); g.fillRect(31, 132, 96, 7);
    g.fillStyle(0xa98d76); g.fillRect(291, 101, 68, 7); g.fillRect(300, 108, 5, 10);
    g.fillStyle(0x7c9975); g.fillRect(313, 74, 7, 19); g.fillRect(306, 69, 7, 13); g.fillRect(320, 65, 7, 17);
    g.fillStyle(0xc28c70); g.fillRect(308, 89, 19, 12);
    // Stepped silhouette keeps the rug and shadow aligned with the pixel art.
    g.fillStyle(0x9d849f); g.fillRect(91, 258, 232, 32); g.fillRect(107, 250, 200, 48);
    g.fillStyle(0xb9a0ba); g.fillRect(99, 266, 216, 16); g.fillRect(115, 258, 184, 32);
    g.fillStyle(0xd2b6cc); g.fillRect(123, 262, 168, 4); g.fillRect(123, 282, 168, 4);
    g.fillStyle(0x524351, 0.18); g.fillRect(140, 255, 120, 12); g.fillRect(152, 251, 96, 20);
    this.rug = this.add.graphics(); this.setDecoration(this.decoration);
    this.monster = new Monster(this, 200, 263, this.kind);
    this.monster.onTouch(() => this.onPetTouch?.());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.busy = false; });
  }
  perform(action: PetAction, done: () => void): boolean {
    if (this.busy || !this.sys.isActive()) return false;
    this.busy = true;
    this.monster.react(action, () => { this.busy = false; done(); });
    return true;
  }
  touch(angry: boolean, done: () => void): boolean {
    if (this.busy || !this.sys.isActive()) return false;
    this.busy = true;
    this.monster.touch(angry, () => { this.busy = false; done(); });
    return true;
  }
}
