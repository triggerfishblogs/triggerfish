# Ekstern tilgang

<ComingSoon />

Ekstern tilgang lar deg nå Triggerfish-instansen din fra utenfor det lokale nettverket. Dette kreves for webhook-levering fra eksterne tjenester (GitHub, Stripe osv.) og for å aksessere agenten din fra mobile enheter når du er borte hjemmefra.

## Planlagte alternativer

| Metode               | Beskrivelse                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| **Tailscale Serve**  | Eksponer gatewayen over Tailscale-nettverket ditt (privat, kryptert)        |
| **Tailscale Funnel** | Eksponer spesifikke stier (f.eks. `/webhook/*`) til det offentlige internett|
| **Cloudflare Tunnel**| Rut gjennom Cloudflares nettverk til din lokale instans                     |
| **Omvendt proxy**    | Manuelt oppsett med nginx, Caddy eller lignende                             |

## Konfigurasjon (planlagt)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Autentiseringstoken lagret i OS-nøkkelringen
```

## Sikkerhet

- Webhook-endepunkter er de eneste stiene eksponert som standard
- Autentiseringstokener lagres i OS-nøkkelringen
- All trafikk er kryptert under overføring
- Gateway WebSocket eksponeres aldri til det offentlige internett uten autentisering
