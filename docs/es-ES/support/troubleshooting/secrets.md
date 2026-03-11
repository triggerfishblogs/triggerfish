# Solución de problemas: Secretos y credenciales

## Backends de llavero por plataforma

| Plataforma | Backend | Detalles |
|------------|---------|----------|
| macOS | Keychain (nativo) | Utiliza el CLI `security` para acceder al Llavero |
| Linux | Secret Service (D-Bus) | Utiliza el CLI `secret-tool` (libsecret / GNOME Keyring) |
| Windows | Almacén de ficheros cifrados | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Almacén de ficheros cifrados | `/data/secrets.json` + `/data/secrets.key` |

El backend se selecciona automáticamente al inicio. No puede cambiar qué backend se utiliza para su plataforma.

---

## Problemas de macOS

### Solicitudes de acceso al llavero

macOS puede pedirle que permita a `triggerfish` acceder al llavero. Haga clic en "Permitir siempre" para evitar solicitudes repetidas. Si accidentalmente pulsó "Denegar", abra Acceso a Llaveros, busque la entrada y elimínela. El siguiente acceso volverá a mostrar la solicitud.

### Llavero bloqueado

Si el llavero de macOS está bloqueado (por ejemplo, tras la suspensión), las operaciones de secretos fallarán. Desbloquéelo:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

O simplemente desbloquee su Mac (el llavero se desbloquea al iniciar sesión).

---

## Problemas de Linux

### "secret-tool" no encontrado

El backend de llavero de Linux utiliza `secret-tool`, que forma parte del paquete `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### No hay daemon de Secret Service en ejecución

En servidores sin escritorio o entornos de escritorio mínimos, puede no haber un daemon de Secret Service. Síntomas:

- Los comandos de `secret-tool` se cuelgan o fallan
- Mensajes de error sobre la conexión D-Bus

**Opciones:**

1. **Instale e inicie GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Utilice el respaldo de fichero cifrado:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Advertencia: el respaldo en memoria no persiste los secretos entre reinicios. Solo es adecuado para pruebas.

3. **Para servidores, considere Docker.** El despliegue con Docker utiliza un almacén de ficheros cifrados que no requiere un daemon de llavero.

### KDE / KWallet

Si utiliza KDE con KWallet en lugar de GNOME Keyring, `secret-tool` debería seguir funcionando a través de la API D-Bus de Secret Service que KWallet implementa. Si no funciona, instale `gnome-keyring` junto a KWallet.

---

## Almacén de ficheros cifrados de Windows / Docker

### Cómo funciona

El almacén de ficheros cifrados utiliza cifrado AES-256-GCM:

1. Se deriva una clave de máquina usando PBKDF2 y se almacena en `secrets.key`
2. Cada valor de secreto se cifra individualmente con un IV único
3. Los datos cifrados se almacenan en `secrets.json` en un formato versionado (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

En sistemas basados en Unix (Linux en Docker), el fichero de clave debe tener permisos `0600` (lectura/escritura solo del propietario). Si los permisos son demasiado permisivos:

```
Machine key file permissions too open
```

**Solución:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# o en Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### "Machine key file corrupt"

El fichero de clave existe pero no puede analizarse. Puede haber sido truncado o sobreescrito.

**Solución:** Elimine el fichero de clave y regenere:

```bash
rm ~/.triggerfish/secrets.key
```

En el siguiente inicio, se genera una nueva clave. Sin embargo, todos los secretos existentes cifrados con la clave antigua serán ilegibles. Deberá almacenar de nuevo todos los secretos:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Repita para todos los secretos
```

### "Secret file permissions too open"

Igual que el fichero de clave, el fichero de secretos debe tener permisos restrictivos:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

El sistema no pudo establecer los permisos del fichero. Esto puede ocurrir en sistemas de ficheros que no soportan permisos Unix (algunos montajes de red, volúmenes FAT/exFAT). Verifique que el sistema de ficheros soporta cambios de permisos.

---

## Migración de secretos heredados

### Migración automática

Si Triggerfish detecta un fichero de secretos en texto plano (formato antiguo sin cifrado), migra automáticamente al formato cifrado en la primera carga:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

La migración:
1. Lee el fichero JSON en texto plano
2. Cifra cada valor con AES-256-GCM
3. Escribe en un fichero temporal, luego renombra atómicamente
4. Registra una advertencia recomendando la rotación de secretos

### Migración manual

Si tiene secretos en su fichero `triggerfish.yaml` (sin usar referencias `secret:`), mígrelos al llavero:

```bash
triggerfish config migrate-secrets
```

Esto escanea su configuración buscando campos de secretos conocidos (API keys, tokens de bot, etc.), los almacena en el llavero y reemplaza los valores en el fichero de configuración con referencias `secret:`.

### Problemas de movimiento entre dispositivos

Si la migración implica mover ficheros entre límites de sistemas de ficheros (diferentes puntos de montaje, NFS), el renombrado atómico puede fallar. La migración recurre a copiar-y-luego-eliminar, que sigue siendo seguro pero tiene ambos ficheros en disco brevemente.

---

## Resolución de secretos

### Cómo funcionan las referencias `secret:`

Los valores de configuración con el prefijo `secret:` se resuelven al inicio:

```yaml
# En triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Al inicio, se resuelve a:
apiKey: "sk-ant-api03-valor-real-de-la-clave..."
```

El valor resuelto solo existe en memoria. El fichero de configuración en disco siempre contiene la referencia `secret:`.

### "Secret not found"

```
Secret not found: <clave>
```

La clave referenciada no existe en el llavero.

**Solución:**

```bash
triggerfish config set-secret <clave> <valor>
```

### Listar secretos

```bash
# Listar todas las claves de secretos almacenadas (los valores no se muestran)
triggerfish config get-secret --list
```

### Eliminar secretos

```bash
triggerfish config set-secret <clave> ""
# o a través del agente:
# El agente puede solicitar la eliminación de secretos mediante la herramienta de secretos
```

---

## Anulación de variable de entorno

La ruta del fichero de clave puede anularse con `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/ruta/personalizada/secrets.key
```

Esto es principalmente útil para despliegues Docker con disposiciones de volúmenes personalizadas.

---

## Nombres comunes de claves de secretos

Estas son las claves estándar del llavero utilizadas por Triggerfish:

| Clave | Uso |
|-------|-----|
| `provider:<nombre>:apiKey` | API key del proveedor LLM |
| `telegram:botToken` | Token del bot de Telegram |
| `slack:botToken` | Token del bot de Slack |
| `slack:appToken` | Token a nivel de aplicación de Slack |
| `slack:signingSecret` | Secreto de firma de Slack |
| `discord:botToken` | Token del bot de Discord |
| `whatsapp:accessToken` | Token de acceso de la API de WhatsApp Cloud |
| `whatsapp:webhookVerifyToken` | Token de verificación de webhook de WhatsApp |
| `email:smtpPassword` | Contraseña del relay SMTP |
| `email:imapPassword` | Contraseña del servidor IMAP |
| `web:search:apiKey` | API key de Brave Search |
| `github-pat` | Personal Access Token de GitHub |
| `notion:token` | Token de integración de Notion |
| `caldav:password` | Contraseña del servidor CalDAV |
| `google:clientId` | ID de cliente OAuth de Google |
| `google:clientSecret` | Secreto de cliente OAuth de Google |
| `google:refreshToken` | Token de actualización OAuth de Google |
