# 遠端存取

<ComingSoon />

遠端存取讓您可以從區域網路外部存取您的 Triggerfish 實例。這是從外部服務（GitHub、Stripe 等）接收 webhook 交付以及在離開家時從行動裝置存取代理所必需的。

## 計畫選項

| 方式                | 描述                                                                |
| ------------------- | ------------------------------------------------------------------- |
| **Tailscale Serve** | 透過您的 Tailscale 網路暴露 gateway（私有、加密）                   |
| **Tailscale Funnel**| 將特定路徑（例如 `/webhook/*`）暴露到公開網際網路                   |
| **Cloudflare Tunnel** | 透過 Cloudflare 的網路路由到您的本地實例                          |
| **反向代理**        | 使用 nginx、Caddy 或類似工具手動設定                                |

## 配置（計畫中）

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

## 安全性

- 預設只暴露 webhook 端點
- 驗證權杖儲存在作業系統金鑰鏈中
- 所有流量在傳輸中加密
- Gateway WebSocket 在沒有驗證的情況下永遠不會暴露到公開網際網路
