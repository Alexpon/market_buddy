import { describe, it, expect, vi } from "vitest";
import { queryLive } from "../src/lib/live";
import type { Item } from "../src/lib/types";

const d1 = new Date(2026, 7, 22);
const d2 = new Date(2026, 7, 29);

const ok = (data: unknown[]) =>
  ({ ok: true, json: async () => ({ Data: data }) }) as unknown as Response;

const fishItem = {
  n: "白帶魚", a: [], c: "海鮮", w: [150, 250], peak: [9, 10, 11, 12, 1, 2],
  api: ["（日本）白帶魚", "白帶魚"], pick: "測試用挑選要領",
} as Item;

const vegOffSeason = {
  n: "柳丁", a: [], c: "水果", w: [15, 30], peak: [11, 12, 1],
  api: ["柳橙"], pick: "測試用挑選要領",
} as Item;

describe("queryLive", () => {
  it("第一個關鍵字查無資料時，換下一個關鍵字再查", async () => {
    const f = vi
      .fn<typeof fetch>()
      // 官方過濾比對不到時只回休市列（價格 0）——實測行為
      .mockResolvedValueOnce(ok([{ SeafoodProdName: "休市", Avg_Price: 0 }]))
      .mockResolvedValueOnce(
        ok([
          { SeafoodProdName: "（日本）白帶魚", Avg_Price: 200 },
          { SeafoodProdName: "（日本）白帶魚", Avg_Price: 220 },
        ]),
      );
    // 注意：關鍵字依 api 順序嘗試，第一個是「（日本）白帶魚」
    const r = await queryLive(fishItem, d1, d2, f);
    expect(r).toEqual({ status: "ok", avg: 210, n: 2 });
    expect(f).toHaveBeenCalledTimes(2);
    expect(String(f.mock.calls[0][0])).toContain(encodeURIComponent("（日本）白帶魚"));
    expect(String(f.mock.calls[1][0])).toContain(encodeURIComponent("白帶魚"));
  });

  it("全部關鍵字都查無交易 → empty（非產季情境），不是 error", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValue(ok([{ CropName: "休市", Avg_Price: 0 }]));
    expect(await queryLive(vegOffSeason, d1, d2, f)).toEqual({ status: "empty" });
  });

  it("fetch 拋錯 → error", async () => {
    const f = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    expect(await queryLive(vegOffSeason, d1, d2, f)).toEqual({ status: "error" });
  });

  it("client 端仍用全部關鍵字前綴過濾（避免伺服器部分比對帶進雜訊）", async () => {
    const f = vi.fn<typeof fetch>().mockResolvedValueOnce(
      ok([
        { CropName: "柳橙-其他", Avg_Price: 30 },
        { CropName: "香水柳橙皮", Avg_Price: 999 }, // 不是柳橙開頭，剔除
      ]),
    );
    expect(await queryLive(vegOffSeason, d1, d2, f)).toEqual({ status: "ok", avg: 30, n: 1 });
  });
});
