import Phaser from 'phaser';
import './style.css';
import './retro.css';
import './navigation.css';
import { BootScene } from './game/scenes/BootScene';
import { RoomScene } from './game/scenes/RoomScene';
import { CatchScene } from './game/scenes/CatchScene';
import { decorations } from './domain/shop';
import { api } from './services/api';
import type { PetAction, PetState } from './domain/pet';
import { characters, questions } from './domain/onboarding';
import { touchReaction } from './domain/reaction';
import { PetSound } from './services/petSound';
import { petLine, touchLine } from './domain/dialogue';
import { friendshipLevel, friendshipLevels, friendshipLine } from './domain/friendship';

let gameInstance: Phaser.Game | undefined;
const petSound = new PetSound();
try { petSound.muted = localStorage.getItem('monster-pet:muted') === 'true'; } catch { /* Default sound preference. */ }
const card = document.querySelector<HTMLElement>('.pet-card')!;
const footer = document.querySelector<HTMLElement>('footer')!;
function startRoom(): void {
card.hidden = false; footer.hidden = false;
const store = api;
const character = characters[store.snapshot.kind];
document.title = `Monster Pet — ${character.name}`;
document.querySelector('.badge')!.textContent = character.name.toUpperCase();
document.querySelector('.room-top > div')!.textContent = `КОМНАТА · ${character.name.toUpperCase()}`;
document.querySelector('footer > span')!.textContent = `${character.name.toUpperCase()} · ${character.trait.toUpperCase()}`;
document.querySelector('#game')!.setAttribute('aria-label', `Комната с питомцем ${character.name}`);
const room = new RoomScene(store.snapshot.kind);
let wallet = api.state.wallet;
room.setDecoration(wallet.equipped);
const balance = document.createElement('div'); balance.className = 'wallet-bar'; balance.setAttribute('aria-live', 'polite');
document.querySelector('.room-top')!.after(balance);
const friendshipPanel = document.createElement('section'); friendshipPanel.className = 'friendship-panel'; balance.after(friendshipPanel);
const friendshipNotice = document.createElement('p'); friendshipNotice.className = 'friendship-notice'; friendshipNotice.setAttribute('role', 'status'); friendshipPanel.after(friendshipNotice);
function renderFriendship(): void {
  const progress = api.state.friendship;
  const day = api.state.serverTime.slice(0, 10);
  const dailyXp = progress.day === day ? progress.dailyXp : 0;
  const level = friendshipLevel(progress.xp);
  const current = friendshipLevels[level]; const next = friendshipLevels[level + 1];
  const earned = progress.xp - current.xp; const needed = next ? next.xp - current.xp : 1;
  friendshipPanel.innerHTML = `<div class="friendship-heading"><span>♥ ДРУЖБА · УР. ${level + 1}</span><strong>${current.title}</strong></div><progress aria-label="Опыт дружбы" max="${needed}" value="${next ? earned : 1}"></progress><p>${next ? `${earned} / ${needed} XP до следующего уровня` : 'Вы лучшие друзья!'} · Сегодня ${dailyXp}/50 XP</p><small>Забота +5 XP, раунд +10 XP. До 3 раз каждого вида в сутки UTC. За полную шкалу и простые касания опыт не начисляется.</small>`;
}
renderFriendship();
const shop = document.createElement('section'); shop.className = 'shop arcade';
const shopMessage = document.createElement('p'); shopMessage.className = 'shop-message'; shopMessage.setAttribute('aria-live', 'polite');
async function changeDecoration(path: string, item: string | null, message: string): Promise<void> {
  shop.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try { await api.mutate(path, { item }); wallet = api.state.wallet; room.setDecoration(wallet.equipped); shopMessage.textContent = message; }
  catch (error) { wallet = api.state.wallet; shopMessage.textContent = error instanceof Error ? error.message : 'Не удалось выполнить покупку'; }
  renderEconomy();
}
function renderEconomy(): void {
  renderFriendship();
  balance.textContent = `◆ ${wallet.coins} МОНЕТ`;
  shop.replaceChildren();
  const title = document.createElement('h2'); title.textContent = 'ЛАВКА ВРЕДИНЫ'; shop.append(title);
  const info = document.createElement('p'); info.textContent = 'Зарабатывай монеты в мини-игре. Купленный ковёр можно менять бесплатно.'; shop.append(info);
  for (const item of decorations) {
    const owned = wallet.owned?.includes(item.id);
    const button = document.createElement('button');
    button.textContent = `${item.name} · ${wallet.equipped === item.id ? 'Надет ✓' : owned ? 'Постелить' : `${item.price} монет`}`;
    button.disabled = wallet.equipped === item.id || (!owned && wallet.coins < item.price);
    button.onclick = () => { void changeDecoration(owned ? '/shop/equip' : '/shop/buy', item.id, owned ? 'Ковёр заменён.' : 'Покупка сохранена на сервере. Новый ковёр уже в комнате!'); };
    shop.append(button);
  }
  const reset = document.createElement('button'); reset.textContent = 'Обычный ковёр · бесплатно'; reset.disabled = !wallet.equipped;
  reset.onclick = () => { void changeDecoration('/shop/equip', null, 'Обычный ковёр возвращён.'); };
  shop.append(reset, shopMessage);
}
renderEconomy();
const arcade = document.createElement('section'); arcade.className = 'arcade';
arcade.innerHTML = '<h2>ЛОВИ ВКУСНЯШКИ</h2><p>30 секунд. Лови печенье (+1), избегай носков (−2). Двигай пальцем или стрелками ← →.</p><p>Монеты за первые 3 результативных раунда в сутки (UTC): 1–7 очков → 5, 8–14 → 10, от 15 → 15.</p><p class="arcade-result" aria-live="polite"></p><button type="button">▶ Начать раунд</button>';
card.append(arcade);
card.append(shop);
const launch = arcade.querySelector('button')!;
const resultLine = arcade.querySelector<HTMLElement>('.arcade-result')!;
resultLine.textContent = `Монеты: ${wallet.coins}`;
let runId = '';
let pendingScore: number | null = null;
async function submitScore(score: number): Promise<void> {
  launch.disabled = true;
  try {
    const reply = await api.mutate('/minigames/finish', { runId, score }); wallet = api.state.wallet; renderEconomy();
    resultLine.textContent = `Поймано: ${score} · Награда: +${reply.reward ?? 0} монет · +${reply.xpGain ?? 0} XP`;
    friendshipNotice.textContent = reply.levelUp ? `Новый уровень дружбы! ${friendshipLine(store.snapshot.kind, api.state.friendship.xp)}` : reply.xpGain ? `Дружба +${reply.xpGain} XP` : '';
    pendingScore = null; launch.textContent = '▶ Ещё раунд';
    speech.textContent = petLine(store.snapshot.kind, score > 0 ? 'gameWin' : 'gameLose');
  } catch (error) {
    pendingScore = score; resultLine.textContent = error instanceof Error ? error.message : 'Результат не отправлен'; launch.textContent = '↻ Отправить результат ещё раз';
  } finally {
    buttons.forEach(item => { item.disabled = false; }); launch.disabled = false;
    navigation.querySelectorAll('button').forEach(button => { button.disabled = false; });
  }
}
const minigame = new CatchScene(store.snapshot.kind, score => { pendingScore = score; resultLine.textContent = 'Сохраняем результат…'; void submitScore(score); });
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'game', width: 400, height: 320, backgroundColor: '#eee4d3', pixelArt: true, roundPixels: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [BootScene, room, minigame], audio: { noAudio: true } });
gameInstance = game;
const stats = document.querySelector<HTMLDivElement>('#stats')!;
const speech = document.querySelector<HTMLParagraphElement>('#speech')!;
speech.textContent = friendshipLine(store.snapshot.kind, api.state.friendship.xp);
document.querySelector('#save-status')!.textContent = 'Прогресс хранится на сервере';
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action]'));
const audioStatus = document.createElement('p'); audioStatus.className = 'touch-hint'; audioStatus.setAttribute('role', 'status');
async function playPetSound(angry: boolean): Promise<void> {
  if (petSound.muted) return;
  const started = await petSound.play(angry);
  audioStatus.textContent = started ? '' : 'Браузер не запустил звук. Попробуй нажать на монстрика ещё раз.';
}
const touchHint = document.createElement('p'); touchHint.className = 'touch-hint'; touchHint.textContent = 'Нажми на монстрика. Если любая шкала ниже 30 — берегись!'; speech.after(touchHint, audioStatus);
room.onPetTouch = () => {
  if (buttons.some(button => button.disabled)) return;
  const angry = touchReaction(store.snapshot) === 'attack';
  if (!room.touch(angry, () => { buttons.forEach(button => { button.disabled = false; }); })) return;
  buttons.forEach(button => { button.disabled = true; });
  void playPetSound(angry);
  speech.textContent = !angry && friendshipLevel(api.state.friendship.xp) > 0 ? friendshipLine(store.snapshot.kind, api.state.friendship.xp) : touchLine(store.snapshot);
};
const navigation = document.createElement('nav'); navigation.className = 'app-navigation'; navigation.setAttribute('aria-label', 'Разделы игры');
const views = [
  { id: 'home', label: 'Дом', icon: '<path d="M3 11 12 3l9 8v10h-6v-7H9v7H3Z"/>' },
  { id: 'games', label: 'Игры', icon: '<path d="M7 7h10c3 0 5 11 3 12-2 1-4-3-5-3H9c-1 0-3 4-5 3C2 18 4 7 7 7Z"/><path d="M8 9v5m-2-2h4m6-1h.01m2 2h.01"/>' },
  { id: 'shop', label: 'Магазин', icon: '<path d="M4 9h16l-1 12H5L4 9Zm4 0V7a4 4 0 0 1 8 0v2"/>' },
] as const;
function selectView(id: typeof views[number]['id']): void {
  arcade.hidden = id !== 'games'; shop.hidden = id !== 'shop';
  stats.hidden = id !== 'home'; speech.hidden = id !== 'home';
  touchHint.hidden = id !== 'home'; audioStatus.hidden = id !== 'home';
  document.querySelector<HTMLElement>('.actions')!.hidden = id !== 'home';
  document.querySelector<HTMLElement>('#game')!.hidden = id === 'shop';
  for (const button of Array.from(navigation.querySelectorAll('button'))) {
    const selected = button.dataset.view === id;
    button.setAttribute('aria-pressed', String(selected));
    if (selected) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  }
  if (id !== 'shop') requestAnimationFrame(() => game.scale.refresh());
}
for (const view of views) {
  const button = document.createElement('button'); button.type = 'button'; button.dataset.view = view.id;
  button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${view.icon}</svg><span>${view.label}</span>`;
  button.onclick = () => selectView(view.id); navigation.append(button);
}
document.body.append(navigation); document.body.classList.add('has-navigation'); selectView('home');
function render(state: PetState): void {
  stats.replaceChildren(...(['satiety', 'mood', 'energy'] as const).map((key, i) => {
    const item = document.createElement('div'); item.className = `stat stat-${key}`;
    const label = ['Сытость', 'Настроение', 'Энергия'][i];
    item.innerHTML = `<div>${label}<b>${state[key]}<small>/100</small></b></div><progress aria-label="${label}" max="100" value="${state[key]}"></progress>`;
    return item;
  }));
}
render(store.snapshot);
launch.addEventListener('click', async () => {
  if (pendingScore !== null) { await submitScore(pendingScore); return; }
  if (!room.scene.isActive() || buttons.some(button => button.disabled)) return;
  buttons.forEach(item => { item.disabled = true; }); launch.disabled = true;
  navigation.querySelectorAll('button').forEach(button => { button.disabled = true; });
  try {
  const reply = await api.mutate('/minigames/start'); runId = reply.runId!;
  resultLine.textContent = 'Раунд идёт! Печенье +1 · Носок −2';
  speech.textContent = petLine(store.snapshot.kind, 'gameStart');
  room.scene.start('Catch');
  } catch (error) {
    resultLine.textContent = error instanceof Error ? error.message : 'Не удалось начать раунд';
    buttons.forEach(item => { item.disabled = false; }); launch.disabled = false;
    navigation.querySelectorAll('button').forEach(button => { button.disabled = false; });
  }
});
buttons.forEach(button => button.addEventListener('click', async () => {
  const action = button.dataset.action as PetAction;
  buttons.forEach(item => { item.disabled = true; });
  try {
    const result = await store.act(action); render(result.state); speech.textContent = petLine(store.snapshot.kind, action);
    renderFriendship();
    friendshipNotice.textContent = result.levelUp ? `Новый уровень дружбы! ${friendshipLine(store.snapshot.kind, api.state.friendship.xp)}` : result.xpGain ? `Дружба +${result.xpGain} XP` : 'За это действие опыт уже не начисляется. Шкалы всё равно восстанавливаются.';
    document.querySelector('#save-status')!.textContent = 'Прогресс сохранён на сервере';
    if (!room.perform(action, () => { buttons.forEach(item => { item.disabled = false; }); })) buttons.forEach(item => { item.disabled = false; });
  } catch (error) {
    render(store.snapshot); speech.textContent = error instanceof Error ? error.message : 'Действие не сохранено'; buttons.forEach(item => { item.disabled = false; });
  }
}));
}

function showOnboarding(): void {
  card.hidden = true; footer.hidden = true;
  document.querySelector('.badge')!.textContent = 'ЗНАКОМСТВО';
  const panel = document.createElement('section'); panel.className = 'quiz';
  card.before(panel);
  const answers: number[] = [];
  function showQuestion(): void {
    const question = questions[answers.length];
    panel.innerHTML = `<p class="eyebrow">ВОПРОС ${answers.length + 1} ИЗ 4</p><h2>${question.title}</h2><p class="quiz-hint">Ответы влияют на шанс, но монстрик выпадет случайно. Каждый может стать твоим!</p><div class="quiz-answers"></div>`;
    question.answers.forEach((answer, index) => {
      const button = document.createElement('button'); button.textContent = answer;
      button.onclick = () => { answers.push(index); if (answers.length === questions.length) reveal(); else showQuestion(); };
      panel.querySelector('.quiz-answers')!.append(button);
    });
    if (answers.length) {
      const back = document.createElement('button'); back.textContent = '← Назад'; back.className = 'quiz-back';
      back.onclick = () => { answers.pop(); showQuestion(); }; panel.append(back);
    }
    panel.querySelector('button')?.focus({ preventScroll: true });
  }
  async function reveal(): Promise<void> {
    panel.innerHTML = '<p class="quiz-hint">Знакомим с твоим монстриком…</p>';
    try { await api.mutate('/onboarding', { answers }); }
    catch (error) {
      panel.replaceChildren(); const message = document.createElement('p'); message.textContent = error instanceof Error ? error.message : 'Нет связи';
      const retry = document.createElement('button'); retry.textContent = 'Повторить'; retry.onclick = () => { void reveal(); }; panel.append(message, retry); return;
    }
    const kind = api.snapshot.kind;
    const character = characters[kind];
    panel.innerHTML = `<p class="eyebrow">ТВОЙ МАЛЕНЬКИЙ ВРЕДИНА</p><h2>${character.name}</h2><p>${character.trait}</p><blockquote>«${character.quote}»</blockquote><p class="quiz-hint">Знакомство сохранено на сервере. Монстрик будет ждать тебя при следующем входе.</p>`;
    const enter = document.createElement('button'); enter.textContent = 'Познакомиться поближе →';
    enter.onclick = () => {
      panel.remove(); startRoom();
    };
    panel.append(enter); enter.focus({ preventScroll: true });
  }
  showQuestion();
}
async function bootstrap(): Promise<void> {
  card.hidden = true; footer.hidden = true;
  const loading = document.createElement('section'); loading.className = 'quiz'; loading.textContent = 'Загружаем питомца с сервера…'; card.before(loading);
  try { await api.connect(); loading.remove(); if (api.state.pet) startRoom(); else showOnboarding(); }
  catch (error) {
    loading.replaceChildren(); const message = document.createElement('p'); message.textContent = error instanceof Error ? error.message : 'Сервер недоступен';
    const retry = document.createElement('button'); retry.textContent = 'Повторить подключение'; retry.onclick = () => { loading.remove(); void bootstrap(); }; loading.append(message, retry);
  }
}
void bootstrap();
if (import.meta.hot) import.meta.hot.dispose(() => { gameInstance?.destroy(true); petSound.close(); });
