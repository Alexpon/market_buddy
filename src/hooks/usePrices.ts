import { useCallback, useEffect, useState } from "react";
import type { Item, PriceEntry, PricesFile } from "../lib/types";

export interface FreshTag {
  text: string;
  live: boolean;
}

const FALLBACK_TAG: FreshTag = { text: "行情：內建基準值", live: false };

/** 取品項的官方行情（kg>0 才算有效） */
export function liveOf(prices: PricesFile | null, item: Item): PriceEntry | null {
  const v = prices?.items[item.n];
  return v && v.kg > 0 ? v : null;
}

/**
 * 載入排程產出的 prices.json（L1/L2 前端側）。
 * 讀不到或占位檔（updatedAt: null）→ 無縫退回內建基準。
 */
export function usePrices(): {
  prices: PricesFile | null;
  tag: FreshTag;
  refresh: () => void;
} {
  const [prices, setPrices] = useState<PricesFile | null>(null);
  const [tag, setTag] = useState<FreshTag>(FALLBACK_TAG);

  const load = useCallback(async (manual: boolean) => {
    if (manual) setTag({ text: "更新中…", live: false });
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}prices.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as PricesFile;
      if (!j.updatedAt || !j.items || Object.keys(j.items).length === 0) throw new Error("empty");
      setPrices(j);
      const d = new Date(j.updatedAt);
      setTag({
        text: `行情已更新：${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}（近${j.days || 30}天批發均價）`,
        live: true,
      });
    } catch {
      setPrices(null);
      setTag(
        manual
          ? { text: "更新失敗，沿用內建基準（部署後才有 prices.json）", live: false }
          : FALLBACK_TAG,
      );
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => void load(true), [load]);
  return { prices, tag, refresh };
}
