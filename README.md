# Social Video Finder V5A — IG-first Website + Chrome Extension

這個版本是 **V5A：免費優先版**。

重點不是網站後端匿名去撞 Instagram，而是：

- 使用者在自己瀏覽器登入 Instagram
- Chrome Extension 直接在 Instagram 分頁內執行搜尋 / 打開 hashtag 頁 / 自動捲動收集
- 收集到的結果輸出成 JSON
- 網站版 Dashboard 匯入 JSON 後做排序、篩選、匯出

這樣比「純網站自動搜 IG」穩定得多，也更接近你原本要的「真係幫我搵」。

---

## 專案結構

- `public/`：可直接部署到 GitHub Pages / Cloudflare Pages 的靜態網站
- `extension/`：Chrome Extension（Load unpacked）

---

## 你可以做到什麼

### 1) Extension 幫你找 IG 結果

Extension 支援兩種模式：

- **Hashtag 模式**：直接打開 `https://www.instagram.com/explore/tags/<tag>/` 再自動捲動收集
- **Keyword 模式**：嘗試在 Instagram 網頁版搜尋框輸入關鍵字，再收集當前頁可見貼文 / Reel 連結

### 2) Website 做分析

匯入 Extension 的 JSON 後，網站會：

- 分析語言（簡單 heuristic）
- 比對產品關鍵字
- 顯示背景主色（如果 Extension 成功分析到縮圖）
- 根據條件打分排序
- 匯出 CSV / JSON

---

## 部署網站

這個 V5A 網站版 **不需要後端**，因為分析在前端做。

所以可以直接部署到：

- GitHub Pages
- Cloudflare Pages
- Netlify

### 最簡單部署

把 `public/` 內的檔案部署出去即可。

如果用 Cloudflare Pages：

- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `public`

如果用 GitHub Pages：

- 建 repo
- 把 `public/` 內的內容放到 repo root，或者設定 Pages 指向 `public/`

---

## 安裝 Extension

1. 打開 Chrome
2. 進入 `chrome://extensions/`
3. 右上角開啟「開發人員模式」
4. 點「載入未封裝項目」
5. 選擇這個專案中的 `extension/` 資料夾

---

## 使用流程

### A. 用 Extension 搜 IG

1. 先登入 Instagram 網頁版
2. 打開 Extension popup
3. 輸入搜尋字
4. 選模式：
   - `Hashtag`：較穩定
   - `Keyword`：較靈活，但依賴 IG 畫面
5. 設定最大結果數 / 捲動輪數
6. 點 `開始搜尋並收集`
7. 收集完成後，點 `複製 JSON`

### B. 用 Website 分析

1. 打開你部署好的網站
2. 把 JSON 貼到輸入框，或上傳 JSON
3. 設定篩選條件：
   - 語言
   - 產品關鍵字
   - 背景主色
4. 按 `分析`
5. 查看結果、排序、匯出 CSV / JSON

---

## 注意事項

### 1. Keyword 模式不是官方 API

Keyword 模式屬於瀏覽器頁面自動化，因此會受 Instagram UI 改版影響。

### 2. Hashtag 模式較穩定

如果你的內容類型適合 hashtag 搜尋，例如：

- `#coffee`
- `#latteart`
- `#skincare`
- `#matcha`

建議優先用 Hashtag 模式。

### 3. 背景色分析不是每次都成功

因為某些圖片可能取不到像素資料，所以 Extension 會把顏色標記為 `unknown`。

### 4. 這個版本仍然不是官方全站搜尋

這個版本的本質是：

- 用使用者自己的登入瀏覽器環境去搜尋 / 開頁 / 收集
- 再由網站整理結果

它比純匿名網站穩定，但仍然受 Instagram 畫面結構影響。

---

## 最建議的搜尋策略

### 穩定度最高

- 用 Hashtag 模式
- 多試幾組 hashtag
- 收集後在 Dashboard 內再做產品、語言、顏色篩選

### 例子

找咖啡片：

- `coffee`
- `latteart`
- `coffeereview`
- `specialtycoffee`

找美妝：

- `skincare`
- `serum`
- `beautyroutine`

---

## 下一步可升級

### V5B

接付費資料源（Apify / Bright Data）做真正網站端自動搜尋

### V6

- Chrome Extension 正式版 UI
- 登入帳戶
- 收藏 / 專案管理
- AI 視覺辨識（產品 / 背景 / 場景）

