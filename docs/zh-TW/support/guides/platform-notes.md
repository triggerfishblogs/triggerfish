# 平台注意事項

各平台特定的行為、需求及特殊狀況。

## macOS

### 服務管理器：launchd

Triggerfish 註冊為 launchd agent：
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist 設定為 `RunAtLoad: true` 和 `KeepAlive: true`，因此 daemon 會在登入時啟動，並在當機後重新啟動。

### PATH 擷取

launchd plist 在安裝時擷取您的 shell PATH。這很關鍵，因為 launchd 不會載入您的 shell profile。如果您在安裝 daemon 後安裝了 MCP 伺服器相依性（如 `npx`、`python`），這些二進位檔不會在 daemon 的 PATH 中。

**修復方式：** 重新安裝 daemon 以更新擷取的 PATH：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### 隔離

macOS 會對下載的二進位檔套用隔離旗標。安裝程式使用 `xattr -cr` 清除它，但如果您手動下載了二進位檔：

```bash
xattr -cr /usr/local/bin/triggerfish
```

### 鑰匙圈

密鑰透過 `security` CLI 儲存在 macOS 登入鑰匙圈中。如果「鑰匙圈存取」被鎖定，密鑰操作會失敗直到您解鎖（通常透過登入）。

### Homebrew Deno

如果您從原始碼建置，且 Deno 是透過 Homebrew 安裝的，請確認 Homebrew 的 bin 目錄在您的 PATH 中，然後再執行安裝腳本。

---

## Linux

### 服務管理器：systemd（使用者模式）

Daemon 以 systemd 使用者服務方式執行：
```
~/.config/systemd/user/triggerfish.service
```

### Linger

預設情況下，systemd 使用者服務會在使用者登出時停止。Triggerfish 在安裝時啟用 linger：

```bash
loginctl enable-linger $USER
```

如果此操作失敗（例如您的系統管理員停用了此功能），daemon 僅在您登入期間執行。在您希望 daemon 持續執行的伺服器上，請要求您的管理員為您的帳號啟用 linger。

### PATH 和環境

systemd unit 擷取您的 PATH 並設定 `DENO_DIR=~/.cache/deno`。與 macOS 相同，安裝後的 PATH 變更需要重新安裝 daemon。

Unit 還明確設定 `Environment=PATH=...`。如果 daemon 找不到 MCP 伺服器二進位檔，這是最可能的原因。

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic 桌面的 `/home` 是 `/var/home` 的符號連結。Triggerfish 在解析主目錄時會自動處理此情況，追蹤符號連結以找到真實路徑。

透過 Flatpak 安裝的瀏覽器會透過呼叫 `flatpak run` 的包裝腳本偵測並啟動。

### 無圖形介面伺服器

在沒有桌面環境的伺服器上，GNOME Keyring / Secret Service daemon 可能未在執行。設定說明請參閱[密鑰疑難排解](/zh-TW/support/troubleshooting/secrets)。

### SQLite FFI

SQLite 儲存後端使用 `@db/sqlite`，它透過 FFI 載入原生函式庫。這需要 `--allow-ffi` Deno 權限（包含在編譯後的二進位檔中）。在某些精簡的 Linux 發行版上，共享 C 函式庫或相關相依性可能缺少。如果您看到 FFI 相關的錯誤，請安裝基礎開發函式庫。

---

## Windows

### 服務管理器：Windows Service

Triggerfish 安裝為名為「Triggerfish」的 Windows Service。此服務由安裝期間使用 .NET Framework 4.x 的 `csc.exe` 編譯的 C# 包裝程式實作。

**需求：**
- .NET Framework 4.x（大多數 Windows 10/11 系統已安裝）
- 服務安裝需要系統管理員權限
- `csc.exe` 可在 .NET Framework 目錄中存取

### 更新時的二進位檔替換

Windows 不允許覆寫正在執行的可執行檔。更新程式：

1. 將執行中的二進位檔重新命名為 `triggerfish.exe.old`
2. 將新的二進位檔複製到原始路徑
3. 重新啟動服務
4. 在下次啟動時清除 `.old` 檔案

如果重新命名或複製失敗，請在更新前手動停止服務。

### ANSI 色彩支援

Triggerfish 為彩色主控台輸出啟用 Virtual Terminal Processing。這在現代 PowerShell 和 Windows Terminal 中運作。較舊的 `cmd.exe` 視窗可能無法正確呈現色彩。

### 獨占檔案鎖定

Windows 使用獨占檔案鎖定。如果 daemon 正在執行且您嘗試啟動另一個實例，日誌檔案鎖定會阻止它：

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

此偵測是 Windows 特有的，基於開啟日誌檔案時的 EBUSY /「os error 32」。

### 密鑰儲存

Windows 使用加密檔案儲存（AES-256-GCM），位於 `~/.triggerfish/secrets.json`。沒有 Windows Credential Manager 整合。請將 `secrets.key` 檔案視為敏感資料。

### PowerShell 安裝程式注意事項

PowerShell 安裝程式（`install.ps1`）：
- 偵測處理器架構（x64/arm64）
- 安裝到 `%LOCALAPPDATA%\Triggerfish`
- 透過登錄檔將安裝目錄加入使用者 PATH
- 編譯 C# 服務包裝程式
- 註冊並啟動 Windows Service

如果安裝程式在服務編譯步驟失敗，您仍可手動執行 Triggerfish：

```powershell
triggerfish run    # 前景模式
```

---

## Docker

### 容器執行環境

Docker 部署同時支援 Docker 和 Podman。偵測是自動的，或可明確設定：

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### 映像檔詳情

- 基底：`gcr.io/distroless/cc-debian12`（精簡，無 shell）
- Debug 變體：`distroless:debug`（包含 shell 用於疑難排解）
- 以 UID 65534（nonroot）執行
- Init：`true`（透過 `tini` 進行 PID 1 信號轉發）
- 重新啟動政策：`unless-stopped`

### 資料持久化

所有持久化資料在容器內的 `/data` 目錄中，由 Docker 命名卷支持：

```
/data/
  triggerfish.yaml        # 設定檔
  secrets.json            # 加密密鑰
  secrets.key             # 加密金鑰
  SPINE.md                # Agent 身分
  TRIGGER.md              # 觸發器行為
  data/triggerfish.db     # SQLite 資料庫
  logs/                   # 日誌檔案
  skills/                 # 已安裝的技能
  workspace/              # Agent 工作區
  .deno/                  # Deno FFI 插件快取
```

### 環境變數

| 變數 | 預設值 | 用途 |
|----------|---------|---------|
| `TRIGGERFISH_DATA_DIR` | `/data` | 基礎資料目錄 |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | 設定檔路徑 |
| `TRIGGERFISH_DOCKER` | `true` | 啟用 Docker 特定行為 |
| `DENO_DIR` | `/data/.deno` | Deno 快取（FFI 插件） |
| `HOME` | `/data` | nonroot 使用者的主目錄 |

### Docker 中的密鑰

Docker 容器無法存取主機作業系統的鑰匙圈。加密檔案儲存會自動使用。加密金鑰（`secrets.key`）和加密資料（`secrets.json`）儲存在 `/data` 卷中。

**安全注意事項：** 任何具有 Docker 卷存取權限的人都可以讀取加密金鑰。請適當保護該卷。在正式環境中，考慮使用 Docker secrets 或密鑰管理器在執行時注入金鑰。

### 連接埠

compose 檔案映射：
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

額外的連接埠（WebChat 的 8765、WhatsApp webhook 的 8443）需要在您啟用這些頻道時加入 compose 檔案。

### 在 Docker 中執行設定精靈

```bash
# 如果容器正在執行
docker exec -it triggerfish triggerfish dive

# 如果容器未在執行（一次性）
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### 更新

```bash
# 使用包裝腳本
triggerfish update

# 手動
docker compose pull
docker compose up -d
```

### 除錯

使用映像檔的 debug 變體進行疑難排解：

```yaml
# 在 docker-compose.yml 中
image: ghcr.io/greghavens/triggerfish:debug
```

這包含 shell，讓您可以 exec 進入容器：

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak（僅瀏覽器）

Triggerfish 本身不作為 Flatpak 執行，但它可以使用透過 Flatpak 安裝的瀏覽器進行瀏覽器自動化。

### 偵測到的 Flatpak 瀏覽器

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### 運作方式

Triggerfish 建立一個暫時的包裝腳本，使用 headless 模式旗標呼叫 `flatpak run`，然後透過該腳本啟動 Chrome。包裝腳本寫入暫存目錄。

### 常見問題

- **Flatpak 未安裝。** 二進位檔必須在 `/usr/bin/flatpak` 或 `/usr/local/bin/flatpak`。
- **暫存目錄不可寫入。** 包裝腳本需要在執行前寫入磁碟。
- **Flatpak 沙箱衝突。** 某些 Flatpak Chrome 建置限制 `--remote-debugging-port`。如果 CDP 連線失敗，請嘗試安裝非 Flatpak 的 Chrome。
