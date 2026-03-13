# Classificatieniveaus kiezen

Elk kanaal, elke MCP-server, integratie en plugin in Triggerfish moet een classificatieniveau hebben. Op deze pagina wordt uitgelegd hoe u het juiste niveau kiest.

## De vier niveaus

| Niveau           | Betekenis                                                           | Gegevens stromen naar...           |
| ---------------- | ------------------------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | Veilig voor iedereen om te zien                                     | Overal naartoe                     |
| **INTERNAL**     | Alleen voor uzelf — niets gevoeligs, maar niet openbaar             | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Bevat gevoelige gegevens die u nooit gelekt wilt zien               | CONFIDENTIAL, RESTRICTED           |
| **RESTRICTED**   | Meest gevoelig — juridisch, medisch, financieel, PII                | Alleen RESTRICTED                  |

Gegevens kunnen alleen **omhoog of zijwaarts** stromen, nooit omlaag. Dit is de [no-write-down-regel](/nl-NL/security/no-write-down) en deze kan niet worden overschreven.

## Twee vragen om te stellen

Voor elke integratie die u configureert, vraagt u:

**1. Wat zijn de meest gevoelige gegevens die deze bron kan retourneren?**

Dit bepaalt het **minimum** classificatieniveau. Als een MCP-server financiële gegevens kan retourneren, moet het minimaal CONFIDENTIAL zijn — zelfs als de meeste tools onschadelijke metadata retourneren.

**2. Zou ik er tevreden mee zijn als sessiegegevens naar deze bestemming stromen?**

Dit bepaalt het **maximum** classificatieniveau dat u wilt toewijzen. Een hogere classificatie betekent dat de sessie-taint escaleert wanneer u het gebruikt, wat beperkt waarheen gegevens daarna kunnen stromen.

## Classificatie per gegevenstype

| Gegevenstype                                    | Aanbevolen niveau | Reden                                            |
| ----------------------------------------------- | ----------------- | ------------------------------------------------ |
| Weer, openbare webpagina's, tijdzones           | **PUBLIC**        | Vrij beschikbaar voor iedereen                   |
| Uw persoonlijke notities, bladwijzers, takenlijsten | **INTERNAL**  | Privé maar niet schadelijk als blootgesteld      |
| Interne wiki's, teamdocumenten, projectborden   | **INTERNAL**      | Organisatie-interne informatie                   |
| E-mail, agenda-evenementen, contacten           | **CONFIDENTIAL**  | Bevat namen, schema's, relaties                  |
| CRM-gegevens, verkooppipeline, klantgegevens    | **CONFIDENTIAL**  | Bedrijfsgevoelig, klantgegevens                  |
| Financiële gegevens, bankrekeningen, facturen   | **CONFIDENTIAL**  | Monetaire informatie                             |
| Broncode-repositories (privé)                   | **CONFIDENTIAL**  | Intellectueel eigendom                           |
| Medische of gezondheidsgegevens                 | **RESTRICTED**    | Wettelijk beschermd (AVG, enz.)                  |
| Overheidsnummers, BSN's, paspoorten             | **RESTRICTED**    | Risico op identiteitsdiefstal                    |
| Juridische documenten, contracten onder NDA     | **RESTRICTED**    | Juridische blootstelling                         |
| Versleutelingssleutels, inloggegevens, geheimen | **RESTRICTED**    | Risico op systeemcompromis                       |

## MCP-servers

Bij het toevoegen van een MCP-server aan `triggerfish.yaml` bepaalt de classificatie twee dingen:

1. **Sessie-taint** — het aanroepen van een tool op deze server escaleert de sessie naar dit niveau
2. **Write-down-preventie** — een sessie die al boven dit niveau is besmet, kan geen gegevens naar deze server sturen

```yaml
mcp_servers:
  # PUBLIC — openbare gegevens, geen gevoeligheid
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — uw eigen bestandssysteem, privé maar geen geheimen
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/u/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — geeft toegang tot privé-repo's, klantissues
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — database met PII, medische dossiers, juridische documenten
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning STANDAARD WEIGEREN Als u `classification` weglaat, wordt de server geregistreerd als **UNTRUSTED** en weigert de gateway alle toolaanroepen. U moet expliciet een niveau kiezen. :::

### Gangbare MCP-serverclassificaties

| MCP-server                             | Aanbevolen niveau | Redenering                                        |
| -------------------------------------- | ----------------- | ------------------------------------------------- |
| Bestandssysteem (openbare documenten)  | PUBLIC            | Stelt alleen openbaar beschikbare bestanden bloot |
| Bestandssysteem (thuismap)             | INTERNAL          | Persoonlijke bestanden, niets geheims             |
| Bestandssysteem (werkprojecten)        | CONFIDENTIAL      | Kan gepatenteerde code of gegevens bevatten       |
| GitHub (alleen openbare repo's)        | INTERNAL          | Code is openbaar maar gebruikspatronen zijn privé |
| GitHub (privé-repo's)                  | CONFIDENTIAL      | Gepatenteerde broncode                            |
| Slack                                  | CONFIDENTIAL      | Werkgesprekken, mogelijk gevoelig                 |
| Database (analyse/rapportage)          | CONFIDENTIAL      | Geaggregeerde bedrijfsgegevens                    |
| Database (productie met PII)           | RESTRICTED        | Bevat persoonlijk identificeerbare informatie     |
| Weer / tijd / rekenmachine             | PUBLIC            | Geen gevoelige gegevens                           |
| Webzoeken                              | PUBLIC            | Retourneert openbaar beschikbare informatie       |
| E-mail                                 | CONFIDENTIAL      | Namen, gesprekken, bijlagen                       |
| Google Drive                           | CONFIDENTIAL      | Documenten kunnen gevoelige bedrijfsgegevens bevatten |

## Kanalen

Kanaalclassificatie bepaalt het **plafond** — de maximale gevoeligheid van gegevens die naar dat kanaal kunnen worden bezorgd.

```yaml
channels:
  cli:
    classification: INTERNAL # Uw lokale terminal — veilig voor interne gegevens
  telegram:
    classification: INTERNAL # Uw privébot — hetzelfde als CLI voor de eigenaar
  webchat:
    classification: PUBLIC # Anonieme bezoekers — alleen openbare gegevens
  email:
    classification: CONFIDENTIAL # E-mail is privé maar kan worden doorgestuurd
```

::: tip EIGENAAR versus NIET-EIGENAAR Voor de **eigenaar** hebben alle kanalen hetzelfde vertrouwensniveau — u bent uzelf, ongeacht welke app u gebruikt. Kanaalclassificatie is het belangrijkst voor **niet-eigenaargebruikers** (bezoekers op webchat, leden in een Slack-kanaal, enz.) waarbij het bepaalt welke gegevens naar hen kunnen stromen. :::

### Kanaalclassificatie kiezen

| Vraag                                                                        | Als ja...               | Als nee...              |
| ---------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| Kan een vreemde berichten op dit kanaal zien?                                | **PUBLIC**              | Lees verder             |
| Is dit kanaal alleen voor uzelf persoonlijk?                                 | **INTERNAL** of hoger   | Lees verder             |
| Kunnen berichten worden doorgestuurd, gescreenshopt of vastgelegd door derden? | Plafond op **CONFIDENTIAL** | Kan **RESTRICTED** zijn |
| Is het kanaal end-to-end versleuteld en volledig onder uw controle?          | Kan **RESTRICTED** zijn | Plafond op **CONFIDENTIAL** |

## Wat er gebeurt als u het verkeerd heeft

**Te laag (bijv. CONFIDENTIAL-server gemarkeerd als PUBLIC):**

- Gegevens van deze server escaleren de sessie-taint niet
- Sessie zou geclassificeerde gegevens naar openbare kanalen kunnen sturen — **risico op gegevensleak**
- Dit is de gevaarlijke richting

**Te hoog (bijv. PUBLIC-server gemarkeerd als CONFIDENTIAL):**

- Sessie-taint escaleert onnodig bij gebruik van deze server
- U wordt geblokkeerd van verzenden naar lager geclassificeerde kanalen daarna
- Vervelend maar **veilig** — kies liever te hoog

::: danger Bij twijfel, **classificeer hoger**. U kunt het later altijd verlagen na het bekijken van welke gegevens de server daadwerkelijk retourneert. Onderclassificeren is een beveiligingsrisico; overclassificeren is slechts een ongemak. :::

## De taint-cascade

Het begrijpen van de praktische impact helpt u wijs te kiezen. Dit is wat er in een sessie gebeurt:

```
1. Sessie start op PUBLIC
2. U vraagt naar het weer (PUBLIC-server)          → taint blijft PUBLIC
3. U controleert uw notities (INTERNAL bestandssysteem) → taint escaleert naar INTERNAL
4. U raadpleegt GitHub-issues (CONFIDENTIAL)        → taint escaleert naar CONFIDENTIAL
5. U probeert te posten op webchat (PUBLIC-kanaal)  → GEBLOKKEERD (write-down-schending)
6. U reset de sessie                                → taint keert terug naar PUBLIC
7. U post op webchat                                → toegestaan
```

Als u vaak een CONFIDENTIAL-tool gebruikt gevolgd door een PUBLIC-kanaal, zult u veel moeten resetten. Overweeg of de tool echt CONFIDENTIAL nodig heeft, of dat het kanaal opnieuw kan worden geclassificeerd.

## Bestandssysteempaden

U kunt ook afzonderlijke bestandssysteempaden classificeren, wat handig is wanneer uw agent toegang heeft tot mappen met gemengde gevoeligheid:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/u/public": PUBLIC
    "/home/u/work/clients": CONFIDENTIAL
    "/home/u/legal": RESTRICTED
```

## Controlelijst voor beoordeling

Voordat u live gaat met een nieuwe integratie:

- [ ] Wat zijn de ergste gegevens die deze bron kan retourneren? Classificeer op dat niveau.
- [ ] Is de classificatie minimaal zo hoog als de tabel met gegevenstypen suggereert?
- [ ] Als dit een kanaal is, is de classificatie dan passend voor alle mogelijke ontvangers?
- [ ] Heeft u getest dat de taint-cascade werkt voor uw typische workflow?
- [ ] Heeft u bij twijfel hoger dan lager geclassificeerd?

## Gerelateerde pagina's

- [No-write-down-regel](/nl-NL/security/no-write-down) — de vaste gegevensstroom-regel
- [Configuratie](/nl-NL/guide/configuration) — volledige YAML-reference
- [MCP Gateway](/nl-NL/integrations/mcp-gateway) — MCP-serverbeveiligingsmodel
