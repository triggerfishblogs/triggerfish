# 故障排除：密钥与凭证

## 各平台的密钥链后端

| 平台 | 后端 | 详情 |
|------|------|------|
| macOS | Keychain（原生） | 使用 `security` CLI 访问 Keychain Access |
| Linux | Secret Service（D-Bus） | 使用 `secret-tool` CLI（libsecret / GNOME Keyring） |
| Windows | 加密文件存储 | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | 加密文件存储 | `/data/secrets.json` + `/data/secrets.key` |

后端在启动时自动选择。您无法更改平台使用的后端。

---

## macOS 问题

### 密钥链访问提示

macOS 可能会提示您允许 `triggerfish` 访问密钥链。点击"始终允许"以避免重复提示。如果您不小心点击了"拒绝"，打开 Keychain Access，找到该条目并删除。下次访问时会再次提示。

### 密钥链已锁定

如果 macOS 密钥链被锁定（例如休眠后），密钥操作将失败。解锁它：

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

或者解锁您的 Mac（密钥链在登录时解锁）。

---

## Linux 问题

### "secret-tool" 未找到

Linux 密钥链后端使用 `secret-tool`，它是 `libsecret-tools` 包的一部分。

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### 没有 Secret Service 守护进程在运行

在无头服务器或最小化桌面环境上，可能没有 Secret Service 守护进程。症状：

- `secret-tool` 命令挂起或失败
- 关于 D-Bus 连接的错误消息

**选项：**

1. **安装并启动 GNOME Keyring：**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **使用加密文件回退方案：**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   警告：内存回退不会在重启后保留密钥。仅适用于测试。

3. **对于服务器，考虑使用 Docker。** Docker 部署使用不需要密钥环守护进程的加密文件存储。

### KDE / KWallet

如果您使用 KDE 的 KWallet 而非 GNOME Keyring，`secret-tool` 应该仍然可以通过 KWallet 实现的 Secret Service D-Bus API 工作。如果不行，请在 KWallet 旁边安装 `gnome-keyring`。

---

## Windows / Docker 加密文件存储

### 工作原理

加密文件存储使用 AES-256-GCM 加密：

1. 使用 PBKDF2 导出机器密钥并存储在 `secrets.key` 中
2. 每个密钥值使用唯一 IV 单独加密
3. 加密数据以版本化格式（`{v: 1, entries: {...}}`）存储在 `secrets.json` 中

### "Machine key file permissions too open"

在基于 Unix 的系统（Docker 中的 Linux）上，密钥文件必须具有 `0600` 权限（仅所有者可读写）。如果权限过于宽松：

```
Machine key file permissions too open
```

**修复方法：**

```bash
chmod 600 ~/.triggerfish/secrets.key
# 或在 Docker 中
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

密钥文件存在但无法解析。可能被截断或覆盖。

**修复方法：** 删除密钥文件并重新生成：

```bash
rm ~/.triggerfish/secrets.key
```

下次启动时会生成新的密钥。但是，使用旧密钥加密的所有现有密钥将无法读取。您需要重新存储所有密钥：

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# 对所有密钥重复此操作
```

### "Secret file permissions too open"

与密钥文件相同，密钥数据文件也应具有限制性权限：

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

系统无法设置文件权限。这可能发生在不支持 Unix 权限的文件系统上（某些网络挂载、FAT/exFAT 卷）。验证文件系统是否支持权限更改。

---

## 旧版密钥迁移

### 自动迁移

如果 Triggerfish 检测到明文密钥文件（没有加密的旧格式），它会在首次加载时自动迁移到加密格式：

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

迁移过程：
1. 读取明文 JSON 文件
2. 使用 AES-256-GCM 加密每个值
3. 先写入临时文件，然后原子重命名
4. 记录警告建议轮换密钥

### 手动迁移

如果您的 `triggerfish.yaml` 文件中有密钥（未使用 `secret:` 引用），请将它们迁移到密钥链：

```bash
triggerfish config migrate-secrets
```

这会扫描您的配置查找已知的密钥字段（API 密钥、Bot Token 等），将它们存储在密钥链中，并将配置文件中的值替换为 `secret:` 引用。

### 跨设备移动问题

如果迁移涉及跨文件系统边界移动文件（不同的挂载点、NFS），原子重命名可能失败。迁移会回退到复制后删除的方式，这仍然是安全的，但会短暂地在磁盘上同时存在两个文件。

---

## 密钥解析

### `secret:` 引用的工作原理

以 `secret:` 为前缀的配置值在启动时被解析：

```yaml
# 在 triggerfish.yaml 中
apiKey: "secret:provider:anthropic:apiKey"

# 启动时解析为：
apiKey: "sk-ant-api03-actual-key-value..."
```

解析后的值仅存在于内存中。磁盘上的配置文件始终包含 `secret:` 引用。

### "Secret not found"

```
Secret not found: <key>
```

引用的密钥在密钥链中不存在。

**修复方法：**

```bash
triggerfish config set-secret <key> <value>
```

### 列出密钥

```bash
# 列出所有存储的密钥名称（不显示值）
triggerfish config get-secret --list
```

### 删除密钥

```bash
triggerfish config set-secret <key> ""
# 或通过 Agent：
# Agent 可以通过密钥工具请求删除密钥
```

---

## 环境变量覆盖

密钥文件路径可以通过 `TRIGGERFISH_KEY_PATH` 覆盖：

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

这主要用于具有自定义卷布局的 Docker 部署。

---

## 常用密钥名称

以下是 Triggerfish 使用的标准密钥链键名：

| 键名 | 用途 |
|------|------|
| `provider:<name>:apiKey` | LLM 提供商 API 密钥 |
| `telegram:botToken` | Telegram Bot Token |
| `slack:botToken` | Slack Bot Token |
| `slack:appToken` | Slack 应用级 Token |
| `slack:signingSecret` | Slack 签名密钥 |
| `discord:botToken` | Discord Bot Token |
| `whatsapp:accessToken` | WhatsApp Cloud API Access Token |
| `whatsapp:webhookVerifyToken` | WhatsApp Webhook 验证 Token |
| `email:smtpPassword` | SMTP 中继密码 |
| `email:imapPassword` | IMAP 服务器密码 |
| `web:search:apiKey` | Brave Search API 密钥 |
| `github-pat` | GitHub 个人访问令牌 |
| `notion:token` | Notion 集成 Token |
| `caldav:password` | CalDAV 服务器密码 |
| `google:clientId` | Google OAuth Client ID |
| `google:clientSecret` | Google OAuth Client Secret |
| `google:refreshToken` | Google OAuth Refresh Token |
