# Speicherung

Alle zustandsbehafteten Daten in Triggerfish fliessen durch eine einheitliche `StorageProvider`-Abstraktion. Kein Modul erstellt seinen eigenen Speichermechanismus -- jede Komponente, die Persistenz benoetigt, erhaelt einen `StorageProvider` als Abhaengigkeit. Dieses Design macht Backends austauschbar, ohne Geschaeftslogik aendern zu muessen, und haelt alle Tests schnell und deterministisch.

## StorageProvider-Schnittstelle

```typescript
interface StorageProvider {
  /** Wert anhand des Schluessels abrufen. Gibt null zurueck, wenn nicht gefunden. */
  get(key: string): Promise<StorageValue | null>;

  /** Wert unter einem Schluessel speichern. Ueberschreibt bestehende Werte. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Schluessel loeschen. Keine Aktion, wenn der Schluessel nicht existiert. */
  delete(key: string): Promise<void>;

  /** Alle Schluessel auflisten, die einem optionalen Praefix entsprechen. */
  list(prefix?: string): Promise<string[]>;

  /** Alle Schluessel loeschen. Mit Vorsicht verwenden. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` ist ein String. Alle strukturierten Daten (Sessions, Lineage-Datensaetze, Konfiguration) werden vor der Speicherung zu JSON serialisiert und beim Lesen deserialisiert. Dies haelt die Schnittstelle einfach und Backend-agnostisch. :::

## Implementierungen

| Backend                 | Anwendungsfall              | Persistenz                                         | Konfiguration                     |
| ----------------------- | --------------------------- | -------------------------------------------------- | --------------------------------- |
| `MemoryStorageProvider` | Tests, kurzlebige Sessions  | Keine (geht bei Neustart verloren)                 | Keine Konfiguration erforderlich  |
| `SqliteStorageProvider` | Standard fuer persoenliche Stufe | SQLite WAL unter `~/.triggerfish/data/triggerfish.db` | Keine Konfiguration            |
| Enterprise-Backends     | Enterprise-Stufe            | Kundenseitig verwaltet                             | Postgres, S3 oder andere Backends |

### MemoryStorageProvider

Wird in allen Tests fuer Geschwindigkeit und Determinismus verwendet. Daten existieren nur im Speicher und gehen verloren, wenn der Prozess beendet wird. Jede Testsuite erstellt einen neuen `MemoryStorageProvider`, um sicherzustellen, dass Tests isoliert und reproduzierbar sind.

### SqliteStorageProvider

Der Standard fuer persoenliche Bereitstellungen. Verwendet SQLite im WAL-Modus (Write-Ahead Logging) fuer gleichzeitigen Lesezugriff und Absturzsicherheit. Die Datenbank befindet sich unter:

```
~/.triggerfish/data/triggerfish.db
```

SQLite erfordert keine Konfiguration, keinen Serverprozess und kein Netzwerk. Eine einzelne Datei speichert den gesamten Triggerfish-Zustand. Das `@db/sqlite` Deno-Paket stellt die Anbindung bereit, die die Berechtigung `--allow-ffi` erfordert.

::: tip SQLite WAL-Modus ermoeglicht mehreren Lesern den gleichzeitigen Zugriff auf die Datenbank bei einem einzigen Schreiber. Dies ist wichtig fuer das Gateway, das moeglicherweise den Session-Zustand liest, waehrend der Agent Tool-Ergebnisse schreibt. :::

### Enterprise-Backends

Enterprise-Bereitstellungen koennen externe Speicher-Backends (Postgres, S3 usw.) ohne Codeaenderungen einbinden. Jede Implementierung der `StorageProvider`-Schnittstelle funktioniert. Das Backend wird in `triggerfish.yaml` konfiguriert.

## Namensraum-Schluessel

Alle Schluessel im Speichersystem sind mit einem Praefix versehen, das den Datentyp identifiziert. Dies verhindert Kollisionen und ermoeglicht das Abfragen, Aufbewahren und Loeschen von Daten nach Kategorie.

| Namensraum       | Schluessel-Muster                            | Beschreibung                                         |
| ---------------- | -------------------------------------------- | ---------------------------------------------------- |
| `sessions:`      | `sessions:sess_abc123`                       | Session-Zustand (Gespraechsverlauf, Metadaten)       |
| `taint:`         | `taint:sess_abc123`                          | Session-Taint-Stufe                                  |
| `lineage:`       | `lineage:lin_789xyz`                         | Daten-Lineage-Datensaetze (Herkunftsverfolgung)      |
| `audit:`         | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Audit-Log-Eintraege                                  |
| `cron:`          | `cron:job_daily_report`                      | Cron-Job-Zustand und Ausfuehrungshistorie            |
| `notifications:` | `notifications:notif_456`                    | Benachrichtigungs-Warteschlange                      |
| `exec:`          | `exec:run_789`                               | Agenten-Ausfuehrungsumgebungs-Historie               |
| `skills:`        | `skills:skill_weather`                       | Installierte Skill-Metadaten                         |
| `config:`        | `config:v3`                                  | Konfigurations-Snapshots                             |

## Aufbewahrungsrichtlinien

Jeder Namensraum hat eine Standard-Aufbewahrungsrichtlinie. Enterprise-Bereitstellungen koennen diese anpassen.

| Namensraum       | Standard-Aufbewahrung         | Begruendung                                       |
| ---------------- | ----------------------------- | ------------------------------------------------- |
| `sessions:`      | 30 Tage                      | Gespraechsverlauf veraltet                        |
| `taint:`         | Entspricht Session-Aufbewahrung | Taint ist ohne seine Session bedeutungslos        |
| `lineage:`       | 90 Tage                      | Compliance-gesteuert, Audit-Trail                 |
| `audit:`         | 1 Jahr                       | Compliance-gesteuert, rechtlich und regulatorisch |
| `cron:`          | 30 Tage                      | Ausfuehrungshistorie zur Fehlersuche              |
| `notifications:` | Bis zugestellt + 7 Tage      | Nicht zugestellte Benachrichtigungen muessen persistieren |
| `exec:`          | 30 Tage                      | Ausfuehrungsartefakte zur Fehlersuche             |
| `skills:`        | Permanent                    | Installierte Skill-Metadaten sollten nicht ablaufen |
| `config:`        | 10 Versionen                 | Rollierende Konfigurationshistorie fuer Rollback  |

## Designprinzipien

### Alle Module verwenden StorageProvider

Kein Modul in Triggerfish erstellt seinen eigenen Speichermechanismus. Session-Verwaltung, Taint-Tracking, Lineage-Aufzeichnung, Audit-Logging, Cron-Zustand, Benachrichtigungs-Warteschlangen, Ausfuehrungshistorie und Konfiguration -- alles fliesst durch `StorageProvider`.

Das bedeutet:

- Der Wechsel von Backends erfordert die Aenderung eines einzigen Dependency-Injection-Punktes
- Tests verwenden `MemoryStorageProvider` fuer Geschwindigkeit -- kein SQLite-Setup, kein Dateisystem
- Es gibt genau eine Stelle fuer die Implementierung von Verschluesselung im Ruhezustand, Backup oder Replikation

### Serialisierung

Alle strukturierten Daten werden vor der Speicherung zu JSON-Strings serialisiert. Die Serialisierungs-/Deserialisierungsschicht behandelt:

- `Date`-Objekte (serialisiert als ISO-8601-Strings ueber `toISOString()`, deserialisiert ueber `new Date()`)
- Branded Types (serialisiert als ihr zugrundeliegender String-Wert)
- Verschachtelte Objekte und Arrays

```typescript
// Eine Session speichern
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Eine Session abrufen
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Date wiederherstellen
}
```

### Unveraenderlichkeit

Session-Operationen sind unveraenderlich. Das Lesen einer Session, ihre Modifikation und das Zurueckschreiben erzeugt immer ein neues Objekt. Funktionen mutieren niemals das gespeicherte Objekt direkt. Dies steht im Einklang mit dem uebergeordneten Triggerfish-Prinzip, dass Funktionen neue Objekte zurueckgeben und niemals mutieren.

## Verzeichnisstruktur

```
~/.triggerfish/
  config/          # Agenten-Konfiguration, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Agenten-Exec-Umgebung
    <agent-id>/    # Pro-Agent-Arbeitsbereich (persistent)
    background/    # Hintergrund-Session-Arbeitsbereiche
  skills/          # Installierte Skills
  logs/            # Audit-Logs
  secrets/         # Verschluesselter Anmeldedaten-Speicher
```

::: warning SICHERHEIT Das `secrets/`-Verzeichnis enthaelt verschluesselte Anmeldedaten, die von der Betriebssystem-Schluesselbund-Integration verwaltet werden. Speichern Sie Secrets niemals in Konfigurationsdateien oder im `StorageProvider`. Verwenden Sie den Betriebssystem-Schluesselbund (persoenliche Stufe) oder die Vault-Integration (Enterprise-Stufe). :::
