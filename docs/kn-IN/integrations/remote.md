# Remote Access

<ComingSoon />

Remote access ನಿಮ್ಮ local network ಹೊರಗಿನಿಂದ Triggerfish instance ತಲುಪಲು ಅನುವು
ಮಾಡುತ್ತದೆ. External services (GitHub, Stripe, ಇತ್ಯಾದಿ) ನಿಂದ webhook delivery ಗಾಗಿ
ಮತ್ತು ಮನೆಯಿಂದ ದೂರ ಇರುವಾಗ mobile devices ನಿಂದ agent ಪ್ರವೇಶಿಸಲು ಇದು ಅಗತ್ಯ.

## ಯೋಜಿತ Options

| Method               | ವಿವರಣೆ                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| **Tailscale Serve**  | Tailscale network ಮೂಲಕ gateway expose ಮಾಡಿ (private, encrypted)            |
| **Tailscale Funnel** | Specific paths (ಉದಾ., `/webhook/*`) public internet ಗೆ expose ಮಾಡಿ        |
| **Cloudflare Tunnel**| Cloudflare ನ network ಮೂಲಕ local instance ಗೆ route ಮಾಡಿ                    |
| **Reverse Proxy**    | nginx, Caddy, ಅಥವಾ ಇದೇ ರೀತಿಯ tool ಜೊತೆ manual setup                      |

## ಸಂರಚನೆ (ಯೋಜಿತ)

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

- Default ಆಗಿ Webhook endpoints ಮಾತ್ರ expose ಮಾಡಲ್ಪಡುತ್ತವೆ
- Authentication tokens OS keychain ನಲ್ಲಿ store ಮಾಡಲ್ಪಡುತ್ತವೆ
- ಎಲ್ಲ traffic transit ನಲ್ಲಿ encrypt ಮಾಡಲ್ಪಡುತ್ತದೆ
- Gateway WebSocket auth ಇಲ್ಲದೆ ಎಂದಿಗೂ public internet ಗೆ expose ಆಗುವುದಿಲ್ಲ
