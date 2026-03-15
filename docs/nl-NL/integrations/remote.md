# Externe toegang

<ComingSoon />

Met externe toegang kunt u uw Triggerfish-instantie bereiken van buiten uw lokale netwerk. Dit is vereist voor webhook-levering van externe services (GitHub, Stripe, enz.) en voor toegang tot uw agent vanaf mobiele apparaten wanneer u weg van huis bent.

## Geplande opties

| Methode               | Beschrijving                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| **Tailscale Serve**   | De gateway blootstellen via uw Tailscale-netwerk (privé, versleuteld)     |
| **Tailscale Funnel**  | Specifieke paden (bijv. `/webhook/*`) blootstellen aan het publieke internet |
| **Cloudflare Tunnel** | Routeren via het netwerk van Cloudflare naar uw lokale instantie          |
| **Reverse Proxy**     | Handmatige configuratie met nginx, Caddy of vergelijkbaar                 |

## Configuratie (gepland)

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

## Beveiliging

- Webhook-eindpunten zijn de enige standaard blootgestelde paden
- Authenticatietokens worden opgeslagen in de OS-sleutelhanger
- Al het verkeer is versleuteld tijdens transport
- De gateway WebSocket wordt nooit blootgesteld aan het publieke internet zonder authenticatie
