# Obsidian

Verbinden Sie Ihren Triggerfish-Agenten mit einem oder mehreren [Obsidian](https://obsidian.md/)-Vaults, damit er Ihre Notizen lesen, erstellen und durchsuchen kann. Die Integration greift direkt über das Dateisystem auf Vaults zu -- keine Obsidian-App oder Plugin erforderlich.

## Funktionsumfang

Die Obsidian-Integration gibt Ihrem Agenten folgende Tools:

| Tool              | Beschreibung                                  |
| ----------------- | --------------------------------------------- |
| `obsidian_read`   | Inhalt und Frontmatter einer Notiz lesen      |
| `obsidian_write`  | Notiz erstellen oder aktualisieren            |
| `obsidian_list`   | Notizen in einem Ordner auflisten             |
| `obsidian_search` | Notizinhalte durchsuchen                      |
| `obsidian_daily`  | Heutige Tagesnotiz lesen oder erstellen       |
| `obsidian_links`  | Wikilinks auflösen und Backlinks finden       |
| `obsidian_delete` | Eine Notiz löschen                            |

## Einrichtung

### Schritt 1: Vault verbinden

```bash
triggerfish connect obsidian
```

Dies fragt nach Ihrem Vault-Pfad und schreibt die Konfiguration. Sie können es auch manuell konfigurieren.

### Schritt 2: In triggerfish.yaml konfigurieren

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/MainVault
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Private/Health": CONFIDENTIAL
        "Private/Finance": RESTRICTED
        "Work": INTERNAL
        "Public": PUBLIC
```

| Option                  | Typ      | Erforderlich | Beschreibung                                           |
| ----------------------- | -------- | ------------ | ------------------------------------------------------ |
| `vaultPath`             | string   | Ja           | Absoluter Pfad zum Obsidian-Vault-Stammverzeichnis     |
| `defaultClassification` | string   | Nein         | Standard-Klassifizierung für Notizen (Standard: `INTERNAL`) |
| `excludeFolders`        | string[] | Nein         | Zu ignorierende Ordner (Standard: `.obsidian`, `.trash`) |
| `folderClassifications` | object   | Nein         | Ordnerpfade zu Klassifizierungsstufen zuordnen         |

### Mehrere Vaults

Sie können mehrere Vaults mit verschiedenen Klassifizierungsstufen verbinden:

```yaml
obsidian:
  vaults:
    personal:
      vaultPath: ~/Obsidian/Personal
      defaultClassification: CONFIDENTIAL
    work:
      vaultPath: ~/Obsidian/Work
      defaultClassification: INTERNAL
    public:
      vaultPath: ~/Obsidian/PublicNotes
      defaultClassification: PUBLIC
```

## Ordnerbasierte Klassifizierung

Notizen erben die Klassifizierung von ihrem Ordner. Der spezifischste übereinstimmende Ordner gewinnt:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

Mit dieser Konfiguration:

- `Private/todo.md` ist `CONFIDENTIAL`
- `Private/Health/records.md` ist `RESTRICTED`
- `Work/project.md` ist `INTERNAL`
- `notes.md` (Vault-Stammverzeichnis) verwendet `defaultClassification`

Klassifizierungs-Gating gilt: Der Agent kann nur Notizen lesen, deren Klassifizierungsstufe zum aktuellen Session-Taint fließen kann. Eine `PUBLIC`-getaintete Session kann nicht auf `CONFIDENTIAL`-Notizen zugreifen.

## Sicherheit

### Pfadbeschränkung

Alle Dateioperationen sind auf das Vault-Stammverzeichnis beschränkt. Der Adapter verwendet `Deno.realPath`, um Symlinks aufzulösen und Path-Traversal-Angriffe zu verhindern. Jeder Versuch, `../../etc/passwd` oder Ähnliches zu lesen, wird blockiert, bevor auf das Dateisystem zugegriffen wird.

### Vault-Verifizierung

Der Adapter überprüft, dass ein `.obsidian/`-Verzeichnis am Vault-Stammverzeichnis existiert, bevor er den Pfad akzeptiert. Dies stellt sicher, dass Sie auf einen tatsächlichen Obsidian-Vault zeigen, nicht auf ein beliebiges Verzeichnis.

### Klassifizierungsdurchsetzung

- Notizen tragen die Klassifizierung aus ihrer Ordnerzuordnung
- Das Lesen einer `CONFIDENTIAL`-Notiz eskaliert den Session-Taint auf `CONFIDENTIAL`
- Die No-Write-Down-Regel verhindert das Schreiben klassifizierter Inhalte in niedriger klassifizierte Ordner
- Alle Notizoperationen durchlaufen die Standard-Policy-Hooks

## Wikilinks

Der Adapter versteht Obsidians `[[wikilink]]`-Syntax. Das `obsidian_links`-Tool löst Wikilinks in tatsächliche Dateipfade auf und findet alle Notizen, die auf eine bestimmte Notiz zurückverweisen (Backlinks).

## Tagesnotizen

Das `obsidian_daily`-Tool liest oder erstellt die heutige Tagesnotiz unter Verwendung der Tagesnotiz-Ordnerkonvention Ihres Vaults. Wenn die Notiz nicht existiert, wird eine mit einer Standardvorlage erstellt.

## Frontmatter

Notizen mit YAML-Frontmatter werden automatisch geparst. Frontmatter-Felder sind als Metadaten beim Lesen von Notizen verfügbar. Der Adapter bewahrt Frontmatter beim Schreiben oder Aktualisieren von Notizen.
