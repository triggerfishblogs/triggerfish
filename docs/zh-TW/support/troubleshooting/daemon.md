# 疑難排解：Daemon

## Daemon 無法啟動

### 「Triggerfish is already running」

此訊息會在日誌檔案被另一個程序鎖定時出現。在 Windows 上，這是透過檔案寫入器嘗試開啟日誌檔案時的 `EBUSY` /「os error 32」來偵測的。

**修復方式：**

```bash
triggerfish status    # 檢查是否真的有執行中的實例
triggerfish stop      # 停止現有實例
triggerfish start     # 重新啟動
```

如果 `triggerfish status` 回報 daemon 未在執行但您仍收到此錯誤，表示另一個程序正在佔用日誌檔案。檢查殭屍程序：

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

結束所有殘留程序，然後重試。

### 連接埠 18789 或 18790 已被使用

Gateway 監聽連接埠 18789（WebSocket），Tidepool 監聽 18790（A2UI）。如果其他應用程式佔用了這些連接埠，daemon 將無法啟動。

**查找佔用連接埠的程式：**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### 未設定 LLM 供應商

如果 `triggerfish.yaml` 缺少 `models` 區段或主要供應商沒有 API 金鑰，gateway 會記錄：

```
No LLM provider configured. Check triggerfish.yaml.
```

**修復方式：** 執行設定精靈或手動設定：

```bash
triggerfish dive                    # 互動式設定
# 或
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 找不到設定檔

如果 `triggerfish.yaml` 不存在於預期路徑，daemon 會退出。錯誤訊息因環境而異：

- **原生安裝：** 建議執行 `triggerfish dive`
- **Docker：** 建議使用 `-v ./triggerfish.yaml:/data/triggerfish.yaml` 掛載設定檔

檢查路徑：

```bash
ls ~/.triggerfish/triggerfish.yaml      # 原生安裝
docker exec triggerfish ls /data/       # Docker
```

### 密鑰解析失敗

如果您的設定參照了一個在鑰匙圈中不存在的密鑰（`secret:provider:anthropic:apiKey`），daemon 會退出並顯示錯誤，指出缺少的密鑰。

**修復方式：**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## 服務管理

### systemd：登出後 daemon 停止

預設情況下，systemd 使用者服務會在使用者登出時停止。Triggerfish 在安裝時啟用 `loginctl enable-linger` 來防止此情況。如果 linger 未能啟用：

```bash
# 檢查 linger 狀態
loginctl show-user $USER | grep Linger

# 啟用（可能需要 sudo）
sudo loginctl enable-linger $USER
```

若未啟用 linger，daemon 僅在您登入期間執行。

### systemd：服務無法啟動

檢查服務狀態和日誌：

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

常見原因：
- **二進位檔被移動或刪除。** Unit 檔案中包含二進位檔的硬編碼路徑。重新安裝 daemon：`triggerfish dive --install-daemon`
- **PATH 問題。** systemd unit 在安裝時擷取您的 PATH。如果您在 daemon 安裝後安裝了新工具（如 MCP 伺服器），請重新安裝 daemon 以更新 PATH。
- **DENO_DIR 未設定。** systemd unit 設定 `DENO_DIR=~/.cache/deno`。如果此目錄不可寫入，SQLite FFI 插件將無法載入。

### launchd：daemon 未在登入時啟動

檢查 plist 狀態：

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

如果 plist 未被載入：

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

常見原因：
- **Plist 被移除或損壞。** 重新安裝：`triggerfish dive --install-daemon`
- **二進位檔被移動。** Plist 包含硬編碼路徑。移動二進位檔後請重新安裝。
- **安裝時的 PATH。** 與 systemd 相同，launchd 在建立 plist 時擷取 PATH。如果您新增了工具到 PATH，請重新安裝。

### Windows：服務未啟動

檢查服務狀態：

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

常見原因：
- **服務未安裝。** 重新安裝：以系統管理員身分執行安裝程式。
- **二進位檔路徑已變更。** 服務包裝程式有硬編碼路徑。請重新安裝。
- **安裝時 .NET 編譯失敗。** C# 服務包裝程式需要 .NET Framework 4.x 的 `csc.exe`。

### 升級導致 daemon 故障

執行 `triggerfish update` 後，daemon 會自動重新啟動。如果未重新啟動：

1. 舊的二進位檔可能仍在執行。手動停止：`triggerfish stop`
2. 在 Windows 上，舊的二進位檔會被重新命名為 `.old`。如果重新命名失敗，更新會報錯。請先停止服務，然後再更新。

---

## 日誌檔案問題

### 日誌檔案為空

Daemon 寫入 `~/.triggerfish/logs/triggerfish.log`。如果檔案存在但為空：

- Daemon 可能剛剛啟動。請稍候。
- 日誌等級設定為 `quiet`，僅記錄 ERROR 等級的訊息。將其設定為 `normal` 或 `verbose`：

```bash
triggerfish config set logging.level normal
```

### 日誌過於嘈雜

將日誌等級設定為 `quiet` 以僅顯示錯誤：

```bash
triggerfish config set logging.level quiet
```

等級對照：

| 設定值 | 記錄的最低等級 |
|-------------|---------------------|
| `quiet` | 僅 ERROR |
| `normal` | INFO 及以上 |
| `verbose` | DEBUG 及以上 |
| `debug` | TRACE 及以上（所有訊息） |

### 日誌輪替

當目前檔案超過 1 MB 時，日誌會自動輪替。最多保留 10 個輪替檔案：

```
triggerfish.log        # 目前
triggerfish.1.log      # 最近的備份
triggerfish.2.log      # 第二近的備份
...
triggerfish.10.log     # 最舊的（新輪替發生時被刪除）
```

沒有基於時間的輪替，僅有基於大小的輪替。
