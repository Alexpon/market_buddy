import { describe, it, expect } from "vitest";
import { isAllYear, inSeason, seasonBadge, seasonSub } from "../src/lib/season";
import type { Item } from "../src/lib/types";

const veg = { n: "高麗菜", a: [], c: "葉菜", w: [15, 25], peak: [12, 1, 2, 3, 4], pick: "測試用挑選要領" } as Item;
const allYear = {
  n: "金針菇", a: [], c: "菇菌", w: [40, 60],
  peak: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], pick: "測試用挑選要領"
} as Item;

describe("season", () => {
  it("isAllYear：12 個月全滿", () => {
    expect(isAllYear(allYear)).toBe(true);
    expect(isAllYear(veg)).toBe(false);
  });

  it("inSeason 依傳入月份判斷", () => {
    expect(inSeason(veg, 1)).toBe(true);
    expect(inSeason(veg, 7)).toBe(false);
  });

  it("badge 三態", () => {
    expect(seasonBadge(allYear, 8)).toEqual({ text: "全年供應", cls: "all" });
    expect(seasonBadge(veg, 1)).toEqual({ text: "本月當季 ✔", cls: "in" });
    expect(seasonBadge(veg, 7)).toEqual({ text: "非產季", cls: "off" });
  });

  it("列表卡副標：一律顯示盛產月份（當季與否由「旺」角標表達，避免資訊重複）", () => {
    expect(seasonSub(allYear)).toBe("全年供應");
    expect(seasonSub(veg)).toBe("盛產 12–4月");
  });
});
