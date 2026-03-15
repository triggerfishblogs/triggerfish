# Webbläsarautomatisering

Triggerfish tillhandahåller djup webbläsarkontroll genom en dedikerad hanterad Chromium-instans med CDP (Chrome DevTools Protocol). Agenten kan navigera på webben, interagera med sidor, fylla i formulär, ta skärmdumpar och automatisera webbarbetsflöden — allt under policytillämpning.

## Arkitektur

Webbläsarautomatisering är byggd på `puppeteer-core` och ansluter till en hanterad Chromium-instans via CDP. Varje webbläsaråtgärd passerar genom policynivån innan den når webbläsaren.

Triggerfish identifierar automatiskt Chromium-baserade webbläsare inklusive **Google Chrome**, **Chromium** och **Brave**. Identifieringen täcker standardinstallationssökvägar på Linux, macOS, Windows och Flatpak-miljöer.

::: info Verktyget `browser_navigate` kräver `http://`- eller `https://`-URL:er. Webbläsarinterna scheman (som `chrome://`, `brave://`, `about:`) stöds inte och returnerar ett fel med vägledning om att använda en webb-URL istället. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Webbläsarautomationsflöde: Agent → Webbläsarverktyg → Policynivå → CDP → Hanterad Chromium" style="max-width: 100%;" />

Webbläsarprofilen är isolerad per agent. Den hanterade Chromium-instansen delar inte cookies, sessioner eller lokal lagring med din personliga webbläsare. Autofyll av uppgifter är inaktiverat som standard.

## Tillgängliga åtgärder

| Åtgärd     | Beskrivning                                     | Exempelanvändning                                          |
| ---------- | ----------------------------------------------- | ---------------------------------------------------------- |
| `navigate` | Gå till en URL (föremål för domänpolicy)        | Öppna en webbsida för forskning                            |
| `snapshot` | Ta en skärmdump av sidan                        | Dokumentera ett UI-tillstånd, extrahera visuell information |
| `click`    | Klicka på ett element på sidan                  | Skicka ett formulär, aktivera en knapp                     |
| `type`     | Skriv text i ett inmatningsfält                 | Fyll i en sökruta, slutför ett formulär                    |
| `select`   | Välj ett alternativ från en rullgardinsmeny     | Välj från en meny                                          |
| `upload`   | Ladda upp en fil till ett formulär              | Bifoga ett dokument                                        |
| `evaluate` | Kör JavaScript i sidans kontext (sandboxat)     | Extrahera data, manipulera DOM                             |
| `wait`     | Vänta på ett element eller villkor              | Säkerställ att sidan laddats innan interaktion             |

## Domänpolicytillämpning

Varje URL agenten navigerar till kontrolleras mot en domäntillåt- och nekalista innan webbläsaren agerar.

### Konfiguration

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Hur domänpolicyn fungerar

1. Agenten anropar `browser.navigate("https://github.com/org/repo")`
2. `PRE_TOOL_CALL`-kroken utlöses med URL:en som kontext
3. Policymotorn kontrollerar domänen mot tillåt-/neka-listor
4. Om nekad eller inte på tillåtlistan **blockeras** navigeringen
5. Om tillåten slås domänklassificeringen upp
6. Sessions-taint eskalerar för att matcha domänklassificeringen
7. Navigering fortsätter

::: warning SÄKERHET Om en domän inte finns på tillåtlistan blockeras navigering som standard. LLM:en kan inte åsidosätta domänpolicyn. Detta förhindrar agenten från att besöka godtyckliga webbplatser som kan exponera känsliga data eller utlösa oönskade åtgärder. :::

## Skärmdumpar och klassificering

Skärmdumpar tagna via `browser.snapshot` ärver sessionens aktuella taint-nivå. Om sessionen är märkt med `CONFIDENTIAL` klassificeras alla skärmdumpar från den sessionen som `CONFIDENTIAL`.

Det spelar roll för utdatapolicyn. En skärmdump klassificerad som `CONFIDENTIAL` kan inte skickas till en `PUBLIC`-kanal. `PRE_OUTPUT`-kroken tillämpar detta vid gränsen.

## Skrapat innehåll och härstamning

När agenten extraherar innehåll från en webbsida (via `evaluate`, läsning av text eller tolkning av element) klassificeras extraherade data baserat på domänens tilldelade klassificeringsnivå, skapar en härstamningspost som spårar käll-URL, extraktionstid och klassificering, samt bidrar till sessions-taint (taint eskalerar för att matcha innehållsklassificeringen).

Denna härstamningsspårning innebär att du alltid kan spåra var data kom ifrån, även om det skrapades från en webbsida för veckor sedan.

## Säkerhetskontroller

### Per-agent webbläsarisolering

Varje agent får sin egen webbläsarprofil. Det innebär:

- Inga delade cookies mellan agenter
- Ingen delad lokal lagring eller sessionslagring
- Ingen åtkomst till värdens webbläsarcookies eller sessioner
- Autofyll av uppgifter inaktiverat som standard
- Webbläsartillägg laddas inte

### Policykroksintegration

Alla webbläsaråtgärder passerar genom standardpolicykrokarna:

| Krok                 | När den utlöses                         | Vad den kontrollerar                                           |
| -------------------- | --------------------------------------- | -------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Före varje webbläsaråtgärd              | Domäntillåtlista, URL-policy, åtgärdsbehörigheter             |
| `POST_TOOL_RESPONSE` | När webbläsaren returnerar data         | Klassificera svar, uppdatera sessions-taint, skapa härstamning |
| `PRE_OUTPUT`         | När webbläsarinnehåll lämnar systemet   | Klassificeringskontroll mot destination                        |

### Resursgränser

- Navigeringens tidsgräns förhindrar att webbläsaren hänger sig på obestämd tid
- Sidladdningsstorleksgränser förhindrar överdrivet minnesförbrukning
- Gränser för samtidiga flikar tillämpas per agent

## Företagskontroller

Företagsdistributioner har ytterligare webbläsarautomationskontroller:

| Kontroll                         | Beskrivning                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Domännivåklassificering          | Intranätdomäner klassificeras automatiskt som `INTERNAL`                       |
| Lista med blockerade domäner     | Administratörshanterad lista med förbjudna domäner                             |
| Policy för skärmdumpsbevarande   | Hur länge tagna skärmdumpar lagras                                             |
| Revisionsloggning av webbläsare  | Fullständig loggning av alla webbläsaråtgärder för efterlevnad                |
| Inaktivera webbläsarautomation   | Administratören kan inaktivera webbläsarverktyget helt för specifika agenter  |

## Exempel: Webbforskningsarbetsflöde

Ett typiskt agentarbetsflöde med webbläsarautomatisering:

```
1. Användare: "Undersök konkurrenters prissättning på example-competitor.com"

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: domän "example-competitor.com" kontrolleras mot tillåtlistan
          -> Tillåten, klassificerad som PUBLIC
          -> Navigering fortsätter

3. Agent: browser.snapshot()
          -> Skärmdump tagen, klassificerad på sessions-taint-nivå (PUBLIC)

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Text extraherad, klassificerad som PUBLIC
          -> Härstamningspost skapad: källa=example-competitor.com/pricing

5. Agent: Sammanfattar prisinformation och returnerar till användaren
          -> PRE_OUTPUT: PUBLIC-data till användarkanal — TILLÅTEN
```

Varje steg loggas, klassificeras och kan granskas.
