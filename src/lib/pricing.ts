import type { Item, PriceEntry } from "./types";
import { inSeason, isAllYear } from "./season";

/** 1 台斤 = 0.6 公斤 */
export const JIN = 0.6;
/** 批發→零售加成（傳統市場經驗值 1.5~2 取中） */
const MARKUP = 1.8;
/** 合理區間 = 基準 × [下緣, 上緣] */
const BAND_LO = 0.8;
const BAND_HI = 1.15;

export type Unit = "jin" | "kg" | "pc";

/** 輸入單價換算成 元/公斤；unit="pc" 時需傳該品項的單位重量（公斤） */
export function toKgPrice(value: number, unit: Unit, pcKg?: number): number {
  if (unit === "jin") return value / JIN;
  if (unit === "pc") return value / (pcKg || 1);
  return value;
}

/**
 * 合理零售區間（元/公斤）。
 * 有官方行情：近 N 天均價已反映季節，均價×加成×[0.8,1.15]，不再套產季係數。
 * 無官方行情：內建區間中價×加成×產季係數(當季0.85/非產季1.15/全年1.0)×[0.8,1.15]。
 * retail 品項的 w 已是零售價，加成 = 1。
 */
export function fairKg(it: Item, live: PriceEntry | null, month: number): [number, number] {
  const markup = it.retail ? 1 : MARKUP;
  if (live && live.kg > 0) {
    const base = live.kg * markup;
    return [base * BAND_LO, base * BAND_HI];
  }
  const mid = ((it.w[0] + it.w[1]) / 2) * markup;
  const f = isAllYear(it) ? 1 : inSeason(it, month) ? 0.85 : 1.15;
  return [mid * f * BAND_LO, mid * f * BAND_HI];
}

/** 價格取整：≥100 取 5 的倍數（模擬市場喊價習慣） */
export const rd = (v: number): number => (v >= 100 ? Math.round(v / 5) * 5 : Math.round(v));
/** 小額取整：<10 保留一位小數 */
export const rd1 = (v: number): number => (v >= 10 ? rd(v) : Math.round(v * 10) / 10);

export type Verdict = "cheap" | "fair" | "exp";

export function judgeVerdict(priceKg: number, lo: number, hi: number): Verdict {
  if (priceKg < lo) return "cheap";
  if (priceKg <= hi) return "fair";
  return "exp";
}
