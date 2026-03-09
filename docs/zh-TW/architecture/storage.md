# 儲存

Triggerfish 中所有有狀態的資料都通過統一的 `StorageProvider` 抽象層。沒有模組建立自己的儲存機制——每個需要持久化的組件都以 `StorageProvider` 作為依賴。這種設計使後端可以在不觸及業務邏輯的情況下替換，並保持所有測試快速且確定性。

## StorageProvider 介面

```typescript
interface StorageProvider {
  /** 根據鍵擷取值。找不到時回傳 null。 */
  get(key: string): Promise<StorageValue | null>;

  /** 在鍵上儲存值。覆蓋任何現有值。 */
  set(key: string, value: StorageValue): Promise<void>;

  /** 刪除鍵。如果鍵不存在則為無操作。 */
  delete(key: string): Promise<void>;

  /** 列出所有匹配可選前綴的鍵。 */
  list(prefix?: string): Promise<string[]>;

  /** 刪除所有鍵。謹慎使用。 */
  clear(): Promise<void>;
}
```

::: info `StorageValue` 是字串。所有結構化資料（工作階段、血統記錄、配置）在儲存前序列化為 JSON，讀取時反序列化。這使介面保持簡單且不依賴後端。 :::

## 實作

| 後端                    | 用途                      | 持久性                                             | 配置                          |
| ----------------------- | ------------------------- | -------------------------------------------------- | ----------------------------- |
| `MemoryStorageProvider` | 測試、臨時工作階段        | 無（重啟時遺失）                                   | 不需要配置                    |
| `SqliteStorageProvider` | 個人版預設                | `~/.triggerfish/data/triggerfish.db` 的 SQLite WAL  | 零配置                        |
| 企業後端                | 企業版                    | 客戶管理                                           | Postgres、S3 或其他後端       |

### MemoryStorageProvider

用於所有測試以保證速度和確定性。資料僅存在於記憶體中，程序結束時遺失。每個測試套件建立一個全新的 `MemoryStorageProvider`，確保測試隔離且可重現。

### SqliteStorageProvider

個人版部署的預設值。使用 WAL（Write-Ahead Logging）模式的 SQLite，支援並發讀取和崩潰安全。資料庫位於：

```
~/.triggerfish/data/triggerfish.db
```

SQLite 不需要配置、伺服器程序或網路。單一檔案儲存所有 Triggerfish 狀態。`@db/sqlite` Deno 套件提供綁定，需要 `--allow-ffi` 權限。

::: tip SQLite WAL 模式允許多個讀取者並發存取資料庫，同時只有一個寫入者。這對 Gateway 很重要，因為它可能在代理寫入工具結果時讀取工作階段狀態。 :::

### 企業後端

企業部署可以在不更改程式碼的情況下接入外部儲存後端（Postgres、S3 等）。任何 `StorageProvider` 介面的實作都可以使用。後端在 `triggerfish.yaml` 中配置。

## 命名空間化的鍵

儲存系統中的所有鍵都以識別資料類型的前綴命名空間化。這防止衝突，並使按類別查詢、保留和清除資料成為可能。

| 命名空間         | 鍵模式                                       | 描述                                           |
| ---------------- | -------------------------------------------- | ---------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | 工作階段狀態（對話記錄、中繼資料）             |
| `taint:`         | `taint:sess_abc123`                          | 工作階段 taint 等級                            |
| `lineage:`       | `lineage:lin_789xyz`                         | 資料血統記錄（來源追蹤）                       |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | 稽核日誌條目                                   |
| `cron:`          | `cron:job_daily_report`                      | 排程任務狀態和執行記錄                         |
| `notifications:` | `notifications:notif_456`                    | 通知佇列                                       |
| `exec:`          | `exec:run_789`                               | 代理執行環境記錄                               |
| `skills:`        | `skills:skill_weather`                       | 已安裝的技能中繼資料                           |
| `config:`        | `config:v3`                                  | 配置快照                                       |

## 保留策略

每個命名空間都有預設的保留策略。企業部署可以自訂這些策略。

| 命名空間         | 預設保留                  | 理由                                       |
| ---------------- | ------------------------- | ------------------------------------------ |
| `sessions:`      | 30 天                     | 對話記錄會過期                             |
| `taint:`         | 與工作階段保留一致        | 沒有工作階段的 taint 沒有意義              |
| `lineage:`       | 90 天                     | 合規驅動，稽核追蹤                         |
| `audit:`         | 1 年                      | 合規驅動，法律和法規                       |
| `cron:`          | 30 天                     | 用於除錯的執行記錄                         |
| `notifications:` | 傳遞後 + 7 天             | 未傳遞的通知必須持久化                     |
| `exec:`          | 30 天                     | 用於除錯的執行成品                         |
| `skills:`        | 永久                      | 已安裝的技能中繼資料不應過期               |
| `config:`        | 10 個版本                 | 滾動配置記錄用於回滾                       |

## 設計原則

### 所有模組使用 StorageProvider

Triggerfish 中沒有模組建立自己的儲存機制。工作階段管理、taint 追蹤、血統記錄、稽核日誌、排程狀態、通知佇列、執行記錄和配置——全部通過 `StorageProvider`。

這表示：

- 替換後端只需更改一個依賴注入點
- 測試使用 `MemoryStorageProvider` 以保證速度——不需要 SQLite 設定，不需要檔案系統
- 實作靜態加密、備份或複製只有一個地方

### 序列化

所有結構化資料在儲存前序列化為 JSON 字串。序列化/反序列化層處理：

- `Date` 物件（透過 `toISOString()` 序列化為 ISO 8601 字串，透過 `new Date()` 反序列化）
- 品牌類型（序列化為其底層字串值）
- 巢狀物件和陣列

```typescript
// 儲存工作階段
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// 擷取工作階段
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // 恢復 Date
}
```

### 不可變性

工作階段操作是不可變的。讀取工作階段、修改它並寫回始終產生一個新物件。函式永遠不會就地變更已儲存的物件。這與 Triggerfish 更廣泛的原則一致：函式回傳新物件且永不變更。

## 目錄結構

```
~/.triggerfish/
  config/          # 代理配置、SPINE.md、TRIGGER.md
  data/            # triggerfish.db（SQLite）
  workspace/       # 代理執行環境
    <agent-id>/    # 每代理工作區（持久化）
    background/    # 背景工作階段工作區
  skills/          # 已安裝的技能
  logs/            # 稽核日誌
  secrets/         # 加密的憑證儲存
```

::: warning 安全性 `secrets/` 目錄包含由作業系統金鑰鏈整合管理的加密憑證。永遠不要在設定檔或 `StorageProvider` 中儲存密鑰。使用作業系統金鑰鏈（個人版）或 Vault 整合（企業版）。 :::
