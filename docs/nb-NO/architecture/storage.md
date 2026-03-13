# Lagring

All tilstandsbasert data i Triggerfish flyter gjennom en enhetlig `StorageProvider`-abstraksjon. Ingen modul oppretter sin egen lagringsmekanisme — hver komponent som trenger persistens tar en `StorageProvider` som avhengighet. Dette designet gjør backends utskiftbare uten å berøre forretningslogikken og holder alle tester raske og deterministiske.

## StorageProvider-grensesnitt

```typescript
interface StorageProvider {
  /** Hent en verdi etter nøkkel. Returnerer null hvis ikke funnet. */
  get(key: string): Promise<StorageValue | null>;

  /** Lagre en verdi ved en nøkkel. Overskriver eksisterende verdi. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Slett en nøkkel. Ingen operasjon hvis nøkkelen ikke eksisterer. */
  delete(key: string): Promise<void>;

  /** List alle nøkler som samsvarer med et valgfritt prefiks. */
  list(prefix?: string): Promise<string[]>;

  /** Slett alle nøkler. Bruk med forsiktighet. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` er en streng. All strukturert data (sesjoner, linjeoppføringer, konfigurasjon) serialiseres til JSON før lagring og deserialiseres ved lesing. Dette holder grensesnittet enkelt og backend-agnostisk. :::

## Implementasjoner

| Backend                 | Brukstilfelle               | Persistens                                        | Konfigurasjon                    |
| ----------------------- | --------------------------- | ------------------------------------------------- | -------------------------------- |
| `MemoryStorageProvider` | Testing, flyktige sesjoner  | Ingen (tapt ved omstart)                          | Ingen konfigurasjon nødvendig    |
| `SqliteStorageProvider` | Standard for personlig nivå | SQLite WAL på `~/.triggerfish/data/triggerfish.db` | Nullkonfigurasjon               |
| Bedriftsbackends        | Bedriftsnivå                | Kundadministrert                                  | Postgres, S3 eller andre backends |

### MemoryStorageProvider

Brukt i alle tester for hastighet og determinisme. Data eksisterer bare i minne og er tapt når prosessen avsluttes. Hver testpakke oppretter en frisk `MemoryStorageProvider`, noe som sikrer at tester er isolerte og reproduserbare.

### SqliteStorageProvider

Standarden for distribusjoner på personlig nivå. Bruker SQLite i WAL-modus (Write-Ahead Logging) for samtidig lesetilgang og krasjsikkerhet. Databasen bor på:

```
~/.triggerfish/data/triggerfish.db
```

SQLite krever ingen konfigurasjon, ingen serverprosess og intet nettverk. En enkelt fil lagrer all Triggerfish-tilstand. `@db/sqlite` Deno-pakken gir bindingen, som krever `--allow-ffi`-tillatelse.

::: tip SQLite WAL-modus lar flere lesere få tilgang til databasen samtidig med én enkelt skriver. Dette er viktig for Gateway, som kan lese sesjonstilstand mens agenten skriver verktøyresultater. :::

### Bedriftsbackends

Bedriftsdistribusjoner kan koble inn eksterne lagringsbackends (Postgres, S3 osv.) uten kodeendringer. Enhver implementasjon av `StorageProvider`-grensesnittet fungerer. Backend konfigureres i `triggerfish.yaml`.

## Navnedelte nøkler

Alle nøkler i lagringssystemet er navnedelt med et prefiks som identifiserer datatypen. Dette forhindrer kollisjoner og gjør det mulig å spørre, beholde og rense data etter kategori.

| Navnerom         | Nøkkelmønster                                | Beskrivelse                                         |
| ---------------- | -------------------------------------------- | --------------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | Sesjonstilstand (samtalehistorikk, metadata)        |
| `taint:`         | `taint:sess_abc123`                          | Session taint-nivå                                  |
| `lineage:`       | `lineage:lin_789xyz`                         | Datalinjeoppføringer (provenansssporing)            |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Revisjonsloggoppføringer                            |
| `cron:`          | `cron:job_daily_report`                      | Cron-jobbtilstand og utførelseshistorikk            |
| `notifications:` | `notifications:notif_456`                    | Varslingskon                                        |
| `exec:`          | `exec:run_789`                               | Agentutførelseemiljøhistorikk                       |
| `skills:`        | `skills:skill_weather`                       | Installert skill-metadata                           |
| `config:`        | `config:v3`                                  | Konfigurasjonsøyeblikksbilder                       |

## Oppbevaringspolicyer

Hvert navnerom har en standard oppbevaringspolicy. Bedriftsdistribusjoner kan tilpasse disse.

| Navnerom         | Standard oppbevaring      | Begrunnelse                                      |
| ---------------- | ------------------------- | ------------------------------------------------ |
| `sessions:`      | 30 dager                  | Samtalehistorikk eldes ut                        |
| `taint:`         | Matcher sesjonoppbevaring | Taint er meningsløs uten sin sesjon              |
| `lineage:`       | 90 dager                  | Samsvarsdrevet, revisjonslogg                    |
| `audit:`         | 1 år                      | Samsvarsdrevet, juridisk og regulatorisk         |
| `cron:`          | 30 dager                  | Utførelseshistorikk for feilsøking               |
| `notifications:` | Inntil levert + 7 dager   | Uleverte varsler må vedvare                      |
| `exec:`          | 30 dager                  | Utførelsesobjekter for feilsøking                |
| `skills:`        | Permanent                 | Installert skill-metadata bør ikke utløpe        |
| `config:`        | 10 versjoner              | Rullende konfigurasjonshistorikk for tilbakestilling |

## Designprinsipper

### Alle moduler bruker StorageProvider

Ingen modul i Triggerfish oppretter sin egen lagringsmekanisme. Sesjonsadministrasjon, taint-sporing, linjeregistrering, revisjonslogging, cron-tilstand, varslingskon, utørelseshistorikk og konfigurasjon — alt flyter gjennom `StorageProvider`.

Dette betyr:

- Bytte av backends krever å endre ett avhengighetsinjeksjonspunkt
- Tester bruker `MemoryStorageProvider` for hastighet — ingen SQLite-oppsett, ingen filsystem
- Det er nøyaktig ett sted å implementere kryptering-i-ro, sikkerhetskopiering eller replikering

### Serialisering

All strukturert data serialiseres til JSON-strenger før lagring. Serialiserings-/deserialiseringslagen håndterer:

- `Date`-objekter (serialisert som ISO 8601-strenger via `toISOString()`, deserialisert via `new Date()`)
- Merkede typer (serialisert som sin underliggende strengverdi)
- Nestede objekter og arrays

```typescript
// Lagre en sesjon
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Hente en sesjon
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Gjenopprett Date
}
```

### Uforanderlighet

Sesjonsoperasjoner er uforanderlige. Å lese en sesjon, endre den og skrive den tilbake produserer alltid et nytt objekt. Funksjoner muterer aldri det lagrede objektet på stedet. Dette er i tråd med det bredere Triggerfish-prinsippet om at funksjoner returnerer nye objekter og aldri muterer.

## Katalogstruktur

```
~/.triggerfish/
  config/          # Agentkonfigurasjon, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Agent utførelseemiljø
    <agent-id>/    # Per-agent arbeidsområde (vedvarer)
    background/    # Bakgrunnssesjon-arbeidsområder
  skills/          # Installerte skills
  logs/            # Revisjonslogger
  secrets/         # Kryptert legitimasjonslager
```

::: warning SIKKERHET `secrets/`-katalogen inneholder kryptert legitimasjon administrert av OS-nøkkelringintegrasjonen. Lagre aldri hemmeligheter i konfigurasjonsfiler eller i `StorageProvider`. Bruk OS-nøkkelringen (personlig nivå) eller vault-integrasjonen (bedriftsnivå). :::
