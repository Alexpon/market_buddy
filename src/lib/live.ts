// L3 單品即時查詢邏輯。
// 實測行為：官方 API 的品名過濾（蔬果部分比對、漁產完全比對）比對不到時，
// 不會回錯誤，而是只回「休市」列（價格 0）——所以要依序試每個關鍵字，
// 並把「查無交易」與「連線失敗」分開回報。
import type { Item } from "./types";
import { vegUrl, fishUrl, nameOf, priceOf, type MoaResponse } from "./moa";

export type LiveResult =
  | { status: "ok"; avg: number; n: number }
  | { status: "empty" }
  | { status: "error" };

const stripParen = (s: string) => s.replace(/\(.+\)/, "");

/** 依序用每個官方品名關鍵字查近 N 天交易，回傳均價（元/公斤）與筆數 */
export async function queryLive(
  item: Item,
  start: Date,
  end: Date,
  fetchFn: typeof fetch = fetch,
): Promise<LiveResult> {
  const keys = item.api?.length ? item.api : [stripParen(item.a[0] ?? item.n)];
  const isFish = item.c === "海鮮";
  try {
    for (const key of keys) {
      const url = isFish ? fishUrl(start, end, 1, key) : vegUrl(start, end, 1, key);
      const r = await fetchFn(url, { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as MoaResponse;
      const rows = (j.Data ?? []).filter(
        (x) => priceOf(x) > 0 && keys.some((k) => nameOf(x).startsWith(k)),
      );
      if (rows.length) {
        const avg = rows.reduce((a: number, x) => a + priceOf(x), 0) / rows.length;
        return { status: "ok", avg, n: rows.length };
      }
    }
    return { status: "empty" };
  } catch {
    return { status: "error" };
  }
}
