# 疑難排解：LLM 供應商

## 常見供應商錯誤

### 401 Unauthorized / 403 Forbidden

您的 API 金鑰無效、已過期或沒有足夠的權限。

**修復方式：**

```bash
# 重新儲存 API 金鑰
triggerfish config set-secret provider:<name>:apiKey <your-key>

# 重新啟動 daemon
triggerfish stop && triggerfish start
```

各供應商注意事項：

| 供應商 | 金鑰格式 | 取得位置 |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

您已超過供應商的速率限制。Triggerfish 對大多數供應商不會自動在 429 時重試（Notion 除外，它有內建的退避機制）。

**修復方式：** 等待後重試。如果您持續遇到速率限制，請考慮：
- 升級您的 API 方案以取得更高的限額
- 新增備援供應商，當主要供應商被節流時請求可以降級處理
- 如果排程任務是原因，減少觸發器頻率

### 500 / 502 / 503 伺服器錯誤

供應商的伺服器出現問題。這些通常是暫時性的。

如果您設定了備援鏈，Triggerfish 會自動嘗試下一個供應商。如果沒有備援，錯誤會傳遞給使用者。

### 「No response body for streaming」

供應商接受了請求但為串流呼叫回傳了空的回應本體。這可能發生在：

- 供應商的基礎設施過載
- 代理或防火牆剝離了回應本體
- 模型暫時不可用

受影響的供應商：OpenRouter、Local（Ollama/LM Studio）、ZenMux、Z.AI、Fireworks。

---

## 供應商特定問題

### Anthropic

**工具格式轉換。** Triggerfish 在內部工具格式和 Anthropic 的原生工具格式之間進行轉換。如果您看到工具相關的錯誤，請檢查您的工具定義是否有有效的 JSON Schema。

**系統提示詞處理。** Anthropic 要求系統提示詞作為獨立欄位，而非訊息。此轉換是自動的，但如果您看到「system」訊息出現在對話中，表示訊息格式有問題。

### OpenAI

**頻率懲罰。** Triggerfish 對所有 OpenAI 請求套用 0.3 的頻率懲罰以減少重複輸出。這是硬編碼的，無法透過設定更改。

**圖片支援。** OpenAI 支援訊息內容中的 base64 編碼圖片。如果視覺功能不運作，請確認您設定了支援視覺的模型（例如 `gpt-4o`，而非 `gpt-4o-mini`）。

### Google Gemini

**查詢字串中的金鑰。** 與其他供應商不同，Google 使用 API 金鑰作為查詢參數而非標頭。這會自動處理，但這表示如果您透過企業代理路由，金鑰可能會出現在代理/存取日誌中。

### Ollama / LM Studio（本地）

**伺服器必須在執行中。** 本地供應商要求模型伺服器在 Triggerfish 啟動前就在執行。如果 Ollama 或 LM Studio 未在執行：

```
Local LLM request failed (connection refused)
```

**啟動伺服器：**

```bash
# Ollama
ollama serve

# LM Studio
# 開啟 LM Studio 並啟動本地伺服器
```

**模型未載入。** 使用 Ollama 時，模型必須先拉取：

```bash
ollama pull llama3.3:70b
```

**端點覆寫。** 如果您的本地伺服器不在預設連接埠上：

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama 預設
      # endpoint: "http://localhost:1234"  # LM Studio 預設
```

### Fireworks

**原生 API。** Triggerfish 使用 Fireworks 的原生 API，而非其 OpenAI 相容端點。模型 ID 可能與您在 OpenAI 相容文件中看到的不同。

**模型 ID 格式。** Fireworks 接受多種模型 ID 格式。精靈會正規化常見格式，但如果驗證失敗，請在 [Fireworks 模型庫](https://fireworks.ai/models)查閱確切的 ID。

### OpenRouter

**模型路由。** OpenRouter 將請求路由到各種供應商。來自底層供應商的錯誤會被包裝在 OpenRouter 的錯誤格式中。實際的錯誤訊息會被提取並顯示。

**API 錯誤格式。** OpenRouter 以 JSON 物件回傳錯誤。如果錯誤訊息看起來很籠統，原始錯誤會以 DEBUG 等級記錄。

### ZenMux / Z.AI

**串流支援。** 兩個供應商都支援串流。如果串流失敗：

```
ZenMux stream failed (status): error text
```

檢查您的 API 金鑰是否具有串流權限（某些 API 層級限制串流存取）。

---

## 備援切換

### 備援切換如何運作

當主要供應商失敗時，Triggerfish 會依序嘗試 `failover` 清單中的每個模型：

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

如果備援供應商成功，回應會記錄使用了哪個供應商。如果所有供應商都失敗，最後一個錯誤會回傳給使用者。

### 「All providers exhausted」

鏈中的每個供應商都失敗了。檢查：

1. 所有 API 金鑰是否有效？逐個測試每個供應商。
2. 所有供應商是否都在經歷停機？查看其狀態頁面。
3. 您的網路是否阻擋了對任何供應商端點的 HTTPS 連線？

### 備援切換設定

```yaml
models:
  failover_config:
    max_retries: 3          # 每個供應商在移至下一個之前的重試次數
    retry_delay_ms: 1000    # 重試之間的基礎延遲
    conditions:             # 哪些錯誤條件觸發備援切換
      - timeout
      - server_error
      - rate_limited
```

### 「Primary provider not found in registry」

`models.primary.provider` 中的供應商名稱與 `models.providers` 中任何已設定的供應商不匹配。請檢查拼寫。

### 「Classification model provider not configured」

您設定了一個 `classification_models` 覆寫，參照了 `models.providers` 中不存在的供應商：

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # 此供應商必須存在於 models.providers 中
      model: llama3.3:70b
  providers:
    # "local" 必須在此定義
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## 重試行為

Triggerfish 在暫時性錯誤（網路逾時、5xx 回應）時重試供應商請求。重試邏輯：

1. 在每次嘗試之間使用指數退避等待
2. 以 WARN 等級記錄每次重試嘗試
3. 對一個供應商的重試用盡後，移至備援鏈中的下一個
4. 串流連線對連線建立和串流中斷有獨立的重試邏輯

您可以在日誌中看到重試嘗試：

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
