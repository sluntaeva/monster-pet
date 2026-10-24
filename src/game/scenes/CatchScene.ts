import Phaser from 'phaser';
import { Monster } from '../entities/Monster';
import type { PetKind } from '../../domain/onboarding';
import { ROUND_SECONDS } from '../../domain/catchGame';

interface Drop { sprite: Phaser.GameObjects.Container; bad: boolean; speed: number }
export class CatchScene extends Phaser.Scene {
  private pet!: Monster;
  private drops: Drop[] = [];
  private elapsed = 0;
  private spawnElapsed = 0;
  private score = 0;
  private finished = false;
  private hud!: Phaser.GameObjects.Text;
  private arrows?: Phaser.Types.Input.Keyboard.CursorKeys;
  constructor(private kind: PetKind, private onFinish: (score: number) => void, private onCatch: (bad: boolean) => void = () => {}) { super('Catch'); }
  create(): void {
    this.drops = []; this.elapsed = 0; this.spawnElapsed = 0; this.score = 0; this.finished = false;
    this.cameras.main.setBackgroundColor('#1d2538');
    const g = this.add.graphics();
    g.fillStyle(0x55617b); for (let i = 0; i < 28; i++) g.fillRect((i * 73 + 19) % 396, (i * 47 + 13) % 245, 3, 3);
    g.fillStyle(0x343c51); g.fillRect(0, 280, 400, 40);
    g.fillStyle(0xa6e3a1); g.fillRect(0, 280, 400, 4);
    this.pet = new Monster(this, 200, 280, this.kind); this.pet.setScale(.45);
    this.hud = this.add.text(14, 12, '', { fontFamily: 'monospace', fontSize: '17px', color: '#f6cf79', backgroundColor: '#101421', padding: { x: 8, y: 6 } }).setDepth(10);
    this.arrows = this.input.keyboard?.createCursorKeys();
    const move = (pointer: Phaser.Input.Pointer) => { if (!this.finished) this.pet.x = Phaser.Math.Clamp(pointer.x, 32, 368); };
    this.input.on('pointerdown', move);
    this.input.on('pointermove', move);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.input.off('pointerdown', move); this.input.off('pointermove', move); this.drops = []; });
    this.updateHud();
  }
  private updateHud(): void { this.hud.setText(`ПЕЧЕНЬЕ: ${this.score}   ВРЕМЯ: ${Math.max(0, Math.ceil(ROUND_SECONDS - this.elapsed))}`); }
  private spawn(): void {
    const bad = Math.random() < .24;
    const sprite = this.add.container(Phaser.Math.Between(24, 376), -18);
    const art = this.add.graphics();
    if (bad) {
      art.fillStyle(0xb7a1ed); art.fillRect(-7, -12, 13, 19); art.fillRect(-7, 3, 21, 10);
      art.fillStyle(0xf6e6ba); art.fillRect(-7, -12, 13, 4); art.fillRect(7, 7, 7, 6);
    } else {
      art.fillStyle(0x9b6440); art.fillRect(-11, -8, 22, 16); art.fillRect(-7, -12, 14, 24);
      art.fillStyle(0xf6cf79); art.fillRect(-8, -7, 16, 14); art.fillRect(-5, -10, 10, 20);
      art.fillStyle(0x684333); art.fillRect(-5, -5, 4, 4); art.fillRect(3, 0, 4, 4); art.fillRect(-4, 5, 3, 3);
    }
    sprite.add(art); this.drops.push({ sprite, bad, speed: Phaser.Math.Between(105, 150) + this.elapsed * 2 });
  }
  update(_time: number, delta: number): void {
    if (this.finished) return;
    // Ignore long frame gaps so returning from a hidden tab cannot skip a whole round.
    const seconds = Math.min(delta, 80) / 1000;
    this.elapsed += seconds;
    if (this.elapsed >= ROUND_SECONDS) { this.finish(); return; }
    const direction = Number(this.arrows?.right.isDown ?? false) - Number(this.arrows?.left.isDown ?? false);
    this.pet.x = Phaser.Math.Clamp(this.pet.x + direction * seconds * 300, 32, 368);
    this.spawnElapsed += seconds;
    if (this.spawnElapsed >= .6) { this.spawnElapsed = 0; this.spawn(); }
    this.drops = this.drops.filter(drop => {
      drop.sprite.y += drop.speed * seconds;
      if (drop.sprite.y >= 232 && drop.sprite.y <= 286 && Math.abs(drop.sprite.x - this.pet.x) < 35) {
        this.score = Math.max(0, this.score + (drop.bad ? -2 : 1));
        this.onCatch(drop.bad);
        if (drop.bad) this.cameras.main.shake(90, .004);
        drop.sprite.destroy(); return false;
      }
      if (drop.sprite.y > 330) { drop.sprite.destroy(); return false; }
      return true;
    });
    this.updateHud();
  }
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.onFinish(this.score);
    this.scene.start('Room');
  }
}
