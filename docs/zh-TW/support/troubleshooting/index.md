# 疑難排解

遇到問題時從這裡開始。請依序執行以下步驟。

## 初步檢查

### 1. 檢查 daemon 是否正在執行

```bash
triggerfish status
```

如果 daemon 未在執行，請啟動它：

```bash
triggerfish start
```

### 2. 檢查日誌

```bash
triggerfish logs
```

此命令會即時追蹤日誌檔案。使用等級篩選器來過濾雜訊：

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. 執行診斷

```bash
triggerfish patrol
```

Patrol 會檢查 gateway 是否可達、LLM 供應商是否回應、頻道是否已連線、政策規則是否已載入，以及技能是否已被探索。任何標記為 `CRITICAL` 或 `WARNING` 的檢查項目會告訴您應聚焦之處。

### 4. 驗證設定

```bash
triggerfish config validate
```

此命令會解析 `triggerfish.yaml`、檢查必要欄位、驗證分級等級並解析密鑰參照。

## 依領域疑難排解

如果以上初步檢查未能指出問題，請選擇符合您症狀的領域：

- [安裝](/zh-TW/support/troubleshooting/installation) - 安裝腳本失敗、從原始碼建置問題、平台問題
- [Daemon](/zh-TW/support/troubleshooting/daemon) - 服務無法啟動、連接埠衝突、「already running」錯誤
- [設定](/zh-TW/support/troubleshooting/configuration) - YAML 解析錯誤、缺少欄位、密鑰解析失敗
- [頻道](/zh-TW/support/troubleshooting/channels) - 機器人無回應、身分驗證失敗、訊息傳遞問題
- [LLM 供應商](/zh-TW/support/troubleshooting/providers) - API 錯誤、找不到模型、串流失敗
- [整合](/zh-TW/support/troubleshooting/integrations) - Google OAuth、GitHub PAT、Notion API、CalDAV、MCP 伺服器
- [瀏覽器自動化](/zh-TW/support/troubleshooting/browser) - 找不到 Chrome、啟動失敗、導覽遭阻擋
- [安全性與分級](/zh-TW/support/troubleshooting/security) - Write-down 阻擋、taint 問題、SSRF、政策拒絕
- [密鑰與憑證](/zh-TW/support/troubleshooting/secrets) - 鑰匙圈錯誤、加密檔案儲存、權限問題

## 仍然無法解決？

如果以上指南都未能解決您的問題：

1. 收集[日誌包](/zh-TW/support/guides/collecting-logs)
2. 閱讀[提交 Issue 指南](/zh-TW/support/guides/filing-issues)
3. 在 [GitHub](https://github.com/greghavens/triggerfish/issues/new) 上開啟 Issue
