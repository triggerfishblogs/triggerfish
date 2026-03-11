# 快速開始

本指南帶您走過使用 Triggerfish 的前 5 分鐘——從執行設定精靈到擁有一個
可以聊天的 AI 代理。

## 執行設定精靈

如果您使用了一行指令安裝，精靈在安裝過程中已經執行過。若要重新執行或重新開始：

```bash
triggerfish dive
```

精靈會帶您走過八個步驟：

### 步驟 1：選擇您的 LLM 提供者

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

選擇一個提供者並輸入您的憑證。Triggerfish 支援多個提供者並可自動故障轉移。
**Triggerfish Gateway** 是最簡單的選項——訂閱 [Pro 或 Power 方案](/zh-TW/pricing)，
您的代理即可連接到管理式 LLM 和搜尋基礎設施，無需設定任何 API 金鑰。

### 步驟 2：為您的代理命名

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

這會生成您的 `SPINE.md` 檔案——代理系統提示的基礎。您可以隨時在
`~/.triggerfish/SPINE.md` 編輯它。

### 步驟 3：連接一個頻道

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

選擇一個訊息平台，或跳過此步驟，先使用 CLI。您可以稍後在
`triggerfish.yaml` 中新增頻道。

### 步驟 4：選用 Plugin

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

連接選用的整合，如用於筆記的 Obsidian。

### 步驟 5：連接 Google Workspace（選用）

透過 OAuth2 連接您的 Google 帳號以使用 Gmail、日曆、工作、雲端硬碟和試算表。
您可以跳過此步驟，稍後使用 `triggerfish connect google` 連接。

### 步驟 6：連接 GitHub（選用）

透過貼上 Personal Access Token 連接 GitHub。讓代理擁有儲存庫、PR、議題和
Actions 的工具。您可以跳過此步驟，稍後使用 `triggerfish connect github` 連接。

### 步驟 7：設定網頁搜尋

為您的代理選擇搜尋引擎（Brave Search 或自架的 SearXNG），或先跳過。

### 步驟 8：啟動常駐程式

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

選擇「是」讓您的代理在機器開啟時始終執行。

## 開始聊天

精靈完成後，您可以透過 CLI 立即開始聊天：

```bash
triggerfish chat
```

或者，如果您已連接訊息頻道，直接在那裡向您的代理傳送訊息。

### 對話範例

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## 驗證您的設定

執行健康檢查以確保一切正常運作：

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## 接下來做什麼

- **自訂您的代理** — 編輯 `~/.triggerfish/SPINE.md` 來精煉您代理的個性和能力。
  請參閱 [SPINE 與觸發器](./spine-and-triggers)。
- **新增更多頻道** — 在 `triggerfish.yaml` 中連接 Telegram、Slack、Discord 或
  WhatsApp。請參閱[設定](./configuration)。
- **連接整合** — `triggerfish connect google` 連接 Google Workspace，
  `triggerfish connect github` 連接 GitHub。
- **設定主動行為** — 建立 `~/.triggerfish/TRIGGER.md` 告訴您的代理要監控什麼。
  請參閱 [SPINE 與觸發器](./spine-and-triggers)。
- **探索指令** — 了解所有可用的 CLI 和聊天內指令。請參閱
  [CLI 指令](./commands)。
