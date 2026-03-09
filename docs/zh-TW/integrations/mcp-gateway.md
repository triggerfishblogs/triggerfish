# MCP Gateway

> 使用任何 MCP 伺服器。我們保護邊界。

Model Context Protocol（MCP）是代理到工具通訊的新興標準。Triggerfish 提供安全的 MCP Gateway，讓您連接到任何 MCP 相容的伺服器，同時執行分類控制、工具層級的權限、汙染追蹤和完整的稽核日誌。

您帶來 MCP 伺服器。Triggerfish 保護每個跨越邊界的請求和回應。

## 運作方式

MCP Gateway 位於您的代理和任何 MCP 伺服器之間。每個工具呼叫在到達外部伺服器之前都會通過策略執行層，每個回應在進入代理上下文之前都會被分類。

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway 流程：Agent → MCP Gateway → 策略層 → MCP 伺服器，帶有拒絕路徑到 BLOCKED" style="max-width: 100%;" />

Gateway 提供五個核心功能：

1. **伺服器驗證和分類**——MCP 伺服器必須在使用前經過審查和分類
2. **工具層級的權限執行**——個別工具可以被允許、限制或封鎖
3. **請求/回應汙染追蹤**——session 汙染根據伺服器分類升級
4. **Schema 驗證**——所有請求和回應都根據宣告的 schema 驗證
5. **稽核日誌**——每個工具呼叫、決定和汙染變更都被記錄

## MCP 伺服器狀態

所有 MCP 伺服器預設為 `UNTRUSTED`。它們必須被明確分類後，代理才能呼叫它們。

| 狀態         | 說明                                                              | 代理可以呼叫？ |
| ------------ | ----------------------------------------------------------------- | :------------: |
| `UNTRUSTED`  | 新伺服器的預設值。待審查。                                        |       否       |
| `CLASSIFIED` | 已審查並指定分類等級和每個工具的權限。                            | 是（在策略內） |
| `BLOCKED`    | 被管理員明確禁止。                                                |       否       |

<img src="/diagrams/state-machine.svg" alt="MCP 伺服器狀態機：UNTRUSTED → CLASSIFIED 或 BLOCKED" style="max-width: 100%;" />

::: warning 安全 `UNTRUSTED` MCP 伺服器在任何情況下都不能被代理呼叫。LLM 無法請求、說服或欺騙系統使用未分類的伺服器。分類是程式碼層級的閘門，而非 LLM 決定。 :::

## 設定

MCP 伺服器在 `triggerfish.yaml` 中設定，以伺服器 ID 為鍵的映射。每個伺服器使用本地子程序（stdio 傳輸）或遠端端點（SSE 傳輸）。

### 本地伺服器（Stdio）

本地伺服器作為子程序產生。Triggerfish 透過 stdin/stdout 與它們通訊。

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### 遠端伺服器（SSE）

遠端伺服器在其他地方執行，透過 HTTP Server-Sent Events 存取。

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### 設定鍵

| 鍵               | 類型     | 必填        | 說明                                                                          |
| ---------------- | -------- | ----------- | ----------------------------------------------------------------------------- |
| `command`        | string   | 是（stdio） | 要產生的二進位檔（例如 `npx`、`deno`、`node`）                                |
| `args`           | string[] | 否          | 傳遞給命令的參數                                                              |
| `env`            | map      | 否          | 子程序的環境變數                                                              |
| `url`            | string   | 是（SSE）   | 遠端伺服器的 HTTP 端點                                                        |
| `classification` | string   | **是**      | 資料敏感度等級：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL` 或 `RESTRICTED`           |
| `enabled`        | boolean  | 否          | 預設：`true`。設為 `false` 可跳過而不移除設定。                               |

每個伺服器必須有 `command`（本地）或 `url`（遠端）。兩者都沒有的伺服器會被跳過。

### 延遲連線

MCP 伺服器在啟動後於背景連線。您不需要等待所有伺服器就緒才能使用代理。

- 伺服器以指數退避重試：2 秒 → 4 秒 → 8 秒 → 最多 30 秒
- 新伺服器在連線後立即可供代理使用——不需要重新啟動 session
- 如果伺服器在所有重試後仍無法連線，它會進入 `failed` 狀態，可在下次 daemon 重新啟動時重試

CLI 和 Tidepool 介面顯示即時的 MCP 連線狀態。詳情請參閱 [CLI 頻道](/zh-TW/channels/cli#mcp-伺服器狀態)。

### 停用伺服器

要暫時停用 MCP 伺服器而不移除其設定：

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # 啟動時跳過
```

### 環境變數和密鑰

以 `keychain:` 為前綴的環境變數值會在啟動時從作業系統金鑰鏈解析：

```yaml
env:
  API_KEY: "keychain:my-secret-name" # 從作業系統金鑰鏈解析
  PLAIN_VAR: "literal-value" # 原樣傳遞
```

只有 `PATH` 會從主機環境繼承（讓 `npx`、`node`、`deno` 等能正確解析）。沒有其他主機環境變數會洩漏到 MCP 伺服器子程序中。

::: tip 使用 `triggerfish config set-secret <name> <value>` 儲存密鑰。然後在您的 MCP 伺服器 env 設定中以 `keychain:<name>` 參考它們。 :::

### 工具命名

來自 MCP 伺服器的工具以 `mcp_<serverId>_<toolName>` 命名空間來避免與內建工具衝突。例如，如果名為 `github` 的伺服器公開一個名為 `list_repos` 的工具，代理會看到它為 `mcp_github_list_repos`。

### 分類與預設拒絕

如果您省略 `classification`，伺服器會被註冊為 **UNTRUSTED** 且 gateway 會拒絕所有工具呼叫。您必須明確選擇分類等級。請參閱[分類指南](/guide/classification-guide)以獲取選擇正確等級的幫助。

## 工具呼叫流程

當代理請求 MCP 工具呼叫時，gateway 在轉送請求前執行一系列確定性檢查。

### 1. 飛行前檢查

所有檢查都是確定性的——沒有 LLM 呼叫，沒有隨機性。

| 檢查                                        | 失敗結果                      |
| -------------------------------------------- | ----------------------------- |
| 伺服器狀態為 `CLASSIFIED`？                  | 封鎖：「伺服器未核准」        |
| 此伺服器允許該工具？                         | 封鎖：「工具未被允許」        |
| 使用者擁有所需權限？                         | 封鎖：「權限被拒」            |
| Session 汙染與伺服器分類相容？               | 封鎖：「將違反降級寫入」      |
| Schema 驗證通過？                            | 封鎖：「參數無效」            |

::: info 如果 session 汙染高於伺服器分類，呼叫會被封鎖以防止降級寫入。被汙染為 `CONFIDENTIAL` 的 session 無法向 `PUBLIC` MCP 伺服器傳送資料。 :::

### 2. 執行

如果所有飛行前檢查都通過，gateway 將請求轉送到 MCP 伺服器。

### 3. 回應處理

當 MCP 伺服器回傳回應時：

- 根據宣告的 schema 驗證回應
- 以伺服器的分類等級對回應資料進行分類
- 更新 session 汙染：`taint = max(current_taint, server_classification)`
- 建立追蹤資料來源的溯源記錄

### 4. 稽核

每個工具呼叫都會記錄：伺服器身份、工具名稱、使用者身份、策略決定、汙染變更和時間戳記。

## 回應汙染規則

MCP 伺服器回應繼承伺服器的分類等級。Session 汙染只能升級。

| 伺服器分類     | 回應汙染       | Session 影響                        |
| -------------- | -------------- | ----------------------------------- |
| `PUBLIC`       | `PUBLIC`       | 無汙染變更                          |
| `INTERNAL`     | `INTERNAL`     | 汙染升級至至少 `INTERNAL`           |
| `CONFIDENTIAL` | `CONFIDENTIAL` | 汙染升級至至少 `CONFIDENTIAL`       |
| `RESTRICTED`   | `RESTRICTED`   | 汙染升級至 `RESTRICTED`             |

一旦 session 被汙染到特定等級，它在 session 的剩餘時間內會保持在該等級或更高。需要完全重置 session（這會清除對話歷史）才能降低汙染。

## 使用者驗證透傳

對於支援使用者層級驗證的 MCP 伺服器，gateway 會透傳使用者的委派憑證而非系統憑證。

當工具設定了 `requires_user_auth: true` 時：

1. Gateway 檢查使用者是否已連接此 MCP 伺服器
2. 從安全的憑證儲存區取得使用者的委派憑證
3. 將使用者驗證新增到 MCP 請求標頭
4. MCP 伺服器執行使用者層級的權限

結果：MCP 伺服器看到的是**使用者的身份**，而非系統身份。權限繼承貫穿 MCP 邊界——代理只能存取使用者能存取的內容。

::: tip 使用者驗證透傳是管理存取控制的 MCP 伺服器的首選模式。這意味著代理繼承使用者的權限，而非擁有全面的系統存取。 :::

## Schema 驗證

Gateway 在轉送前驗證所有 MCP 請求和回應是否符合宣告的 schema：

```typescript
// 請求驗證（簡化版）
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // 根據 JSON schema 驗證參數
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // 檢查字串參數中的注入模式
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

Schema 驗證在請求到達外部伺服器之前攔截格式錯誤的請求，並標記字串參數中的潛在注入模式。

## 企業控制

企業部署對 MCP 伺服器管理有額外控制：

- **管理員管理的伺服器登錄**——只有管理員核准的 MCP 伺服器才能被分類
- **按部門的工具權限**——不同團隊可以有不同的工具存取
- **合規日誌**——所有 MCP 互動可在合規儀表板中查看
- **速率限制**——按伺服器和按工具的速率限制
- **伺服器健康監控**——Gateway 追蹤伺服器可用性和回應時間
