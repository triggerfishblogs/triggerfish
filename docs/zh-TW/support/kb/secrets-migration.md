# KB：密鑰遷移

本文涵蓋將密鑰從明文儲存遷移到加密格式，以及從內嵌配置值遷移到金鑰鏈參考。

## 背景

Triggerfish 的早期版本以明文 JSON 儲存密鑰。目前版本使用 AES-256-GCM 加密用於基於檔案的密鑰儲存（Windows、Docker），以及作業系統原生金鑰鏈（macOS Keychain、Linux Secret Service）。

## 自動遷移（明文到加密）

當 Triggerfish 開啟密鑰檔案並偵測到舊的明文格式（沒有 `v` 欄位的平面 JSON 物件）時，它會自動遷移：

1. **偵測。** 檔案被檢查是否具有 `{v: 1, entries: {...}}` 結構。如果它是純 `Record<string, string>`，則為舊版格式。

2. **遷移。** 每個明文值使用透過 PBKDF2 衍生的機器金鑰以 AES-256-GCM 加密。為每個值產生唯一的 IV。

3. **原子寫入。** 加密資料先寫入臨時檔案，然後原子性地重新命名以替換原始檔案。這防止了程序中斷時的資料遺失。

4. **日誌記錄。** 建立兩條日誌條目：
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **跨裝置處理。** 如果原子重新命名失敗（例如臨時檔案和密鑰檔案在不同檔案系統上），遷移會退回到複製後移除。

### 您需要做什麼

無。遷移是完全自動的，在首次存取時發生。但是，遷移後：

- **輪換您的密鑰。** 明文版本可能已被備份、快取或記錄。產生新的 API 金鑰並更新它們：
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **刪除舊備份。** 如果您有舊版明文密鑰檔案的備份，請安全地刪除它們。

## 手動遷移（內嵌配置到金鑰鏈）

如果您的 `triggerfish.yaml` 包含原始密鑰值而非 `secret:` 參考：

```yaml
# 之前（不安全）
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

執行遷移命令：

```bash
triggerfish config migrate-secrets
```

此命令：

1. 掃描配置中的已知密鑰欄位（API 金鑰、bot 權杖、密碼）
2. 將每個值儲存在作業系統金鑰鏈中的標準鍵名下
3. 用 `secret:` 參考替換內嵌值

```yaml
# 之後（安全）
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### 已知的密鑰欄位

遷移命令知道這些欄位：

| 配置路徑 | 金鑰鏈鍵 |
|----------|----------|
| `models.providers.<name>.apiKey` | `provider:<name>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## 機器金鑰

加密檔案儲存從儲存在 `secrets.key` 中的機器金鑰衍生其加密金鑰。此金鑰在首次使用時自動產生。

### 金鑰檔案權限

在 Unix 系統上，金鑰檔案必須有 `0600` 權限（僅擁有者讀寫）。Triggerfish 在啟動時檢查此項，如果權限太開放會記錄警告：

```
Machine key file permissions too open
```

修復：

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### 金鑰檔案遺失

如果機器金鑰檔案被刪除或損壞，所有用它加密的密鑰都將無法恢復。您需要重新儲存每個密鑰：

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... etc
```

請將您的 `secrets.key` 檔案備份在安全的位置。

### 自訂金鑰路徑

使用以下方式覆寫金鑰檔案位置：

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

這主要用於具有非標準卷配置的 Docker 部署。
