# 菜市場比價 — 重構設計（v2）

日期：2026-08-29
狀態：使用者已核准
前身：`handover/` 交接版（單一 index.html 原型，見 handover/docs/SPEC.md v1.0）

## 1. 目標

把交接的單一 HTML 原型重構成**可擴充、易維護**的服務，功能與 UI 和交接版 1:1 對等，日後上線給多人使用。

## 2. 技術決策（使用者已拍板）

| 決策 | 選擇 | 理由 |
|---|---|---|
| 前端 | Vite + React + TypeScript（SPA、靜態輸出） | 模組化、可測試；靜態輸出相容 GitHub Pages；日後加註冊功能直接接 Supabase SDK，不必換框架 |
| 部署 | GitHub Pages（Source = GitHub Actions） | 免費、免金鑰、prices.json commit 天然有版本歷史 |
| 排程 | GitHub Actions cron（每日台北 06:00） | 沿用交接設計 |
| 註冊/帳號 | 本次不做 | 日後需要時加 Supabase（BaaS），架構不變 |

## 3. 專案結構

```
market_buddy/
├── data/items.json            品項總表（唯一資料來源，含官方品名關鍵字）
├── src/
│   ├── lib/pricing.ts         fairKg()、單位換算、取整（純函式）
│   ├── lib/season.ts          產季判斷
│   ├── lib/moa.ts             農業部 API 欄位正規化與端點
│   ├── hooks/usePrices.ts     載入 prices.json
│   ├── components/            Header/SearchBar/CategoryChips/ItemGrid/
│   │                          ItemSheet/PriceStamp/LiveQuery
│   ├── App.tsx / main.tsx / styles.css
├── scripts/update_prices.mjs  抓價腳本（讀 data/items.json）
├── public/prices.json         排程產物
├── tests/                     Vitest
└── .github/workflows/
    ├── update-prices.yml      每日抓價 commit
    └── deploy.yml             push → build → 部署 Pages
```

**單一資料來源**：交接版的品名對照表（scripts）與品項資料（index.html）分離、API 欄位解析兩處重複，HANDOVER 警告「兩處要同步改」。重構後收斂到 `data/items.json`（每品項含 `api: string[]` 官方品名關鍵字）與 `src/lib/moa.ts`，腳本與前端共用。

## 4. 資料模型

### items.json 品項
```jsonc
{
  "n": "高麗菜",          // 顯示名（= prices.json key）
  "a": ["甘藍"],          // 別名（搜尋）
  "c": "葉菜",            // 分類
  "w": [15, 25],          // 內建基準區間 元/公斤（fallback 用）
  "retail": true,         // 選填：w 已是零售價，不加成、不自動更新
  "peak": [12,1,2,3,4],   // 盛產月；長度 12 = 全年供應
  "pc": ["顆", 1.8],      // 選填：論個 [單位名, 每單位公斤]
  "api": ["甘藍"]         // 選填：官方品名關鍵字（無 = 不自動更新，如肉類）
}
```

### prices.json（沿用交接格式）
```json
{ "updatedAt": "ISO8601", "days": 30, "source": "data.moa.gov.tw",
  "items": { "高麗菜": { "kg": 21.3, "n": 412 } } }
```

## 5. 核心邏輯（沿用交接版，搬進 pricing.ts）

- 有官方行情：合理區間 = 近30天批發均價 × 加成1.8 × [0.8, 1.15]（不再套產季係數）
- 無官方行情：內建區間中價 × 1.8 × 產季係數(當季0.85/非產季1.15/全年1.0) × [0.8, 1.15]
- `retail:true`：加成 = 1.0
- 1 台斤 = 0.6 公斤；論個 = 單價 ÷ 單位重量
- 取整：≥100 取 5 的倍數

## 6. 更新機制（三層，沿用）

| 層 | 觸發 | 行為 |
|---|---|---|
| L1 | Actions cron 每日 06:00 台北 | 腳本抓近 30 天蔬果+漁產 → commit public/prices.json → 觸發重新部署 |
| L2 | Actions Run workflow / 前端 🔄 | 重跑腳本 / 重新 fetch（cache-bust） |
| L3 | 詳細頁「查最新批發行情」 | 前端直打 API 抓近 7 天（CORS 需實測；被擋則顯示 fallback 訊息與行情站連結） |

錯誤處理：prices.json 讀不到 → 無縫退回內建基準並標示「內建概略值」；腳本兩源都失敗 → exit 1 不覆寫舊檔。

## 7. 測試策略

- **Vitest**：pricing（有/無行情、retail、產季係數、單位換算、取整）、season、腳本聚合與品名比對（抽成可測模組）
- **首次真實 API 驗證**（HANDOVER §1，原環境無法連網）：實跑腳本、驗證漁產欄位名（`FishName/魚貨名稱`、`Avg_Price/AvgPrice/平均價` 為推測）、檢查對照表零命中品項、對照 amis.afa.gov.tw sanity check
- **瀏覽器驗證**：agent-browser 走完 搜尋→開品項→輸價→判斷 全流程

## 8. 範圍外（backlog，沿用交接 SPEC §7）

交易量加權/分市場、產季自動判定、歷史分位數、PWA、肉類趨勢提示、使用者校準（Supabase 階段再做）。

## 9. 完成定義

1. 功能與交接版 1:1 對等，`npm run build` 產出可部署靜態檔
2. 單元測試全綠；腳本經真實 API 驗證且對照表命中率確認
3. agent-browser 全流程實測通過
4. 使用者確認後刪除 `handover/`
