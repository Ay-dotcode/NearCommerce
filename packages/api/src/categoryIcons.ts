// Categories no longer need an icon URL typed in by an admin: every client derives a friendly
// emoji from the category name. An explicit icon_url, when one exists, still takes precedence.

const RULES: Array<[RegExp, string]> = [
  [/fruit|produce|vegetable|fresh/i, "🥬"],
  [/bakery|bread|pastr/i, "🥖"],
  [/dairy|egg|milk|cheese/i, "🥛"],
  [/meat|poultry|seafood|fish|butcher/i, "🥩"],
  [/frozen|ice/i, "🧊"],
  [/snack|sweet|candy|chocolate|confection/i, "🍫"],
  [/drink|beverage|juice|water|coffee|tea/i, "🥤"],
  [/pantry|grocery|staple|canned|cook|food/i, "🥫"],
  [/household|cleaning|home|kitchen|laundry/i, "🧹"],
  [/baby|kid|child|toy/i, "🧸"],
  [/pet|animal/i, "🐾"],
  [/beauty|personal|care|hygiene|cosmetic/i, "🧴"],
  [/health|pharm|medic|vitamin|wellness/i, "💊"],
  [/electronic|phone|computer|tech|appliance/i, "🔌"],
  [/cloth|apparel|fashion|shoe|wear/i, "👕"],
  [/book|stationery|office|school/i, "📚"],
  [/garden|plant|outdoor|hardware|tool|diy/i, "🛠️"],
  [/sport|fitness|gym/i, "⚽"],
  [/auto|car|vehicle/i, "🚗"],
];

export const DEFAULT_CATEGORY_EMOJI = "🛍️";

export function categoryEmoji(name: string): string {
  for (const [pattern, emoji] of RULES) if (pattern.test(name)) return emoji;
  return DEFAULT_CATEGORY_EMOJI;
}
