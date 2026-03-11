# 知识库：密钥迁移

本文介绍从明文存储迁移到加密格式，以及从内联配置值迁移到密钥链引用。

## 背景

Triggerfish 早期版本将密钥存储为明文 JSON。当前版本对基于文件的密钥存储（Windows、Docker）使用 AES-256-GCM 加密，对操作系统原生密钥链（macOS Keychain、Linux Secret Service）使用原生支持。

## 自动迁移（明文到加密）

当 Triggerfish 打开密钥文件并检测到旧的明文格式（没有 `v` 字段的扁平 JSON 对象）时，它会自动迁移：

1. **检测。** 检查文件是否具有 `{v: 1, entries: {...}}` 结构。如果它是简单的 `Record<string, string>`，则为旧版格式。

2. **迁移。** 每个明文值使用通过 PBKDF2 导出的机器密钥进行 AES-256-GCM 加密。为每个值生成唯一的 IV。

3. **原子写入。** 加密数据先写入临时文件，然后原子重命名以替换原始文件。如果过程中断，这可以防止数据丢失。

4. **日志记录。** 创建两条日志条目：
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **跨设备处理。** 如果原子重命名失败（例如临时文件和密钥文件在不同文件系统上），迁移回退到复制后删除。

### 您需要做什么

不需要任何操作。迁移是完全自动的，在首次访问时进行。但是，迁移后：

- **轮换您的密钥。** 明文版本可能已被备份、缓存或记录。生成新的 API 密钥并更新：
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <new-key>
  ```

- **删除旧备份。** 如果您有旧明文密钥文件的备份，请安全删除它们。

## 手动迁移（内联配置到密钥链）

如果您的 `triggerfish.yaml` 包含原始密钥值而非 `secret:` 引用：

```yaml
# 迁移前（不安全）
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-real-key-here"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

运行迁移命令：

```bash
triggerfish config migrate-secrets
```

此命令：

1. 扫描配置中已知的密钥字段（API 密钥、Bot Token、密码）
2. 将每个值存储到操作系统密钥链中的标准键名下
3. 将内联值替换为 `secret:` 引用

```yaml
# 迁移后（安全）
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### 已知密钥字段

迁移命令识别以下字段：

| 配置路径 | 密钥链键名 |
|----------|-----------|
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

## 机器密钥

加密文件存储从存储在 `secrets.key` 中的机器密钥导出其加密密钥。此密钥在首次使用时自动生成。

### 密钥文件权限

在 Unix 系统上，密钥文件必须具有 `0600` 权限（仅所有者可读写）。Triggerfish 在启动时检查此项，如果权限过于宽松会记录警告：

```
Machine key file permissions too open
```

修复方法：

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### 密钥文件丢失

如果机器密钥文件被删除或损坏，使用它加密的所有密钥将无法恢复。您需要重新存储每个密钥：

```bash
triggerfish config set-secret provider:anthropic:apiKey <key>
triggerfish config set-secret telegram:botToken <token>
# ... 等等
```

在安全位置备份您的 `secrets.key` 文件。

### 自定义密钥路径

通过以下方式覆盖密钥文件位置：

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

这主要用于具有非标准卷布局的 Docker 部署。
