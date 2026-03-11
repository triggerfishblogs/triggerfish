# Cómo reportar un buen issue

Un issue bien estructurado se resuelve más rápido. Un issue vago sin logs y sin pasos de reproducción a menudo queda sin resolver por semanas porque nadie puede actuar al respecto. Aquí está lo que debes incluir.

## Antes de reportar

1. **Busca issues existentes.** Alguien puede haber reportado ya el mismo problema. Revisa los [issues abiertos](https://github.com/greghavens/triggerfish/issues) y los [issues cerrados](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Revisa las guías de solución de problemas.** La sección de [Solución de problemas](/pt-BR/support/troubleshooting/) cubre la mayoría de los problemas comunes.

3. **Revisa los problemas conocidos.** La página de [Problemas conocidos](/pt-BR/support/kb/known-issues) lista los problemas de los que ya estamos al tanto.

4. **Prueba la última versión.** Si no estás en la última versión, actualiza primero:
   ```bash
   triggerfish update
   ```

## Qué incluir

### 1. Entorno

```
Versión de Triggerfish: (ejecuta `triggerfish version`)
SO: (ej., macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Arquitectura: (x64 o arm64)
Método de instalación: (instalador binario, desde código fuente, Docker)
```

### 2. Pasos para reproducir

Escribe la secuencia exacta de acciones que lleva al problema. Sé específico:

**Mal:**
> El bot dejó de funcionar.

**Bien:**
> 1. Inicié Triggerfish con el canal de Telegram configurado
> 2. Envié el mensaje "check my calendar for tomorrow" en un DM al bot
> 3. El bot respondió con los resultados del calendario
> 4. Envié "now email those results to alice@example.com"
> 5. Esperado: el bot envía el email
> 6. Real: el bot responde con "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. Comportamiento esperado vs. real

Di lo que esperabas que pasara y lo que realmente pasó. Incluye el mensaje de error exacto si hay uno. Copiar y pegar es mejor que parafrasear.

### 4. Salida de logs

Adjunta un [paquete de logs](/pt-BR/support/guides/collecting-logs):

```bash
triggerfish logs bundle
```

Si el issue es sensible en términos de seguridad, puedes redactar porciones, pero indica en el issue lo que redactaste.

Como mínimo, pega las líneas de log relevantes. Incluye timestamps para que podamos correlacionar eventos.

### 5. Configuración (redactada)

Pega la sección relevante de tu `triggerfish.yaml`. **Siempre redacta los secrets.** Reemplaza los valores reales con marcadores de posición:

```yaml
# Bien - secrets redactados
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # almacenado en keychain
channels:
  telegram:
    ownerId: "REDACTADO"
    classification: INTERNAL
```

### 6. Salida de patrol

```bash
triggerfish patrol
```

Pega la salida. Esto nos da una instantánea rápida de la salud del sistema.

## Tipos de issues

### Reporte de error

Usa esta plantilla para cosas que están rotas:

```markdown
## Reporte de error

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

**Mensaje de error (si hay):**

**Salida de patrol:**

**Configuración relevante (redactada):**

**Paquete de logs:** (adjuntar archivo)
```

### Solicitud de funcionalidad

```markdown
## Solicitud de funcionalidad

**Problema:** ¿Qué estás tratando de hacer que no puedes hacer hoy?

**Solución propuesta:** ¿Cómo crees que debería funcionar?

**Alternativas consideradas:** ¿Qué más intentaste?
```

### Pregunta / Solicitud de soporte

Si no estás seguro de si algo es un error o simplemente estás atascado, usa [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) en lugar de Issues. Las discusiones son mejores para preguntas que pueden no tener una única respuesta correcta.

## Qué NO incluir

- **API keys o contraseñas en crudo.** Siempre redacta.
- **Datos personales de conversaciones.** Redacta nombres, emails, números de teléfono.
- **Archivos de log completos en línea.** Adjunta el paquete de logs como archivo en lugar de pegar miles de líneas.

## Después de reportar

- **Revisa las preguntas de seguimiento.** Los mantenedores pueden necesitar más información.
- **Prueba las correcciones.** Si se publica una corrección, puede que te pidan que la verifiques.
- **Cierra el issue** si encuentras la solución tú mismo. Publica la solución para que otros se beneficien.
