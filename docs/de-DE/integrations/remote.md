# Fernzugriff

<ComingSoon />

Der Fernzugriff ermoeglicht es Ihnen, Ihre Triggerfish-Instanz von ausserhalb Ihres lokalen Netzwerks zu erreichen. Dies ist erforderlich fuer Webhook-Zustellung von externen Diensten (GitHub, Stripe usw.) und fuer den Zugriff auf Ihren Agenten von mobilen Geraeten, wenn Sie nicht zu Hause sind.

## Geplante Optionen

| Methode             | Beschreibung                                                               |
| ------------------- | -------------------------------------------------------------------------- |
| **Tailscale Serve** | Gateway ueber Ihr Tailscale-Netzwerk bereitstellen (privat, verschluesselt) |
| **Tailscale Funnel** | Bestimmte Pfade (z.B. `/webhook/*`) dem oeffentlichen Internet zugaenglich machen |
| **Cloudflare Tunnel** | Routing ueber Cloudflares Netzwerk zu Ihrer lokalen Instanz              |
| **Reverse Proxy**   | Manuelle Einrichtung mit nginx, Caddy oder aehnlichem                      |

## Konfiguration (geplant)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth-Token im Betriebssystem-Schluesselbund gespeichert
```

## Sicherheit

- Webhook-Endpunkte sind die einzigen standardmaessig bereitgestellten Pfade
- Authentifizierungs-Tokens werden im Betriebssystem-Schluesselbund gespeichert
- Aller Verkehr ist waehrend der Uebertragung verschluesselt
- Das Gateway-WebSocket wird niemals ohne Authentifizierung dem oeffentlichen Internet ausgesetzt
