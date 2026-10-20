# v339 — 對接你提供的 CWA Worker 實測資料

已讀取 123.txt（realtime-v4）。它已有 O-A0003-001 weatherObservation；v338 的前端契約未適配 obsTime / wmo / windSpeedKmh，導致沒有正確啟動。此版修正前端對接，並提供可整份替換的 Worker v5。

## 前端

- 支援原 v4 與新 v5 的實測欄位，不必先更新 Worker 才能辨識既有氣象實測。
- 台灣無時區日期明確當作 +08:00；保留 20 分鐘／10 公里與查詢座標綁定檢查。
- 根據實測 weatherText 判讀天氣，修正舊 wmo 把雨夾雪、冰雹等歸成雨的問題。
- 溫度、風速、濕度、風向先驗證範圍，-99 等缺值不會觸發寒流。
- 相容現有雨量站、官方颱風警報判斷。颱風仍需所在地警戒、實測強風與實測降雨；地震維持手動預覽。
- 雲種照片是情境選材，不是雲種現場辨識；測站沒有雲量百分比時保留 null。

## Worker v5

- 保留原警報、颱風、地震資料流程與環境變數名稱。
- 增加 kind / time / code / windKmh 別名，保留舊欄位，向後相容。
- 先排除過期與未來異常時間的測站，再挑最近者。
- 冰雹、雨夾雪、雪與細雨先於一般雨判讀；輕靄不直接視為濃霧。
- 使用 WeatherElement.GustInfo.PeakGustSpeed，加入風向；m/s 轉 km/h。
- 相對濕度直接依 CWA 百分率使用，不把 1% 改成 100%。
- 雨跡 T 保留極小正值（0.01 mm 的呈現值，並非精確量測），不當成完全無雨。-99 等缺值保持 null。

## 安裝

1. Cloudflare → Workers & Pages → cwa-data → Edit code。
2. 打開 cwa-worker-v5.txt，複製全部內容，取代 Worker 原主程式。
3. 原有 CWA_API_KEY／CWA_TOKEN 保留不動，按 Deploy。
4. 開啟 https://cwa-data.onerkk.workers.dev/health ，確認 version 為 realtime-v5-2026-10-20。這只能確認版本，不能證明上游資料已成功取得。
5. 前端更新包 myshift-v339-station-preview-update.zip 仍包含 v338 尚未完成視覺驗收的攝影部分，請作驗證用途，非宣稱整體正式完成。

## 驗證與未完成事項

296 項 Node 測試通過，包含 v4 欄位相容、v5 欄位／單位、特殊現象、缺值、過期站篩選，以及以隔離的 8 組 CWA API 回應測試 Worker → 前端的完整傳遞。核心資源與更新器核對通過。沒有使用你的金鑰，也未部署 Worker 或主站，尚未驗證正式上游連線。

真實攝影圖片仍採在線載入；前回合下載受環境限制的狀況未解除，照片合成、手機裁切與效能仍未完成瀏覽器視覺驗收。本版完成的是已取得 Worker 的實測串接修正，不代表所有沉浸式設計已完成。

官方欄位與單位參考：https://opendata.cwa.gov.tw/opendatadoc/Observation/O-A0002-001.pdf
攝影來源與限制：images/atmosphere/PHOTOGRAPHS.md
