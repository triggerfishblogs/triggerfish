# KB: Migración de secrets

Este artículo cubre la migración de secrets desde almacenamiento en texto plano al formato cifrado, y desde valores en línea de la configuración a referencias del keychain.

## Antecedentes

Las primeras versiones de Triggerfish almacenaban secrets como JSON en texto plano. La versión actual usa cifrado AES-256-GCM para almacenes de secrets respaldados por archivos (Windows, Docker) y keychains nativos del SO (macOS Keychain, Linux Secret Service).

## Migración automática (texto plano a cifrado)

Cuando Triggerfish abre un archivo de secrets y detecta el formato antiguo en texto plano (un objeto JSON plano sin un campo `v`), migra automáticamente:

1. **Detección.** El archivo se verifica por la presencia de la estructura `{v: 1, entries: {...}}`. Si es un `Record<string, string>` simple, es formato legacy.

2. **Migración.** Cada valor en texto plano se cifra con AES-256-GCM usando una clave de máquina derivada vía PBKDF2. Se genera un IV único para cada valor.

3. **Escritura atómica.** Los datos cifrados se escriben primero en un archivo temporal, luego se renombra atómicamente para reemplazar el original. Esto previene pérdida de datos si el proceso se interrumpe.

4. **Logging.** Se crean dos entradas de log:
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Manejo entre dispositivos.** Si el renombramiento atómico falla (ej., el archivo temporal y el archivo de secrets están en diferentes sistemas de archivos), la migración recurre a copiar-y-eliminar.

### Lo que debes hacer

Nada. La migración es completamente automática y ocurre en el primer acceso. Sin embargo, después de la migración:

- **Rota tus secrets.** Las versiones en texto plano pueden haber sido respaldadas, cacheadas o registradas. Genera nuevas API keys y actualízalas:
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <nueva-clave>
  ```

- **Elimina respaldos antiguos.** Si tienes respaldos del archivo de secrets antiguo en texto plano, elimínalos de forma segura.

## Migración manual (configuración en línea al keychain)

Si tu `triggerfish.yaml` contiene valores de secrets en crudo en lugar de referencias `secret:`:

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

Ejecuta el comando de migración:

```bash
triggerfish config migrate-secrets
```

Este comando:

1. Escanea la config en busca de campos de secrets conocidos (API keys, bot tokens, contraseñas)
2. Almacena cada valor en el keychain del SO bajo su nombre de clave estándar
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

### Campos de secrets conocidos

El comando de migración conoce estos campos:

| Ruta de configuración | Clave del keychain |
|----------------------|-------------------|
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

El almacén de archivos cifrados deriva su clave de cifrado de una clave de máquina almacenada en `secrets.key`. Esta clave se genera automáticamente en el primer uso.

### Permisos del archivo de clave

En sistemas Unix, el archivo de clave debe tener permisos `0600` (lectura/escritura solo del propietario). Triggerfish verifica esto al inicio y registra una advertencia si los permisos son demasiado abiertos:

```
Machine key file permissions too open
```

Solución:

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Pérdida del archivo de clave

Si el archivo de clave de máquina se elimina o corrompe, todos los secrets cifrados con él se vuelven irrecuperables. Necesitarás volver a almacenar cada secret:

```bash
triggerfish config set-secret provider:anthropic:apiKey <clave>
triggerfish config set-secret telegram:botToken <token>
# ... etc
```

Respalda tu archivo `secrets.key` en una ubicación segura.

### Ruta personalizada de clave

Anula la ubicación del archivo de clave con:

```bash
export TRIGGERFISH_KEY_PATH=/ruta/personalizada/secrets.key
```

Esto es principalmente útil para despliegues Docker con layouts de volúmenes no estándar.
