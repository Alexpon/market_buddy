import { describe, it, expect } from "vitest";
import { filterItems } from "../src/lib/catalog";
import type { Item } from "../src/lib/types";

const db = [
  { n: "空心菜", a: ["蕹菜"], c: "葉菜", w: [25, 45], peak: [4, 5, 6, 7, 8, 9, 10], pick: "測試用挑選要領" },
  { n: "高麗菜", a: ["甘藍"], c: "葉菜", w: [15, 25], peak: [12, 1, 2, 3, 4], pick: "測試用挑選要領" },
  { n: "金針菇", a: [], c: "菇菌", w: [40, 60], peak: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], pick: "測試用挑選要領" },
] as Item[];

describe("filterItems", () => {
  it("分類過濾", () => {
    expect(filterItems(db, "菇菌", "", 8).map((i) => i.n)).toEqual(["金針菇"]);
  });
  it("「全部」不過濾分類", () => {
    expect(filterItems(db, "全部", "", 8)).toHaveLength(3);
  });
  it("別名搜尋", () => {
    expect(filterItems(db, "全部", "蕹菜", 8).map((i) => i.n)).toEqual(["空心菜"]);
  });
  it("品名搜尋", () => {
    expect(filterItems(db, "全部", "高麗", 8).map((i) => i.n)).toEqual(["高麗菜"]);
  });
  it("當季排前，全年供應也算旺（8 月：空心菜、金針菇在前，高麗菜非產季在後）", () => {
    expect(filterItems(db, "全部", "", 8).map((i) => i.n)).toEqual([
      "空心菜", "金針菇", "高麗菜",
    ]);
  });
  it("1 月換高麗菜、金針菇當季排前，空心菜非產季在後", () => {
    expect(filterItems(db, "全部", "", 1).map((i) => i.n)).toEqual([
      "高麗菜", "金針菇", "空心菜",
    ]);
  });
});
