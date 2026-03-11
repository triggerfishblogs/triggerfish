# 如何提交好的 Issue

結構良好的 Issue 能更快獲得解決。一個模糊且沒有日誌和重現步驟的 Issue 通常會擱置數週，因為沒有人能對其採取行動。以下是應該包含的內容。

## 提交之前

1. **搜尋現有 Issue。** 可能已有人回報過相同的問題。查看[開放的 Issue](https://github.com/greghavens/triggerfish/issues) 和[已關閉的 Issue](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed)。

2. **查閱疑難排解指南。** [疑難排解區段](/zh-TW/support/troubleshooting/)涵蓋了大多數常見問題。

3. **查閱已知問題。** [已知問題](/zh-TW/support/kb/known-issues)頁面列出了我們已知的問題。

4. **嘗試最新版本。** 如果您不是使用最新版本，請先更新：
   ```bash
   triggerfish update
   ```

## 應包含的內容

### 1. 環境

```
Triggerfish 版本：（執行 `triggerfish version`）
作業系統：（例如 macOS 15.2、Ubuntu 24.04、Windows 11、Docker）
架構：（x64 或 arm64）
安裝方式：（二進位安裝程式、從原始碼、Docker）
```

### 2. 重現步驟

寫出導致問題的確切操作順序。請具體說明：

**不好的範例：**
> 機器人停止運作了。

**好的範例：**
> 1. 使用已設定 Telegram 頻道的方式啟動 Triggerfish
> 2. 在與機器人的私訊中傳送「check my calendar for tomorrow」
> 3. 機器人回應了行事曆結果
> 4. 傳送「now email those results to alice@example.com」
> 5. 預期：機器人傳送電子郵件
> 6. 實際：機器人回應「Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL」

### 3. 預期行為與實際行為

說明您預期會發生什麼以及實際發生了什麼。如果有確切的錯誤訊息，請包含它。直接複製貼上比改述更好。

### 4. 日誌輸出

附上[日誌包](/zh-TW/support/guides/collecting-logs)：

```bash
triggerfish logs bundle
```

如果 Issue 涉及安全敏感內容，您可以遮蔽部分，但請在 Issue 中註明您遮蔽了什麼。

至少貼上相關的日誌行。包含時間戳記以便我們可以關聯事件。

### 5. 設定（已遮蔽）

貼上 `triggerfish.yaml` 的相關區段。**務必遮蔽密鑰。** 將實際值替換為佔位符：

```yaml
# 良好 - 密鑰已遮蔽
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # 儲存在鑰匙圈中
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol 輸出

```bash
triggerfish patrol
```

貼上輸出。這讓我們可以快速了解系統健康狀況。

## Issue 類型

### Bug 報告

對於故障問題使用此範本：

```markdown
## Bug 報告

**環境：**
- 版本：
- 作業系統：
- 安裝方式：

**重現步驟：**
1.
2.
3.

**預期行為：**

**實際行為：**

**錯誤訊息（如有）：**

**Patrol 輸出：**

**相關設定（已遮蔽）：**

**日誌包：**（附加檔案）
```

### 功能請求

```markdown
## 功能請求

**問題：** 您想做什麼是目前無法做到的？

**建議方案：** 您認為它應該如何運作？

**考慮過的替代方案：** 您還嘗試了什麼？
```

### 問題 / 支援請求

如果您不確定某件事是 Bug 還是只是卡住了，請使用 [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) 而非 Issues。Discussions 更適合可能沒有單一正確答案的問題。

## 不應包含什麼

- **原始 API 金鑰或密碼。** 務必遮蔽。
- **對話中的個人資料。** 遮蔽姓名、電子郵件、電話號碼。
- **整個日誌檔案的內容。** 請以檔案形式附加日誌包，而非貼上數千行。

## 提交之後

- **關注後續問題。** 維護者可能需要更多資訊。
- **測試修復。** 如果推送了修復，您可能會被要求驗證。
- **關閉 Issue**（如果您自己找到了解決方案）。發布解決方案以便他人受益。
