# 常見問題

## 安裝

### 系統需求是什麼？

Triggerfish 可在 macOS（Intel 及 Apple Silicon）、Linux（x64 及 arm64）及 Windows（x64）上執行。二進位安裝程式會處理所有事項。如果從原始碼建置，您需要 Deno 2.x。

Docker 部署方面，任何執行 Docker 或 Podman 的系統皆可使用。容器映像檔基於 distroless Debian 12。

### Triggerfish 的資料存放在哪裡？

所有資料預設存放在 `~/.triggerfish/` 下：

```
~/.triggerfish/
  triggerfish.yaml          # 設定檔
  SPINE.md                  # Agent 身分
  TRIGGER.md                # 主動行為定義
  logs/                     # 日誌檔案（1 MB 輪替，10 個備份）
  data/triggerfish.db       # SQLite 資料庫（工作階段、記憶、狀態）
  skills/                   # 已安裝的技能
  backups/                  # 帶時間戳記的設定檔備份
```

Docker 部署使用 `/data` 替代。您可以透過設定 `TRIGGERFISH_DATA_DIR` 環境變數來覆寫基礎目錄。

### 可以移動資料目錄嗎？

可以。在啟動 daemon 之前設定 `TRIGGERFISH_DATA_DIR` 環境變數為您想要的路徑。如果您使用 systemd 或 launchd，則需要更新服務定義（請參閱[平台注意事項](/zh-TW/support/guides/platform-notes)）。

### 安裝程式提示無法寫入 `/usr/local/bin`

安裝程式會先嘗試 `/usr/local/bin`。如果該位置需要 root 權限，則會退而使用 `~/.local/bin`。如果您想使用系統層級的位置，請使用 `sudo` 重新執行：

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### 如何解除安裝 Triggerfish？

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

此命令會停止 daemon、移除服務定義（systemd unit 或 launchd plist）、刪除二進位檔，並移除整個 `~/.triggerfish/` 目錄（包含所有資料）。

---

## 設定

### 如何變更 LLM 供應商？

編輯 `triggerfish.yaml` 或使用 CLI：

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

設定變更後 daemon 會自動重新啟動。

### API 金鑰存放在哪裡？

API 金鑰儲存在作業系統的鑰匙圈中（macOS Keychain、Linux Secret Service，或 Windows/Docker 上的加密檔案）。切勿將原始 API 金鑰放在 `triggerfish.yaml` 中。請使用 `secret:` 參照語法：

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

儲存實際金鑰：

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### 設定檔中的 `secret:` 是什麼意思？

以 `secret:` 為前綴的值是指向作業系統鑰匙圈的參照。在啟動時，Triggerfish 會解析每個參照並在記憶體中替換為實際的密鑰值。原始密鑰永遠不會出現在磁碟上的 `triggerfish.yaml` 中。詳情請參閱[密鑰與憑證](/zh-TW/support/troubleshooting/secrets)中各平台的後端說明。

### 什麼是 SPINE.md？

`SPINE.md` 是您 Agent 的身分檔案。它定義了 Agent 的名稱、使命、個性及行為準則。可以將其視為系統提示詞的基礎。設定精靈（`triggerfish dive`）會為您生成一個，但您可以自由編輯。

### 什麼是 TRIGGER.md？

`TRIGGER.md` 定義 Agent 的主動行為：在排程觸發喚醒時應該檢查、監控和執行的事項。如果沒有 `TRIGGER.md`，觸發器仍會啟動，但 Agent 將沒有任何指示知道該做什麼。

### 如何新增頻道？

```bash
triggerfish config add-channel telegram
```

此命令會啟動互動式提示，引導您填寫必要欄位（Bot Token、擁有者 ID、分級等級）。您也可以直接在 `triggerfish.yaml` 的 `channels:` 區段下編輯。

### 我變更了設定但沒有任何效果

Daemon 必須重新啟動才能套用變更。如果您使用 `triggerfish config set`，它會提供自動重新啟動的選項。如果您手動編輯了 YAML 檔案，請使用以下命令重新啟動：

```bash
triggerfish stop && triggerfish start
```

---

## 頻道

### 為什麼機器人沒有回應訊息？

請先檢查：

1. **Daemon 是否正在執行？** 執行 `triggerfish status`
2. **頻道是否已連線？** 檢查日誌：`triggerfish logs`
3. **Bot Token 是否有效？** 大多數頻道在 Token 無效時會靜默失敗
4. **擁有者 ID 是否正確？** 如果您未被識別為擁有者，機器人可能會限制回應

詳情請參閱[頻道疑難排解](/zh-TW/support/troubleshooting/channels)指南中各頻道的檢查清單。

### 什麼是擁有者 ID，為什麼重要？

擁有者 ID 告訴 Triggerfish 在特定頻道上哪個使用者是您（操作者）。非擁有者使用者會受到工具存取限制，並可能受到分級限制。如果您留空擁有者 ID，各頻道的行為會有所不同。某些頻道（如 WhatsApp）會將所有人視為擁有者，這是一個安全風險。

### 可以同時使用多個頻道嗎？

可以。在 `triggerfish.yaml` 中設定任意數量的頻道。每個頻道維護自己的工作階段和分級等級。路由器會處理所有已連線頻道之間的訊息傳遞。

### 訊息大小限制是多少？

| 頻道 | 限制 | 行為 |
|---------|-------|----------|
| Telegram | 4,096 字元 | 自動分段 |
| Discord | 2,000 字元 | 自動分段 |
| Slack | 40,000 字元 | 截斷（非分段） |
| WhatsApp | 4,096 字元 | 截斷 |
| Email | 無硬性限制 | 完整傳送 |
| WebChat | 無硬性限制 | 完整傳送 |

### 為什麼 Slack 訊息被截斷了？

Slack 有 40,000 字元的限制。與 Telegram 和 Discord 不同，Triggerfish 會截斷 Slack 訊息而非拆分成多則訊息。非常長的回應（如大型程式碼輸出）可能會在尾端遺失內容。

---

## 安全性與分級

### 分級等級有哪些？

四個等級，從最低到最高敏感度：

1. **PUBLIC** - 資料流動無限制
2. **INTERNAL** - 標準操作資料
3. **CONFIDENTIAL** - 敏感資料（憑證、個人資訊、財務記錄）
4. **RESTRICTED** - 最高敏感度（受監管資料、合規關鍵資料）

資料只能從較低等級流向相同或更高等級。CONFIDENTIAL 資料永遠無法到達 PUBLIC 頻道。這就是「no write-down」規則，且無法被覆寫。

### 「session taint」是什麼意思？

每個工作階段都以 PUBLIC 開始。當 Agent 存取已分級的資料（讀取 CONFIDENTIAL 檔案、查詢 RESTRICTED 資料庫）時，工作階段的 taint 會升級以匹配。Taint 只能上升，永遠不會下降。被標記為 CONFIDENTIAL 的工作階段無法將其輸出傳送到 PUBLIC 頻道。

### 為什麼會出現「write-down blocked」錯誤？

您的工作階段已被標記為高於目標的分級等級。例如，如果您存取了 CONFIDENTIAL 資料，然後嘗試將結果傳送到 PUBLIC 的 WebChat 頻道，政策引擎會阻擋它。

這是正常運作。要解決此問題，您可以：
- 開始一個新的工作階段（新對話）
- 使用分級等級等於或高於您工作階段 taint 等級的頻道

### 可以停用分級強制執行嗎？

不可以。分級系統是核心安全不變量。它以確定性程式碼在 LLM 層之下執行，無法被繞過、停用或受 Agent 影響。這是設計使然。

---

## LLM 供應商

### 支援哪些供應商？

Anthropic、OpenAI、Google Gemini、Fireworks、OpenRouter、ZenMux、Z.AI，以及透過 Ollama 或 LM Studio 的本地模型。

### 備援切換如何運作？

在 `triggerfish.yaml` 中設定 `failover` 清單：

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

如果主要供應商失敗，Triggerfish 會依序嘗試每個備援供應商。`failover_config` 區段控制重試次數、延遲及哪些錯誤條件會觸發備援切換。

### 供應商回傳 401 / 403 錯誤

您的 API 金鑰無效或已過期。重新儲存：

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

然後重新啟動 daemon。詳情請參閱 [LLM 供應商疑難排解](/zh-TW/support/troubleshooting/providers)中各供應商的指引。

### 可以為不同分級等級使用不同模型嗎？

可以。使用 `classification_models` 設定：

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

被標記為特定等級的工作階段將使用對應的模型。未明確覆寫的等級會退回使用主要模型。

---

## Docker

### 如何在 Docker 中執行 Triggerfish？

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

此命令會下載 Docker 包裝腳本和 compose 檔案、拉取映像檔，並執行設定精靈。

### Docker 中的資料存放在哪裡？

所有持久化資料存放在 Docker 命名卷（`triggerfish-data`）中，掛載在容器內的 `/data`。這包括設定檔、密鑰、SQLite 資料庫、日誌、技能及 Agent 工作區。

### Docker 中的密鑰如何運作？

Docker 容器無法存取主機作業系統的鑰匙圈。Triggerfish 改用加密檔案儲存：`secrets.json`（加密值）和 `secrets.key`（AES-256 加密金鑰），兩者都儲存在 `/data` 卷中。請將此卷視為敏感資料。

### 容器找不到設定檔

請確認您正確掛載了設定檔：

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

如果容器在沒有設定檔的情況下啟動，它會印出幫助訊息並退出。

### 如何更新 Docker 映像檔？

```bash
triggerfish update    # 如果使用包裝腳本
# 或
docker compose pull && docker compose up -d
```

---

## 技能與 The Reef

### 什麼是技能？

技能是一個包含 `SKILL.md` 檔案的資料夾，用於賦予 Agent 新的能力、背景資訊或行為準則。技能可以包含工具定義、程式碼、範本及指令。

### 什麼是 The Reef？

The Reef 是 Triggerfish 的技能市集。您可以透過它探索、安裝和發佈技能：

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### 為什麼我的技能被安全掃描器阻擋了？

每個技能在安裝前都會被掃描。掃描器會檢查可疑模式、過度的權限要求及分級上限違規。如果技能的上限低於您目前的工作階段 taint，啟用會被阻擋以防止 write-down。

### 技能的分級上限是什麼？

技能會宣告其允許運作的最大分級等級。`classification_ceiling: INTERNAL` 的技能無法在被標記為 CONFIDENTIAL 或更高等級的工作階段中啟用。這可以防止技能存取超出其許可等級的資料。

---

## 觸發器與排程

### 什麼是觸發器？

觸發器是 Agent 的週期性主動喚醒行為。您在 `TRIGGER.md` 中定義 Agent 應該檢查的項目，Triggerfish 會按排程喚醒它。Agent 會檢視其指令、採取行動（查看行事曆、監控服務、傳送提醒），然後回到休眠狀態。

### 觸發器與 cron 任務有什麼不同？

Cron 任務按排程執行固定任務。觸發器則帶著完整的上下文（記憶、工具、頻道存取權限）喚醒 Agent，讓它根據 `TRIGGER.md` 的指令自行決定要做什麼。Cron 是機械式的；觸發器是代理式的。

### 什麼是靜默時段？

`scheduler.trigger` 中的 `quiet_hours` 設定會在指定時段內阻止觸發器觸發：

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Webhook 如何運作？

外部服務可以透過 POST 到 Triggerfish 的 webhook 端點來觸發 Agent 動作。每個 webhook 來源需要 HMAC 簽署進行身分驗證，並包含重播偵測。

---

## Agent 團隊

### 什麼是 Agent 團隊？

Agent 團隊是持久性的協作 Agent 群組，共同處理複雜任務。每個團隊成員是一個獨立的 Agent 工作階段，擁有自己的角色、對話上下文和工具。其中一位成員被指定為領導者，負責協調工作。完整文件請參閱 [Agent 團隊](/zh-TW/features/agent-teams)。

### 團隊與子 Agent 有什麼不同？

子 Agent 是即發即忘的：您委派單一任務並等待結果。團隊則是持久性的——成員透過 `sessions_send` 互相溝通，領導者協調工作，團隊自主運作直到解散或逾時。單一聚焦的委派使用子 Agent；複雜的多角色協作使用團隊。

### Agent 團隊需要付費方案嗎？

使用 Triggerfish Gateway 時，Agent 團隊需要 **Power** 方案（$149/月）。使用自有 API 金鑰的開源使用者擁有完整存取權限——每個團隊成員從您設定的 LLM 供應商消耗推論額度。

### 為什麼我的團隊領導者立即失敗了？

最常見的原因是 LLM 供應商設定錯誤。每個團隊成員會產生自己的 Agent 工作階段，需要一個正常運作的 LLM 連線。請在團隊建立時間點前後檢查 `triggerfish logs` 中的供應商錯誤。詳情請參閱 [Agent 團隊疑難排解](/zh-TW/support/troubleshooting/security#agent-teams)。

### 團隊成員可以使用不同的模型嗎？

可以。每個成員定義接受一個可選的 `model` 欄位。如果省略，成員會繼承建立者 Agent 的模型。這讓您可以將昂貴的模型分配給複雜角色，將較便宜的模型分配給簡單角色。

### 團隊可以執行多久？

預設情況下，團隊的存活時間為 1 小時（`max_lifetime_seconds: 3600`）。當達到限制時，領導者會收到 60 秒的警告以產出最終輸出，然後團隊自動解散。您可以在建立時設定更長的存活時間。

### 團隊成員當機會怎樣？

生命週期監控器會在 30 秒內偵測到成員失敗。失敗的成員會被標記為 `failed`，領導者會被通知以便繼續使用其餘成員或解散團隊。如果領導者本身失敗，團隊會被暫停，建立該團隊的工作階段會收到通知。

---

## 其他

### Triggerfish 是開源的嗎？

是的，採用 Apache 2.0 授權。完整原始碼（包含所有安全關鍵元件）可在 [GitHub](https://github.com/greghavens/triggerfish) 上供審閱。

### Triggerfish 會回傳資料嗎？

不會。Triggerfish 不會發出任何對外連線，除了您明確設定的服務（LLM 供應商、頻道 API、整合）。沒有遙測、分析或更新檢查，除非您執行 `triggerfish update`。

### 可以執行多個 Agent 嗎？

可以。`agents` 設定區段定義多個 Agent，每個都有自己的名稱、模型、頻道綁定、工具集和分級上限。路由系統會將訊息導向適當的 Agent。

### 什麼是 Gateway？

Gateway 是 Triggerfish 的內部 WebSocket 控制平面。它管理工作階段、在頻道和 Agent 之間路由訊息、派送工具並執行政策。CLI 聊天介面透過 Gateway 與您的 Agent 通訊。

### Triggerfish 使用哪些連接埠？

| 連接埠 | 用途 | 綁定 |
|------|---------|---------|
| 18789 | Gateway WebSocket | 僅 localhost |
| 18790 | Tidepool A2UI | 僅 localhost |
| 8765 | WebChat（若啟用） | 可設定 |
| 8443 | WhatsApp webhook（若啟用） | 可設定 |

所有預設連接埠都綁定到 localhost。除非您明確設定或使用反向代理，否則不會暴露到網路。
