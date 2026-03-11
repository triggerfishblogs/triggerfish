# Cómo reportar un buen issue

Un issue bien estructurado se resuelve más rápido. Un issue vago sin registros ni pasos de reproducción suele quedarse durante semanas porque nadie puede actuar sobre él. Esto es lo que debe incluir.

## Antes de reportar

1. **Busque issues existentes.** Alguien puede haber reportado ya el mismo problema. Compruebe los [issues abiertos](https://github.com/greghavens/triggerfish/issues) y los [issues cerrados](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Consulte las guías de solución de problemas.** La sección de [Solución de problemas](/es-ES/support/troubleshooting/) cubre la mayoría de los problemas comunes.

3. **Consulte los problemas conocidos.** La página de [Problemas conocidos](/es-ES/support/kb/known-issues) lista los problemas de los que ya somos conscientes.

4. **Pruebe con la última versión.** Si no está en la última versión, actualice primero:
   ```bash
   triggerfish update
   ```

## Qué incluir

### 1. Entorno

```
Versión de Triggerfish: (ejecute `triggerfish version`)
SO: (por ejemplo, macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Arquitectura: (x64 o arm64)
Método de instalación: (instalador binario, desde código fuente, Docker)
```

### 2. Pasos para reproducir

Escriba la secuencia exacta de acciones que conduce al problema. Sea específico:

**Mal:**
> El bot dejó de funcionar.

**Bien:**
> 1. Inicié Triggerfish con el canal Telegram configurado
> 2. Envié el mensaje "comprueba mi calendario para mañana" en un DM al bot
> 3. El bot respondió con los resultados del calendario
> 4. Envié "ahora envía esos resultados por email a alice@example.com"
> 5. Esperado: el bot envía el email
> 6. Real: el bot responde con "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. Comportamiento esperado frente a real

Indique qué esperaba que ocurriera y qué ocurrió realmente. Incluya el mensaje de error exacto si lo hay. Copiar y pegar es mejor que parafrasear.

### 4. Salida de registros

Adjunte un [paquete de registros](/es-ES/support/guides/collecting-logs):

```bash
triggerfish logs bundle
```

Si el problema es sensible desde el punto de vista de seguridad, puede eliminar porciones, pero indíquelo en el issue.

Como mínimo, pegue las líneas de registro relevantes. Incluya marcas temporales para que podamos correlacionar eventos.

### 5. Configuración (editada)

Pegue la sección relevante de su `triggerfish.yaml`. **Siempre elimine los secretos.** Sustituya los valores reales por marcadores de posición:

```yaml
# Bien - secretos eliminados
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # almacenada en llavero
channels:
  telegram:
    ownerId: "ELIMINADO"
    classification: INTERNAL
```

### 6. Salida de patrol

```bash
triggerfish patrol
```

Pegue la salida. Esto nos da una instantánea rápida del estado del sistema.

## Tipos de issues

### Informe de fallo

Utilice esta plantilla para cosas que no funcionan:

```markdown
## Informe de fallo

**Entorno:**
- Versión:
- SO:
- Método de instalación:

**Pasos para reproducir:**
1.
2.
3.

**Comportamiento esperado:**

**Comportamiento real:**

**Mensaje de error (si lo hay):**

**Salida de patrol:**

**Configuración relevante (editada):**

**Paquete de registros:** (adjuntar fichero)
```

### Solicitud de funcionalidad

```markdown
## Solicitud de funcionalidad

**Problema:** ¿Qué intenta hacer que no puede hacer hoy?

**Solución propuesta:** ¿Cómo cree que debería funcionar?

**Alternativas consideradas:** ¿Qué más ha probado?
```

### Pregunta / Solicitud de soporte

Si no está seguro de si algo es un fallo o simplemente está atascado, utilice [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) en lugar de Issues. Las discusiones son mejores para preguntas que pueden no tener una única respuesta correcta.

## Qué NO incluir

- **API keys o contraseñas sin editar.** Siempre elimínelas.
- **Datos personales de conversaciones.** Elimine nombres, emails, números de teléfono.
- **Ficheros de registro completos en línea.** Adjunte el paquete de registros como fichero en lugar de pegar miles de líneas.

## Después de reportar

- **Esté atento a preguntas de seguimiento.** Los mantenedores pueden necesitar más información.
- **Pruebe las correcciones.** Si se publica una corrección, se le puede pedir que la verifique.
- **Cierre el issue** si encuentra la solución usted mismo. Publique la solución para que otros puedan beneficiarse.
