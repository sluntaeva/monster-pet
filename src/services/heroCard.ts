import { characters, type PetKind } from '../domain/onboarding';
import { friendshipLevel, friendshipLevels } from '../domain/friendship';

export function createHeroCard(kind: PetKind, xp: number, sprite: CanvasImageSource): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 800;
  const ctx = canvas.getContext('2d')!;
  const hero = characters[kind]; const level = friendshipLevel(xp);
  ctx.fillStyle = '#161b29'; ctx.fillRect(0, 0, 640, 800);
  ctx.strokeStyle = '#30364e';
  for (let x = 0; x < 640; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 800); ctx.stroke(); }
  for (let y = 0; y < 800; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
  ctx.strokeStyle = '#b7a1ed'; ctx.lineWidth = 4; ctx.strokeRect(22, 22, 596, 756);
  ctx.textAlign = 'center'; ctx.fillStyle = '#f6cf79'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('MONSTER PET', 320, 72);
  ctx.fillStyle = '#bfc3d3'; ctx.font = '18px sans-serif'; ctx.fillText('МОЙ МАЛЕНЬКИЙ ВРЕДИНА', 320, 110);
  ctx.fillStyle = '#262c44'; ctx.fillRect(112, 144, 416, 300);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(sprite, 192, 166, 256, 256);
  ctx.fillStyle = '#f6e6ba'; ctx.font = 'bold 48px sans-serif'; ctx.fillText(hero.name, 320, 510);
  ctx.fillStyle = '#bfc3d3'; ctx.font = '23px sans-serif'; ctx.fillText(hero.trait, 320, 550);
  ctx.fillStyle = '#b7a1ed'; ctx.font = '21px sans-serif';
  const words = `«${hero.quote}»`.split(' '); let line = ''; let y = 598;
  for (const word of words) {
    if (ctx.measureText(`${line} ${word}`).width > 520) { ctx.fillText(line, 320, y); y += 28; line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  ctx.fillText(line, 320, y);
  ctx.fillStyle = '#a6e3a1'; ctx.font = 'bold 23px sans-serif'; ctx.fillText(`Дружба · уровень ${level + 1}`, 320, 700);
  ctx.font = '20px sans-serif'; ctx.fillText(`${friendshipLevels[level].title} · ${xp} XP`, 320, 738);
  return canvas;
}

export function showHeroCard(kind: PetKind, xp: number, sprite: CanvasImageSource): void {
  if (document.querySelector('.hero-card-dialog')) return;
  const canvas = createHeroCard(kind, xp, sprite);
  const dialog = document.createElement('dialog'); dialog.className = 'hero-card-dialog';
  dialog.setAttribute('aria-label', `Карточка монстрика ${characters[kind].name}`);
  const close = document.createElement('button'); close.textContent = 'Закрыть'; close.className = 'hero-card-close';
  const image = document.createElement('img'); image.src = canvas.toDataURL('image/png'); image.alt = `${characters[kind].name}, ${characters[kind].trait}, уровень дружбы ${friendshipLevel(xp) + 1}`;
  const actions = document.createElement('div'); actions.className = 'hero-card-actions';
  const save = document.createElement('button'); save.textContent = 'Сохранить PNG';
  save.onclick = () => {
    const link = document.createElement('a'); link.href = image.src; link.download = `monster-pet-${kind}.png`;
    document.body.append(link); link.click(); link.remove();
  };
  const share = document.createElement('button'); share.textContent = 'Поделиться'; share.disabled = true;
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  status.textContent = 'Сохрани картинку и отправь другу. На телефоне можно также удерживать изображение.';
  canvas.toBlob(blob => {
    if (!blob || !dialog.isConnected) return;
    const file = new File([blob], `monster-pet-${kind}.png`, { type: 'image/png' });
    if (!navigator.canShare?.({ files: [file] })) { share.hidden = true; return; }
    share.disabled = false;
    share.onclick = async () => {
      try { await navigator.share({ files: [file], title: `Мой монстрик — ${characters[kind].name}` }); }
      catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) status.textContent = 'Не удалось отправить. Сохрани PNG и отправь картинку вручную.'; }
    };
  }, 'image/png');
  actions.append(save, share); dialog.append(close, image, actions, status); document.body.append(dialog);
  close.onclick = () => dialog.close(); dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal(); close.focus();
}
