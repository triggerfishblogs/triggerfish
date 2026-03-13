# Fjärråtkomst

<ComingSoon />

Fjärråtkomst låter dig nå din Triggerfish-instans utanför ditt lokala nätverk. Det krävs för webhook-leverans från externa tjänster (GitHub, Stripe osv.) och för att komma åt din agent från mobila enheter när du är hemifrån.

## Planerade alternativ

| Metod                | Beskrivning                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| **Tailscale Serve**  | Exponera gatewayen över ditt Tailscale-nätverk (privat, krypterat)        |
| **Tailscale Funnel** | Exponera specifika sökvägar (t.ex. `/webhook/*`) till det offentliga internet |
| **Cloudflare Tunnel**| Dirigera via Cloudflares nätverk till din lokala instans                  |
| **Omvänd proxy**     | Manuell installation med nginx, Caddy eller liknande                      |

## Konfiguration (planerad)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth-token lagrad i OS-nyckelring
```

## Säkerhet

- Webhook-slutpunkter är de enda sökvägar som exponeras som standard
- Autentiseringstokens lagras i OS-nyckelringen
- All trafik är krypterad under transport
- Gateway WebSocket exponeras aldrig till det offentliga internet utan autentisering
