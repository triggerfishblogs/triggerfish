# Plugin SDK et sandbox

Les plugins Triggerfish vous permettent d'etendre l'agent avec du code
personnalise qui interagit avec des systemes externes -- requetes CRM, operations
de base de donnees, integrations API, workflows multi-etapes -- tout en
s'executant dans un double sandbox qui empeche le code de faire quoi que ce soit
qui ne lui a pas ete explicitement autorise.

## Environnement d'execution

Les plugins s'executent sur Deno + Pyodide (WASM). Pas de Docker. Pas de
conteneurs. Aucun prerequis au-dela de l'installation de Triggerfish elle-meme.

- **Plugins TypeScript** s'executent directement dans le sandbox Deno
- **Plugins Python** s'executent dans Pyodide (un interpreteur Python compile en
  WebAssembly), qui lui-meme s'execute dans le sandbox Deno

<img src="/diagrams/plugin-sandbox.svg" alt="Sandbox du plugin : le sandbox Deno enveloppe le sandbox WASM, le code du plugin s'execute dans la couche la plus interne" style="max-width: 100%;" />

Cette architecture de double sandbox signifie que meme si un plugin contient du
code malveillant, il ne peut pas acceder au systeme de fichiers, effectuer des
appels reseau non declares ou s'echapper vers le systeme hote.

## Ce que les plugins peuvent faire

Les plugins ont un interieur flexible dans des limites strictes. A l'interieur du
sandbox, votre plugin peut :

- Effectuer des operations CRUD completes sur les systemes cibles (en utilisant
  les permissions de l'utilisateur)
- Executer des requetes complexes et des transformations de donnees
- Orchestrer des workflows multi-etapes
- Traiter et analyser des donnees
- Maintenir l'etat du plugin entre les invocations
- Appeler tout point de terminaison API externe declare

## Ce que les plugins ne peuvent pas faire

| Contrainte                                    | Comment elle est appliquee                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| Acceder a des points de terminaison reseau non declares | Le sandbox bloque tous les appels reseau hors de la liste blanche |
| Emettre des donnees sans label de classification | Le SDK rejette les donnees non classifiees                               |
| Lire des donnees sans propagation du taint     | Le SDK marque automatiquement la session lors de l'acces aux donnees       |
| Persister des donnees en dehors de Triggerfish | Aucun acces au systeme de fichiers depuis le sandbox                       |
| Exfiltrer via des canaux lateraux              | Limites de ressources appliquees, aucun acces aux sockets bruts           |
| Utiliser des identifiants systeme              | Le SDK bloque `get_system_credential()` ; identifiants utilisateur uniquement |

::: warning SECURITE `sdk.get_system_credential()` est **bloque** par conception.
Les plugins doivent toujours utiliser des identifiants utilisateur delegues via
`sdk.get_user_credential()`. Cela garantit que l'agent ne peut acceder qu'a ce
que l'utilisateur peut acceder -- jamais plus. :::

## Methodes du Plugin SDK

Le SDK fournit une interface controlee pour que les plugins interagissent avec les
systemes externes et la plateforme Triggerfish.

### Acces aux identifiants

```typescript
// Obtenir les identifiants delegues de l'utilisateur pour un service
const credential = await sdk.get_user_credential("salesforce");

// Verifier si l'utilisateur a connecte un service
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` recupere le token OAuth ou la cle API de
l'utilisateur pour le service nomme. Si l'utilisateur n'a pas connecte le service,
l'appel renvoie `null` et le plugin doit gerer cela gracieusement.

### Operations sur les donnees

```typescript
// Interroger un systeme externe en utilisant les permissions de l'utilisateur
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Emettre des donnees vers l'agent — le label de classification est OBLIGATOIRE
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info Chaque appel a `sdk.emitData()` necessite un label `classification`. Si
vous l'omettez, le SDK rejette l'appel. Cela garantit que toutes les donnees
provenant des plugins dans le contexte de l'agent sont correctement classifiees.
:::

### Verification de connexion

```typescript
// Verifier si l'utilisateur a une connexion active a un service
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## Cycle de vie des plugins

Chaque plugin suit un cycle de vie qui assure un examen de securite avant
l'activation.

```
1. Plugin cree (par l'utilisateur, l'agent ou un tiers)
       |
       v
2. Plugin construit avec le Plugin SDK
   - Doit implementer les interfaces requises
   - Doit declarer les points de terminaison et capacites
   - Doit passer la validation
       |
       v
3. Le plugin entre dans l'etat UNTRUSTED
   - L'agent NE PEUT PAS l'utiliser
   - Le proprietaire/administrateur est notifie : "En attente de classification"
       |
       v
4. Le proprietaire (personnel) ou l'administrateur (entreprise) examine :
   - A quelles donnees ce plugin accede-t-il ?
   - Quelles actions peut-il effectuer ?
   - Attribue un niveau de classification
       |
       v
5. Plugin actif au niveau de classification attribue
   - L'agent peut l'invoquer dans les contraintes de politique
   - Toutes les invocations passent par les hooks de politique
```

::: tip Au niveau personnel, vous etes le proprietaire -- vous examinez et
classifiez vos propres plugins. Au niveau entreprise, un administrateur gere le
registre des plugins et attribue les niveaux de classification. :::

## Connectivite aux bases de donnees

Les pilotes de base de donnees natifs (psycopg2, mysqlclient, etc.) ne
fonctionnent pas a l'interieur du sandbox WASM. Les plugins se connectent aux
bases de donnees via des API basees sur HTTP.

| Base de donnees | Option basee sur HTTP                     |
| --------------- | ----------------------------------------- |
| PostgreSQL      | PostgREST, Supabase SDK, Neon API         |
| MySQL           | PlanetScale API                           |
| MongoDB         | Atlas Data API                            |
| Snowflake       | REST API                                  |
| BigQuery        | REST API                                  |
| DynamoDB        | AWS SDK (HTTP)                            |

C'est un avantage en matiere de securite, pas une limitation. Tout acces aux bases
de donnees passe par des requetes HTTP inspectables et controlables que le sandbox
peut appliquer et que le systeme d'audit peut journaliser.

## Ecrire un plugin TypeScript

Un plugin TypeScript minimal qui interroge une API REST :

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // Verifier si l'utilisateur a connecte le service
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // Interroger en utilisant les identifiants de l'utilisateur
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // Emettre des donnees classifiees vers l'agent
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## Ecrire un plugin Python

Un plugin Python minimal :

```python
async def execute(sdk):
    # Verifier la connexion
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # Interroger en utilisant les identifiants de l'utilisateur
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # Emettre avec classification
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Les plugins Python s'executent dans le runtime Pyodide WASM. Les modules de la
bibliotheque standard sont disponibles, mais les extensions C natives ne le sont
pas. Utilisez des API basees sur HTTP pour la connectivite externe.

## Resume de la securite des plugins

- Les plugins s'executent dans un double sandbox (Deno + WASM) avec une isolation
  stricte
- Tout acces reseau doit etre declare dans le manifeste du plugin
- Toutes les donnees emises doivent porter un label de classification
- Les identifiants systeme sont bloques -- seuls les identifiants delegues par
  l'utilisateur sont disponibles
- Chaque plugin entre dans le systeme comme `UNTRUSTED` et doit etre classifie
  avant utilisation
- Toutes les invocations de plugins passent par les hooks de politique et sont
  entierement auditees
