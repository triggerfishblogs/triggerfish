# Obsidian

將您的 Triggerfish 代理連接到一個或多個 [Obsidian](https://obsidian.md/) 知識庫，讓它可以讀取、建立和搜尋您的筆記。此整合直接在檔案系統上存取知識庫——不需要 Obsidian 應用程式或 plugin。

## 功能

Obsidian 整合為您的代理提供以下工具：

| 工具              | 描述                              |
| ----------------- | --------------------------------- |
| `obsidian_read`   | 讀取筆記的內容和 frontmatter      |
| `obsidian_write`  | 建立或更新筆記                    |
| `obsidian_list`   | 列出資料夾中的筆記                |
| `obsidian_search` | 搜尋筆記內容                      |
| `obsidian_daily`  | 讀取或建立今天的每日筆記          |
| `obsidian_links`  | 解析 wikilink 和尋找反向連結      |
| `obsidian_delete` | 刪除筆記                          |

## 設定

### 步驟 1：連接您的知識庫

```bash
triggerfish connect obsidian
```

這會提示您輸入知識庫路徑並寫入設定。您也可以手動配置。

### 步驟 2：在 triggerfish.yaml 中配置

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/MainVault
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Private/Health": CONFIDENTIAL
        "Private/Finance": RESTRICTED
        "Work": INTERNAL
        "Public": PUBLIC
```

| 選項                    | 類型     | 必填 | 描述                                                   |
| ----------------------- | -------- | ---- | ------------------------------------------------------ |
| `vaultPath`             | string   | 是   | Obsidian 知識庫根目錄的絕對路徑                        |
| `defaultClassification` | string   | 否   | 筆記的預設分類（預設：`INTERNAL`）                     |
| `excludeFolders`        | string[] | 否   | 要忽略的資料夾（預設：`.obsidian`、`.trash`）          |
| `folderClassifications` | object   | 否   | 將資料夾路徑對應到分類等級                             |

### 多個知識庫

您可以連接多個具有不同分類等級的知識庫：

```yaml
obsidian:
  vaults:
    personal:
      vaultPath: ~/Obsidian/Personal
      defaultClassification: CONFIDENTIAL
    work:
      vaultPath: ~/Obsidian/Work
      defaultClassification: INTERNAL
    public:
      vaultPath: ~/Obsidian/PublicNotes
      defaultClassification: PUBLIC
```

## 基於資料夾的分類

筆記從其資料夾繼承分類。最具體的匹配資料夾優先：

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

使用此配置：

- `Private/todo.md` 為 `CONFIDENTIAL`
- `Private/Health/records.md` 為 `RESTRICTED`
- `Work/project.md` 為 `INTERNAL`
- `notes.md`（知識庫根目錄）使用 `defaultClassification`

分類閘控適用：代理只能讀取其分類等級可以流向目前工作階段 taint 的筆記。`PUBLIC` taint 的工作階段無法存取 `CONFIDENTIAL` 筆記。

## 安全性

### 路徑限制

所有檔案操作都限制在知識庫根目錄內。adapter 使用 `Deno.realPath` 解析符號連結並防止路徑遍歷攻擊。任何嘗試讀取 `../../etc/passwd` 或類似路徑的操作在接觸檔案系統之前就被封鎖。

### 知識庫驗證

adapter 在接受路徑之前驗證知識庫根目錄是否存在 `.obsidian/` 目錄。這確保您指向的是實際的 Obsidian 知識庫，而非任意目錄。

### 分類執行

- 筆記從其資料夾對應攜帶分類
- 讀取 `CONFIDENTIAL` 筆記會將工作階段 taint 提升到 `CONFIDENTIAL`
- 禁止降級寫入規則防止將分類內容寫入較低分類的資料夾
- 所有筆記操作都通過標準策略 hook

## Wikilink

adapter 理解 Obsidian 的 `[[wikilink]]` 語法。`obsidian_links` 工具將 wikilink 解析為實際檔案路徑，並找到所有連結回特定筆記的筆記（反向連結）。

## 每日筆記

`obsidian_daily` 工具使用您的知識庫每日筆記資料夾慣例讀取或建立今天的每日筆記。如果筆記不存在，它會使用預設範本建立一個。

## Frontmatter

具有 YAML frontmatter 的筆記會自動解析。讀取筆記時，frontmatter 欄位可作為中繼資料使用。adapter 在寫入或更新筆記時保留 frontmatter。
