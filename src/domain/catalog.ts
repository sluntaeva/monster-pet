export type DecorationSlot = 'rug' | 'plant' | 'wall' | 'toy';
export interface Decoration { id: string; name: string; price: number; color: number; slot: DecorationSlot; icon: string }
export const decorations: Decoration[] = [
  { id: 'mint', name: 'Мятный ковёр', price: 10, color: 0x99c6a1, slot: 'rug', icon: '▰' },
  { id: 'gold', name: 'Золотой ковёр', price: 20, color: 0xe1b76c, slot: 'rug', icon: '▰' },
  { id: 'night', name: 'Ночной ковёр', price: 30, color: 0x7b8cc4, slot: 'rug', icon: '▰' },
  { id: 'rose', name: 'Ягодный ковёр', price: 15, color: 0xd995ac, slot: 'rug', icon: '▰' },
  { id: 'ocean', name: 'Морской ковёр', price: 25, color: 0x68b8c5, slot: 'rug', icon: '▰' },
  { id: 'sunset', name: 'Закатный ковёр', price: 35, color: 0xe59b68, slot: 'rug', icon: '▰' },
  { id: 'cactus', name: 'Колючий сосед', price: 15, color: 0x73a86b, slot: 'plant', icon: '♧' },
  { id: 'flowers', name: 'Букет упрямства', price: 25, color: 0xda87b5, slot: 'plant', icon: '✿' },
  { id: 'stars', name: 'Звёзды на стене', price: 20, color: 0xe1b76c, slot: 'wall', icon: '★' },
  { id: 'moon', name: 'Лунная картина', price: 35, color: 0x9ba8df, slot: 'wall', icon: '☾' },
  { id: 'ball', name: 'Мяч для шалостей', price: 10, color: 0xe6ab67, slot: 'toy', icon: '●' },
  { id: 'cushion', name: 'Подушка-обнимашка', price: 30, color: 0xc19bdd, slot: 'toy', icon: '♥' },
];
