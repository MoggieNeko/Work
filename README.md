# 社交平台影片搜尋器（GitHub Pages 靜態版）

這是一個可直接部署到 GitHub Pages 的前端 MVP。

目標：
- 讓不太懂電腦的人，也可以按條件找影片
- 先以 Instagram / Reels 為主
- 可以按平台、語言、產品、背景顏色、關鍵字、時長等條件篩選
- 直接列出影片卡片、簡介、匹配原因與網址
- 可匯入你自己整理好的 JSON / CSV
- 可匯出目前篩選結果為 JSON / CSV

## 這個版本已包含什麼

- `index.html`：主頁
- `styles.css`：UI 樣式
- `app.js`：搜尋、篩選、匯入匯出、自然語句分析
- `data/videos.sample.json`：示範 mock data
- `templates/videos-template.csv`：CSV 匯入範本
- `templates/videos-template.json`：JSON 匯入範本
- `.nojekyll`：避免 GitHub Pages 對靜態檔案作不必要處理

## 適合的使用方式

### 1) 先做 Demo / 先上 GitHub Pages
直接把整個資料夾推上 GitHub，啟用 Pages 即可。

### 2) 之後接你自己的資料來源
你可以先用人工方式、或其他程式先把影片資料整理成 JSON / CSV，再匯入本頁面使用。

### 3) 再升級成「真自動掃描」版本
之後可在這個前端之上加：
- 後端 API
- Instagram / Meta 合規資料讀取
- 自動標註流程
- 影像分析（產品辨識、背景顏色抽取、語音語言偵測）
- 向量搜尋 / 語意搜尋

## 為什麼這個版本先做成靜態版

因為 GitHub Pages 只適合放前端靜態網站，不能安全保存 API token，也不適合直接做平台級資料抓取。

所以這個 MVP 的定位是：
- 先把「使用者搜尋流程」做好
- 先把畫面、篩選器、輸出結果、匯入匯出流程做好
- 等你之後確認需求，再接真資料源與後端

## 匯入資料格式

### JSON
每筆影片建議欄位：
- `id`
- `platform`
- `title`
- `url`
- `language`
- `creator`
- `durationSec`
- `publishedAt`
- `products`（array）
- `backgroundColors`（array）
- `hashtags`（array）
- `objects`（array）
- `scene`
- `summary`
- `notes`

### CSV
陣列欄位請用 `|` 分隔，例如：
- `products`: `coffee cup|espresso machine`
- `backgroundColors`: `pink|beige`

## GitHub Pages 部署方法

1. 建立一個新的 GitHub repository
2. 把本專案所有檔案上傳到 repository root
3. 到 GitHub repository 的 **Settings → Pages**
4. 在 **Build and deployment** 選擇：
   - **Source**: Deploy from a branch
   - **Branch**: `main`
   - **Folder**: `/ (root)`
5. 儲存後等待 GitHub Pages 發佈
6. 打開 GitHub 提供的網站網址

## 建議下一步（真正式版本）

如果你想要的不是「匯入資料後搜尋」，而是：
- 直接掃 Instagram 上的影片
- 自動分析影片裡面有什麼產品
- 自動判斷背景顏色
- 自動判斷語言
- 真正給一般用戶直接搜公海內容

那下一步建議架構是：

### 前端
- 保留這個 GitHub Pages 版 UI

### 後端
- Cloudflare Workers / Vercel / Supabase Edge Functions / Node API

### 資料層
- Supabase / PostgreSQL / Firestore

### 分析層
- Whisper / 語音辨識
- 視覺模型做產品與物件標註
- 色彩抽樣做背景色分類
- 向量資料庫做語意搜尋

### 流程
1. 後端定時收影片資料
2. 下載 metadata / caption / 可合規存取的內容
3. 做自動標註
4. 存入資料庫
5. 前端用本介面搜尋

## 注意

目前 `data/videos.sample.json` 內的連結是示範用 mock URL，不是真實素材。
正式使用時，請匯入你自己的真實資料。
