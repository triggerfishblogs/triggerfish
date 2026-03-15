# Remote Access

<ComingSoon />

Remote access உங்கள் local network வெளியே உங்கள் Triggerfish instance ஐ reach செய்ய அனுமதிக்கிறது. External services (GitHub, Stripe, போன்றவை) இலிருந்து webhook delivery க்கும் வீட்டில் இல்லாத நேரத்தில் mobile devices இலிருந்து உங்கள் agent access செய்வதற்கும் இது தேவை.

## Planned Options

| Method               | விளக்கம்                                                                    |
| -------------------- | ----------------------------------------------------------------------------- |
| **Tailscale Serve**  | Tailscale network மூலம் gateway expose செய்யவும் (private, encrypted)       |
| **Tailscale Funnel** | Specific paths (உதா., `/webhook/*`) ஐ public internet க்கு expose செய்யவும் |
| **Cloudflare Tunnel** | Cloudflare இன் network மூலம் local instance க்கு route செய்யவும்          |
| **Reverse Proxy**    | nginx, Caddy, அல்லது similar உடன் Manual setup                              |

## Configuration (Planned)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth token OS keychain இல் stored
```

## Security

- Webhook endpoints மட்டுமே default ஆக exposed
- Authentication tokens OS keychain இல் stored
- அனைத்து traffic உம் transit இல் encrypted
- Gateway WebSocket auth இல்லாமல் public internet க்கு ஒருபோதும் exposed ஆவதில்லை
