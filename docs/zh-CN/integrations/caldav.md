# CalDAV 集成

将你的 Triggerfish 智能体连接到任何兼容 CalDAV 的日历服务器。这支持在所有支持 CalDAV 标准的供应商上进行日历操作，包括 iCloud、Fastmail、Nextcloud、Radicale 和任何自托管的 CalDAV 服务器。

## 支持的供应商

| 供应商 | CalDAV URL | 备注 |
| ---------- | ----------------------------------------------- | --------------------------- |
| iCloud | `https://caldav.icloud.com` | 需要应用专用密码 |
| Fastmail | `https://caldav.fastmail.com/dav/calendars` | 标准 CalDAV |
| Nextcloud | `https://your-server.com/remote.php/dav` | 自托管 |
| Radicale | `https://your-server.com` | 轻量级自托管 |
| Baikal | `https://your-server.com/dav.php` | 自托管 |

::: info 对于 Google 日历，请改用 [Google Workspace](/zh-CN/integrations/google-workspace) 集成，它使用原生 Google API 和 OAuth2。CalDAV 适用于非 Google 的日历供应商。 :::

## 设置

### 步骤 1：获取你的 CalDAV 凭证

你需要从日历供应商获取三条信息：

- **CalDAV URL** -- CalDAV 服务器的基础 URL
- **用户名** -- 你的账户用户名或电子邮件
- **密码** -- 你的账户密码或应用专用密码

::: warning 应用专用密码 大多数供应商要求使用应用专用密码而非主账户密码。请查阅供应商的文档了解如何生成。 :::

### 步骤 2：配置 Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password stored in OS keychain
    classification: CONFIDENTIAL
```

| 选项 | 类型 | 必填 | 描述 |
| ---------------- | ------ | -------- | --------------------------------------------------- |
| `url` | string | 是 | CalDAV 服务器基础 URL |
| `username` | string | 是 | 账户用户名或电子邮件 |
| `password` | string | 是 | 账户密码（存储在操作系统钥匙串中） |
| `classification` | string | 否 | 分类级别（默认：`CONFIDENTIAL`） |

### 步骤 3：日历发现

首次连接时，智能体运行 CalDAV 发现以查找所有可用日历。发现的日历会缓存在本地。

```bash
triggerfish connect caldav
```

## 可用工具

| 工具 | 描述 |
| ------------------- | ---------------------------------------------------- |
| `caldav_list` | 列出账户上的所有日历 |
| `caldav_events` | 从一个或所有日历获取指定日期范围的事件 |
| `caldav_create` | 创建新的日历事件 |
| `caldav_update` | 更新现有事件 |
| `caldav_delete` | 删除事件 |
| `caldav_search` | 按文本查询搜索事件 |
| `caldav_freebusy` | 检查指定时间范围的空闲/忙碌状态 |

## 分类

日历数据默认为 `CONFIDENTIAL`，因为它包含姓名、日程、地点和会议详情。访问任何 CalDAV 工具会将会话 taint 升级到配置的分类级别。

## 认证

CalDAV 使用基于 TLS 的 HTTP Basic Auth。凭证存储在操作系统钥匙串中，在 HTTP 层注入，位于 LLM 上下文之下——智能体永远看不到原始密码。

## 相关页面

- [Google Workspace](/zh-CN/integrations/google-workspace) -- 用于 Google 日历（使用原生 API）
- [定时任务和触发器](/zh-CN/features/cron-and-triggers) -- 调度基于日历的智能体操作
- [分类指南](/zh-CN/guide/classification-guide) -- 选择正确的分类级别
