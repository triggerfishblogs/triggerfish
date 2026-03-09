# 远程访问

<ComingSoon />

远程访问让你能够从本地网络外部访问你的 Triggerfish 实例。这对于接收来自外部服务（GitHub、Stripe 等）的 webhook 投递以及在外出时从移动设备访问智能体是必需的。

## 计划选项

| 方法 | 描述 |
| ------------------ | ------------------------------------------------------------------- |
| **Tailscale Serve** | 通过你的 Tailscale 网络暴露 Gateway（私密、加密） |
| **Tailscale Funnel** | 将特定路径（如 `/webhook/*`）暴露到公共互联网 |
| **Cloudflare Tunnel** | 通过 Cloudflare 的网络路由到你的本地实例 |
| **反向代理** | 使用 nginx、Caddy 或类似工具手动设置 |

## 配置（计划中）

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth token stored in OS keychain
```

## 安全

- 默认只暴露 webhook 端点
- 认证令牌存储在操作系统钥匙串中
- 所有流量在传输中加密
- Gateway WebSocket 在没有认证的情况下永远不会暴露到公共互联网
