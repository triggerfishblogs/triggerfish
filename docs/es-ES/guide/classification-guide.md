# Eleccion de niveles de clasificacion

Cada canal, servidor MCP, integracion y plugin en Triggerfish debe tener un
nivel de clasificacion. Esta pagina le ayuda a elegir el adecuado.

## Los cuatro niveles

| Nivel            | Que significa                                          | Los datos fluyen a...              |
| ---------------- | ------------------------------------------------------ | ---------------------------------- |
| **PUBLIC**       | Seguro para que cualquiera lo vea                      | Cualquier lugar                    |
| **INTERNAL**     | Solo para usted — nada sensible, pero no publico       | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Contiene datos sensibles que nunca querria que se filtraran | CONFIDENTIAL, RESTRICTED       |
| **RESTRICTED**   | Lo mas sensible — legal, medico, financiero, PII       | Solo RESTRICTED                    |

Los datos solo pueden fluir **hacia arriba o lateralmente**, nunca hacia abajo.
Esta es la [regla de no write-down](/es-ES/security/no-write-down) y no puede
anularse.

## Dos preguntas que debe hacerse

Para cualquier integracion que este configurando, pregunte:

**1. Cual es el dato mas sensible que esta fuente podria devolver?**

Esto determina el nivel de clasificacion **minimo**. Si un servidor MCP pudiera
devolver datos financieros, debe ser al menos CONFIDENTIAL — incluso si la
mayoria de sus herramientas devuelven metadatos inofensivos.

**2. Me sentiria comodo si los datos de sesion fluyeran _hacia_ este destino?**

Esto determina el nivel de clasificacion **maximo** que desearia asignar. Una
clasificacion mas alta significa que el taint de sesion se escala al utilizarlo,
lo que restringe a donde pueden fluir los datos posteriormente.

## Clasificacion por tipo de dato

| Tipo de dato                                  | Nivel recomendado | Por que                                    |
| --------------------------------------------- | ----------------- | ------------------------------------------ |
| Tiempo, paginas web publicas, zonas horarias  | **PUBLIC**        | Disponible libremente para cualquiera      |
| Notas personales, marcadores, listas de tareas | **INTERNAL**     | Privado pero no danino si se expone        |
| Wikis internas, documentos de equipo, tableros | **INTERNAL**     | Informacion interna de la organizacion     |
| Email, eventos de calendario, contactos       | **CONFIDENTIAL**  | Contiene nombres, horarios, relaciones     |
| Datos CRM, pipeline de ventas, registros de clientes | **CONFIDENTIAL** | Datos sensibles de negocio, datos de clientes |
| Registros financieros, cuentas bancarias, facturas | **CONFIDENTIAL** | Informacion monetaria                   |
| Repositorios de codigo fuente (privados)      | **CONFIDENTIAL**  | Propiedad intelectual                      |
| Historiales medicos o de salud                 | **RESTRICTED**    | Protegidos legalmente (HIPAA, etc.)        |
| Numeros de identificacion, DNI, pasaportes    | **RESTRICTED**    | Riesgo de robo de identidad                |
| Documentos legales, contratos bajo NDA        | **RESTRICTED**    | Exposicion legal                           |
| Claves de cifrado, credenciales, secretos     | **RESTRICTED**    | Riesgo de compromiso del sistema           |

## Servidores MCP

Al anadir un servidor MCP a `triggerfish.yaml`, la clasificacion determina dos
cosas:

1. **Taint de sesion** — llamar a cualquier herramienta en este servidor escala
   la sesion a este nivel
2. **Prevencion de write-down** — una sesion ya contaminada por encima de este
   nivel no puede enviar datos _a_ este servidor

```yaml
mcp_servers:
  # PUBLIC — datos abiertos, sin sensibilidad
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — su propio sistema de ficheros, privado pero no secreto
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — accede a repositorios privados, issues de clientes
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — base de datos con PII, historiales medicos, documentos legales
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning DENEGACION POR DEFECTO Si omite `classification`, el servidor se
registra como **UNTRUSTED** y el Gateway rechaza todas las llamadas a
herramientas. Debe elegir un nivel explicitamente. :::

### Clasificaciones comunes de servidores MCP

| Servidor MCP                      | Nivel sugerido  | Razonamiento                                         |
| --------------------------------- | --------------- | ---------------------------------------------------- |
| Sistema de ficheros (docs publicos)     | PUBLIC    | Solo expone ficheros disponibles publicamente        |
| Sistema de ficheros (directorio personal) | INTERNAL | Ficheros personales, nada secreto                   |
| Sistema de ficheros (proyectos de trabajo) | CONFIDENTIAL | Puede contener codigo o datos propietarios       |
| GitHub (solo repositorios publicos)     | INTERNAL  | El codigo es publico pero los patrones de uso son privados |
| GitHub (repositorios privados)          | CONFIDENTIAL | Codigo fuente propietario                       |
| Slack                                   | CONFIDENTIAL | Conversaciones laborales, posiblemente sensibles |
| Base de datos (analisis/informes)       | CONFIDENTIAL | Datos de negocio agregados                      |
| Base de datos (produccion con PII)      | RESTRICTED | Contiene informacion de identificacion personal  |
| Tiempo / hora / calculadora            | PUBLIC     | Sin datos sensibles                              |
| Busqueda web                           | PUBLIC     | Devuelve informacion disponible publicamente     |
| Email                                  | CONFIDENTIAL | Nombres, conversaciones, adjuntos               |
| Google Drive                           | CONFIDENTIAL | Los documentos pueden contener datos de negocio sensibles |

## Canales

La clasificacion de canal determina el **techo** — la sensibilidad maxima de
los datos que pueden entregarse a ese canal.

```yaml
channels:
  cli:
    classification: INTERNAL # Su terminal local — seguro para datos internos
  telegram:
    classification: INTERNAL # Su bot privado — igual que CLI para el propietario
  webchat:
    classification: PUBLIC # Visitantes anonimos — solo datos publicos
  email:
    classification: CONFIDENTIAL # El email es privado pero podria reenviarse
```

::: tip PROPIETARIO vs. NO PROPIETARIO Para el **propietario**, todos los
canales tienen el mismo nivel de confianza — usted es usted, independientemente
de la aplicacion que utilice. La clasificacion de canal importa principalmente
para los **usuarios no propietarios** (visitantes en webchat, miembros en un
canal de Slack, etc.) donde controla que datos pueden fluir hacia ellos. :::

### Eleccion de la clasificacion de canal

| Pregunta                                                                       | Si la respuesta es si...  | Si la respuesta es no...  |
| ------------------------------------------------------------------------------ | ------------------------- | ------------------------- |
| Podria un extrano ver los mensajes en este canal?                              | **PUBLIC**                | Siga leyendo              |
| Este canal es solo para usted personalmente?                                   | **INTERNAL** o superior   | Siga leyendo              |
| Podrian los mensajes ser reenviados, capturados o registrados por un tercero?  | Limite a **CONFIDENTIAL** | Podria ser **RESTRICTED** |
| El canal esta cifrado de extremo a extremo y bajo su control total?            | Podria ser **RESTRICTED** | Limite a **CONFIDENTIAL** |

## Que ocurre cuando se equivoca

**Demasiado bajo (p. ej., servidor CONFIDENTIAL marcado como PUBLIC):**

- Los datos de este servidor no escalaran el taint de sesion
- La sesion podria hacer fluir datos clasificados a canales publicos — **riesgo de fuga de datos**
- Esta es la direccion peligrosa

**Demasiado alto (p. ej., servidor PUBLIC marcado como CONFIDENTIAL):**

- El taint de sesion se escala innecesariamente al utilizar este servidor
- Se bloqueara el envio a canales de clasificacion inferior posteriormente
- Molesto pero **seguro** — es mejor errar por exceso

::: danger En caso de duda, **clasifique mas alto**. Siempre puede reducirlo
mas tarde tras revisar que datos devuelve realmente el servidor.
Infraclasificar es un riesgo de seguridad; sobreclasificar es solo una
inconveniencia. :::

## La cascada de taint

Comprender el impacto practico le ayuda a elegir sabiamente. Esto es lo que
sucede en una sesion:

```
1. La sesion comienza en PUBLIC
2. Pregunta sobre el tiempo (servidor PUBLIC)      → taint permanece PUBLIC
3. Revisa sus notas (sistema de ficheros INTERNAL) → taint escala a INTERNAL
4. Consulta issues de GitHub (CONFIDENTIAL)        → taint escala a CONFIDENTIAL
5. Intenta publicar en webchat (canal PUBLIC)      → BLOQUEADO (violacion de write-down)
6. Reinicia la sesion                              → taint vuelve a PUBLIC
7. Publica en webchat                              → permitido
```

Si utiliza frecuentemente una herramienta CONFIDENTIAL seguida de un canal
PUBLIC, estara reiniciando a menudo. Considere si la herramienta realmente
necesita ser CONFIDENTIAL, o si el canal podria reclasificarse.

## Rutas del sistema de ficheros

Tambien puede clasificar rutas individuales del sistema de ficheros, lo cual es
util cuando su agente tiene acceso a directorios con sensibilidad mixta:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## Lista de verificacion

Antes de poner en produccion una nueva integracion:

- [ ] Cual es el peor dato que esta fuente podria devolver? Clasifique a ese nivel.
- [ ] La clasificacion es al menos tan alta como sugiere la tabla de tipos de datos?
- [ ] Si es un canal, la clasificacion es apropiada para todos los posibles destinatarios?
- [ ] Ha probado que la cascada de taint funciona para su flujo de trabajo tipico?
- [ ] En caso de duda, ha clasificado mas alto en lugar de mas bajo?

## Paginas relacionadas

- [Regla de no write-down](/es-ES/security/no-write-down) — la regla fija de flujo de datos
- [Configuracion](/es-ES/guide/configuration) — referencia completa de YAML
- [MCP Gateway](/integrations/mcp-gateway) — modelo de seguridad de servidores MCP
