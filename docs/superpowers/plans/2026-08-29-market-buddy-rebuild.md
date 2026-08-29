# 菜市場比價重構 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `handover/` 的單一 HTML 原型重構成 Vite + React + TS 模組化靜態站，功能 1:1 對等，部署 GitHub Pages，每日 Actions 排程更新行情。

**Architecture:** 純前端 SPA + `data/items.json` 單一品項資料來源 + 純函式 lib（判價/產季/MOA API）同時供前端與抓價腳本使用 + GitHub Actions 兩條 workflow（每日抓價 commit、push 觸發部署）。

**Tech Stack:** Vite 7, React 19, TypeScript, Vitest, tsx（跑 TS 腳本）, GitHub Actions, GitHub Pages。

## Global Constraints

- Node ≥ 20（本機 22.14）；npm。運行時依賴只有 react/react-dom，其餘全 devDependencies
- Vite `base: './'`（GitHub Pages 專案頁路徑相容）
- UI 文案、視覺（CSS）與 `handover/index.html` 逐字一致，不加不減功能
- 判價常數沿用：台斤=0.6kg、加成 1.8、區間 [×0.8, ×1.15]、產季係數 當季0.85/非產季1.15/全年1.0、retail 不加成
- **實測確認的 API 事實（覆蓋交接文件的推測）：**
  - 蔬果：`https://data.moa.gov.tw/api/v1/AgriProductsTransType/`，日期格式 `115.08.25`（有點），欄位 `CropName`/`Avg_Price`，支援 `CropName` 過濾
  - 漁產：`https://data.moa.gov.tw/api/v1/FisheryProductsTransType/`（交接版的 `AquaticTransData` 不存在），日期格式 `1150825`（**無點**，有點會回 0 筆），欄位 `SeafoodProdName`/`Avg_Price`，支援 `SeafoodProdName` 過濾
  - 分頁：`Page` 參數 + 回應 `{RS, Data, Next}`；兩 API 均開 CORS `*`
- 每個 Task 完成即 commit（訊息格式 `feat:`/`test:`/`chore:`，結尾加 Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>）

---

### Task 1: 專案鷹架（Vite + React + TS + Vitest）

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`（暫時空殼）

**Interfaces:**
- Produces: `npm run dev/build/test` 三個指令可用；後續 task 的檔案骨架

- [ ] **Step 1:** `npm create vite@latest . -- --template react-ts`（目錄非空需確認保留既有檔案；若 CLI 不允許就手動建 package.json 後 `npm i`），再 `npm i -D vitest tsx`
- [ ] **Step 2:** 清掉模板雜物（logo、App.css、範例內容），`vite.config.ts` 設定：

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
});
```

`index.html` 換成 handover 版的 `<head>`（title「菜市場比價」、viewport、Google Fonts preconnect + LXGW WenKai TC / Noto Sans TC）+ `<div id="root">` + module script。
- [ ] **Step 3:** package.json scripts 加 `"test": "vitest run"`、`"update-prices": "tsx scripts/update_prices.ts"`
- [ ] **Step 4:** 驗證：`npm run build` 成功、`npm test` 跑起來（0 tests 也算通過，加 `--passWithNoTests`）
- [ ] **Step 5:** Commit `chore: Vite + React + TS 鷹架`

### Task 2: 品項總表 data/items.json + 型別 + 資料驗證測試

**Files:**
- Create: `data/items.json`, `src/lib/types.ts`, `tests/items.test.ts`

**Interfaces:**
- Produces: `Item`（`{n, a, c, w:[lo,hi], retail?, peak, pc?, api?}`）、`PriceEntry {kg,n}`、`PricesFile {updatedAt,days,source,items}` 型別；`data/items.json: Item[]`

- [ ] **Step 1:** 寫 `src/lib/types.ts`：

```ts
export type Category = "葉菜" | "瓜果茄豆" | "根莖蔥蒜" | "菇菌" | "水果" | "海鮮" | "肉類";
export const CATS: Category[] = ["葉菜", "瓜果茄豆", "根莖蔥蒜", "菇菌", "水果", "海鮮", "肉類"];

export interface Item {
  n: string;              // 顯示名（= prices.json key）
  a: string[];            // 別名（搜尋用）
  c: Category;
  w: [number, number];    // 內建基準區間 元/公斤
  retail?: boolean;       // w 已是零售價：不加成、不自動更新
  peak: number[];         // 盛產月 1-12；長度 12 = 全年供應
  pc?: [string, number];  // 論個 [單位名, 每單位公斤]
  api?: string[];         // 官方品名關鍵字；無 = 不自動更新（肉類）
}

export interface PriceEntry { kg: number; n: number }
export interface PricesFile {
  updatedAt: string;
  days: number;
  source: string;
  items: Record<string, PriceEntry>;
}
```

- [ ] **Step 2:** 產生 `data/items.json`：**用轉換腳本避免 90 項手抄錯**。把 `handover/index.html` 的 `DB` 陣列與 `handover/scripts/update_prices.mjs` 的 `VEG_FRUIT`/`FISH` 兩個對照表複製進暫存檔 `scratchpad/convert.mjs`，merge：每個 DB 項若在 VEG_FRUIT/FISH 有 key（以 `n` 對應）就加 `api` 欄位，`ALL12` 展開成 `[1..12]`，輸出 `JSON.stringify(list, null, 1)` 到 `data/items.json`。跑完抽查 3 項（高麗菜有 api:["甘藍"]、豬五花無 api 有 retail、鮭魚(切片) retail:true 有 api? — 鮭魚不在 FISH 表，應無 api）
- [ ] **Step 3:** 寫 `tests/items.test.ts`（資料完整性守門，日後改資料就靠它）：

```ts
import { describe, it, expect } from "vitest";
import items from "../data/items.json";
import { CATS, type Item } from "../src/lib/types";

const db = items as Item[];

describe("items.json 資料完整性", () => {
  it("品名唯一", () => {
    const names = db.map(i => i.n);
    expect(new Set(names).size).toBe(names.length);
  });
  it("分類合法", () => db.forEach(i => expect(CATS).toContain(i.c)));
  it("基準區間 lo<hi 且為正", () =>
    db.forEach(i => { expect(i.w[0]).toBeGreaterThan(0); expect(i.w[1]).toBeGreaterThan(i.w[0]); }));
  it("peak 為 1-12 不重複", () =>
    db.forEach(i => {
      expect(new Set(i.peak).size).toBe(i.peak.length);
      i.peak.forEach(m => { expect(m).toBeGreaterThanOrEqual(1); expect(m).toBeLessThanOrEqual(12); });
    }));
  it("pc 單位重量為正", () => db.filter(i => i.pc).forEach(i => expect(i.pc![1]).toBeGreaterThan(0)));
  it("蔬果海鮮除 retail 外都有 api 關鍵字（可自動更新）", () =>
    db.filter(i => i.c !== "肉類" && !i.retail).forEach(i =>
      expect(i.api?.length, `${i.n} 缺 api`).toBeGreaterThan(0)));
  it("肉類與 retail 品項不設 api", () =>
    db.filter(i => i.retail || i.c === "肉類").forEach(i => expect(i.api).toBeUndefined()));
});
```

- [ ] **Step 4:** `npm test` 全綠（tsconfig 需 `resolveJsonModule: true`）
- [ ] **Step 5:** Commit `feat: 品項總表 items.json（單一資料來源）+ 型別 + 資料驗證`

### Task 3: 產季邏輯 src/lib/season.ts

**Files:**
- Create: `src/lib/season.ts`, `tests/season.test.ts`

**Interfaces:**
- Produces: `isAllYear(it)`, `inSeason(it, month)`, `seasonBadge(it, month): {text,cls}`, `seasonSub(it, month): string`（列表卡副標）

- [ ] **Step 1:** 寫失敗測試 `tests/season.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { isAllYear, inSeason, seasonBadge, seasonSub } from "../src/lib/season";
import type { Item } from "../src/lib/types";

const veg = { n: "高麗菜", a: [], c: "葉菜", w: [15, 25], peak: [12, 1, 2, 3, 4] } as Item;
const allYear = { n: "金針菇", a: [], c: "菇菌", w: [40, 60], peak: [1,2,3,4,5,6,7,8,9,10,11,12] } as Item;

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
  it("列表卡副標", () => {
    expect(seasonSub(allYear, 8)).toBe("全年供應");
    expect(seasonSub(veg, 1)).toBe("✔ 本月當季");
    expect(seasonSub(veg, 7)).toBe("盛產 12–4月");
  });
});
```

- [ ] **Step 2:** 跑測試確認 FAIL（module 不存在）
- [ ] **Step 3:** 實作（`seasonSub` 非產季文案 = `盛產 ${peak[0]}–${peak[peak.length-1]}月`，沿用 handover render() 邏輯）
- [ ] **Step 4:** 測試轉綠
- [ ] **Step 5:** Commit `feat: 產季判斷模組（TDD）`

### Task 4: 判價邏輯 src/lib/pricing.ts（核心）

**Files:**
- Create: `src/lib/pricing.ts`, `tests/pricing.test.ts`

**Interfaces:**
- Consumes: `Item`, `PriceEntry`, `isAllYear/inSeason`
- Produces: `JIN = 0.6`; `type Unit = "jin"|"kg"|"pc"`; `toKgPrice(v, unit, pcKg?)`; `fairKg(it, live: PriceEntry|null, month): [number, number]`; `rd(v)`; `rd1(v)`; `type Verdict = "cheap"|"fair"|"exp"`; `judgeVerdict(priceKg, lo, hi): Verdict`

- [ ] **Step 1:** 失敗測試（對照 handover fairKg() 手算期望值）：

```ts
import { describe, it, expect } from "vitest";
import { JIN, toKgPrice, fairKg, rd, rd1, judgeVerdict } from "../src/lib/pricing";
import type { Item } from "../src/lib/types";

const veg = { n: "高麗菜", a: [], c: "葉菜", w: [15, 25], peak: [12, 1, 2, 3, 4], pc: ["顆", 1.8] } as Item;
const meat = { n: "豬五花", a: [], c: "肉類", w: [280, 380], retail: true, peak: [1,2,3,4,5,6,7,8,9,10,11,12] } as Item;

describe("toKgPrice", () => {
  it("台斤→公斤", () => expect(toKgPrice(30, "jin")).toBeCloseTo(50));
  it("公斤原值", () => expect(toKgPrice(50, "kg")).toBe(50));
  it("論個換算", () => expect(toKgPrice(90, "pc", 1.8)).toBeCloseTo(50));
});

describe("fairKg", () => {
  it("有官方行情：均價×1.8×[0.8,1.15]，不套產季", () => {
    const [lo, hi] = fairKg(veg, { kg: 20, n: 100 }, 7); // 非產季月也不套
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
});

describe("取整", () => {
  it("≥100 取 5 倍數", () => expect(rd(163)).toBe(165));
  it("<100 取整數", () => expect(rd(63.4)).toBe(63));
  it("rd1：<10 保留一位小數", () => expect(rd1(6.34)).toBe(6.3));
});

describe("judgeVerdict", () => {
  it("低於下緣→cheap；區間內→fair；高於上緣→exp", () => {
    expect(judgeVerdict(10, 20, 30)).toBe("cheap");
    expect(judgeVerdict(25, 20, 30)).toBe("fair");
    expect(judgeVerdict(31, 20, 30)).toBe("exp");
  });
});
```

- [ ] **Step 2:** 跑測試 FAIL
- [ ] **Step 3:** 實作（邏輯 1:1 移植 handover `fairKg`/`rd`/`rd1`/`judge` 的換算段）
- [ ] **Step 4:** 測試全綠
- [ ] **Step 5:** Commit `feat: 判價核心模組（TDD，對齊交接版邏輯）`

### Task 5: MOA API 模組 src/lib/moa.ts

**Files:**
- Create: `src/lib/moa.ts`, `tests/moa.test.ts`

**Interfaces:**
- Consumes: `Item`, `PriceEntry`
- Produces:
  - `rocDotted(d: Date)` → `"115.08.25"`；`rocCompact(d: Date)` → `"1150825"`
  - `vegUrl(start, end, page, cropName?)`、`fishUrl(start, end, page, prodName?)`
  - `nameOf(row): string`（`CropName ?? SeafoodProdName ?? ""`）、`priceOf(row): number`（`Number(Avg_Price ?? 0)`）
  - `aggregate(rows: unknown[], items: Item[]): Record<string, PriceEntry>`（依 `item.api` 關鍵字 includes 比對、只納入 price>0，回 `{kg: 平均取一位小數, n: 筆數}`）
  - `type MoaResponse = { RS?: string; Data?: unknown[]; Next?: boolean }`

- [ ] **Step 1:** 失敗測試（fixture 用實測 API 的真實 row 形狀）：

```ts
import { describe, it, expect } from "vitest";
import { rocDotted, rocCompact, vegUrl, fishUrl, nameOf, priceOf, aggregate } from "../src/lib/moa";
import type { Item } from "../src/lib/types";

const d1 = new Date(2026, 7, 25), d2 = new Date(2026, 7, 29);

describe("民國日期", () => {
  it("蔬果用點分隔", () => expect(rocDotted(d1)).toBe("115.08.25"));
  it("漁產用無點（有點會回 0 筆——實測確認）", () => expect(rocCompact(d1)).toBe("1150825"));
});

describe("URL", () => {
  it("蔬果含點日期與 CropName", () => {
    const u = vegUrl(d1, d2, 2, "甘藍");
    expect(u).toContain("AgriProductsTransType");
    expect(u).toContain("Start_time=115.08.25");
    expect(u).toContain("Page=2");
    expect(u).toContain(`CropName=${encodeURIComponent("甘藍")}`);
  });
  it("漁產含無點日期", () => {
    const u = fishUrl(d1, d2, 1);
    expect(u).toContain("FisheryProductsTransType");
    expect(u).toContain("Start_time=1150825");
  });
});

describe("欄位正規化（實測欄位名）", () => {
  it("蔬果 CropName / 漁產 SeafoodProdName", () => {
    expect(nameOf({ CropName: "甘藍 初秋", Avg_Price: 21.3 })).toBe("甘藍 初秋");
    expect(nameOf({ SeafoodProdName: "吳郭魚", Avg_Price: 55 })).toBe("吳郭魚");
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
    { CropName: "休市", Avg_Price: 0 },          // price=0 剔除
    { SeafoodProdName: "吳郭魚(養殖)", Avg_Price: 55 },
  ];
  it("關鍵字命中取平均、0 價剔除、無 api 品項略過", () => {
    expect(aggregate(rows, items)).toEqual({
      "高麗菜": { kg: 25, n: 2 },
      "台灣鯛": { kg: 55, n: 1 },
    });
  });
});
```

- [ ] **Step 2:** FAIL → **Step 3:** 實作 → **Step 4:** 全綠
- [ ] **Step 5:** Commit `feat: MOA API 模組（實測欄位名/端點/日期格式，取代交接版推測）`

### Task 6: 目錄邏輯 src/lib/catalog.ts（搜尋/分類/當季排序）

**Files:**
- Create: `src/lib/catalog.ts`, `tests/catalog.test.ts`

**Interfaces:**
- Consumes: `Item`, `inSeason/isAllYear`
- Produces: `filterItems(db: Item[], cat: string, q: string, month: number): Item[]`（cat="全部" 不過濾；q 比對 `n` 與別名 includes；當季非全年品項排前，其餘保持原順序）

- [ ] **Step 1:** 失敗測試：

```ts
import { describe, it, expect } from "vitest";
import { filterItems } from "../src/lib/catalog";
import type { Item } from "../src/lib/types";

const db = [
  { n: "空心菜", a: ["蕹菜"], c: "葉菜", w: [25, 45], peak: [4,5,6,7,8,9,10] },
  { n: "高麗菜", a: ["甘藍"], c: "葉菜", w: [15, 25], peak: [12,1,2,3,4] },
  { n: "金針菇", a: [], c: "菇菌", w: [40, 60], peak: [1,2,3,4,5,6,7,8,9,10,11,12] },
] as Item[];

describe("filterItems", () => {
  it("分類過濾", () => expect(filterItems(db, "菇菌", "", 8).map(i => i.n)).toEqual(["金針菇"]));
  it("別名搜尋", () => expect(filterItems(db, "全部", "蕹菜", 8).map(i => i.n)).toEqual(["空心菜"]));
  it("當季排前（8 月空心菜當季、高麗菜非、金針菇全年不算旺）", () =>
    expect(filterItems(db, "全部", "", 8).map(i => i.n)).toEqual(["空心菜", "高麗菜", "金針菇"]));
  it("1 月高麗菜當季排前", () =>
    expect(filterItems(db, "全部", "", 1)[0].n).toBe("高麗菜"));
});
```

- [ ] **Step 2:** FAIL → **Step 3:** 實作（sort 比較式沿用 handover：`(inSeason(b)&&!isAllYear(b)) - (inSeason(a)&&!isAllYear(a))`，用 stable sort）→ **Step 4:** 全綠
- [ ] **Step 5:** Commit `feat: 目錄搜尋/分類/當季排序（TDD）`

### Task 7: 抓價腳本 scripts/update_prices.ts + 兩條 GitHub workflow

**Files:**
- Create: `scripts/update_prices.ts`, `.github/workflows/update-prices.yml`, `.github/workflows/deploy.yml`, `public/prices.json`（占位）
- Test: `tests/fetch_pages.test.ts`

**Interfaces:**
- Consumes: `vegUrl/fishUrl/aggregate/rocDotted/rocCompact`（moa.ts）、`data/items.json`
- Produces: `public/prices.json`（PricesFile 格式）；`fetchAllPages(urlFor: (page:number)=>string, fetchFn?): Promise<unknown[]>` 抽成可測函式（`scripts/fetch_pages.ts`，放 scripts/ 供腳本與測試共用）

- [ ] **Step 1:** 失敗測試 `tests/fetch_pages.test.ts`（mock fetch 驗證分頁到底、失敗重試一次、page 上限 200）：

```ts
import { describe, it, expect, vi } from "vitest";
import { fetchAllPages } from "../scripts/fetch_pages";

describe("fetchAllPages", () => {
  it("依 Next 逐頁抓到底", async () => {
    const f = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Data: [1, 2], Next: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Data: [3], Next: false }) });
    expect(await fetchAllPages(p => `u?Page=${p}`, f as any, 0)).toEqual([1, 2, 3]);
    expect(f).toHaveBeenCalledTimes(2);
  });
  it("單頁失敗重試一次後成功", async () => {
    const f = vi.fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Data: [1], Next: false }) });
    expect(await fetchAllPages(p => "u", f as any, 0)).toEqual([1]);
  });
  it("重試仍失敗則拋錯", async () => {
    const f = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(fetchAllPages(p => "u", f as any, 0)).rejects.toThrow("boom");
  });
});
```

（第三參數為禮貌間隔 ms，測試傳 0）
- [ ] **Step 2:** FAIL → 實作 `scripts/fetch_pages.ts` → 全綠
- [ ] **Step 3:** 寫 `scripts/update_prices.ts` 主流程（近 30 天；蔬果+漁產各自 try/catch；印出「筆數為 0 的品項」清單供校準；兩源全空 exit 1 不覆寫；輸出 `public/prices.json`，格式含 `updatedAt/days/source/items`）
- [ ] **Step 4:** `public/prices.json` 占位檔：`{"updatedAt":null,"days":30,"source":"data.moa.gov.tw","items":{}}`（前端會視為無資料 fallback）
- [ ] **Step 5:** `.github/workflows/update-prices.yml`：

```yaml
name: 更新菜價行情
on:
  schedule:
    - cron: "0 22 * * *"   # UTC 22:00 = 台北 06:00
  workflow_dispatch: {}
permissions:
  contents: write
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "22", cache: npm }
      - run: npm ci
      - run: npm run update-prices
      - name: 提交 prices.json
        run: |
          git config user.name "price-bot"
          git config user.email "actions@github.com"
          git add public/prices.json
          git diff --cached --quiet || git commit -m "行情更新 $(date +'%Y-%m-%d')"
          git push
```

`.github/workflows/deploy.yml`（push main → build → Pages，官方 actions/deploy-pages 流程，permissions `pages: write` + `id-token: write`，environment `github-pages`）
- [ ] **Step 6:** Commit `feat: 抓價腳本 + 每日排程與 Pages 部署 workflow`

### Task 8: UI 骨架 — App / Header / 搜尋 / 分類 / 品項格

**Files:**
- Create: `src/styles.css`, `src/components/Header.tsx`, `src/components/SearchBar.tsx`, `src/components/CategoryChips.tsx`, `src/components/ItemGrid.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: `filterItems`, `seasonSub`, `inSeason/isAllYear`, `data/items.json`
- Produces: `App` 持有狀態 `{cat, q, current: Item|null}`；`ItemGrid` props `{items, month, onSelect(it)}`；`Header` props `{freshTag: {text, live: boolean}, onRefresh}`（Task 10 接上，本 task 先傳固定值「行情：內建基準值」）

- [ ] **Step 1:** `src/styles.css` = handover/index.html `<style>` 區塊（L10–119）逐字移植（帆布綠底/螢光價牌/chips/grid/panel/stamp 全套 class 名不變）
- [ ] **Step 2:** 元件實作：Header（標題+日期行+freshrow）、SearchBar（受控 input）、CategoryChips（`["全部", ...CATS]`，on class 切換）、ItemGrid（`filterItems` 結果、當季 `.season` class 與「旺」角標由 CSS ::after 呈現、空結果顯示「找不到這一項，換個名字試試？」）；footer 文案照搬
- [ ] **Step 3:** 手動驗證：`npm run dev` + agent-browser 開頁 snapshot——分類切換、搜尋「蕹菜」出空心菜、當季排前有「旺」標
- [ ] **Step 4:** `npm run build` 過、`npm test` 全綠
- [ ] **Step 5:** Commit `feat: UI 骨架（搜尋/分類/品項格，視覺 1:1 移植）`

### Task 9: 品項詳細 bottom sheet + 判價印章

**Files:**
- Create: `src/components/ItemSheet.tsx`, `src/components/PriceStamp.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `fairKg/toKgPrice/judgeVerdict/rd/rd1/JIN`、`seasonBadge`、`PriceEntry`
- Produces: `ItemSheet` props `{item: Item|null, live: PriceEntry|null, liveDays: number, month, onClose}`；內部狀態 `{price: string, unit: Unit}`；`PriceStamp` props `{verdict: Verdict|null, big: string, why: string}`

- [ ] **Step 1:** ItemSheet 實作，行為對齊 handover openPanel/judge/refreshPanelRef：
  - overlay 點擊關閉；grab bar；品名+分類+別名列
  - 產季徽章（seasonBadge）+ 12 格月份圖（當月 `.now` 外框、盛產 `.on`）
  - 合理參考價卡：`rd(lo*JIN)～rd(hi*JIN) 元/台斤` + 公斤/論個副行 + 來源標籤三態（live 綠標「近N天批發均價 X 元/公斤（n 筆，自動更新）」/ retail「市場零售概略值」/ fallback「內建概略值」）
  - 單位切換三鈕（pc 鈕僅該品項有 pc 才顯示，label `元/{單位}`，括號註記去除）+ pc 提示行（中等大小一X約 Y 公斤）
  - 換品項時 reset price/stamp；unit 若為 pc 但新品項無 pc 則退回 jin
  - 判價：`judgeVerdict(toKgPrice(...), ...)` → PriceStamp 三態（cheap 綠「俗！買起來」/ fair 黃「價格合理」/ exp 桃紅「偏貴，再比比」+ 非產季註記「（現在非產季，貴很正常）」），why 文案照 handover judge() 逐字
- [ ] **Step 2:** agent-browser 實測：開高麗菜 → 元/台斤輸 10 → 「俗！買起來」；輸 100 → 「偏貴」；切元/顆輸 50 → 合理區間以顆計；關閉再開狀態重置
- [ ] **Step 3:** build + test 全綠
- [ ] **Step 4:** Commit `feat: 品項詳細 sheet + 判價印章`

### Task 10: 行情載入 usePrices（L1/L2 前端側）

**Files:**
- Create: `src/hooks/usePrices.ts`
- Modify: `src/App.tsx`, `src/components/Header.tsx`（接真實 freshTag）

**Interfaces:**
- Consumes: `PricesFile`
- Produces: `usePrices(): { prices: PricesFile|null, tag: {text: string, live: boolean}, refresh(): void }`；`liveOf(prices, item): PriceEntry|null`（kg>0 才算有效，放 usePrices 同檔 export）

- [ ] **Step 1:** 實作：mount 時 `fetch(\`${import.meta.env.BASE_URL}prices.json?t=${Date.now()}\`, {cache:"no-store"})`；`updatedAt` 為 null 或缺 items 視為無資料；成功 → tag `行情已更新：M/D HH:mm（近N天批發均價）` + live=true；失敗 → 手動時「更新失敗，沿用內建基準（部署後才有 prices.json）」、自動時「行情：內建基準值」；refresh 期間顯示「更新中…」
- [ ] **Step 2:** ItemSheet 的 live 參數改接 `liveOf(prices, item)`（fairKg 即自動改用官方行情）
- [ ] **Step 3:** agent-browser 驗證：占位 prices.json（updatedAt:null）→ 顯示內建基準；手動把 scratchpad 假資料（含高麗菜 kg:20）放進 public/prices.json → 🔄 後 tag 轉綠、高麗菜參考價變 `近30天批發均價 20.0 元/公斤` 綠標 → 還原占位檔
- [ ] **Step 4:** build + test 全綠 → Commit `feat: prices.json 載入與更新（L1/L2 前端）`

### Task 11: L3 單品即時查詢

**Files:**
- Create: `src/components/LiveQuery.tsx`
- Modify: `src/components/ItemSheet.tsx`

**Interfaces:**
- Consumes: `vegUrl/fishUrl/nameOf/priceOf`（含品名過濾參數）、`rd/rd1/JIN`
- Produces: `LiveQuery` props `{item: Item}`；肉類/retail 品項由 ItemSheet 隱藏按鈕並顯示說明文字（肉類：「肉類拍賣資料為活體價，與零售分切價差距大，維持內建零售基準。」）

- [ ] **Step 1:** 實作：按鈕「查最新批發行情（農業部 API）」→ 近 7 天；蔬果走 `vegUrl(..., key)`（key = `api?.[0] ?? 別名[0] ?? n` 去括號），海鮮走 `fishUrl(..., key)` 並用 `SeafoodProdName` 過濾參數（實測支援，不必像交接版抓全量再前端過濾）；rows 過濾 price>0；均價 → 文案 `近 7 天批發均價約 X 元/公斤（n 筆）。零售參考約 A～B 元/台斤`（×1.5~2）+ 論個行；失敗 → 顯示連不上訊息 + amis.afa.gov.tw 連結（照 handover 文案）
- [ ] **Step 2:** agent-browser 實測一個蔬果（高麗菜）與一個海鮮（台灣鯛）真打 API 成功回均價
- [ ] **Step 3:** build + test 全綠 → Commit `feat: L3 單品即時查詢（實測 CORS 可用）`

### Task 12: 真實抓價 + 對照表校準（HANDOVER §1 驗證清單）

**Files:**
- Modify: `data/items.json`（校準 api 關鍵字）, `public/prices.json`（真實資料）

- [ ] **Step 1:** `npm run update-prices` 真跑，記錄兩源原始筆數與「筆數為 0 的品項」
- [ ] **Step 2:** 對零命中品項抓原始資料查實際官方品名（特別是漁產——關鍵字是照舊表猜的，`SeafoodProdName` 實際值未驗證），修 `data/items.json` 的 api 關鍵字，重跑到蔬果海鮮命中率合理（目標：非 retail 蔬果水果 ≥90% 命中；海鮮盡力，抓不到的品項留 fallback 並記錄）
- [ ] **Step 3:** Sanity check：對照 https://amis.afa.gov.tw 抽查高麗菜、香蕉、台灣鯛等 3–5 項均價在合理範圍（±30%）
- [ ] **Step 4:** commit 真實 prices.json + 校準後 items.json：`feat: 首次真實行情抓取與品名對照校準`

### Task 13: E2E 驗證 + README + 收尾

**Files:**
- Create: `README.md`（部署步驟、架構圖、開發指令、校準指南——整併 handover README 與 HANDOVER 仍適用的內容 + 本次實測發現）
- Modify: `tasks/todo.md`（review 章節）

- [ ] **Step 1:** `npm run build && npx vite preview` + agent-browser 完整流程實測：載入（真實行情綠 tag）→ 搜尋 → 開品項 → 三種單位輸價判斷 → L3 查詢 → 🔄 更新 → 手機視窗寬度（375px）snapshot 確認排版
- [ ] **Step 2:** `npm test` 全綠、`tsc --noEmit` 無錯
- [ ] **Step 3:** README 撰寫（含「上線步驟」：推 GitHub → Pages Source=GitHub Actions → Workflow permissions Read and write → 手動跑一次 update workflow）
- [ ] **Step 4:** Commit `docs: README 與上線指南`
- [ ] **Step 5:** 向使用者展示成果與驗證證據，**經確認後**才 `git rm -r handover/` 並 commit `chore: 移除已完成遷移的 handover 交接資料`

## Self-Review 紀錄

- 規格覆蓋：SPEC §3.1→Task 6/8、§3.2→Task 3/9、§3.3→Task 4/9、§3.4 L1→Task 7、L2→Task 10、L3→Task 11、§3.5→Task 8/9/13、§5 資料模型→Task 2、HANDOVER §1 驗證清單→偵察（已完成：端點/欄位/日期/CORS）+ Task 12
- 型別一致性：`fairKg(it, live, month)`、`liveOf(prices, item)`、`PriceEntry {kg,n}` 各 task 簽名一致
- 無 placeholder：CSS/文案移植步驟均指向確切來源（handover/index.html 行號）
