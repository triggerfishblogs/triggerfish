# Cómo elegir niveles de clasificación

Cada canal, servidor MCP, integración y plugin en Triggerfish debe tener un
nivel de clasificación. Esta página te ayuda a elegir el correcto.

## Los cuatro niveles

| Nivel            | Qué significa                                           | Los datos fluyen hacia...      |
| ---------------- | ------------------------------------------------------- | ------------------------------ |
| **PUBLIC**       | Seguro para que cualquiera lo vea                       | Cualquier lugar                |
| **INTERNAL**     | Solo para tus ojos — nada sensible, pero no es público  | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Contiene datos sensibles que nunca querrías que se filtraran | CONFIDENTIAL, RESTRICTED      |
| **RESTRICTED**   | Lo más sensible — legal, médico, financiero, PII        | Solo RESTRICTED                |

Los datos solo pueden fluir **hacia arriba o lateralmente**, nunca hacia abajo. Esta es la
[regla de no write-down](/es-419/security/no-write-down) y no se puede anular.

## Dos preguntas que debes hacer

Para cualquier integración que estés configurando, pregunta:

**1. ¿Cuáles son los datos más sensibles que esta fuente podría devolver?**

Esto determina el nivel de clasificación **mínimo**. Si un servidor MCP podría
devolver datos financieros, debe ser al menos CONFIDENTIAL — incluso si la mayoría de sus
herramientas devuelven metadatos inofensivos.

**2. ¿Me sentiría cómodo si los datos de la sesión fluyeran _hacia_ este destino?**

Esto determina el nivel de clasificación **máximo** que querrías asignar. Una
clasificación más alta significa que el taint de la sesión se escala cuando lo usas, lo que
restringe hacia dónde pueden fluir los datos después.

## Clasificación por tipo de datos

| Tipo de datos                               | Nivel recomendado | Por qué                                       |
| ------------------------------------------- | ----------------- | ---------------------------------------------- |
| Clima, páginas web públicas, zonas horarias | **PUBLIC**        | Disponible libremente para cualquiera          |
| Tus notas personales, marcadores, listas de tareas | **INTERNAL** | Privado pero no dañino si se expone          |
| Wikis internos, documentos de equipo, tableros de proyecto | **INTERNAL** | Información interna de la organización    |
| Email, eventos de calendario, contactos     | **CONFIDENTIAL**  | Contiene nombres, horarios, relaciones         |
| Datos de CRM, pipeline de ventas, registros de clientes | **CONFIDENTIAL** | Datos sensibles de negocio, datos de clientes |
| Registros financieros, cuentas bancarias, facturas | **CONFIDENTIAL** | Información monetaria                     |
| Repositorios de código fuente (privados)    | **CONFIDENTIAL**  | Propiedad intelectual                          |
| Registros médicos o de salud                | **RESTRICTED**    | Protegidos legalmente (HIPAA, etc.)            |
| Números de identificación gubernamental, SSN, pasaportes | **RESTRICTED** | Riesgo de robo de identidad              |
| Documentos legales, contratos bajo NDA      | **RESTRICTED**    | Exposición legal                               |
| Claves de cifrado, credenciales, secrets    | **RESTRICTED**    | Riesgo de compromiso del sistema               |

## Servidores MCP

Al agregar un servidor MCP a `triggerfish.yaml`, la clasificación determina
dos cosas:

1. **Taint de sesión** — llamar a cualquier herramienta en este servidor escala la sesión a
   este nivel
2. **Prevención de write-down** — una sesión ya contaminada por encima de este nivel no puede
   enviar datos _hacia_ este servidor

```yaml
mcp_servers:
  # PUBLIC — datos abiertos, sin sensibilidad
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — tu propio sistema de archivos, privado pero sin secrets
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — accede a repos privados, issues de clientes
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — base de datos con PII, registros médicos, documentos legales
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning DENEGACIÓN POR DEFECTO Si omites `classification`, el servidor se registra
como **UNTRUSTED** y el gateway rechaza todas las llamadas a herramientas. Debes elegir
explícitamente un nivel. :::

### Clasificaciones comunes de servidores MCP

| Servidor MCP                    | Nivel sugerido  | Razonamiento                                       |
| ------------------------------- | --------------- | -------------------------------------------------- |
| Sistema de archivos (docs públicos) | PUBLIC       | Solo expone archivos disponibles públicamente      |
| Sistema de archivos (directorio home) | INTERNAL   | Archivos personales, nada secreto                  |
| Sistema de archivos (proyectos de trabajo) | CONFIDENTIAL | Puede contener código o datos propietarios    |
| GitHub (solo repos públicos)    | INTERNAL        | El código es público pero los patrones de uso son privados |
| GitHub (repos privados)         | CONFIDENTIAL    | Código fuente propietario                          |
| Slack                           | CONFIDENTIAL    | Conversaciones del trabajo, posiblemente sensibles |
| Base de datos (analítica/reportes) | CONFIDENTIAL | Datos de negocio agregados                         |
| Base de datos (producción con PII) | RESTRICTED   | Contiene información de identificación personal    |
| Clima / hora / calculadora      | PUBLIC          | Sin datos sensibles                                |
| Búsqueda web                    | PUBLIC          | Devuelve información disponible públicamente       |
| Email                           | CONFIDENTIAL    | Nombres, conversaciones, archivos adjuntos         |
| Google Drive                    | CONFIDENTIAL    | Los documentos pueden contener datos sensibles de negocio |

## Canales

La clasificación del canal determina el **techo** — la sensibilidad máxima de
los datos que se pueden entregar a ese canal.

```yaml
channels:
  cli:
    classification: INTERNAL # Tu terminal local — seguro para datos internos
  telegram:
    classification: INTERNAL # Tu bot privado — igual que CLI para el propietario
  webchat:
    classification: PUBLIC # Visitantes anónimos — solo datos públicos
  email:
    classification: CONFIDENTIAL # El email es privado pero podría ser reenviado
```

::: tip PROPIETARIO vs. NO PROPIETARIO Para el **propietario**, todos los canales tienen el mismo nivel
de confianza — eres tú, sin importar qué aplicación uses. La clasificación del canal
importa más para **usuarios no propietarios** (visitantes en webchat, miembros en un canal
de Slack, etc.) donde controla qué datos pueden fluir hacia ellos. :::

### Cómo elegir la clasificación del canal

| Pregunta                                                                 | Si sí...                | Si no...                |
| ------------------------------------------------------------------------ | ----------------------- | ----------------------- |
| ¿Podría un desconocido ver los mensajes en este canal?                   | **PUBLIC**              | Sigue leyendo           |
| ¿Este canal es solo para ti personalmente?                               | **INTERNAL** o superior | Sigue leyendo           |
| ¿Los mensajes podrían ser reenviados, capturados o registrados por terceros? | Limitar a **CONFIDENTIAL** | Podría ser **RESTRICTED** |
| ¿El canal tiene cifrado de extremo a extremo y está bajo tu control total? | Podría ser **RESTRICTED** | Limitar a **CONFIDENTIAL** |

## Qué pasa cuando te equivocas

**Demasiado bajo (ej., servidor CONFIDENTIAL marcado como PUBLIC):**

- Los datos de este servidor no escalarán el taint de sesión
- La sesión podría enviar datos clasificados a canales públicos — **riesgo de filtración de datos**
- Esta es la dirección peligrosa

**Demasiado alto (ej., servidor PUBLIC marcado como CONFIDENTIAL):**

- El taint de sesión se escala innecesariamente al usar este servidor
- Se te bloqueará el envío a canales de menor clasificación después
- Molesto pero **seguro** — es mejor errar hacia lo alto

::: danger Ante la duda, **clasifica más alto**. Siempre puedes bajarlo después
de revisar qué datos devuelve realmente el servidor. Sub-clasificar es un
riesgo de seguridad; sobre-clasificar es solo una inconveniencia. :::

## La cascada de taint

Entender el impacto práctico te ayuda a elegir sabiamente. Esto es lo que pasa
en una sesión:

```
1. La sesión inicia en PUBLIC
2. Preguntas sobre el clima (servidor PUBLIC)       → el taint se mantiene en PUBLIC
3. Revisas tus notas (sistema de archivos INTERNAL) → el taint escala a INTERNAL
4. Consultas issues de GitHub (CONFIDENTIAL)        → el taint escala a CONFIDENTIAL
5. Intentas publicar en webchat (canal PUBLIC)      → BLOQUEADO (violación de write-down)
6. Reinicias la sesión                              → el taint vuelve a PUBLIC
7. Publicas en webchat                              → permitido
```

Si frecuentemente usas una herramienta CONFIDENTIAL seguida de un canal PUBLIC, estarás
reiniciando seguido. Considera si la herramienta realmente necesita ser CONFIDENTIAL, o
si el canal podría reclasificarse.

## Rutas del sistema de archivos

También puedes clasificar rutas individuales del sistema de archivos, lo cual es útil cuando tu
agente tiene acceso a directorios con sensibilidad mixta:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## Lista de verificación

Antes de poner en producción una nueva integración:

- [ ] ¿Cuáles son los peores datos que esta fuente podría devolver? Clasifica a ese nivel.
- [ ] ¿La clasificación es al menos tan alta como la tabla de tipos de datos sugiere?
- [ ] Si es un canal, ¿la clasificación es apropiada para todos los posibles
      destinatarios?
- [ ] ¿Has probado que la cascada de taint funciona para tu flujo de trabajo típico?
- [ ] Ante la duda, ¿clasificaste más alto en lugar de más bajo?

## Páginas relacionadas

- [Regla de no write-down](/es-419/security/no-write-down) — la regla fija de flujo de datos
- [Configuración](/es-419/guide/configuration) — referencia completa de YAML
- [MCP Gateway](/es-419/integrations/mcp-gateway) — modelo de seguridad del servidor MCP
