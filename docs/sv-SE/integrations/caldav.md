# CalDAV-integration

Anslut din Triggerfish-agent till valfri CalDAV-kompatibel kalenderserver. Detta
möjliggör kalenderoperationer hos leverantörer som stöder CalDAV-standarden,
inklusive iCloud, Fastmail, Nextcloud, Radicale och alla egenhostad CalDAV-servrar.

## Leverantörer som stöds

| Leverantör | CalDAV-URL                                      | Anteckningar                        |
| ---------- | ----------------------------------------------- | ----------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | Kräver appspecifikt lösenord        |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard CalDAV                     |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Egenhostad                          |
| Radicale   | `https://your-server.com`                       | Lättviktig egenhostad               |
| Baikal     | `https://your-server.com/dav.php`               | Egenhostad                          |

::: info För Google Kalender, använd [Google Workspace](/sv-SE/integrations/google-workspace)-integrationen
istället, som använder det inbyggda Google API med OAuth2. CalDAV är för
icke-Google kalenderleverantörer. :::

## Installation

### Steg 1: Hämta dina CalDAV-autentiseringsuppgifter

Du behöver tre uppgifter från din kalenderleverantör:

- **CalDAV-URL** — Bas-URL för CalDAV-servern
- **Användarnamn** — Ditt kontos användarnamn eller e-postadress
- **Lösenord** — Ditt kontolösenord eller ett appspecifikt lösenord

::: warning Appspecifika lösenord De flesta leverantörer kräver ett appspecifikt
lösenord snarare än ditt huvudkontolösenord. Se din leverantörs dokumentation
för hur du genererar ett. :::

### Steg 2: Konfigurera Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password stored in OS keychain
    classification: CONFIDENTIAL
```

| Alternativ       | Typ    | Obligatorisk | Beskrivning                                               |
| ---------------- | ------ | ------------ | --------------------------------------------------------- |
| `url`            | string | Ja           | CalDAV-serverns bas-URL                                   |
| `username`       | string | Ja           | Kontoets användarnamn eller e-postadress                  |
| `password`       | string | Ja           | Kontolösenord (lagrat i OS-nyckelring)                    |
| `classification` | string | Nej          | Klassificeringsnivå (standard: `CONFIDENTIAL`)            |

### Steg 3: Kalenderupptäckt

Vid första anslutningen kör agenten CalDAV-discovery för att hitta alla tillgängliga
kalendrar. De hittade kalendrarna cachas lokalt.

```bash
triggerfish connect caldav
```

## Tillgängliga verktyg

| Verktyg             | Beskrivning                                                     |
| ------------------- | --------------------------------------------------------------- |
| `caldav_list`       | Lista alla kalendrar i kontot                                   |
| `caldav_events`     | Hämta händelser för ett datumintervall från en eller alla kalendrar |
| `caldav_create`     | Skapa en ny kalenderhändelse                                    |
| `caldav_update`     | Uppdatera en befintlig händelse                                 |
| `caldav_delete`     | Ta bort en händelse                                             |
| `caldav_search`     | Sök händelser via textsökning                                   |
| `caldav_freebusy`   | Kontrollera ledig/upptagen-status för ett tidsintervall         |

## Klassificering

Kalenderdata klassificeras som standard till `CONFIDENTIAL` eftersom den innehåller
namn, scheman, platser och mötesdetaljer. Åtkomst till ett CalDAV-verktyg eskalerar
sessionens taint till den konfigurerade klassificeringsnivån.

## Autentisering

CalDAV använder HTTP Basic Auth över TLS. Autentiseringsuppgifterna lagras i
OS-nyckelringen och injiceras på HTTP-lagret under LLM-kontexten — agenten ser
aldrig råa lösenord.

## Relaterade sidor

- [Google Workspace](/sv-SE/integrations/google-workspace) — För Google Kalender
  (använder inbyggt API)
- [Cron och triggers](/sv-SE/features/cron-and-triggers) — Schemalägg kalenderbaserade
  agentåtgärder
- [Klassificeringsguide](/sv-SE/guide/classification-guide) — Välj rätt klassificeringsnivå
