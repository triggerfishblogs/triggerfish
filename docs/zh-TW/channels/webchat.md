# WebChat

WebChat 頻道提供一個內建的、可嵌入的聊天小工具，透過 WebSocket 連接到您的 Triggerfish 代理。它專為面向客戶的互動、支援小工具，或任何您想提供網頁聊天體驗的場景而設計。

## 預設分類

WebChat 預設為 `PUBLIC` 分類。這是一個刻意的硬性預設：**網頁訪客永遠不會被視為擁有者**。無論設定為何，來自 WebChat session 的每條訊息都帶有 `PUBLIC` 汙染。

::: warning 訪客永遠不是擁有者 與其他透過使用者 ID 或電話號碼驗證擁有者身份的頻道不同，WebChat 為所有連線設定 `isOwner: false`。這意味著代理永遠不會從 WebChat session 執行擁有者等級的指令。這是一個刻意的安全決策——您無法驗證匿名網頁訪客的身份。 :::

## 設定

### 步驟 1：設定 Triggerfish

將 WebChat 頻道新增到您的 `triggerfish.yaml`：

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-site.com"
```

| 選項             | 類型     | 必填 | 說明                                   |
| ---------------- | -------- | ---- | -------------------------------------- |
| `port`           | number   | 否   | WebSocket 伺服器連接埠（預設：`8765`） |
| `classification` | string   | 否   | 分類等級（預設：`PUBLIC`）             |
| `allowedOrigins` | string[] | 否   | 允許的 CORS 來源（預設：`["*"]`）      |

### 步驟 2：啟動 Triggerfish

```bash
triggerfish stop && triggerfish start
```

WebSocket 伺服器開始在設定的連接埠上監聽。

### 步驟 3：連接聊天小工具

從您的網頁應用程式連接到 WebSocket 端點：

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // 伺服器指派了一個 session ID
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // 代理回應
    console.log("Agent:", frame.content);
  }
};

// 傳送訊息
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## 運作方式

### 連線流程

1. 瀏覽器客戶端對設定的連接埠開啟 WebSocket 連線
2. Triggerfish 將 HTTP 請求升級為 WebSocket
3. 產生唯一的 session ID（`webchat-<uuid>`）
4. 伺服器在 `session` frame 中將 session ID 傳送給客戶端
5. 客戶端以 JSON 格式傳送和接收 `message` frame

### 訊息 Frame 格式

所有訊息都是具有此結構的 JSON 物件：

```json
{
  "type": "message",
  "content": "Hello, how can I help?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Frame 類型：

| 類型      | 方向           | 說明                                    |
| --------- | -------------- | --------------------------------------- |
| `session` | 伺服器到客戶端 | 連線時傳送，包含指派的 session ID       |
| `message` | 雙向           | 含有文字內容的聊天訊息                  |
| `ping`    | 雙向           | 保持連線的 ping                         |
| `pong`    | 雙向           | 保持連線的回應                          |

### Session 管理

每個 WebSocket 連線都有自己的 session。當連線關閉時，session 會從活躍連線列表中移除。沒有 session 恢復機制——如果連線中斷，重新連線時會指派新的 session ID。

## 健康檢查

WebSocket 伺服器也會回應一般的 HTTP 請求作為健康檢查：

```bash
curl http://localhost:8765
# 回應："WebChat OK"
```

這對負載平衡器的健康檢查和監控很有用。

## 輸入指示器

Triggerfish 透過 WebChat 傳送和接收輸入指示器。當代理正在處理時，會向客戶端傳送輸入指示器 frame。小工具可以顯示此指示器來表明代理正在思考。

## 安全考量

- **所有訪客都是外部人員**——`isOwner` 永遠為 `false`。代理不會從 WebChat 執行擁有者指令。
- **PUBLIC 汙染**——每條訊息在 session 層級都被標記為 `PUBLIC` 汙染。代理在 WebChat session 中無法存取或回傳 `PUBLIC` 分類以上的資料。
- **CORS**——設定 `allowedOrigins` 以限制哪些網域可以連接。預設的 `["*"]` 允許任何來源，這適合開發環境，但在生產環境中應該鎖定。

::: tip 在生產環境中鎖定來源 對於生產部署，務必明確指定允許的來源：

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://your-domain.com"
      - "https://app.your-domain.com"
```

:::

## 變更分類

雖然 WebChat 預設為 `PUBLIC`，但您技術上可以將其設定為不同的等級。然而，由於 `isOwner` 永遠為 `false`，由於有效分類規則（`min(channel, recipient)`），所有訊息的有效分類仍然是 `PUBLIC`。

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # 允許，但 isOwner 仍然為 false
```

有效等級：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。
