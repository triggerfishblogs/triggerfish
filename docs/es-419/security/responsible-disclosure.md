---
title: Política de divulgación responsable
description: Cómo reportar vulnerabilidades de seguridad en Triggerfish.
---

# Política de divulgación responsable

## Reportar una vulnerabilidad

**No abra un issue público en GitHub para vulnerabilidades de seguridad.**

Reporte por correo electrónico:

```
security@trigger.fish
```

Por favor incluya:

- Descripción e impacto potencial
- Pasos para reproducir o prueba de concepto
- Versiones o componentes afectados
- Remediación sugerida, si la tiene

## Tiempos de respuesta

| Plazo    | Acción                                                      |
| -------- | ----------------------------------------------------------- |
| 24 horas | Acuse de recibo                                             |
| 72 horas | Evaluación inicial y clasificación de severidad             |
| 14 días  | Corrección desarrollada y probada (severidad crítica/alta)  |
| 90 días  | Ventana de divulgación coordinada                           |

Les pedimos que no divulguen públicamente antes de la ventana de 90 días o antes
de que se publique una corrección, lo que suceda primero.

## Alcance

### Dentro del alcance

- Aplicación principal de Triggerfish
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Elusión de la aplicación de políticas de seguridad (clasificación, seguimiento
  de taint, no write-down)
- Escapes del sandbox de plugins
- Elusión de autenticación o autorización
- Violaciones de los límites de seguridad del MCP Gateway
- Filtración de secretos (credenciales apareciendo en registros, contexto o
  almacenamiento)
- Ataques de prompt injection que logren influir en las decisiones de políticas
  determinísticas
- Imágenes oficiales de Docker (cuando estén disponibles) y scripts de
  instalación

### Fuera del alcance

- Comportamiento del LLM que no elude la capa de políticas determinística (que
  el modelo diga algo incorrecto no es una vulnerabilidad si la capa de
  políticas bloqueó correctamente la acción)
- Skills o plugins de terceros no mantenidos por Triggerfish
- Ataques de ingeniería social contra empleados de Triggerfish
- Ataques de denegación de servicio
- Reportes de escáneres automatizados sin impacto demostrado

## Puerto seguro

La investigación de seguridad realizada de acuerdo con esta política está
autorizada. No emprenderemos acciones legales contra investigadores que reporten
vulnerabilidades de buena fe. Les pedimos que hagan un esfuerzo de buena fe para
evitar violaciones de privacidad, destrucción de datos e interrupción del
servicio.

## Reconocimiento

Damos crédito a los investigadores que reportan vulnerabilidades válidas en
nuestras notas de versión y avisos de seguridad, a menos que prefieran
permanecer en el anonimato. Actualmente no ofrecemos un programa de
recompensas por errores (bug bounty), pero podríamos introducir uno en el
futuro.

## Clave PGP

Si necesita cifrar su reporte, nuestra clave PGP para `security@trigger.fish`
está publicada en
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
y en los principales servidores de claves.
