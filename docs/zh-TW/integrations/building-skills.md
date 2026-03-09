# 建構 Skills

本指南逐步說明如何從零建立 Triggerfish skill——從撰寫 `SKILL.md` 檔案到測試和取得核准。

## 您將建構什麼

Skill 是一個包含 `SKILL.md` 檔案的資料夾，教代理如何做某件事。在本指南結束時，您將擁有一個代理可以探索和使用的可運作 skill。

## Skill 結構

每個 skill 都是一個在根目錄有 `SKILL.md` 的目錄：

```
my-skill/
  SKILL.md           # 必要：frontmatter + 指示
  template.md        # 選填：skill 參考的範本
  helper.ts          # 選填：支援程式碼
```

`SKILL.md` 檔案有兩個部分：

1. **YAML frontmatter**（在 `---` 分隔符之間）——關於 skill 的 metadata
2. **Markdown 本文**——代理讀取的指示

## 步驟 1：撰寫 Frontmatter

Frontmatter 宣告 skill 的功能、需求和安全約束。

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### 必填欄位

| 欄位          | 說明                                               | 範例            |
| ------------- | -------------------------------------------------- | --------------- |
| `name`        | 唯一識別碼。小寫，連字號代替空格。                 | `github-triage` |
| `description` | Skill 的功能和使用時機。1-3 句話。                 | 見上方          |

### 選填欄位

| 欄位                     | 說明                        | 預設值   |
| ------------------------ | --------------------------- | -------- |
| `classification_ceiling` | 最大資料敏感度等級          | `PUBLIC` |
| `requires_tools`         | Skill 需要存取的工具        | `[]`     |
| `network_domains`        | Skill 存取的外部域名        | `[]`     |

其他欄位如 `version`、`category`、`tags` 和 `triggers` 可以包含供文件和未來使用。Skill 載入器會靜默忽略它不認識的欄位。

### 選擇分類上限

分類上限是您的 skill 將處理的最大資料敏感度。選擇最低的可用等級：

| 等級           | 何時使用                      | 範例                                             |
| -------------- | ----------------------------- | ------------------------------------------------ |
| `PUBLIC`       | 僅使用公開可用的資料          | 網頁搜尋、公開 API 文件、天氣                    |
| `INTERNAL`     | 處理內部專案資料              | 程式碼分析、設定審查、內部文件                   |
| `CONFIDENTIAL` | 處理個人或私人資料            | 郵件摘要、GitHub 通知、CRM 查詢                  |
| `RESTRICTED`   | 存取高度敏感資料              | 金鑰管理、安全稽核、合規                         |

::: warning 如果您的 skill 上限超過使用者設定的上限，skill 撰寫 API 會拒絕它。務必使用必要的最低等級。 :::

## 步驟 2：撰寫指示

Markdown 本文是代理讀取以學習如何執行 skill 的內容。使其可操作且具體。

### 結構範本

```markdown
# Skill Name

一句話的目的說明。

## When to Use

- 條件 1（使用者要求 X）
- 條件 2（由 cron 觸發）
- 條件 3（偵測到相關關鍵字）

## Steps

1. 第一個動作及具體細節
2. 第二個動作及具體細節
3. 處理和格式化結果
4. 遞送到設定的頻道

## Output Format

描述結果應如何格式化。

## Common Mistakes

- 不要做 X 因為 Y
- 在繼續之前務必檢查 Z
```

### 最佳實踐

- **從目的開始**：一句話解釋 skill 的功能
- **包含「When to Use」**：幫助代理決定何時啟用 skill
- **具體**：「取得過去 24 小時的未讀郵件」比「取得郵件」更好
- **使用程式碼範例**：顯示確切的 API 呼叫、資料格式、命令模式
- **新增表格**：選項、端點、參數的快速參考
- **包含錯誤處理**：當 API 呼叫失敗或資料缺失時該怎麼做
- **以「Common Mistakes」結尾**：防止代理重複已知問題

## 步驟 3：測試探索

驗證您的 skill 是否可被 skill 載入器探索。如果您將它放在 bundled 目錄中：

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

檢查：

- Skill 出現在探索列表中
- `name` 與 frontmatter 相符
- `classificationCeiling` 正確
- `requiresTools` 和 `networkDomains` 已填入

## 代理自我編寫

代理可以使用 `SkillAuthor` API 以程式化方式建立 skills。這是代理在被要求做新事情時擴展自己的方式。

### 工作流程

```
1. 使用者：「我需要你每天早上檢查 Notion 的新任務」
2. 代理：使用 SkillAuthor 在其工作區中建立 skill
3. Skill：進入 PENDING_APPROVAL 狀態
4. 使用者：收到通知，審查 skill
5. 使用者：核准 → skill 變為啟用
6. 代理：將 skill 連接到早晨 cron 排程
```

### 使用 SkillAuthor API

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them daily",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## When to Use

- Morning cron trigger
- User asks about pending tasks

## Steps

1. Fetch tasks from Notion API using the user's integration token
2. Filter for tasks created or updated in the last 24 hours
3. Categorize by priority (P0, P1, P2)
4. Format as a concise bullet-point summary
5. Deliver to the configured channel
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### 核准狀態

| 狀態               | 意義                           |
| ------------------ | ------------------------------ |
| `PENDING_APPROVAL` | 已建立，等待擁有者審查         |
| `APPROVED`         | 擁有者已核准，skill 為啟用狀態 |
| `REJECTED`         | 擁有者已拒絕，skill 為停用狀態 |

::: warning 安全 代理無法核准自己的 skills。這在 API 層級執行。所有代理撰寫的 skills 都需要明確的擁有者確認才能啟用。 :::

## 安全掃描

在啟用前，skills 會通過安全掃描器檢查提示注入模式：

- 「Ignore all previous instructions」——提示注入
- 「You are now a...」——身份重新定義
- 「Reveal secrets/credentials」——資料洩漏嘗試
- 「Bypass security/policy」——安全規避
- 「Sudo/admin/god mode」——權限提升

被掃描器標記的 skills 會包含擁有者在核准前必須審查的警告。

## 觸發器

Skills 可以在 frontmatter 中定義自動觸發器：

```yaml
triggers:
  - cron: "0 7 * * *" # 每天上午 7 點
  - cron: "*/30 * * * *" # 每 30 分鐘
```

排程器讀取這些定義，在指定時間喚醒代理以執行 skill。您可以在 `triggerfish.yaml` 中結合安靜時段來防止在特定時期執行。

## 完整範例

以下是分類 GitHub 通知的完整 skill：

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## Skill 檢查清單

在認為 skill 完成之前：

- [ ] 資料夾名稱與 frontmatter 中的 `name` 相符
- [ ] Description 解釋了**什麼**以及**何時**使用
- [ ] 分類上限是最低可用等級
- [ ] 所有必要工具列在 `requires_tools` 中
- [ ] 所有外部域名列在 `network_domains` 中
- [ ] 指示具體且有步驟
- [ ] 程式碼範例使用 Triggerfish 模式（Result 類型、工廠函式）
- [ ] 指定了輸出格式
- [ ] 包含 Common mistakes 區段
- [ ] Skill 可被載入器探索（已測試）
