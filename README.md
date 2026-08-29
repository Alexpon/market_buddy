# 菜市場比價

手機優先的菜市場即時比價工具：菜、水果、海鮮、肉類。輸入攤位價格（元/台斤、元/公斤、或元/顆・把・尾），立即判斷「俗／合理／偏貴」。

Vite + React + TypeScript 靜態站；行情由 GitHub Actions 每日自動抓農業部開放資料更新。

## 上線步驟（GitHub Pages）

1. 推到 GitHub repo
2. Settings → Pages → Source 選 **GitHub Actions**
3. Settings → Actions → General → Workflow permissions 勾 **Read and write**（讓排程能 commit prices.json）
4. Actions 頁手動跑一次「更新菜價行情」workflow 確認能 commit
5. 完成。此後每天台北 06:00 自動更新行情並重新部署

## 開發

```bash
npm install
npm run dev            # 開發伺服器
npm test               # 單元測試（Vitest）
npm run build          # tsc 檢查 + 產出 dist/
npm run update-prices  # 本機抓行情產生 public/prices.json
```

## 架構

```
data/items.json          品項總表（唯一資料來源）：品名、別名、分類、
                         內建基準區間、產季、論個單位、官方品名關鍵字(api)
src/lib/pricing.ts       判價邏輯 fairKg()、單位換算、取整
src/lib/season.ts        產季判斷
src/lib/moa.ts           農業部 API：端點、日期格式、欄位正規化、聚合
src/lib/catalog.ts       搜尋/分類/當季排序
src/hooks/usePrices.ts   載入 prices.json
src/components/          Header / SearchBar / CategoryChips / ItemGrid /
                         ItemSheet(bottom sheet) / PriceStamp / LiveQuery
scripts/update_prices.ts 抓價腳本（讀 data/items.json，逐日抓近 30 天）
public/prices.json       排程產物
.github/workflows/       update-prices.yml（每日排程）、deploy.yml（Pages 部署）
tests/                   Vitest（判價、產季、聚合、分頁、資料完整性）
```

### 更新機制（三層）

| 層級 | 觸發 | 行為 |
|---|---|---|
| L1 排程 | Actions cron 每日台北 06:00 | 抓近 30 天蔬果+漁產批發行情 → commit `public/prices.json` → 觸發重新部署 |
| L2 手動全站 | Actions「Run workflow」；或前端「🔄 更新行情」 | 重跑腳本 / 重新 fetch prices.json |
| L3 手動單品項 | 詳細頁「查最新批發行情」 | 前端直打 API 抓近 7 天該品項均價（CORS 已實測可用） |

讀不到 prices.json 時無縫退回內建基準值（`data/items.json` 的 `w`），離線可用。

### 判價邏輯

- 有官方行情：合理區間 = 近 30 天批發均價 × 加成 1.8 × [0.8, 1.15]
- 無官方行情：內建區間中價 × 1.8 × 產季係數（當季 0.85／非產季 1.15／全年 1.0）× [0.8, 1.15]
- `retail: true` 品項（肉類、鮭魚）：`w` 已是零售價，不加成、不自動更新
- 1 台斤 = 0.6 公斤；論個 = 單價 ÷ 單位重量

## 資料源（皆免金鑰、CORS 全開）

| 資料 | 端點 | 日期格式 | 品名欄位 |
|---|---|---|---|
| 蔬果批發行情 | `GET https://data.moa.gov.tw/api/v1/AgriProductsTransType/` | `115.08.25`（點分隔民國年） | `CropName` |
| 漁產批發行情 | `GET https://data.moa.gov.tw/api/v1/FisheryProductsTransType/` | `1150825`（**無點**；點分隔會靜默回 0 筆） | `SeafoodProdName` |

對照網站：https://amis.afa.gov.tw

### ⚠️ 實測發現的 API 地雷（2026-08-29 驗證）

1. **分頁是壞的**：結果超過 1000 筆時回 `Next: true`，但 `Page=2` 永遠回空陣列。
   因此腳本**逐日抓取**（單日多在 1000 筆內）；單日達 1000 筆會印警告。
2. 漁產端點是 `FisheryProductsTransType`；舊文件寫的 `AquaticTransData` 不存在。
3. 官方品名格式為「主類-品種」（例：`番茄-牛番茄`、`甘藍-初秋`、`甘薯-其他`）。
   比對用**前綴**（startsWith），避免「蘿蔔」誤吃「胡蘿蔔」、「胡瓜」誤吃「花胡瓜」。

## 校準

- 品名對照在 `data/items.json` 各品項的 `api` 欄位；跑 `npm run update-prices` 看
  「筆數為 0 的品項」log 逐一調整（非產季品項本來就會 0，屬正常）
- 鯛魚片無批發魚片拍賣資料，刻意不設 `api`（例外清單見 `tests/items.test.ts`）
- 肉類拍賣資料為活體毛豬/家禽價，與零售分切價無穩定換算，維持內建零售基準
- 單顆/單把重量（`pc`）為中等大小估值，值得在真實市場抽查校準

## Backlog（依價值排序）

1. 交易量加權（`Trans_Quantity`）/ 分市場（北部：台北一/二、三重、板橋）
2. 產季自動判定（該月歷史均價 vs 年均價，需 1–2 年歷史資料）
3. 歷史分位數判斷（P25/P75 取代均價 ×0.8~1.15）
4. PWA（manifest + service worker 離線快取）
5. 肉類接毛豬/家禽產地價做趨勢箭頭（不做絕對價判斷）
6. 使用者帳號與自訂校準（接 Supabase，見 docs/superpowers/specs/ 設計文件）
