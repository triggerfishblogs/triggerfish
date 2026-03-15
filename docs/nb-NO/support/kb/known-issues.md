# KB: Kjente problemer

Gjeldende kjente problemer og løsningsforslag. Denne siden oppdateres etter hvert
som problemer oppdages og løses.

---

## E-post: Ingen IMAP-gjentilkobling

**Status:** Åpen

E-postkanaladapteren poller etter nye meldinger hvert 30. sekund via IMAP. Hvis
IMAP-tilkoblingen faller (nettverksavbrudd, serverrestart, tomgangstidsavbrudd),
mislykkes pollingsløkken lydløst og forsøker ikke å koble til på nytt.

**Symptomer:**
- E-postkanalen slutter å motta nye meldinger
- `IMAP unseen email poll failed` vises i logger
- Ingen automatisk gjenoppretting

**Løsning:** Start daemonen på nytt:

```bash
triggerfish stop && triggerfish start
```

**Rotårsak:** IMAP-pollingsløkken har ingen gjentilkoblinglogikk. `setInterval`
fortsetter å avfyre, men hvert poll mislykkes fordi tilkoblingen er død.

---

## Slack/Discord SDK: Asynkrone operasjonslekkasjer

**Status:** Kjent upstream-problem

Slack (`@slack/bolt`) og Discord (`discord.js`) SDK-ene lekker asynkrone
operasjoner ved import. Dette påvirker tester (krever `sanitizeOps: false`), men
påvirker ikke produksjonsbruk.

**Symptomer:**
- Testfeil med «leaking async ops» ved testing av kanaladaptere
- Ingen produksjonspåvirkning

**Løsning:** Testfiler som importerer Slack- eller Discord-adaptere må angi:

```typescript
Deno.test({
  name: "testnavn",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack: Meldingstrunkering i stedet for deling

**Status:** Etter design

Slack-meldinger trunkeres ved 40 000 tegn i stedet for å deles inn i flere
meldinger (slik Telegram og Discord gjør). Svært lange agentsvar mister innhold
på slutten.

**Løsning:** Be agenten produsere kortere svar, eller bruk en annen kanal for
oppgaver som genererer store utdata.

---

## WhatsApp: Alle brukere behandles som eier når ownerPhone mangler

**Status:** Etter design (med advarsel)

Hvis `ownerPhone`-feltet ikke er konfigurert for WhatsApp-kanalen, behandles alle
meldingssendere som eieren og gis full verktøytilgang.

**Symptomer:**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (loggadvarselen er
  faktisk misvisende; atferden gir eiertilgang)
- Enhver WhatsApp-bruker kan få tilgang til alle verktøy

**Løsning:** Sett alltid `ownerPhone`:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd: PATH ikke oppdatert etter verktøyinstallasjon

**Status:** Etter design

Systemd-enhetsfilen tar opp din shell PATH ved installasjon av daemon. Hvis du
installerer nye verktøy (MCP-serverbinærfiler, `npx`, osv.) etter installasjon
av daemonen, vil ikke daemonen finne dem.

**Symptomer:**
- MCP-servere feiler å starte
- Verktøybinærfiler «ikke funnet» selv om de fungerer i terminalen din

**Løsning:** Reinstaller daemonen for å oppdatere den lagrede PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Dette gjelder også launchd (macOS).

---

## Nettleser: Flatpak Chrome CDP-begrensninger

**Status:** Plattformbegrensning

Noen Flatpak-bygg av Chrome eller Chromium begrenser `--remote-debugging-port`-flagget,
som hindrer Triggerfish i å koble seg til via Chrome DevTools Protocol.

**Symptomer:**
- `CDP endpoint on port X not ready after Yms`
- Nettleseren starter, men Triggerfish kan ikke styre den

**Løsning:** Installer Chrome eller Chromium som en native pakke i stedet for
Flatpak:

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker: Volum-tillatelser med Podman

**Status:** Plattformspesifikk

Når du bruker Podman med rootless-containere, kan UID-tilordningen hindre
containeren (kjørende som UID 65534) fra å skrive til datavolum.

**Symptomer:**
- `Permission denied`-feil ved oppstart
- Kan ikke opprette konfigurasjonsfil, database eller logger

**Løsning:** Bruk `:Z`-volummonteringsflagget for SELinux-relabeling, og sørg for
at volumkatalogen er skrivbar:

```bash
podman run -v triggerfish-data:/data:Z ...
```

Eller opprett volumet med riktig eierskap. Finn volumets monteringsbane, og
endre deretter eierskap:

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Merk "Mountpoint"-banen
podman unshare chown 65534:65534 /bane/fra/ovenfor
```

---

## Windows: .NET Framework csc.exe ikke funnet

**Status:** Plattformspesifikk

Windows-installasjonsprogrammet kompilerer en C#-tjenesteinpakningsfil ved
installasjonstidspunktet. Hvis `csc.exe` ikke er funnet (mangler .NET Framework
eller ikke-standard installasjonsbane), mislykkes tjenesteinstallasjonen.

**Symptomer:**
- Installasjonsprogrammet fullføres, men tjenesten er ikke registrert
- `triggerfish status` viser at tjenesten ikke eksisterer

**Løsning:** Installer .NET Framework 4.x, eller kjør Triggerfish i
forgrunnsmedodus:

```powershell
triggerfish run
```

Hold terminalen åpen. Daemonen kjører inntil du lukker den.

---

## CalDAV: ETag-konflikter med samtidige klienter

**Status:** Etter design (CalDAV-spesifikasjon)

Når du oppdaterer eller sletter kalenderhendelser, bruker CalDAV ETags for
optimistisk samtidighetskontroll. Hvis en annen klient (telefonapp, nettgrensesnitt)
endret hendelsen mellom din lesing og skriving, mislykkes operasjonen:

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Løsning:** Agenten bør automatisk prøve på nytt ved å hente den nyeste
hendelsesversjonen. Hvis den ikke gjør det, be den om å «hente den nyeste versjonen
av hendelsen og prøv igjen».

---

## Minnefallback: Hemmeligheter tapt ved restart

**Status:** Etter design

Når du bruker `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, lagres hemmeligheter
bare i minnet og går tapt når daemonen restarter. Denne modusen er kun beregnet
for testing.

**Symptomer:**
- Hemmeligheter fungerer inntil daemonen restarter
- Etter restart: `Secret not found`-feil

**Løsning:** Sett opp et riktig hemmelighetbackend. På hodeløs Linux, installer
`gnome-keyring`:

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth: Oppdateringstoken ikke utstedt ved ny autorisasjon

**Status:** Google API-atferd

Google utsteder bare et oppdateringstoken ved første autorisasjon. Hvis du
tidligere har autorisert appen og kjører `triggerfish connect google` på nytt,
får du et tilgangstoken, men ikke noe oppdateringstoken.

**Symptomer:**
- Google API fungerer innledningsvis, men mislykkes etter at tilgangstokenet
  utløper (1 time)
- `No refresh token`-feil

**Løsning:** Trekk tilbake appens tilgang først, deretter autoriser på nytt:

1. Gå til [Google Kontotillatelser](https://myaccount.google.com/permissions)
2. Finn Triggerfish og klikk «Fjern tilgang»
3. Kjør `triggerfish connect google` igjen
4. Google utsteder nå et nytt oppdateringstoken

---

## Rapportere nye problemer

Hvis du støter på et problem som ikke er oppført her, sjekk
[GitHub Issues](https://github.com/greghavens/triggerfish/issues)-siden. Hvis det
ikke allerede er rapportert, opprett en ny sak ved å følge
[rapporteringsveiledningen](/nb-NO/support/guides/filing-issues).
