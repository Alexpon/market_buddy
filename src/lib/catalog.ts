import type { Item } from "./types";
import { inSeason, isAllYear } from "./season";

/**
 * 分類 + 關鍵字（品名/別名 includes）過濾，
 * 當季且非全年供應的品項排前，其餘維持原順序（Array.sort 為 stable）。
 */
export function filterItems(db: Item[], cat: string, q: string, month: number): Item[] {
  const kw = q.trim();
  const hot = (it: Item) => (inSeason(it, month) && !isAllYear(it) ? 1 : 0);
  return db
    .filter(
      (it) =>
        (cat === "全部" || it.c === cat) &&
        (!kw || it.n.includes(kw) || it.a.some((a) => a.includes(kw))),
    )
    .sort((a, b) => hot(b) - hot(a));
}
