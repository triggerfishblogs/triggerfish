# 疑難排解：瀏覽器自動化

## 找不到 Chrome / Chromium

Triggerfish 使用 puppeteer-core（非內建的 Chromium）並自動偵測系統上的 Chrome 或 Chromium。如果找不到瀏覽器，瀏覽器工具會以啟動錯誤失敗。

### 各平台的偵測路徑

**Linux：**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak：`com.google.Chrome`、`org.chromium.Chromium`、`com.brave.Browser`

**macOS：**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows：**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### 安裝瀏覽器

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# 或安裝 Brave，同樣會被偵測到
```

### 手動路徑覆寫

如果您的瀏覽器安裝在非標準位置，您可以設定路徑。請聯繫專案以取得確切的設定鍵（目前透過瀏覽器管理器設定來設定）。

---

## 啟動失敗

### 「Direct Chrome process launch failed」

Triggerfish 透過 `Deno.Command` 以 headless 模式啟動 Chrome。如果程序無法啟動：

1. **二進位檔不可執行。** 檢查檔案權限。
2. **缺少共享函式庫。** 在精簡的 Linux 安裝環境（容器、WSL）中，Chrome 可能需要額外的函式庫：
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **沒有顯示伺服器。** Chrome headless 不需要 X11/Wayland，但某些 Chrome 版本仍會嘗試載入顯示相關的函式庫。

### Flatpak Chrome

如果 Chrome 是以 Flatpak 套件安裝的，Triggerfish 會建立一個包裝腳本，使用適當的參數呼叫 `flatpak run`。

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

如果包裝腳本失敗：
- 檢查 `/usr/bin/flatpak` 或 `/usr/local/bin/flatpak` 是否存在
- 檢查 Flatpak 應用程式 ID 是否正確（執行 `flatpak list` 查看已安裝的應用程式）
- 包裝腳本會寫入暫存目錄。如果暫存目錄不可寫入，寫入會失敗。

### CDP 端點未就緒

啟動 Chrome 後，Triggerfish 會輪詢 Chrome DevTools Protocol（CDP）端點以建立連線。預設逾時為 30 秒，輪詢間隔為 200 毫秒。

```
CDP endpoint on port <port> not ready after <timeout>ms
```

這表示 Chrome 已啟動但未在時間內開啟 CDP 連接埠。原因：
- Chrome 載入緩慢（系統資源不足）
- 另一個 Chrome 實例正在使用相同的除錯連接埠
- Chrome 在啟動期間當機（檢查 Chrome 本身的輸出）

---

## 導覽問題

### 「Navigation blocked by domain policy」

瀏覽器工具套用與 web_fetch 相同的 SSRF 防護。指向私有 IP 位址的 URL 會被阻擋：

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

這是刻意的安全強制執行。瀏覽器無法存取：
- `localhost` / `127.0.0.1`
- 私有網路（`10.x.x.x`、`172.16-31.x.x`、`192.168.x.x`）
- 鏈路本地位址（`169.254.x.x`）

沒有方法停用此檢查。

### 「Invalid URL」

URL 格式錯誤。瀏覽器導覽需要包含通訊協定的完整 URL：

```
# 錯誤
browser_navigate google.com

# 正確
browser_navigate https://google.com
```

### 導覽逾時

```
Navigation failed: Timeout
```

頁面載入時間過長。這通常是因為伺服器回應緩慢或頁面永遠無法完成載入（無限重新導向、卡住的 JavaScript）。

---

## 頁面互動問題

### 「Click failed」、「Type failed」、「Select failed」

這些錯誤包含失敗的 CSS 選擇器：

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

選擇器未匹配到頁面上的任何元素。常見原因：
- 頁面尚未完成載入
- 元素在 iframe 內（選擇器不會跨越 iframe 邊界）
- 選擇器錯誤（動態 class 名稱、shadow DOM）

### 「Snapshot failed」

頁面快照（DOM 擷取用於上下文）失敗。這可能發生在：
- 頁面沒有內容（空白頁面）
- JavaScript 錯誤阻止了 DOM 存取
- 在快照擷取期間頁面已導覽離開

### 「Scroll failed」

通常發生在具有自訂捲動容器的頁面上。捲動命令針對的是主文件視窗。

---

## Profile 隔離

瀏覽器 Profile 按 Agent 隔離。每個 Agent 在 Profile 基礎目錄下有自己的 Chrome Profile 目錄。這表示：

- 登入工作階段不會在 Agent 之間共享
- Cookie、本地儲存和快取是按 Agent 分開的
- 分級感知的存取控制防止交叉污染

如果您看到非預期的 Profile 行為，Profile 目錄可能已損壞。刪除它，讓 Triggerfish 在下次瀏覽器啟動時建立新的。
