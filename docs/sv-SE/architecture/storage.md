# Lagring

All tillståndsdata i Triggerfish flödar via en enhetlig `StorageProvider`-abstraktion. Ingen modul skapar sin egen lagringsmekanism — varje komponent som behöver persistens tar en `StorageProvider` som ett beroende. Den här designen gör backends utbytbara utan att påverka affärslogiken och håller alla tester snabba och deterministiska.

## StorageProvider-gränssnitt

```typescript
interface StorageProvider {
  /** Hämta ett värde med nyckel. Returnerar null om det inte hittas. */
  get(key: string): Promise<StorageValue | null>;

  /** Lagra ett värde vid en nyckel. Skriver över befintligt värde. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Ta bort en nyckel. Ingen åtgärd om nyckeln inte finns. */
  delete(key: string): Promise<void>;

  /** Lista alla nycklar som matchar ett valfritt prefix. */
  list(prefix?: string): Promise<string[]>;

  /** Ta bort alla nycklar. Använd med försiktighet. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` är en sträng. All strukturerad data (sessioner, linjegrafipost, konfiguration) serialiseras till JSON innan lagring och deserialiseras vid läsning. Det håller gränssnittet enkelt och backend-agnostiskt. :::

## Implementeringar

| Backend                 | Användningsfall                 | Persistens                                              | Konfiguration                       |
| ----------------------- | ------------------------------- | ------------------------------------------------------- | ----------------------------------- |
| `MemoryStorageProvider` | Testning, efemera sessioner     | Ingen (förlorad vid omstart)                            | Ingen konfiguration behövs          |
| `SqliteStorageProvider` | Standard för personlig nivå     | SQLite WAL på `~/.triggerfish/data/triggerfish.db`      | Noll konfiguration                  |
| Företagsbackends        | Företagsnivå                    | Kundhanterard                                           | Postgres, S3 eller andra backends   |

### MemoryStorageProvider

Används i alla tester för snabbhet och determinism. Data finns bara i minnet och försvinner när processen avslutas. Varje testsvit skapar en ny `MemoryStorageProvider`, vilket säkerställer att tester är isolerade och reproducerbara.

### SqliteStorageProvider

Standard för personliga driftsättningar. Använder SQLite i WAL-läge (Write-Ahead Logging) för samtidig läsåtkomst och kraschsäkerhet. Databasen finns på:

```
~/.triggerfish/data/triggerfish.db
```

SQLite kräver ingen konfiguration, ingen serverprocess och inget nätverk. En enda fil lagrar hela Triggerfish-tillståndet. `@db/sqlite` Deno-paketet tillhandahåller bindningen, vilket kräver `--allow-ffi`-behörighet.

::: tip SQLite WAL-läge tillåter flera läsare att komma åt databasen samtidigt med en enda skrivare. Det här är viktigt för Gateway, som kan läsa sessionstillstånd medan agenten skriver verktygsresultat. :::

### Företagsbackends

Företagsdriftsättningar kan koppla in externa lagringsbakends (Postgres, S3 osv.) utan kodändringar. Vilken som helst implementering av `StorageProvider`-gränssnittet fungerar. Bakenden konfigureras i `triggerfish.yaml`.

## Namnrymdsnycklar

Alla nycklar i lagringssystemet är namnrymdsattade med ett prefix som identifierar datatypen. Det förhindrar kollisioner och gör det möjligt att fråga, behålla och rensa data per kategori.

| Namnrymd         | Nyckelmönster                                | Beskrivning                                       |
| ---------------- | -------------------------------------------- | ------------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | Sessionstillstånd (konversationshistorik, metadata) |
| `taint:`         | `taint:sess_abc123`                          | Session-taint-nivå                                |
| `lineage:`       | `lineage:lin_789xyz`                         | Datalinjegrafiposter (provensspårning)            |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Revisionsloggposter                               |
| `cron:`          | `cron:job_daily_report`                      | Cron-jobbtillstånd och körningshistorik           |
| `notifications:` | `notifications:notif_456`                    | Notifieringskö                                    |
| `exec:`          | `exec:run_789`                               | Agentkörningsmiljöhistorik                        |
| `skills:`        | `skills:skill_weather`                       | Installerad skill-metadata                        |
| `config:`        | `config:v3`                                  | Konfigurationsögonblicksbilder                    |

## Bevarandepolicyer

Varje namnrymd har en standardbevarandepolicy. Företagsdriftsättningar kan anpassa dessa.

| Namnrymd         | Standardbevarande         | Motivering                                          |
| ---------------- | ------------------------- | --------------------------------------------------- |
| `sessions:`      | 30 dagar                  | Konversationshistorik åldras ut                     |
| `taint:`         | Matchar sessionsbevarande | Taint är meningslöst utan sin session               |
| `lineage:`       | 90 dagar                  | Efterlevnadsdrivet, revisionsspår                   |
| `audit:`         | 1 år                      | Efterlevnadsdrivet, juridiskt och regulatoriskt     |
| `cron:`          | 30 dagar                  | Körningshistorik för felsökning                    |
| `notifications:` | Tills levererat + 7 dagar | Ej levererade notifieringar måste bevaras           |
| `exec:`          | 30 dagar                  | Körningsartefakter för felsökning                  |
| `skills:`        | Permanent                 | Installerad skill-metadata ska inte löpa ut         |
| `config:`        | 10 versioner              | Rullande konfigurationshistorik för återställning   |

## Designprinciper

### Alla moduler använder StorageProvider

Ingen modul i Triggerfish skapar sin egen lagringsmekanism. Sessionshantering, taint-spårning, lineage-registrering, revisionsloggning, cron-tillstånd, notifieringsköer, körningshistorik och konfiguration — allt flödar via `StorageProvider`.

Det innebär:

- Att byta backends kräver att man ändrar en enda beroendeinjektionspunkt
- Tester använder `MemoryStorageProvider` för snabbhet — ingen SQLite-installation, inget filsystem
- Det finns exakt ett ställe att implementera kryptering-i-vila, säkerhetskopiering eller replikering

### Serialisering

All strukturerad data serialiseras till JSON-strängar innan lagring. Serialiserings-/deserialiseringslagret hanterar:

- `Date`-objekt (serialiserade som ISO 8601-strängar via `toISOString()`, deserialiserade via `new Date()`)
- Brandade typer (serialiserade som deras underliggande strängvärde)
- Kapslade objekt och arrayer

```typescript
// Lagra en session
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Hämta en session
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Återställ Date
}
```

### Oföränderlighet

Sessionsoperationer är oföränderliga. Att läsa en session, ändra den och skriva tillbaka den ger alltid ett nytt objekt. Funktioner muterar aldrig det lagrade objektet på plats. Det stämmer överens med den bredare Triggerfish-principen att funktioner returnerar nya objekt och aldrig muterar.

## Katalogstruktur

```
~/.triggerfish/
  config/          # Agentkonfiguration, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Agents körningsmiljö
    <agent-id>/    # Per-agentarbetsyta (bevaras)
    background/    # Bakgrundssessionsarbetsytor
  skills/          # Installerade skills
  logs/            # Revisionsloggar
  secrets/         # Krypterat autentiseringsuppgiftslager
```

::: warning SÄKERHET Katalogen `secrets/` innehåller krypterade uppgifter hanterade av OS-nyckelringsintegrationen. Lagra aldrig hemligheter i konfigurationsfiler eller i `StorageProvider`. Använd OS-nyckelringen (personlig nivå) eller vault-integration (företagsnivå). :::
