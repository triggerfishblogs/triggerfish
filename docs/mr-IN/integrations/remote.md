# Remote Access

<ComingSoon />

Remote access तुम्हाला तुमच्या local network च्या बाहेरून तुमच्या Triggerfish
instance ला reach करण्याची परवानगी देतो. External services (GitHub, Stripe, इ.)
कडून webhook delivery साठी आणि घरापासून दूर असताना mobile devices वरून तुमच्या
एजंटला access करण्यासाठी हे आवश्यक आहे.

## Planned Options

| Method               | वर्णन                                                                |
| -------------------- | -------------------------------------------------------------------- |
| **Tailscale Serve**  | Gateway तुमच्या Tailscale network वर expose करा (private, encrypted) |
| **Tailscale Funnel** | Specific paths (उदा. `/webhook/*`) public internet ला expose करा     |
| **Cloudflare Tunnel** | Cloudflare च्या network द्वारे तुमच्या local instance ला route करा  |
| **Reverse Proxy**    | nginx, Caddy, किंवा similar सह Manual setup                          |

## Configuration (Planned)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth token OS keychain मध्ये stored
```

## Security

- Webhook endpoints default वर exposed असलेले फक्त paths आहेत
- Authentication tokens OS keychain मध्ये stored आहेत
- सर्व traffic transit मध्ये encrypted आहे
- Gateway WebSocket auth शिवाय public internet ला कधीही exposed नाही
