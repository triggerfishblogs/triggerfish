# 瀏覽器自動化

Triggerfish 透過專用的受管理 Chromium 實例，使用 CDP（Chrome DevTools Protocol）提供深度瀏覽器控制。代理可以瀏覽網頁、與頁面互動、填寫表單、擷取螢幕截圖和自動化網頁工作流程——所有操作都在策略執行下進行。

## 架構

瀏覽器自動化基於 `puppeteer-core` 建構，透過 CDP 連接到受管理的 Chromium 實例。每個瀏覽器動作在到達瀏覽器之前都會通過策略層。

Triggerfish 自動偵測 Chromium 系列瀏覽器，包括 **Google Chrome**、**Chromium** 和 **Brave**。偵測涵蓋 Linux、macOS、Windows 和 Flatpak 環境的標準安裝路徑。

::: info `browser_navigate` 工具需要 `http://` 或 `https://` URL。瀏覽器內部 scheme（如 `chrome://`、`brave://`、`about:`）不受支援，會回傳錯誤並指引使用網頁 URL。 :::

<img src="/diagrams/browser-automation-flow.svg" alt="瀏覽器自動化流程：Agent → Browser Tool → 策略層 → CDP → 受管理的 Chromium" style="max-width: 100%;" />

瀏覽器設定檔按代理隔離。受管理的 Chromium 實例不與您的個人瀏覽器共享 cookie、session 或本地儲存。預設停用憑證自動填寫。

## 可用動作

| 動作       | 說明                                       | 使用範例                                        |
| ---------- | ------------------------------------------ | ----------------------------------------------- |
| `navigate` | 前往 URL（受域名策略約束）                 | 開啟網頁進行研究                                |
| `snapshot` | 擷取頁面螢幕截圖                           | 記錄 UI 狀態、擷取視覺資訊                      |
| `click`    | 點擊頁面上的元素                           | 提交表單、啟動按鈕                              |
| `type`     | 在輸入欄位中輸入文字                       | 填寫搜尋框、完成表單                            |
| `select`   | 從下拉選單中選擇選項                       | 從選單中選擇                                    |
| `upload`   | 上傳檔案到表單                             | 附加文件                                        |
| `evaluate` | 在頁面上下文中執行 JavaScript（沙箱化的）  | 擷取資料、操作 DOM                              |
| `wait`     | 等待元素或條件                             | 確保頁面已載入後再互動                          |

## 域名策略執行

代理導航到的每個 URL 在瀏覽器動作之前都會根據域名允許清單和拒絕清單進行檢查。

### 設定

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### 域名策略如何運作

1. 代理呼叫 `browser.navigate("https://github.com/org/repo")`
2. `PRE_TOOL_CALL` 鉤子以 URL 作為上下文觸發
3. 策略引擎根據允許/拒絕清單檢查域名
4. 如果被拒絕或不在允許清單上，導航被**封鎖**
5. 如果被允許，查詢域名分類
6. Session 汙染升級以匹配域名分類
7. 導航繼續

::: warning 安全 如果域名不在允許清單上，導航預設被封鎖。LLM 無法覆蓋域名策略。這防止代理訪問可能暴露敏感資料或觸發非預期動作的任意網站。 :::

## 螢幕截圖和分類

透過 `browser.snapshot` 擷取的螢幕截圖繼承 session 當前的汙染等級。如果 session 被汙染為 `CONFIDENTIAL`，該 session 的所有螢幕截圖都被分類為 `CONFIDENTIAL`。

這對輸出策略很重要。分類為 `CONFIDENTIAL` 的螢幕截圖無法傳送到 `PUBLIC` 頻道。`PRE_OUTPUT` 鉤子在邊界處執行此規則。

## 爬取內容和溯源

當代理從網頁中擷取內容（透過 `evaluate`、讀取文字或解析元素）時，擷取的資料：

- 根據域名指定的分類等級進行分類
- 建立追蹤來源 URL、擷取時間和分類的溯源記錄
- 貢獻到 session 汙染（汙染升級以匹配內容分類）

這種溯源追蹤意味著您始終可以追蹤資料的來源，即使它是數週前從網頁爬取的。

## 安全控制

### 每個代理的瀏覽器隔離

每個代理獲得自己的瀏覽器設定檔。這意味著：

- 代理之間不共享 cookie
- 不共享本地儲存或 session 儲存
- 無法存取主機瀏覽器的 cookie 或 session
- 預設停用憑證自動填寫
- 不載入瀏覽器擴充

### 策略鉤子整合

所有瀏覽器動作都通過標準策略鉤子：

| 鉤子                 | 觸發時機                       | 檢查內容                                            |
| -------------------- | ------------------------------ | --------------------------------------------------- |
| `PRE_TOOL_CALL`      | 每個瀏覽器動作之前             | 域名允許清單、URL 策略、動作權限                    |
| `POST_TOOL_RESPONSE` | 瀏覽器回傳資料後               | 分類回應、更新 session 汙染、建立溯源               |
| `PRE_OUTPUT`         | 瀏覽器內容離開系統時           | 根據目的地進行分類檢查                              |

### 資源限制

- 導航逾時防止瀏覽器無限期掛起
- 頁面載入大小限制防止過度的記憶體消耗
- 每個代理執行並行分頁限制

## 企業控制

企業部署有額外的瀏覽器自動化控制：

| 控制                        | 說明                                                                 |
| --------------------------- | -------------------------------------------------------------------- |
| 域名層級分類                | 內部網域自動分類為 `INTERNAL`                                        |
| 封鎖域名清單                | 管理員管理的禁止域名清單                                             |
| 螢幕截圖保留策略            | 擷取的螢幕截圖儲存多長時間                                           |
| 瀏覽器 session 稽核日誌     | 完整記錄所有瀏覽器動作供合規使用                                     |
| 停用瀏覽器自動化            | 管理員可以為特定代理或角色完全停用瀏覽器工具                         |

## 範例：網頁研究工作流程

使用瀏覽器自動化的典型代理工作流程：

```
1. 使用者：「研究 example-competitor.com 上的競爭對手定價」

2. 代理：browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL：域名 "example-competitor.com" 根據允許清單檢查
          -> 允許，分類為 PUBLIC
          -> 導航繼續

3. 代理：browser.snapshot()
          -> 擷取螢幕截圖，分類為 session 汙染等級（PUBLIC）

4. 代理：browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> 文字擷取，分類為 PUBLIC
          -> 建立溯源記錄：source=example-competitor.com/pricing

5. 代理：摘要定價資訊並回傳給使用者
          -> PRE_OUTPUT：PUBLIC 資料到使用者頻道——允許
```

每個步驟都被記錄、分類和可稽核。
