import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { applyAction, initialPet, isPetState, type PetState } from '../src/domain/pet';
import { emptyWallet, awardRun, readWallet, type Wallet } from '../src/domain/catchGame';
import { drawPet, probabilities } from '../src/domain/onboarding';
import { buyDecoration, decorations } from '../src/domain/shop';
import { initialFriendship, gainFriendship, type Friendship } from '../src/domain/friendship';
import { applyAbsence } from '../src/domain/absence';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface Snapshot { pet: PetState | null; wallet: Wallet; friendship: Friendship; version: number; serverTime: string }
type Account = { id: string; pet: string | null; wallet: string; friendship: string; version: number; pet_updated_at: number };
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export class GameDatabase {
  db: DatabaseSync;
  constructor(path: string, private now = () => Date.now()) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY, pet TEXT, wallet TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts(user_id TEXT NOT NULL REFERENCES accounts(id), request_id TEXT NOT NULL, fingerprint TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(user_id,request_id));
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES accounts(id), started INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS runs_user ON runs(user_id);
      `);
    const columns = this.db.prepare('PRAGMA table_info(accounts)').all() as {name: string}[];
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!columns.some(column => column.name === 'friendship')) {
        this.db.exec(`ALTER TABLE accounts ADD COLUMN friendship TEXT NOT NULL DEFAULT '${JSON.stringify(initialFriendship())}'`);
      }
      if (!columns.some(column => column.name === 'pet_updated_at')) {
        this.db.exec('ALTER TABLE accounts ADD COLUMN pet_updated_at INTEGER NOT NULL DEFAULT 0');
        this.db.prepare('UPDATE accounts SET pet_updated_at=?').run(this.now());
      }
      this.db.exec('PRAGMA user_version=3; COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close(): void { this.db.close(); }
  account(id: string): Account {
    const row = this.db.prepare('SELECT * FROM accounts WHERE id=?').get(id) as Account | undefined;
    if (!row) throw new ApiError(401, 'Войди в игру заново');
    return row;
  }
  state(id: string): Snapshot {
    const row = this.account(id);
    if (row.pet) {
      const result = applyAbsence(JSON.parse(row.pet), row.pet_updated_at, this.now());
      if (result.updatedAt !== row.pet_updated_at) {
        row.pet = JSON.stringify(result.pet);
        this.db.prepare('UPDATE accounts SET pet=?,pet_updated_at=?,version=version+1 WHERE id=?').run(row.pet, result.updatedAt, id);
        row.version++;
      }
    }
    return { pet: row.pet ? JSON.parse(row.pet) : null, wallet: readWallet(JSON.parse(row.wallet)), friendship: JSON.parse(row.friendship), version: row.version, serverTime: new Date(this.now()).toISOString() };
  }
  login(id: string, legacy?: { pet?: unknown; wallet?: unknown }): string {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const pet = legacy && isPetState(legacy.pet) ? legacy.pet : null;
      const wallet = pet ? readWallet(legacy?.wallet) : emptyWallet();
      this.db.prepare('INSERT OR IGNORE INTO accounts(id,pet,wallet,pet_updated_at) VALUES(?,?,?,?)').run(id, pet ? JSON.stringify(pet) : null, JSON.stringify(wallet), this.now());
      const token = randomBytes(32).toString('hex');
      this.db.prepare('DELETE FROM sessions WHERE expires < ?').run(this.now());
      this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashToken(token), id, this.now() + 7 * 86400000);
      this.db.exec('COMMIT'); return token;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  user(token: string): string | undefined {
    return (this.db.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(hashToken(token), this.now()) as { user_id: string } | undefined)?.user_id;
  }
  mutate(id: string, route: string, body: Record<string, unknown>): { state: Snapshot; [key: string]: unknown } {
    const requestId = body.requestId;
    if (typeof requestId !== 'string' || !/^[\w-]{8,100}$/.test(requestId)) throw new ApiError(400, 'Некорректный идентификатор запроса');
    const fingerprint = JSON.stringify([route, body]);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const previous = this.db.prepare('SELECT fingerprint,response FROM receipts WHERE user_id=? AND request_id=?').get(id, requestId) as { fingerprint: string; response: string } | undefined;
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new ApiError(409, 'Этот запрос уже использован для другого действия');
        const replay = { ...JSON.parse(previous.response), state: this.state(id) };
        this.db.exec('COMMIT'); return replay;
      }
      const row = this.account(id);
      if (body.version !== row.version) throw new ApiError(409, 'Состояние изменилось. Обновили данные; повтори действие.');
      let pet: PetState | null = row.pet ? JSON.parse(row.pet) : null;
      const absence = pet ? applyAbsence(pet, row.pet_updated_at, this.now()) : null;
      if (absence) pet = absence.pet;
      let wallet = readWallet(JSON.parse(row.wallet));
      let friendship: Friendship = JSON.parse(row.friendship);
      const extra: Record<string, unknown> = {};
      const awardXp = (event: 'feed' | 'play' | 'rest' | 'game') => {
        const gained = gainFriendship(friendship, event, new Date(this.now()).toISOString().slice(0, 10));
        friendship = gained.friendship; extra.xpGain = gained.xpGain; extra.levelUp = gained.levelUp;
      };
      if (route === '/api/onboarding') {
        if (!pet) {
          try { probabilities(body.answers as number[]); } catch { throw new ApiError(400, 'Нужны четыре допустимых ответа'); }
          pet = initialPet(drawPet(body.answers as number[], randomInt(0, 2 ** 32) / 2 ** 32));
        }
      } else {
        if (!pet) throw new ApiError(409, 'Сначала пройди знакомство');
        switch (route) {
          case '/api/pet/actions': {
            if (!['feed','play','rest'].includes(String(body.action))) throw new ApiError(400, 'Неизвестное действие');
            const action = body.action as 'feed' | 'play' | 'rest';
            const next = applyAction(pet, action);
            const useful = action === 'feed' ? next.satiety > pet.satiety : action === 'rest' ? next.energy > pet.energy : next.mood > pet.mood;
            if (useful) awardXp(action); else extra.xpGain = 0;
            pet = next; break;
          }
          case '/api/shop/buy': {
            const item = decorations.find(item => item.id === body.item);
            if (!item) throw new ApiError(400, 'Предмет не найден');
            if (!wallet.owned?.includes(item.id) && wallet.coins < item.price) throw new ApiError(409, 'Не хватает монет');
            wallet = buyDecoration(wallet, item.id); break;
          }
          case '/api/shop/equip': {
            if (body.item !== null && (typeof body.item !== 'string' || !wallet.owned?.includes(body.item))) throw new ApiError(400, 'Предмет ещё не куплен');
            wallet = { ...wallet, equipped: body.item === null ? undefined : body.item as string }; break;
          }
          case '/api/minigames/start': {
            const last = this.db.prepare('SELECT started FROM runs WHERE user_id=? ORDER BY started DESC LIMIT 1').get(id) as {started: number} | undefined;
            if (last && this.now() - last.started < 30000) throw new ApiError(429, 'Предыдущий раунд ещё идёт. Подожди немного.');
            const runId = randomUUID();
            this.db.prepare('INSERT INTO runs(id,user_id,started) VALUES(?,?,?)').run(runId, id, this.now());
            extra.runId = runId; break;
          }
          case '/api/minigames/finish': {
            const run = typeof body.runId === 'string' ? this.db.prepare('SELECT * FROM runs WHERE id=? AND user_id=?').get(body.runId, id) as {id: string; started: number; finished: number} | undefined : undefined;
            if (!run) throw new ApiError(400, 'Раунд не найден');
            if (run.finished) { extra.reward = 0; break; }
            if (this.now() - run.started < 29500 || this.now() - run.started > 7200000) throw new ApiError(400, 'Недопустимая длительность раунда');
            if (typeof body.score !== 'number' || !Number.isInteger(body.score) || body.score < 0 || body.score > 49) throw new ApiError(400, 'Недопустимый результат');
            const result = awardRun(wallet, run.id, body.score, new Date(this.now()).toISOString().slice(0,10));
            wallet = result.wallet; extra.reward = result.reward;
            awardXp('game');
            this.db.prepare('UPDATE runs SET finished=1 WHERE id=?').run(run.id); break;
          }
          default: throw new ApiError(404, 'Маршрут не найден');
        }
      }
      this.db.prepare('UPDATE accounts SET pet=?,wallet=?,friendship=?,pet_updated_at=?,version=version+1 WHERE id=?').run(JSON.stringify(pet), JSON.stringify(wallet), JSON.stringify(friendship), absence?.updatedAt ?? this.now(), id);
      const response = { ...extra, state: this.state(id) };
      this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?)').run(id, requestId, fingerprint, JSON.stringify(response));
      this.db.exec('COMMIT'); return response;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
