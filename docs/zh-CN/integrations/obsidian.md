# Obsidian

将你的 Triggerfish 智能体连接到一个或多个 [Obsidian](https://obsidian.md/) 库，使其能够读取、创建和搜索你的笔记。该集成直接在文件系统上访问库——不需要 Obsidian 应用或插件。

## 功能

Obsidian 集成为你的智能体提供以下工具：

| 工具 | 描述 |
| ----------------- | ------------------------------------- |
| `obsidian_read` | 读取笔记的内容和 frontmatter |
| `obsidian_write` | 创建或更新笔记 |
| `obsidian_list` | 列出文件夹中的笔记 |
| `obsidian_search` | 搜索笔记内容 |
| `obsidian_daily` | 读取或创建今天的日记 |
| `obsidian_links` | 解析 wikilink 并查找反向链接 |
| `obsidian_delete` | 删除笔记 |

## 设置

### 步骤 1：连接你的库

```bash
triggerfish connect obsidian
```

这会提示你输入库路径并写入配置。你也可以手动配置。

### 步骤 2：在 triggerfish.yaml 中配置

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

| 选项 | 类型 | 必填 | 描述 |
| ----------------------- | -------- | -------- | ------------------------------------------------------ |
| `vaultPath` | string | 是 | Obsidian 库根目录的绝对路径 |
| `defaultClassification` | string | 否 | 笔记的默认分类（默认：`INTERNAL`） |
| `excludeFolders` | string[] | 否 | 要忽略的文件夹（默认：`.obsidian`、`.trash`） |
| `folderClassifications` | object | 否 | 将文件夹路径映射到分类级别 |

### 多个库

你可以连接多个具有不同分类级别的库：

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

## 基于文件夹的分类

笔记从其所在文件夹继承分类。最具体匹配的文件夹优先：

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

使用此配置：

- `Private/todo.md` 为 `CONFIDENTIAL`
- `Private/Health/records.md` 为 `RESTRICTED`
- `Work/project.md` 为 `INTERNAL`
- `notes.md`（库根目录）使用 `defaultClassification`

分类门控适用：智能体只能读取分类级别可以流向当前会话 taint 的笔记。`PUBLIC` taint 的会话无法访问 `CONFIDENTIAL` 笔记。

## 安全

### 路径限制

所有文件操作都限制在库根目录内。适配器使用 `Deno.realPath` 解析符号链接并防止路径遍历攻击。任何试图读取 `../../etc/passwd` 或类似路径的尝试在接触文件系统之前就会被阻止。

### 库验证

适配器在接受路径之前验证库根目录存在 `.obsidian/` 目录。这确保你指向的是一个实际的 Obsidian 库，而非任意目录。

### 分类执行

- 笔记从其文件夹映射中携带分类
- 读取 `CONFIDENTIAL` 笔记会将会话 taint 升级到 `CONFIDENTIAL`
- 禁止降级写入规则防止将分类内容写入较低分类的文件夹
- 所有笔记操作都通过标准策略 hook

## Wikilink

适配器理解 Obsidian 的 `[[wikilink]]` 语法。`obsidian_links` 工具将 wikilink 解析为实际文件路径，并查找所有链接到指定笔记的笔记（反向链接）。

## 日记

`obsidian_daily` 工具使用你的库的日记文件夹约定读取或创建今天的日记。如果笔记不存在，它会使用默认模板创建一个。

## Frontmatter

带有 YAML frontmatter 的笔记会被自动解析。读取笔记时，frontmatter 字段可作为元数据使用。适配器在写入或更新笔记时会保留 frontmatter。
