// 農業部開放資料 API。端點、欄位名、日期格式均經實測（2026-08-29）：
// - 蔬果 AgriProductsTransType：日期「115.08.25」（點分隔）、品名欄 CropName
// - 漁產 FisheryProductsTransType：日期「1150825」（無點——點分隔會靜默回 0 筆）、品名欄 SeafoodProdName
// 兩者均：Avg_Price 元/公斤、分頁 Page + 回應 {RS, Data, Next}、CORS 全開
import type { Item, PriceEntry } from "./types";

export const VEG_API = "https://data.moa.gov.tw/api/v1/AgriProductsTransType/";
export const FISH_API = "https://data.moa.gov.tw/api/v1/FisheryProductsTransType/";

const pad = (v: number) => String(v).padStart(2, "0");

/** 民國年點分隔：2026-08-25 → "115.08.25"（蔬果 API 用） */
export const rocDotted = (d: Date): string =>
  `${d.getFullYear() - 1911}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;

/** 民國年無點：2026-08-25 → "1150825"（漁產 API 用） */
export const rocCompact = (d: Date): string =>
  `${d.getFullYear() - 1911}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

export function vegUrl(start: Date, end: Date, page: number, cropName?: string): string {
  let u = `${VEG_API}?Start_time=${rocDotted(start)}&End_time=${rocDotted(end)}&Page=${page}`;
  if (cropName) u += `&CropName=${encodeURIComponent(cropName)}`;
  return u;
}

export function fishUrl(start: Date, end: Date, page: number, prodName?: string): string {
  let u = `${FISH_API}?Start_time=${rocCompact(start)}&End_time=${rocCompact(end)}&Page=${page}`;
  if (prodName) u += `&SeafoodProdName=${encodeURIComponent(prodName)}`;
  return u;
}

export interface MoaResponse {
  RS?: string;
  Data?: unknown[];
  Next?: boolean;
}

type Row = Record<string, unknown>;

export const nameOf = (row: unknown): string => {
  const r = row as Row;
  return String(r.CropName ?? r.SeafoodProdName ?? "");
};

export const priceOf = (row: unknown): number => {
  const r = row as Row;
  return Number(r.Avg_Price ?? 0) || 0;
};

/**
 * 依品項的 api 關鍵字（includes 部分比對，官方品名常帶品種後綴如「甘藍 初秋」）
 * 聚合原始交易列 → { 品名: {kg: 均價一位小數, n: 筆數} }。price=0（休市列等）剔除。
 */
export function aggregate(rows: unknown[], items: Item[]): Record<string, PriceEntry> {
  const out: Record<string, PriceEntry> = {};
  for (const it of items) {
    if (!it.api?.length) continue;
    const keys = it.api;
    let sum = 0;
    let n = 0;
    for (const row of rows) {
      const p = priceOf(row);
      if (p <= 0) continue;
      const name = nameOf(row);
      if (keys.some((k) => name.includes(k))) {
        sum += p;
        n++;
      }
    }
    if (n > 0) out[it.n] = { kg: +(sum / n).toFixed(1), n };
  }
  return out;
}
