# 知识库：破坏性变更

按版本列出的可能需要在升级时采取行动的变更清单。

## Notion：移除 `client_secret`

**提交：** 6d876c3

作为安全加固措施，`client_secret` 字段已从 Notion 集成配置中移除。Notion 现在仅使用存储在操作系统密钥链中的 OAuth Token。

**需要的操作：** 如果您的 `triggerfish.yaml` 中有 `notion.client_secret` 字段，请将其移除。它会被忽略但可能造成困惑。

**新的设置流程：**

```bash
triggerfish connect notion
```

这会将集成 Token 存储在密钥链中。不需要 Client Secret。

---

## 工具名称：点号改为下划线

**提交：** 505a443

所有工具名称从点号表示法（`foo.bar`）更改为下划线表示法（`foo_bar`）。某些 LLM 提供商不支持工具名称中的点号，导致工具调用失败。

**需要的操作：** 如果您有引用带点号工具名称的自定义策略规则或技能定义，请更新为使用下划线：

```yaml
# 变更前
- tool: notion.search

# 变更后
- tool: notion_search
```

---

## Windows 安装程序：Move-Item 改为 Copy-Item

**提交：** 5e0370f

Windows PowerShell 安装程序在升级期间的二进制替换从 `Move-Item -Force` 更改为 `Copy-Item -Force`。`Move-Item` 在 Windows 上无法可靠地覆盖文件。

**需要的操作：** 如果是全新安装则不需要。如果您在旧版本上且 `triggerfish update` 在 Windows 上失败，请在更新前手动停止服务：

```powershell
Stop-Service Triggerfish
# 然后重新运行安装程序或 triggerfish update
```

---

## 版本标记：运行时改为构建时

**提交：** e8b0c8c、eae3930、6ce0c25

版本信息从运行时检测（检查 `deno.json`）改为从 git 标签进行构建时标记。CLI 横幅不再显示硬编码的版本字符串。

**需要的操作：** 无。`triggerfish version` 继续正常工作。开发构建显示 `dev` 作为版本号。

---

## Signal：JRE 21 升级到 JRE 25

**提交：** e5b1047

Signal 通道的自动安装程序已更新为下载 JRE 25（来自 Adoptium）而非 JRE 21。signal-cli 版本也固定为 v0.14.0。

**需要的操作：** 如果您现有的 signal-cli 安装使用较旧的 JRE，请重新运行 Signal 设置：

```bash
triggerfish config add-channel signal
```

这将下载更新的 JRE 和 signal-cli。

---

## 密钥：明文改为加密

密钥存储格式从明文 JSON 更改为 AES-256-GCM 加密 JSON。

**需要的操作：** 无。迁移是自动的。有关详情，请参阅[密钥迁移](/zh-CN/support/kb/secrets-migration)。

迁移后，建议轮换您的密钥，因为明文版本之前存储在磁盘上。

---

## Tidepool：回调改为 Canvas 协议

Tidepool（A2UI）界面从基于回调的 `TidepoolTools` 接口迁移到基于 Canvas 的协议。

**受影响的文件：**
- `src/tools/tidepool/tools/tools_legacy.ts`（旧接口，保留用于兼容）
- `src/tools/tidepool/tools/tools_canvas.ts`（新接口）

**需要的操作：** 如果您有使用旧 Tidepool 回调接口的自定义技能，它们将通过旧版兼容层继续工作。新技能应使用 Canvas 协议。

---

## 配置：旧版 `primary` 字符串格式

`models.primary` 字段以前接受纯字符串（`"anthropic/claude-sonnet-4-20250514"`）。现在需要一个对象：

```yaml
# 旧版（仍被接受以保持向后兼容）
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# 当前（推荐）
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**需要的操作：** 更新为对象格式。字符串格式仍可解析但可能在未来版本中移除。

---

## 控制台日志：已移除

**提交：** 9ce1ce5

所有原始的 `console.log`、`console.warn` 和 `console.error` 调用已迁移到结构化日志记录器（`createLogger()`）。由于 Triggerfish 作为守护进程运行，stdout/stderr 输出对用户不可见。所有日志现在通过文件写入器输出。

**需要的操作：** 无。如果您之前依赖控制台输出进行调试（例如管道输出 stdout），请改用 `triggerfish logs`。

---

## 评估影响

跨多个版本升级时，请检查以上每个条目。大多数变更都是向后兼容的，有自动迁移。唯一需要手动操作的变更是：

1. **Notion client_secret 移除**（从配置中移除该字段）
2. **工具名称格式变更**（更新自定义策略规则）
3. **Signal JRE 更新**（如果使用 Signal，重新运行 Signal 设置）

其他所有内容都会自动处理。
