# Välja klassificeringsnivåer

Varje kanal, MCP-server, integration och plugin i Triggerfish måste ha en klassificeringsnivå. Den här sidan hjälper dig att välja rätt.

## De fyra nivåerna

| Nivå             | Vad det innebär                                          | Data flödar till...                |
| ---------------- | -------------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | Säker för alla att se                                    | Var som helst                      |
| **INTERNAL**     | Bara för dina ögon — inget känsligt, men inte offentligt | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Innehåller känslig data du aldrig vill läcka             | CONFIDENTIAL, RESTRICTED           |
| **RESTRICTED**   | Mest känslig — juridisk, medicinsk, ekonomisk, PII       | Bara RESTRICTED                    |

Data kan bara flöda **uppåt eller i sidled**, aldrig nedåt. Det här är [nedskrivningsförbudet](/sv-SE/security/no-write-down) och det kan inte åsidosättas.

## Två frågor att ställa

För varje integration du konfigurerar, fråga:

**1. Vilken är den mest känsliga data den här källan kan returnera?**

Det här avgör **minimiklassificeringsnivån**. Om en MCP-server kan returnera ekonomisk data måste den vara minst CONFIDENTIAL — även om de flesta av dess verktyg returnerar ofarlig metadata.

**2. Skulle jag vara bekväm om sessionsdata flödade _till_ det här målet?**

Det här avgör den **maximala klassificeringsnivå** du vill tilldela. En högre klassificering innebär att session-taint eskalerar när du använder den, vilket begränsar vart data kan flöda efteråt.

## Klassificering efter datatyp

| Datatyp                                       | Rekommenderad nivå | Varför                                              |
| --------------------------------------------- | ------------------ | --------------------------------------------------- |
| Väder, offentliga webbsidor, tidszoner        | **PUBLIC**         | Fritt tillgängliga för alla                         |
| Dina personliga anteckningar, bokmärken, uppgiftslistor | **INTERNAL** | Privata men inte skadliga om de exponeras      |
| Interna wikis, teamdokument, projektbrädor    | **INTERNAL**       | Organisationsintern information                     |
| E-post, kalenderhändelser, kontakter          | **CONFIDENTIAL**   | Innehåller namn, scheman, relationer                |
| CRM-data, säljpipeline, kundregister          | **CONFIDENTIAL**   | Affärskänslig, kunddata                             |
| Ekonomiska poster, bankkonton, fakturor       | **CONFIDENTIAL**   | Monetär information                                 |
| Källkodsrepon (privata)                       | **CONFIDENTIAL**   | Immateriell egendom                                 |
| Medicinska journaler eller hälsodata          | **RESTRICTED**     | Rättsligt skyddade (HIPAA osv.)                     |
| Personnummer, ID-nummer, pass                 | **RESTRICTED**     | Risk för identitetsstöld                            |
| Juridiska dokument, kontrakt under NDA        | **RESTRICTED**     | Rättslig exponering                                 |
| Krypteringsnycklar, uppgifter, hemligheter    | **RESTRICTED**     | Risk för systemkompromiss                           |

## MCP-servrar

När du lägger till en MCP-server till `triggerfish.yaml` avgör klassificeringen två saker:

1. **Session-taint** — att anropa ett verktyg på den här servern eskalerar sessionen till den här nivån
2. **Nedskrivningsskydd** — en session som redan är taintad ovanför den här nivån kan inte skicka data _till_ den här servern

```yaml
mcp_servers:
  # PUBLIC — öppna data, ingen känslighet
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — ditt eget filsystem, privat men inga hemligheter
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/du/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — kommer åt privata repos, kundärenden
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — databas med personuppgifter, journaler, juridiska dokument
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning NEKA SOM STANDARD Om du utelämnar `classification` registreras servern som **UNTRUSTED** och gateway avvisar alla verktygsanrop. Du måste uttryckligen välja en nivå. :::

### Vanliga MCP-serverklassificeringar

| MCP-server                          | Föreslagen nivå | Resonemang                                         |
| ----------------------------------- | --------------- | -------------------------------------------------- |
| Filsystem (offentliga dokument)     | PUBLIC          | Exponerar bara offentligt tillgängliga filer        |
| Filsystem (hemkatalog)              | INTERNAL        | Personliga filer, inget hemligt                    |
| Filsystem (arbetsprojekt)           | CONFIDENTIAL    | Kan innehålla proprietär kod eller data            |
| GitHub (bara offentliga repos)      | INTERNAL        | Kod är offentlig men användningsmönster är privata |
| GitHub (privata repos)              | CONFIDENTIAL    | Proprietär källkod                                 |
| Slack                               | CONFIDENTIAL    | Arbetsplatskonversationer, möjligen känsliga        |
| Databas (analys/rapportering)       | CONFIDENTIAL    | Aggregerade affärsdata                             |
| Databas (produktion med PII)        | RESTRICTED      | Innehåller personuppgifter                         |
| Väder / tid / kalkylator            | PUBLIC          | Inga känsliga data                                 |
| Webbsökning                         | PUBLIC          | Returnerar offentligt tillgänglig information      |
| E-post                              | CONFIDENTIAL    | Namn, konversationer, bilagor                      |
| Google Drive                        | CONFIDENTIAL    | Dokument kan innehålla känsliga affärsdata         |

## Kanaler

Kanalklassificering avgör **taket** — den maximala känsligheten hos data som kan levereras till den kanalen.

```yaml
channels:
  cli:
    classification: INTERNAL # Din lokala terminal — säker för intern data
  telegram:
    classification: INTERNAL # Din privata bot — samma som CLI för ägaren
  webchat:
    classification: PUBLIC # Anonyma besökare — bara offentliga data
  email:
    classification: CONFIDENTIAL # E-post är privat men kan vidarebefordras
```

::: tip ÄGARE kontra ICKE-ÄGARE För **ägaren** har alla kanaler samma förtroendenivå — du är du oavsett vilken app du använder. Kanalklassificering är viktigast för **icke-ägaranvändare** (besökare på webchat, medlemmar i en Slack-kanal osv.) där det kontrollerar vilken data som kan flöda till dem. :::

### Välja kanalklassificering

| Fråga                                                                     | Om ja...                | Om nej...               |
| ------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| Kan en främling se meddelanden på den här kanalen?                        | **PUBLIC**              | Fortsätt läsa           |
| Är den här kanalen bara för dig personligen?                              | **INTERNAL** eller högre | Fortsätt läsa           |
| Kan meddelanden vidarebefordras, skärmdumpas eller loggas av tredje part? | Tak vid **CONFIDENTIAL** | Kan vara **RESTRICTED** |
| Är kanalen end-to-end-krypterad och under din fulla kontroll?             | Kan vara **RESTRICTED** | Tak vid **CONFIDENTIAL** |

## Vad som händer om du gör fel

**För lågt (t.ex. CONFIDENTIAL-server märkt PUBLIC):**

- Data från den här servern eskalerar inte session-taint
- Sessionen kan flöda klassificerade data till publika kanaler — **risk för dataintrång**
- Det här är den farliga riktningen

**För högt (t.ex. PUBLIC-server märkt CONFIDENTIAL):**

- Session-taint eskalerar i onödan när du använder den här servern
- Du blockeras från att skicka till lägre klassificerade kanaler efteråt
- Irriterande men **säkert** — klassificera hellre för högt

::: danger Vid osäkerhet, **klassificera högre**. Du kan alltid sänka det senare efter att ha granskat vilken data servern faktiskt returnerar. Underklassificering är en säkerhetsrisk; överklassificering är bara en olägenhet. :::

## Taint-kaskaden

Att förstå den praktiska effekten hjälper dig att välja klokt. Här är vad som händer i en session:

```
1. Session startar på PUBLIC
2. Du frågar om väder (PUBLIC-server)          → taint förblir PUBLIC
3. Du kontrollerar dina anteckningar (INTERNAL) → taint eskalerar till INTERNAL
4. Du söker GitHub-ärenden (CONFIDENTIAL)       → taint eskalerar till CONFIDENTIAL
5. Du försöker posta till webchat (PUBLIC)      → BLOCKERAD (nedskrivningsöverträdelse)
6. Du återställer sessionen                     → taint återgår till PUBLIC
7. Du postar till webchat                       → tillåten
```

Om du ofta använder ett CONFIDENTIAL-verktyg följt av en PUBLIC-kanal måste du återställa ofta. Fundera på om verktyget verkligen behöver CONFIDENTIAL, eller om kanalen kan omklassificeras.

## Filsystemsökvägar

Du kan också klassificera enskilda filsystemsökvägar, vilket är användbart när din agent har åtkomst till kataloger med blandad känslighet:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/du/public": PUBLIC
    "/home/du/arbete/kunder": CONFIDENTIAL
    "/home/du/juridisk": RESTRICTED
```

## Granskningschecklista

Innan du aktiverar en ny integration:

- [ ] Vilken är den värsta data den här källan kan returnera? Klassificera på den nivån.
- [ ] Är klassificeringen minst lika hög som datanivåtabellen antyder?
- [ ] Om det är en kanal, är klassificeringen lämplig för alla möjliga mottagare?
- [ ] Har du testat att taint-kaskaden fungerar för ditt typiska arbetsflöde?
- [ ] När du är osäker, klassificerade du högre snarare än lägre?

## Relaterade sidor

- [Nedskrivningsförbudet](/sv-SE/security/no-write-down) — den fasta dataflödesregeln
- [Konfiguration](/sv-SE/guide/configuration) — fullständig YAML-referens
- [MCP Gateway](/sv-SE/integrations/mcp-gateway) — MCP-serverns säkerhetsmodell
