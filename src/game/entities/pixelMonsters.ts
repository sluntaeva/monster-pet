import Phaser from 'phaser';
import type { PetKind } from '../../domain/onboarding';
export type Expression = 'idle' | 'happy' | 'angry' | 'feed' | 'sleep';
export function monsterTexture(scene: Phaser.Scene, kind: PetKind, expression: Expression): string {
  const key = `monster-v2:${kind}:${expression}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 });
  const rect = (color: number, x: number, y: number, w: number, h: number) => { g.fillStyle(color); g.fillRect(x, y, w, h); };
  const ink = 0x292535; const white = 0xfff0cd;
  let eyeY = 16;
  if (kind === 'buba') {
    rect(ink, 5, 2, 5, 10); rect(ink, 22, 2, 5, 10);
    rect(0xc6b0ef, 6, 3, 3, 6); rect(0xc6b0ef, 23, 3, 3, 6);
    rect(ink, 3, 9, 26, 19); rect(ink, 1, 15, 30, 9);
    rect(0x9474d7, 5, 10, 22, 16); rect(0x9474d7, 2, 16, 28, 6);
    rect(0xbba0ed, 6, 11, 19, 3); rect(0xbba0ed, 5, 14, 3, 8);
    rect(ink, 6, 27, 7, 4); rect(ink, 20, 27, 7, 4);
  } else if (kind === 'zhuzha') {
    rect(ink, 8, 0, 3, 10); rect(ink, 22, 0, 3, 9);
    rect(0xffe393, 5, 0, 5, 3); rect(0xffe393, 24, 0, 5, 3);
    // Angular silhouette, asymmetric zigzag arms and pointed feet.
    rect(ink, 12, 6, 9, 4); rect(ink, 8, 10, 17, 5); rect(ink, 6, 15, 21, 9); rect(ink, 10, 24, 13, 4);
    rect(0xe9ad43, 12, 8, 8, 4); rect(0xe9ad43, 10, 12, 13, 11); rect(0xe9ad43, 8, 16, 17, 6);
    rect(0xffda75, 11, 12, 3, 8); rect(ink, 2, 13, 6, 3); rect(ink, 1, 10, 3, 4); rect(ink, 26, 20, 5, 3);
    rect(ink, 9, 27, 4, 5); rect(ink, 21, 26, 4, 6);
  } else if (kind === 'plyukh') {
    eyeY = 21;
    rect(ink, 8, 14, 17, 4); rect(ink, 3, 18, 26, 5); rect(ink, 0, 23, 32, 7); rect(ink, 5, 29, 23, 3);
    rect(0x72b8cf, 8, 16, 16, 4); rect(0x72b8cf, 4, 20, 24, 8); rect(0x72b8cf, 2, 24, 28, 4);
    rect(0xa3d9dd, 8, 18, 15, 2); rect(0xa3d9dd, 4, 21, 3, 5);
    rect(0x4a8fae, 2, 27, 8, 2); rect(0x4a8fae, 24, 27, 6, 2);
  } else {
    eyeY = 12;
    rect(ink, 10, 3, 12, 3); rect(ink, 5, 6, 22, 4); rect(ink, 2, 10, 28, 16); rect(ink, 5, 26, 22, 3);
    rect(0x8db967, 10, 5, 12, 3); rect(0x8db967, 6, 8, 20, 17); rect(0x8db967, 4, 12, 24, 12);
    rect(0xb9d785, 8, 8, 14, 3); rect(0xb9d785, 5, 12, 3, 7);
    rect(ink, 5, 29, 6, 3); rect(ink, 22, 29, 6, 3);
    rect(ink, 9, 19, 15, 6); rect(white, 10, 19, 4, 2); rect(white, 19, 19, 4, 2); rect(0xd7858c, 14, 23, 5, 2);
  }
  const left = kind === 'zhuzha' ? 10 : 8;
  const right = kind === 'zhuzha' ? 19 : 21;
  if (expression === 'sleep' || expression === 'happy') {
    rect(ink, left, eyeY + 2, 5, 2); rect(ink, right, eyeY + 2, 5, 2);
    if (expression === 'happy') { rect(ink, left + 1, eyeY + 1, 3, 1); rect(ink, right + 1, eyeY + 1, 3, 1); }
  } else {
    rect(white, left, eyeY, 5, 5); rect(white, right, eyeY, 5, 5);
    rect(ink, left + 2, eyeY + 1, 2, 3); rect(ink, right + 1, eyeY + 1, 2, 3);
    if (kind === 'plyukh' && expression === 'idle') { rect(0x4a8fae, left, eyeY, 5, 3); rect(0x4a8fae, right, eyeY, 5, 3); }
  }
  if (expression === 'angry') {
    rect(ink, left - 1, eyeY - 3, 3, 2); rect(ink, left + 2, eyeY - 2, 4, 2);
    rect(ink, right - 1, eyeY - 2, 3, 2); rect(ink, right + 2, eyeY - 3, 4, 2);
  } else if (kind === 'buba' && expression === 'idle') {
    rect(ink, left - 1, eyeY - 3, 6, 2); rect(ink, right, eyeY - 4, 5, 2);
  }
  if (kind !== 'nyam') {
    const mouthY = kind === 'plyukh' ? 27 : 24;
    rect(ink, 15, mouthY, expression === 'feed' ? 6 : 4, expression === 'feed' ? 4 : 2);
  }
  if (expression === 'feed' && kind === 'nyam') { rect(0xa8cd7a, 2, 17, 7, 8); rect(0xa8cd7a, 24, 17, 7, 8); }
  if (expression === 'happy') { rect(0xe8a3b6, left - 2, eyeY + 5, 3, 2); rect(0xe8a3b6, right + 3, eyeY + 5, 3, 2); }
  g.generateTexture(key, 32, 32); g.destroy();
  return key;
}
