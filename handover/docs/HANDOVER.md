# 工程交接注意事項

## 0. 現況一句話
純前端靜態頁（單一 `index.html`，零框架零依賴）＋ Node 抓價腳本 ＋ GitHub Actions 排程。**程式碼完成但未經真實網路驗證**（開發環境無法連農業部 API），首次部署要先做下面的驗證清單。

## 1. 首次部署驗證清單（依序）
- [ ] `node scripts/update_prices.mjs` 本機跑一次，確認兩個 API 可通、回傳非空
- [ ] **驗證漁產 API 欄位名**：`AquaticTransData` 的品名/均價欄位名是推測＋防禦寫法（`FishName/魚貨名稱`、`Avg_Price/AvgPrice/平均價`）。抓一筆原始 JSON 對照，錯了改 `update_prices.mjs` 的 `nameOf()`/`priceOf()` 與 `index.html` L3 查詢的同名函式（兩處要同步改）
- [ ] 看腳本 log：`筆數為 0 的品項` = 官方品名關鍵字沒對到，調 `VEG_FRUIT`/`FISH` 對照表。常見地雷：官方用「蕹菜」不是「空心菜」、「敏豆」不是「四季豆」、「柳橙」不是「柳丁」、蕃茄寫「蕃」不是「番」（對照表已按此填，但需實測確認）
- [ ] 產出的 `prices.json` 均價 sanity check：對照 https://amis.afa.gov.tw 抽查 3–5 個品項
- [ ] 前端本機起 server（`python3 -m http.server`）確認：header 顯示更新時間、品項出現綠色「自動更新」標籤
- [ ] 手機實測 L3「查最新批發行情」：確認 API 的 CORS。若被擋，把該按鈕改為讀 prices.json 或移除（L1/L2 不受影響）
- [ ] repo Settings → Actions → Workflow permissions 設 **Read and write**，手動 Run workflow 一次確認 commit 成功

## 2. 檔案地圖
```
index.html                     全部前端（CSS/JS/資料內嵌）。關鍵區塊：
                               - DB：品項資料（規格見 SPEC §5.1）
                               - fairKg()：判斷邏輯（SPEC §3.3）
                               - loadPrices()：讀 prices.json
                               - liveBtn.onclick：L3 即時查詢
scripts/update_prices.mjs      抓價腳本。VEG_FRUIT/FISH 品名對照表在檔頭
.github/workflows/update-prices.yml   每日 06:00 台北 + workflow_dispatch
prices.json                    排程產物（repo 內占位檔為空 items）
docs/SPEC.md                   需求規格
README.md                      部署步驟
```

## 3. 刻意的設計決策（改之前先知道為什麼）
- **單一 HTML、零框架**：發起人要「門檻最低」，目前複雜度不需要 build step。若要上 PWA/後端再引入工具鏈
- **prices.json 走 commit 而非 API proxy**：免後端、免金鑰、GitHub Pages 白嫖，且天然有版本歷史可回溯價格
- **肉類不自動更新**：拍賣資料是活體價，換算零售分切價會誤導（SPEC §5.3）
- **有官方行情時不套產季係數**：近 30 天均價本身已反映季節，再套會 double count
- **不用 localStorage**：目前無此需求；若日後加使用者校準功能需注意此頁也會在 Claude artifact 環境被開啟，該環境禁用 storage API
- **價格取整**：≥100 元取 5 的倍數（`rd()`），模擬市場喊價習慣

## 4. 發起人（PM）視角的驗收標準
1. 手機開頁 → 找到品項 → 輸入價格 → 看到判斷，全程 ≤ 10 秒、≤ 3 次點擊
2. 攤販說「一顆 50」不需要心算換台斤，直接切「元/顆」輸 50
3. 部署後基準價來自官方行情且每日自動更新；Actions 頁能手動觸發
4. 收訊差時仍可用（fallback 內建基準）

## 5. 聯絡與後續
Backlog 在 SPEC §7，優先做「交易量加權/分市場」與「產季自動判定」。內建基準值（DB 的 w）只在抓不到行情時使用，不必花時間精修；單位重量（pc）值得在真實市場抽查校準。
