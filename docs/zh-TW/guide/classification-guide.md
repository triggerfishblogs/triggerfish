# 選擇分類等級

Triggerfish 中的每個通道、MCP 伺服器、整合和 plugin 都必須有一個分類等級。本頁幫助你選擇正確的等級。

## 四個等級

| 等級             | 意義                                                   | 資料流向...                      |
| ---------------- | ------------------------------------------------------ | -------------------------------- |
| **PUBLIC**       | 任何人都可以看到                                       | 任何地方                         |
| **INTERNAL**     | 僅供自己查看——不敏感但非公開                           | INTERNAL、CONFIDENTIAL、RESTRICTED |
| **CONFIDENTIAL** | 包含你永遠不想洩漏的敏感資料                           | CONFIDENTIAL、RESTRICTED         |
| **RESTRICTED**   | 最敏感——法律、醫療、財務、PII                          | 僅 RESTRICTED                    |

資料只能**向上或平行**流動，永不向下。這是[禁止降級寫入規則](/zh-TW/security/no-write-down)，無法被覆蓋。

## 兩個要問的問題

對於你正在配置的任何整合，請問：

**1. 這個來源可能回傳的最敏感資料是什麼？**

這決定了**最低**分類等級。如果一個 MCP 伺服器可能回傳財務資料，它至少必須是 CONFIDENTIAL——即使它的大部分工具回傳的是無害的中繼資料。

**2. 我是否能接受工作階段資料流向_到_這個目的地？**

這決定了你想要分配的**最高**分類等級。較高的分類意味著使用它時工作階段 taint 會提升，這會限制資料之後的流向。

## 按資料類型分類

| 資料類型                               | 建議等級          | 原因                                     |
| ---------------------------------------- | ----------------- | ---------------------------------------- |
| 天氣、公開網頁、時區                     | **PUBLIC**        | 任何人都可自由取得                       |
| 你的個人筆記、書籤、工作清單             | **INTERNAL**      | 私人但即使暴露也不會造成損害             |
| 內部 wiki、團隊文件、專案看板            | **INTERNAL**      | 組織內部資訊                             |
| 電子郵件、日曆事件、聯絡人               | **CONFIDENTIAL**  | 包含姓名、行程、關係                     |
| CRM 資料、銷售管線、客戶記錄             | **CONFIDENTIAL**  | 業務敏感，客戶資料                       |
| 財務記錄、銀行帳戶、發票                 | **CONFIDENTIAL**  | 金融資訊                                 |
| 原始碼儲存庫（私有）                     | **CONFIDENTIAL**  | 智慧財產權                               |
| 醫療或健康記錄                           | **RESTRICTED**    | 法律保護（HIPAA 等）                     |
| 政府 ID 號碼、SSN、護照                  | **RESTRICTED**    | 身份盜竊風險                             |
| 法律文件、保密協議下的合約               | **RESTRICTED**    | 法律風險                                 |
| 加密金鑰、憑證、密鑰                     | **RESTRICTED**    | 系統被攻破的風險                         |

## MCP 伺服器

在 `triggerfish.yaml` 中新增 MCP 伺服器時，分類決定兩件事：

1. **工作階段 taint** — 呼叫此伺服器上的任何工具會將工作階段提升到此等級
2. **降級寫入防護** — 已被汙染到高於此等級的工作階段無法將資料傳送_到_此伺服器

```yaml
mcp_servers:
  # PUBLIC — 開放資料，無敏感性
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — 你自己的檔案系統，私有但非密鑰
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — 存取私有儲存庫、客戶問題
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — 含 PII、醫療記錄、法律文件的資料庫
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning 預設拒絕 如果你省略 `classification`，伺服器會被註冊為 **UNTRUSTED**，且 Gateway 會拒絕所有工具呼叫。你必須明確選擇一個等級。 :::

### 常見 MCP 伺服器分類

| MCP 伺服器                   | 建議等級        | 理由                                          |
| ------------------------------ | --------------- | --------------------------------------------- |
| 檔案系統（公開文件）           | PUBLIC          | 僅暴露公開可用的檔案                         |
| 檔案系統（家目錄）             | INTERNAL        | 個人檔案，無密鑰                             |
| 檔案系統（工作專案）           | CONFIDENTIAL    | 可能包含專有程式碼或資料                     |
| GitHub（僅公開儲存庫）         | INTERNAL        | 程式碼公開但使用模式是私有的                 |
| GitHub（私有儲存庫）           | CONFIDENTIAL    | 專有原始碼                                   |
| Slack                          | CONFIDENTIAL    | 工作場所對話，可能敏感                       |
| 資料庫（分析/報告）            | CONFIDENTIAL    | 聚合的業務資料                               |
| 資料庫（含 PII 的生產環境）    | RESTRICTED      | 包含個人可識別資訊                           |
| 天氣/時間/計算器               | PUBLIC          | 無敏感資料                                   |
| 網頁搜尋                       | PUBLIC          | 回傳公開可用的資訊                           |
| 電子郵件                       | CONFIDENTIAL    | 姓名、對話、附件                             |
| Google Drive                   | CONFIDENTIAL    | 文件可能包含敏感業務資料                     |

## 通道

通道分類決定**上限**——可以傳遞到該通道的資料的最大敏感度。

```yaml
channels:
  cli:
    classification: INTERNAL # 你的本地終端——安全用於內部資料
  telegram:
    classification: INTERNAL # 你的私人機器人——對擁有者而言與 CLI 相同
  webchat:
    classification: PUBLIC # 匿名訪客——僅公開資料
  email:
    classification: CONFIDENTIAL # 電子郵件是私有的但可能被轉寄
```

::: tip 擁有者 vs. 非擁有者 對於**擁有者**，所有通道具有相同的信任等級——無論你使用哪個應用程式，你就是你。通道分類對**非擁有者使用者**（webchat 上的訪客、Slack 頻道中的成員等）最為重要，在那裡它控制什麼資料可以流向他們。 :::

### 選擇通道分類

| 問題                                                                | 如果是...                 | 如果否...                 |
| ------------------------------------------------------------------- | ----------------------- | ----------------------- |
| 陌生人能在此通道看到訊息嗎？                                        | **PUBLIC**              | 繼續閱讀                |
| 此通道僅供你個人使用嗎？                                            | **INTERNAL** 或更高     | 繼續閱讀                |
| 訊息可能被轉發、截圖或被第三方記錄嗎？                              | 上限 **CONFIDENTIAL**   | 可能是 **RESTRICTED**   |
| 通道是端對端加密且完全由你控制嗎？                                  | 可能是 **RESTRICTED**   | 上限 **CONFIDENTIAL**   |

## 選錯了會怎樣

**太低（例如 CONFIDENTIAL 伺服器標記為 PUBLIC）：**

- 來自此伺服器的資料不會提升工作階段 taint
- 工作階段可能將分類資料流向公開通道——**資料洩漏風險**
- 這是危險的方向

**太高（例如 PUBLIC 伺服器標記為 CONFIDENTIAL）：**

- 使用此伺服器時工作階段 taint 不必要地提升
- 之後你會被封鎖無法傳送到較低分類的通道
- 令人困擾但**安全**——寧高勿低

::: danger 如有疑問，**分類設高一些**。你可以在審查伺服器實際回傳的資料後降低它。分類不足是安全風險；分類過高只是不便。 :::

## Taint 級聯

了解實際影響有助於你明智地選擇。以下是工作階段中發生的情況：

```
1. 工作階段以 PUBLIC 開始
2. 你查詢天氣（PUBLIC 伺服器）        → taint 保持 PUBLIC
3. 你查看筆記（INTERNAL 檔案系統）    → taint 提升到 INTERNAL
4. 你查詢 GitHub 問題（CONFIDENTIAL） → taint 提升到 CONFIDENTIAL
5. 你嘗試發布到 webchat（PUBLIC 通道）→ 被封鎖（降級寫入違規）
6. 你重設工作階段                      → taint 回到 PUBLIC
7. 你發布到 webchat                    → 允許
```

如果你經常在使用 CONFIDENTIAL 工具後使用 PUBLIC 通道，你會頻繁重設。考慮工具是否真的需要 CONFIDENTIAL，或者通道是否可以重新分類。

## 檔案系統路徑

你還可以分類個別的檔案系統路徑，這在你的代理有權存取混合敏感度目錄時很有用：

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## 審查清單

在上線新整合之前：

- [ ] 此來源可能回傳的最壞資料是什麼？以該等級分類。
- [ ] 分類是否至少與資料類型表建議的一樣高？
- [ ] 如果這是通道，分類是否適合所有可能的收件者？
- [ ] 你是否測試了 taint 級聯在典型工作流程中的運作？
- [ ] 如有疑問，你是否選擇了較高而非較低的分類？

## 相關頁面

- [禁止降級寫入規則](/zh-TW/security/no-write-down) — 固定的資料流規則
- [配置](/zh-TW/guide/configuration) — 完整 YAML 參考
- [MCP Gateway](/zh-TW/integrations/mcp-gateway) — MCP 伺服器安全模型
