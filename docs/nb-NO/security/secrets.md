# Hemmelighetshåndtering

Triggerfish lagrer aldri legitimasjon i konfigurasjonsfiler. Alle hemmeligheter — API-nøkler, OAuth-tokens, integrasjonslegitimasjon — lagres i plattforminnebygd sikker lagring: OS-nøkkelringen for personlig nivå, eller en vault-tjeneste for bedriftsnivå. Plugins og agenter samhandler med legitimasjon gjennom SDK-en, som håndhever strenge tilgangskontroller.

## Lagringsbackends

| Nivå           | Backend           | Detaljer                                                                                             |
| -------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| **Personlig**  | OS-nøkkelring     | macOS Keychain, Linux Secret Service (via D-Bus), Windows Credential Manager                         |
| **Bedrift**    | Vault-integrasjon | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault eller andre bedriftsvault-tjenester           |

I begge tilfeller er hemmeligheter kryptert i ro av lagringsbackenden. Triggerfish implementerer ikke sin egen kryptering for hemmeligheter — det delegerer til formålsbyggede, reviderte hemmelighetlagringstjenester.

På plattformer uten en native nøkkelring (Windows uten Credential Manager, Docker-containere), faller Triggerfish tilbake til en kryptert JSON-fil på `~/.triggerfish/secrets.json`. Oppføringer er kryptert med AES-256-GCM ved hjelp av en maskinbundet 256-bits nøkkel lagret på `~/.triggerfish/secrets.key` (tillatelser: `0600`). Hver oppføring bruker en frisk tilfeldig 12-byte IV ved hver skriving. Eldre klarteksthemmelighetsfiler migreres automatisk til det krypterte formatet ved første lasting.

::: tip Det personlige nivået krever null konfigurasjon for hemmeligheter. Når du kobler til en integrasjon under oppsett (`triggerfish dive`), lagres legitimasjon automatisk i OS-nøkkelringen. Du trenger ikke installere eller konfigurere noe utover det operativsystemet allerede gir. :::

## Hemmelighetreferanser i konfigurasjon

Triggerfish støtter `secret:`-referanser i `triggerfish.yaml`. I stedet for å lagre legitimasjon som klartekst, refererer du til dem ved navn og de løses fra OS-nøkkelringen ved oppstart.

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

Løseren utfører en dybde-første gjennomgang av konfigurasjonsfilen. Enhver strengverdi som starter med `secret:` erstattes med tilsvarende nøkkelringoppføring. Hvis en referert hemmelighet ikke finnes, mislykkes oppstart umiddelbart med en klar feilmelding.

### Migrering av eksisterende hemmeligheter

Hvis du har klartekstlegitimasjon i konfigurasjonsfilen din fra en tidligere versjon, flytter migreringskommandoen dem til nøkkelringen automatisk:

```bash
triggerfish config migrate-secrets
```

Denne kommandoen:

1. Skanner `triggerfish.yaml` for klartekstlegitimasjonsverdier
2. Lagrer hver enkelt i OS-nøkkelringen
3. Erstatter klartekstverdien med en `secret:`-referanse
4. Oppretter en sikkerhetskopi av originalfilen

::: warning Etter migrering, verifiser at agenten din starter riktig før du sletter sikkerhetskopifilen. Migreringen er ikke reversibel uten sikkerhetskopien. :::

## Delegert legitimasjonsarkitektur

Et kjernesikkerhetsprinsipp i Triggerfish er at dataspørringer kjøres med **brukerens** legitimasjon, ikke systemlegitimasjon. Dette sikrer at agenten arver kildesystemets tillatelsesmodell — en bruker kan bare aksessere data de kunne aksessere direkte.

<img src="/diagrams/delegated-credentials.svg" alt="Delegert legitimasjonsarkitektur: Bruker gir OAuth-samtykke, agent spør med brukerens token, kildesystem håndhever tillatelser" style="max-width: 100%;" />

Denne arkitekturen betyr:

- **Ingen over-tillatelseser** — agenten kan ikke aksessere data brukeren ikke kan aksessere direkte
- **Ingen system-tjenestekontoer** — det finnes ingen allsterk legitimasjon som kan kompromitteres
- **Kildesystem-håndhevelse** — kildesystemet (Salesforce, Jira, GitHub osv.) håndhever egne tillatelser på hver spørring

::: warning SIKKERHET Tradisjonelle AI-agentplattformer bruker ofte en enkelt system-tjenestekonto for å aksessere integrasjoner på vegne av alle brukere. Dette betyr at agenten har tilgang til alle data i integrasjonen, og stoler på LLM-en for å bestemme hva som skal vises til hver bruker. Triggerfish eliminerer denne risikoen fullstendig: spørringer kjøres med brukerens eget delegerte OAuth-token. :::

## Plugin SDK-håndhevelse

Plugins samhandler med legitimasjon utelukkende gjennom Triggerfish SDK. SDK-en gir tillatelsesbevisste metoder og blokkerer alle forsøk på å aksessere systemlegitimasjon.

### Tillatt: Brukertilgang til legitimasjon

```python
def get_user_opportunities(sdk, params):
    # SDK henter brukerens delegerte token fra sikker lagring
    # Hvis brukeren ikke har koblet til Salesforce, returnerer nyttig feil
    user_token = sdk.get_user_credential("salesforce")

    # Spørring kjøres med brukerens tillatelser
    # Kildesystem håndhever tilgangskontroll
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Blokkert: Systemlegitimasjonstilgang

```python
def get_all_opportunities(sdk, params):
    # Dette vil kaste PermissionError -- BLOKKERT av SDK
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` er alltid blokkert. Det finnes ingen konfigurasjon for å aktivere det, ingen admin-overstyring og ingen unntak. Dette er en fast sikkerhetsregel, akkurat som no-write-down-regelen. :::

## LLM-kallbare hemmelighetverktøy

Agenten kan hjelpe deg med å administrere hemmeligheter gjennom tre verktøy. Kritisk nok ser LLM-en aldri de faktiske hemmelighetverdiene — inndata og lagring skjer out-of-band.

### `secret_save`

Ber deg om å skrive inn en hemmelighetverdi sikkert:

- **CLI**: Terminalen bytter til skjult inndatamodus (tegn ekkes ikke)
- **Tidepool**: Et sikkert inndata-popup vises i nettgrensesnittet

LLM-en ber om at en hemmelighet lagres, men den faktiske verdien skrives inn av deg gjennom den sikre prompten. Verdien lagres direkte i nøkkelringen — den passerer aldri gjennom LLM-konteksten.

### `secret_list`

Lister navnene på alle lagrede hemmeligheter. Eksponerer aldri verdier.

### `secret_delete`

Sletter en hemmelighet etter navn fra nøkkelringen.

### Verktøyargumentsubstitusjon

<div v-pre>

Når agenten bruker et verktøy som trenger en hemmelighet (for eksempel å sette en API-nøkkel i en MCP-servermiljøvariabel), bruker den <span v-pre>`{{secret:navn}}`</span>-syntaksen i verktøyargumenter:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:min-api-token}}" }
```

Kjøretiden løser <span v-pre>`{{secret:navn}}`</span>-referanser **under LLM-laget** før verktøyet utfører. Den løste verdien vises aldri i samtalehistorikk eller logger.

</div>

::: warning SIKKERHET <code v-pre>{{secret:navn}}</code>-substitusjonen håndheves av kode, ikke av LLM-en. Selv om LLM-en forsøkte å logge eller returnere den løste verdien, ville policy-laget fange forsøket i `PRE_OUTPUT`-hooken. :::

### SDK-tillatelsesmetoder

| Metode                                  | Atferd                                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | Returnerer brukerens delegerte OAuth-token for den angitte integrasjonen. Hvis brukeren ikke har koblet til integrasjonen, returneres en feil med instruksjoner. |
| `sdk.query_as_user(integration, query)` | Utfører en spørring mot integrasjonen ved hjelp av brukerens delegerte legitimasjon. Kildesystemet håndhever egne tillatelser.                                  |
| `sdk.get_system_credential(name)`       | **Alltid blokkert.** Kaster `PermissionError`. Logget som en sikkerhetshendelse.                                                                                |
| `sdk.has_user_connection(integration)`  | Returnerer `true` hvis brukeren har koblet til den angitte integrasjonen, `false` ellers. Eksponerer ingen legitimasjonsdata.                                   |

## Tillatelsesbevisst datatilgang

Den delegerte legitimasjonsarkitekturen fungerer hånd i hånd med klassifiseringssystemet. Selv om en bruker har tillatelse til å aksessere data i kildesystemet, styrer Triggerfish klassifiseringsregler hvor disse dataene kan flyte etter at de er hentet.

<img src="/diagrams/secret-resolution-flow.svg" alt="Hemmelighetoppløsningsflyt: konfigurasjonsfilen referanser løst fra OS-nøkkelringen under LLM-laget" style="max-width: 100%;" />

**Eksempel:**

```
Bruker: "Oppsummer Acme-avtalen og send til kona mi"

Trinn 1: Tillatelsessjekk
  --> Brukerens Salesforce-token brukes
  --> Salesforce returnerer Acme-mulighet (bruker har tilgang)

Trinn 2: Klassifisering
  --> Salesforce-data klassifisert som CONFIDENTIAL
  --> Session taint eskalerer til CONFIDENTIAL

Trinn 3: Utdatasjekk
  --> Kona = EXTERNAL mottaker
  --> CONFIDENTIAL --> EXTERNAL: BLOKKERT

Resultat: Data hentet (bruker har tillatelse), men kan ikke sendes
          (klassifiseringsregler forhindrer lekkasje)
```

Brukeren har legitim tilgang til Acme-avtalen i Salesforce. Triggerfish respekterer det og henter dataene. Men klassifiseringssystemet forhindrer at disse dataene flyter til en ekstern mottaker. Tillatelse til å aksessere data er atskilt fra tillatelse til å dele det.

## Logging av hemmelighetstilgang

Hver legitimasjonstilgang logges gjennom `SECRET_ACCESS`-håndhevelseshooken:

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

Blokkerte forsøk logges også:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "Systemlegitimasjonstilgang er forbudt",
    "plugin_id": "plugin_789"
  }
}
```

::: info Blokkerte legitimasjonstilgangsforsøk logges på et forhøyet varselnivå. I bedriftsdistribusjoner kan disse hendelsene utløse varsler til sikkerhetsteamet. :::

## Bedrifts vault-integrasjon

Bedriftsdistribusjoner kan koble Triggerfish til en sentralisert vault-tjeneste for legitimasjonsadministrasjon:

| Vault-tjeneste      | Integrasjon                         |
| ------------------- | ----------------------------------- |
| HashiCorp Vault     | Innebygd API-integrasjon            |
| AWS Secrets Manager | AWS SDK-integrasjon                 |
| Azure Key Vault     | Azure SDK-integrasjon               |
| Tilpasset vault     | Pluggbart `SecretProvider`-grensesnitt |

Bedrifts vault-integrasjon gir:

- **Sentralisert rotasjon** — legitimasjon roteres i vault og hentes automatisk av Triggerfish
- **Tilgangspolicyer** — vault-nivåpolicyer kontrollerer hvilke agenter og brukere som kan aksessere hvilken legitimasjon
- **Revisjonskonsolidering** — legitimasjonstilgangslogger fra Triggerfish og vault kan korreleres

## Hva som aldri lagres i konfigurasjonsfiler

Følgende vises aldri som klartekstverdier i `triggerfish.yaml` eller andre konfigurasjonsfiler. De er enten lagret i OS-nøkkelringen og referert via `secret:`-syntaks, eller administrert gjennom `secret_save`-verktøyet:

- API-nøkler for LLM-leverandører
- OAuth-tokens for integrasjoner
- Databaselegitimasjon
- Webhook-hemmeligheter
- Krypteringsnøkler
- Paringskoder (flyktige, kun i minnet)

::: danger Hvis du finner klartekstlegitimasjon i en Triggerfish-konfigurasjonsfil (verdier som IKKE er `secret:`-referanser), har noe gått galt. Kjør `triggerfish config migrate-secrets` for å flytte dem til nøkkelringen. Legitimasjon funnet som klartekst bør roteres umiddelbart. :::

## Relaterte sider

- [Sikkerhetsfokusert design](./) — oversikt over sikkerhetsarkitekturen
- [No-Write-Down-regelen](./no-write-down) — hvordan klassifiseringskontroller utfyller legitimasjonstolasjon
- [Identitet og autentisering](./identity) — hvordan brukeridentitet mater inn i delegert legitimasjonstilgang
- [Revisjon og samsvar](./audit-logging) — hvordan legitimasjonstilgangshendelser registreres
