# CalDAV-integrasjon

Koble Triggerfish-agenten din til en CalDAV-kompatibel kalenderserver. Dette muliggjør kalenderoperasjoner på tvers av leverandører som støtter CalDAV-standarden, inkludert iCloud, Fastmail, Nextcloud, Radicale og alle selvhostede CalDAV-servere.

## Støttede leverandører

| Leverandør | CalDAV-URL                                      | Merknader                       |
| ---------- | ----------------------------------------------- | ------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | Krever app-spesifikt passord    |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard CalDAV                 |
| Nextcloud  | `https://din-server.com/remote.php/dav`         | Selvhostet                      |
| Radicale   | `https://din-server.com`                        | Lett selvhostet                 |
| Baikal     | `https://din-server.com/dav.php`                | Selvhostet                      |

::: info For Google Kalender, bruk [Google Workspace](/nb-NO/integrations/google-workspace)-integrasjonen i stedet, som bruker den native Google API med OAuth2. CalDAV er for ikke-Google kalender-leverandører. :::

## Oppsett

### Trinn 1: Hent CalDAV-legitimasjonen din

Du trenger tre opplysninger fra kalenderleverandøren din:

- **CalDAV-URL** — Basis-URL for CalDAV-serveren
- **Brukernavn** — Kontobrukernavn eller e-post
- **Passord** — Kontopassord eller et app-spesifikt passord

::: warning App-spesifikke passord De fleste leverandører krever et app-spesifikt passord i stedet for hovedkontopassordet. Sjekk leverandørens dokumentasjon for å generere et. :::

### Trinn 2: Konfigurer Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "deg@icloud.com"
    # passord lagret i OS-nøkkelringen
    classification: CONFIDENTIAL
```

| Alternativ       | Type   | Påkrevd | Beskrivelse                                         |
| ---------------- | ------ | ------- | --------------------------------------------------- |
| `url`            | string | Ja      | CalDAV-serverens basis-URL                          |
| `username`       | string | Ja      | Kontobrukernavn eller e-post                        |
| `password`       | string | Ja      | Kontopassord (lagret i OS-nøkkelringen)             |
| `classification` | string | Nei     | Klassifiseringsnivå (standard: `CONFIDENTIAL`)      |

### Trinn 3: Kalenderoppdagelse

Ved første tilkobling kjører agenten CalDAV-oppdagelse for å finne alle tilgjengelige kalendere. De oppdagede kalenderne bufres lokalt.

```bash
triggerfish connect caldav
```

## Tilgjengelige verktøy

| Verktøy             | Beskrivelse                                                  |
| ------------------- | ------------------------------------------------------------ |
| `caldav_list`       | List alle kalendere på kontoen                               |
| `caldav_events`     | Hent hendelser for et datoperiode fra én eller alle kalendere|
| `caldav_create`     | Opprett en ny kalenderhendelse                               |
| `caldav_update`     | Oppdater en eksisterende hendelse                            |
| `caldav_delete`     | Slett en hendelse                                            |
| `caldav_search`     | Søk etter hendelser etter tekstspørring                      |
| `caldav_freebusy`   | Sjekk fri/opptatt-status for et tidsperiode                  |

## Klassifisering

Kalenderdata er som standard `CONFIDENTIAL` fordi den inneholder navn, tidsplaner, steder og møtedetaljer. Å aksessere et CalDAV-verktøy eskalerer session taint til det konfigurerte klassifiseringsnivået.

## Autentisering

CalDAV bruker HTTP Basic Auth over TLS. Legitimasjon lagres i OS-nøkkelringen og injiseres på HTTP-laget under LLM-konteksten — agenten ser aldri det rå passordet.

## Relaterte sider

- [Google Workspace](/nb-NO/integrations/google-workspace) — For Google Kalender (bruker native API)
- [Cron og triggers](/nb-NO/features/cron-and-triggers) — Planlegg kalenderbaserte agenthandlinger
- [Klassifiseringsveiledning](/nb-NO/guide/classification-guide) — Velge riktig klassifiseringsnivå
