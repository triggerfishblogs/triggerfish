# Feilsøking: Hemmeligheter og legitimasjon

## Nøkkelringbackender per plattform

| Plattform | Backend | Detaljer |
|----------|---------|---------|
| macOS | Nøkkelring (native) | Bruker `security` CLI for tilgang til Nøkkelringtilgang |
| Linux | Secret Service (D-Bus) | Bruker `secret-tool` CLI (libsecret / GNOME Keyring) |
| Windows | Kryptert fillager | `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker | Kryptert fillager | `/data/secrets.json` + `/data/secrets.key` |

Backenden velges automatisk ved oppstart. Du kan ikke endre hvilken backend som
brukes for plattformen din.

---

## macOS-problemer

### Nøkkelringtilgang-prompter

macOS kan be deg om å tillate `triggerfish` å få tilgang til nøkkelringen. Klikk
«Always Allow» for å unngå gjentatte prompter. Hvis du ved et uhell klikket «Deny»,
åpne Nøkkelringtilgang, finn oppføringen og fjern den. Neste tilgang vil spørre igjen.

### Nøkkelringen låst

Hvis macOS-nøkkelringen er låst (f.eks. etter hvilemodus), vil hemmelighetoperasjoner
mislykkes. Lås den opp:

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

Eller lås opp Mac-en din (nøkkelringen låses opp ved innlogging).

---

## Linux-problemer

### «secret-tool» ikke funnet

Linux-nøkkelringbackenden bruker `secret-tool`, som er en del av
`libsecret-tools`-pakken.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Ingen Secret Service-daemon kjøres

På hodeløse servere eller minimale skrivebordsmiljøer er det kanskje ingen Secret
Service-daemon. Symptomer:

- `secret-tool`-kommandoer henger eller mislykkes
- Feilmeldinger om D-Bus-tilkobling

**Alternativer:**

1. **Installer og start GNOME Keyring:**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Bruk kryptert fil-fallback:**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Advarsel: Minnefallback vedvarer ikke hemmeligheter på tvers av restarter.
   Det er kun egnet for testing.

3. **For servere, vurder Docker.** Docker-distribusjonen bruker et kryptert fillager
   som ikke krever en nøkkelringdaemon.

### KDE / KWallet

Hvis du bruker KDE med KWallet i stedet for GNOME Keyring, bør `secret-tool`
fortsatt fungere gjennom Secret Service D-Bus API som KWallet implementerer. Hvis
det ikke gjør det, installer `gnome-keyring` ved siden av KWallet.

---

## Windows / Docker kryptert fillager

### Slik fungerer det

Det krypterte fillageret bruker AES-256-GCM-kryptering:

1. En maskinnøkkel utledes ved hjelp av PBKDF2 og lagres i `secrets.key`
2. Hver hemmelighetverdi krypteres individuelt med en unik IV
3. Krypterte data lagres i `secrets.json` i et versjonert format (`{v: 1, entries: {...}}`)

### «Machine key file permissions too open»

På Unix-baserte systemer (Linux i Docker) må nøkkelfilen ha tillatelser `0600`
(kun eierlese/skriving). Hvis tillatelsene er for åpne:

```
Machine key file permissions too open
```

**Løsning:**

```bash
chmod 600 ~/.triggerfish/secrets.key
# eller i Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### «Machine key file corrupt»

Nøkkelfilen eksisterer, men kan ikke tolkes. Den kan ha blitt avkortet eller
overskrevet.

**Løsning:** Slett nøkkelfilen og regenerer:

```bash
rm ~/.triggerfish/secrets.key
```

Ved neste oppstart genereres en ny nøkkel. Men alle eksisterende hemmeligheter
kryptert med den gamle nøkkelen vil være ulesbare. Du må lagre alle hemmeligheter
på nytt:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Gjenta for alle hemmeligheter
```

### «Secret file permissions too open»

Som med nøkkelfilen bør hemmelighetfilen ha restriktive tillatelser:

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### «Secret file chmod failed»

Systemet kunne ikke sette filtillatelsene. Dette kan skje på filsystemer som ikke
støtter Unix-tillatelser (noen nettverksmonteringer, FAT/exFAT-volumer). Verifiser
at filsystemet støtter tillatelseendringer.

---

## Migrering av eldre hemmeligheter

### Automatisk migrasjon

Hvis Triggerfish oppdager en klartekst-hemmelighetfil (gammelt format uten
kryptering), migrerer det automatisk til kryptert format ved første lasting:

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

Migrasjonen:
1. Leser klartekst-JSON-filen
2. Krypterer hver verdi med AES-256-GCM
3. Skriver til en temp-fil, omdøper deretter atomisk
4. Logger en advarsel som anbefaler hemmelighetrotasjon

### Manuell migrasjon

Hvis du har hemmeligheter i `triggerfish.yaml`-filen (bruker ikke `secret:`-referanser),
migrer dem til nøkkelringen:

```bash
triggerfish config migrate-secrets
```

Dette skanner konfigurasjonen din for kjente hemmelighetfelt (API-nøkler, bot-tokener,
osv.), lagrer dem i nøkkelringen og erstatter verdiene i konfigurasjonsfilen med
`secret:`-referanser.

### Problemer med tverrenhetsflytting

Hvis migrasjonen innebærer å flytte filer på tvers av filsystemgrenser (forskjellige
monteringspunkter, NFS), kan den atomiske omdøpingen mislykkes. Migrasjonen faller
tilbake til kopi-deretter-fjern, som fortsatt er trygt, men midlertidig har begge
filene på disk.

---

## Hemmelighetløsing

### Slik fungerer `secret:`-referanser

Konfigurasjonsverdier med prefiks `secret:` løses ved oppstart:

```yaml
# I triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Ved oppstart, løst til:
apiKey: "sk-ant-api03-actual-key-value..."
```

Den løste verdien lever kun i minnet. Konfigurasjonsfilen på disk inneholder alltid
`secret:`-referansen.

### «Secret not found»

```
Secret not found: <nøkkel>
```

Den refererte nøkkelen eksisterer ikke i nøkkelringen.

**Løsning:**

```bash
triggerfish config set-secret <nøkkel> <verdi>
```

### Liste hemmeligheter

```bash
# List alle lagrede hemmelighetenøkler (verdier vises ikke)
triggerfish config get-secret --list
```

### Slette hemmeligheter

```bash
triggerfish config set-secret <nøkkel> ""
# eller gjennom agenten:
# Agenten kan be om hemmelighetsletting via hemmelighetsverktøyet
```

---

## Miljøvariabel-overstyring

Nøkkelfilbanen kan overstyres med `TRIGGERFISH_KEY_PATH`:

```bash
export TRIGGERFISH_KEY_PATH=/custom/path/secrets.key
```

Dette er hovedsakelig nyttig for Docker-distribusjoner med egendefinerte
volumoppsett.

---

## Vanlige hemmelighetenøkkelnavn

Dette er standard nøkkelringnøklene brukt av Triggerfish:

| Nøkkel | Bruk |
|-----|-------|
| `provider:<navn>:apiKey` | LLM-leverandør API-nøkkel |
| `telegram:botToken` | Telegram bot-token |
| `slack:botToken` | Slack bot-token |
| `slack:appToken` | Slack app-nivå token |
| `slack:signingSecret` | Slack signeringshemmelighet |
| `discord:botToken` | Discord bot-token |
| `whatsapp:accessToken` | WhatsApp Cloud API tilgangstoken |
| `whatsapp:webhookVerifyToken` | WhatsApp webhook-verifiseringstoken |
| `email:smtpPassword` | SMTP-relé passord |
| `email:imapPassword` | IMAP-server passord |
| `web:search:apiKey` | Brave Search API-nøkkel |
| `github-pat` | GitHub Personal Access Token |
| `notion:token` | Notion integrasjonstoken |
| `caldav:password` | CalDAV-server passord |
| `google:clientId` | Google OAuth klient-ID |
| `google:clientSecret` | Google OAuth klienthemmelighet |
| `google:refreshToken` | Google OAuth oppdateringstoken |
