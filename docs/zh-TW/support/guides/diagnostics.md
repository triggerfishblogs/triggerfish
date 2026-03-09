# 執行診斷

Triggerfish 有兩個內建的診斷工具：`patrol`（外部健康檢查）和 `healthcheck` 工具（內部系統探測）。

## Patrol

Patrol 是一個 CLI 命令，檢查核心系統是否正常運作：

```bash
triggerfish patrol
```

### 檢查項目

| 檢查 | 狀態 | 意義 |
|-------|--------|---------|
| Gateway 執行中 | 如果停機則為 CRITICAL | WebSocket 控制平面沒有回應 |
| LLM 已連線 | 如果停機則為 CRITICAL | 無法連線到主要 LLM 供應商 |
| 頻道已啟用 | 如果為 0 則為 WARNING | 沒有頻道介面卡已連線 |
| 政策規則已載入 | 如果為 0 則為 WARNING | 沒有政策規則被載入 |
| 技能已安裝 | 如果為 0 則為 WARNING | 沒有技能被發現 |

### 整體狀態

- **HEALTHY** - 所有檢查通過
- **WARNING** - 某些非關鍵性檢查被標記（例如沒有安裝技能）
- **CRITICAL** - 至少一個關鍵性檢查失敗（gateway 或 LLM 不可達）

### 何時使用 patrol

- 安裝後，驗證一切是否正常運作
- 設定變更後，確認 daemon 已正確重新啟動
- 機器人停止回應時，縮小哪個元件失敗的範圍
- 提交 Bug 報告前，包含 patrol 輸出

### 輸出範例

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Healthcheck 工具

healthcheck 工具是一個內部 Agent 工具，從執行中的 gateway 內部探測系統元件。它在對話中可供 Agent 使用。

### 檢查項目

**供應商：**
- 預設供應商存在且可連線
- 回傳供應商名稱

**儲存：**
- 往返測試：寫入一個鍵、讀取回來、刪除它
- 驗證儲存層是否正常運作

**技能：**
- 按來源（內建、已安裝、工作區）計算已發現的技能數

**設定：**
- 基本設定驗證

### 狀態等級

每個元件回報以下之一：
- `healthy` - 完全正常運作
- `degraded` - 部分運作（某些功能可能不運作）
- `error` - 元件故障

### 分級要求

healthcheck 工具需要最低 INTERNAL 分級，因為它揭露系統內部資訊（供應商名稱、技能數、儲存狀態）。PUBLIC 工作階段無法使用它。

### 使用 healthcheck

詢問您的 Agent：

> 執行一次健康檢查

或直接使用工具：

```
tool: healthcheck
```

回應是一份結構化報告：

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## 合併使用診斷工具

進行完整的診斷：

1. **從 CLI 執行 patrol：**
   ```bash
   triggerfish patrol
   ```

2. **檢查日誌**中的最近錯誤：
   ```bash
   triggerfish logs --level ERROR
   ```

3. **要求 Agent** 執行 healthcheck（如果 Agent 有回應）：
   > 執行一次系統健康檢查並告訴我任何問題

4. **收集日誌包**（如果需要提交 Issue）：
   ```bash
   triggerfish logs bundle
   ```

---

## 啟動診斷

如果 daemon 根本無法啟動，請依序檢查：

1. **設定檔存在且有效：**
   ```bash
   triggerfish config validate
   ```

2. **密鑰可以被解析：**
   ```bash
   triggerfish config get-secret --list
   ```

3. **沒有連接埠衝突：**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **沒有其他實例在執行：**
   ```bash
   triggerfish status
   ```

5. **檢查系統日誌（Linux）：**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **檢查 launchd（macOS）：**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **檢查 Windows 事件日誌（Windows）：**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
