# 收集日誌

提交 Bug 報告時，日誌包可讓維護者在不需要反覆詢問細節的情況下取得診斷問題所需的資訊。

## 快速建立日誌包

建立日誌包最快的方式：

```bash
triggerfish logs bundle
```

此命令建立一個包含 `~/.triggerfish/logs/` 中所有日誌檔案的封存：

- **Linux/macOS：** `triggerfish-logs.tar.gz`
- **Windows：** `triggerfish-logs.zip`

如果封存因任何原因失敗，會退回到將原始日誌檔案複製到一個目錄，您可以手動壓縮。

## 日誌包包含什麼

- `triggerfish.log`（目前的日誌檔案）
- `triggerfish.1.log` 到 `triggerfish.10.log`（輪替備份，如果存在）

日誌包**不**包含：
- 您的 `triggerfish.yaml` 設定檔
- 密鑰或憑證
- SQLite 資料庫
- SPINE.md 或 TRIGGER.md

## 手動收集日誌

如果日誌包命令不可用（舊版本、Docker 等）：

```bash
# 找到日誌檔案
ls ~/.triggerfish/logs/

# 手動建立封存
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## 增加日誌詳細程度

預設情況下，日誌為 INFO 等級。要為 Bug 報告擷取更多細節：

1. 將日誌等級設定為 verbose 或 debug：
   ```bash
   triggerfish config set logging.level verbose
   # 或取得最大細節：
   triggerfish config set logging.level debug
   ```

2. 重現問題

3. 收集日誌包：
   ```bash
   triggerfish logs bundle
   ```

4. 將等級設回 normal：
   ```bash
   triggerfish config set logging.level normal
   ```

### 日誌等級詳細說明

| 等級 | 擷取的內容 |
|-------|-----------------|
| `quiet` | 僅錯誤 |
| `normal` | 錯誤、警告、資訊（預設） |
| `verbose` | 增加除錯訊息（工具呼叫、供應商互動、分級決策） |
| `debug` | 所有內容，包含追蹤等級訊息（原始協定資料、內部狀態變更） |

**警告：** `debug` 等級會產生大量輸出。僅在主動重現問題時使用，然後切換回來。

## 即時篩選日誌

在重現問題時，您可以篩選即時日誌串流：

```bash
# 僅顯示錯誤
triggerfish logs --level ERROR

# 顯示警告及以上
triggerfish logs --level WARN
```

在 Linux/macOS 上使用原生的 `tail -f` 加篩選。在 Windows 上使用 PowerShell 的 `Get-Content -Wait -Tail`。

## 日誌格式

每行日誌遵循以下格式：

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **時間戳記：** UTC 的 ISO 8601 格式
- **等級：** ERROR、WARN、INFO、DEBUG 或 TRACE
- **元件：** 產生日誌的模組（例如 `gateway`、`anthropic`、`telegram`、`policy`）
- **訊息：** 包含結構化上下文的日誌訊息

## Bug 報告中應包含什麼

除了日誌包，還應包含：

1. **重現步驟。** 問題發生時您正在做什麼？
2. **預期行為。** 應該發生什麼？
3. **實際行為。** 實際發生了什麼？
4. **平台資訊。** 作業系統、架構、Triggerfish 版本（`triggerfish version`）
5. **設定摘錄。** 您 `triggerfish.yaml` 的相關區段（遮蔽密鑰）

完整檢查清單請參閱[提交 Issue](/zh-TW/support/guides/filing-issues)。

## 日誌中的敏感資訊

Triggerfish 透過將值包裝在 `<<` 和 `>>` 分隔符中來清理日誌中的外部資料。API 金鑰和 Token 不應出現在日誌輸出中。但在提交日誌包之前：

1. 掃描任何您不想分享的內容（電子郵件地址、檔案路徑、訊息內容）
2. 必要時進行遮蔽
3. 在您的 Issue 中註明日誌包已被遮蔽

日誌檔案包含您對話中的訊息內容。如果您的對話包含敏感資訊，請在分享之前遮蔽那些部分。
