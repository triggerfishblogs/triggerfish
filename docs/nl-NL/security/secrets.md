# Geheimenbeheer

Triggerfish slaat nooit inloggegevens op in configuratiebestanden. Alle geheimen — API-sleutels, OAuth-tokens, integratiereferenties — worden opgeslagen in platformnative beveiligde opslag: de OS-sleutelhanger voor het persoonlijke niveau, of een vaultservice voor het enterprise-niveau. Plugins en agents communiceren met inloggegevens via de SDK, die strikte toegangscontroles afdwingt.

## Opslagbackends

| Niveau         | Backend              | Details                                                                                           |
| -------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| **Persoonlijk** | OS-sleutelhanger    | macOS Keychain, Linux Secret Service (via D-Bus), Windows Credential Manager                     |
| **Enterprise** | Vault-integratie     | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault of andere enterprise-vaultservices          |

In beide gevallen worden geheimen in rust versleuteld door de opslagbackend. Triggerfish implementeert geen eigen versleuteling voor geheimen — het delegeert aan speciaal gebouwde, geauditeerde systemen voor geheime opslag.

Op platforms zonder native sleutelhanger (Windows zonder Credential Manager, Docker-containers) valt Triggerfish terug op een versleuteld JSON-bestand op `~/.triggerfish/secrets.json`. Vermeldingen worden versleuteld met AES-256-GCM met behulp van een machinevaste 256-bits sleutel opgeslagen op `~/.triggerfish/secrets.key` (rechten: `0600`). Elke vermelding gebruikt bij elke schrijfactie een vers willekeurig 12-byte IV. Verouderde plaintext-geheimbestanden worden automatisch gemigreerd naar het versleutelde formaat bij eerste laden.

::: tip Voor het persoonlijke niveau is nul configuratie vereist voor geheimen. Wanneer u een integratie verbindt tijdens de installatie (`triggerfish dive`), worden inloggegevens automatisch opgeslagen in uw OS-sleutelhanger. U hoeft niets te installeren of te configureren buiten wat uw besturingssysteem al biedt. :::

## Geheimverwijzingen in configuratie

Triggerfish ondersteunt `secret:`-verwijzingen in `triggerfish.yaml`. In plaats van inloggegevens als plaintext op te slaan, verwijst u ernaar op naam en worden ze bij het opstarten opgelost vanuit de OS-sleutelhanger.

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

De resolver voert een diepte-eerst doorloop van het configuratiebestand uit. Elke tekenreekswaarde die begint met `secret:` wordt vervangen door de corresponderende sleutelhangervermeldingen. Als een gerefereerd geheim niet wordt gevonden, mislukt het opstarten onmiddellijk met een duidelijke foutmelding.

### Bestaande geheimen migreren

Als u plaintext-inloggegevens in uw configuratiebestand heeft van een eerdere versie, verplaatst het migratieopdracht ze automatisch naar de sleutelhanger:

```bash
triggerfish config migrate-secrets
```

Dit opdracht:

1. Scant `triggerfish.yaml` op plaintext-inloggegevenswaarden
2. Slaat elk op in de OS-sleutelhanger
3. Vervangt de plaintextwaarde door een `secret:`-verwijzing
4. Maakt een back-up van het originele bestand

::: warning Na migratie, verifieer dat uw agent correct start voordat u het back-upbestand verwijdert. De migratie is niet omkeerbaar zonder de back-up. :::

## Gedelegeerde inloggegevensarchitectuur

Een kernbeveiligingsprincipe in Triggerfish is dat gegevensquery's worden uitgevoerd met de inloggegevens van de **gebruiker**, niet systeeminloggegevens. Dit zorgt ervoor dat de agent het toestemmingsmodel van het bronsysteem erft — een gebruiker heeft alleen toegang tot gegevens die hij ook direct kon benaderen.

<img src="/diagrams/delegated-credentials.svg" alt="Gedelegeerde inloggegevensarchitectuur: Gebruiker verleent OAuth-toestemming, agent voert query uit met token van gebruiker, bronsysteem handhaaft rechten" style="max-width: 100%;" />

Deze architectuur betekent:

- **Geen overmachtiging** — de agent heeft geen toegang tot gegevens die de gebruiker niet direct kan benaderen
- **Geen systeem-serviceaccounts** — er is geen almachtige referentie die gecompromitteerd kan worden
- **Handhaving door bronsysteem** — het bronsysteem (Salesforce, Jira, GitHub, enz.) handhaaft zijn eigen rechten bij elke query

::: warning BEVEILIGING Traditionele AI-agentplatforms gebruiken vaak een enkel systeem-serviceaccount om integraties namens alle gebruikers te benaderen. Dit betekent dat de agent toegang heeft tot alle gegevens in de integratie en vertrouwt op het LLM om te beslissen wat aan elke gebruiker wordt getoond. Triggerfish elimineert dit risico volledig: query's worden uitgevoerd met het eigen gedelegeerde OAuth-token van de gebruiker. :::

## Plugin SDK-handhaving

Plugins communiceren uitsluitend via de Triggerfish SDK met inloggegevens. De SDK biedt toestemmingsbewuste methoden en blokkeert elke poging om systeeminloggegevens te benaderen.

### Toegestaan: Toegang tot gebruikersinloggegevens

```python
def get_user_opportunities(sdk, params):
    # SDK haalt het gedelegeerde token van de gebruiker op uit beveiligde opslag
    # Als de gebruiker Salesforce niet heeft verbonden, geeft het een helpende fout terug
    user_token = sdk.get_user_credential("salesforce")

    # Query wordt uitgevoerd met toestemmingen van gebruiker
    # Bronsysteem handhaaft toegangscontrole
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Geblokkeerd: Toegang tot systeeminloggegevens

```python
def get_all_opportunities(sdk, params):
    # Dit geeft PermissionError -- GEBLOKKEERD door SDK
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` is altijd geblokkeerd. Er is geen configuratie om het in te schakelen, geen beheerdersoverschrijving en geen ontsnappingsluik. Dit is een vaste beveiligingsregel, hetzelfde als de no-write-down-regel. :::

## LLM-aanroepbare geheimtools

De agent kan u helpen geheimen te beheren via drie tools. Cruciaal is dat het LLM de werkelijke geheimwaarden nooit ziet — invoer en opslag vinden buiten het bereik plaats.

### `secret_save`

Vraagt u om een geheimwaarde veilig in te voeren:

- **CLI**: Terminal schakelt over naar verborgen invoermodus (tekens worden niet weergegeven)
- **Tidepool**: Een beveiligd invoervenster verschijnt in de webinterface

Het LLM vraagt om een geheim op te slaan, maar de werkelijke waarde wordt door u ingevoerd via de beveiligde prompt. De waarde wordt rechtstreeks opgeslagen in de sleutelhanger — het gaat nooit via de LLM-context.

### `secret_list`

Toont de namen van alle opgeslagen geheimen. Geeft nooit waarden bloot.

### `secret_delete`

Verwijdert een geheim op naam uit de sleutelhanger.

### Vervanging van toolargumenten

<div v-pre>

Wanneer de agent een tool gebruikt die een geheim nodig heeft (bijvoorbeeld het instellen van een API-sleutel in een MCP-serveromgevingsvariabele), gebruikt het de <span v-pre>`{{secret:name}}`</span>-syntaxis in toolargumenten:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

De runtime lost <span v-pre>`{{secret:name}}`</span>-verwijzingen **onder de LLM-laag** op voordat de tool wordt uitgevoerd. De opgeloste waarde verschijnt nooit in gespreksgeschiedenis of logboeken.

</div>

::: warning BEVEILIGING De <code v-pre>{{secret:name}}</code>-vervanging wordt afgedwongen door code, niet door het LLM. Zelfs als het LLM zou proberen de opgeloste waarde te registreren of terug te geven, zou de beleidslaag de poging onderscheppen in de `PRE_OUTPUT`-hook. :::

### SDK-toestemmingsmethoden

| Methode                                  | Gedrag                                                                                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`   | Geeft het gedelegeerde OAuth-token van de gebruiker terug voor de opgegeven integratie. Als de gebruiker de integratie niet heeft verbonden, geeft het een fout met instructies terug. |
| `sdk.query_as_user(integration, query)`  | Voert een query uit op de integratie met de gedelegeerde inloggegevens van de gebruiker. Het bronsysteem handhaaft zijn eigen rechten.                    |
| `sdk.get_system_credential(name)`        | **Altijd geblokkeerd.** Gooit `PermissionError`. Vastgelegd als beveiligingsgebeurtenis.                                                                 |
| `sdk.has_user_connection(integration)`   | Geeft `true` terug als de gebruiker de opgegeven integratie heeft verbonden, anders `false`. Stelt geen inloggegevensgegevens bloot.                     |

## Toestemmingsbewuste gegevenstoegang

De gedelegeerde inloggegevensarchitectuur werkt hand in hand met het classificatiesysteem. Zelfs als een gebruiker toestemming heeft om gegevens in het bronsysteem te benaderen, bepalen de classificatieregels van Triggerfish waar die gegevens naartoe kunnen stromen nadat ze zijn opgehaald.

<img src="/diagrams/secret-resolution-flow.svg" alt="Geheimoplossingsstroom: configuratiebestandverwijzingen worden opgelost vanuit OS-sleutelhanger onder de LLM-laag" style="max-width: 100%;" />

**Voorbeeld:**

```
Gebruiker: "Vat de Acme-deal samen en stuur naar mijn vrouw"

Stap 1: Toestemmingscontrole
  --> Token van Salesforce-gebruiker gebruikt
  --> Salesforce retourneert Acme-kans (gebruiker heeft toegang)

Stap 2: Classificatie
  --> Salesforce-gegevens geclassificeerd als CONFIDENTIAL
  --> Sessie-taint escaleert naar CONFIDENTIAL

Stap 3: Uitvoercontrole
  --> Vrouw = EXTERNAL-ontvanger
  --> CONFIDENTIAL --> EXTERNAL: GEBLOKKEERD

Resultaat: Gegevens opgehaald (gebruiker heeft toestemming), maar kunnen niet worden verzonden
           (classificatieregels voorkomen lekkage)
```

De gebruiker heeft legitieme toegang tot de Acme-deal in Salesforce. Triggerfish respecteert dat en haalt de gegevens op. Maar het classificatiesysteem voorkomt dat die gegevens naar een externe ontvanger stromen. Toestemming om gegevens te benaderen is los van toestemming om ze te delen.

## Registratie van geheimtoegang

Elke toegang tot inloggegevens wordt vastgelegd via de `SECRET_ACCESS`-handhavingshook:

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

Geblokkeerde pogingen worden ook vastgelegd:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "Toegang tot systeeminloggegevens is verboden",
    "plugin_id": "plugin_789"
  }
}
```

::: info Geblokkeerde pogingen om inloggegevens te benaderen worden vastgelegd op een verhoogd waarschuwingsniveau. In enterprise-implementaties kunnen deze gebeurtenissen meldingen naar het beveiligingsteam activeren. :::

## Enterprise-vaultintegratie

Enterprise-implementaties kunnen Triggerfish verbinden met een gecentraliseerde vaultservice voor inloggevensbeheer:

| Vaultservice         | Integratie                              |
| -------------------- | --------------------------------------- |
| HashiCorp Vault      | Native API-integratie                   |
| AWS Secrets Manager  | AWS SDK-integratie                      |
| Azure Key Vault      | Azure SDK-integratie                    |
| Aangepaste vault     | Pluggable `SecretProvider`-interface    |

Enterprise-vaultintegratie biedt:

- **Gecentraliseerde rotatie** — inloggegevens worden geroteerd in de vault en automatisch opgehaald door Triggerfish
- **Toegangsbeleid** — vaultniveaubeleid bepaalt welke agents en gebruikers toegang hebben tot welke inloggegevens
- **Auditconsolidatie** — inloggegevenstoegangslogs van Triggerfish en de vault kunnen worden gecorreleerd

## Wat nooit wordt opgeslagen in configuratiebestanden

Het volgende verschijnt nooit als plaintext-waarden in `triggerfish.yaml` of enig ander configuratiebestand. Ze worden opgeslagen in de OS-sleutelhanger en gerefereerd via `secret:`-syntaxis, of beheerd via de `secret_save`-tool:

- API-sleutels voor LLM-providers
- OAuth-tokens voor integraties
- Database-inloggegevens
- Webhookgeheimen
- Versleutelingssleutels
- Koppelingscodes (tijdelijk, alleen in geheugen)

::: danger Als u plaintext-inloggegevens vindt in een Triggerfish-configuratiebestand (waarden die GEEN `secret:`-verwijzingen zijn), is er iets misgegaan. Voer `triggerfish config migrate-secrets` uit om ze naar de sleutelhanger te verplaatsen. Inloggegevens gevonden als plaintext moeten onmiddellijk worden geroteerd. :::

## Gerelateerde pagina's

- [Beveiligingsgericht ontwerp](./) — overzicht van de beveiligingsarchitectuur
- [No-write-down-regel](./no-write-down) — hoe classificatiecontroles inloggegevensisolatie aanvullen
- [Identiteit en authenticatie](./identity) — hoe gebruikersidentiteit de gedelegeerde inloggegevenstoegang voedt
- [Audit en compliance](./audit-logging) — hoe inloggegevenstoegangsevenementen worden vastgelegd
