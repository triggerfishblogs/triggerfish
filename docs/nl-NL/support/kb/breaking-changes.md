# KB: Brekende wijzigingen

Een versie-voor-versie lijst van wijzigingen waarvoor mogelijk actie vereist is bij het upgraden.

## Notion: `client_secret` verwijderd

**Commit:** 6d876c3

Het veld `client_secret` is verwijderd uit de Notion-integratieconfiguratie als beveiligingsverhardingsmaatregel. Notion gebruikt nu uitsluitend het OAuth-token dat is opgeslagen in de OS-sleutelhanger.

**Vereiste actie:** Als uw `triggerfish.yaml` een `notion.client_secret`-veld bevat, verwijder dit dan. Het wordt genegeerd maar kan verwarring veroorzaken.

**Nieuwe installatieflow:**

```bash
triggerfish connect notion
```

Dit slaat het integratietoken op in de sleutelhanger. Er is geen client secret nodig.

---

## Toolnamen: punten naar underscores

**Commit:** 505a443

Alle toolnamen zijn gewijzigd van puntnotatie (`foo.bar`) naar underscore-notatie (`foo_bar`). Sommige LLM-providers ondersteunen geen punten in toolnamen, wat tot mislukte toolaanroepen leidde.

**Vereiste actie:** Als u aangepaste beleidsregels of skilldefinities heeft die toolnamen met punten bevatten, werk deze dan bij zodat ze underscores gebruiken:

```yaml
# Vóór
- tool: notion.search

# Na
- tool: notion_search
```

---

## Windows-installatieprogramma: Move-Item naar Copy-Item

**Commit:** 5e0370f

Het Windows PowerShell-installatieprogramma is gewijzigd van `Move-Item -Force` naar `Copy-Item -Force` voor binaire bestandsvervanging tijdens upgrades. `Move-Item` overschrijft bestanden op Windows niet betrouwbaar.

**Vereiste actie:** Geen, als u een schone installatie uitvoert. Als u een oudere versie gebruikt en `triggerfish update` op Windows mislukt, stop de service dan handmatig vóór het bijwerken:

```powershell
Stop-Service Triggerfish
# Voer vervolgens het installatieprogramma of triggerfish update opnieuw uit
```

---

## Versiestempeling: van runtime naar bouwtijd

**Commits:** e8b0c8c, eae3930, 6ce0c25

Versie-informatie is verplaatst van runtime-detectie (controle van `deno.json`) naar bouwtijdstempeling vanuit git-tags. De CLI-banner toont niet langer een vaste versiestring.

**Vereiste actie:** Geen. `triggerfish version` blijft werken. Ontwikkelbuilds tonen `dev` als versie.

---

## Signal: JRE 21 naar JRE 25

**Commit:** e5b1047

Het auto-installatieprogramma van het Signal-kanaal is bijgewerkt om JRE 25 (van Adoptium) te downloaden in plaats van JRE 21. De signal-cli-versie is ook vastgezet op v0.14.0.

**Vereiste actie:** Als u een bestaande signal-cli-installatie heeft met een oudere JRE, voer dan de Signal-instelling opnieuw uit:

```bash
triggerfish config add-channel signal
```

Dit downloadt de bijgewerkte JRE en signal-cli.

---

## Geheimen: plaintext naar versleuteld

Het opslagformaat voor geheimen is gewijzigd van plaintext JSON naar AES-256-GCM-versleutelde JSON.

**Vereiste actie:** Geen. Migratie is automatisch. Zie [Geheimensmigratie](/nl-NL/support/kb/secrets-migration) voor details.

Na de migratie wordt aanbevolen uw geheimen te rouleren omdat de plaintext-versies eerder op schijf waren opgeslagen.

---

## Tidepool: van callback naar canvas-protocol

De Tidepool (A2UI)-interface is gemigreerd van een callback-gebaseerde `TidepoolTools`-interface naar een canvas-gebaseerd protocol.

**Betrokken bestanden:**
- `src/tools/tidepool/tools/tools_legacy.ts` (oude interface, behouden voor compatibiliteit)
- `src/tools/tidepool/tools/tools_canvas.ts` (nieuwe interface)

**Vereiste actie:** Als u aangepaste skills heeft die de oude Tidepool callback-interface gebruiken, blijven ze werken via de legacy-shim. Nieuwe skills moeten het canvas-protocol gebruiken.

---

## Configuratie: verouderd `primary`-tekenreeksformaat

Het veld `models.primary` accepteerde voorheen een gewone tekenreeks (`"anthropic/claude-sonnet-4-20250514"`). Het vereist nu een object:

```yaml
# Verouderd (nog steeds geaccepteerd voor achterwaartse compatibiliteit)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Huidig (aanbevolen)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Vereiste actie:** Werk bij naar het objectformaat. Het tekenreeksformaat wordt nog steeds verwerkt maar kan in een toekomstige versie worden verwijderd.

---

## Consolelogboekregistratie: verwijderd

**Commit:** 9ce1ce5

Alle onbewerkte `console.log`-, `console.warn`- en `console.error`-aanroepen zijn gemigreerd naar de gestructureerde logger (`createLogger()`). Omdat Triggerfish als daemon draait, is stdout/stderr-uitvoer niet zichtbaar voor gebruikers. Alle logboekregistratie gaat nu via de bestandsschrijver.

**Vereiste actie:** Geen. Als u afhankelijk was van console-uitvoer voor foutopsporing (bijv. stdout doorpijpen), gebruik dan `triggerfish logs` in plaats daarvan.

---

## Impact inschatten

Bij het upgraden over meerdere versies, controleer elk hierboven vermeld punt. De meeste wijzigingen zijn achterwaarts compatibel met automatische migratie. De enige wijzigingen waarvoor handmatige actie vereist is:

1. **Verwijdering van Notion client_secret** (verwijder het veld uit de configuratie)
2. **Wijziging van toolnaamformaat** (werk aangepaste beleidsregels bij)
3. **Signal JRE-update** (voer Signal-instelling opnieuw uit als u Signal gebruikt)

Al het overige wordt automatisch afgehandeld.
