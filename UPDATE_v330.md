# 手機後台與班表更新中心 v330

後台：https://onerkk.github.io/myshift/admin/index.html

更新中心：https://onerkk.github.io/myshift/update.html

本次 GitHub 整合寫入遭 403 拒絕，尚未部署。首次只需將 update.html 上傳到 onerkk/myshift 的 main 分支根目錄，等 GitHub Pages 部署後開啟上述網址，再選取本次完整 ZIP 即可一鍵套用後台修正。

## 後台調整

- 手機以兩欄完整顯示八個功能，桌面採側欄導航。
- 統一表單、按鈕、卡片與欄位間距；長 Email 與班制文字可換行。
- 搜尋只更新使用者清單，不重建輸入框。
- 管理後台加入「網站更新」入口。
- 修正主站 Service Worker 將後台與更新中心的目錄網址誤當首頁。

## 手機更新

1. 開啟更新中心，填入 GitHub Fine-grained access token。
2. Token 限定 onerkk/myshift，Contents: Read and write；Actions: Read-only、Pages: Read-only 用於查詢部署。
3. 選擇完整 ZIP 或保留目錄結構的變動檔案 ZIP，按「檢查更新包」。
4. 確認變動清單後按「一鍵更新網站」，保持頁面開啟至部署結果出現。

Token 只在當頁記憶體中使用，不存 localStorage。每次重新開啟需重新貼上。

比對 Git blob 雜湊，只上傳變動內容；用 base tree 保留 ZIP 外的既有檔案，再一次更新分支。檢查後若有其他更新，拒絕覆蓋並要求重新比對。不執行 DELETE_FILES.txt；不刪除缺少於 ZIP 的檔案。略過隱藏目錄、私人來源資料、測試資料、ZIP、金鑰與歷史雜湊清單。ZIP 僅接受可信任來源。

ZIP 上限 50 MiB，單檔 15 MiB，解壓縮總量 150 MiB。更新頁不修改 Firestore 人員、班表、請假或薪資資料。

已提交與部署完成分開顯示。若無部署查詢權限或兩分鐘內未完成，提供重新檢查與 Actions 入口。GitHub 分支保護規則可能禁止直接更新；此時頁面顯示 GitHub 拒絕原因。

驗證：260 項 Node 自動測試通過；啟動資源雜湊檢查通過。測試未使用正式人員資料寫入。執行環境無可用 Chromium，未將自動化程式測試宣稱為實機手機驗證。
