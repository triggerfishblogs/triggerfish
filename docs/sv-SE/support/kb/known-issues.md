# KB: Kända problem

Aktuella kända problem och deras lösningar. Den här sidan uppdateras när problem identifieras och löses.

---

## E-post: Ingen IMAP-återanslutning

**Status:** Öppen

E-postkanaladaptern pollar efter nya meddelanden var 30:e sekund via IMAP. Om IMAP-anslutningen bryts (nätverksavbrott, serveromstart, inaktiv timeout) misslyckas pollingslingan tyst och försöker inte återansluta.

**Symptom:**
- E-postkanalen slutar ta emot nya meddelanden
- `IMAP unseen email poll failed` visas i loggar
- Ingen automatisk återhämtning

**Lösning:** Starta om daemonen:

```bash
triggerfish stop && triggerfish start
```

**Grundorsak:** IMAP-pollingslingan saknar återanslutningslogik. `setInterval` fortsätter att utlösas men varje poll misslyckas eftersom anslutningen är bruten.

---

## Slack/Discord SDK: Asynkrona operationsläckor

**Status:** Känt uppströmsproblem

Slack-SDK:t (`@slack/bolt`) och Discord-SDK:t (`discord.js`) läcker asynkrona operationer vid import. Det påverkar tester (kräver `sanitizeOps: false`) men påverkar inte produktionsanvändning.

**Symptom:**
- Testfel med "leaking async ops" vid testning av kanaladaptrar
- Ingen produktionspåverkan

**Lösning:** Testfiler som importerar Slack- eller Discord-adaptrar måste ange:

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Meddelandetrunkering istället för uppdelning

**Status:** Avsiktlig design

Slack-meddelanden trunkeras vid 40 000 tecken istället för att delas upp i flera meddelanden (som Telegram och Discord gör). Mycket långa agentsvar förlorar innehåll i slutet.

**Lösning:** Be agenten producera kortare svar, eller använd en annan kanal för uppgifter som genererar stor utdata.

---

## WhatsApp: Alla användare behandlas som ägare när ownerPhone saknas

**Status:** Avsiktlig design (med varning)

Om fältet `ownerPhone` inte är konfigurerat för WhatsApp-kanalen behandlas alla meddelandesändare som ägaren, vilket ger dem full verktygstillgång.

**Symptom:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (loggvarning är faktiskt vilseledande; beteendet ger ägaråtkomst)
- Vilken WhatsApp-användare som helst kan komma åt alla verktyg

**Lösning:** Ange alltid `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH uppdateras inte efter verktygsinstallation

**Status:** Avsiktlig design

Systemd-enheten fångar din skal-PATH vid daemoninstallationstillfället. Om du installerar nya verktyg (MCP-serverbinärer, `npx` osv.) efter att ha installerat daemonen hittar daemonen dem inte.

**Symptom:**
- MCP-servrar misslyckas med att starta
- Verktygsbinärer "hittades ej" även om de fungerar i din terminal

**Lösning:** Ominstallera daemonen för att uppdatera den fångade PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Det gäller även launchd (macOS).

---

## Webbläsare: Flatpak Chrome CDP-begränsningar

**Status:** Plattformsbegränsning

Vissa Flatpak-byggen av Chrome eller Chromium begränsar flaggan `--remote-debugging-port`, vilket förhindrar Triggerfish från att ansluta via Chrome DevTools Protocol.

**Symptom:**
- `CDP endpoint on port X not ready after Yms`
- Webbläsaren startar men Triggerfish kan inte kontrollera den

**Lösning:** Installera Chrome eller Chromium som ett inbyggt paket istället för Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Volymrättigheter med Podman

**Status:** Plattformsspecifikt

När Podman används med rootless-containrar kan UID-mappningen förhindra containern (som körs som UID 65534) från att skriva till datavolymen.

**Symptom:**
- `Permission denied`-fel vid uppstart
- Kan inte skapa konfigurationsfil, databas eller loggar

**Lösning:** Använd monteringsflaggan `:Z` för SELinux-ometikettering och se till att volumkatalogen är skrivbar:

```bash
podman run -v triggerfish-data:/data:Z ...
```

Eller skapa volymen med korrekt ägarskap. Hitta först volymmonteringssökvägen och ändra sedan ägarskap:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Notera "Mountpoint"-sökvägen
podman unshare chown 65534:65534 /sökväg/från/ovan
```

---

## Windows: .NET Framework csc.exe hittades ej

**Status:** Plattformsspecifikt

Windows-installationsverktyget kompilerar ett C#-tjänsteomskript vid installeringstillfället. Om `csc.exe` inte hittas (saknat .NET Framework eller icke-standardinstallationssökväg) misslyckas tjänsteinstallationen.

**Symptom:**
- Installationsverktyget är klart men tjänsten är inte registrerad
- `triggerfish status` visar att tjänsten inte finns

**Lösning:** Installera .NET Framework 4.x, eller kör Triggerfish i förgrundsläge:

```powershell
triggerfish run
```

Håll terminalen öppen. Daemonen körs tills du stänger den.

---

## CalDAV: ETag-konflikter med samtidiga klienter

**Status:** Avsiktlig design (CalDAV-specifikation)

Vid uppdatering eller borttagning av kalenderhändelser använder CalDAV ETags för optimistisk concurrencykontroll. Om en annan klient (telefonapp, webbgränssnitt) ändrade händelsen mellan din läsning och din skrivning misslyckas operationen:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Lösning:** Agenten bör automatiskt försöka igen genom att hämta den senaste händelseversionen. Om den inte gör det, be den "hämta den senaste versionen av händelsen och försök igen."

---

## Minnesfallback: Hemligheter förlorade vid omstart

**Status:** Avsiktlig design

När `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` används lagras hemligheter enbart i minnet och förloras när daemonen startar om. Det här läget är bara avsett för testning.

**Symptom:**
- Hemligheter fungerar tills daemonens omstart
- Efter omstart: `Secret not found`-fel

**Lösning:** Konfigurera en riktig hemlighetsbakänd. På headless Linux, installera `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Refresh-token utfärdas inte vid omauktorisering

**Status:** Google API-beteende

Google utfärdar bara en refresh-token vid den första auktoriseringen. Om du tidigare har auktoriserat appen och kör `triggerfish connect google` igen får du en access-token men ingen refresh-token.

**Symptom:**
- Google API fungerar initialt men misslyckas efter att access-token löper ut (1 timme)
- `No refresh token`-fel

**Lösning:** Återkalla appens åtkomst först och auktorisera sedan om:

1. Gå till [Google-kontobehörigheter](https://myaccount.google.com/permissions)
2. Hitta Triggerfish och klicka på "Remove Access"
3. Kör `triggerfish connect google` igen
4. Google utfärdar nu en ny refresh-token

---

## Rapportera nya problem

Om du stöter på ett problem som inte listas här, kontrollera sidan [GitHub Issues](https://github.com/greghavens/triggerfish/issues). Om det inte redan är rapporterat, rapportera ett nytt ärende enligt [rapporteringsguiden](/sv-SE/support/guides/filing-issues).
