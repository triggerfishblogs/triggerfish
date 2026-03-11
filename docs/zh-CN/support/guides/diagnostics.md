# 运行诊断

Triggerfish 有两个内置诊断工具：`patrol`（外部健康检查）和 `healthcheck` 工具（内部系统探测）。

## Patrol

Patrol 是一个 CLI 命令，用于检查核心系统是否正常运行：

```bash
triggerfish patrol
```

### 检查项目

| 检查 | 状态 | 含义 |
|------|------|------|
| Gateway running | 不通过则为 CRITICAL | WebSocket 控制平面无响应 |
| LLM connected | 不通过则为 CRITICAL | 无法访问主要 LLM 提供商 |
| Channels active | 为 0 则 WARNING | 没有通道适配器已连接 |
| Policy rules loaded | 为 0 则 WARNING | 没有策略规则被加载 |
| Skills installed | 为 0 则 WARNING | 没有技能被发现 |

### 总体状态

- **HEALTHY** - 所有检查通过
- **WARNING** - 部分非关键检查标记（如没有安装技能）
- **CRITICAL** - 至少一项关键检查失败（Gateway 或 LLM 不可达）

### 何时使用 Patrol

- 安装后，验证一切正常工作
- 配置更改后，确认守护进程正常重启
- Bot 停止响应时，缩小故障组件范围
- 提交 Bug 报告前，包含 Patrol 输出

### 示例输出

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## 健康检查工具

健康检查工具是一个内部 Agent 工具，从运行中的 Gateway 内部探测系统组件。它在对话期间对 Agent 可用。

### 检查内容

**提供商：**
- 默认提供商是否存在且可达
- 返回提供商名称

**存储：**
- 往返测试：写入一个键、读回、删除
- 验证存储层是否正常

**技能：**
- 按来源统计已发现的技能数量（内置、已安装、工作区）

**配置：**
- 基本配置验证

### 状态级别

每个组件报告以下状态之一：
- `healthy` - 完全正常
- `degraded` - 部分工作（某些功能可能不可用）
- `error` - 组件损坏

### 分类要求

健康检查工具要求最低 INTERNAL 分类，因为它会暴露系统内部信息（提供商名称、技能数量、存储状态）。PUBLIC 会话无法使用它。

### 使用健康检查

向您的 Agent 提问：

> 运行健康检查

或直接使用工具：

```
tool: healthcheck
```

响应是一份结构化报告：

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## 组合诊断

进行全面诊断：

1. **从 CLI 运行 Patrol：**
   ```bash
   triggerfish patrol
   ```

2. **检查日志中的近期错误：**
   ```bash
   triggerfish logs --level ERROR
   ```

3. **让 Agent 运行健康检查**（如果 Agent 有响应）：
   > 运行系统健康检查并告诉我是否有任何问题

4. **如果需要提交 Issue，收集日志包：**
   ```bash
   triggerfish logs bundle
   ```

---

## 启动诊断

如果守护进程完全无法启动，请按顺序检查以下内容：

1. **配置是否存在且有效：**
   ```bash
   triggerfish config validate
   ```

2. **密钥是否可以解析：**
   ```bash
   triggerfish config get-secret --list
   ```

3. **没有端口冲突：**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **没有其他实例在运行：**
   ```bash
   triggerfish status
   ```

5. **检查系统日志（Linux）：**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **检查 launchd（macOS）：**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **检查 Windows 事件日志（Windows）：**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
