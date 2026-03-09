# Acceso remoto

<ComingSoon />

El acceso remoto le permite acceder a su instancia de Triggerfish desde fuera de su red local. Esto es necesario para la entrega de webhooks desde servicios externos (GitHub, Stripe, etc.) y para acceder a su agente desde dispositivos móviles cuando está fuera de casa.

## Opciones previstas

| Método               | Descripción                                                           |
| -------------------- | --------------------------------------------------------------------- |
| **Tailscale Serve**  | Exponer el Gateway a través de su red Tailscale (privada, cifrada)    |
| **Tailscale Funnel** | Exponer rutas específicas (p. ej., `/webhook/*`) a la internet pública |
| **Cloudflare Tunnel** | Enrutar a través de la red de Cloudflare hasta su instancia local    |
| **Proxy inverso**    | Configuración manual con nginx, Caddy o similar                       |

## Configuración (prevista)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Token de autenticación almacenado en el llavero del SO
```

## Seguridad

- Los endpoints de webhooks son las únicas rutas expuestas por defecto
- Los tokens de autenticación se almacenan en el llavero del SO
- Todo el tráfico está cifrado en tránsito
- El WebSocket del Gateway nunca se expone a la internet pública sin autenticación
