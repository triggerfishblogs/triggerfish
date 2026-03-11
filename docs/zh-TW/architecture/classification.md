# 分類系統

資料分類系統是 Triggerfish 安全模型的基礎。進入、在系統中移動或離開系統的每一條資料都帶有分類標籤。這些標籤決定資料可以流向何處——更重要的是，不能流向何處。

## 分類等級

Triggerfish 對所有部署使用單一的四層有序階層。

| 等級           | 排名          | 描述                                     | 範例                                                      |
| -------------- | ------------- | ---------------------------------------- | --------------------------------------------------------- |
| `RESTRICTED`   | 4（最高）     | 需要最高保護的最敏感資料                 | 併購文件、董事會材料、PII、銀行帳戶、醫療記錄             |
| `CONFIDENTIAL` | 3             | 業務敏感或個人敏感資訊                   | CRM 資料、財務、人資記錄、合約、稅務記錄                  |
| `INTERNAL`     | 2             | 不適合對外分享                           | 內部 wiki、團隊文件、個人筆記、聯絡人                     |
| `PUBLIC`       | 1（最低）     | 任何人都可以看到                         | 行銷材料、公開文件、一般網頁內容                          |

## 禁止降級寫入規則

Triggerfish 中最重要的安全不變量：

::: danger 資料只能流向**相同或更高**分類等級的通道或收件者。這是一個**固定規則**——無法被配置、覆蓋或停用。LLM 無法影響此決策。 :::

<img src="/diagrams/classification-hierarchy.svg" alt="分類階層：PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED。資料僅向上流動。" style="max-width: 100%;" />

這表示：

- 包含 `CONFIDENTIAL` 資料的回應無法傳送到 `PUBLIC` 通道
- 被標記為 `RESTRICTED` 的工作階段無法輸出到任何低於 `RESTRICTED` 的通道
- 沒有管理員覆蓋，沒有企業逃生機制，也沒有 LLM 繞過方法

## 有效分類

通道和收件者都帶有分類等級。當資料即將離開系統時，目的地的**有效分類**決定可以傳送什麼：

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

有效分類是兩者中_較低_的那個。這表示高分類通道配合低分類收件者仍被視為低分類。

| 通道           | 收件者     | 有效           | 能接收 CONFIDENTIAL 資料嗎？ |
| -------------- | ---------- | -------------- | ---------------------------- |
| `INTERNAL`     | `INTERNAL` | `INTERNAL`     | 否（CONFIDENTIAL > INTERNAL）|
| `INTERNAL`     | `EXTERNAL` | `PUBLIC`       | 否                           |
| `CONFIDENTIAL` | `INTERNAL` | `INTERNAL`     | 否（CONFIDENTIAL > INTERNAL）|
| `CONFIDENTIAL` | `EXTERNAL` | `PUBLIC`       | 否                           |
| `RESTRICTED`   | `INTERNAL` | `INTERNAL`     | 否（CONFIDENTIAL > INTERNAL）|

## 通道分類規則

每種通道類型都有特定的規則來決定其分類等級。

### 電子郵件

- **域名配對**：`@company.com` 的郵件被分類為 `INTERNAL`
- 管理員配置哪些域名是內部的
- 未知或外部域名預設為 `EXTERNAL`
- 外部收件者會將有效分類降低到 `PUBLIC`

### Slack / Teams

- **工作區成員資格**：同一工作區/租戶的成員為 `INTERNAL`
- Slack Connect 外部使用者被分類為 `EXTERNAL`
- 訪客使用者被分類為 `EXTERNAL`
- 分類根據平台 API 而非 LLM 解讀得出

### WhatsApp / Telegram / iMessage

- **企業版**：電話號碼與 HR 目錄同步配對以判定內部或外部
- **個人版**：所有收件者預設為 `EXTERNAL`
- 使用者可以標記受信任的聯絡人，但這不會改變分類數學——它改變的是收件者分類

### WebChat

- WebChat 訪客始終被分類為 `PUBLIC`（訪客永遠不被驗證為擁有者）
- WebChat 用於面向公眾的互動

### CLI

- CLI 通道在本機執行，根據已驗證的使用者進行分類
- 直接終端存取通常為 `INTERNAL` 或更高

## 收件者分類來源

### 企業版

- **目錄同步**（Okta、Azure AD、Google Workspace）自動填充收件者分類
- 所有目錄成員被分類為 `INTERNAL`
- 外部訪客和供應商被分類為 `EXTERNAL`
- 管理員可以按聯絡人或域名覆蓋

### 個人版

- **預設**：所有收件者為 `EXTERNAL`
- 使用者透過對話中的提示或配套應用程式重新分類受信任的聯絡人
- 重新分類是明確且有記錄的

## 通道狀態

每個通道在能夠傳輸資料之前都會經過一個狀態機：

<img src="/diagrams/state-machine.svg" alt="通道狀態機：UNTRUSTED → CLASSIFIED 或 BLOCKED" style="max-width: 100%;" />

| 狀態         | 能接收資料嗎？  | 能將資料傳送到代理上下文嗎？ | 描述                                              |
| ------------ | :-------------: | :--------------------------: | ------------------------------------------------- |
| `UNTRUSTED`  |       否        |              否              | 新的/未知通道的預設值。完全隔離。                 |
| `CLASSIFIED` | 是（在策略內）  |      是（帶有分類等級）      | 已審查並分配分類等級。                            |
| `BLOCKED`    |       否        |              否              | 被管理員或使用者明確禁止。                        |

::: warning 安全性 新通道始終處於 `UNTRUSTED` 狀態。它們不能從代理接收任何資料，也不能將資料傳送到代理上下文中。通道保持完全隔離，直到管理員（企業版）或使用者（個人版）明確分類它。 :::

## 分類如何與其他系統互動

分類不是一個獨立的功能——它驅動整個平台的決策：

| 系統             | 分類的使用方式                                             |
| ---------------- | ---------------------------------------------------------- |
| **工作階段 taint** | 存取分類資料會將工作階段提升到該等級                     |
| **策略 hook**    | PRE_OUTPUT 比較工作階段 taint 與目的地分類                 |
| **MCP Gateway**  | MCP 伺服器回應攜帶會汙染工作階段的分類                     |
| **資料血統**     | 每個血統記錄都包含分類等級和原因                           |
| **通知**         | 通知內容受相同分類規則約束                                 |
| **代理委派**     | 被呼叫代理的分類上限必須符合呼叫者的 taint                |
| **Plugin 沙盒**  | Plugin SDK 自動分類所有發出的資料                          |
