# Gateway

Gateway 是 Triggerfish 的中央控制平面——一個長期執行的本機服務，透過單一 WebSocket 端點協調工作階段、通道、工具、事件和代理程序。Triggerfish 中發生的一切都通過 Gateway。

## 架構

<img src="/diagrams/gateway-architecture.svg" alt="Gateway 架構：左側通道通過中央 Gateway 連接到右側服務" style="max-width: 100%;" />

Gateway 監聽可配置的連接埠（預設 `18789`），接受來自通道適配器、CLI 指令、配套應用程式和內部服務的連接。所有通訊使用基於 WebSocket 的 JSON-RPC。

## Gateway 服務

Gateway 透過其 WebSocket 和 HTTP 端點提供以下服務：

| 服務             | 描述                                                                       | 安全整合                               |
| ---------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| **工作階段**     | 建立、列出、擷取記錄、在工作階段間傳送、產生背景任務                       | 每個工作階段追蹤 taint                 |
| **通道**         | 路由訊息、管理連接、重試失敗的傳遞、分割大型訊息                           | 所有輸出進行分類檢查                   |
| **排程**         | 排程週期性任務和從 `TRIGGER.md` 觸發喚醒                                   | 排程操作通過策略 hook                  |
| **Webhook**      | 透過 `POST /webhooks/:sourceId` 接受外部服務的入站事件                     | 入站資料在接收時被分類                 |
| **Ripple**       | 跨通道追蹤在線狀態和打字指示器                                             | 不暴露敏感資料                         |
| **設定**         | 無需重啟即可熱載入設定                                                     | 企業版僅限管理員                       |
| **控制面板**     | Gateway 健康狀況和管理的網頁儀表板                                         | 權杖驗證                               |
| **Tide Pool**    | 託管代理驅動的 A2UI 視覺工作區                                             | 內容受輸出 hook 約束                   |
| **通知**         | 具有優先順序路由的跨通道通知傳遞                                           | 分類規則適用                           |

## WebSocket JSON-RPC 協定

客戶端通過 WebSocket 連接到 Gateway 並交換 JSON-RPC 2.0 訊息。每個訊息都是具有型別化參數和型別化回應的方法呼叫。

```typescript
// 客戶端傳送：
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway 回應：
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Gateway 也為 webhook 接收提供 HTTP 端點。當附加 `SchedulerService` 時，`POST /webhooks/:sourceId` 路由可用於入站 webhook 事件。

## 伺服器介面

```typescript
interface GatewayServerOptions {
  /** 監聽的連接埠。使用 0 表示隨機可用連接埠。 */
  readonly port?: number;
  /** 連接的驗證權杖。 */
  readonly authToken?: string;
  /** 可選的排程器服務，用於 webhook 端點。 */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** 啟動伺服器。回傳綁定的位址。 */
  start(): Promise<GatewayAddr>;
  /** 優雅地停止伺服器。 */
  stop(): Promise<void>;
}
```

## 驗證

Gateway 連接使用權杖驗證。權杖在設定時（`triggerfish dive`）生成並儲存在本機。

::: warning 安全性 Gateway 預設綁定到 `127.0.0.1`，不暴露在網路上。遠端存取需要明確的隧道配置。永遠不要在沒有驗證的情況下將 Gateway WebSocket 暴露到公共網際網路。 :::

## 工作階段管理

Gateway 管理工作階段的完整生命週期。工作階段是對話狀態的基本單位，每個都有獨立的 taint 追蹤。

### 工作階段類型

| 類型      | 鍵模式                       | 描述                                                               |
| --------- | ---------------------------- | ------------------------------------------------------------------ |
| 主要      | `main`                       | 與擁有者的主要直接對話。跨重啟持久化。                             |
| 通道      | `channel:<type>:<id>`        | 每個連接的通道一個。每個通道獨立的 taint。                         |
| 背景      | `bg:<task_id>`               | 為排程任務和 webhook 觸發的任務產生。以 `PUBLIC` taint 開始。      |
| 代理      | `agent:<agent_id>`           | 多代理路由的每代理工作階段。                                       |
| 群組      | `group:<channel>:<group_id>` | 群組聊天工作階段。                                                 |

### 工作階段工具

代理通過以下工具與工作階段互動，全部透過 Gateway 路由：

| 工具               | 描述                                 | Taint 影響                             |
| ------------------ | ------------------------------------ | -------------------------------------- |
| `sessions_list`    | 列出帶有可選過濾器的活躍工作階段     | 無 taint 變更                          |
| `sessions_history` | 擷取工作階段的對話記錄               | Taint 繼承自被引用的工作階段           |
| `sessions_send`    | 傳送訊息到另一個工作階段             | 受降級寫入檢查約束                     |
| `sessions_spawn`   | 建立背景任務工作階段                 | 新工作階段以 `PUBLIC` taint 開始       |
| `session_status`   | 檢查當前工作階段狀態、模型、費用     | 無 taint 變更                          |

::: info 透過 `sessions_send` 的跨工作階段通訊受與任何其他輸出相同的降級寫入規則約束。`CONFIDENTIAL` 工作階段無法將資料傳送到連接 `PUBLIC` 通道的工作階段。 :::

## 通道路由

Gateway 通過通道路由器在通道和工作階段之間路由訊息。路由器處理：

- **分類閘控**：每個出站訊息在傳遞前通過 `PRE_OUTPUT`
- **帶退避的重試**：失敗的傳遞通過 `sendWithRetry()` 以指數退避重試
- **訊息分割**：大型訊息被分割成平台適當的區塊（例如 Telegram 的 4096 字元限制）
- **串流**：回應串流到支援串流的通道
- **連接管理**：`connectAll()` 和 `disconnectAll()` 用於生命週期管理

## 通知服務

Gateway 整合了一流的通知服務，取代平台上臨時的「通知擁有者」模式。所有通知通過單一 `NotificationService` 流動。

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### 優先順序路由

| 優先順序   | 行為                                                          |
| ---------- | ------------------------------------------------------------- |
| `CRITICAL` | 繞過靜音時段，立即傳遞到所有已連接的通道                     |
| `HIGH`     | 立即傳遞到偏好通道，離線時排隊                               |
| `NORMAL`   | 傳遞到活躍工作階段，或排隊等下次工作階段開始                 |
| `LOW`      | 排隊，在活躍工作階段期間批次傳遞                             |

### 通知來源

| 來源                       | 類別       | 預設優先順序 |
| -------------------------- | ---------- | ------------ |
| 策略違規                   | `security` | `CRITICAL`   |
| 威脅情報警報               | `security` | `CRITICAL`   |
| 技能審核請求               | `approval` | `HIGH`       |
| 排程任務失敗               | `system`   | `HIGH`       |
| 系統健康警告               | `system`   | `HIGH`       |
| Webhook 事件觸發           | `info`     | `NORMAL`     |
| The Reef 更新可用          | `info`     | `LOW`        |

通知通過 `StorageProvider`（命名空間：`notifications:`）持久化，並在重啟後存活。未傳遞的通知在下次 Gateway 啟動或工作階段連接時重試。

### 傳遞偏好

使用者按通道配置通知偏好：

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## 排程器整合

Gateway 託管排程器服務，管理：

- **排程任務迴圈**：週期性評估排程任務
- **觸發喚醒**：`TRIGGER.md` 中定義的代理喚醒
- **Webhook HTTP 端點**：用於入站事件的 `POST /webhooks/:sourceId`
- **協調器隔離**：每個排程任務在自己的 `OrchestratorFactory` 中以隔離的工作階段狀態執行

::: tip 排程觸發和 webhook 觸發的任務產生具有全新 `PUBLIC` taint 的背景工作階段。它們不繼承任何現有工作階段的 taint，確保自主任務以乾淨的分類狀態開始。 :::

## 健康與診斷

`triggerfish patrol` 指令連接到 Gateway 並執行診斷健康檢查，驗證：

- Gateway 正在執行且有回應
- 所有已配置的通道已連接
- 儲存可存取
- 排程任務按時執行
- 沒有未傳遞的重要通知卡在佇列中
