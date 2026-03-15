# KB: Bekende problemen

Huidige bekende problemen en hun tijdelijke oplossingen. Deze pagina wordt bijgewerkt naarmate problemen worden ontdekt en opgelost.

---

## E-mail: geen IMAP-herverbinding

**Status:** Open

De e-mailkanaladapter pollt elke 30 seconden op nieuwe berichten via IMAP. Als de IMAP-verbinding wegvalt (netwerkonderbreking, serverherstart, time-out bij inactiviteit), mislukt de pollinglus zonder melding en wordt er niet geprobeerd opnieuw verbinding te maken.

**Symptomen:**
- E-mailkanaal ontvangt geen nieuwe berichten meer
- `IMAP unseen email poll failed` verschijnt in logboeken
- Geen automatisch herstel

**Tijdelijke oplossing:** Herstart de daemon:

```bash
triggerfish stop && triggerfish start
```

**Hoofdoorzaak:** De IMAP-pollinglus heeft geen herverbindingslogica. De `setInterval` blijft vuren maar elke poll mislukt omdat de verbinding is verbroken.

---

## Slack/Discord SDK: asynchrone operatielekken

**Status:** Bekend upstream-probleem

De Slack (`@slack/bolt`) en Discord (`discord.js`) SDK's lekken asynchrone operaties bij import. Dit beïnvloedt tests (vereist `sanitizeOps: false`) maar heeft geen invloed op productiegebruik.

**Symptomen:**
- Testfouten met "leaking async ops" bij het testen van kanaladapters
- Geen productie-impact

**Tijdelijke oplossing:** Testbestanden die Slack- of Discord-adapters importeren moeten instellen:

```typescript
Deno.test({
  name: "testnaam",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: berichtafkapping in plaats van opsplitsing

**Status:** Ontwerpbeslissing

Slack-berichten worden afgekapt op 40.000 tekens in plaats van te worden opgesplitst in meerdere berichten (zoals Telegram en Discord doen). Zeer lange agentreacties verliezen inhoud aan het einde.

**Tijdelijke oplossing:** Vraag de agent kortere antwoorden te produceren, of gebruik een ander kanaal voor taken die grote uitvoer genereren.

---

## WhatsApp: alle gebruikers behandeld als eigenaar wanneer ownerPhone ontbreekt

**Status:** Ontwerpbeslissing (met waarschuwing)

Als het veld `ownerPhone` niet is geconfigureerd voor het WhatsApp-kanaal, worden alle berichtverzenders als de eigenaar behandeld en krijgen zij volledige tooltoegang.

**Symptomen:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (de logboekwaarschuwing is eigenlijk misleidend; het gedrag verleent eigenaarstoegang)
- Elke WhatsApp-gebruiker heeft toegang tot alle tools

**Tijdelijke oplossing:** Stel altijd `ownerPhone` in:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH niet bijgewerkt na toolinstallatie

**Status:** Ontwerpbeslissing

Het systemd-unitbestand legt uw shell-PATH vast op het moment van daemoninstallatie. Als u na het installeren van de daemon nieuwe tools installeert (MCP-serverbinaire bestanden, `npx`, enz.), kan de daemon deze niet vinden.

**Symptomen:**
- MCP-servers starten niet
- Toolbinaire bestanden "niet gevonden" terwijl ze wel werken in uw terminal

**Tijdelijke oplossing:** Installeer de daemon opnieuw om het vastgelegde PATH bij te werken:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Dit geldt ook voor launchd (macOS).

---

## Browser: Flatpak Chrome CDP-beperkingen

**Status:** Platformbeperking

Sommige Flatpak-builds van Chrome of Chromium beperken de `--remote-debugging-port`-markering, waardoor Triggerfish geen verbinding kan maken via het Chrome DevTools Protocol.

**Symptomen:**
- `CDP endpoint on port X not ready after Yms`
- Browser start maar Triggerfish kan het niet besturen

**Tijdelijke oplossing:** Installeer Chrome of Chromium als een native pakket in plaats van Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: volumemachtigingen met Podman

**Status:** Platformspecifiek

Bij het gebruik van Podman met rootless containers kan de UID-mapping voorkomen dat de container (draaiend als UID 65534) naar het datavolume kan schrijven.

**Symptomen:**
- `Permission denied`-fouten bij opstarten
- Kan geen configuratiebestand, database of logboeken aanmaken

**Tijdelijke oplossing:** Gebruik de `:Z`-volumemontagemarkering voor SELinux-herlabeling en zorg dat de volumedirectory beschrijfbaar is:

```bash
podman run -v triggerfish-data:/data:Z ...
```

Of maak het volume aan met de juiste eigendom. Zoek eerst het volumemontagepad en wijzig daarna de eigendom:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Noteer het "Mountpoint"-pad
podman unshare chown 65534:65534 /pad/van/hierboven
```

---

## Windows: .NET Framework csc.exe niet gevonden

**Status:** Platformspecifiek

Het Windows-installatieprogramma compileert een C#-servicewrapper tijdens de installatie. Als `csc.exe` niet wordt gevonden (ontbrekend .NET Framework of niet-standaard installatiepad), mislukt de serviceinstallatie.

**Symptomen:**
- Installatieprogramma voltooid maar service is niet geregistreerd
- `triggerfish status` toont dat de service niet bestaat

**Tijdelijke oplossing:** Installeer .NET Framework 4.x, of voer Triggerfish uit in voorgrondmodus:

```powershell
triggerfish run
```

Laat het terminal-venster open. De daemon draait totdat u het sluit.

---

## CalDAV: ETag-conflicten met gelijktijdige clients

**Status:** Ontwerpbeslissing (CalDAV-specificatie)

Bij het bijwerken of verwijderen van kalendergebeurtenissen gebruikt CalDAV ETags voor optimistische gelijktijdigheidscontrole. Als een andere client (telefoon-app, webinterface) de gebeurtenis heeft gewijzigd tussen uw lezen en uw schrijven, mislukt de bewerking:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Tijdelijke oplossing:** De agent moet automatisch opnieuw proberen door de nieuwste versie van de gebeurtenis op te halen. Als dit niet gebeurt, vraag de agent dan "de nieuwste versie van de gebeurtenis op te halen en het opnieuw te proberen".

---

## Geheugen-fallback: geheimen verloren bij herstart

**Status:** Ontwerpbeslissing

Bij het gebruik van `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true` worden geheimen alleen in het geheugen opgeslagen en gaan verloren wanneer de daemon herstart. Deze modus is alleen bedoeld voor testdoeleinden.

**Symptomen:**
- Geheimen werken totdat de daemon herstart
- Na herstart: `Secret not found`-fouten

**Tijdelijke oplossing:** Stel een juiste geheimen-backend in. Op een Linux-server zonder desktop, installeer `gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: vernieuwingstoken niet uitgegeven bij herautorisatie

**Status:** Google API-gedrag

Google geeft alleen bij de eerste autorisatie een vernieuwingstoken uit. Als u de app eerder heeft geautoriseerd en `triggerfish connect google` opnieuw uitvoert, krijgt u een toegangstoken maar geen vernieuwingstoken.

**Symptomen:**
- Google API werkt aanvankelijk maar mislukt nadat het toegangstoken vervalt (1 uur)
- `No refresh token`-fout

**Tijdelijke oplossing:** Herroep eerst de toegang van de app en autoriseer daarna opnieuw:

1. Ga naar [Google Account-machtigingen](https://myaccount.google.com/permissions)
2. Zoek Triggerfish en klik op "Toegang verwijderen"
3. Voer `triggerfish connect google` opnieuw uit
4. Google geeft nu een nieuw vernieuwingstoken uit

---

## Nieuwe problemen melden

Als u een probleem tegenkomt dat hier niet vermeld staat, raadpleeg dan de pagina [GitHub Issues](https://github.com/greghavens/triggerfish/issues). Als het nog niet is gemeld, dien dan een nieuwe issue in volgens de [indieningshandleiding](/nl-NL/support/guides/filing-issues).
