# KB: Proceso de autoactualización

Cómo funciona `triggerfish update`, qué puede fallar y cómo recuperarse.

## Cómo funciona

El comando de actualización descarga e instala la última versión desde GitHub:

1. **Comprobación de versión.** Obtiene la última etiqueta de versión de la API de GitHub. Si ya tiene la última versión, termina anticipadamente:
   ```
   Already up to date (v0.4.2)
   ```
   Las compilaciones de desarrollo (`VERSION=dev`) omiten la comprobación de versión y siempre proceden.

2. **Detección de plataforma.** Determina el nombre correcto del asset binario según su SO y arquitectura (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Descarga.** Obtiene el binario y `SHA256SUMS.txt` de la versión de GitHub.

4. **Verificación de checksum.** Calcula el SHA256 del binario descargado y lo compara con la entrada en `SHA256SUMS.txt`. Si los checksums no coinciden, la actualización se aborta.

5. **Parada del daemon.** Detiene el daemon en ejecución antes de reemplazar el binario.

6. **Reemplazo del binario.** Específico de la plataforma:
   - **Linux/macOS:** Renombra el binario antiguo, mueve el nuevo a su lugar
   - **Paso extra de macOS:** Elimina los atributos de cuarentena con `xattr -cr`
   - **Windows:** Renombra el binario antiguo a `.old` (Windows no puede sobreescribir un ejecutable en ejecución), luego copia el nuevo binario a la ruta original

7. **Reinicio del daemon.** Inicia el daemon con el nuevo binario.

8. **Registro de cambios.** Obtiene y muestra las notas de la versión nueva.

## Escalado con sudo

Si el binario está instalado en un directorio que requiere acceso root (por ejemplo, `/usr/local/bin`), el actualizador solicita su contraseña para escalar con `sudo`.

## Movimientos entre sistemas de ficheros

Si el directorio de descarga y el directorio de instalación están en sistemas de ficheros diferentes (común con `/tmp` en una partición separada), el renombrado atómico fallará. El actualizador recurre a copiar-y-luego-eliminar, que es seguro pero tiene ambos binarios en disco brevemente.

## Qué puede fallar

### "Checksum verification exception"

El binario descargado no coincide con el hash esperado. Esto normalmente significa:
- La descarga se corrompió (problema de red)
- Los assets de la versión están obsoletos o parcialmente subidos

**Solución:** Espere unos minutos e inténtelo de nuevo. Si persiste, descargue el binario manualmente desde la [página de versiones](https://github.com/greghavens/triggerfish/releases).

### "Asset not found in SHA256SUMS.txt"

La versión se publicó sin un checksum para su plataforma. Este es un problema del pipeline de publicación.

**Solución:** Abra un [issue en GitHub](https://github.com/greghavens/triggerfish/issues).

### "Binary replacement failed"

El actualizador no pudo reemplazar el binario antiguo por el nuevo. Causas comunes:
- Permisos de ficheros (el binario es del root pero usted ejecuta como usuario normal)
- El fichero está bloqueado (Windows: otro proceso tiene el binario abierto)
- Sistema de ficheros de solo lectura

**Solución:**
1. Detenga el daemon manualmente: `triggerfish stop`
2. Finalice cualquier proceso residual
3. Intente la actualización de nuevo con los permisos apropiados

### "Checksum file download failed"

No se puede descargar `SHA256SUMS.txt` de la versión de GitHub. Compruebe su conexión de red e inténtelo de nuevo.

### Limpieza del fichero `.old` en Windows

Tras una actualización en Windows, el binario antiguo se renombra a `triggerfish.exe.old`. Este fichero se limpia automáticamente en el siguiente inicio. Si no se limpia (por ejemplo, el nuevo binario se bloquea al arrancar), puede eliminarlo manualmente.

## Comparación de versiones

El actualizador utiliza comparación de versionado semántico:
- Elimina el prefijo `v` inicial (tanto `v0.4.2` como `0.4.2` son aceptados)
- Compara major, minor y patch numéricamente
- Las versiones pre-release se gestionan (por ejemplo, `v0.4.2-rc.1`)

## Actualización manual

Si el actualizador automático no funciona:

1. Descargue el binario para su plataforma desde [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. Detenga el daemon: `triggerfish stop`
3. Reemplace el binario:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: eliminar cuarentena
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Inicie el daemon: `triggerfish start`

## Actualización en Docker

Los despliegues Docker no utilizan el actualizador binario. Actualice la imagen del contenedor:

```bash
# Usando el script envolvente
triggerfish update

# Manualmente
docker compose pull
docker compose up -d
```

El script envolvente descarga la última imagen y reinicia el contenedor si hay uno en ejecución.

## Registro de cambios

Tras una actualización, las notas de la versión se muestran automáticamente. También puede verlas manualmente:

```bash
triggerfish changelog              # Versión actual
triggerfish changelog --latest 5   # Últimas 5 versiones
```

Si la obtención del registro de cambios falla tras una actualización, se registra pero no afecta a la actualización en sí.
