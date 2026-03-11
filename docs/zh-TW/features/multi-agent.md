# 多代理路由

Triggerfish 支援將不同的通道、帳戶或聯絡人路由到獨立的隔離代理，每個都有自己的工作區、工作階段、個性和分類上限。

## 為什麼需要多個代理？

單一代理和單一個性並非總是足夠。您可能想要：

- WhatsApp 上的**個人助理**，處理行事曆、提醒和家庭訊息。
- Slack 上的**工作助理**，管理 Jira 票據、GitHub PR 和程式碼審查。
- Discord 上的**支援代理**，以不同的語氣和有限的存取權回答社群問題。

多代理路由讓您從單一 Triggerfish 安裝同時執行所有這些。

## 運作方式

<img src="/diagrams/multi-agent-routing.svg" alt="多代理路由：入站通道通過 AgentRouter 路由到隔離的代理工作區" style="max-width: 100%;" />

**AgentRouter** 檢查每條入站訊息，並根據可配置的路由規則將其映射到代理。如果沒有規則匹配，訊息會送到預設代理。

## 路由規則

訊息可以按以下方式路由：

| 標準   | 描述                                       | 範例                                    |
| ------ | ------------------------------------------ | --------------------------------------- |
| 通道   | 按訊息平台路由                             | 所有 Slack 訊息送到「Work」             |
| 帳戶   | 按通道內的特定帳戶路由                     | 工作信箱 vs 個人信箱                    |
| 聯絡人 | 按發送者/對方身分路由                      | 來自主管的訊息送到「Work」              |
| 預設   | 無規則匹配時的備援                         | 其他所有訊息送到「Personal」            |

## 配置

在 `triggerfish.yaml` 中定義代理和路由：

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

每個代理指定：

- **id** —— 用於路由的唯一識別碼。
- **name** —— 人類可讀的名稱。
- **channels** —— 此代理處理哪些通道實例。
- **tools** —— 工具設定檔和明確的允許/拒絕清單。
- **model** —— 使用哪個 LLM 模型（每個代理可以不同）。
- **classification_ceiling** —— 此代理可達到的最高分類等級。

## 代理身分

每個代理有自己的 `SPINE.md`，定義其個性、使命和邊界。SPINE.md 檔案位於代理的工作區目錄：

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # 個人助理個性
    work/
      SPINE.md          # 工作助理個性
    support/
      SPINE.md          # 支援機器人個性
```

## 隔離

多代理路由在代理之間強制嚴格隔離：

| 面向       | 隔離                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 工作階段   | 每個代理有獨立的工作階段空間。工作階段永遠不會共享。                                                 |
| Taint      | Taint 按代理追蹤，而非跨代理。工作 taint 不影響個人工作階段。                                       |
| 技能       | 技能按工作區載入。工作技能對個人代理不可用。                                                         |
| 密鑰       | 憑證按代理隔離。支援代理無法存取工作 API 金鑰。                                                     |
| 工作區     | 每個代理有自己的檔案系統工作區用於程式碼執行。                                                       |

::: warning 代理間通訊透過 `sessions_send` 是可能的，但受策略層閘控。一個代理無法在沒有明確策略規則允許的情況下靜默存取另一個代理的資料或工作階段。 :::

::: tip 多代理路由用於跨通道和角色分離關注點。如果代理需要在共享任務上協作，請參閱[代理團隊](/zh-TW/features/agent-teams)。 :::

## 預設代理

當沒有路由規則匹配入站訊息時，它會送到預設代理。您可以在配置中設定：

```yaml
agents:
  default: personal
```

如果沒有配置預設值，清單中的第一個代理會被用作預設。
