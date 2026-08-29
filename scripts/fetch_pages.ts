import type { MoaResponse } from "../src/lib/moa";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MAX_PAGES = 200;

/**
 * 依 MOA api/v1 分頁（Page 參數 + 回應 Next 布林）逐頁抓到底。
 * 單頁失敗自動重試一次；頁間禮貌性間隔 delayMs。
 */
export async function fetchAllPages(
  urlFor: (page: number) => string,
  fetchFn: typeof fetch = fetch,
  delayMs = 300,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = urlFor(page);
    let j: MoaResponse | undefined;
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await fetchFn(url, { headers: { accept: "application/json" } });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        j = (await r.json()) as MoaResponse;
        break;
      } catch (e) {
        if (attempt >= 1) throw e;
        await sleep(delayMs * 5);
      }
    }
    const data = j.Data ?? [];
    rows.push(...data);
    if (j.Next !== true || data.length === 0) break;
    await sleep(delayMs);
  }
  return rows;
}
