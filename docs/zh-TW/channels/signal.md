# Signal

將您的 Triggerfish 代理連接到 Signal，讓人們可以從 Signal 應用程式向它傳送訊息。轉接器透過 JSON-RPC 與 [signal-cli](https://github.com/AsamK/signal-cli) daemon 通訊，使用您連結的 Signal 電話號碼。

## Signal 的不同之處

Signal 轉接器**就是**您的電話號碼。與 Telegram 或 Slack 有獨立的機器人帳號不同，Signal 訊息是從其他人傳送到您的號碼。這意味著：

- 所有傳入訊息都有 `isOwner: false`——它們永遠來自其他人
- 轉接器以您的電話號碼回覆
- 沒有像其他頻道那樣的每條訊息擁有者檢查

這使得 Signal 非常適合接收聯絡人傳送到您號碼的訊息，由代理代替您回覆。

## 預設分類

Signal 預設為 `PUBLIC` 分類。由於所有傳入訊息都來自外部聯絡人，`PUBLIC` 是安全的預設值。

## 設定

### 步驟 1：安裝 signal-cli

signal-cli 是 Signal 的第三方命令列客戶端。Triggerfish 透過 TCP 或 Unix socket 與它通訊。

**Linux（原生建置——不需要 Java）：**

從 [signal-cli releases](https://github.com/AsamK/signal-cli/releases) 頁面下載最新的原生建置，或讓 Triggerfish 在設定過程中為您下載。

**macOS / 其他平台（JVM 建置）：**

需要 Java 21+。如果未安裝 Java，Triggerfish 可以自動下載可攜式 JRE。

您也可以執行引導式設定：

```bash
triggerfish config add-channel signal
```

這會檢查 signal-cli，如果缺少則提供下載，並引導您完成連結。

### 步驟 2：連結您的裝置

signal-cli 必須連結到您現有的 Signal 帳號（類似連結桌面應用程式）：

```bash
signal-cli link -n "Triggerfish"
```

這會列印一個 `tsdevice:` URI。使用您的 Signal 手機應用程式掃描 QR 碼（設定 > 連結的裝置 > 連結新裝置）。

### 步驟 3：啟動 Daemon

signal-cli 作為背景 daemon 執行，Triggerfish 連接到它：

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

將 `+14155552671` 替換為您的 E.164 格式電話號碼。

### 步驟 4：設定 Triggerfish

將 Signal 新增到您的 `triggerfish.yaml`：

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| 選項               | 類型    | 必填 | 說明                                                                             |
| ------------------ | ------- | ---- | -------------------------------------------------------------------------------- |
| `endpoint`         | string  | 是   | signal-cli daemon 地址（`tcp://host:port` 或 `unix:///path/to/socket`）          |
| `account`          | string  | 是   | 您的 Signal 電話號碼（E.164 格式）                                               |
| `classification`   | string  | 否   | 分類上限（預設：`PUBLIC`）                                                       |
| `defaultGroupMode` | string  | 否   | 群組訊息處理：`always`、`mentioned-only`、`owner-only`（預設：`always`）          |
| `groups`           | object  | 否   | 每個群組的設定覆蓋                                                               |
| `ownerPhone`       | string  | 否   | 保留供未來使用                                                                   |
| `pairing`          | boolean | 否   | 在設定過程中啟用配對模式                                                         |

### 步驟 5：啟動 Triggerfish

```bash
triggerfish stop && triggerfish start
```

從另一個 Signal 使用者向您的電話號碼傳送訊息以確認連線。

## 群組訊息

Signal 支援群組聊天。您可以控制代理如何回應群組訊息：

| 模式             | 行為                                                   |
| ---------------- | ------------------------------------------------------ |
| `always`         | 回應所有群組訊息（預設）                               |
| `mentioned-only` | 僅在被電話號碼或 @提及時回應                           |
| `owner-only`     | 永不在群組中回應                                       |

全域或按群組設定：

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

群組 ID 是 base64 編碼的識別碼。使用 `triggerfish signal list-groups` 或查看 signal-cli 文件來找到它們。

## 訊息分塊

Signal 有 4,000 字元的訊息限制。超過此長度的回應會自動分割成多條訊息，在換行或空格處分割以保持可讀性。

## 輸入指示器

轉接器在代理處理請求時傳送輸入指示器。回覆傳送後輸入狀態會清除。

## 擴充工具

Signal 轉接器公開額外的工具：

- `sendTyping` / `stopTyping`——手動輸入指示器控制
- `listGroups`——列出帳號所屬的所有 Signal 群組
- `listContacts`——列出所有 Signal 聯絡人

## 變更分類

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

有效等級：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

變更後重新啟動 daemon：`triggerfish stop && triggerfish start`

## 可靠性功能

Signal 轉接器包含多項可靠性機制：

### 自動重新連線

如果與 signal-cli 的連線中斷（網路中斷、daemon 重新啟動），轉接器會以指數退避自動重新連線。不需要手動介入。

### 健康檢查

啟動時，Triggerfish 使用 JSON-RPC ping 探測來檢查現有的 signal-cli daemon 是否健康。如果 daemon 無回應，它會被終止並自動重新啟動。

### 版本追蹤

Triggerfish 追蹤已知的良好 signal-cli 版本（目前為 0.13.0），如果您安裝的版本較舊，會在啟動時發出警告。每次成功連線時都會記錄 signal-cli 版本。

### Unix Socket 支援

除了 TCP 端點，轉接器還支援 Unix 域 socket：

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## 疑難排解

**signal-cli daemon 無法連線：**

- 驗證 daemon 是否正在執行：檢查程序或嘗試 `nc -z 127.0.0.1 7583`
- signal-cli 僅綁定 IPv4——使用 `127.0.0.1`，而非 `localhost`
- TCP 預設連接埠為 7583
- 如果 Triggerfish 偵測到不健康的程序，會自動重新啟動 daemon

**訊息未到達：**

- 確認裝置已連結：檢查 Signal 手機應用程式中的「連結的裝置」
- signal-cli 在連結後必須至少接收一次同步
- 檢查日誌中的連線錯誤：`triggerfish logs --tail`

**Java 錯誤（僅 JVM 建置）：**

- signal-cli JVM 建置需要 Java 21+
- 執行 `java -version` 檢查
- 如有需要，Triggerfish 可以在設定過程中下載可攜式 JRE

**重新連線循環：**

- 如果您在日誌中看到重複的重新連線嘗試，signal-cli daemon 可能正在崩潰
- 檢查 signal-cli 自己的 stderr 輸出是否有錯誤
- 嘗試使用全新的 daemon 重新啟動：停止 Triggerfish，終止 signal-cli，然後重新啟動兩者
