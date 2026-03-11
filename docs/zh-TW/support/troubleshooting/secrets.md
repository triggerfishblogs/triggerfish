# 疑難排解：密鑰與憑證

## 各平台的鑰匙圈後端

| 平台 | 後端 | 詳細資訊 |
|----------|---------|---------|
| macOS | Keychain（原生） | 使用 `security` CLI 存取 Keychain Access |
| Linux | Secret Service（D-Bus） | 使用 `secret-tool` CLI（libsecret / GNOME Keyring） |
| Windows | 加密檔案儲存 | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | 加密檔案儲存 | `/data/secrets.json` + `/data/secrets.key` |

後端在啟動時自動選擇。您無法更改平台使用的後端。

---

## macOS 問題

### 鑰匙圈存取提示

macOS 可能會提示您允許 `triggerfish` 存取鑰匙圈。點擊「永遠允許」以避免重複提示。如果您不小心點擊了「拒絕」，請開啟「鑰匙圈存取」，找到該條目並移除它。下次存取時會再次提示。

### 鑰匙圈已鎖定

如果 macOS 鑰匙圈被鎖定（例如睡眠後），密鑰操作會失敗。解鎖：

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

或直接解鎖您的 Mac（鑰匙圈在登入時解鎖）。

---

## Linux 問題

### 找不到「secret-tool」

Linux 鑰匙圈後端使用 `secret-tool`，它是 `libsecret-tools` 套件的一部分。

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### 沒有 Secret Service daemon 在執行

在無圖形介面的伺服器或精簡的桌面環境上，可能沒有 Secret Service daemon。症狀：

- `secret-tool` 命令卡住或失敗
- 關於 D-Bus 連線的錯誤訊息

**選項：**

1. **安裝並啟動 GNOME Keyring：**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **使用加密檔案備援方案：**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   警告：記憶體備援不會在重新啟動後持久化密鑰。僅適用於測試。

3. **對於伺服器，考慮使用 Docker。** Docker 部署使用不需要鑰匙圈 daemon 的加密檔案儲存。

### KDE / KWallet

如果您使用 KDE 搭配 KWallet 而非 GNOME Keyring，`secret-tool` 應該仍可透過 KWallet 實作的 Secret Service D-Bus API 運作。如果不行，請在 KWallet 旁邊安裝 `gnome-keyring`。

---

## Windows / Docker 加密檔案儲存

### 運作方式

加密檔案儲存使用 AES-256-GCM 加密：

1. 使用 PBKDF2 衍生機器金鑰並儲存在 `secrets.key` 中
2. 每個密鑰值使用唯一的 IV 個別加密
3. 加密資料以版本化格式儲存在 `secrets.json` 中（`{v: 1, entries: {...}}`）

### 「Machine key file permissions too open」

在 Unix 系統（Docker 中的 Linux）上，金鑰檔案必須具有 `0600` 權限（僅擁有者可讀寫）。如果權限過於寬鬆：

```
Machine key file permissions too open
```

**修復方式：**

```bash
chmod 600 ~/.triggerfish/secrets.key
# 或在 Docker 中
docker exec triggerfish chmod 600 /data/secrets.key
```

### 「Machine key file corrupt」

金鑰檔案存在但無法解析。它可能被截斷或覆寫。

**修復方式：** 刪除金鑰檔案並重新產生：

```bash
rm ~/.triggerfish/secrets.key
```

下次啟動時會產生新的金鑰。但是，所有使用舊金鑰加密的既有密鑰將無法讀取。您需要重新儲存所有密鑰：

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# 對所有密鑰重複此操作
```

### 「Secret file permissions too open」

與金鑰檔案相同，密鑰檔案應有限制性權限：

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### 「Secret file chmod failed」

系統無法設定檔案權限。這可能發生在不支援 Unix 權限的檔案系統上（某些網路掛載、FAT/exFAT 卷）。請驗證檔案系統支援權限變更。

---

## 舊版密鑰遷移

### 自動遷移

如果 Triggerfish 偵測到明文密鑰檔案（未加密的舊格式），它會在首次載入時自動遷移至加密格式：

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

遷移過程：
1. 讀取明文 JSON 檔案
2. 使用 AES-256-GCM 加密每個值
3. 寫入暫存檔案，然後以原子方式重新命名
4. 記錄建議進行密鑰輪替的警告

### 手動遷移

如果您在 `triggerfish.yaml` 檔案中有密鑰（未使用 `secret:` 參照），請將它們遷移到鑰匙圈：

```bash
triggerfish config migrate-secrets
```

此命令掃描設定中已知的密鑰欄位（API 金鑰、Bot Token 等），將它們儲存在鑰匙圈中，並將設定檔中的值替換為 `secret:` 參照。

### 跨裝置移動問題

如果遷移涉及跨檔案系統邊界移動檔案（不同的掛載點、NFS），原子重新命名可能會失敗。遷移會退回到複製再刪除的方式，這仍然安全，但短暫地會有兩個檔案同時存在於磁碟上。

---

## 密鑰解析

### `secret:` 參照的運作方式

以 `secret:` 為前綴的設定值在啟動時解析：

```yaml
# 在 triggerfish.yaml 中
apiKey: "secret:provider:anthropic:apiKey"

# 啟動時，解析為：
apiKey: "sk-ant-api03-actual-key-value..."
```

解析後的值僅存在於記憶體中。磁碟上的設定檔始終包含 `secret:` 參照。

### 「Secret not found」

```
Secret not found: <key>
```

參照的鍵在鑰匙圈中不存在。

**修復方式：**

```bash
triggerfish config set-secret <key> <value>
```

### 列出密鑰

```bash
# 列出所有已儲存的密鑰名稱（不顯示值）
triggerfish config get-secret --list
```

### 刪除密鑰

```bash
triggerfish config set-secret <key> ""
# 或透過 Agent：
# Agent 可以透過密鑰工具請求密鑰刪除
```

---

## 環境變數覆寫

金鑰檔案路徑可以用 `TRIGGERFISH_KEY_PATH` 覆寫：

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

這主要用於具有自訂卷佈局的 Docker 部署。

---

## 常用密鑰名稱

以下是 Triggerfish 使用的標準鑰匙圈鍵名：

| 鍵 | 用途 |
|-----|-------|
| `provider:<name>:apiKey` | LLM 供應商 API 金鑰 |
| `telegram:botToken` | Telegram Bot Token |
| `slack:botToken` | Slack Bot Token |
| `slack:appToken` | Slack App-Level Token |
| `slack:signingSecret` | Slack Signing Secret |
| `discord:botToken` | Discord Bot Token |
| `whatsapp:accessToken` | WhatsApp Cloud API 存取 Token |
| `whatsapp:webhookVerifyToken` | WhatsApp webhook 驗證 Token |
| `email:smtpPassword` | SMTP 中繼密碼 |
| `email:imapPassword` | IMAP 伺服器密碼 |
| `web:search:apiKey` | Brave Search API 金鑰 |
| `github-pat` | GitHub 個人存取 Token |
| `notion:token` | Notion 整合 Token |
| `caldav:password` | CalDAV 伺服器密碼 |
| `google:clientId` | Google OAuth Client ID |
| `google:clientSecret` | Google OAuth Client Secret |
| `google:refreshToken` | Google OAuth Refresh Token |
