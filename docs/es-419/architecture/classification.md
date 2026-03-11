# Sistema de clasificación

El sistema de clasificación de datos es la base del modelo de seguridad de
Triggerfish. Cada dato que ingresa, se mueve o sale del sistema lleva una
etiqueta de clasificación. Estas etiquetas determinan hacia dónde pueden fluir
los datos — y, lo que es más importante, hacia dónde no pueden.

## Niveles de clasificación

Triggerfish utiliza una única jerarquía ordenada de cuatro niveles para todos los
despliegues.

| Nivel          | Rango          | Descripción                                               | Ejemplos                                                                      |
| -------------- | -------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (más alto)   | Datos más sensibles que requieren máxima protección        | Documentos de fusiones y adquisiciones, materiales de junta, PII, cuentas bancarias, expedientes médicos |
| `CONFIDENTIAL` | 3              | Información sensible de negocio o personal                | Datos de CRM, finanzas, registros de RR.HH., contratos, registros fiscales    |
| `INTERNAL`     | 2              | No destinada a compartir externamente                     | Wikis internas, documentos de equipo, notas personales, contactos             |
| `PUBLIC`       | 1 (más bajo)   | Segura para que cualquiera la vea                         | Materiales de marketing, documentación pública, contenido web general         |

## La regla de no write-down

El invariante de seguridad más importante en Triggerfish:

::: danger Los datos solo pueden fluir a canales o destinatarios con
clasificación **igual o superior**. Esta es una **regla fija** — no se puede
configurar, anular ni deshabilitar. El LLM no puede influir en esta decisión. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Jerarquía de clasificación: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Los datos solo fluyen hacia arriba." style="max-width: 100%;" />

Esto significa:

- Una respuesta que contiene datos `CONFIDENTIAL` no puede enviarse a un canal `PUBLIC`
- Una sesión con taint `RESTRICTED` no puede enviar salida a ningún canal por debajo
  de `RESTRICTED`
- No hay anulación de administrador, ni válvula de escape empresarial, ni solución alternativa del LLM

## Clasificación efectiva

Los canales y los destinatarios llevan niveles de clasificación. Cuando los
datos están a punto de salir del sistema, la **clasificación efectiva** del
destino determina qué se puede enviar:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

La clasificación efectiva es la _menor_ de las dos. Esto significa que un canal
de alta clasificación con un destinatario de baja clasificación se trata como de
baja clasificación.

| Canal          | Destinatario | Efectiva       | ¿Puede recibir datos CONFIDENTIAL? |
| -------------- | ------------ | -------------- | ---------------------------------- |
| `INTERNAL`     | `INTERNAL`   | `INTERNAL`     | No (CONFIDENTIAL > INTERNAL)       |
| `INTERNAL`     | `EXTERNAL`   | `PUBLIC`       | No                                 |
| `CONFIDENTIAL` | `INTERNAL`   | `INTERNAL`     | No (CONFIDENTIAL > INTERNAL)       |
| `CONFIDENTIAL` | `EXTERNAL`   | `PUBLIC`       | No                                 |
| `RESTRICTED`   | `INTERNAL`   | `INTERNAL`     | No (CONFIDENTIAL > INTERNAL)       |

## Reglas de clasificación de canales

Cada tipo de canal tiene reglas específicas para determinar su nivel de
clasificación.

### Correo electrónico

- **Coincidencia de dominio**: Los mensajes de `@empresa.com` se clasifican como `INTERNAL`
- El administrador configura qué dominios son internos
- Los dominios desconocidos o externos se clasifican como `EXTERNAL` por defecto
- Los destinatarios externos reducen la clasificación efectiva a `PUBLIC`

### Slack / Teams

- **Membresía del espacio de trabajo**: Los miembros del mismo espacio de trabajo/tenant son `INTERNAL`
- Los usuarios externos de Slack Connect se clasifican como `EXTERNAL`
- Los usuarios invitados se clasifican como `EXTERNAL`
- La clasificación se deriva de la API de la plataforma, no de la interpretación del LLM

### WhatsApp / Telegram / iMessage

- **Empresarial**: Los números de teléfono comparados contra la sincronización del directorio de RR.HH. determinan
  interno vs. externo
- **Personal**: Todos los destinatarios se clasifican como `EXTERNAL` por defecto
- Los usuarios pueden marcar contactos de confianza, pero esto no cambia el cálculo
  de clasificación — cambia la clasificación del destinatario

### WebChat

- Los visitantes de WebChat siempre se clasifican como `PUBLIC` (los visitantes nunca
  se verifican como propietario)
- WebChat está diseñado para interacciones de cara al público

### CLI

- El canal CLI se ejecuta localmente y se clasifica según el usuario autenticado
- El acceso directo por terminal es típicamente `INTERNAL` o superior

## Fuentes de clasificación de destinatarios

### Empresarial

- La **sincronización de directorio** (Okta, Azure AD, Google Workspace) pobla automáticamente
  las clasificaciones de destinatarios
- Todos los miembros del directorio se clasifican como `INTERNAL`
- Los invitados externos y proveedores se clasifican como `EXTERNAL`
- Los administradores pueden anular por contacto o por dominio

### Personal

- **Predeterminado**: Todos los destinatarios son `EXTERNAL`
- Los usuarios reclasifican contactos de confianza a través de indicaciones en el flujo o la app complementaria
- La reclasificación es explícita y se registra

## Estados de los canales

Cada canal pasa por una máquina de estados antes de poder transportar datos:

<img src="/diagrams/state-machine.svg" alt="Máquina de estados de canales: UNTRUSTED → CLASSIFIED o BLOCKED" style="max-width: 100%;" />

| Estado       | ¿Puede recibir datos? | ¿Puede enviar datos al contexto del agente? | Descripción                                                      |
| ------------ | :-------------------: | :-----------------------------------------: | ---------------------------------------------------------------- |
| `UNTRUSTED`  |          No           |                     No                      | Predeterminado para canales nuevos/desconocidos. Completamente aislado. |
| `CLASSIFIED` | Sí (dentro de la política) |        Sí (con clasificación)          | Revisado y asignado un nivel de clasificación.                   |
| `BLOCKED`    |          No           |                     No                      | Explícitamente prohibido por el administrador o usuario.         |

::: warning SEGURIDAD Los canales nuevos siempre comienzan en el estado `UNTRUSTED`. No
pueden recibir ningún dato del agente ni enviar datos al contexto del agente.
El canal permanece completamente aislado hasta que un administrador (empresarial) o
el usuario (personal) lo clasifique explícitamente. :::

## Cómo interactúa la clasificación con otros sistemas

La clasificación no es una característica independiente — impulsa decisiones en
toda la plataforma:

| Sistema                  | Cómo se usa la clasificación                                                  |
| ------------------------ | ----------------------------------------------------------------------------- |
| **Taint de sesión**      | Acceder a datos clasificados escala la sesión a ese nivel                     |
| **Hooks de políticas**   | PRE_OUTPUT compara el taint de sesión contra la clasificación del destino     |
| **MCP Gateway**          | Las respuestas del servidor MCP llevan clasificación que contamina la sesión  |
| **Linaje de datos**      | Cada registro de linaje incluye el nivel de clasificación y la razón          |
| **Notificaciones**       | El contenido de las notificaciones está sujeto a las mismas reglas de clasificación |
| **Delegación de agentes** | El tope de clasificación del agente llamado debe igualar el taint del que llama |
| **Sandbox de plugins**   | El SDK de plugins auto-clasifica todos los datos emitidos                     |
