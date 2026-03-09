# Webhook

Triggerfish 可以接受來自外部服務的入站事件，實現對電子郵件、錯誤警報、CI/CD 事件、行事曆變更等的即時反應。Webhook 將您的代理從被動的問答系統轉變為工作流程中的主動參與者。

## Webhook 如何運作

外部服務向 Triggerfish gateway 上註冊的 webhook 端點傳送 HTTP POST 請求。每個入站事件都經過真實性驗證、分類，並路由到代理進行處理。

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook 管線：外部服務傳送 HTTP POST，通過 HMAC 驗證、分類、工作階段隔離和策略 hook 到代理處理" style="max-width: 100%;" />

## 支援的事件來源

Triggerfish 可以從任何支援 HTTP webhook 交付的服務接收 webhook。常見的整合包括：

| 來源     | 機制                       | 範例事件                              |
| -------- | -------------------------- | ------------------------------------- |
| Gmail    | Pub/Sub 推送通知           | 新電子郵件、標籤變更                  |
| GitHub   | Webhook                    | PR 開啟、issue 留言、CI 失敗          |
| Sentry   | Webhook                    | 錯誤警報、迴歸偵測                    |
| Stripe   | Webhook                    | 收到付款、訂閱變更                    |
| Calendar | 輪詢或推送                 | 事件提醒、衝突偵測                    |
| 自訂     | 通用 webhook 端點          | 任何 JSON 酬載                        |

## 配置

Webhook 端點在 `triggerfish.yaml` 中配置：

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret stored in OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret stored in OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### 配置欄位

| 欄位              | 必填 | 描述                                                     |
| ----------------- | :--: | -------------------------------------------------------- |
| `id`              |  是  | 此 webhook 端點的唯一識別碼                              |
| `path`            |  是  | 端點註冊的 URL 路徑                                      |
| `secret`          |  是  | 用於 HMAC 簽名驗證的共享密鑰                             |
| `classification`  |  是  | 分配給來自此來源事件的分類等級                           |
| `actions`         |  是  | 事件到任務的對應清單                                     |
| `actions[].event` |  是  | 要匹配的事件類型模式                                     |
| `actions[].task`  |  是  | 代理要執行的自然語言任務                                 |

::: tip Webhook 密鑰儲存在作業系統金鑰鏈中。執行 `triggerfish dive` 或互動式配置 webhook 以安全地輸入它們。 :::

## HMAC 簽名驗證

每個入站 webhook 請求在酬載處理之前都會使用 HMAC 簽名驗證進行真實性驗證。

### 驗證如何運作

1. 外部服務傳送帶有簽名標頭的 webhook（例如，GitHub 使用 `X-Hub-Signature-256`）
2. Triggerfish 使用配置的共享密鑰計算請求主體的 HMAC
3. 將計算的簽名與請求標頭中的簽名比較
4. 如果簽名不匹配，請求立即被**拒絕**
5. 如果驗證通過，酬載繼續進行分類和處理

<img src="/diagrams/hmac-verification.svg" alt="HMAC 驗證流程：檢查簽名存在、計算 HMAC、比較簽名、拒絕或繼續" style="max-width: 100%;" />

::: warning 安全性 沒有有效 HMAC 簽名的 webhook 請求在任何處理之前就被拒絕。這防止偽造事件觸發代理動作。永遠不要在生產環境中停用簽名驗證。 :::

## 事件處理管線

一旦 webhook 事件通過簽名驗證，它會流經標準安全管線：

### 1. 分類

事件酬載按 webhook 端點配置的等級分類。配置為 `CONFIDENTIAL` 的 webhook 端點產生 `CONFIDENTIAL` 事件。

### 2. 工作階段隔離

每個 webhook 事件產生自己的隔離工作階段。這表示：

- 事件獨立於任何進行中的對話處理
- 工作階段 taint 從全新開始（在 webhook 的分類等級）
- webhook 觸發的工作階段和使用者工作階段之間不會洩漏資料
- 每個工作階段有自己的 taint 追蹤和血統

### 3. PRE_CONTEXT_INJECTION Hook

事件酬載在進入代理上下文之前通過 `PRE_CONTEXT_INJECTION` hook。此 hook：

- 驗證酬載結構
- 對所有資料欄位應用分類
- 為入站資料建立血統記錄
- 掃描字串欄位中的注入模式
- 如果策略規則指定，可以封鎖事件

### 4. 代理處理

代理接收分類後的事件並執行配置的任務。任務是自然語言指令——代理使用其全部能力（工具、skill、瀏覽器、exec 環境）在策略約束內完成。

### 5. 輸出交付

代理的任何輸出（訊息、通知、動作）都通過 `PRE_OUTPUT` hook。禁止降級寫入規則適用：來自 `CONFIDENTIAL` webhook 觸發工作階段的輸出無法傳送到 `PUBLIC` 通道。

### 6. 稽核

完整的事件生命週期被記錄：接收、驗證、分類、工作階段建立、代理動作和輸出決策。

## 與排程器整合

Webhook 自然地與 Triggerfish 的 [cron 和觸發器系統](/zh-TW/features/cron-and-triggers) 整合。webhook 事件可以：

- **提前觸發現有 cron 工作**（例如，部署 webhook 觸發立即的健康檢查）
- **建立新的排程任務**（例如，行事曆 webhook 排程提醒）
- **更新觸發器優先順序**（例如，Sentry 警報使代理在下次觸發器喚醒時優先調查錯誤）

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Agent may use cron.create to schedule follow-up checks
```

## 安全摘要

| 控制                    | 描述                                                                    |
| ----------------------- | ----------------------------------------------------------------------- |
| HMAC 驗證               | 所有入站 webhook 在處理前驗證                                           |
| 分類                    | Webhook 酬載按配置的等級分類                                            |
| 工作階段隔離            | 每個事件獲得自己的隔離工作階段                                          |
| `PRE_CONTEXT_INJECTION` | 酬載在進入上下文前掃描和分類                                            |
| 禁止降級寫入            | 來自高分類事件的輸出無法到達低分類通道                                  |
| 稽核日誌                | 記錄完整的事件生命週期                                                  |
| 非公開暴露              | Webhook 端點預設不暴露到公開網際網路                                    |

## 範例：GitHub PR 審查循環

webhook 實際運作的真實世界範例：代理開啟 PR，然後 GitHub webhook 事件驅動程式碼審查回饋循環，無需任何輪詢。

### 如何運作

1. 代理建立功能分支、提交程式碼，並透過 `gh pr create` 開啟 PR
2. 代理將追蹤檔案寫入 `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`，包含分支名稱、PR 編號和任務上下文
3. 代理停止並等待——不進行輪詢

當審查者發布回饋時：

4. GitHub 傳送 `pull_request_review` webhook 到 Triggerfish
5. Triggerfish 驗證 HMAC 簽名、分類事件，並產生隔離工作階段
6. 代理讀取追蹤檔案恢復上下文、簽出分支、處理審查、提交、推送，並在 PR 上留言
7. 步驟 4-6 重複直到審查被核准

當 PR 被合併時：

8. GitHub 傳送 `pull_request.closed` webhook，帶有 `merged: true`
9. 代理清理：刪除本地分支、歸檔追蹤檔案

### 配置

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

GitHub webhook 必須傳送：`Pull requests`、`Pull request reviews`、`Pull request review comments` 和 `Issue comments`。

請參閱完整的 [GitHub 整合](/zh-TW/integrations/github) 指南了解設定說明，以及 `git-branch-management` 內建 skill 了解完整的代理工作流程。

### 企業控制

- **Webhook 允許清單**由管理員管理——只有核准的外部來源可以註冊端點
- 每個端點的**速率限制**以防止濫用
- **酬載大小限制**以防止記憶體耗盡
- **IP 允許清單**用於額外的來源驗證
- webhook 事件日誌的**保留策略**

::: info Webhook 端點預設不暴露到公開網際網路。要讓外部服務到達您的 Triggerfish 實例，您需要配置連接埠轉發、反向代理或隧道。文件的[遠端存取](/zh-TW/reference/)部分涵蓋安全暴露選項。 :::
