import Phaser from 'phaser';
import type { PetAction } from '../../domain/pet';
import type { PetKind } from '../../domain/onboarding';
import { monsterTexture, type Expression } from './pixelMonsters';

type Pose = { x?: number; y?: number; angle?: number; scaleX?: number; scaleY?: number; duration: number; repeat?: number; expression: Expression; effect?: string };
export class Monster extends Phaser.GameObjects.Container {
  private bodySprite: Phaser.GameObjects.Image;
  private idle: Phaser.Tweens.Tween;
  private baseline = 5;
  constructor(scene: Phaser.Scene, x: number, y: number, private kind: PetKind = 'buba') {
    super(scene, x, y);
    this.bodySprite = scene.add.image(0, 0, monsterTexture(scene, kind, 'idle')).setScale(this.baseline).setOrigin(.5, 1);
    this.add(this.bodySprite); scene.add.existing(this);
    const motions = {
      buba: { y: -3, angle: -1, duration: 1500, scaleX: 5, scaleY: 5.04 },
      zhuzha: { y: -13, angle: 4, duration: 300, scaleX: 4.85, scaleY: 5.1 },
      plyukh: { y: 0, angle: 0, duration: 1900, scaleX: 5.18, scaleY: 4.8 },
      nyam: { y: -7, angle: -2, duration: 650, scaleX: 5.12, scaleY: 4.88 },
    };
    this.idle = scene.tweens.add({ targets: this.bodySprite, ...motions[kind], yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  private animate(pose: Pose, done: () => void, resumeIdle = true): void {
    this.idle.pause();
    this.bodySprite.setPosition(0, 0).setAngle(0).setScale(this.baseline).setTexture(monsterTexture(this.scene, this.kind, pose.expression));
    if (pose.effect) {
      const effect = this.scene.add.text(0, this.kind === 'plyukh' ? -115 : -175, pose.effect, { fontFamily: 'monospace', fontSize: '26px', color: '#f6cf79', stroke: '#292535', strokeThickness: 3 }).setOrigin(.5);
      this.add(effect);
      this.scene.tweens.add({ targets: effect, y: effect.y - 26, alpha: 0, duration: pose.duration * 2 * ((pose.repeat ?? 1) + 1), onComplete: () => effect.destroy() });
    }
    const { expression: _expression, effect: _effect, ...motion } = pose;
    this.scene.tweens.add({ targets: this.bodySprite, ...motion, yoyo: true, repeat: pose.repeat ?? 1, ease: 'Sine.easeInOut', onComplete: () => {
      this.bodySprite.setPosition(0, 0).setAngle(0).setScale(this.baseline).setTexture(monsterTexture(this.scene, this.kind, 'idle'));
      if (resumeIdle) this.idle.restart();
      done();
    } });
  }
  private sequence(poses: Pose[], done: () => void): void {
    let index = 0;
    const next = () => {
      const pose = poses[index++];
      this.animate(pose, index === poses.length ? done : next, index === poses.length);
    };
    next();
  }
  react(action: PetAction, done: () => void): void {
    const stories: Record<PetKind, Record<PetAction, Pose[]>> = {
      buba: {
        feed: [
          { x: -15, angle: -10, duration: 230, repeat: 0, expression: 'angry', effect: '…' },
          { x: 7, scaleX: 5.15, duration: 160, repeat: 2, expression: 'feed' },
          { y: -6, duration: 230, repeat: 0, expression: 'happy', effect: '♥' },
        ],
        play: [
          { scaleY: 4.65, duration: 220, repeat: 0, expression: 'idle', effect: '?' },
          { y: -28, angle: -5, duration: 230, repeat: 1, expression: 'happy' },
        ],
        rest: [
          { x: -6, angle: -5, duration: 250, repeat: 0, expression: 'idle' },
          { scaleY: 4.6, duration: 420, repeat: 1, expression: 'sleep', effect: 'z' },
        ],
      },
      zhuzha: {
        feed: [
          { y: -24, angle: 10, duration: 130, repeat: 1, expression: 'happy', effect: '!' },
          { angle: -9, scaleX: 5.2, duration: 110, repeat: 3, expression: 'feed' },
        ],
        play: [
          { scaleY: 4.4, scaleX: 5.3, duration: 110, repeat: 0, expression: 'happy' },
          { y: -60, angle: 360, duration: 290, repeat: 0, expression: 'happy', effect: 'УРА!' },
          { y: -12, angle: 10, duration: 100, repeat: 2, expression: 'happy' },
        ],
        rest: [
          { x: 12, angle: 8, duration: 100, repeat: 2, expression: 'idle', effect: 'z?' },
          { scaleY: 4.6, duration: 350, repeat: 1, expression: 'sleep', effect: 'z' },
        ],
      },
      plyukh: {
        feed: [
          { x: 7, duration: 420, repeat: 0, expression: 'idle', effect: '…' },
          { scaleX: 5.25, scaleY: 4.8, duration: 350, repeat: 1, expression: 'feed' },
        ],
        play: [
          { angle: -4, duration: 380, repeat: 0, expression: 'idle', effect: '?' },
          { x: 15, y: -4, duration: 500, repeat: 0, expression: 'happy' },
          { scaleY: 4.7, duration: 280, repeat: 0, expression: 'sleep', effect: 'z' },
        ],
        rest: [
          { scaleY: 4.6, scaleX: 5.3, duration: 400, repeat: 0, expression: 'sleep' },
          { scaleX: 5.6, scaleY: 4.2, duration: 500, repeat: 1, expression: 'sleep', effect: 'zzz' },
        ],
      },
      nyam: {
        feed: [
          { y: -20, scaleX: 5.2, duration: 150, repeat: 0, expression: 'feed', effect: 'АМ!' },
          { scaleX: 5.8, scaleY: 5.1, angle: 3, duration: 160, repeat: 3, expression: 'feed' },
          { y: -18, duration: 210, repeat: 0, expression: 'happy', effect: '♥' },
        ],
        play: [
          { scaleX: 5.5, scaleY: 4.5, duration: 140, repeat: 0, expression: 'happy' },
          { y: -40, scaleX: 4.8, scaleY: 5.15, duration: 200, repeat: 2, expression: 'happy', effect: '!' },
        ],
        rest: [
          { scaleX: 5.3, duration: 180, repeat: 1, expression: 'feed', effect: '…' },
          { angle: 9, scaleX: 5.3, scaleY: 4.7, duration: 380, repeat: 1, expression: 'sleep', effect: 'z' },
        ],
      },
    };
    this.sequence(stories[this.kind][action], done);

  }
  onTouch(callback: () => void): void { this.bodySprite.setInteractive({ useHandCursor: true }).on('pointerdown', callback); }
  touch(angry: boolean, done: () => void): void {
    const poses: Record<PetKind, Pose> = angry ? {
      buba: { x: -10, y: 10, angle: -8, scaleX: 5.25, duration: 170, expression: 'angry', effect: '!' },
      zhuzha: { y: -18, angle: 19, scaleX: 5.4, duration: 100, repeat: 3, expression: 'angry', effect: '!!' },
      plyukh: { x: 13, scaleX: 5.35, scaleY: 4.7, duration: 430, expression: 'angry', effect: '…!' },
      nyam: { y: 12, scaleX: 5.6, scaleY: 5.25, duration: 140, repeat: 2, expression: 'angry', effect: 'АМ!' },
    } : {
      buba: { x: 6, y: -5, angle: 3, duration: 420, expression: 'happy', effect: '♥' },
      zhuzha: { y: -36, angle: 14, duration: 140, repeat: 3, expression: 'happy', effect: '♥!' },
      plyukh: { scaleX: 5.25, scaleY: 4.8, duration: 650, expression: 'happy', effect: '♥' },
      nyam: { y: -18, scaleX: 5.4, scaleY: 4.85, duration: 240, repeat: 2, expression: 'happy', effect: '♥' },
    };
    if (angry && this.kind !== 'plyukh') this.scene.cameras.main.shake(100, .003);
    const anticipation: Record<PetKind, Pose> = {
      buba: { x: angry ? -8 : 4, scaleY: 4.8, duration: 200, repeat: 0, expression: angry ? 'angry' : 'idle' },
      zhuzha: { scaleX: 5.3, scaleY: 4.4, duration: 90, repeat: 0, expression: angry ? 'angry' : 'happy' },
      plyukh: { angle: -3, duration: 350, repeat: 0, expression: 'idle' },
      nyam: { scaleX: 5.4, scaleY: 4.8, duration: 150, repeat: 0, expression: angry ? 'angry' : 'feed' },
    };
    this.sequence([anticipation[this.kind], poses[this.kind]], done);
  }
}
