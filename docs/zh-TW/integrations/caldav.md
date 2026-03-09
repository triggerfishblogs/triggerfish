# CalDAV 整合

將您的 Triggerfish 代理連接到任何相容 CalDAV 的行事曆伺服器。這使您能在支援 CalDAV 標準的各種提供者上執行行事曆操作，包括 iCloud、Fastmail、Nextcloud、Radicale 和任何自架 CalDAV 伺服器。

## 支援的提供者

| 提供者     | CalDAV URL                                      | 備註                        |
| ---------- | ----------------------------------------------- | --------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | 需要應用程式專用密碼        |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | 標準 CalDAV                 |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | 自架                        |
| Radicale   | `https://your-server.com`                       | 輕量自架                    |
| Baikal     | `https://your-server.com/dav.php`               | 自架                        |

::: info 對於 Google Calendar，請改用 [Google Workspace](/zh-TW/integrations/google-workspace) 整合，它使用原生 Google API 搭配 OAuth2。CalDAV 適用於非 Google 的行事曆提供者。 :::

## 設定

### 步驟 1：取得您的 CalDAV 憑證

您需要從行事曆提供者取得三項資訊：

- **CalDAV URL** —— CalDAV 伺服器的基礎 URL
- **使用者名稱** —— 您的帳戶使用者名稱或電子郵件
- **密碼** —— 您的帳戶密碼或應用程式專用密碼

::: warning 應用程式專用密碼 大多數提供者需要應用程式專用密碼而非您的主帳戶密碼。請查閱您的提供者文件了解如何產生。 :::

### 步驟 2：配置 Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password stored in OS keychain
    classification: CONFIDENTIAL
```

| 選項             | 類型   | 必填 | 描述                                                |
| ---------------- | ------ | ---- | --------------------------------------------------- |
| `url`            | string | 是   | CalDAV 伺服器基礎 URL                               |
| `username`       | string | 是   | 帳戶使用者名稱或電子郵件                            |
| `password`       | string | 是   | 帳戶密碼（儲存在作業系統金鑰鏈中）                  |
| `classification` | string | 否   | 分類等級（預設：`CONFIDENTIAL`）                     |

### 步驟 3：行事曆探索

首次連接時，代理會執行 CalDAV 探索以找到所有可用的行事曆。發現的行事曆會在本地快取。

```bash
triggerfish connect caldav
```

## 可用工具

| 工具                | 描述                                                 |
| ------------------- | ---------------------------------------------------- |
| `caldav_list`       | 列出帳戶上的所有行事曆                               |
| `caldav_events`     | 從一個或所有行事曆擷取日期範圍內的事件               |
| `caldav_create`     | 建立新的行事曆事件                                   |
| `caldav_update`     | 更新現有事件                                         |
| `caldav_delete`     | 刪除事件                                             |
| `caldav_search`     | 按文字查詢搜尋事件                                   |
| `caldav_freebusy`   | 檢查時間範圍內的空閒/忙碌狀態                        |

## 分類

行事曆資料預設為 `CONFIDENTIAL`，因為它包含姓名、行程、地點和會議詳情。存取任何 CalDAV 工具會將工作階段 taint 提升到配置的分類等級。

## 驗證

CalDAV 使用 TLS 上的 HTTP Basic Auth。憑證儲存在作業系統金鑰鏈中，並在 LLM 上下文之下的 HTTP 層注入——代理永遠看不到原始密碼。

## 相關頁面

- [Google Workspace](/zh-TW/integrations/google-workspace) —— 用於 Google Calendar（使用原生 API）
- [排程與觸發器](/zh-TW/features/cron-and-triggers) —— 排程基於行事曆的代理動作
- [分類指南](/zh-TW/guide/classification-guide) —— 選擇正確的分類等級
