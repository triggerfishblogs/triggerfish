# 故障排除：配置

## YAML 解析错误

### "Configuration parse failed"

YAML 文件存在语法错误。常见原因：

- **缩进不匹配。** YAML 对空白敏感。使用空格而非制表符。每个嵌套级别应恰好为 2 个空格。
- **未加引号的特殊字符。** 包含 `:`、`#`、`{`、`}`、`[`、`]` 或 `&` 的值必须用引号包裹。
- **键后缺少冒号。** 每个键需要 `: `（冒号后跟一个空格）。

验证您的 YAML：

```bash
triggerfish config validate
```

或使用在线 YAML 验证器查找具体行。

### "Configuration file did not parse to an object"

YAML 文件解析成功，但结果不是 YAML 映射（对象）。当您的文件仅包含标量值、列表或为空时会发生此错误。

`triggerfish.yaml` 必须有顶层映射。最低要求：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish 按以下顺序查找配置文件：

1. `$TRIGGERFISH_CONFIG` 环境变量（如果已设置）
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml`（如果 `TRIGGERFISH_DATA_DIR` 已设置）
3. `/data/triggerfish.yaml`（Docker 环境）
4. `~/.triggerfish/triggerfish.yaml`（默认）

运行安装向导以创建配置文件：

```bash
triggerfish dive
```

---

## 验证错误

### "Configuration validation failed"

这意味着 YAML 解析成功但结构验证失败。具体消息：

**"models is required"** 或 **"models.primary is required"**

`models` 部分是必需的。您至少需要一个主要提供商和模型：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** 或 **"primary.model must be non-empty"**

`primary` 字段必须将 `provider` 和 `model` 都设置为非空字符串。

**"Invalid classification level"** 在 `classification_models` 中

有效级别为：`RESTRICTED`、`CONFIDENTIAL`、`INTERNAL`、`PUBLIC`。这些区分大小写。请检查您的 `classification_models` 键。

---

## 密钥引用错误

### 启动时密钥未解析

如果您的配置包含 `secret:some-key` 且该密钥在密钥链中不存在，守护进程将退出并报错：

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**修复方法：**

```bash
# 列出已有的密钥
triggerfish config get-secret --list

# 存储缺失的密钥
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 密钥后端不可用

在 Linux 上，密钥存储使用 `secret-tool`（libsecret / GNOME Keyring）。如果 Secret Service D-Bus 接口不可用（无头服务器、最小化容器），您在存储或检索密钥时将看到错误。

**无头 Linux 的解决方法：**

1. 安装 `gnome-keyring` 和 `libsecret`：
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. 启动密钥环守护进程：
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. 或使用加密文件回退方案：
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   注意：内存回退意味着密钥在重启后丢失。仅适用于测试。

---

## 配置值问题

### 布尔值强制转换

使用 `triggerfish config set` 时，字符串值 `"true"` 和 `"false"` 会自动转换为 YAML 布尔值。如果确实需要字面字符串 `"true"`，请直接编辑 YAML 文件。

同样，看起来像整数的字符串（`"8080"`）会被转换为数字。

### 点分路径语法

`config set` 和 `config get` 命令使用点分路径导航嵌套 YAML：

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

如果路径段包含点号，目前没有转义语法。请直接编辑 YAML 文件。

### `config get` 中的密钥掩码

当您对包含"key"、"secret"或"token"的键运行 `triggerfish config get` 时，输出会被掩码：`****...****`，仅显示前 4 个和后 4 个字符。这是有意设计的。使用 `triggerfish config get-secret <key>` 获取实际值。

---

## 配置备份

Triggerfish 在每次 `config set`、`config add-channel` 或 `config add-plugin` 操作前，会在 `~/.triggerfish/backups/` 中创建带时间戳的备份。最多保留 10 个备份。

要恢复备份：

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## 提供商验证

安装向导通过调用每个提供商的模型列表端点来验证 API 密钥（不消耗 Token）。验证端点为：

| 提供商 | 端点 |
|--------|------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

如果验证失败，请仔细检查：
- API 密钥是否正确且未过期
- 端点是否可从您的网络访问
- 对于本地提供商（Ollama、LM Studio），服务器是否正在运行

### 模型未找到

如果验证成功但模型未找到，向导会发出警告。这通常意味着：

- **模型名称拼写错误。** 查看提供商文档获取准确的模型 ID。
- **Ollama 模型未拉取。** 先运行 `ollama pull <model>`。
- **提供商未列出该模型。** 某些提供商（Fireworks）使用不同的命名格式。向导会规范化常见格式，但不常见的模型 ID 可能不匹配。
