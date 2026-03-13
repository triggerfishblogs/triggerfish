# Remote Access

<ComingSoon />

Remote access آپ کو اپنے local network سے باہر Triggerfish instance تک پہنچنے
دیتا ہے۔ یہ external services (GitHub، Stripe، وغیرہ) سے webhook delivery اور گھر
سے دور ہونے پر mobile devices سے اپنے ایجنٹ تک رسائی کے لیے ضروری ہے۔

## منصوبہ بند Options

| طریقہ               | تفصیل                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| **Tailscale Serve** | Gateway کو اپنے Tailscale network پر expose کریں (private، encrypted)      |
| **Tailscale Funnel** | مخصوص paths (مثلاً، `/webhook/*`) public internet پر expose کریں          |
| **Cloudflare Tunnel** | Cloudflare کے network کے ذریعے اپنے local instance تک route کریں        |
| **Reverse Proxy**   | nginx، Caddy، یا اس جیسے کے ساتھ manual setup                             |

## Configuration (منصوبہ بند)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth token OS keychain میں محفوظ
```

## Security

- Webhook endpoints ڈیفالٹ طور پر expose ہونے والے واحد paths ہیں
- Authentication tokens OS keychain میں محفوظ ہوتے ہیں
- تمام traffic transit میں encrypted ہوتا ہے
- Gateway WebSocket کبھی بھی auth کے بغیر public internet پر expose نہیں ہوتا
