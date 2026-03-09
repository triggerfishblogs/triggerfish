# 故障排除：安全与分类

## 写入降级阻止

### "Write-down blocked"

这是最常见的安全错误。它意味着数据正在尝试从较高的分类级别流向较低的分类级别。

**示例：** 您的会话访问了 CONFIDENTIAL 数据（读取了分类文件、查询了分类数据库）。会话污染现在为 CONFIDENTIAL。然后您尝试将响应发送到 PUBLIC WebChat 通道。策略引擎阻止了此操作，因为 CONFIDENTIAL 数据不能流向 PUBLIC 目标。

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**解决方法：**
1. **开始新会话。** 新会话从 PUBLIC 污染级别开始。使用新的对话。
2. **使用更高分类的通道。** 通过分类为 CONFIDENTIAL 或更高级别的通道发送响应。
3. **了解污染的原因。** 检查日志中的"Taint escalation"条目，查看哪个工具调用提升了会话的分类级别。

### "Session taint cannot flow to channel"

与写入降级相同，但专门针对通道分类：

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

对分类集成的工具调用也会执行写入降级检查：

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

请注意，这看起来似乎是反的。会话污染级别高于工具的分类级别。这意味着会话的污染级别过高，无法使用分类更低的工具。其顾虑是调用该工具可能会将分类上下文泄露到安全性较低的系统中。

### "Workspace write-down blocked"

Agent 工作区具有按目录的分类。从较高污染级别的会话写入较低分类的目录会被阻止：

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## 污染升级

### "Taint escalation"

这是信息性提示，不是错误。它表示会话的分类级别刚刚增加，因为 Agent 访问了分类数据。

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

污染只升不降。一旦会话被污染为 CONFIDENTIAL，在整个会话期间都保持不变。

### "Resource-based taint escalation firing"

工具调用访问了分类高于会话当前污染级别的资源。会话污染会自动升级以匹配。

### "Non-owner taint applied"

非所有者用户的会话可能会根据通道的分类或用户的权限被污染。这与基于资源的污染是分开的。

---

## SSRF（服务器端请求伪造）

### "SSRF blocked: hostname resolves to private IP"

所有出站 HTTP 请求（web_fetch、浏览器导航、MCP SSE 连接）都经过 SSRF 保护。如果目标主机名解析到私有 IP 地址，请求会被阻止。

**被阻止的范围：**
- `127.0.0.0/8`（环回地址）
- `10.0.0.0/8`（私有地址）
- `172.16.0.0/12`（私有地址）
- `192.168.0.0/16`（私有地址）
- `169.254.0.0/16`（链路本地地址）
- `0.0.0.0/8`（未指定地址）
- `::1`（IPv6 环回地址）
- `fc00::/7`（IPv6 ULA）
- `fe80::/10`（IPv6 链路本地地址）

此保护是硬编码的，无法禁用或配置。它防止 AI Agent 被诱骗访问内部服务。

**IPv4 映射的 IPv6：** 类似 `::ffff:127.0.0.1` 的地址会被检测并阻止。

### "SSRF check blocked outbound request"

与上述相同，但从 web_fetch 工具而非 SSRF 模块记录。

### DNS 解析失败

```
DNS resolution failed for hostname
No DNS records found for hostname
```

主机名无法解析。检查：
- URL 拼写是否正确
- DNS 服务器是否可达
- 域名是否确实存在

---

## 策略引擎

### "Hook evaluation failed, defaulting to BLOCK"

策略钩子在评估过程中抛出异常。发生这种情况时，默认操作是 BLOCK（拒绝）。这是安全默认值。

检查日志获取完整异常信息。这可能表明自定义策略规则中存在 Bug。

### "Policy rule blocked action"

策略规则明确拒绝了该操作。日志条目包含触发了哪个规则以及原因。检查配置中的 `policy.rules` 部分以查看定义了哪些规则。

### "Tool floor violation"

调用了一个需要最低分类级别的工具，但会话低于该级别。

**示例：** 健康检查工具至少需要 INTERNAL 分类（因为它会暴露系统内部信息）。如果 PUBLIC 会话尝试使用它，调用会被阻止。

---

## 插件与技能安全

### "Plugin network access blocked"

插件在具有限制网络访问的沙盒中运行。它们只能访问其声明端点域上的 URL。

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

插件尝试访问不在其声明端点中的 URL，或 URL 解析到了私有 IP。

### "Skill activation blocked by classification ceiling"

技能在其 SKILL.md 前置元数据中声明 `classification_ceiling`。如果上限低于会话的污染级别，技能无法被激活：

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

这防止较低分类的技能暴露于较高分类的数据。

### "Skill content integrity check failed"

安装后，Triggerfish 对技能的内容进行哈希。如果哈希发生变化（技能在安装后被修改），完整性检查失败：

```
Skill content hash mismatch detected
```

这可能表示篡改。请从可信来源重新安装技能。

### "Skill install rejected by scanner"

安全扫描器在技能中发现了可疑内容。扫描器检查可能表明恶意行为的模式。具体警告包含在错误消息中。

---

## 会话安全

### "Session not found"

```
Session not found: <session-id>
```

请求的会话在会话管理器中不存在。它可能已被清理，或会话 ID 无效。

### "Session status access denied: taint exceeds caller"

您尝试查看某个会话的状态，但该会话的污染级别高于您当前的会话。这防止较低分类的会话了解较高分类的操作。

### "Session history access denied"

与上述概念相同，但针对查看对话历史。

---

## Agent 团队

### "Team message delivery denied: team status is ..."

团队不处于 `running` 状态。发生在以下情况：

- 团队被**解散**（手动或由生命周期监控器）
- 团队被**暂停**，因为负责人会话失败
- 团队**超时**，超过了生命周期限制

使用 `team_status` 检查团队的当前状态。如果团队因负责人失败而暂停，您可以使用 `team_disband` 解散它并创建新的。

### "Team member not found" / "Team member ... is not active"

目标成员不存在（角色名称错误）或已被终止。成员在以下情况被终止：

- 超过空闲超时（2 倍 `idle_timeout_seconds`）
- 团队被解散
- 其会话崩溃且生命周期监控器检测到

使用 `team_status` 查看所有成员及其当前状态。

### "Team disband denied: only the lead or creating session can disband"

只有两个会话可以解散团队：

1. 最初调用 `team_create` 的会话
2. 负责人成员的会话

如果您在团队内部收到此错误，调用成员不是负责人。如果您在团队外部收到此错误，您不是创建它的会话。

### 创建后团队负责人立即失败

负责人的 Agent 会话无法完成其第一轮。常见原因：

1. **LLM 提供商错误：** 提供商返回了错误（速率限制、认证失败、模型未找到）。检查 `triggerfish logs` 中的提供商错误。
2. **分类上限过低：** 如果负责人需要分类高于其上限的工具，会话可能在第一次工具调用时失败。
3. **缺少工具：** 负责人可能需要特定工具来分解工作。确保工具配置文件配置正确。

### 团队成员空闲且不产生输出

成员等待负责人通过 `sessions_send` 向其分配工作。如果负责人不分解任务：

- 负责人的模型可能不理解团队协调。尝试为负责人角色使用更强大的模型。
- `task` 描述可能太模糊，负责人无法将其分解为子任务。
- 检查 `team_status` 以查看负责人是否处于 `active` 状态且有近期活动。

### 团队成员间 "Write-down blocked"

团队成员遵循与所有会话相同的分类规则。如果一个成员被污染为 `CONFIDENTIAL` 并尝试向 `PUBLIC` 级别的成员发送数据，写入降级检查会阻止它。这是预期行为——即使在团队内部，分类数据也不能流向较低分类的会话。

---

## 委派与多 Agent

### "Delegation certificate signature invalid"

Agent 委派使用加密证书。如果签名检查失败，委派将被拒绝。这防止伪造的委派链。

### "Delegation certificate expired"

委派证书有生存时间。如果已过期，被委派的 Agent 将无法再代表委派者行动。

### "Delegation chain linkage broken"

在多跳委派（A 委派给 B，B 委派给 C）中，链中的每个环节必须有效。如果任何环节断裂，整个链将被拒绝。

---

## Webhook

### "Webhook HMAC verification failed"

传入的 Webhook 需要 HMAC 签名进行身份验证。如果签名缺失、格式错误或不匹配：

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

检查：
- Webhook 源是否发送了正确的 HMAC 签名头
- 配置中的共享密钥是否与源的密钥匹配
- 签名格式是否匹配（十六进制编码的 HMAC-SHA256）

### "Webhook replay detected"

Triggerfish 包含重放保护。如果 Webhook 负载第二次被接收（相同签名），会被拒绝。

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

同一来源在短时间内发送了过多 Webhook 请求。这是防止 Webhook 洪水攻击的保护措施。请等待后重试。

---

## 审计完整性

### "previousHash mismatch"

审计日志使用哈希链。每个条目包含前一个条目的哈希。如果链断裂，说明审计日志被篡改或损坏。

### "HMAC mismatch"

审计条目的 HMAC 签名不匹配。该条目可能在创建后被修改。
