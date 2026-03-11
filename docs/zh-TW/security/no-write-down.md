# 禁止降級寫入規則

禁止降級寫入規則是 Triggerfish 資料保護模型的基礎。它是一個固定的、不可配置的規則，適用於每個工作階段、每個通道和每個代理——沒有例外，也沒有 LLM 覆寫。

**規則：** 資料只能流向**相同或更高**分類等級的通道和收件者。

這條單一規則防止整類資料洩漏情境，從意外過度分享到設計來竊取敏感資訊的精密提示注入攻擊。

## 分類如何流動

Triggerfish 使用四個分類等級（從高到低）：

<img src="/diagrams/write-down-rules.svg" alt="降級寫入規則：資料只能流向相同或更高的分類等級" style="max-width: 100%;" />

以給定等級分類的資料可以流向該等級或其上方的任何等級。它永遠不能向下流動。這就是禁止降級寫入規則。

::: danger 禁止降級寫入規則是**固定且不可配置的**。它無法被管理員放寬、被策略規則覆寫或被 LLM 繞過。它是所有其他安全控制所依賴的架構基礎。 :::

## 有效分類

當資料即將離開系統時，Triggerfish 計算目的地的**有效分類**：

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

通道和收件者都必須在資料分類等級或以上。如果任一低於，輸出被封鎖。

| 通道                   | 收件者                      | 有效分類                 |
| ---------------------- | --------------------------- | ------------------------ |
| INTERNAL（Slack）      | INTERNAL（同事）            | INTERNAL                 |
| INTERNAL（Slack）      | EXTERNAL（供應商）          | PUBLIC                   |
| CONFIDENTIAL（Slack）  | INTERNAL（同事）            | INTERNAL                 |
| CONFIDENTIAL（Email）  | EXTERNAL（個人聯絡人）      | PUBLIC                   |

::: info CONFIDENTIAL 通道加上 EXTERNAL 收件者的有效分類為 PUBLIC。如果工作階段存取了 PUBLIC 以上的任何資料，輸出被封鎖。 :::

## 現實世界範例

以下是展示禁止降級寫入規則運作的具體場景。

```
使用者：「查看我的 Salesforce 銷售管線」

代理：[使用使用者的委派權杖存取 Salesforce]
       [Salesforce 資料分類為 CONFIDENTIAL]
       [工作階段 taint 提升到 CONFIDENTIAL]

       「您本週有 3 筆交易即將成交，總計 $2.1M...」

使用者：「傳訊息給我太太說我今晚會晚一點」

策略層：封鎖
  - 工作階段 taint：CONFIDENTIAL
  - 收件者（太太）：EXTERNAL
  - 有效分類：PUBLIC
  - CONFIDENTIAL > PUBLIC --> 降級寫入違規

代理：「我無法在此工作階段傳送給外部聯絡人
        因為我們存取了機密資料。

        -> 重設工作階段並傳送訊息
        -> 取消」
```

使用者存取了 Salesforce 資料（分類為 CONFIDENTIAL），這汙染了整個工作階段。當他們嘗試傳送訊息給外部聯絡人（有效分類 PUBLIC）時，策略層封鎖了輸出，因為 CONFIDENTIAL 資料無法流向 PUBLIC 目的地。

::: tip 代理傳給太太的訊息（「我今晚會晚一點」）本身不包含 Salesforce 資料。但工作階段已被先前的 Salesforce 存取汙染，而整個工作階段上下文——包括 LLM 可能從 Salesforce 回應中保留的任何內容——都可能影響輸出。禁止降級寫入規則防止這整類上下文洩漏。 :::

## 使用者看到什麼

當禁止降級寫入規則封鎖操作時，使用者收到清楚、可操作的訊息。Triggerfish 提供兩種回應模式：

**預設（具體）：**

```
我無法將機密資料傳送到公開通道。

-> 重設工作階段並傳送訊息
-> 取消
```

**教育性（透過配置選擇啟用）：**

```
我無法將機密資料傳送到公開通道。

原因：此工作階段存取了 Salesforce（CONFIDENTIAL）。
WhatsApp 個人版被分類為 PUBLIC。
資料只能流向相同或更高的分類等級。

選項：
  - 重設工作階段並傳送訊息
  - 請管理員重新分類 WhatsApp 通道
  - 了解更多：https://trigger.fish/security/no-write-down
```

在兩種情況下，使用者都獲得清楚的選項。他們永遠不會對發生了什麼或可以做什麼感到困惑。

## 工作階段重設

當使用者選擇「重設工作階段並傳送訊息」時，Triggerfish 執行**完全重設**：

1. 工作階段 taint 清除回 PUBLIC
2. 整個對話記錄被清除（防止上下文洩漏）
3. 然後對全新工作階段重新評估請求的操作
4. 如果操作現在被允許（PUBLIC 資料到 PUBLIC 通道），它繼續執行

::: warning 安全性 工作階段重設同時清除 taint **和**對話記錄。這不是可選的。如果只清除 taint 標籤而對話上下文保留，LLM 仍然可以引用先前訊息中的分類資訊，這會使重設失去意義。 :::

## 執行方式

禁止降級寫入規則在 `PRE_OUTPUT` hook 執行——資料離開系統之前的最後執行點。Hook 作為同步、確定性的程式碼執行：

```typescript
// Simplified enforcement logic
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

此程式碼是：

- **確定性的** —— 相同輸入始終產生相同決策
- **同步的** —— hook 在任何輸出傳送前完成
- **不可偽造的** —— LLM 無法影響 hook 的決策
- **有記錄的** —— 每次執行都以完整上下文記錄

## 工作階段 Taint 和提升

工作階段 taint 追蹤工作階段期間存取的最高分類等級。它遵循兩條嚴格規則：

1. **僅提升** —— taint 在工作階段內只能增加，永不降低
2. **自動的** —— taint 在資料進入工作階段時由 `POST_TOOL_RESPONSE` hook 更新

| 操作                            | 之前的 Taint   | 之後的 Taint             |
| ------------------------------- | -------------- | ------------------------ |
| 存取天氣 API（PUBLIC）          | PUBLIC         | PUBLIC                   |
| 存取內部 wiki（INTERNAL）       | PUBLIC         | INTERNAL                 |
| 存取 Salesforce（CONFIDENTIAL） | INTERNAL       | CONFIDENTIAL             |
| 再次存取天氣 API（PUBLIC）      | CONFIDENTIAL   | CONFIDENTIAL（不變）     |

一旦工作階段達到 CONFIDENTIAL，它保持 CONFIDENTIAL 直到使用者明確重設。沒有自動衰減、沒有逾時，LLM 也無法降低 taint。

## 為什麼此規則是固定的

禁止降級寫入規則不可配置，因為使其可配置會破壞整個安全模型。如果管理員可以建立例外——「允許 CONFIDENTIAL 資料流向 PUBLIC 通道用於這一個整合」——該例外就成為攻擊面。

Triggerfish 中的每個其他安全控制都建立在禁止降級寫入規則是絕對的假設之上。工作階段 taint、資料血統、代理委派上限和稽核日誌都依賴於它。使其可配置會需要重新思考整個架構。

::: info 管理員**可以**配置分配給通道、收件者和整合的分類等級。這是調整資料流的正確方式：如果通道應該接收更高分類的資料，將通道分類到更高等級。規則本身保持固定；規則的輸入是可配置的。 :::

## 相關頁面

- [安全優先設計](./) —— 安全架構概覽
- [身分與驗證](./identity) —— 通道身分如何建立
- [稽核與合規](./audit-logging) —— 封鎖的操作如何記錄
- [架構：Taint 和工作階段](/zh-TW/architecture/taint-and-sessions) —— 工作階段 taint 機制詳情
