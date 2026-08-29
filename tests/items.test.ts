import { describe, it, expect } from "vitest";
import items from "../data/items.json";
import { CATS, type Item } from "../src/lib/types";

const db = items as Item[];

describe("items.json 資料完整性", () => {
  it("品名唯一", () => {
    const names = db.map((i) => i.n);
    expect(new Set(names).size).toBe(names.length);
  });

  it("分類合法", () => {
    db.forEach((i) => expect(CATS).toContain(i.c));
  });

  it("基準區間 lo<hi 且為正", () => {
    db.forEach((i) => {
      expect(i.w[0], i.n).toBeGreaterThan(0);
      expect(i.w[1], i.n).toBeGreaterThan(i.w[0]);
    });
  });

  it("peak 為 1-12 不重複", () => {
    db.forEach((i) => {
      expect(new Set(i.peak).size, i.n).toBe(i.peak.length);
      i.peak.forEach((m) => {
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
      });
    });
  });

  it("pc 單位重量為正", () => {
    db.filter((i) => i.pc).forEach((i) => expect(i.pc![1], i.n).toBeGreaterThan(0));
  });

  it("蔬果海鮮除 retail 外都有 api 關鍵字（可自動更新）", () => {
    db.filter((i) => i.c !== "肉類" && !i.retail).forEach((i) =>
      expect(i.api?.length, `${i.n} 缺 api`).toBeGreaterThan(0),
    );
  });

  it("肉類與 retail 品項不設 api", () => {
    db.filter((i) => i.retail || i.c === "肉類").forEach((i) =>
      expect(i.api, i.n).toBeUndefined(),
    );
  });
});
