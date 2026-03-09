# 知识库：已知问题

当前已知问题及其解决方法。此页面会随着问题的发现和解决而更新。

---

## Email：无 IMAP 重连

**状态：** 未解决

Email 通道适配器每 30 秒通过 IMAP 轮询新消息。如果 IMAP 连接断开（网络中断、服务器重启、空闲超时），轮询循环会静默失败且不尝试重连。

**症状：**
- Email 通道停止接收新消息
- 日志中出现 `IMAP unseen email poll failed`
- 无自动恢复

**解决方法：** 重启守护进程：

```bash
triggerfish stop && triggerfish start
```

**根本原因：** IMAP 轮询循环没有重连逻辑。`setInterval` 继续触发，但每次轮询因连接已断开而失败。

---

## Slack/Discord SDK：异步操作泄漏

**状态：** 已知上游问题

Slack（`@slack/bolt`）和 Discord（`discord.js`）SDK 在导入时会泄漏异步操作。这影响测试（需要 `sanitizeOps: false`）但不影响生产使用。

**症状：**
- 测试通道适配器时出现"leaking async ops"测试失败
- 无生产影响

**解决方法：** 导入 Slack 或 Discord 适配器的测试文件必须设置：

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack：消息截断而非分块

**状态：** 设计使然

Slack 消息在 40,000 字符处被截断，而不是像 Telegram 和 Discord 那样拆分为多条消息。非常长的 Agent 响应会丢失末尾内容。

**解决方法：** 要求 Agent 产生更短的响应，或对生成大量输出的任务使用其他通道。

---

## WhatsApp：未配置 ownerPhone 时所有用户被视为所有者

**状态：** 设计使然（带警告）

如果 WhatsApp 通道未配置 `ownerPhone` 字段，所有消息发送者都被视为所有者，授予他们完整的工具访问权限。

**症状：**
- `WhatsApp ownerPhone not configured, defaulting to non-owner`（日志警告实际上有误导性；行为是授予所有者权限）
- 任何 WhatsApp 用户都可以访问所有工具

**解决方法：** 始终设置 `ownerPhone`：

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd：安装工具后 PATH 未更新

**状态：** 设计使然

systemd 单元文件在守护进程安装时捕获您的 Shell PATH。如果在安装守护进程后安装了新工具（MCP 服务器二进制文件、`npx` 等），守护进程将找不到它们。

**症状：**
- MCP 服务器无法启动
- 工具二进制文件"未找到"，即使在终端中可以正常使用

**解决方法：** 重新安装守护进程以更新捕获的 PATH：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

这同样适用于 launchd（macOS）。

---

## 浏览器：Flatpak Chrome CDP 限制

**状态：** 平台限制

某些 Flatpak 构建的 Chrome 或 Chromium 限制了 `--remote-debugging-port` 标志，导致 Triggerfish 无法通过 Chrome DevTools Protocol 连接。

**症状：**
- `CDP endpoint on port X not ready after Yms`
- 浏览器启动但 Triggerfish 无法控制它

**解决方法：** 将 Chrome 或 Chromium 作为原生包安装，而不是 Flatpak：

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker：Podman 卷权限

**状态：** 平台特定

使用 Podman 的 rootless 容器时，UID 映射可能阻止容器（以 UID 65534 运行）写入数据卷。

**症状：**
- 启动时出现 `Permission denied` 错误
- 无法创建配置文件、数据库或日志

**解决方法：** 使用 `:Z` 卷挂载标志进行 SELinux 重标签，并确保卷目录可写：

```bash
podman run -v triggerfish-data:/data:Z ...
```

或创建具有正确所有权的卷。首先找到卷挂载路径，然后 chown：

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # 记下 "Mountpoint" 路径
podman unshare chown 65534:65534 /path/from/above
```

---

## Windows：.NET Framework csc.exe 未找到

**状态：** 平台特定

Windows 安装程序在安装时编译 C# 服务包装器。如果找不到 `csc.exe`（缺少 .NET Framework 或安装路径非标准），服务安装失败。

**症状：**
- 安装程序完成但服务未注册
- `triggerfish status` 显示服务不存在

**解决方法：** 安装 .NET Framework 4.x，或以前台模式运行 Triggerfish：

```powershell
triggerfish run
```

保持终端打开。守护进程在您关闭终端前持续运行。

---

## CalDAV：与并发客户端的 ETag 冲突

**状态：** 设计使然（CalDAV 规范）

更新或删除日历事件时，CalDAV 使用 ETag 进行乐观并发控制。如果在您读取和写入之间，其他客户端（手机应用、网页界面）修改了事件，操作将失败：

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**解决方法：** Agent 应自动重试，先获取最新的事件版本。如果没有，请要求它"获取事件的最新版本并重试"。

---

## 内存回退：重启后密钥丢失

**状态：** 设计使然

使用 `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` 时，密钥仅存储在内存中，守护进程重启后丢失。此模式仅用于测试。

**症状：**
- 密钥在守护进程重启前正常工作
- 重启后：`Secret not found` 错误

**解决方法：** 设置正确的密钥后端。在无头 Linux 上，安装 `gnome-keyring`：

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth：重新授权时不签发 Refresh Token

**状态：** Google API 行为

Google 仅在首次授权时签发 Refresh Token。如果您之前已授权该应用并重新运行 `triggerfish connect google`，您会获得 Access Token 但没有 Refresh Token。

**症状：**
- Google API 最初工作但在 Access Token 过期后（1 小时）失败
- `No refresh token` 错误

**解决方法：** 先撤销应用的访问权限，然后重新授权：

1. 前往 [Google 账户权限](https://myaccount.google.com/permissions)
2. 找到 Triggerfish 并点击"移除访问权限"
3. 重新运行 `triggerfish connect google`
4. 这次 Google 会签发新的 Refresh Token

---

## 报告新问题

如果您遇到此处未列出的问题，请查看 [GitHub Issues](https://github.com/greghavens/triggerfish/issues) 页面。如果尚未报告，请遵循[提交指南](/zh-CN/support/guides/filing-issues)提交新 Issue。
