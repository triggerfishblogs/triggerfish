# Telegram

將您的 Triggerfish 代理連接到 Telegram，這樣您就可以在任何使用 Telegram 的裝置上與它互動。轉接器使用 [grammY](https://grammy.dev/) 框架與 Telegram Bot API 通訊。

## 設定

### 步驟 1：建立機器人

1. 開啟 Telegram 並搜尋 [@BotFather](https://t.me/BotFather)
2. 傳送 `/newbot`
3. 為您的機器人選擇一個顯示名稱（例如「My Triggerfish」）
4. 為您的機器人選擇一個使用者名稱（必須以 `bot` 結尾，例如 `my_triggerfish_bot`）
5. BotFather 會回覆您的 **bot token**——複製它

::: warning 保護您的 Token 您的 bot token 賦予對您機器人的完全控制權。切勿將其提交到版本控制或公開分享。Triggerfish 將其儲存在您的作業系統金鑰鏈中。 :::

### 步驟 2：取得您的 Telegram 使用者 ID

Triggerfish 需要您的數字使用者 ID 來驗證訊息是否來自您。Telegram 使用者名稱可以被更改，不適合用於身份驗證——數字 ID 是永久的且由 Telegram 的伺服器指定，因此無法被偽造。

1. 在 Telegram 上搜尋 [@getmyid_bot](https://t.me/getmyid_bot)
2. 向它傳送任何訊息
3. 它會回覆您的使用者 ID（一個類似 `8019881968` 的數字）

### 步驟 3：新增頻道

執行互動式設定：

```bash
triggerfish config add-channel telegram
```

這會提示您輸入 bot token、使用者 ID 和分類等級，然後將設定寫入 `triggerfish.yaml` 並提供重新啟動 daemon 的選項。

您也可以手動新增：

```yaml
channels:
  telegram:
    # botToken 儲存在作業系統金鑰鏈中
    ownerId: 8019881968
    classification: INTERNAL
```

| 選項             | 類型   | 必填 | 說明                                         |
| ---------------- | ------ | ---- | -------------------------------------------- |
| `botToken`       | string | 是   | 來自 @BotFather 的 Bot API token             |
| `ownerId`        | number | 是   | 您的 Telegram 數字使用者 ID                  |
| `classification` | string | 否   | 分類上限（預設：`INTERNAL`）                 |

### 步驟 4：開始聊天

Daemon 重新啟動後，在 Telegram 中開啟您的機器人並傳送 `/start`。機器人會向您打招呼以確認連線正常。之後您就可以直接與代理聊天了。

## 分類行為

`classification` 設定是一個**上限**——它控制可以通過此頻道流動的**擁有者**對話的最大資料敏感度。它不會統一套用到所有使用者。

**每條訊息的運作方式：**

- **您向機器人傳送訊息**（您的使用者 ID 與 `ownerId` 相符）：Session 使用頻道上限。使用預設的 `INTERNAL`，您的代理可以與您分享內部等級的資料。
- **其他人向機器人傳送訊息**：他們的 session 會自動被標記為 `PUBLIC` 汙染，無論頻道分類為何。禁止降級寫入規則防止任何內部資料到達他們的 session。

這意味著單一個 Telegram 機器人可以安全地處理擁有者和非擁有者的對話。身份驗證在 LLM 看到訊息之前就在程式碼中發生——LLM 無法影響它。

| 頻道分類         | 擁有者訊息       | 非擁有者訊息 |
| ---------------- | :--------------: | :----------: |
| `PUBLIC`         | PUBLIC           | PUBLIC       |
| `INTERNAL`（預設）| 最高至 INTERNAL  | PUBLIC       |
| `CONFIDENTIAL`   | 最高至 CONFIDENTIAL | PUBLIC    |
| `RESTRICTED`     | 最高至 RESTRICTED | PUBLIC      |

請參閱[分類系統](/architecture/classification)了解完整模型，以及 [Sessions 與汙染](/architecture/taint-and-sessions)了解汙染升級的運作方式。

## 擁有者身份

Triggerfish 透過比較發送者的 Telegram 數字使用者 ID 與已設定的 `ownerId` 來判斷擁有者身份。此檢查在 LLM 看到訊息**之前**就在程式碼中進行：

- **相符**——訊息被標記為擁有者，可以存取直到頻道分類上限的資料
- **不相符**——訊息被標記為 `PUBLIC` 汙染，禁止降級寫入規則防止任何分類資料流向該 session

::: danger 務必設定您的擁有者 ID 若未設定 `ownerId`，Triggerfish 會將**所有**發送者視為擁有者。任何找到您機器人的人都可以存取您的資料，直到頻道的分類等級。這就是為什麼在設定過程中此欄位是必填的。 :::

## 訊息分塊

Telegram 有 4,096 字元的訊息限制。當您的代理產生超過此長度的回應時，Triggerfish 會自動將其分割成多條訊息。分塊器在換行或空格處分割以保持可讀性——避免將單字或句子切成兩半。

## 支援的訊息類型

Telegram 轉接器目前處理：

- **文字訊息**——完整的傳送和接收支援
- **長回應**——自動分塊以符合 Telegram 的限制

## 輸入指示器

當您的代理正在處理請求時，機器人會在 Telegram 聊天中顯示「正在輸入...」。指示器在 LLM 生成回應時持續運作，並在回覆傳送後清除。

## 變更分類

要提高或降低分類上限：

```bash
triggerfish config add-channel telegram
# 提示時選擇覆蓋現有設定
```

或直接編輯 `triggerfish.yaml`：

```yaml
channels:
  telegram:
    # botToken 儲存在作業系統金鑰鏈中
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

有效等級：`PUBLIC`、`INTERNAL`、`CONFIDENTIAL`、`RESTRICTED`。

變更後重新啟動 daemon：`triggerfish stop && triggerfish start`
