# 疑難排解：設定

## YAML 解析錯誤

### 「Configuration parse failed」

YAML 檔案有語法錯誤。常見原因：

- **縮排不一致。** YAML 對空白字元敏感。請使用空格，不要使用 Tab。每個巢狀層級應恰好 2 個空格。
- **未加引號的特殊字元。** 包含 `:`、`#`、`{`、`}`、`[`、`]` 或 `&` 的值必須加引號。
- **鍵後缺少冒號。** 每個鍵需要 `: `（冒號後接一個空格）。

驗證您的 YAML：

```bash
triggerfish config validate
```

或使用線上 YAML 驗證器來找到確切的行數。

### 「Configuration file did not parse to an object」

YAML 檔案解析成功，但結果不是 YAML 映射（物件）。這發生在您的檔案僅包含純量值、清單或為空時。

您的 `triggerfish.yaml` 必須有頂層映射。至少需要：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### 「Configuration file not found」

Triggerfish 依照以下順序查找設定檔：

1. `$TRIGGERFISH_CONFIG` 環境變數（如果已設定）
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml`（如果已設定 `TRIGGERFISH_DATA_DIR`）
3. `/data/triggerfish.yaml`（Docker 環境）
4. `~/.triggerfish/triggerfish.yaml`（預設）

執行設定精靈來建立一個：

```bash
triggerfish dive
```

---

## 驗證錯誤

### 「Configuration validation failed」

這表示 YAML 解析成功但結構驗證失敗。具體訊息：

**「models is required」** 或 **「models.primary is required」**

`models` 區段是必要的。您至少需要一個主要供應商和模型：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**「primary.provider must be non-empty」** 或 **「primary.model must be non-empty」**

`primary` 欄位的 `provider` 和 `model` 都必須設定為非空字串。

**「Invalid classification level」** 出現在 `classification_models` 中

有效的等級為：`RESTRICTED`、`CONFIDENTIAL`、`INTERNAL`、`PUBLIC`。這些是區分大小寫的。請檢查您的 `classification_models` 鍵。

---

## 密鑰參照錯誤

### 啟動時密鑰未解析

如果您的設定包含 `secret:some-key`，且該鍵在鑰匙圈中不存在，daemon 會退出並顯示類似以下的錯誤：

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**修復方式：**

```bash
# 列出已存在的密鑰
triggerfish config get-secret --list

# 儲存缺少的密鑰
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 密鑰後端不可用

在 Linux 上，密鑰儲存使用 `secret-tool`（libsecret / GNOME Keyring）。如果 Secret Service D-Bus 介面不可用（無圖形介面的伺服器、精簡容器），您在儲存或擷取密鑰時會看到錯誤。

**無圖形介面 Linux 的解決方法：**

1. 安裝 `gnome-keyring` 和 `libsecret`：
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. 啟動鑰匙圈 daemon：
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. 或使用加密檔案備援方案：
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   注意：記憶體備援表示密鑰在重新啟動時會遺失。僅適用於測試。

---

## 設定值問題

### 布林值強制轉換

使用 `triggerfish config set` 時，字串值 `"true"` 和 `"false"` 會自動轉換為 YAML 布林值。如果您確實需要字面字串 `"true"`，請直接編輯 YAML 檔案。

同樣地，看起來像整數的字串（`"8080"`）會被強制轉換為數字。

### 點分隔路徑語法

`config set` 和 `config get` 命令使用點分隔路徑來導覽巢狀 YAML：

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

如果路徑段包含點，則沒有跳脫語法。請直接編輯 YAML 檔案。

### `config get` 中的密鑰遮蔽

當您對包含「key」、「secret」或「token」的鍵執行 `triggerfish config get` 時，輸出會被遮蔽：`****...****`，僅顯示前 4 個和後 4 個字元。這是刻意設計的。使用 `triggerfish config get-secret <key>` 來擷取實際值。

---

## 設定備份

Triggerfish 會在每次 `config set`、`config add-channel` 或 `config add-plugin` 操作之前，在 `~/.triggerfish/backups/` 中建立帶時間戳記的備份。最多保留 10 個備份。

要還原備份：

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## 供應商驗證

設定精靈透過呼叫各供應商的模型列表端點（不會消耗 Token）來驗證 API 金鑰。驗證端點如下：

| 供應商 | 端點 |
|----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

如果驗證失敗，請再次確認：
- API 金鑰正確且未過期
- 從您的網路可以連線到端點
- 對於本地供應商（Ollama、LM Studio），伺服器確實正在執行

### 找不到模型

如果驗證成功但找不到模型，精靈會警告您。這通常表示：

- **模型名稱拼寫錯誤。** 請查閱供應商的文件以取得確切的模型 ID。
- **Ollama 模型未拉取。** 請先執行 `ollama pull <model>`。
- **供應商未列出該模型。** 某些供應商（Fireworks）使用不同的命名格式。精靈會正規化常見的模式，但不尋常的模型 ID 可能無法匹配。
