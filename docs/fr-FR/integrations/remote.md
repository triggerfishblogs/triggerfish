# Accès à distance

<ComingSoon />

L'accès à distance vous permet d'atteindre votre instance Triggerfish depuis
l'extérieur de votre réseau local. Cela est nécessaire pour la livraison de
webhooks depuis des services externes (GitHub, Stripe, etc.) et pour accéder à
votre agent depuis des appareils mobiles lorsque vous êtes en déplacement.

## Options prévues

| Méthode              | Description                                                                      |
| -------------------- | -------------------------------------------------------------------------------- |
| **Tailscale Serve**  | Exposer le Gateway via votre réseau Tailscale (privé, chiffré)                   |
| **Tailscale Funnel** | Exposer des chemins spécifiques (ex. `/webhook/*`) sur l'internet public         |
| **Cloudflare Tunnel** | Router via le réseau Cloudflare vers votre instance locale                      |
| **Reverse Proxy**    | Configuration manuelle avec nginx, Caddy ou similaire                            |

## Configuration (prévue)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Token d'authentification stocké dans le trousseau de clés du système
```

## Sécurité

- Les points de terminaison webhook sont les seuls chemins exposés par défaut
- Les tokens d'authentification sont stockés dans le trousseau de clés du système
- Tout le trafic est chiffré en transit
- Le WebSocket du Gateway n'est jamais exposé sur l'internet public sans authentification
