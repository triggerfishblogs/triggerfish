# Opslag

Alle statische gegevens in Triggerfish stromen via een uniforme `StorageProvider`-abstractie. Geen module maakt zijn eigen opslagmechanisme — elke component die persistentie nodig heeft, neemt een `StorageProvider` als afhankelijkheid. Dit ontwerp maakt backends verwisselbaar zonder bedrijfslogica aan te raken en houdt alle tests snel en deterministisch.

## StorageProvider-interface

```typescript
interface StorageProvider {
  /** Een waarde ophalen op sleutel. Retourneert null als niet gevonden. */
  get(key: string): Promise<StorageValue | null>;

  /** Een waarde opslaan op een sleutel. Overschrijft een bestaande waarde. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Een sleutel verwijderen. Geen bewerking als sleutel niet bestaat. */
  delete(key: string): Promise<void>;

  /** Alle sleutels weergeven die overeenkomen met een optioneel voorvoegsel. */
  list(prefix?: string): Promise<string[]>;

  /** Alle sleutels verwijderen. Gebruik met voorzichtigheid. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` is een string. Alle gestructureerde gegevens (sessies, lineagerecords, configuratie) worden geserialiseerd naar JSON voor opslag en gedeserialiseerd bij het lezen. Dit houdt de interface eenvoudig en backend-agnostisch. :::

## Implementaties

| Backend                 | Gebruiksscenario                  | Persistentie                                              | Configuratie                    |
| ----------------------- | --------------------------------- | --------------------------------------------------------- | ------------------------------- |
| `MemoryStorageProvider` | Testen, tijdelijke sessies        | Geen (verloren bij herstart)                              | Geen configuratie nodig         |
| `SqliteStorageProvider` | Standaard voor persoonlijk niveau | SQLite WAL op `~/.triggerfish/data/triggerfish.db`        | Nulconfiguratie                 |
| Enterprise-backends     | Enterprise-niveau                 | Door klant beheerd                                        | Postgres, S3 of andere backends |

### MemoryStorageProvider

Gebruikt in alle tests voor snelheid en determinisme. Gegevens bestaan alleen in het geheugen en gaan verloren wanneer het proces eindigt. Elke testsuite maakt een verse `MemoryStorageProvider`, zodat tests geïsoleerd en reproduceerbaar zijn.

### SqliteStorageProvider

De standaard voor persoonlijk niveau-implementaties. Gebruikt SQLite in WAL-modus (Write-Ahead Logging) voor gelijktijdige leestoegang en crashveiligheid. De database bevindt zich op:

```
~/.triggerfish/data/triggerfish.db
```

SQLite vereist geen configuratie, geen serverproces en geen netwerk. Eén bestand slaat alle Triggerfish-status op. Het Deno-pakket `@db/sqlite` biedt de binding, die `--allow-ffi`-toestemming vereist.

::: tip SQLite WAL-modus staat meerdere lezers toe om tegelijkertijd toegang te krijgen tot de database met één schrijver. Dit is belangrijk voor de Gateway, die sessie-status kan lezen terwijl de agent toolresultaten schrijft. :::

### Enterprise-backends

Enterprise-implementaties kunnen externe opslagbackends (Postgres, S3, enz.) aankoppelen zonder codewijzigingen. Elke implementatie van de `StorageProvider`-interface werkt. De backend wordt geconfigureerd in `triggerfish.yaml`.

## Naamruimtesleutels

Alle sleutels in het opslagsysteem zijn voorzien van een naamruimte met een voorvoegsel dat het gegevenstype identificeert. Dit voorkomt conflicten en maakt het mogelijk om gegevens per categorie op te vragen, te bewaren en te verwijderen.

| Naamruimte       | Sleutelpatroon                                      | Beschrijving                                            |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                              | Sessiestatus (gespreksgeschiedenis, metadata)           |
| `taint:`         | `taint:sess_abc123`                                 | Sessie-taint-niveau                                     |
| `lineage:`       | `lineage:lin_789xyz`                                | Gegevenslineagerecords (provenancetracking)             |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output`        | Auditlogboekitems                                       |
| `cron:`          | `cron:job_daily_report`                             | Cron-jobstatus en uitvoeringsgeschiedenis               |
| `notifications:` | `notifications:notif_456`                           | Meldingswachtrij                                        |
| `exec:`          | `exec:run_789`                                      | Uitvoeringsomgevingsgeschiedenis van agent              |
| `skills:`        | `skills:skill_weather`                              | Metagegevens van geïnstalleerde skills                  |
| `config:`        | `config:v3`                                         | Configuratie-snapshots                                  |

## Bewaarbeleid

Elke naamruimte heeft een standaard bewaarbeleid. Enterprise-implementaties kunnen deze aanpassen.

| Naamruimte       | Standaard bewaring        | Redenering                                                |
| ---------------- | ------------------------- | --------------------------------------------------------- |
| `sessions:`      | 30 dagen                  | Gespreksgeschiedenis verloopt                             |
| `taint:`         | Komt overeen met sessies  | Taint is zinloos zonder zijn sessie                       |
| `lineage:`       | 90 dagen                  | Op compliance gebaseerd, audittrail                       |
| `audit:`         | 1 jaar                    | Op compliance gebaseerd, juridisch en regelgevend         |
| `cron:`          | 30 dagen                  | Uitvoeringsgeschiedenis voor foutopsporing                |
| `notifications:` | Tot bezorgd + 7 dagen     | Niet-bezorgde meldingen moeten worden bewaard             |
| `exec:`          | 30 dagen                  | Uitvoeringsartefacten voor foutopsporing                  |
| `skills:`        | Permanent                 | Metagegevens van geïnstalleerde skills mogen niet verlopen |
| `config:`        | 10 versies                | Rollende configuratiegeschiedenis voor terugdraaien       |

## Ontwerpprincipes

### Alle modules gebruiken StorageProvider

Geen module in Triggerfish maakt zijn eigen opslagmechanisme. Sessiebeheer, taint-tracking, lineageregistratie, auditregistratie, cron-status, meldingswachtrijen, uitvoeringsgeschiedenis en configuratie — alles stroomt via `StorageProvider`.

Dit betekent:

- Het wisselen van backends vereist het wijzigen van één afhankelijkheidsinjectiepunt
- Tests gebruiken `MemoryStorageProvider` voor snelheid — geen SQLite-setup, geen bestandssysteem
- Er is precies één plek om versleuteling-in-rust, back-up of replicatie te implementeren

### Serialisatie

Alle gestructureerde gegevens worden geserialiseerd naar JSON-strings voor opslag. De serialiseer-/deserialiseerlaag verwerkt:

- `Date`-objecten (geserialiseerd als ISO 8601-strings via `toISOString()`, gedeserialiseerd via `new Date()`)
- Branded types (geserialiseerd als hun onderliggende stringwaarde)
- Geneste objecten en arrays

```typescript
// Een sessie opslaan
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Een sessie ophalen
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Date herstellen
}
```

### Onveranderlijkheid

Sessiebewerkingen zijn onveranderlijk. Een sessie lezen, wijzigen en terug schrijven levert altijd een nieuw object op. Functies muteren het opgeslagen object nooit ter plekke. Dit is in lijn met het bredere Triggerfish-principe dat functies nieuwe objecten retourneren en nooit muteren.

## Mapstructuur

```
~/.triggerfish/
  config/          # Agentconfiguratie, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Uitvoeringsomgeving van agent
    <agent-id>/    # Per-agent-werkruimte (blijft bestaan)
    background/    # Achtergrondssessiewerkruimten
  skills/          # Geïnstalleerde skills
  logs/            # Auditlogboeken
  secrets/         # Versleutelde geheimensopslag
```

::: warning BEVEILIGING De map `secrets/` bevat versleutelde inloggegevens die worden beheerd door de OS-sleutelhangerintegratie. Sla nooit geheimen op in configuratiebestanden of in de `StorageProvider`. Gebruik de OS-sleutelhanger (persoonlijk niveau) of vault-integratie (enterprise niveau). :::
