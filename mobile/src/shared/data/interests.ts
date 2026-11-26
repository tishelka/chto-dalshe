export const interests = [
  { id: 'movies', label: 'Кино,\nсериалы' },
  { id: 'video-games', label: 'Видеоигры' },
  { id: 'board-games', label: 'Настольные\nигры' },
  { id: 'sport', label: 'Спорт' },
  { id: 'walks', label: 'Прогулки' },
  { id: 'music', label: 'Музыка' },
  { id: 'creativity', label: 'Творчество' },
  { id: 'cooking', label: 'Кулинария' },
  { id: 'reading', label: 'Чтение' },
  { id: 'culture', label: 'Культура и\nмероприятия' },
  { id: 'social', label: 'Общение' },
  { id: 'crafts', label: 'Рукоделие' },
  { id: 'museums', label: 'Музеи\nи выставки' },
  { id: 'drawing', label: 'Рисование' },
  { id: 'architecture', label: 'Архитектура' },
] as const;

export type Interest = (typeof interests)[number];
