import type { Item } from "./types";

/** 12 個月全滿 = 全年供應 */
export const isAllYear = (it: Item): boolean => it.peak.length === 12;

export const inSeason = (it: Item, month: number): boolean => it.peak.includes(month);

export type BadgeClass = "in" | "off" | "all";

/** 詳細頁狀態徽章三態 */
export function seasonBadge(it: Item, month: number): { text: string; cls: BadgeClass } {
  if (isAllYear(it)) return { text: "全年供應", cls: "all" };
  if (inSeason(it, month)) return { text: "本月當季 ✔", cls: "in" };
  return { text: "非產季", cls: "off" };
}

/** 列表卡副標 */
export function seasonSub(it: Item, month: number): string {
  if (isAllYear(it)) return "全年供應";
  if (inSeason(it, month)) return "✔ 本月當季";
  return `盛產 ${it.peak[0]}–${it.peak[it.peak.length - 1]}月`;
}
