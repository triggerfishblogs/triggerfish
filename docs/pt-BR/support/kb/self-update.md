# KB: Proceso de auto-actualización

Cómo funciona `triggerfish update`, qué puede salir mal y cómo recuperarse.

## Cómo funciona

El comando de actualización descarga e instala la última versión desde GitHub:

1. **Verificación de versión.** Obtiene la última etiqueta de release de la API de GitHub. Si ya estás en la última versión, termina temprano:
   ```
   Already up to date (v0.4.2)
   ```
   Las compilaciones de desarrollo (`VERSION=dev`) se saltan la verificación de versión y siempre proceden.

2. **Detección de plataforma.** Determina el nombre correcto del asset binario según tu SO y arquitectura (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Descarga.** Obtiene el binario y `SHA256SUMS.txt` del release de GitHub.

4. **Verificación de checksum.** Calcula el SHA256 del binario descargado y lo compara contra la entrada en `SHA256SUMS.txt`. Si los checksums no coinciden, la actualización se cancela.

5. **Detención del daemon.** Detiene el daemon en ejecución antes de reemplazar el binario.

6. **Reemplazo del binario.** Específico por plataforma:
   - **Linux/macOS:** Renombra el binario antiguo, mueve el nuevo a su lugar
   - **Paso adicional en macOS:** Limpia los atributos de cuarentena con `xattr -cr`
   - **Windows:** Renombra el binario antiguo a `.old` (Windows no puede sobrescribir un ejecutable en ejecución), luego copia el nuevo binario a la ruta original

7. **Reinicio del daemon.** Inicia el daemon con el nuevo binario.

8. **Changelog.** Obtiene y muestra las notas del release para la nueva versión.

## Escalamiento sudo

Si el binario está instalado en un directorio que requiere acceso root (ej., `/usr/local/bin`), el actualizador solicita tu contraseña para escalar con `sudo`.

## Movimientos entre sistemas de archivos

Si el directorio de descarga y el directorio de instalación están en diferentes sistemas de archivos (común con `/tmp` en una partición separada), el renombramiento atómico fallará. El actualizador recurre a copiar-y-eliminar, lo cual es seguro pero brevemente tiene ambos binarios en disco.

## Qué puede salir mal

### "Checksum verification exception"

El binario descargado no coincide con el hash esperado. Esto usualmente significa:
- La descarga se corrompió (problema de red)
- Los assets del release están desactualizados o parcialmente subidos

**Solución:** Espera unos minutos e intenta de nuevo. Si persiste, descarga el binario manualmente desde la [página de releases](https://github.com/greghavens/triggerfish/releases).

### "Asset not found in SHA256SUMS.txt"

El release fue publicado sin un checksum para tu plataforma. Esto es un problema del pipeline de release.

**Solución:** Reporta un [issue en GitHub](https://github.com/greghavens/triggerfish/issues).

### "Binary replacement failed"

El actualizador no pudo reemplazar el binario antiguo con el nuevo. Causas comunes:
- Permisos de archivo (el binario es propiedad de root pero estás ejecutando como usuario normal)
- Archivo bloqueado (Windows: otro proceso tiene el binario abierto)
- Sistema de archivos de solo lectura

**Solución:**
1. Detén el daemon manualmente: `triggerfish stop`
2. Termina cualquier proceso zombi
3. Intenta la actualización de nuevo con los permisos apropiados

### "Checksum file download failed"

No se puede descargar `SHA256SUMS.txt` del release de GitHub. Verifica tu conexión de red e intenta de nuevo.

### Limpieza del archivo `.old` en Windows

Después de una actualización en Windows, el binario antiguo se renombra a `triggerfish.exe.old`. Este archivo se limpia automáticamente en el siguiente inicio. Si no se limpia (ej., el nuevo binario falla al iniciar), puedes eliminarlo manualmente.

## Comparación de versiones

El actualizador usa comparación de versionado semántico:
- Elimina el prefijo `v` (tanto `v0.4.2` como `0.4.2` son aceptados)
- Compara major, minor y patch numéricamente
- Las versiones pre-release se manejan (ej., `v0.4.2-rc.1`)

## Actualización manual

Si el actualizador automático no funciona:

1. Descarga el binario para tu plataforma desde [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. Detén el daemon: `triggerfish stop`
3. Reemplaza el binario:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: limpiar cuarentena
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Inicia el daemon: `triggerfish start`

## Actualización en Docker

Los despliegues Docker no usan el actualizador binario. Actualiza la imagen del contenedor:

```bash
# Usando el script wrapper
triggerfish update

# Manualmente
docker compose pull
docker compose up -d
```

El script wrapper descarga la última imagen y reinicia el contenedor si hay uno ejecutándose.

## Changelog

Después de una actualización, las notas del release se muestran automáticamente. También puedes verlas manualmente:

```bash
triggerfish changelog              # Versión actual
triggerfish changelog --latest 5   # Últimos 5 releases
```

Si la obtención del changelog falla después de una actualización, se registra pero no afecta la actualización en sí.
