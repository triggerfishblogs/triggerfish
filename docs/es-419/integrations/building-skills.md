# Construir Skills

Esta guía los lleva paso a paso a crear un skill de Triggerfish desde cero --
desde escribir el archivo `SKILL.md` hasta probarlo y obtener aprobación.

## Qué Van a Construir

Un skill es una carpeta que contiene un archivo `SKILL.md` que le enseña al
agente cómo hacer algo. Al final de esta guía, tendrán un skill funcional que
el agente puede descubrir y usar.

## Anatomía de un Skill

Cada skill es un directorio con un `SKILL.md` en su raíz:

```
my-skill/
  SKILL.md           # Requerido: frontmatter + instrucciones
  template.md        # Opcional: plantillas que el skill referencia
  helper.ts          # Opcional: código de soporte
```

El archivo `SKILL.md` tiene dos partes:

1. **Frontmatter YAML** (entre delimitadores `---`) -- metadatos sobre el skill
2. **Cuerpo markdown** -- las instrucciones que el agente lee

## Paso 1: Escribir el Frontmatter

El frontmatter declara qué hace el skill, qué necesita y qué restricciones de
seguridad aplican.

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### Campos Requeridos

| Campo         | Descripción                                                    | Ejemplo         |
| ------------- | -------------------------------------------------------------- | --------------- |
| `name`        | Identificador único. Minúsculas, guiones en lugar de espacios. | `github-triage` |
| `description` | Qué hace el skill y cuándo usarlo. 1-3 oraciones.             | Ver arriba      |

### Campos Opcionales

| Campo                    | Descripción                                 | Predeterminado |
| ------------------------ | ------------------------------------------- | -------------- |
| `classification_ceiling` | Nivel máximo de sensibilidad de datos       | `PUBLIC`       |
| `requires_tools`         | Herramientas que el skill necesita           | `[]`           |
| `network_domains`        | Dominios externos que el skill accede        | `[]`           |

Se pueden incluir campos adicionales como `version`, `category`, `tags` y
`triggers` para documentación y uso futuro. El cargador de skills ignora
silenciosamente campos que no reconoce.

### Elegir un Techo de Clasificación

El techo de clasificación es la sensibilidad máxima de datos que su skill
manejará. Elijan el nivel más bajo que funcione:

| Nivel          | Cuándo Usar                                     | Ejemplos                                                 |
| -------------- | ----------------------------------------------- | -------------------------------------------------------- |
| `PUBLIC`       | Solo usa datos disponibles públicamente          | Búsqueda web, docs de API pública, clima                 |
| `INTERNAL`     | Trabaja con datos internos del proyecto           | Análisis de código, revisión de config, docs internas    |
| `CONFIDENTIAL` | Maneja datos personales o privados                | Resumen de email, notificaciones GitHub, consultas CRM   |
| `RESTRICTED`   | Accede a datos altamente sensibles                | Gestión de claves, auditorías de seguridad, cumplimiento |

::: warning Si el techo de su skill excede el techo configurado del usuario, la
API de autoría de skills lo rechazará. Siempre usen el nivel mínimo
necesario. :::

## Paso 2: Escribir las Instrucciones

El cuerpo markdown es lo que el agente lee para aprender cómo ejecutar el skill.
Hagan las instrucciones accionables y específicas.

### Plantilla de Estructura

```markdown
# Nombre del Skill

Declaración de propósito en una línea.

## Cuándo Usar

- Condición 1 (el usuario pide X)
- Condición 2 (activado por cron)
- Condición 3 (palabra clave relacionada detectada)

## Pasos

1. Primera acción con detalles específicos
2. Segunda acción con detalles específicos
3. Procesar y dar formato a los resultados
4. Entregar al canal configurado

## Formato de Salida

Describan cómo deben formatearse los resultados.

## Errores Comunes

- No hacer X porque Y
- Siempre verificar Z antes de proceder
```

### Mejores Prácticas

- **Comiencen con el propósito**: Una oración explicando qué hace el skill
- **Incluyan "Cuándo Usar"**: Ayuda al agente a decidir cuándo activar el skill
- **Sean específicos**: "Obtener los últimos 24 horas de correos no leídos" es
  mejor que "Obtener correos"
- **Usen ejemplos de código**: Muestren llamadas exactas a API, formatos de
  datos, patrones de comandos
- **Agreguen tablas**: Referencia rápida para opciones, endpoints, parámetros
- **Incluyan manejo de errores**: Qué hacer cuando falla una llamada a API o
  faltan datos
- **Terminen con "Errores Comunes"**: Evita que el agente repita problemas
  conocidos

## Paso 3: Probar el Descubrimiento

Verifiquen que su skill sea descubrible por el cargador de skills. Si lo
colocaron en el directorio incluido:

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

Verifiquen que:

- El skill aparezca en la lista descubierta
- `name` coincida con el frontmatter
- `classificationCeiling` sea correcto
- `requiresTools` y `networkDomains` estén poblados

## Autoría por el Agente

El agente puede crear skills programáticamente usando la API `SkillAuthor`. Así
es como el agente se extiende cuando se le pide hacer algo nuevo.

### El Flujo de Trabajo

```
1. Usuario:  "Necesito que revises Notion buscando nuevas tareas cada mañana"
2. Agente:   Usa SkillAuthor para crear un skill en su workspace
3. Skill:    Entra en estado PENDING_APPROVAL
4. Usuario:  Recibe notificación, revisa el skill
5. Usuario:  Aprueba → el skill se activa
6. Agente:   Conecta el skill al horario cron matutino
```

### Usando la API SkillAuthor

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them daily",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## When to Use

- Morning cron trigger
- User asks about pending tasks

## Steps

1. Fetch tasks from Notion API using the user's integration token
2. Filter for tasks created or updated in the last 24 hours
3. Categorize by priority (P0, P1, P2)
4. Format as a concise bullet-point summary
5. Deliver to the configured channel
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### Estados de Aprobación

| Estado             | Significado                                     |
| ------------------ | ----------------------------------------------- |
| `PENDING_APPROVAL` | Creado, esperando revisión del propietario       |
| `APPROVED`         | Propietario aprobó, el skill está activo         |
| `REJECTED`         | Propietario rechazó, el skill está inactivo      |

::: warning SEGURIDAD El agente no puede aprobar sus propios skills. Esto se
aplica a nivel de API. Todos los skills creados por el agente requieren
confirmación explícita del propietario antes de la activación. :::

## Escaneo de Seguridad

Antes de la activación, los skills pasan por un escáner de seguridad que
verifica patrones de inyección de prompt:

- "Ignore all previous instructions" -- inyección de prompt
- "You are now a..." -- redefinición de identidad
- "Reveal secrets/credentials" -- intentos de exfiltración de datos
- "Bypass security/policy" -- evasión de seguridad
- "Sudo/admin/god mode" -- escalación de privilegios

Los skills marcados por el escáner incluyen advertencias que el propietario debe
revisar antes de la aprobación.

## Triggers

Los skills pueden definir triggers automáticos en su frontmatter:

```yaml
triggers:
  - cron: "0 7 * * *" # Todos los días a las 7 AM
  - cron: "*/30 * * * *" # Cada 30 minutos
```

El programador lee estas definiciones y despierta al agente en los tiempos
especificados para ejecutar el skill. Pueden combinar triggers con horas
silenciosas en `triggerfish.yaml` para prevenir la ejecución durante ciertos
períodos.

## Ejemplo Completo

Aquí hay un skill completo para hacer triaje de notificaciones de GitHub:

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## Lista de Verificación del Skill

Antes de considerar un skill completo:

- [ ] El nombre de la carpeta coincide con `name` en el frontmatter
- [ ] La descripción explica **qué** y **cuándo** usar
- [ ] El techo de clasificación es el nivel más bajo que funciona
- [ ] Todas las herramientas requeridas están listadas en `requires_tools`
- [ ] Todos los dominios externos están listados en `network_domains`
- [ ] Las instrucciones son concretas y paso a paso
- [ ] Los ejemplos de código usan patrones de Triggerfish (tipos Result,
      funciones factory)
- [ ] El formato de salida está especificado
- [ ] La sección de errores comunes está incluida
- [ ] El skill es descubrible por el cargador (probado)
