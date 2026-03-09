# 排程任務和觸發器

Triggerfish 代理不限於被動的問答。排程和觸發器系統啟用主動行為：排程任務、週期性簽到、早晨簡報、背景監控和自主多步驟工作流程。

## 排程任務

排程任務是具有固定指示、傳遞通道和分類上限的定時任務。它們使用標準 cron 表達式語法。

### 配置

在 `triggerfish.yaml` 中定義排程任務，或讓代理在執行時透過 cron 工具管理：

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 每天早上 7 點
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # 傳遞目標
        classification: INTERNAL # 此任務的最高 taint

      - id: pipeline-check
        schedule: "0 */4 * * *" # 每 4 小時
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### 運作方式

1. **CronManager** 解析標準 cron 表達式，並維護在重啟後存活的持久任務登錄。
2. 當任務觸發時，**OrchestratorFactory** 專門為該次執行建立隔離的協調器和工作階段。
3. 任務在**背景工作階段工作區**中執行，有自己的 taint 追蹤。
4. 輸出傳遞到配置的通道，受該通道的分類規則約束。
5. 執行歷史被記錄用於稽核。

### 代理管理的排程

代理可以透過 `cron` 工具建立和管理自己的排程任務：

| 動作           | 描述                 | 安全性                                      |
| -------------- | -------------------- | ------------------------------------------- |
| `cron.list`    | 列出所有排程任務     | 僅限擁有者                                  |
| `cron.create`  | 排程新任務           | 僅限擁有者，分類上限強制執行                |
| `cron.delete`  | 移除排程任務         | 僅限擁有者                                  |
| `cron.history` | 檢視過去的執行記錄   | 稽核追蹤保留                                |

::: warning 排程任務建立需要擁有者驗證。代理無法代表外部使用者排程任務或超過配置的分類上限。 :::

### CLI 排程管理

排程任務也可以直接從命令列管理：

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification` 旗標設定任務的分類上限。有效等級為 `PUBLIC`、`INTERNAL`、`CONFIDENTIAL` 和 `RESTRICTED`。如果省略，預設為 `INTERNAL`。

## 觸發器系統

觸發器是週期性的「簽到」迴圈，代理在其中喚醒以評估是否需要主動行動。與具有固定任務的排程任務不同，觸發器讓代理有自主判斷能力來決定什麼需要注意。

### TRIGGER.md

`TRIGGER.md` 定義代理在每次喚醒時應該檢查什麼。它位於 `~/.triggerfish/config/TRIGGER.md`，是一個自由格式的 Markdown 檔案，您在其中指定監控優先順序、升級規則和主動行為。

如果 `TRIGGER.md` 不存在，代理會使用其通用知識來決定什麼需要注意。

**範例 TRIGGER.md：**

```markdown
# TRIGGER.md -- What to check on each wakeup

## Priority Checks

- Unread messages across all channels older than 1 hour
- Calendar conflicts in the next 24 hours
- Overdue tasks in Linear or Jira

## Monitoring

- GitHub: PRs awaiting my review
- Email: anything from VIP contacts (flag for immediate notification)
- Slack: mentions in #incidents channel

## Proactive

- If morning (7-9am), prepare daily briefing
- If Friday afternoon, draft weekly summary
```

### 觸發器配置

觸發器時序和限制在 `triggerfish.yaml` 中設定：

```yaml
scheduler:
  trigger:
    enabled: true # 設定為 false 以停用觸發器（預設：true）
    interval_minutes: 30 # 每 30 分鐘檢查（預設：30）
    # 設定為 0 以在不移除配置的情況下停用觸發器
    classification_ceiling: CONFIDENTIAL # 最高 taint 上限（預設：CONFIDENTIAL）
    quiet_hours:
      start: 22 # 不在晚上 10 點...
      end: 7 # ...到早上 7 點之間喚醒
```

| 設定                                    | 描述                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | 是否啟用週期性觸發器喚醒。設定為 `false` 以停用。                                                                                             |
| `interval_minutes`                      | 代理喚醒檢查觸發器的頻率（分鐘）。預設：`30`。設定為 `0` 以在不移除配置區塊的情況下停用觸發器。                                                |
| `classification_ceiling`                | 觸發器工作階段可達到的最高分類等級。預設：`CONFIDENTIAL`。                                                                                     |
| `quiet_hours.start` / `quiet_hours.end` | 抑制觸發器的小時範圍（24 小時制）。                                                                                                           |

::: tip 要暫時停用觸發器，設定 `interval_minutes: 0`。這等同於 `enabled: false`，讓您保留其他觸發器設定以便輕鬆重新啟用。 :::

### 觸發器執行

每次觸發器喚醒遵循以下順序：

1. 排程器按配置的間隔觸發。
2. 產生一個全新的背景工作階段，taint 為 `PUBLIC`。
3. 代理讀取 `TRIGGER.md` 以獲取監控指示。
4. 代理評估每個檢查，使用可用的工具和 MCP 伺服器。
5. 如果需要行動，代理會採取行動——傳送通知、建立任務或傳遞摘要。
6. 工作階段的 taint 可能在存取分類資料時提升，但不能超過配置的上限。
7. 工作階段在完成後歸檔。

::: tip 觸發器和排程任務互補。排程任務用於不論條件都應在精確時間執行的任務（早上 7 點的早晨簡報）。觸發器用於需要判斷的監控（每 30 分鐘檢查是否有需要注意的事項）。 :::

## 觸發器上下文工具

代理可以使用 `trigger_add_to_context` 工具將觸發器結果載入到目前的對話中。當使用者詢問上次觸發器喚醒期間檢查的內容時，這很有用。

### 使用方式

| 參數     | 預設值      | 描述                                                                                             |
| -------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `source` | `"trigger"` | 要載入的觸發器輸出：`"trigger"`（週期性）、`"cron:<job-id>"` 或 `"webhook:<source>"`             |

工具載入指定來源的最近執行結果並將其新增到對話上下文中。

### 降級寫入執行

觸發器上下文注入遵守禁止降級寫入規則：

- 如果觸發器的分類**超過**工作階段 taint，工作階段 taint **提升**以匹配
- 如果工作階段 taint **超過**觸發器的分類，注入**被允許**——較低分類的資料始終可以流入較高分類的工作階段（正常的 `canFlowTo` 行為）。工作階段 taint 不變。

::: info CONFIDENTIAL 工作階段可以載入 PUBLIC 觸發器結果而沒有問題——資料向上流動。反向操作（將 CONFIDENTIAL 觸發器資料注入具有 PUBLIC 上限的工作階段）會將工作階段 taint 提升到 CONFIDENTIAL。 :::

### 持久化

觸發器結果透過 `StorageProvider` 儲存，鍵格式為 `trigger:last:<source>`。每個來源只保留最近的結果。

## 安全整合

所有排程執行都與核心安全模型整合：

- **隔離工作階段** —— 每個排程任務和觸發器喚醒都在其自己產生的工作階段中執行，有獨立的 taint 追蹤。
- **分類上限** —— 背景任務不能超過其配置的分類等級，即使它們呼叫的工具回傳更高分類的資料。
- **策略 hook** —— 排程任務中的所有操作都通過與互動式工作階段相同的執行 hook（PRE_TOOL_CALL、POST_TOOL_RESPONSE、PRE_OUTPUT）。
- **通道分類** —— 輸出傳遞遵守目標通道的分類等級。`CONFIDENTIAL` 結果無法傳送到 `PUBLIC` 通道。
- **稽核追蹤** —— 每次排程執行都以完整上下文記錄：任務 ID、工作階段 ID、taint 歷史、採取的行動和傳遞狀態。
- **持久化** —— 排程任務透過 `StorageProvider`（命名空間：`cron:`）儲存，在 Gateway 重啟後存活。
