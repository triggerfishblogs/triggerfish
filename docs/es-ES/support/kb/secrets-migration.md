# KB: Migración de secretos

Este artículo cubre la migración de secretos desde el almacenamiento en texto plano al formato cifrado, y desde valores en línea en la configuración a referencias al llavero.

## Contexto

Las primeras versiones de Triggerfish almacenaban los secretos como JSON en texto plano. La versión actual utiliza cifrado AES-256-GCM para los almacenes de secretos basados en ficheros (Windows, Docker) y llaveros nativos del sistema operativo (Keychain de macOS, Secret Service de Linux).

## Migración automática (texto plano a cifrado)

Cuando Triggerfish abre un fichero de secretos y detecta el formato antiguo en texto plano (un objeto JSON plano sin campo `v`), migra automáticamente:

1. **Detección.** Se comprueba si el fichero tiene la estructura `{v: 1, entries: {...}}`. Si es un `Record<string, string>` simple, es formato heredado.

2. **Migración.** Cada valor en texto plano se cifra con AES-256-GCM usando una clave de máquina derivada mediante PBKDF2. Se genera un IV único para cada valor.

3. **Escritura atómica.** Los datos cifrados se escriben primero en un fichero temporal, luego se renombra atómicamente para reemplazar el original. Esto previene la pérdida de datos si el proceso se interrumpe.

4. **Registro.** Se crean dos entradas de registro:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Manejo entre dispositivos.** Si el renombrado atómico falla (por ejemplo, el fichero temporal y el fichero de secretos están en sistemas de ficheros diferentes), la migración recurre a copiar-y-luego-eliminar.

### Lo que necesita hacer

Nada. La migración es completamente automática y ocurre en el primer acceso. Sin embargo, tras la migración:

- **Rote sus secretos.** Las versiones en texto plano pueden haber sido respaldadas, almacenadas en caché o registradas. Genere nuevas API keys y actualícelas:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <nueva-clave>
  ```

- **Elimine las copias de seguridad antiguas.** Si tiene copias de seguridad del fichero de secretos antiguo en texto plano, elimínelas de forma segura.

## Migración manual (configuración en línea a llavero)

Si su `triggerfish.yaml` contiene valores de secretos sin cifrar en lugar de referencias `secret:`:

```yaml
# Antes (inseguro)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-clave-real-aqui"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Ejecute el comando de migración:

```bash
triggerfish config migrate-secrets
```

Este comando:

1. Escanea la configuración buscando campos de secretos conocidos (API keys, tokens de bot, contraseñas)
2. Almacena cada valor en el llavero del sistema operativo con su nombre de clave estándar
3. Reemplaza el valor en línea con una referencia `secret:`

```yaml
# Después (seguro)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Campos de secretos conocidos

El comando de migración conoce estos campos:

| Ruta de configuración | Clave del llavero |
|-----------------------|-------------------|
| `models.providers.<nombre>.apiKey` | `provider:<nombre>:apiKey` |
| `channels.telegram.botToken` | `telegram:botToken` |
| `channels.slack.botToken` | `slack:botToken` |
| `channels.slack.appToken` | `slack:appToken` |
| `channels.slack.signingSecret` | `slack:signingSecret` |
| `channels.discord.botToken` | `discord:botToken` |
| `channels.whatsapp.accessToken` | `whatsapp:accessToken` |
| `channels.whatsapp.webhookVerifyToken` | `whatsapp:webhookVerifyToken` |
| `channels.email.smtpPassword` | `email:smtpPassword` |
| `channels.email.imapPassword` | `email:imapPassword` |
| `web.search.api_key` | `web:search:apiKey` |

## Clave de máquina

El almacén de ficheros cifrados deriva su clave de cifrado de una clave de máquina almacenada en `secrets.key`. Esta clave se genera automáticamente en el primer uso.

### Permisos del fichero de clave

En sistemas Unix, el fichero de clave debe tener permisos `0600` (lectura/escritura solo del propietario). Triggerfish comprueba esto al inicio y registra una advertencia si los permisos son demasiado abiertos:

```
Machine key file permissions too open
```

Solución:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Pérdida del fichero de clave

Si el fichero de clave de máquina se elimina o corrompe, todos los secretos cifrados con él se vuelven irrecuperables. Deberá almacenar de nuevo cada secreto:

```bash
triggerfish config set-secret provider:anthropic:apiKey <clave>
triggerfish config set-secret telegram:botToken <token>
# ... etc
```

Haga una copia de seguridad de su fichero `secrets.key` en una ubicación segura.

### Ruta de clave personalizada

Anule la ubicación del fichero de clave con:

```bash
export TRIGGERFISH_KEY_PATH=/ruta/personalizada/secrets.key
```

Esto es principalmente útil para despliegues Docker con disposiciones de volúmenes no estándar.
