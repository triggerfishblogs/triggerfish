# Hemlighethantering

Triggerfish lagrar aldrig uppgifter i konfigurationsfiler. Alla hemligheter — API-nycklar, OAuth-tokens, integrationsuppgifter — lagras i plattformsinbyggd säker lagring: OS-nyckelringen för personlig nivå eller en vault-tjänst för företagsnivå. Plugins och agenter interagerar med uppgifter via SDK, som tillämpar strikta åtkomstkontroller.

## Lagringsbakends

| Nivå        | Backend           | Detaljer                                                                                           |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| **Personlig** | OS-nyckelring   | macOS Keychain, Linux Secret Service (via D-Bus), Windows Credential Manager                       |
| **Företag** | Vault-integration | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault eller andra företagsvault-tjänster           |

I båda fallen krypteras hemligheter i vila av lagringsbakenden. Triggerfish implementerar inte sin egen kryptering för hemligheter — det delegerar till ändamålsbyggda, granskade hemlighetlagringssystem.

På plattformar utan inbyggd nyckelring (Windows utan Credential Manager, Docker-containers) faller Triggerfish tillbaka till en krypterad JSON-fil på `~/.triggerfish/secrets.json`. Poster krypteras med AES-256-GCM med en maskbunden 256-bitars nyckel lagrad på `~/.triggerfish/secrets.key` (behörigheter: `0600`). Varje post använder en ny slumpmässig 12-byte IV vid varje skrivning. Äldre okrypterade hemlighetsfiler migreras automatiskt till det krypterade formatet vid första laddning.

::: tip Den personliga nivån kräver noll konfiguration för hemligheter. När du ansluter en integration under installation (`triggerfish dive`) lagras uppgifterna automatiskt i din OS-nyckelring. Du behöver inte installera eller konfigurera något utöver vad ditt operativsystem redan tillhandahåller. :::

## Hemlighetsreferenser i konfiguration

Triggerfish stöder `secret:`-referenser i `triggerfish.yaml`. Istället för att lagra uppgifter som klartext refererar du dem med namn och de löses från OS-nyckelringen vid start.

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

Resolvern utför en djupet-först-vandring av konfigurationsfilen. Vilket strängvärde som helst som börjar med `secret:` ersätts med motsvarande nyckelringpost. Om en refererad hemlighet inte hittas misslyckas start omedelbart med ett tydligt felmeddelande.

### Migrera befintliga hemligheter

Om du har klartextuppgifter i din konfigurationsfil från en tidigare version, flyttar migreringskommandot dem automatiskt till nyckelringen:

```bash
triggerfish config migrate-secrets
```

Det här kommandot:

1. Skannar `triggerfish.yaml` efter klartextuppgiftsvärden
2. Lagrar var och en i OS-nyckelringen
3. Ersätter klartestvärdet med en `secret:`-referens
4. Skapar en säkerhetskopia av originalfilen

::: warning Efter migrering, verifiera att din agent startar korrekt innan du tar bort säkerhetskopian. Migreringen är inte reversibel utan säkerhetskopian. :::

## Delegerad uppgiftsarkitektur

En kärnssäkerhetsprincip i Triggerfish är att datafrågor körs med **användarens** uppgifter, inte systemuppgifter. Det säkerställer att agenten ärver källsystemets behörighetsmodell — en användare kan bara komma åt data de kunde komma åt direkt.

<img src="/diagrams/delegated-credentials.svg" alt="Delegerad uppgiftsarkitektur: Användaren ger OAuth-medgivande, agenten frågar med användarens token, källsystemet tillämpar behörigheter" style="max-width: 100%;" />

Den här arkitekturen innebär:

- **Ingen överprivilegiering** — agenten kan inte komma åt data som användaren inte kan komma åt direkt
- **Inga systemtjänstkonton** — det finns ingen allsmäktig uppgift som kan komprometteras
- **Källsystemstillämpning** — källsystemet (Salesforce, Jira, GitHub osv.) tillämpar sina egna behörigheter på varje fråga

::: warning SÄKERHET Traditionella AI-agentplattformar använder ofta ett enda systemtjänstkonto för att komma åt integrationer å alla användares vägnar. Det innebär att agenten har åtkomst till all data i integrationen och förlitar sig på LLM:en för att avgöra vad som ska visas för varje användare. Triggerfish eliminerar denna risk helt: frågor körs med användarens egna delegerade OAuth-token. :::

## Plugin SDK-tillämpning

Plugins interagerar med uppgifter uteslutande via Triggerfish SDK. SDK tillhandahåller behörighetsmedvetna metoder och blockerar försök att komma åt systemuppgifter.

### Tillåtet: Användaruppgiftsåtkomst

```python
def get_user_opportunities(sdk, params):
    # SDK hämtar användarens delegerade token från säker lagring
    # Om användaren inte har anslutit Salesforce returneras ett hjälpsamt fel
    user_token = sdk.get_user_credential("salesforce")

    # Fråga körs med användarens behörigheter
    # Källsystemet tillämpar åtkomstkontroll
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Blockerat: Systemuppgiftsåtkomst

```python
def get_all_opportunities(sdk, params):
    # Det här höjer PermissionError — BLOCKERAT av SDK
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` är alltid blockerat. Det finns ingen konfiguration för att aktivera det, ingen admin-åsidosättning och ingen undantagslucka. Det här är en fast säkerhetsregel, samma som nedskrivningsregeln. :::

## LLM-anropbara hemlighetverktyg

Agenten kan hjälpa dig hantera hemligheter via tre verktyg. Kritiskt nog ser LLM:en aldrig de faktiska hemlighetvärdena — inmatning och lagring sker utanför bandet.

### `secret_save`

Uppmanar dig att ange ett hemlighetvärde säkert:

- **CLI**: Terminalen växlar till dolt inmatningsläge (tecken ekas inte)
- **Tidepool**: En säker inmatningspopup visas i webbgränssnittet

LLM:en begär att en hemlighet sparas, men det faktiska värdet anges av dig via den säkra uppmaningen. Värdet lagras direkt i nyckelringen — det passerar aldrig genom LLM-kontexten.

### `secret_list`

Listar namnen på alla lagrade hemligheter. Exponerar aldrig värden.

### `secret_delete`

Tar bort en hemlighet med namn från nyckelringen.

### Verktygsargumentsubstitution

<div v-pre>

När agenten använder ett verktyg som behöver en hemlighet (till exempel att ange en API-nyckel i en MCP-servers miljövariabel) använder den syntaxen <span v-pre>`{{secret:namn}}`</span> i verktygsargument:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:min-api-token}}" }
```

Runtime löser <span v-pre>`{{secret:namn}}`</span>-referenser **under LLM-lagret** innan verktyget körs. Det lösta värdet visas aldrig i konversationshistorik eller loggar.

</div>

::: warning SÄKERHET <code v-pre>{{secret:namn}}</code>-substitutionen tillämpas av kod, inte av LLM:en. Även om LLM:en försökte logga eller returnera det lösta värdet skulle policylagret fånga försöket i `PRE_OUTPUT`-hooken. :::

### SDK-behörighetsmetoder

| Metod                                   | Beteende                                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | Returnerar användarens delegerade OAuth-token för den specificerade integrationen. Om användaren inte har anslutit integrationen returneras ett fel med instruktioner. |
| `sdk.query_as_user(integration, query)` | Kör en fråga mot integrationen med användarens delegerade uppgifter. Källsystemet tillämpar sina egna behörigheter.                                               |
| `sdk.get_system_credential(name)`       | **Alltid blockerat.** Höjer `PermissionError`. Loggas som en säkerhetshändelse.                                                                                   |
| `sdk.has_user_connection(integration)`  | Returnerar `true` om användaren har anslutit den specificerade integrationen, annars `false`. Exponerar inga uppgiftsdata.                                        |

## Behörighetsmedveten dataåtkomst

Den delegerade uppgiftsarkitekturen fungerar hand i hand med klassificeringssystemet. Även om en användare har behörighet att komma åt data i källsystemet styr Triggerfish klassificeringsregler vart den datan kan flöda efter att den hämtats.

<img src="/diagrams/secret-resolution-flow.svg" alt="Hemlighetslösningsflöde: konfigurationsfilreferenser löses från OS-nyckelringen under LLM-lagret" style="max-width: 100%;" />

**Exempel:**

```
Användare: "Sammanfatta Acme-affären och skicka till min fru"

Steg 1: Behörighetskontroll
  --> Användarens Salesforce-token används
  --> Salesforce returnerar Acme-möjlighet (användaren har åtkomst)

Steg 2: Klassificering
  --> Salesforce-data klassificerad som CONFIDENTIAL
  --> Session-taint eskalerar till CONFIDENTIAL

Steg 3: Utdatakontroll
  --> Frun = EXTERNAL-mottagare
  --> CONFIDENTIAL --> EXTERNAL: BLOCKERAD

Resultat: Data hämtad (användaren har behörighet), men kan inte skickas
          (klassificeringsregler förhindrar intrång)
```

Användaren har legitim åtkomst till Acme-affären i Salesforce. Triggerfish respekterar det och hämtar datan. Men klassificeringssystemet förhindrar att den datan flödar till en extern mottagare. Behörighet att komma åt data är separat från behörighet att dela den.

## Hemlighetåtkomstloggning

Varje uppgiftsåtkomst loggas via `SECRET_ACCESS`-hanteringshookен:

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

Blockerade försök loggas också:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "Systemuppgiftsåtkomst är förbjudet",
    "plugin_id": "plugin_789"
  }
}
```

::: info Blockerade uppgiftsåtkomstförsök loggas på en förhöjd varningsnivå. I företagsdriftsättningar kan dessa händelser utlösa notifieringar till säkerhetsteamet. :::

## Företagsvault-integration

Företagsdriftsättningar kan ansluta Triggerfish till en centraliserad vault-tjänst för uppgiftshantering:

| Vault-tjänst        | Integration                          |
| ------------------- | ------------------------------------ |
| HashiCorp Vault     | Inbyggd API-integration              |
| AWS Secrets Manager | AWS SDK-integration                  |
| Azure Key Vault     | Azure SDK-integration                |
| Anpassad vault      | Pluggbart `SecretProvider`-gränssnitt |

Företagsvault-integration ger:

- **Centraliserad rotation** — uppgifter roteras i vault och hämtas automatiskt av Triggerfish
- **Åtkomstpolicyer** — vault-nivåpolicyer styr vilka agenter och användare som kan komma åt vilka uppgifter
- **Revisionskonsolidering** — uppgiftsåtkomstloggar från Triggerfish och vault kan korreleras

## Vad som aldrig lagras i konfigurationsfiler

Följande visas aldrig som klartextvärden i `triggerfish.yaml` eller någon annan konfigurationsfil. De lagras antingen i OS-nyckelringen och refereras via `secret:`-syntax, eller hanteras via `secret_save`-verktyget:

- API-nycklar för LLM-leverantörer
- OAuth-tokens för integrationer
- Databasuppgifter
- Webhook-hemligheter
- Krypteringsnycklar
- Parningskoder (efemera, bara i minnet)

::: danger Om du hittar klartextuppgifter i en Triggerfish-konfigurationsfil (värden som INTE är `secret:`-referenser) har något gått fel. Kör `triggerfish config migrate-secrets` för att flytta dem till nyckelringen. Uppgifter som hittas som klartext bör roteras omedelbart. :::

## Relaterade sidor

- [Säkerhetscentrerat design](./) — översikt över säkerhetsarkitekturen
- [Nedskrivningsregeln](./no-write-down) — hur klassificeringskontroller kompletterar uppgiftsisolering
- [Identitet och autentisering](./identity) — hur användaridentitet matar in i delegerad uppgiftsåtkomst
- [Revision och efterlevnad](./audit-logging) — hur uppgiftsåtkomsthändelser registreras
