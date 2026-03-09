# KB: Breaking Changes

Eine Version-fuer-Version-Liste von Aenderungen, die beim Upgrade moeglicherweise Massnahmen erfordern.

## Notion: `client_secret` entfernt

**Commit:** 6d876c3

Das Feld `client_secret` wurde als Sicherheitsmassnahme aus der Notion-Integrationskonfiguration entfernt. Notion verwendet jetzt nur noch das im Betriebssystem-Schluesselbund gespeicherte OAuth-Token.

**Erforderliche Massnahme:** Wenn Ihre `triggerfish.yaml` ein `notion.client_secret`-Feld enthaelt, entfernen Sie es. Es wird ignoriert, kann aber zu Verwirrung fuehren.

**Neuer Setup-Ablauf:**

```bash
triggerfish connect notion
```

Dies speichert das Integrationstoken im Schluesselbund. Kein Client-Secret wird benoetigt.

---

## Tool-Namen: Punkte zu Unterstrichen

**Commit:** 505a443

Alle Tool-Namen wurden von Punkt-Notation (`foo.bar`) zu Unterstrich-Notation (`foo_bar`) geaendert. Einige LLM-Provider unterstuetzen keine Punkte in Tool-Namen, was zu Fehlern bei Tool-Aufrufen fuehrte.

**Erforderliche Massnahme:** Wenn Sie benutzerdefinierte Policy-Regeln oder Skill-Definitionen haben, die Tool-Namen mit Punkten referenzieren, aktualisieren Sie diese auf Unterstriche:

```yaml
# Vorher
- tool: notion.search

# Nachher
- tool: notion_search
```

---

## Windows-Installer: Move-Item zu Copy-Item

**Commit:** 5e0370f

Der Windows-PowerShell-Installer wurde von `Move-Item -Force` auf `Copy-Item -Force` fuer die Binaer-Ersetzung bei Upgrades umgestellt. `Move-Item` ueberschreibt Dateien unter Windows nicht zuverlaessig.

**Erforderliche Massnahme:** Keine, wenn Sie frisch installieren. Wenn Sie auf einer aelteren Version sind und `triggerfish update` unter Windows fehlschlaegt, stoppen Sie den Dienst manuell vor dem Update:

```powershell
Stop-Service Triggerfish
# Dann den Installer oder triggerfish update erneut ausfuehren
```

---

## Versionsstempelung: Laufzeit zu Build-Zeit

**Commits:** e8b0c8c, eae3930, 6ce0c25

Versionsinformationen wurden von der Laufzeiterkennung (Pruefen von `deno.json`) auf Build-Zeit-Stempelung aus Git-Tags umgestellt. Das CLI-Banner zeigt keine fest codierte Versionszeichenkette mehr an.

**Erforderliche Massnahme:** Keine. `triggerfish version` funktioniert weiterhin. Entwicklungs-Builds zeigen `dev` als Version.

---

## Signal: JRE 21 zu JRE 25

**Commit:** e5b1047

Der Auto-Installer des Signal-Kanals wurde aktualisiert, um JRE 25 (von Adoptium) anstelle von JRE 21 herunterzuladen. Die signal-cli-Version wurde ebenfalls auf v0.14.0 fixiert.

**Erforderliche Massnahme:** Wenn Sie eine bestehende signal-cli-Installation mit einem aelteren JRE haben, fuehren Sie das Signal-Setup erneut aus:

```bash
triggerfish config add-channel signal
```

Dies laedt das aktualisierte JRE und signal-cli herunter.

---

## Secrets: Klartext zu verschluesselt

Das Secrets-Speicherformat wurde von Klartext-JSON auf AES-256-GCM-verschluesseltes JSON umgestellt.

**Erforderliche Massnahme:** Keine. Die Migration erfolgt automatisch. Siehe [Secrets-Migration](/de-DE/support/kb/secrets-migration) fuer Details.

Nach der Migration wird die Rotation Ihrer Secrets empfohlen, da die Klartext-Versionen zuvor auf der Festplatte gespeichert waren.

---

## Tidepool: Callback zu Canvas-Protokoll

Das Tidepool (A2UI)-Interface migrierte von einem Callback-basierten `TidepoolTools`-Interface zu einem Canvas-basierten Protokoll.

**Betroffene Dateien:**
- `src/tools/tidepool/tools/tools_legacy.ts` (altes Interface, fuer Kompatibilitaet beibehalten)
- `src/tools/tidepool/tools/tools_canvas.ts` (neues Interface)

**Erforderliche Massnahme:** Wenn Sie benutzerdefinierte Skills haben, die das alte Tidepool-Callback-Interface verwenden, funktionieren diese weiterhin ueber den Legacy-Shim. Neue Skills sollten das Canvas-Protokoll verwenden.

---

## Config: Legacy-`primary`-String-Format

Das Feld `models.primary` akzeptierte zuvor eine einfache Zeichenkette (`"anthropic/claude-sonnet-4-20250514"`). Es erfordert jetzt ein Objekt:

```yaml
# Legacy (wird weiterhin fuer Rueckwaertskompatibilitaet akzeptiert)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Aktuell (bevorzugt)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Erforderliche Massnahme:** Aktualisieren Sie auf das Objekt-Format. Das String-Format wird noch geparst, kann aber in einer zukuenftigen Version entfernt werden.

---

## Konsolen-Logging: Entfernt

**Commit:** 9ce1ce5

Alle rohen `console.log`-, `console.warn`- und `console.error`-Aufrufe wurden auf den strukturierten Logger (`createLogger()`) migriert. Da Triggerfish als Daemon laeuft, ist stdout/stderr-Ausgabe fuer Benutzer nicht sichtbar. Alle Logs werden jetzt ueber den Dateischreiber geleitet.

**Erforderliche Massnahme:** Keine. Wenn Sie sich zum Debuggen auf Konsolenausgabe verlassen haben (z.B. stdout umleiten), verwenden Sie stattdessen `triggerfish logs`.

---

## Auswirkungen abschaetzen

Beim Upgrade ueber mehrere Versionen hinweg pruefen Sie jeden Eintrag oben. Die meisten Aenderungen sind rueckwaertskompatibel mit automatischer Migration. Die einzigen Aenderungen, die manuelle Massnahmen erfordern, sind:

1. **Notion client_secret-Entfernung** (Feld aus der Konfiguration entfernen)
2. **Tool-Namensformat-Aenderung** (benutzerdefinierte Policy-Regeln aktualisieren)
3. **Signal JRE-Update** (Signal-Setup erneut ausfuehren, wenn Sie Signal verwenden)

Alles andere wird automatisch behandelt.
