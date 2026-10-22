import type { PetAction, PetState } from '../domain/pet';
import { emptyWallet, type Wallet } from '../domain/catchGame';
import { initialFriendship, type Friendship } from '../domain/friendship';
import { prepareTelegram } from './telegram';
export interface ServerState { pet: PetState | null; wallet: Wallet; friendship: Friendship; version: number; serverTime: string }
interface Reply { state: ServerState; runId?: string; reward?: number; xpGain?: number; levelUp?: boolean }
export class RequestError extends Error { constructor(public status: number, message: string) { super(message); } }
export class GameApi {
  state: ServerState = { pet: null, wallet: emptyWallet(), friendship: initialFriendship(), version: 0, serverTime: '' };
  private queue: Promise<unknown> = Promise.resolve();
  get snapshot(): PetState { if (!this.state.pet) throw new Error('Питомец ещё не выбран'); return { ...this.state.pet }; }
  private async request(path: string, data?: unknown): Promise<Reply> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`/api${path}`, { method: data === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: data === undefined ? {} : { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new RequestError(response.status, result.error ?? 'Ошибка сервера');
      return result;
    } catch (error) {
      if (error instanceof RequestError) throw error;
      throw new RequestError(0, 'Нет связи с сервером. Проверь, что START.cmd запущен, и повтори.');
    } finally { clearTimeout(timeout); }
  }
  async connect(): Promise<void> {
    await prepareTelegram();
    const telegram = (window as Window & { Telegram?: { WebApp?: { initData?: string; ready?: () => void } } }).Telegram?.WebApp;
    const initData = telegram?.initData || new URLSearchParams(location.hash.slice(1)).get('tgWebAppData');
    if (initData) { this.state = (await this.request('/auth/telegram', { initData })).state; telegram?.ready?.(); return; }
    try { this.state = (await this.request('/state')).state; return; } catch (error) { if (!(error instanceof RequestError) || error.status !== 401) throw error; }
    if (!import.meta.env.DEV) throw new Error('Открой игру через Telegram-бота.');
    let pet: unknown = null; let wallet: unknown = null;
    let deviceId = crypto.randomUUID();
    try { const saved = localStorage.getItem('monster-pet:dev-device'); if (saved) deviceId = saved as `${string}-${string}-${string}-${string}-${string}`; else localStorage.setItem('monster-pet:dev-device', deviceId); } catch { /* Session-only local identity. */ }
    try { pet = JSON.parse(localStorage.getItem('monster-pet:onboarded:v1') ?? 'null'); wallet = JSON.parse(localStorage.getItem('monster-pet:wallet:v1') ?? 'null'); } catch { /* Ignore malformed prototype data. */ }
    this.state = (await this.request('/auth/dev', { deviceId, pet, wallet })).state;
  }
  mutate(path: string, data: Record<string, unknown> = {}): Promise<Reply> {
    const operation = async () => {
      const body = { ...data, requestId: crypto.randomUUID(), version: this.state.version };
      let reply: Reply;
      try { reply = await this.request(path, body); }
      catch (error) {
        if (error instanceof RequestError && error.status === 0) reply = await this.request(path, body);
        else { if (error instanceof RequestError && error.status === 409) this.state = (await this.request('/state')).state; throw error; }
      }
      this.state = reply.state; return reply;
    };
    const result = this.queue.then(operation); this.queue = result.catch(() => {}); return result;
  }
  async act(action: PetAction): Promise<{ state: PetState; saved: boolean; xpGain: number; levelUp: boolean }> {
    const reply = await this.mutate('/pet/actions', { action }); return { state: this.snapshot, saved: true, xpGain: reply.xpGain ?? 0, levelUp: reply.levelUp ?? false };
  }
}
export const api = new GameApi();
