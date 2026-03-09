# 参考

本节提供配置和扩展 Triggerfish 的技术参考资料。

## [配置架构](./config-yaml)

`triggerfish.yaml` 完整参考——每个部分、每个键，附带注释示例。涵盖模型、渠道、分类、策略、MCP 服务器、调度器和通知。

## [关键接口](./interfaces)

面向构建集成、自定义渠道适配器、LLM 提供商或存储后端的开发者的 TypeScript 接口参考。包括 `StorageProvider`、`ChannelAdapter`、`LlmProvider`、`NotificationService`、hook 类型、会话状态和 `Result<T, E>` 模式。

## [术语表](./glossary)

每个 Triggerfish 专用术语的定义，从 Buoy 到降级写入。
