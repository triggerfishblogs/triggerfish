---
layout: home

hero:
  name: Triggerfish
  text: 安全的 AI 代理
  tagline: LLM 層之下的確定性策略執行。每個頻道。無一例外。
  image:
    src: /triggerfish.webp
    alt: Triggerfish — 遊弋於數位海洋
  actions:
    - theme: brand
      text: 開始使用
      link: /zh-TW/guide/
    - theme: alt
      text: 價格方案
      link: /zh-TW/pricing
    - theme: alt
      text: 在 GitHub 上查看
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: LLM 之下的安全性
    details: 確定性的 LLM 層下策略執行。AI 無法繞過、覆寫或影響的純程式碼 hook。相同輸入永遠產生相同決策。
  - icon: "\U0001F4AC"
    title: 支援您使用的每個頻道
    details: Telegram、Slack、Discord、WhatsApp、Email、WebChat、CLI——全部支援按頻道分類及自動 taint 追蹤。
  - icon: "\U0001F528"
    title: 構建一切
    details: 代理執行環境，提供寫入/執行/修正回饋循環。自我撰寫技能。The Reef 市集讓您探索和分享能力。
  - icon: "\U0001F916"
    title: 任意 LLM 提供者
    details: Anthropic、OpenAI、Google Gemini、透過 Ollama 使用本地模型、OpenRouter。自動故障轉移鏈。或選擇 Triggerfish Gateway——無需 API 金鑰。
  - icon: "\U0001F3AF"
    title: 預設主動行動
    details: 定時任務、觸發器和 webhook。您的代理自主檢查、監控和行動——在嚴格的策略邊界內。
  - icon: "\U0001F310"
    title: 開放原始碼
    details: Apache 2.0 授權。安全關鍵元件完全開放供審計。別信任我們——請驗證程式碼。
---

<LatestRelease />

## 一行指令安裝

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

二進位安裝程式會下載預建版本、驗證其校驗碼，並執行設定精靈。請參閱[安裝指南](/zh-TW/guide/installation)了解 Docker
設定、從原始碼建置及發行流程。

不想管理 API 金鑰？[查看價格方案](/zh-TW/pricing)了解 Triggerfish Gateway——
管理式 LLM 和搜尋基礎設施，幾分鐘內即可就緒。

## 運作原理

Triggerfish 在您的 AI 代理與其所觸及的一切之間放置了一個確定性策略層。LLM
提出動作——純程式碼 hook 決定是否允許。

- **確定性策略** — 安全決策是純程式碼。沒有隨機性、沒有
  LLM 影響、沒有例外。相同輸入，相同決策，每一次。
- **資訊流控制** — 四個分類等級（PUBLIC、INTERNAL、
  CONFIDENTIAL、RESTRICTED）透過工作階段 taint 自動傳播。資料
  永遠不能向下流動到安全等級較低的環境。
- **六個執行 Hook** — 資料管線的每個階段都受到管控：進入
  LLM 環境的內容、呼叫哪些工具、回傳什麼結果、以及
  離開系統的內容。每個決策都會記錄稽核日誌。
- **預設拒絕** — 不會靜默允許任何事物。未分類的工具、
  整合及資料來源在明確設定前都會被拒絕。
- **代理身份** — 您代理的使命定義在 SPINE.md 中，主動
  行為定義在 TRIGGER.md 中。技能透過簡單的資料夾
  慣例擴展能力。The Reef 市集讓您探索和分享它們。

[進一步了解架構。](/zh-TW/architecture/)
