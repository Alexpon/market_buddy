# 菜市場比價重構 — 進度追蹤

完整計畫：`docs/superpowers/plans/2026-08-29-market-buddy-rebuild.md`
設計文件：`docs/superpowers/specs/2026-08-29-market-buddy-rebuild-design.md`

## 前置偵察（已完成）
- [x] 實測蔬果 API：端點/欄位與交接文件一致，日期 `115.08.25`
- [x] 實測漁產 API：端點是 `FisheryProductsTransType`（交接版 `AquaticTransData` 不存在）、欄位 `SeafoodProdName`、日期無點 `1150825`
- [x] CORS 確認兩 API 皆 `*`，L3 前端直查可行

## 實作任務
- [x] Task 1: 專案鷹架（Vite + React + TS + Vitest）
- [x] Task 2: data/items.json 單一資料來源 + 型別 + 資料驗證測試
- [x] Task 3: season.ts（TDD）
- [x] Task 4: pricing.ts 判價核心（TDD）
- [x] Task 5: moa.ts API 模組（TDD，實測欄位）
- [x] Task 6: catalog.ts 搜尋/排序（TDD）
- [x] Task 7: 抓價腳本 + 兩條 GitHub workflow
- [x] Task 8: UI 骨架（Header/搜尋/分類/品項格 + CSS 移植）
- [x] Task 9: ItemSheet + 判價印章（含 Task 11 LiveQuery，提前合併保持 commit 可建置）
- [x] Task 10: usePrices 行情載入
- [x] Task 11: L3 單品即時查詢（併入 Task 9）
- [x] Task 12: 真實抓價 + 品名對照校準（80/83 命中）
- [x] Task 13: E2E 驗證 + README
- [ ] 使用者確認後刪 handover/

## Review

### 執行中發現並解決的問題（超出計畫預期）
1. **MOA API 分頁損壞**：>1000 筆時 `Next=true` 但第 2 頁回空。交接版腳本上線只會拿到
   約 1 天的資料且不報錯。改為逐日抓取（30 天 = 每源 30 次請求）。
2. **官方品名格式**是「主類-品種」（`番茄-牛番茄`），非交接版假設的空格式（`番茄 牛蕃茄`）。
   比對改 startsWith 前綴，並校準 26 個品項關鍵字。
3. **鯛魚片**：批發拍賣只有整尾魚，無魚片資料，改為不自動更新（測試有例外清單註記）。
4. 交接文件推測的漁產欄位名（FishName/魚貨名稱）全錯，實為 `SeafoodProdName`。

### 驗證證據
- Vitest 41 tests 全綠；`tsc --noEmit` 無錯；`npm run build` 成功
- 真實抓價：蔬果 28,886 筆 + 漁產 14,157 筆 → 80/83 品項有行情（3 項非產季）
- 均價 sanity check：高麗菜 30 天 29 元/公斤 vs 7 天即查 26.3 一致；其餘抽查皆落內建區間
- Playwright E2E（375px 手機視窗、production build）：載入綠標 → 搜尋（含別名）→
  開品項 → 三種單位判價三態 → L3 蔬果/海鮮即查成功 → 肉類正確隱藏 L3 → 🔄 更新
