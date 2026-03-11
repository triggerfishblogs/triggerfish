# KB：已知問題

目前已知的問題及其解決方法。此頁面會在發現和解決問題時更新。

---

## Email：無 IMAP 重新連接

**狀態：** 開放

Email 通道 adapter 每 30 秒透過 IMAP 輪詢新訊息。如果 IMAP 連接斷開（網路中斷、伺服器重啟、閒置逾時），輪詢循環會靜默失敗且不會嘗試重新連接。

**症狀：**
- Email 通道停止接收新訊息
- 日誌中出現 `IMAP unseen email poll failed`
- 無自動恢復

**解決方法：** 重啟 daemon：

```bash
triggerfish stop && triggerfish start
```

**根本原因：** IMAP 輪詢循環沒有重新連接邏輯。`setInterval` 繼續觸發，但每次輪詢都因連接已斷開而失敗。

---

## Slack/Discord SDK：非同步操作洩漏

**狀態：** 已知的上游問題

Slack（`@slack/bolt`）和 Discord（`discord.js`）SDK 在匯入時會洩漏非同步操作。這影響測試（需要 `sanitizeOps: false`），但不影響生產使用。

**症狀：**
- 測試通道 adapter 時出現「leaking async ops」的測試失敗
- 無生產影響

**解決方法：** 匯入 Slack 或 Discord adapter 的測試檔案必須設定：

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack：訊息截斷而非分塊

**狀態：** 設計如此

Slack 訊息在 40,000 個字元處截斷，而非像 Telegram 和 Discord 那樣分割為多條訊息。非常長的代理回應會在末尾丟失內容。

**解決方法：** 要求代理產生較短的回應，或對產生大量輸出的任務使用不同的通道。

---

## WhatsApp：缺少 ownerPhone 時所有使用者被視為擁有者

**狀態：** 設計如此（帶警告）

如果 WhatsApp 通道未配置 `ownerPhone` 欄位，所有訊息發送者都被視為擁有者，授予他們完整的工具存取權。

**症狀：**
- `WhatsApp ownerPhone not configured, defaulting to non-owner`（日誌警告實際上具有誤導性；行為會授予擁有者存取權）
- 任何 WhatsApp 使用者都可以存取所有工具

**解決方法：** 始終設定 `ownerPhone`：

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd：工具安裝後 PATH 未更新

**狀態：** 設計如此

systemd unit 檔案在 daemon 安裝時擷取您的 shell PATH。如果您在安裝 daemon 後安裝新工具（MCP 伺服器二進位檔、`npx` 等），daemon 將找不到它們。

**症狀：**
- MCP 伺服器無法產生
- 工具二進位檔「not found」，即使它們在您的終端機中正常運作

**解決方法：** 重新安裝 daemon 以更新擷取的 PATH：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

這也適用於 launchd（macOS）。

---

## 瀏覽器：Flatpak Chrome CDP 限制

**狀態：** 平台限制

某些 Flatpak 建構的 Chrome 或 Chromium 限制 `--remote-debugging-port` 旗標，這阻止 Triggerfish 透過 Chrome DevTools Protocol 連接。

**症狀：**
- `CDP endpoint on port X not ready after Yms`
- 瀏覽器啟動但 Triggerfish 無法控制它

**解決方法：** 將 Chrome 或 Chromium 安裝為原生套件而非 Flatpak：

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker：Podman 的卷權限

**狀態：** 平台特定

使用 Podman 搭配無根容器時，UID 對應可能阻止容器（以 UID 65534 執行）寫入資料卷。

**症狀：**
- 啟動時出現 `Permission denied` 錯誤
- 無法建立設定檔、資料庫或日誌

**解決方法：** 使用 `:Z` 卷掛載旗標進行 SELinux 重新標記，並確保卷目錄可寫：

```bash
podman run -v triggerfish-data:/data:Z ...
```

或建立具有正確擁有權的卷。首先找到卷掛載路徑，然後更改擁有者：

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Note the "Mountpoint" path
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows：找不到 .NET Framework csc.exe

**狀態：** 平台特定

Windows 安裝程式在安裝時編譯 C# 服務包裝器。如果找不到 `csc.exe`（缺少 .NET Framework 或非標準安裝路徑），服務安裝會失敗。

**症狀：**
- 安裝程式完成但服務未註冊
- `triggerfish status` 顯示服務不存在

**解決方法：** 安裝 .NET Framework 4.x，或以前景模式執行 Triggerfish：

```powershell
triggerfish run
```

保持終端機開啟。Daemon 會一直執行直到您關閉它。

---

## CalDAV：併發客戶端的 ETag 衝突

**狀態：** 設計如此（CalDAV 規範）

更新或刪除行事曆事件時，CalDAV 使用 ETag 進行樂觀併發控制。如果另一個客戶端（手機應用程式、Web 介面）在您的讀取和寫入之間修改了事件，操作會失敗：

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**解決方法：** 代理應透過擷取最新事件版本自動重試。如果它沒有這樣做，請要求它「get the latest version of the event and try again」。

---

## 記憶體後備：重啟後密鑰遺失

**狀態：** 設計如此

使用 `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` 時，密鑰僅儲存在記憶體中，在 daemon 重啟時會遺失。此模式僅供測試使用。

**症狀：**
- 密鑰在 daemon 重啟前正常運作
- 重啟後：`Secret not found` 錯誤

**解決方法：** 設定適當的密鑰後端。在無頭 Linux 上，安裝 `gnome-keyring`：

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth：重新授權時未核發 Refresh Token

**狀態：** Google API 行為

Google 只在首次授權時核發 refresh token。如果您先前已授權應用程式並重新執行 `triggerfish connect google`，您會得到 access token 但沒有 refresh token。

**症狀：**
- Google API 最初正常運作但在 access token 過期後失敗（1 小時）
- `No refresh token` 錯誤

**解決方法：** 先撤銷應用程式的存取權，然後重新授權：

1. 前往 [Google 帳戶權限](https://myaccount.google.com/permissions)
2. 找到 Triggerfish 並點擊「Remove Access」
3. 再次執行 `triggerfish connect google`
4. Google 現在將核發全新的 refresh token

---

## 回報新問題

如果您遇到此處未列出的問題，請查看 [GitHub Issues](https://github.com/greghavens/triggerfish/issues) 頁面。如果尚未被回報，請按照[問題提報指南](/zh-TW/support/guides/filing-issues)提交新的 issue。
