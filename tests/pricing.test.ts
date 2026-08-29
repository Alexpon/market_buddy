import { describe, it, expect } from "vitest";
import { JIN, toKgPrice, fairKg, rd, rd1, judgeVerdict } from "../src/lib/pricing";
import type { Item } from "../src/lib/types";

const veg = {
  n: "高麗菜", a: [], c: "葉菜", w: [15, 25], peak: [12, 1, 2, 3, 4], pc: ["顆", 1.8],
} as Item;
const meat = {
  n: "豬五花", a: [], c: "肉類", w: [280, 380], retail: true,
  peak: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
} as Item;

describe("toKgPrice", () => {
  it("台斤→公斤（1 台斤 = 0.6 公斤）", () => {
    expect(JIN).toBe(0.6);
    expect(toKgPrice(30, "jin")).toBeCloseTo(50);
  });
  it("公斤原值", () => expect(toKgPrice(50, "kg")).toBe(50));
  it("論個換算", () => expect(toKgPrice(90, "pc", 1.8)).toBeCloseTo(50));
});

describe("fairKg", () => {
  it("有官方行情：均價×1.8×[0.8,1.15]，不套產季係數", () => {
    const [lo, hi] = fairKg(veg, { kg: 20, n: 100 }, 7); // 7 月非產季也不套
    expect(lo).toBeCloseTo(20 * 1.8 * 0.8);
    expect(hi).toBeCloseTo(20 * 1.8 * 1.15);
  });
  it("無行情+當季：中價20×1.8×0.85×[0.8,1.15]", () => {
    const [lo, hi] = fairKg(veg, null, 1);
    expect(lo).toBeCloseTo(20 * 1.8 * 0.85 * 0.8);
    expect(hi).toBeCloseTo(20 * 1.8 * 0.85 * 1.15);
  });
  it("無行情+非產季係數 1.15", () => {
    const [lo] = fairKg(veg, null, 7);
    expect(lo).toBeCloseTo(20 * 1.8 * 1.15 * 0.8);
  });
  it("retail 不加成、全年供應係數 1", () => {
    const [lo, hi] = fairKg(meat, null, 5);
    expect(lo).toBeCloseTo(330 * 0.8);
    expect(hi).toBeCloseTo(330 * 1.15);
  });
  it("retail 有行情也不加成", () => {
    const [lo] = fairKg(meat, { kg: 300, n: 10 }, 5);
    expect(lo).toBeCloseTo(300 * 0.8);
  });
});

describe("取整（模擬市場喊價）", () => {
  it("≥100 取 5 的倍數", () => {
    expect(rd(163)).toBe(165);
    expect(rd(101)).toBe(100);
  });
  it("<100 取整數", () => expect(rd(63.4)).toBe(63));
  it("rd1：<10 保留一位小數，≥10 同 rd", () => {
    expect(rd1(6.34)).toBe(6.3);
    expect(rd1(63.4)).toBe(63);
  });
});

describe("judgeVerdict", () => {
  it("低於下緣→cheap；區間內（含邊界）→fair；高於上緣→exp", () => {
    expect(judgeVerdict(10, 20, 30)).toBe("cheap");
    expect(judgeVerdict(20, 20, 30)).toBe("fair");
    expect(judgeVerdict(25, 20, 30)).toBe("fair");
    expect(judgeVerdict(30, 20, 30)).toBe("fair");
    expect(judgeVerdict(31, 20, 30)).toBe("exp");
  });
});
