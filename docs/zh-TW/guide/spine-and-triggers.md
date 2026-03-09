# SPINE 和觸發器

Triggerfish 使用兩個 Markdown 檔案來定義代理的行為：**SPINE.md** 控制代理是誰，**TRIGGER.md** 控制代理主動做什麼。兩者都是自由格式的 Markdown——您用普通英文撰寫。

## SPINE.md——代理身分

`SPINE.md` 是代理系統提示的基礎。它定義代理的名稱、個性、使命、知識領域和邊界。Triggerfish 在每次處理訊息時都會載入此檔案，因此變更會立即生效。

### 檔案位置

```
~/.triggerfish/SPINE.md
```

對於多代理設定，每個代理有自己的 SPINE.md：

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### 入門

設定精靈（`triggerfish dive`）會根據您的回答產生一個起始 SPINE.md。您可以隨時自由編輯——它就是 Markdown。

### 撰寫有效的 SPINE.md

好的 SPINE.md 是具體的。您對代理角色的描述越具體，它的表現越好。以下是建議的結構：

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize calendar
management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.
- Match the formality of the channel: casual on WhatsApp, professional on Slack.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.
- VIP contacts: @boss (David Chen), @skip (Maria Lopez).
- Current priorities: Q2 roadmap, mobile app launch.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
- When discussing work topics on personal channels, remind Sarah about
  classification boundaries.

# Response Preferences

- Default to short responses (2-3 sentences).
- Use longer responses only when the question requires detail.
- For code, include brief comments explaining key decisions.
```

### 最佳實踐

::: tip **對個性要具體。** 不要寫「要有幫助」，而是寫「要簡潔、直接，使用項目符號以增加清晰度。」 :::

::: tip **包含擁有者的背景資訊。** 當代理了解您的角色、工具和優先事項時，表現會更好。 :::

::: tip **設定明確的邊界。** 定義代理絕對不應該做的事情。這補充（但不取代）策略引擎的確定性執行。 :::

::: warning SPINE.md 的指示引導 LLM 的行為，但不是安全控制。要實施可強制執行的限制，請使用 `triggerfish.yaml` 中的策略引擎。策略引擎是確定性的且無法繞過——SPINE.md 的指示則可以被繞過。 :::

## TRIGGER.md——主動行為

`TRIGGER.md` 定義代理在週期性喚醒期間應該檢查、監控和採取行動的事項。與排程任務（在固定時間執行固定任務）不同，觸發器讓代理有自主判斷能力來評估條件並決定是否需要採取行動。

### 檔案位置

```
~/.triggerfish/TRIGGER.md
```

對於多代理設定：

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### 觸發器如何運作

1. 觸發器迴圈按配置的間隔喚醒代理（在 `triggerfish.yaml` 中設定）
2. Triggerfish 載入您的 TRIGGER.md 並呈現給代理
3. 代理評估每個項目，如有需要則採取行動
4. 所有觸發器操作都通過正常的策略 hook
5. 觸發器工作階段以分類上限執行（同樣在 YAML 中配置）
6. 遵守安靜時段——在那些時段不會觸發

### YAML 中的觸發器配置

在您的 `triggerfish.yaml` 中設定時序和限制：

```yaml
trigger:
  interval: 30m # 每 30 分鐘檢查
  classification: INTERNAL # 觸發器工作階段的最高 taint 上限
  quiet_hours: "22:00-07:00" # 在這些時段不喚醒
```

### 撰寫 TRIGGER.md

按優先順序組織您的觸發器。要具體說明什麼算是需要行動的，以及代理應該如何處理。

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour -- summarize and notify
  on primary channel.
- Calendar conflicts in the next 24 hours -- flag and suggest resolution.
- Overdue tasks in Linear -- list them with days overdue.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts (David Chen, Maria Lopez) -- flag for
  immediate notification regardless of quiet hours.
- Slack: mentions in #incidents channel -- summarize and escalate if unresolved.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar, weather, and top 3
  priorities.
- If Friday afternoon, draft weekly summary of completed tasks and open items.
- If inbox count exceeds 50 unread, offer to batch-triage.
```

### 範例：最簡 TRIGGER.md

如果您想要一個簡單的起點：

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### 範例：開發者導向的 TRIGGER.md

```markdown
# High Priority

- CI failures on main branch -- investigate and notify.
- PRs awaiting my review older than 2 hours.
- Sentry errors with "critical" severity in the last hour.

# Monitoring

- Dependabot PRs -- auto-approve patch updates, flag minor/major.
- Build times trending above 10 minutes -- report weekly.
- Open issues assigned to me with no updates in 3 days.

# Daily

- Morning: summarize overnight CI runs and deploy status.
- End of day: list PRs I opened that are still pending review.
```

### 觸發器和策略引擎

所有觸發器操作都受到與互動式對話相同的策略執行約束：

- 每次觸發器喚醒都會產生一個隔離的工作階段，有自己的 taint 追蹤
- 您的 YAML 配置中的分類上限限制了觸發器可以存取的資料
- 禁止降級寫入規則適用——如果觸發器存取了機密資料，它無法將結果傳送到公開通道
- 所有觸發器操作都記錄在稽核追蹤中

::: info 如果 TRIGGER.md 不存在，觸發器喚醒仍會按配置的間隔發生。代理會使用其通用知識和 SPINE.md 來決定什麼需要注意。為了最佳效果，請撰寫 TRIGGER.md。 :::

## SPINE.md 與 TRIGGER.md 比較

| 面向     | SPINE.md                       | TRIGGER.md                     |
| -------- | ------------------------------ | ------------------------------ |
| 目的     | 定義代理是誰                   | 定義代理監控什麼               |
| 載入時機 | 每次訊息                       | 每次觸發器喚醒                 |
| 範圍     | 所有對話                       | 僅觸發器工作階段               |
| 影響     | 個性、知識、邊界               | 主動檢查和行動                 |
| 必要性   | 是（由 dive 精靈產生）         | 否（但建議使用）               |

## 下一步

- 在 [triggerfish.yaml](./configuration) 中配置觸發器時序和排程任務
- 在[指令參考](./commands)中了解所有可用的 CLI 指令
