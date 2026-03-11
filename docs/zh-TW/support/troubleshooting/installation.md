# 疑難排解：安裝

## 二進位安裝程式問題

### 校驗碼驗證失敗

安裝程式會在下載二進位檔的同時下載 `SHA256SUMS.txt` 檔案，並在安裝前驗證雜湊值。如果驗證失敗：

- **網路中斷了下載。** 刪除部分下載的檔案並重試。
- **鏡像或 CDN 提供了過期的內容。** 等待幾分鐘後重試。安裝程式從 GitHub Releases 取得檔案。
- **在 SHA256SUMS.txt 中找不到資產。** 這表示該版本發佈時缺少您平台的校驗碼。請提交 [GitHub Issue](https://github.com/greghavens/triggerfish/issues)。

安裝程式在 Linux 上使用 `sha256sum`，在 macOS 上使用 `shasum -a 256`。如果兩者都不可用，則無法驗證下載。

### 寫入 `/usr/local/bin` 時權限被拒

安裝程式會先嘗試 `/usr/local/bin`，然後退而使用 `~/.local/bin`。如果兩者都不行：

```bash
# 選項 1：使用 sudo 進行全系統安裝
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# 選項 2：建立 ~/.local/bin 並加入 PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# 然後重新執行安裝程式
```

### macOS 隔離警告

macOS 會阻擋從網路下載的二進位檔。安裝程式會執行 `xattr -cr` 來清除隔離屬性，但如果您手動下載了二進位檔，請執行：

```bash
xattr -cr /usr/local/bin/triggerfish
```

或在 Finder 中右鍵點擊二進位檔，選擇「打開」，並確認安全提示。

### 安裝後 PATH 未更新

安裝程式會將安裝目錄加入您的 shell 設定檔（`.zshrc`、`.bashrc` 或 `.bash_profile`）。如果安裝後找不到 `triggerfish` 命令：

1. 開啟新的終端機視窗（目前的 shell 不會載入設定檔變更）
2. 或手動載入設定檔：`source ~/.zshrc`（或您 shell 使用的設定檔）

如果安裝程式跳過了 PATH 更新，表示安裝目錄已在您的 PATH 中。

---

## 從原始碼建置

### 找不到 Deno

從原始碼安裝的腳本（`deploy/scripts/install-from-source.sh`）會在 Deno 不存在時自動安裝。如果自動安裝失敗：

```bash
# 手動安裝 Deno
curl -fsSL https://deno.land/install.sh | sh

# 驗證
deno --version   # 應為 2.x
```

### 編譯時出現權限錯誤

`deno compile` 命令需要 `--allow-all`，因為編譯後的二進位檔需要完整的系統存取權限（網路、檔案系統、SQLite 的 FFI、子程序啟動）。如果您在編譯時看到權限錯誤，請確認您以具有目標目錄寫入權限的使用者身分執行安裝腳本。

### 指定分支或版本

設定 `TRIGGERFISH_BRANCH` 來複製特定分支：

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

對於二進位安裝程式，設定 `TRIGGERFISH_VERSION`：

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows 特定問題

### PowerShell 執行原則阻擋安裝程式

以系統管理員身分執行 PowerShell 並允許腳本執行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

然後重新執行安裝程式。

### Windows Service 編譯失敗

Windows 安裝程式會使用 .NET Framework 4.x 的 `csc.exe` 即時編譯 C# 服務包裝程式。如果編譯失敗：

1. **驗證 .NET Framework 已安裝。** 在命令提示字元中執行 `where csc.exe`。安裝程式會在 `%WINDIR%\Microsoft.NET\Framework64\` 下的 .NET Framework 目錄中查找。
2. **以系統管理員身分執行。** 服務安裝需要提升的權限。
3. **備援方案。** 如果服務編譯失敗，您仍可手動執行 Triggerfish：`triggerfish run`（前景模式）。您需要保持終端機開啟。

### 升級時 `Move-Item` 失敗

舊版 Windows 安裝程式使用 `Move-Item -Force`，當目標二進位檔正在使用時會失敗。此問題已在 0.3.4+ 版本中修正。如果您在舊版本上遇到此問題，請先手動停止服務：

```powershell
Stop-Service Triggerfish
# 然後重新執行安裝程式
```

---

## Docker 問題

### 容器立即退出

檢查容器日誌：

```bash
docker logs triggerfish
```

常見原因：

- **缺少設定檔。** 將您的 `triggerfish.yaml` 掛載到 `/data/`：
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **連接埠衝突。** 如果連接埠 18789 或 18790 已被使用，gateway 無法啟動。
- **卷的權限被拒。** 容器以 UID 65534（nonroot）執行。請確認卷可由該使用者寫入。

### 無法從主機存取 Triggerfish

Gateway 在容器內預設綁定到 `127.0.0.1`。要從主機存取，Docker compose 檔案會映射連接埠 `18789` 和 `18790`。如果您直接使用 `docker run`，請加上：

```bash
-p 18789:18789 -p 18790:18790
```

### 使用 Podman 代替 Docker

Docker 安裝腳本會自動偵測 `podman` 作為容器執行環境。您也可以明確設定：

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

由 Docker 安裝程式安裝的 `triggerfish` 包裝腳本也會自動偵測 podman。

### 自訂映像檔或 Registry

使用 `TRIGGERFISH_IMAGE` 覆寫映像檔：

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## 安裝後

### 設定精靈未啟動

二進位安裝後，安裝程式會執行 `triggerfish dive --install-daemon` 來啟動設定精靈。如果未啟動：

1. 手動執行：`triggerfish dive`
2. 如果出現「Terminal requirement not met」，精靈需要互動式 TTY。SSH 工作階段、CI 管道及管道輸入無法使用。請改為手動設定 `triggerfish.yaml`。

### Signal 頻道自動安裝失敗

Signal 需要 `signal-cli`，這是一個 Java 應用程式。自動安裝程式會下載預建的 `signal-cli` 二進位檔和 JRE 25 執行環境。失敗可能原因：

- **安裝目錄無寫入權限。** 檢查 `~/.triggerfish/signal-cli/` 的權限。
- **JRE 下載失敗。** 安裝程式從 Adoptium 取得。網路限制或企業代理可能會阻擋。
- **架構不支援。** JRE 自動安裝僅支援 x64 和 aarch64。

如果自動安裝失敗，請手動安裝 `signal-cli` 並確認它在您的 PATH 中。手動設定步驟請參閱 [Signal 頻道文件](/zh-TW/channels/signal)。
