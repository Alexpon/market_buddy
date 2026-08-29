import { describe, it, expect } from "vitest";
import {
  rocDotted, rocCompact, vegUrl, fishUrl, nameOf, priceOf, aggregate,
} from "../src/lib/moa";
import type { Item } from "../src/lib/types";

const d1 = new Date(2026, 7, 25);
const d2 = new Date(2026, 7, 29);

describe("民國日期（兩 API 格式不同——實測確認）", () => {
  it("蔬果用點分隔", () => expect(rocDotted(d1)).toBe("115.08.25"));
  it("漁產用無點（有點會靜默回 0 筆）", () => expect(rocCompact(d1)).toBe("1150825"));
});

describe("URL builder", () => {
  it("蔬果含點日期與 CropName 過濾", () => {
    const u = vegUrl(d1, d2, 2, "甘藍");
    expect(u).toContain("AgriProductsTransType");
    expect(u).toContain("Start_time=115.08.25");
    expect(u).toContain("End_time=115.08.29");
    expect(u).toContain("Page=2");
    expect(u).toContain(`CropName=${encodeURIComponent("甘藍")}`);
  });
  it("蔬果不傳品名就沒有 CropName 參數", () => {
    expect(vegUrl(d1, d2, 1)).not.toContain("CropName");
  });
  it("漁產端點 FisheryProductsTransType + 無點日期 + SeafoodProdName 過濾", () => {
    const u = fishUrl(d1, d2, 1, "吳郭魚");
    expect(u).toContain("FisheryProductsTransType");
    expect(u).toContain("Start_time=1150825");
    expect(u).toContain(`SeafoodProdName=${encodeURIComponent("吳郭魚")}`);
  });
});

describe("欄位正規化（實測欄位名）", () => {
  it("蔬果 CropName / 漁產 SeafoodProdName", () => {
    expect(nameOf({ CropName: "甘藍 初秋", Avg_Price: 21.3 })).toBe("甘藍 初秋");
    expect(nameOf({ SeafoodProdName: "吳郭魚", Avg_Price: 55 })).toBe("吳郭魚");
    expect(nameOf({})).toBe("");
    expect(priceOf({ Avg_Price: 21.3 })).toBe(21.3);
    expect(priceOf({})).toBe(0);
  });
});

describe("aggregate", () => {
  const items = [
    { n: "高麗菜", a: [], c: "葉菜", w: [15, 25], peak: [1], api: ["甘藍"] },
    { n: "台灣鯛", a: [], c: "海鮮", w: [55, 90], peak: [1], api: ["吳郭魚"] },
    { n: "豬五花", a: [], c: "肉類", w: [280, 380], retail: true, peak: [1] },
  ] as Item[];
  const rows = [
    { CropName: "甘藍 初秋", Avg_Price: 20 },
    { CropName: "甘藍 高山", Avg_Price: 30 },
    { CropName: "休市", Avg_Price: 0 }, // price=0 剔除
    { SeafoodProdName: "吳郭魚(養殖)", Avg_Price: 55 },
  ];
  it("關鍵字命中取平均（一位小數）、0 價剔除、無 api 品項略過", () => {
    expect(aggregate(rows, items)).toEqual({
      高麗菜: { kg: 25, n: 2 },
      台灣鯛: { kg: 55, n: 1 },
    });
  });
});
