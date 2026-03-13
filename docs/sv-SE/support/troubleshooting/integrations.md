# Felsökning: Integrationer

## Google Workspace

### OAuth-token utgången eller återkallad

Google OAuth-refreshtoken kan återkallas (av användaren, av Google, eller vid inaktivitet). När det händer:

```
Google OAuth token exchange failed
```

Eller du ser 401-fel på Google API-anrop.

**Åtgärd:** Återautentisera:

```bash
triggerfish connect google
```

Det öppnar en webbläsare för OAuth-samtyckesflödet. Efter att du beviljat åtkomst lagras de nya tokenerna i nyckelringen.

### "No refresh token"

OAuth-flödet returnerade en åtkomsttoken men ingen refreshtoken. Det här händer när:

- Du har redan auktoriserat appen tidigare (Google skickar bara refreshtoken vid den första auktoriseringen)
- OAuth-samtycesskärmen begärde inte offlineåtkomst

**Åtgärd:** Återkalla appens åtkomst i [Google-kontoinställningar](https://myaccount.google.com/permissions), kör sedan `triggerfish connect google` igen. Den här gången skickar Google en ny refreshtoken.

### Förebyggande av samtidig uppdatering

Om flera förfrågningar utlöser en tokenuppdatering samtidigt serialiserar Triggerfish dem så att bara en uppdateringsförfrågan skickas. Om du ser timeouts under tokenuppdatering kan det bero på att den första uppdateringen tar för lång tid.

---

## GitHub

### "GitHub token not found in keychain"

GitHub-integrationen lagrar Personal Access Token i OS-nyckelringen under nyckeln `github-pat`.

**Åtgärd:**

```bash
triggerfish connect github
# eller manuellt:
triggerfish config set-secret github-pat ghp_...
```

### Tokenformat

GitHub stöder två tokenformat:
- Klassiska PAT:ar: `ghp_...`
- Finkorniga PAT:ar: `github_pat_...`

Båda fungerar. Installationsguiden verifierar token genom att anropa GitHub API. Om verifieringen misslyckas:

```
GitHub token verification failed
GitHub API request failed
```

Dubbelkontrollera att token har rätt scopes. För full funktionalitet behöver du: `repo`, `read:org`, `read:user`.

### Kloningsfel

GitHub-klonverktyget har automatisk återförsökslogik:

1. Första försöket: klonar med angiven `--branch`
2. Om grenen inte finns: försöker igen utan `--branch` (använder standardgrenen)

Om båda försöken misslyckas:

```
Clone failed on retry
Clone failed
```

Kontrollera:
- Token har `repo`-scope
- Repot finns och token har åtkomst
- Nätverksanslutning till github.com

### Hastighetsbegränsning

GitHubs API-hastighetsgräns är 5 000 förfrågningar/timme för autentiserade förfrågningar. Antalet återstående förfrågningar och återställningstiden extraheras från svarshuvuden och inkluderas i felmeddelanden:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Det finns ingen automatisk backoff. Vänta tills hastighetsgränsens fönster återställs.

---

## Notion

### "Notion enabled but token not found in keychain"

Notion-integrationen kräver en intern integrationtoken lagrad i nyckelringen.

**Åtgärd:**

```bash
triggerfish connect notion
```

Det frågar efter token och lagrar den i nyckelringen efter att ha verifierat den med Notion API.

### Tokenformat

Notion använder två tokenformat:
- Interna integrationstokens: `ntn_...`
- Äldre tokens: `secret_...`

Båda accepteras. Anslutningsguiden validerar formatet innan lagring.

### Hastighetsbegränsning (429)

Notions API är hastighetsbegränsat till ungefär 3 förfrågningar per sekund. Triggerfish har inbyggd hastighetsbegränsning (konfigurerbar) och återförsökslogik:

- Standardhastighet: 3 förfrågningar/sekund
- Återförsök: upp till 3 gånger vid 429
- Backoff: exponentiell med jitter, börjar vid 1 sekund
- Respekterar `Retry-After`-headern från Notions svar

Om du fortfarande når hastighetsgränser:

```
Notion API rate limited, retrying
```

Minska samtidiga operationer eller sänk hastighetsgränsen i konfigurationen.

### 404 Not Found

```
Notion: 404 Not Found
```

Resursen finns men är inte delad med din integration. I Notion:

1. Öppna sidan eller databasen
2. Klicka på "..."-menyn > "Anslutningar"
3. Lägg till din Triggerfish-integration

### "client_secret removed" (Brytande ändring)

I en säkerhetsuppdatering togs fältet `client_secret` bort från Notion-konfigurationen. Om du har det här fältet i din `triggerfish.yaml`, ta bort det. Notion använder nu enbart OAuth-token lagrad i nyckelringen.

### Nätverksfel

```
Notion API network request failed
Notion API network error: <meddelande>
```

API:et är nåbart. Kontrollera din nätverksanslutning. Om du är bakom en företagsproxy måste Notions API (`api.notion.com`) vara tillgängligt.

---

## CalDAV (Kalender)

### Uppgiftslösning misslyckades

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV-integrationen behöver ett användarnamn och lösenord:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "ditt-användarnamn"
  credential_ref: "secret:caldav:password"
```

Lagra lösenordet:

```bash
triggerfish config set-secret caldav:password <ditt-lösenord>
```

### Identifieringsfel

CalDAV använder en flerstegsidentifieringsprocess:
1. Hitta huvud-URL:en (PROPFIND på välkänd endpoint)
2. Hitta calendar-home-set
3. Lista tillgängliga kalendrar

Om något steg misslyckas:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Vanliga orsaker:
- Fel server-URL (vissa servrar behöver `/dav/principals/` eller `/remote.php/dav/`)
- Uppgifter avvisade (fel användarnamn/lösenord)
- Servern stöder inte CalDAV (vissa servrar annonserar WebDAV men inte CalDAV)

### ETag-mismatch vid uppdatering/borttagning

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV använder ETags för optimistisk concurrencykontroll. Om en annan klient (telefon, webben) ändrade händelsen mellan din läsning och din uppdatering matchar inte ETag:en.

**Åtgärd:** Agenten bör hämta händelsen igen för att få aktuellt ETag, sedan försöka om operationen. Det hanteras automatiskt i de flesta fall.

### "CalDAV credentials not available, executor deferred"

CalDAV-exekutorn startar i ett uppskjutet tillstånd om uppgifter inte kan lösas vid uppstart. Det är icke-dödligt; exekutorn rapporterar fel om du försöker använda CalDAV-verktyg.

---

## MCP-servrar (Model Context Protocol)

### Servern hittades ej

```
MCP server '<namn>' not found
```

Verktygsanropet refererar till en MCP-server som inte är konfigurerad. Kontrollera ditt `mcp_servers`-avsnitt i `triggerfish.yaml`.

### Serverbinären inte i PATH

MCP-servrar startas som subprocesser. Om binären inte hittas:

```
MCP server '<namn>': <valideringsfel>
```

Vanliga problem:
- Kommandot (t.ex. `npx`, `python`, `node`) finns inte i daemonens PATH
- **systemd/launchd PATH-problem:** Daemonen fångar din PATH vid installationstillfället. Om du installerade MCP-serververktyget efter att ha installerat daemonen, installera om daemonen för att uppdatera PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Servern kraschar

Om en MCP-serverprocess kraschar avslutas läslingan och servern blir otillgänglig. Det finns ingen automatisk återanslutning.

**Åtgärd:** Starta om daemonen för att starta om alla MCP-servrar.

### SSE-transport blockerad

MCP-servrar som använder SSE-transport (Server-Sent Events) är föremål för SSRF-kontroller:

```
MCP SSE connection blocked by SSRF policy
```

SSE-URL:er som pekar till privata IP-adresser blockeras. Det är avsiktligt. Använd stdio-transporten för lokala MCP-servrar istället.

### Verktygsanropsfel

```
tools/list failed: <meddelande>
tools/call failed: <meddelande>
```

MCP-servern svarade med ett fel. Det är serverns fel, inte Triggerfishs. Kontrollera MCP-serverns egna loggar för detaljer.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /sökväg/till/vault
```

Den konfigurerade vault-sökvägen i `plugins.obsidian.vault_path` finns inte. Se till att sökvägen är korrekt och tillgänglig.

### Sökvägstraversering blockerad

```
Path traversal rejected: <sökväg>
Path escapes vault boundary: <sökväg>
```

En anteckningssökväg försökte fly vault-katalogen (t.ex. med `../`). Det är en säkerhetskontroll. Alla anteckningsoperationer är begränsade till vault-katalogen.

### Uteslutna mappar

```
Path is excluded: <sökväg>
```

Anteckningen finns i en mapp listad i `exclude_folders`. Ta bort mappen från uteslutningslistan för att komma åt den.

### Klassificeringstillämpning

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Vaulten eller en specifik mapp har en klassificeringsnivå som konfliktar med sessionens taint. Se [Säkerhetsfelsökning](/sv-SE/support/troubleshooting/security) för detaljer om nedskrivningsregler.
