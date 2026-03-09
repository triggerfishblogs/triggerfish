# Construir skills

Esta guía le guía paso a paso en la creación de un skill de Triggerfish desde
cero -- desde la escritura del fichero `SKILL.md` hasta las pruebas y la
aprobación.

## Qué construirá

Un skill es una carpeta que contiene un fichero `SKILL.md` que enseña al agente
cómo hacer algo. Al final de esta guía, tendrá un skill funcional que el agente
puede descubrir y utilizar.

## Anatomía de un skill

Cada skill es un directorio con un `SKILL.md` en su raíz:

```
my-skill/
  SKILL.md           # Obligatorio: frontmatter + instrucciones
  template.md        # Opcional: plantillas que referencia el skill
  helper.ts          # Opcional: código de soporte
```

El fichero `SKILL.md` tiene dos partes:

1. **Frontmatter YAML** (entre delimitadores `---`) -- metadatos sobre el skill
2. **Cuerpo markdown** -- las instrucciones que el agente lee

## Paso 1: Escribir el frontmatter

El frontmatter declara qué hace el skill, qué necesita y qué restricciones de
seguridad se aplican.

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

### Campos obligatorios

| Campo         | Descripción                                                    | Ejemplo         |
| ------------- | -------------------------------------------------------------- | --------------- |
| `name`        | Identificador único. Minúsculas, guiones para espacios.        | `github-triage` |
| `description` | Qué hace el skill y cuándo usarlo. 1-3 frases.                | Ver arriba      |

### Campos opcionales

| Campo                    | Descripción                                   | Por defecto |
| ------------------------ | --------------------------------------------- | ----------- |
| `classification_ceiling` | Nivel máximo de sensibilidad de datos          | `PUBLIC`    |
| `requires_tools`         | Herramientas que el skill necesita             | `[]`        |
| `network_domains`        | Dominios externos a los que accede el skill    | `[]`        |

Se pueden incluir campos adicionales como `version`, `category`, `tags` y
`triggers` para documentación y uso futuro. El cargador de skills ignorará
silenciosamente los campos que no reconozca.

### Elegir un techo de clasificación

El techo de clasificación es la sensibilidad máxima de datos que manejará su
skill. Elija el nivel más bajo que funcione:

| Nivel          | Cuándo usar                                      | Ejemplos                                                    |
| -------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `PUBLIC`       | Solo usa datos disponibles públicamente           | Búsqueda web, docs de API públicas, meteorología            |
| `INTERNAL`     | Trabaja con datos internos de proyecto             | Análisis de código, revisión de configuración, docs internos|
| `CONFIDENTIAL` | Maneja datos personales o privados                 | Resumen de correo, notificaciones de GitHub, consultas CRM  |
| `RESTRICTED`   | Accede a datos altamente sensibles                 | Gestión de claves, auditorías de seguridad, cumplimiento    |

::: warning Si el techo de su skill supera el techo configurado del usuario, la
API de autoría de skills lo rechazará. Use siempre el nivel mínimo necesario.
:::

## Paso 2: Escribir las instrucciones

El cuerpo markdown es lo que el agente lee para aprender cómo ejecutar el skill.
Hágalo accionable y específico.

### Plantilla de estructura

```markdown
# Nombre del Skill

Declaración de propósito en una línea.

## Cuándo usar

- Condición 1 (el usuario pide X)
- Condición 2 (activado por cron)
- Condición 3 (palabra clave relacionada detectada)

## Pasos

1. Primera acción con detalles específicos
2. Segunda acción con detalles específicos
3. Procesar y formatear los resultados
4. Entregar al canal configurado

## Formato de salida

Describir cómo deben formatearse los resultados.

## Errores comunes

- No hacer X porque Y
- Siempre comprobar Z antes de proceder
```

### Mejores prácticas

- **Comience con el propósito**: Una frase explicando qué hace el skill
- **Incluya "Cuándo usar"**: Ayuda al agente a decidir cuándo activar el skill
- **Sea específico**: "Obtener los últimos 24 horas de correos sin leer" es
  mejor que "Obtener correos"
- **Use ejemplos de código**: Muestre llamadas a API exactas, formatos de datos,
  patrones de comandos
- **Añada tablas**: Referencia rápida para opciones, endpoints, parámetros
- **Incluya gestión de errores**: Qué hacer cuando una llamada a API falla o
  faltan datos
- **Termine con "Errores comunes"**: Evita que el agente repita problemas
  conocidos

## Paso 3: Probar el descubrimiento

Verifique que su skill es detectable por el cargador de skills. Si lo colocó en
el directorio empaquetado:

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

Compruebe que:

- El skill aparece en la lista de descubiertos
- `name` coincide con el frontmatter
- `classificationCeiling` es correcto
- `requiresTools` y `networkDomains` están poblados

## Autoría del agente

El agente puede crear skills programáticamente usando la API `SkillAuthor`. Así
es como el agente se extiende a sí mismo cuando se le pide hacer algo nuevo.

### El flujo de trabajo

```
1. Usuario:  "Necesito que compruebes Notion en busca de nuevas tareas cada mañana"
2. Agente:   Usa SkillAuthor para crear un skill en su espacio de trabajo
3. Skill:    Entra en estado PENDING_APPROVAL
4. Usuario:  Recibe notificación, revisa el skill
5. Usuario:  Aprueba -> el skill se activa
6. Agente:   Conecta el skill al horario cron matutino
```

### Uso de la API SkillAuthor

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

### Estados de aprobación

| Estado             | Significado                                     |
| ------------------ | ----------------------------------------------- |
| `PENDING_APPROVAL` | Creado, esperando revisión del propietario       |
| `APPROVED`         | Propietario aprobó, el skill está activo          |
| `REJECTED`         | Propietario rechazó, el skill está inactivo       |

::: warning SEGURIDAD El agente no puede aprobar sus propios skills. Esto se
aplica a nivel de API. Todos los skills creados por el agente requieren
confirmación explícita del propietario antes de la activación. :::

## Escaneo de seguridad

Antes de la activación, los skills pasan por un escáner de seguridad que
comprueba patrones de inyección de prompt:

- "Ignore all previous instructions" -- inyección de prompt
- "You are now a..." -- redefinición de identidad
- "Reveal secrets/credentials" -- intentos de exfiltración de datos
- "Bypass security/policy" -- evasión de seguridad
- "Sudo/admin/god mode" -- escalada de privilegios

Los skills marcados por el escáner incluyen advertencias que el propietario debe
revisar antes de aprobar.

## Triggers

Los skills pueden definir triggers automáticos en su frontmatter:

```yaml
triggers:
  - cron: "0 7 * * *" # Cada día a las 7 AM
  - cron: "*/30 * * * *" # Cada 30 minutos
```

El planificador lee estas definiciones y despierta al agente en los momentos
especificados para ejecutar el skill. Puede combinar triggers con horas de
silencio en `triggerfish.yaml` para evitar la ejecución durante ciertos
períodos.

## Ejemplo completo

Aquí tiene un skill completo para el triaje de notificaciones de GitHub:

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

## Lista de verificación de skills

Antes de considerar un skill completo:

- [ ] El nombre de la carpeta coincide con `name` en el frontmatter
- [ ] La descripción explica **qué** y **cuándo** usarlo
- [ ] El techo de clasificación es el nivel más bajo que funciona
- [ ] Todas las herramientas necesarias están listadas en `requires_tools`
- [ ] Todos los dominios externos están listados en `network_domains`
- [ ] Las instrucciones son concretas y paso a paso
- [ ] Los ejemplos de código usan patrones de Triggerfish (tipos Result,
  funciones factoría)
- [ ] El formato de salida está especificado
- [ ] La sección de errores comunes está incluida
- [ ] El skill es detectable por el cargador (probado)
