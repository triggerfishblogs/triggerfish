# Nettleserautomatisering

Triggerfish tilbyr dyp nettleserkontroll gjennom en dedikert administrert Chromium-instans ved hjelp av CDP (Chrome DevTools Protocol). Agenten kan navigere på nettet, samhandle med sider, fylle ut skjemaer, ta skjermbilder og automatisere nettarbeidsflyter — alt under policy-håndhevelse.

## Arkitektur

Nettleserautomatisering er bygget på `puppeteer-core`, og kobler til en administrert Chromium-instans via CDP. Alle nettleserhandlinger passerer gjennom policy-laget før de når nettleseren.

Triggerfish oppdager automatisk Chromium-baserte nettlesere inkludert **Google Chrome**, **Chromium** og **Brave**. Oppdagelse dekker standard installasjonsstier på Linux, macOS, Windows og Flatpak-miljøer.

::: info `browser_navigate`-verktøyet krever `http://`- eller `https://`-URL-er. Nettleser-interne skjemaer (som `chrome://`, `brave://`, `about:`) støttes ikke og vil returnere en feil med veiledning om å bruke en nett-URL i stedet. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Nettleserautomatiseringsflyt: Agent → Nettleserverktøy → Policy-lag → CDP → Administrert Chromium" style="max-width: 100%;" />

Nettleserprofilen er isolert per agent. Den administrerte Chromium-instansen deler ikke informasjonskapsler, sesjoner eller lokal lagring med din personlige nettleser. Legitimasjonsautofyll er deaktivert som standard.

## Tilgjengelige handlinger

| Handling   | Beskrivelse                                       | Eksempelbruk                                              |
| ---------- | ------------------------------------------------- | --------------------------------------------------------- |
| `navigate` | Gå til en URL (underlagt domenepolicy)            | Åpne en nettside for forskning                            |
| `snapshot` | Ta et sideskjermbilde                             | Dokumenter en UI-tilstand, trekk ut visuell informasjon   |
| `click`    | Klikk et element på siden                         | Send inn et skjema, aktiver en knapp                      |
| `type`     | Skriv tekst i et inndatafelt                      | Fyll inn et søkefelt, fyll ut et skjema                   |
| `select`   | Velg et alternativ fra en rullegardinmeny         | Velg fra en meny                                          |
| `upload`   | Last opp en fil til et skjema                     | Legg ved et dokument                                      |
| `evaluate` | Kjør JavaScript i sidekonteksten (sandkasse)      | Trekk ut data, manipuler DOM                              |
| `wait`     | Vent på et element eller en tilstand              | Sørg for at en side er lastet inn før samhandling         |

## Domenepolicy-håndhevelse

Alle URL-er agenten navigerer til sjekkes mot en domenetillatelsesliste og avvisningsliste før nettleseren handler.

### Konfigurasjon

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

### Slik fungerer domenepolicyen

1. Agent kaller `browser.navigate("https://github.com/org/repo")`
2. `PRE_TOOL_CALL`-hook utløses med URL-en som kontekst
3. Policy-motoren sjekker domenet mot tillat/avvis-lister
4. Hvis avvist eller ikke på tillatelseslisten, **blokkeres** navigasjonsen
5. Hvis tillatt, slås domeneklassifiseringen opp
6. Session taint eskalerer til å samsvare med domeneklassifiseringen
7. Navigasjon fortsetter

::: warning SIKKERHET Hvis et domene ikke er på tillatelseslisten, blokkeres navigasjonen som standard. LLM-en kan ikke overstyre domenepolicyen. Dette forhindrer agenten fra å besøke vilkårlige nettsteder som kan eksponere sensitive data eller utløse uønskede handlinger. :::

## Skjermbilder og klassifisering

Skjermbilder tatt via `browser.snapshot` arver sesjonens gjeldende taint-nivå. Hvis sesjonen er taintet på `CONFIDENTIAL`, klassifiseres alle skjermbilder fra den sesjonen som `CONFIDENTIAL`.

Dette betyr noe for utdatapolicyen. Et skjermbilde klassifisert på `CONFIDENTIAL` kan ikke sendes til en `PUBLIC`-kanal. `PRE_OUTPUT`-hooken håndhever dette ved grensen.

## Skrapet innhold og lineage

Når agenten trekker ut innhold fra en nettside (via `evaluate`, lesing av tekst eller analyse av elementer), gjør de uttrukne dataene:

- Klassifiseres basert på domenets tildelte klassifiseringsnivå
- Oppretter en linjepost som sporer kilde-URL, uttrekkingstidspunkt og klassifisering
- Bidrar til session taint (taint eskalerer til å samsvare med innholdsklassifiseringen)

Denne linjesporingen betyr at du alltid kan spore hvor data kom fra, selv om det ble skrapet fra en nettside for uker siden.

## Sikkerhetskontroller

### Per-agent nettleserisolasjon

Hver agent får sin egen nettleserprofil. Dette betyr:

- Ingen delte informasjonskapsler mellom agenter
- Ingen delt lokal lagring eller sesjonslagring
- Ingen tilgang til vertsleserens informasjonskapsler eller sesjoner
- Legitimasjonsautofyll deaktivert som standard
- Nettleserutvidelser lastes ikke inn

### Policy-hook-integrasjon

Alle nettleserhandlinger passerer gjennom standard policy-hooks:

| Hook                 | Når den utløses                        | Hva den sjekker                                             |
| -------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Før alle nettleserhandlinger           | Domenertillatelsesliste, URL-policy, handlingstillatelser   |
| `POST_TOOL_RESPONSE` | Etter at nettleser returnerer data     | Klassifiser svar, oppdater session taint, opprett lineage   |
| `PRE_OUTPUT`         | Når nettleserinnhold forlater systemet | Klassifiseringssjekk mot destinasjon                        |

### Ressursbegrensninger

- Navigasjonstidsavbrudd forhindrer nettleseren fra å henge på ubestemt tid
- Sidelastestørrelsesgrenser forhindrer overdrevet minneforbruk
- Samtidige fanebegrensninger håndheves per agent

## Bedriftskontroller

Bedriftsdistribusjoner har ytterligere nettleserautomatiseringskontroller:

| Kontroll                            | Beskrivelse                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| Domenenivelklassifisering           | Intranetdomener klassifiseres automatisk som `INTERNAL`                       |
| Blokkerte domeneliste               | Admin-administrert liste over forbudte domener                                |
| Oppbevaringspolicy for skjermbilder | Hvor lenge fangede skjermbilder lagres                                        |
| Revisjonslogging for nettlesersesjon | Full logging av alle nettleserhandlinger for samsvar                         |
| Deaktiver nettleserautomatisering   | Admin kan deaktivere nettleserverktøyet helt for spesifikke agenter eller roller |

## Eksempel: Nettforskningsarbeidsflyt

En typisk agentarbeidsflyt med nettleserautomatisering:

```
1. Bruker: «Forskning på konkurrentprising på example-competitor.com»

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: domene "example-competitor.com" sjekket mot tillatelsesliste
          -> Tillatt, klassifisert som PUBLIC
          -> Navigasjon fortsetter

3. Agent: browser.snapshot()
          -> Skjermbilde tatt, klassifisert på session taint-nivå (PUBLIC)

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Tekst trukket ut, klassifisert som PUBLIC
          -> Linjepost opprettet: kilde=example-competitor.com/pricing

5. Agent: Oppsummerer prisinformasjon og returnerer til bruker
          -> PRE_OUTPUT: PUBLIC-data til brukerkanal — TILLATT
```

Hvert trinn er logget, klassifisert og reviderbart.
