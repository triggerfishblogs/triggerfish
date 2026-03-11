# Remote Access

<ComingSoon />

Remote access आपको अपने स्थानीय network के बाहर से अपने Triggerfish instance तक
पहुँचने देता है। यह बाहरी सेवाओं (GitHub, Stripe, आदि) से webhook delivery के
लिए और घर से दूर होने पर मोबाइल उपकरणों से अपने agent तक पहुँचने के लिए
आवश्यक है।

## नियोजित विकल्प

| Method             | विवरण                                                               |
| ------------------ | ------------------------------------------------------------------- |
| **Tailscale Serve** | Gateway को अपने Tailscale network पर expose करें (निजी, encrypted)   |
| **Tailscale Funnel** | विशिष्ट paths (जैसे `/webhook/*`) को public internet पर expose करें |
| **Cloudflare Tunnel** | Cloudflare के network के माध्यम से अपने स्थानीय instance तक route करें |
| **Reverse Proxy**   | nginx, Caddy, या similar के साथ मैन्युअल सेटअप                       |

## कॉन्फ़िगरेशन (नियोजित)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth token OS keychain में संग्रहीत
```

## सुरक्षा

- डिफ़ॉल्ट रूप से केवल webhook endpoints expose होते हैं
- Authentication tokens OS keychain में संग्रहीत हैं
- सभी traffic transit में encrypted है
- Gateway WebSocket कभी भी auth के बिना public internet पर expose नहीं होता
