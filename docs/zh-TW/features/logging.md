# 結構化日誌

Triggerfish 使用結構化日誌，具有嚴重性等級、檔案輪換和可配置的輸出。每個元件——Gateway、協調器、MCP 客戶端、LLM 供應商、策略引擎——都透過統一的日誌器記錄。這表示無論事件源自何處，您都能獲得單一、一致的日誌串流。

## 日誌等級

`logging.level` 設定控制擷取多少細節：

| 配置值             | 嚴重性             | 記錄的內容                                            |
| ------------------ | ------------------ | ----------------------------------------------------- |
| `quiet`            | 僅 ERROR           | 崩潰和關鍵故障                                        |
| `normal`（預設）   | INFO 及以上        | 啟動、連接、重要事件                                  |
| `verbose`          | DEBUG 及以上       | 工具呼叫、策略決策、供應商請求                        |
| `debug`            | TRACE（全部）      | 完整請求/回應載荷、token 級串流                       |

每個等級包含其上方的所有等級。設定 `verbose` 會給您 DEBUG、INFO 和 ERROR。設定 `quiet` 會抑制除錯誤以外的所有內容。

## 配置

在 `triggerfish.yaml` 中設定日誌等級：

```yaml
logging:
  level: normal
```

這是唯一需要的配置。預設值對大多數使用者來說是合理的——`normal` 擷取足夠的資訊來了解代理正在做什麼，而不會用雜訊淹沒日誌。

## 日誌輸出

日誌同時寫入兩個目的地：

- **stderr** —— 當作為 systemd 服務執行時用於 `journalctl` 擷取，或開發期間的直接終端輸出
- **檔案** —— `~/.triggerfish/logs/triggerfish.log`

每行日誌遵循結構化格式：

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### 元件標籤

方括號中的標籤識別發出日誌條目的子系統：

| 標籤          | 元件                                     |
| ------------- | ---------------------------------------- |
| `[gateway]`   | WebSocket 控制平面                       |
| `[orch]`      | 代理協調器和工具派發                     |
| `[mcp]`       | MCP 客戶端和 Gateway 代理               |
| `[provider]`  | LLM 供應商呼叫                           |
| `[policy]`    | 策略引擎和 hook 評估                     |
| `[session]`   | 工作階段生命週期和 taint 變更            |
| `[channel]`   | 通道適配器（Telegram、Slack 等）         |
| `[scheduler]` | 排程任務、觸發器、webhook                |
| `[memory]`    | 記憶儲存操作                             |
| `[browser]`   | 瀏覽器自動化（CDP）                      |

## 檔案輪換

日誌檔案會自動輪換以防止磁碟使用量無限增長：

- **輪換閾值：** 每個檔案 1 MB
- **保留檔案：** 10 個輪換檔案（總共最多約 10 MB）
- **輪換檢查：** 每次寫入時
- **命名：** `triggerfish.1.log`、`triggerfish.2.log`、...、`triggerfish.10.log`

當 `triggerfish.log` 達到 1 MB 時，它被重新命名為 `triggerfish.1.log`，先前的 `triggerfish.1.log` 變為 `triggerfish.2.log`，依此類推。最舊的檔案（`triggerfish.10.log`）被刪除。

## 發射後不管的寫入

檔案寫入是非阻塞的。日誌器永遠不會延遲請求處理以等待磁碟寫入完成。如果寫入失敗——磁碟已滿、權限錯誤、檔案鎖定——錯誤會被靜默吞下。

這是有意的。日誌永遠不應該導致應用程式崩潰或減慢代理速度。stderr 輸出在檔案寫入失敗時作為備援。

## 日誌讀取工具

`log_read` 工具讓代理直接存取結構化日誌歷史。代理可以讀取最近的日誌條目、按元件標籤或嚴重性過濾，並在不離開對話的情況下診斷問題。

| 參數        | 類型   | 必要 | 描述                                                                  |
| ----------- | ------ | ---- | --------------------------------------------------------------------- |
| `lines`     | number | 否   | 要回傳的最近日誌行數（預設：100）                                     |
| `level`     | string | 否   | 最低嚴重性過濾器（`error`、`warn`、`info`、`debug`）                  |
| `component` | string | 否   | 按元件標籤過濾（例如 `gateway`、`orch`、`provider`）                  |

::: tip 問您的代理「今天發生了什麼錯誤」或「顯示最近的 gateway 日誌」——`log_read` 工具處理過濾和擷取。 :::

## 檢視日誌

### CLI 指令

```bash
# 檢視最近的日誌
triggerfish logs

# 即時串流
triggerfish logs --tail

# 直接檔案存取
cat ~/.triggerfish/logs/triggerfish.log
```

### 使用 journalctl

當 Triggerfish 作為 systemd 服務執行時，日誌也被 journal 擷取：

```bash
journalctl --user -u triggerfish -f
```

## 除錯與結構化日誌

::: info `TRIGGERFISH_DEBUG=1` 環境變數仍然支援以保持向後相容，但建議使用 `logging.level: debug` 配置。兩者產生相同的輸出——所有請求/回應載荷和內部狀態的完整 TRACE 級日誌。 :::

## 相關

- [CLI 指令](/zh-TW/guide/commands) —— `triggerfish logs` 指令參考
- [配置](/zh-TW/guide/configuration) —— 完整的 `triggerfish.yaml` 架構
