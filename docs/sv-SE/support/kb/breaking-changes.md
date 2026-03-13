# KB: Brytande ändringar

En version-för-version lista med ändringar som kan kräva åtgärd vid uppgradering.

## Notion: `client_secret` borttagen

**Commit:** 6d876c3

Fältet `client_secret` togs bort från Notion-integrationskonfigurationen som en säkerhetshärdningsåtgärd. Notion använder nu enbart OAuth-token lagrad i OS-nyckelringen.

**Krävd åtgärd:** Om din `triggerfish.yaml` har ett `notion.client_secret`-fält, ta bort det. Det ignoreras men kan orsaka förvirring.

**Nytt installationsflöde:**

```bash
triggerfish connect notion
```

Det lagrar integreringstoken i nyckelringen. Ingen klienthemlighet behövs.

---

## Verktygsnamn: Punkter till understreck

**Commit:** 505a443

Alla verktygsnamn ändrades från punktnotation (`foo.bar`) till understrecksnotation (`foo_bar`). Vissa LLM-leverantörer stöder inte punkter i verktygsnamn, vilket orsakade fel vid verktygsanrop.

**Krävd åtgärd:** Om du har anpassade policyregler eller kunskapsdefinitioner som refererar till verktygsnamn med punkter, uppdatera dem att använda understreck:

```yaml
# Före
- tool: notion.search

# Efter
- tool: notion_search
```

---

## Windows-installationsverktyg: Move-Item till Copy-Item

**Commit:** 5e0370f

Windows PowerShell-installationsverktyget ändrades från `Move-Item -Force` till `Copy-Item -Force` för binärersättning under uppgraderingar. `Move-Item` skriver inte tillförlitligt över filer på Windows.

**Krävd åtgärd:** Ingen om du installerar nytt. Om du är på en äldre version och `triggerfish update` misslyckas på Windows, stoppa tjänsten manuellt innan uppdatering:

```powershell
Stop-Service Triggerfish
# Kör sedan om installationsverktyget eller triggerfish update
```

---

## Versionsstämpling: Körtid till byggtid

**Commits:** e8b0c8c, eae3930, 6ce0c25

Versionsinformation flyttades från körtidsidentifiering (kontroll av `deno.json`) till byggtidsstämpling från git-taggar. CLI-bannern visar inte längre en hårdkodad versionssträng.

**Krävd åtgärd:** Ingen. `triggerfish version` fortsätter att fungera. Utvecklingsbyggen visar `dev` som versionen.

---

## Signal: JRE 21 till JRE 25

**Commit:** e5b1047

Signal-kanalens autoinstallationsverktyg uppdaterades för att ladda ner JRE 25 (från Adoptium) istället för JRE 21. Signal-cli-versionen fästes också vid v0.14.0.

**Krävd åtgärd:** Om du har en befintlig signal-cli-installation med en äldre JRE, kör Signal-installationen igen:

```bash
triggerfish config add-channel signal
```

Det laddar ner den uppdaterade JRE och signal-cli.

---

## Hemligheter: Klartext till krypterad

Hemlighetlagringsformatet ändrades från klartext-JSON till AES-256-GCM-krypterad JSON.

**Krävd åtgärd:** Ingen. Migration är automatisk. Se [Hemlighetsmigrering](/sv-SE/support/kb/secrets-migration) för detaljer.

Efter migration rekommenderas att du roterar dina hemligheter eftersom klartextversionerna tidigare lagrades på disk.

---

## Tidepool: Callback till Canvas-protokoll

Tidepool-gränssnittet (A2UI) migrerade från ett callback-baserat `TidepoolTools`-gränssnitt till ett canvas-baserat protokoll.

**Påverkade filer:**
- `src/tools/tidepool/tools/tools_legacy.ts` (gammalt gränssnitt, behålls för kompatibilitet)
- `src/tools/tidepool/tools/tools_canvas.ts` (nytt gränssnitt)

**Krävd åtgärd:** Om du har anpassade kunskaper som använder det gamla Tidepool callback-gränssnittet fortsätter de att fungera via det legacy-kompatibilitetsskiktet. Nya kunskaper bör använda canvas-protokollet.

---

## Konfiguration: Legacy `primary` strängformat

Fältet `models.primary` accepterade tidigare en vanlig sträng (`"anthropic/claude-sonnet-4-20250514"`). Nu krävs ett objekt:

```yaml
# Legacy (fortfarande accepterat för bakåtkompatibilitet)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Aktuell (föredragen)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Krävd åtgärd:** Uppdatera till objektformatet. Strängformatet tolkas fortfarande men kan tas bort i en framtida version.

---

## Konsolloggning: Borttagen

**Commit:** 9ce1ce5

Alla råa `console.log`-, `console.warn`- och `console.error`-anrop migrerades till den strukturerade loggaren (`createLogger()`). Eftersom Triggerfish körs som en daemon är stdout/stderr-utdata inte synlig för användare. All loggning går nu via filskrivaren.

**Krävd åtgärd:** Ingen. Om du förlitade dig på konsoloutdata för felsökning (t.ex. dirigering av stdout), använd `triggerfish logs` istället.

---

## Uppskatta påverkan

När du uppgraderar över flera versioner, kontrollera varje post ovan. De flesta ändringar är bakåtkompatibla med automatisk migration. De enda ändringar som kräver manuell åtgärd är:

1. **Notion client_secret-borttagning** (ta bort fältet från konfigurationen)
2. **Verktygsnamnsformatändring** (uppdatera anpassade policyregler)
3. **Signal JRE-uppdatering** (kör Signal-inställning igen om du använder Signal)

Allt annat hanteras automatiskt.
