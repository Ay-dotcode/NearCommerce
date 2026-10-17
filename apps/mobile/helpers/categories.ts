// The home screen shows this many rows of categories until the shopper taps "Show more".
export const CATEGORY_COLUMNS = 2;
export const CATEGORY_COLLAPSED_ROWS = 2;

export const COLLAPSED_CATEGORY_COUNT = CATEGORY_COLUMNS * CATEGORY_COLLAPSED_ROWS;

// The categories to draw now, and how many are hidden behind "Show more".
export function visibleCategories<T>(items: T[], expanded: boolean) {
  const shown = expanded ? items : items.slice(0, COLLAPSED_CATEGORY_COUNT);
  return { shown, hidden: items.length - shown.length };
}
