# 故障排除：浏览器自动化

## Chrome / Chromium 未找到

Triggerfish 使用 puppeteer-core（不捆绑 Chromium）并自动检测系统上的 Chrome 或 Chromium。如果未找到浏览器，浏览器工具将报启动错误。

### 各平台检测路径

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

### 安装浏览器

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# 或安装 Brave，也会被检测到
```

### 手动路径覆盖

如果您的浏览器安装在非标准位置，可以设置路径。请联系项目获取具体的配置键（这目前通过浏览器管理器配置设置）。

---

## 启动失败

### "Direct Chrome process launch failed"

Triggerfish 通过 `Deno.Command` 以无头模式启动 Chrome。如果进程无法启动：

1. **二进制文件不可执行。** 检查文件权限。
2. **缺少共享库。** 在最小化的 Linux 安装（容器、WSL）上，Chrome 可能需要额外的库：
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **没有显示服务器。** Chrome 无头模式不需要 X11/Wayland，但某些 Chrome 版本仍然尝试加载显示相关的库。

### Flatpak Chrome

如果 Chrome 是作为 Flatpak 包安装的，Triggerfish 会创建一个包装脚本，使用适当的参数调用 `flatpak run`。

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

如果包装脚本失败：
- 检查 `/usr/bin/flatpak` 或 `/usr/local/bin/flatpak` 是否存在
- 检查 Flatpak 应用 ID 是否正确（运行 `flatpak list` 查看已安装的应用）
- 包装脚本写入临时目录。如果临时目录不可写，写入会失败。

### CDP 端点未就绪

启动 Chrome 后，Triggerfish 轮询 Chrome DevTools Protocol（CDP）端点以建立连接。默认超时为 30 秒，轮询间隔为 200 毫秒。

```
CDP endpoint on port <port> not ready after <timeout>ms
```

这意味着 Chrome 已启动但未在规定时间内打开 CDP 端口。原因：
- Chrome 加载缓慢（系统资源受限）
- 其他 Chrome 实例正在使用相同的调试端口
- Chrome 在启动过程中崩溃（检查 Chrome 自身的输出）

---

## 导航问题

### "Navigation blocked by domain policy"

浏览器工具应用与 web_fetch 相同的 SSRF 保护。指向私有 IP 地址的 URL 会被阻止：

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

这是有意的安全执行。浏览器无法访问：
- `localhost` / `127.0.0.1`
- 私有网络（`10.x.x.x`、`172.16-31.x.x`、`192.168.x.x`）
- 链路本地地址（`169.254.x.x`）

无法禁用此检查。

### "Invalid URL"

URL 格式错误。浏览器导航需要包含协议的完整 URL：

```
# 错误
browser_navigate google.com

# 正确
browser_navigate https://google.com
```

### 导航超时

```
Navigation failed: Timeout
```

页面加载时间过长。通常是服务器响应慢或页面永远无法完成加载（无限重定向、JavaScript 卡住）。

---

## 页面交互问题

### "Click failed"、"Type failed"、"Select failed"

这些错误包含失败的 CSS 选择器：

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

选择器未匹配到页面上的任何元素。常见原因：
- 页面尚未加载完成
- 元素在 iframe 内（选择器不跨越 iframe 边界）
- 选择器错误（动态类名、Shadow DOM）

### "Snapshot failed"

页面快照（提取 DOM 作为上下文）失败。可能原因：
- 页面没有内容（空白页）
- JavaScript 错误阻止了 DOM 访问
- 快照捕获过程中页面导航到了其他位置

### "Scroll failed"

通常发生在具有自定义滚动容器的页面上。滚动命令针对主文档视口。

---

## 配置文件隔离

浏览器配置文件按 Agent 隔离。每个 Agent 在配置文件基础目录下获得自己的 Chrome 配置文件目录。这意味着：

- 登录会话不在 Agent 之间共享
- Cookie、本地存储和缓存按 Agent 隔离
- 分类感知的访问控制防止交叉污染

如果您看到意外的配置文件行为，配置文件目录可能已损坏。删除它，让 Triggerfish 在下次浏览器启动时创建新的。
