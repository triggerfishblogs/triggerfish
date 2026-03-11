# KB：重大變更

按版本列出升級時可能需要採取行動的變更。

## Notion：移除 `client_secret`

**Commit：** 6d876c3

作為安全加固措施，`client_secret` 欄位已從 Notion 整合配置中移除。Notion 現在僅使用儲存在作業系統金鑰鏈中的 OAuth 權杖。

**需要的動作：** 如果您的 `triggerfish.yaml` 有 `notion.client_secret` 欄位，請移除它。它會被忽略但可能造成混淆。

**新的設定流程：**

```bash
triggerfish connect notion
```

這會將整合權杖儲存在金鑰鏈中。不需要 client secret。

---

## 工具名稱：點號改為底線

**Commit：** 505a443

所有工具名稱從點號表示法（`foo.bar`）改為底線表示法（`foo_bar`）。某些 LLM 提供者不支援工具名稱中的點號，這導致了工具呼叫失敗。

**需要的動作：** 如果您有使用點號參考工具名稱的自訂策略規則或 skill 定義，請更新為底線：

```yaml
# 之前
- tool: notion.search

# 之後
- tool: notion_search
```

---

## Windows 安裝程式：Move-Item 改為 Copy-Item

**Commit：** 5e0370f

Windows PowerShell 安裝程式在升級期間的二進位檔替換從 `Move-Item -Force` 改為 `Copy-Item -Force`。`Move-Item` 在 Windows 上無法可靠地覆寫檔案。

**需要的動作：** 如果您是全新安裝則不需要。如果您使用較舊版本且 `triggerfish update` 在 Windows 上失敗，請在更新前手動停止服務：

```powershell
Stop-Service Triggerfish
# Then re-run the installer or triggerfish update
```

---

## 版本戳記：執行時改為建構時

**Commit：** e8b0c8c、eae3930、6ce0c25

版本資訊從執行時偵測（檢查 `deno.json`）改為從 git 標籤的建構時戳記。CLI 橫幅不再顯示硬編碼的版本字串。

**需要的動作：** 無。`triggerfish version` 繼續正常運作。開發建構顯示 `dev` 作為版本。

---

## Signal：JRE 21 改為 JRE 25

**Commit：** e5b1047

Signal 通道的自動安裝程式更新為下載 JRE 25（來自 Adoptium）而非 JRE 21。signal-cli 版本也固定為 v0.14.0。

**需要的動作：** 如果您有使用較舊 JRE 的現有 signal-cli 安裝，請重新執行 Signal 設定：

```bash
triggerfish config add-channel signal
```

這會下載更新的 JRE 和 signal-cli。

---

## 密鑰：明文改為加密

密鑰儲存格式從明文 JSON 改為 AES-256-GCM 加密 JSON。

**需要的動作：** 無。遷移是自動的。詳情請參閱[密鑰遷移](/zh-TW/support/kb/secrets-migration)。

遷移後，建議輪換您的密鑰，因為明文版本先前儲存在磁碟上。

---

## Tidepool：回呼改為 Canvas 協定

Tidepool（A2UI）介面從基於回呼的 `TidepoolTools` 介面遷移到基於 canvas 的協定。

**受影響的檔案：**
- `src/tools/tidepool/tools/tools_legacy.ts`（舊介面，為相容性保留）
- `src/tools/tidepool/tools/tools_canvas.ts`（新介面）

**需要的動作：** 如果您有使用舊 Tidepool 回呼介面的自訂 skill，它們將透過舊版橋接層繼續運作。新的 skill 應使用 canvas 協定。

---

## 配置：舊版 `primary` 字串格式

`models.primary` 欄位先前接受純字串（`"anthropic/claude-sonnet-4-20250514"`）。現在需要物件：

```yaml
# 舊版（為向後相容仍然接受）
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# 目前（推薦）
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**需要的動作：** 更新為物件格式。字串格式仍然會被解析，但可能在未來版本中移除。

---

## Console 日誌：已移除

**Commit：** 9ce1ce5

所有原始的 `console.log`、`console.warn` 和 `console.error` 呼叫已遷移到結構化日誌記錄器（`createLogger()`）。由於 Triggerfish 作為 daemon 執行，stdout/stderr 輸出對使用者不可見。所有日誌現在都通過檔案寫入器。

**需要的動作：** 無。如果您之前依賴 console 輸出進行除錯（例如管道 stdout），請改用 `triggerfish logs`。

---

## 評估影響

跨多個版本升級時，請檢查上述每個條目。大多數變更是向後相容的，具有自動遷移。唯一需要手動動作的變更是：

1. **Notion client_secret 移除**（從配置中移除該欄位）
2. **工具名稱格式變更**（更新自訂策略規則）
3. **Signal JRE 更新**（如果使用 Signal，重新執行 Signal 設定）

其他一切都自動處理。
