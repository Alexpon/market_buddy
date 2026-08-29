// 抓農業部近 N 天蔬果+漁產批發行情，聚合各品項均價，寫入 public/prices.json。
// 用法：npm run update-prices（tsx，Node 20+）
// 每日由 .github/workflows/update-prices.yml 排程執行並 commit。
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { vegUrl, fishUrl, aggregate } from "../src/lib/moa";
import type { Item, PricesFile } from "../src/lib/types";
import { fetchAllPages } from "./fetch_pages";

const DAYS = 30;
const ITEMS_PATH = fileURLToPath(new URL("../data/items.json", import.meta.url));
const OUT_PATH = fileURLToPath(new URL("../public/prices.json", import.meta.url));

const items = JSON.parse(readFileSync(ITEMS_PATH, "utf8")) as Item[];
const end = new Date();
const start = new Date(end);
start.setDate(start.getDate() - DAYS);

console.log(`抓取近 ${DAYS} 天（${start.toISOString().slice(0, 10)} ~ ${end.toISOString().slice(0, 10)}）…`);

const collected: Record<string, { kg: number; n: number }> = {};

async function run(label: string, urlFor: (page: number) => string, subset: Item[]) {
  try {
    const rows = await fetchAllPages(urlFor);
    console.log(`${label} 原始筆數：${rows.length}`);
    Object.assign(collected, aggregate(rows, subset));
  } catch (e) {
    console.error(`${label} 抓取失敗：`, (e as Error).message);
  }
}

const vegItems = items.filter((i) => i.c !== "海鮮");
const fishItems = items.filter((i) => i.c === "海鮮");

await run("蔬果", (p) => vegUrl(start, end, p), vegItems);
await run("漁產", (p) => fishUrl(start, end, p), fishItems);

if (Object.keys(collected).length === 0) {
  console.error("兩個資料源都沒抓到資料，不覆寫 prices.json");
  process.exit(1);
}

const missing = items.filter((i) => i.api?.length && !collected[i.n]).map((i) => i.n);
if (missing.length) console.warn(`筆數為 0 的品項（檢查 data/items.json 的 api 關鍵字）：${missing.join("、")}`);

const payload: PricesFile = {
  updatedAt: new Date().toISOString(),
  days: DAYS,
  source: "data.moa.gov.tw",
  items: collected,
};
writeFileSync(OUT_PATH, JSON.stringify(payload, null, 1) + "\n");
console.log(`完成：${Object.keys(collected).length}/${items.filter((i) => i.api?.length).length} 個可更新品項 → public/prices.json`);
