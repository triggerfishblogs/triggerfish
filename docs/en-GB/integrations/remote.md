# Remote Access

<ComingSoon />

Remote access lets you reach your Triggerfish instance from outside your local
network. This is required for webhook delivery from external services (GitHub,
Stripe, etc.) and for accessing your agent from mobile devices when away from
home.

## Planned Options

| Method             | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| **Tailscale Serve** | Expose the gateway over your Tailscale network (private, encrypted) |
| **Tailscale Funnel** | Expose specific paths (e.g., `/webhook/*`) to the public internet  |
| **Cloudflare Tunnel** | Route through Cloudflare's network to your local instance         |
| **Reverse Proxy**   | Manual setup with nginx, Caddy, or similar                         |

## Configuration (Planned)

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

## Security

- Webhook endpoints are the only paths exposed by default
- Authentication tokens are stored in the OS keychain
- All traffic is encrypted in transit
- The gateway WebSocket is never exposed to the public internet without auth
