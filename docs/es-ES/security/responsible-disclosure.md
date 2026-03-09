---
title: Política de divulgación responsable
description: Cómo informar sobre vulnerabilidades de seguridad en Triggerfish.
---

# Política de divulgación responsable

## Informar de una vulnerabilidad

**No abra un issue público en GitHub para vulnerabilidades de seguridad.**

Informe por correo electrónico:

```
security@trigger.fish
```

Por favor incluya:

- Descripción e impacto potencial
- Pasos para reproducir o prueba de concepto
- Versiones o componentes afectados
- Remediación sugerida, si la hay

## Plazo de respuesta

| Plazo     | Acción                                                  |
| --------- | ------------------------------------------------------- |
| 24 horas  | Acuse de recibo                                         |
| 72 horas  | Evaluación inicial y clasificación de severidad         |
| 14 días   | Corrección desarrollada y probada (severidad crítica/alta) |
| 90 días   | Ventana de divulgación coordinada                       |

Le pedimos que no divulgue públicamente antes de la ventana de 90 días o antes de que se publique una corrección, lo que ocurra primero.

## Alcance

### Dentro del alcance

- Aplicación central de Triggerfish
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Elusiones de la aplicación de políticas de seguridad (clasificación, seguimiento de taint,
  escritura descendente)
- Escapes del sandbox de plugins
- Elusiones de autenticación o autorización
- Violaciones de los límites de seguridad del MCP Gateway
- Fuga de secretos (credenciales apareciendo en registros, contexto o almacenamiento)
- Ataques de inyección de prompt que influyan exitosamente en decisiones deterministas de política
- Imágenes oficiales de Docker (cuando estén disponibles) y scripts de instalación

### Fuera del alcance

- Comportamiento del LLM que no elude la capa de política determinista (que el modelo
  diga algo incorrecto no es una vulnerabilidad si la capa de política bloqueó
  correctamente la acción)
- Skills o plugins de terceros no mantenidos por Triggerfish
- Ataques de ingeniería social contra empleados de Triggerfish
- Ataques de denegación de servicio
- Informes de escáneres automatizados sin impacto demostrado

## Puerto seguro (Safe Harbor)

La investigación de seguridad realizada de acuerdo con esta política está autorizada. No emprenderemos acciones legales contra investigadores que informen vulnerabilidades de buena fe. Le pedimos que haga un esfuerzo de buena fe para evitar violaciones de privacidad, destrucción de datos e interrupción del servicio.

## Reconocimiento

Acreditamos a los investigadores que informan vulnerabilidades válidas en nuestras notas de versión y avisos de seguridad, a menos que prefiera permanecer en el anonimato. Actualmente no ofrecemos un programa de recompensas por errores (bug bounty), pero podríamos introducir uno en el futuro.

## Clave PGP

Si necesita cifrar su informe, nuestra clave PGP para `security@trigger.fish` está publicada en
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
y en los principales servidores de claves.
