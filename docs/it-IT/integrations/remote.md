# Accesso Remoto

<ComingSoon />

L'accesso remoto consente di raggiungere l'istanza Triggerfish dall'esterno della
rete locale. Questo è necessario per la consegna dei webhook da servizi esterni
(GitHub, Stripe, ecc.) e per accedere all'agent da dispositivi mobili quando si
è fuori casa.

## Opzioni Pianificate

| Metodo              | Descrizione                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| **Tailscale Serve**  | Esporre il gateway sulla rete Tailscale (privata, crittografata)        |
| **Tailscale Funnel** | Esporre percorsi specifici (es. `/webhook/*`) a internet pubblico       |
| **Cloudflare Tunnel** | Instradare attraverso la rete Cloudflare verso l'istanza locale       |
| **Reverse Proxy**    | Configurazione manuale con nginx, Caddy o simili                        |

## Configurazione (Pianificata)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Il token di autenticazione è archiviato nel portachiavi del SO
```

## Sicurezza

- Gli endpoint webhook sono gli unici percorsi esposti per impostazione
  predefinita
- I token di autenticazione sono archiviati nel portachiavi del SO
- Tutto il traffico è crittografato in transito
- Il WebSocket del gateway non viene mai esposto a internet pubblico senza
  autenticazione
