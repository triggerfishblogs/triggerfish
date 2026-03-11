# Plugin SDK 與沙箱

Triggerfish 外掛讓您可以用自訂程式碼擴展代理，與外部系統互動——CRM 查詢、資料庫操作、API 整合、多步驟工作流程——同時在雙層沙箱中執行，防止程式碼做任何未被明確允許的事情。

## 執行環境

外掛在 Deno + Pyodide（WASM）上執行。不需要 Docker、容器或 Triggerfish 安裝以外的先決條件。

- **TypeScript 外掛**直接在 Deno 沙箱中執行
- **Python 外掛**在 Pyodide（編譯為 WebAssembly 的 Python 直譯器）中執行，而 Pyodide 本身在 Deno 沙箱中執行

<img src="/diagrams/plugin-sandbox.svg" alt="外掛沙箱：Deno 沙箱包裝 WASM 沙箱，外掛程式碼在最內層執行" style="max-width: 100%;" />

這種雙層沙箱架構意味著即使外掛包含惡意程式碼，它也無法存取檔案系統、進行未宣告的網路呼叫或逃逸到主機系統。

## 外掛能做什麼

外掛在嚴格邊界內有靈活的內部空間。在沙箱內，您的外掛可以：

- 對目標系統執行完整的 CRUD 操作（使用使用者的權限）
- 執行複雜查詢和資料轉換
- 編排多步驟工作流程
- 處理和分析資料
- 跨呼叫維護外掛狀態
- 呼叫任何已宣告的外部 API 端點

## 外掛不能做什麼

| 約束                                   | 如何執行                                                        |
| -------------------------------------- | --------------------------------------------------------------- |
| 存取未宣告的網路端點                   | 沙箱封鎖所有不在允許清單上的網路呼叫                            |
| 發送無分類標籤的資料                   | SDK 拒絕未分類的資料                                            |
| 讀取資料而不進行汙染傳播               | SDK 在資料被存取時自動汙染 session                              |
| 在 Triggerfish 外部持久化資料          | 沙箱內無檔案系統存取                                            |
| 透過旁路通道洩漏資料                   | 執行資源限制，無原始 socket 存取                                |
| 使用系統憑證                           | SDK 封鎖 `get_system_credential()`；僅限使用者憑證              |

::: warning 安全 `sdk.get_system_credential()` 是**被封鎖**的設計。外掛必須始終透過 `sdk.get_user_credential()` 使用委派的使用者憑證。這確保代理只能存取使用者能存取的內容——永遠不會更多。 :::

## Plugin SDK 方法

SDK 為外掛提供了與外部系統和 Triggerfish 平台互動的受控介面。

### 憑證存取

```typescript
// 取得使用者對服務的委派憑證
const credential = await sdk.get_user_credential("salesforce");

// 檢查使用者是否已連接某個服務
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` 取得使用者對指定服務的 OAuth token 或 API 金鑰。如果使用者尚未連接該服務，呼叫會回傳 `null`，外掛應該優雅地處理這種情況。

### 資料操作

```typescript
// 使用使用者的權限查詢外部系統
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// 將資料發送回代理——分類標籤是必要的
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info 每次呼叫 `sdk.emitData()` 都需要一個 `classification` 標籤。如果您省略它，SDK 會拒絕該呼叫。這確保所有從外掛流向代理上下文的資料都被正確分類。 :::

### 連線檢查

```typescript
// 檢查使用者是否與某個服務有活躍連線
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## 外掛生命週期

每個外掛都遵循一個確保啟用前進行安全審查的生命週期。

```
1. 外掛建立（由使用者、代理或第三方）
       |
       v
2. 使用 Plugin SDK 建構外掛
   - 必須實作必要介面
   - 必須宣告端點和能力
   - 必須通過驗證
       |
       v
3. 外掛進入 UNTRUSTED 狀態
   - 代理無法使用它
   - 擁有者/管理員收到通知：「待分類」
       |
       v
4. 擁有者（個人）或管理員（企業）審查：
   - 此外掛存取什麼資料？
   - 它可以採取什麼動作？
   - 指定分類等級
       |
       v
5. 外掛在指定分類下啟用
   - 代理可以在策略約束內呼叫
   - 所有呼叫都通過策略鉤子
```

::: tip 在個人方案中，您就是擁有者——您審查和分類自己的外掛。在企業方案中，管理員管理外掛登錄並指定分類等級。 :::

## 資料庫連接

原生資料庫驅動程式（psycopg2、mysqlclient 等）在 WASM 沙箱中不起作用。外掛改為透過基於 HTTP 的 API 連接到資料庫。

| 資料庫     | 基於 HTTP 的選項                  |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST、Supabase SDK、Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK（HTTP）                   |

這是一個安全優勢，而非限制。所有資料庫存取都通過可檢查、可控制的 HTTP 請求流動，沙箱可以執行，稽核系統可以記錄。

## 撰寫 TypeScript 外掛

一個查詢 REST API 的最小 TypeScript 外掛：

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // 檢查使用者是否已連接該服務
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // 使用使用者的憑證查詢
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // 將分類後的資料發送回代理
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## 撰寫 Python 外掛

一個最小的 Python 外掛：

```python
async def execute(sdk):
    # 檢查連線
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # 使用使用者的憑證查詢
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # 帶有分類的資料發送
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Python 外掛在 Pyodide WASM 執行環境中執行。標準函式庫模組可用，但原生 C 擴充不可用。使用基於 HTTP 的 API 進行外部連接。

## 外掛安全摘要

- 外掛在雙層沙箱（Deno + WASM）中以嚴格隔離執行
- 所有網路存取必須在外掛清單中宣告
- 所有發送的資料必須帶有分類標籤
- 系統憑證被封鎖——只有使用者委派的憑證可用
- 每個外掛以 `UNTRUSTED` 進入系統，使用前必須分類
- 所有外掛呼叫都通過策略鉤子並被完整稽核
