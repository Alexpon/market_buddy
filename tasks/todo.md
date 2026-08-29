# 菜市場比價重構 — 進度追蹤

完整計畫：`docs/superpowers/plans/2026-08-29-market-buddy-rebuild.md`
設計文件：`docs/superpowers/specs/2026-08-29-market-buddy-rebuild-design.md`

## 前置偵察（已完成）
- [x] 實測蔬果 API：端點/欄位與交接文件一致，日期 `115.08.25`
- [x] 實測漁產 API：端點是 `FisheryProductsTransType`（交接版 `AquaticTransData` 不存在）、欄位 `SeafoodProdName`、日期無點 `1150825`
- [x] CORS 確認兩 API 皆 `*`，L3 前端直查可行

## 實作任務
- [ ] Task 1: 專案鷹架（Vite + React + TS + Vitest）
- [ ] Task 2: data/items.json 單一資料來源 + 型別 + 資料驗證測試
- [ ] Task 3: season.ts（TDD）
- [ ] Task 4: pricing.ts 判價核心（TDD）
- [ ] Task 5: moa.ts API 模組（TDD，實測欄位）
- [ ] Task 6: catalog.ts 搜尋/排序（TDD）
- [ ] Task 7: 抓價腳本 + 兩條 GitHub workflow
- [ ] Task 8: UI 骨架（Header/搜尋/分類/品項格 + CSS 移植）
- [ ] Task 9: ItemSheet + 判價印章
- [ ] Task 10: usePrices 行情載入
- [ ] Task 11: L3 單品即時查詢
- [ ] Task 12: 真實抓價 + 品名對照校準
- [ ] Task 13: E2E 驗證 + README + 使用者確認後刪 handover/
