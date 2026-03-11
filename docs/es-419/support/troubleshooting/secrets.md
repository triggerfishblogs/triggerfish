# Solución de problemas: secrets y credenciales

## Backends de keychain por plataforma

| Plataforma | Backend | Detalles |
|-----------|---------|----------|
| macOS | Keychain (nativo) | Usa el CLI `security` para acceder a Keychain Access |
| Linux | Secret Service (D-Bus) | Usa el CLI `secret-tool` (libsecret / GNOME Keyring) |
| Windows | Almacén de archivos cifrados | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Almacén de archivos cifrados | `/data/secrets.json` + `/data/secrets.key` |

El backend se selecciona automáticamente al inicio. No puedes cambiar qué backend se usa para tu plataforma.

---

## Problemas en macOS

### Solicitudes de acceso al keychain

macOS puede pedirte que permitas a `triggerfish` acceder al keychain. Haz clic en "Permitir siempre" para evitar solicitudes repetidas. Si accidentalmente hiciste clic en "Denegar", abre Acceso a Llaveros, encuentra la entrada y elimínala. El siguiente acceso te solicitará de nuevo.

### Keychain bloqueado

Si el keychain de macOS está bloqueado (ej., después de suspensión), las operaciones de secrets fallarán. Desbloquéalo:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

O simplemente desbloquea tu Mac (el keychain se desbloquea al iniciar sesión).

---

## Problemas en Linux

### "secret-tool" no encontrado

El backend de keychain de Linux usa `secret-tool`, que es parte del paquete `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### No hay daemon de Secret Service ejecutándose

En servidores headless o entornos de escritorio mínimos, puede que no haya daemon de Secret Service. Síntomas:

- Los comandos de `secret-tool` se cuelgan o fallan
- Mensajes de error sobre conexión D-Bus

**Opciones:**

1. **Instala e inicia GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Usa el fallback de archivos cifrados:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Advertencia: el fallback en memoria no persiste secrets entre reinicios. Solo es adecuado para pruebas.

3. **Para servidores, considera Docker.** El despliegue Docker usa un almacén de archivos cifrados que no requiere un daemon de keyring.

### KDE / KWallet

Si usas KDE con KWallet en lugar de GNOME Keyring, `secret-tool` debería funcionar a través de la API D-Bus de Secret Service que KWallet implementa. Si no funciona, instala `gnome-keyring` junto con KWallet.

---

## Almacén de archivos cifrados de Windows / Docker

### Cómo funciona

El almacén de archivos cifrados usa cifrado AES-256-GCM:

1. Se deriva una clave de máquina usando PBKDF2 y se almacena en `secrets.key`
2. Cada valor de secret se cifra individualmente con un IV único
3. Los datos cifrados se almacenan en `secrets.json` en un formato versionado (`{v: 1, entries: {...}}`)

### "Machine key file permissions too open"

En sistemas basados en Unix (Linux en Docker), el archivo de clave debe tener permisos `0600` (lectura/escritura solo del propietario). Si los permisos son demasiado permisivos:

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

El archivo de clave existe pero no se puede analizar. Puede haber sido truncado o sobrescrito.

**Solución:** Elimina el archivo de clave y regenera:

```bash
rm ~/.triggerfish/secrets.key
```

En el siguiente inicio, se genera una nueva clave. Sin embargo, todos los secrets existentes cifrados con la clave anterior serán ilegibles. Necesitarás volver a almacenar todos los secrets:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Repite para todos los secrets
```

### "Secret file permissions too open"

Igual que el archivo de clave, el archivo de secrets debería tener permisos restrictivos:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### "Secret file chmod failed"

El sistema no pudo establecer permisos de archivo. Esto puede pasar en sistemas de archivos que no soportan permisos Unix (algunos montajes de red, volúmenes FAT/exFAT). Verifica que el sistema de archivos soporte cambios de permisos.

---

## Migración de secrets legacy

### Migración automática

Si Triggerfish detecta un archivo de secrets en texto plano (formato antiguo sin cifrado), migra automáticamente al formato cifrado en la primera carga:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

La migración:
1. Lee el archivo JSON en texto plano
2. Cifra cada valor con AES-256-GCM
3. Escribe en un archivo temporal, luego renombra atómicamente
4. Registra una advertencia recomendando rotación de secrets

### Migración manual

Si tienes secrets en tu archivo `triggerfish.yaml` (no usando referencias `secret:`), migra al keychain:

```bash
triggerfish config migrate-secrets
```

Esto escanea tu config en busca de campos de secrets conocidos (API keys, bot tokens, etc.), los almacena en el keychain y reemplaza los valores en el archivo de config con referencias `secret:`.

### Problemas de movimiento entre dispositivos

Si la migración involucra mover archivos entre límites de sistemas de archivos (diferentes puntos de montaje, NFS), el renombramiento atómico puede fallar. La migración recurre a copiar-y-eliminar, que es seguro pero brevemente tiene ambos archivos en disco.

---

## Resolución de secrets

### Cómo funcionan las referencias `secret:`

Los valores de configuración con prefijo `secret:` se resuelven al inicio:

```yaml
# En triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Al inicio, se resuelve a:
apiKey: "sk-ant-api03-valor-real-de-la-clave..."
```

El valor resuelto solo existe en memoria. El archivo de configuración en disco siempre contiene la referencia `secret:`.

### "Secret not found"

```
Secret not found: <clave>
```

La clave referenciada no existe en el keychain.

**Solución:**

```bash
triggerfish config set-secret <clave> <valor>
```

### Listar secrets

```bash
# Listar todas las claves de secrets almacenadas (los valores no se muestran)
triggerfish config get-secret --list
```

### Eliminar secrets

```bash
triggerfish config set-secret <clave> ""
# o a través del agente:
# El agente puede solicitar eliminación de secrets vía la herramienta de secrets
```

---

## Anulación de variable de entorno

La ruta del archivo de clave puede anularse con `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/ruta/personalizada/secrets.key
```

Esto es principalmente útil para despliegues Docker con layouts de volúmenes personalizados.

---

## Nombres comunes de claves de secrets

Estas son las claves estándar del keychain usadas por Triggerfish:

| Clave | Uso |
|-------|-----|
| `provider:<nombre>:apiKey` | API key del proveedor de LLM |
| `telegram:botToken` | Token del bot de Telegram |
| `slack:botToken` | Token del bot de Slack |
| `slack:appToken` | Token de nivel app de Slack |
| `slack:signingSecret` | Signing secret de Slack |
| `discord:botToken` | Token del bot de Discord |
| `whatsapp:accessToken` | Access token de WhatsApp Cloud API |
| `whatsapp:webhookVerifyToken` | Token de verificación de webhook de WhatsApp |
| `email:smtpPassword` | Contraseña del relay SMTP |
| `email:imapPassword` | Contraseña del servidor IMAP |
| `web:search:apiKey` | API key de Brave Search |
| `github-pat` | Personal Access Token de GitHub |
| `notion:token` | Token de integración de Notion |
| `caldav:password` | Contraseña del servidor CalDAV |
| `google:clientId` | Google OAuth client ID |
| `google:clientSecret` | Google OAuth client secret |
| `google:refreshToken` | Google OAuth refresh token |
