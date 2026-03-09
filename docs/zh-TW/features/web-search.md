# 網頁搜尋和擷取

Triggerfish 透過兩個工具讓您的代理存取網際網路：`web_search` 用於尋找資訊，`web_fetch` 用於讀取網頁。它們讓代理可以研究主題、查閱文件、檢查最新事件，並從網頁拉取資料——全部在與任何其他工具相同的策略執行之下。

## 工具

### `web_search`

搜尋網頁。回傳標題、URL 和摘要。

| 參數          | 類型   | 必要 | 描述                                                                                        |
| ------------- | ------ | ---- | ------------------------------------------------------------------------------------------- |
| `query`       | string | 是   | 搜尋查詢。要具體——包含相關關鍵字、名稱或日期以獲得更好的結果。                              |
| `max_results` | number | 否   | 回傳的最大結果數（預設：5，最大：20）。                                                     |

**範例回應：**

```
Search results for "deno sqlite module":

1. @db/sqlite - Deno SQLite bindings
   https://jsr.io/@db/sqlite
   Fast SQLite3 bindings for Deno using FFI...

2. Deno SQLite Guide
   https://docs.deno.com/examples/sqlite
   How to use SQLite with Deno...
```

### `web_fetch`

擷取並提取 URL 的可讀內容。預設使用 Mozilla Readability 回傳文章文字。

| 參數   | 類型   | 必要 | 描述                                                                         |
| ------ | ------ | ---- | ---------------------------------------------------------------------------- |
| `url`  | string | 是   | 要擷取的 URL。使用 `web_search` 結果中的 URL。                               |
| `mode` | string | 否   | 擷取模式：`readability`（預設，文章文字）或 `raw`（完整 HTML）。             |

**擷取模式：**

- **`readability`**（預設）—— 擷取主要文章內容，去除導覽、廣告和樣板。最適合新聞文章、部落格文章和文件。
- **`raw`** —— 回傳完整 HTML。當 readability 擷取回傳太少內容時使用（例如單頁應用程式、動態內容）。

## 代理如何使用它們

代理遵循搜尋後擷取的模式：

1. 使用 `web_search` 尋找相關 URL
2. 使用 `web_fetch` 讀取最有希望的頁面
3. 綜合資訊並引用來源

當使用網頁資訊回答時，代理內嵌引用來源 URL，使它們在所有通道（Telegram、Slack、CLI 等）中可見。

## 配置

網頁搜尋需要搜尋供應商。在 `triggerfish.yaml` 中配置：

```yaml
web:
  search:
    provider: brave # 搜尋後端（brave 是預設值）
    api_key: your-api-key # Brave Search API 金鑰
```

| 鍵                    | 類型   | 描述                                          |
| --------------------- | ------ | --------------------------------------------- |
| `web.search.provider` | string | 搜尋後端。目前支援：`brave`。                 |
| `web.search.api_key`  | string | 搜尋供應商的 API 金鑰。                       |

::: tip 如果沒有配置搜尋供應商，`web_search` 回傳錯誤訊息告知代理搜尋不可用。`web_fetch` 獨立運作——它不需要搜尋供應商。 :::

## 安全性

- 所有擷取的 URL 通過 SSRF 防護：先解析 DNS 然後檢查硬編碼的 IP 拒絕清單。私有/保留 IP 範圍始終被封鎖。
- 擷取的內容被分類並像任何其他工具回應一樣貢獻到工作階段 taint。
- `PRE_TOOL_CALL` hook 在每次擷取前觸發，`POST_TOOL_RESPONSE` 在之後觸發，因此自訂策略規則可以限制代理存取哪些網域。
