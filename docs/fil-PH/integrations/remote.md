# Remote Access

<ComingSoon />

Pinapayagan ka ng remote access na ma-reach ang iyong Triggerfish instance mula sa labas ng iyong local network. Kinakailangan ito para sa webhook delivery mula sa external services (GitHub, Stripe, etc.) at para sa pag-access ng iyong agent mula sa mobile devices kapag wala ka sa bahay.

## Mga Planong Option

| Method              | Paglalarawan                                                           |
| ------------------- | ---------------------------------------------------------------------- |
| **Tailscale Serve** | I-expose ang gateway sa iyong Tailscale network (private, encrypted)   |
| **Tailscale Funnel** | I-expose ang specific paths (hal., `/webhook/*`) sa public internet   |
| **Cloudflare Tunnel** | I-route sa pamamagitan ng network ng Cloudflare sa iyong local instance |
| **Reverse Proxy**   | Manual setup gamit ang nginx, Caddy, o katulad                         |

## Configuration (Planado)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth token na naka-store sa OS keychain
```

## Security

- Ang webhook endpoints lang ang mga paths na naka-expose bilang default
- Ang authentication tokens ay naka-store sa OS keychain
- Lahat ng traffic ay encrypted in transit
- Hindi kailanman ine-expose ang Gateway WebSocket sa public internet nang walang auth
