# 程式碼庫探索

`explore` 工具讓代理快速、結構化地理解程式碼庫和目錄。代理不需要依序手動呼叫 `read_file`、`list_directory` 和 `search_files`，只需呼叫一次 `explore` 就能獲得由平行子代理產生的結構化報告。

## 工具

### `explore`

探索目錄或程式碼庫以理解結構、模式和慣例。唯讀。

| 參數    | 類型   | 必要 | 描述                                                              |
| ------- | ------ | ---- | ----------------------------------------------------------------- |
| `path`  | string | 是   | 要探索的目錄或檔案                                                |
| `focus` | string | 否   | 要尋找的內容（例如「auth patterns」、「test structure」）         |
| `depth` | string | 否   | 深入程度：`shallow`、`standard`（預設）或 `deep`                  |

## 深度等級

| 深度       | 產生的代理數 | 分析內容                                                |
| ---------- | ------------ | ------------------------------------------------------- |
| `shallow`  | 2            | 目錄樹 + 依賴清單                                       |
| `standard` | 3-4          | 樹 + 清單 + 程式碼模式 + 焦點（如果指定）              |
| `deep`     | 5-6          | 以上所有 + 匯入圖追蹤 + git 歷史                       |

## 運作方式

explore 工具產生平行子代理，每個專注於不同面向：

1. **樹代理** —— 映射目錄結構（3 層深），依慣例識別關鍵檔案（`mod.ts`、`main.ts`、`deno.json`、`README.md` 等）
2. **清單代理** —— 讀取依賴檔案（`deno.json`、`package.json`、`tsconfig.json`），列出依賴、腳本和進入點
3. **模式代理** —— 取樣原始碼檔案以偵測編碼模式：模組結構、錯誤處理、型別慣例、匯入風格、命名、測試
4. **焦點代理** —— 搜尋與焦點查詢相關的檔案和模式
5. **匯入代理**（僅深度模式）—— 從進入點追蹤匯入圖，偵測循環依賴
6. **Git 代理**（僅深度模式）—— 分析最近的提交、目前分支、未提交的變更

所有代理同時執行。結果組裝成結構化的 `ExploreResult`：

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## 代理何時使用它

代理被指示在以下情況使用 `explore`：

- 在修改不熟悉的程式碼之前
- 當被問到「這個做什麼」或「這是如何結構的」
- 在涉及現有程式碼的任何非簡單任務開始時
- 當它需要找到正確的檔案或要遵循的模式時

探索後，代理在撰寫新程式碼時參照它找到的模式和慣例，確保與現有程式碼庫的一致性。

## 範例

```
# 目錄的快速概覽
explore({ path: "src/auth" })

# 針對特定模式的焦點搜尋
explore({ path: "src/auth", focus: "how tokens are validated" })

# 包含 git 歷史和匯入圖的深度分析
explore({ path: "src/core", depth: "deep" })

# 在撰寫測試前理解測試慣例
explore({ path: "tests/", focus: "test patterns and assertions" })
```
