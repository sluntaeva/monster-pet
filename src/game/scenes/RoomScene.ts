import Phaser from 'phaser';
import { Monster } from '../entities/Monster';
import type { PetAction } from '../../domain/pet';
import type { PetKind } from '../../domain/onboarding';
import { decorations } from '../../domain/shop';
import type { Wallet } from '../../domain/catchGame';
export class RoomScene extends Phaser.Scene {
  private monster!: Monster;
  private busy = false;
  private rug?: Phaser.GameObjects.Graphics;
  private decoration?: string;
  private roomItems: Wallet['room'];
  private ornaments?: Phaser.GameObjects.Graphics;
  onPetTouch?: () => void;
  setDecoration(id?: string, room?: Wallet['room']): void {
    this.decoration = id;
    this.roomItems = room;
    if (!this.rug?.scene) return;
    const color = decorations.find(item => item.id === id)?.color ?? 0xb9a0ba;
    this.rug.clear().fillStyle(color).fillRect(99, 266, 216, 16).fillRect(115, 258, 184, 32);
    this.rug.fillStyle(0xf6e6ba, .5).fillRect(123, 262, 168, 4).fillRect(123, 282, 168, 4);
    this.drawOrnaments();
  }
  private drawOrnaments(): void {
    if (!this.ornaments) return;
    const g = this.ornaments; g.clear();
    const rect = (color: number, x: number, y: number, width: number, height: number) => { g.fillStyle(color); g.fillRect(x, y, width, height); };
    if (this.roomItems?.plant) {
      rect(0xeee4d3, 302, 60, 34, 41);
      if (this.roomItems.plant === 'cactus') {
        rect(0x73a86b, 314, 64, 9, 28); rect(0x73a86b, 304, 73, 10, 7); rect(0x73a86b, 304, 66, 5, 13); rect(0x73a86b, 323, 70, 10, 7);
        rect(0xafd58a, 317, 67, 3, 20);
      } else {
        rect(0x73a86b, 316, 70, 4, 24);
        for (const [x, y] of [[306, 65], [320, 60], [323, 76]]) {
          rect(0xda87b5, x, y, 12, 5); rect(0xda87b5, x + 3, y - 4, 5, 13); rect(0xf6cf79, x + 4, y, 4, 4);
        }
      }
      rect(0xc28c70, 308, 89, 21, 12);
    }
    if (this.roomItems?.wall === 'stars') {
      for (const [x, y] of [[166, 52], [201, 74], [236, 43]]) {
        rect(0xe1b76c, x, y + 5, 18, 7); rect(0xe1b76c, x + 6, y, 6, 18);
      }
    } else if (this.roomItems?.wall === 'moon') {
      rect(0xa88c78, 170, 36, 68, 68); rect(0x30364e, 175, 41, 58, 58);
      g.fillStyle(0xf6cf79).fillCircle(203, 68, 19); g.fillStyle(0x30364e).fillCircle(212, 61, 17);
      rect(0xf6e6ba, 183, 84, 4, 4); rect(0xf6e6ba, 220, 49, 3, 3);
    }
    if (this.roomItems?.toy === 'ball') {
      g.fillStyle(0x9d849f, .3).fillEllipse(346, 285, 39, 9);
      g.fillStyle(0xe6ab67).fillCircle(344, 269, 17);
      rect(0xf6e6ba, 341, 253, 5, 32); rect(0xc28c70, 329, 267, 31, 5);
    } else if (this.roomItems?.toy === 'cushion') {
      rect(0x9673b3, 322, 265, 47, 22); rect(0xc19bdd, 326, 261, 39, 23);
      rect(0xe8b8cf, 337, 268, 7, 6); rect(0xe8b8cf, 347, 268, 7, 6); rect(0xe8b8cf, 341, 274, 10, 6);
    }
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
    this.rug = this.add.graphics(); this.ornaments = this.add.graphics(); this.setDecoration(this.decoration, this.roomItems);
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
