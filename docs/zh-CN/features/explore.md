# 代码库探索

`explore` 工具让智能体快速、结构化地理解代码库和目录。智能体无需依次手动调用 `read_file`、`list_directory` 和 `search_files`，只需调用一次 `explore`，即可获得由并行子智能体生成的结构化报告。

## 工具

### `explore`

探索目录或代码库以理解结构、模式和约定。只读操作。

| 参数 | 类型 | 必需 | 描述 |
| --------- | ------ | -------- | --------------------------------------------------------- |
| `path` | string | 是 | 要探索的目录或文件 |
| `focus` | string | 否 | 要查找的内容（例如"认证模式"、"测试结构"） |
| `depth` | string | 否 | 深度级别：`shallow`、`standard`（默认）或 `deep` |

## 深度级别

| 深度 | 生成的智能体数 | 分析内容 |
| ---------- | -------------- | ------------------------------------------------------- |
| `shallow` | 2 | 目录树 + 依赖清单 |
| `standard` | 3-4 | 树 + 清单 + 代码模式 + 焦点（如指定） |
| `deep` | 5-6 | 以上全部 + 导入图追踪 + git 历史 |

## 工作原理

explore 工具生成并行子智能体，每个专注于不同方面：

1. **树智能体** —— 映射目录结构（3 层深度），通过约定识别关键文件（`mod.ts`、`main.ts`、`deno.json`、`README.md` 等）
2. **清单智能体** —— 读取依赖文件（`deno.json`、`package.json`、`tsconfig.json`），列出依赖项、脚本和入口点
3. **模式智能体** —— 采样源文件以检测编码模式：模块结构、错误处理、类型约定、导入风格、命名、测试
4. **焦点智能体** —— 搜索与焦点查询相关的文件和模式
5. **导入智能体**（仅 deep） —— 从入口点追踪导入图，检测循环依赖
6. **Git 智能体**（仅 deep） —— 分析最近提交、当前分支、未提交的更改

所有智能体并发运行。结果被组装成结构化的 `ExploreResult`：

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

## 智能体何时使用它

智能体在以下情况下被指示使用 `explore`：

- 修改不熟悉的代码之前
- 当被问到"这是做什么的"或"这是如何组织的"
- 在涉及现有代码的任何非平凡任务开始时
- 当需要找到正确的文件或要遵循的模式时

探索之后，智能体在编写新代码时参考它发现的模式和约定，确保与现有代码库的一致性。

## 示例

```
# 快速了解目录
explore({ path: "src/auth" })

# 针对特定模式的焦点搜索
explore({ path: "src/auth", focus: "how tokens are validated" })

# 包括 git 历史和导入图的深度分析
explore({ path: "src/core", depth: "deep" })

# 在编写测试前理解测试约定
explore({ path: "tests/", focus: "test patterns and assertions" })
```
