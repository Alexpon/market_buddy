# 菜市場比價

手機優先的菜市場即時比價工具：菜、水果、海鮮、肉類。輸入攤位價格（元/台斤、元/公斤、或元/顆・片・尾），立即判斷「俗／合理／偏貴」。

## 部署（GitHub Pages）
1. 這個資料夾推到一個 GitHub repo
2. Settings → Pages → Source 選 `main` branch 根目錄
3. Settings → Actions → General → Workflow permissions 勾 **Read and write**（讓排程能 commit prices.json）
4. 完成。之後每天台北時間 06:00 自動更新行情

## 更新機制（三層）
| 層級 | 觸發 | 內容 |
|---|---|---|
| 排程 | GitHub Actions cron，每日 06:00 | 抓近 30 天蔬果+漁產批發行情，寫入 `prices.json` |
| 手動（全站） | Actions 頁面 Run workflow，或網頁上「🔄 更新行情」重新讀取 | 同上 / 重讀 prices.json |
| 手動（單品項） | 品項詳細頁「查最新批發行情」 | 即時打 API 抓近 7 天該品項均價 |

## 本機測試
```bash
node scripts/update_prices.mjs   # 產生 prices.json（Node 18+）
python3 -m http.server 8000      # 開 http://localhost:8000
```

## 資料源
- 蔬果：農業部 `api/v1/AgriProductsTransType`（農產品批發市場交易行情）
- 漁產：農業部 `api/v1/AquaticTransData`（漁產品批發市場交易行情）
- 肉類：拍賣資料為活體毛豬/家禽價，與零售分切價落差大，維持內建零售基準值（`index.html` 內 `retail:true` 的項目）

## 校準
- 官方品名對照表在 `scripts/update_prices.mjs` 的 `VEG_FRUIT` / `FISH`，跑一次後看 log 哪些品項筆數為 0，調整關鍵字即可
- 單顆/單片重量與零售加成（×1.5~2）在 `index.html` 的 `DB` 與 `fairKg()`
