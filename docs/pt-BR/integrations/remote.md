# Acceso remoto

<ComingSoon />

El acceso remoto te permite alcanzar tu instancia de Triggerfish desde fuera de tu red
local. Esto es necesario para la entrega de webhooks desde servicios externos (GitHub,
Stripe, etc.) y para acceder a tu agente desde dispositivos móviles cuando estás fuera
de casa.

## Opciones planificadas

| Método              | Descripción                                                          |
| ------------------- | -------------------------------------------------------------------- |
| **Tailscale Serve** | Exponer el gateway a través de tu red Tailscale (privada, cifrada)   |
| **Tailscale Funnel** | Exponer rutas específicas (ej., `/webhook/*`) a la internet pública |
| **Cloudflare Tunnel** | Enrutar a través de la red de Cloudflare hacia tu instancia local  |
| **Proxy inverso**   | Configuración manual con nginx, Caddy o similar                      |

## Configuración (planificada)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Token de autenticación almacenado en el keychain del SO
```

## Seguridad

- Los endpoints de webhooks son las únicas rutas expuestas por defecto
- Los tokens de autenticación se almacenan en el keychain del SO
- Todo el tráfico se cifra en tránsito
- El WebSocket del gateway nunca se expone a la internet pública sin autenticación
