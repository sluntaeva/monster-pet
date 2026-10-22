export const kinds = ['buba', 'zhuzha', 'plyukh', 'nyam'] as const;
export type PetKind = typeof kinds[number];
export const characters = {
  buba: { name: 'Буба', trait: 'Упрямый ворчун', color: 0x9474d7, quote: 'Я сам решу, когда мы подружимся.' },
  zhuzha: { name: 'Жужа', trait: 'Неугомонная провокаторша', color: 0xe9ad43, quote: 'А если нажать ещё раз?' },
  plyukh: { name: 'Плюх', trait: 'Сонный хитрец', color: 0x72b8cf, quote: 'Я занят. Лежу.' },
  nyam: { name: 'Ням', trait: 'Прожорливый переговорщик', color: 0x8db967, quote: 'А добавка входит?' },
};
export const questions = [
  { title: 'Твой идеальный свободный вечер?', answers: ['Всё по моему плану', 'Найти приключение', 'Завернуться в плед', 'Устроить дегустацию'] },
  { title: 'Кто-то тронул твои вещи. Твоя реакция?', answers: ['Буду ворчать', 'Отвечу розыгрышем', 'Сделаю вид, что не заметил', 'Попрошу вкусную компенсацию'] },
  { title: 'Какую суперсилу выбираешь?', answers: ['Стоять на своём', 'Всех расшевелить', 'Отдыхать где угодно', 'Находить перекус'] },
  { title: 'В комнате хаос. Что делать?', answers: ['Установить правила', 'Добавить конфетти', 'Найти место прилечь', 'Проверить запасы еды'] },
];
export function probabilities(answers: readonly number[]): number[] {
  if (answers.length !== 4 || answers.some(a => !Number.isInteger(a) || a < 0 || a > 3)) throw new Error('Нужны четыре допустимых ответа');
  return kinds.map((_, i) => 0.15 + 0.4 * answers.filter(a => a === i).length / 4);
}
export function drawPet(answers: readonly number[], random: number): PetKind {
  if (!Number.isFinite(random) || random < 0 || random >= 1) throw new Error('Случайное число вне диапазона');
  const weights = probabilities(answers);
  let total = 0;
  for (let i = 0; i < weights.length; i++) { total += weights[i]; if (random < total) return kinds[i]; }
  return 'nyam';
}
