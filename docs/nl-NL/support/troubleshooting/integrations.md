# Probleemoplossing: Integraties

## Google Workspace

### OAuth-token verlopen of ingetrokken

Google OAuth-vernieuwingstokens kunnen worden ingetrokken (door de gebruiker, door Google, of door inactiviteit). Wanneer dit gebeurt:

```
Google OAuth token exchange failed
```

Of u ziet 401-fouten op Google API-aanroepen.

**Oplossing:** Opnieuw authenticeren:

```bash
triggerfish connect google
```

Dit opent een browser voor de OAuth-toestemmingsstroom. Na het verlenen van toegang worden de nieuwe tokens opgeslagen in de sleutelhanger.

### "No refresh token"

De OAuth-stroom heeft een toegangstoken teruggegeven maar geen vernieuwingstoken. Dit gebeurt wanneer:

- U de app al eerder heeft geautoriseerd (Google stuurt het vernieuwingstoken alleen bij de eerste autorisatie)
- Het OAuth-toestemmingsscherm geen offline toegang heeft aangevraagd

**Oplossing:** Herroep de toegang van de app in [Google Account-instellingen](https://myaccount.google.com/permissions) en voer daarna `triggerfish connect google` opnieuw uit. Ditmaal stuurt Google een nieuw vernieuwingstoken.

### Preventie van gelijktijdige vernieuwing

Als meerdere verzoeken tegelijkertijd een tokenvernieuwing activeren, serialiseert Triggerfish ze zodat slechts één vernieuwingsverzoek wordt verzonden. Als u time-outs ziet tijdens tokenvernieuwing, kan het zijn dat de eerste vernieuwing te lang duurt.

---

## GitHub

### "GitHub token not found in keychain"

De GitHub-integratie slaat het Personal Access Token op in de OS-sleutelhanger onder de sleutel `github-pat`.

**Oplossing:**

```bash
triggerfish connect github
# of handmatig:
triggerfish config set-secret github-pat ghp_...
```

### Tokenformaat

GitHub ondersteunt twee tokenformaten:
- Klassieke PAT's: `ghp_...`
- Fijnmazige PAT's: `github_pat_...`

Beide werken. De installatiewizard verifieert het token door de GitHub API aan te roepen. Als verificatie mislukt:

```
GitHub token verification failed
GitHub API request failed
```

Controleer of het token de vereiste bereiken heeft. Voor volledige functionaliteit heeft u nodig: `repo`, `read:org`, `read:user`.

### Kloonfouten

De GitHub-klontool heeft auto-herproberingslogica:

1. Eerste poging: kloont met de opgegeven `--branch`
2. Als de branch niet bestaat: probeert opnieuw zonder `--branch` (gebruikt standaardbranch)

Als beide pogingen mislukken:

```
Clone failed on retry
Clone failed
```

Controleer:
- Token heeft het bereik `repo`
- Repository bestaat en het token heeft toegang
- Netwerkverbinding met github.com

### Snelheidsbegrenzing

De API-snelheidslimiet van GitHub is 5.000 verzoeken/uur voor geauthenticeerde verzoeken. Het resterend aantal snelheidslimieten en de resettijd worden geëxtraheerd uit responsheaders en opgenomen in foutmeldingen:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Er is geen automatische terugval. Wacht totdat het snelheidslimitvenster reset.

---

## Notion

### "Notion enabled but token not found in keychain"

De Notion-integratie vereist een intern integratietoken opgeslagen in de sleutelhanger.

**Oplossing:**

```bash
triggerfish connect notion
```

Dit vraagt om het token en slaat het op in de sleutelhanger na verificatie met de Notion API.

### Tokenformaat

Notion gebruikt twee tokenformaten:
- Interne integratietokens: `ntn_...`
- Verouderde tokens: `secret_...`

Beide worden geaccepteerd. De verbindingswizard valideert het formaat vóór opslaan.

### Snelheidsbegrenzing (429)

De Notion API heeft een snelheidslimiet van ongeveer 3 verzoeken per seconde. Triggerfish heeft ingebouwde snelheidsbegrenzing (configureerbaar) en herproberingslogica:

- Standaard tarief: 3 verzoeken/seconde
- Pogingen: tot 3 keer bij 429
- Terugval: exponentieel met jitter, beginnend bij 1 seconde
- Respecteert de `Retry-After`-header van de reactie van Notion

Als u toch snelheidslimieten bereikt:

```
Notion API rate limited, retrying
```

Verminder gelijktijdige bewerkingen of verlaag de snelheidslimiet in de configuratie.

### 404 Not Found

```
Notion: 404 Not Found
```

De resource bestaat maar is niet gedeeld met uw integratie. In Notion:

1. Open de pagina of database
2. Klik op het "..."-menu > "Verbindingen"
3. Voeg uw Triggerfish-integratie toe

### "client_secret removed" (brekende wijziging)

In een beveiligingsupdate is het veld `client_secret` verwijderd uit de Notion-configuratie. Als u dit veld heeft in uw `triggerfish.yaml`, verwijder het dan. Notion gebruikt nu alleen het OAuth-token dat is opgeslagen in de sleutelhanger.

### Netwerkfouten

```
Notion API network request failed
Notion API network error: <bericht>
```

De API is onbereikbaar. Controleer uw netwerkverbinding. Als u achter een bedrijfsproxy zit, moet de Notion API (`api.notion.com`) toegankelijk zijn.

---

## CalDAV (Agenda)

### Oplossingsfout inloggegevens

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

De CalDAV-integratie heeft een gebruikersnaam en wachtwoord nodig:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "uw-gebruikersnaam"
  credential_ref: "secret:caldav:password"
```

Sla het wachtwoord op:

```bash
triggerfish config set-secret caldav:password <uw-wachtwoord>
```

### Ontdekkingsfouten

CalDAV gebruikt een meerstapsontdekkingsproces:
1. Vind de principal URL (PROPFIND op het bekende eindpunt)
2. Vind de calendar-home-set
3. Maak een lijst van beschikbare kalenders

Als een stap mislukt:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Veelvoorkomende oorzaken:
- Verkeerde server-URL (sommige servers hebben `/dav/principals/` of `/remote.php/dav/` nodig)
- Inloggegevens geweigerd (verkeerde gebruikersnaam/wachtwoord)
- Server ondersteunt geen CalDAV (sommige servers adverteren WebDAV maar niet CalDAV)

### ETag-mismatch bij bijwerken/verwijderen

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV gebruikt ETags voor optimistische gelijktijdigheidscontrole. Als een andere client (telefoon, web) de gebeurtenis heeft gewijzigd tussen uw lezen en uw bijwerken, komt de ETag niet overeen.

**Oplossing:** De agent moet de gebeurtenis opnieuw ophalen om de huidige ETag te krijgen en de bewerking dan opnieuw proberen. Dit wordt in de meeste gevallen automatisch afgehandeld.

### "CalDAV credentials not available, executor deferred"

De CalDAV-uitvoerder start in een uitgestelde staat als inloggegevens niet kunnen worden opgelost bij opstarten. Dit is niet fataal; de uitvoerder rapporteert fouten als u CalDAV-tools probeert te gebruiken.

---

## MCP (Model Context Protocol)-servers

### Server niet gevonden

```
MCP server '<naam>' not found
```

De toolaanroep verwijst naar een MCP-server die niet is geconfigureerd. Controleer uw sectie `mcp_servers` in `triggerfish.yaml`.

### Serverbinair bestand niet in PATH

MCP-servers worden gespawnd als subprocessen. Als het binaire bestand niet wordt gevonden:

```
MCP server '<naam>': <validatiefout>
```

Veelvoorkomende problemen:
- De opdracht (bijv. `npx`, `python`, `node`) staat niet in het PATH van de daemon
- **systemd/launchd PATH-probleem:** De daemon legt uw PATH vast op het moment van installatie. Als u de MCP-server na de daemoninstallatie hebt geïnstalleerd, installeer de daemon opnieuw om het PATH bij te werken:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Server crasht

Als een MCP-serverproces crasht, verlaat de leeslus en wordt de server niet meer beschikbaar. Er is geen automatische herverbinding.

**Oplossing:** Herstart de daemon om alle MCP-servers opnieuw te spawnen.

### SSE-transport geblokkeerd

MCP-servers die SSE (Server-Sent Events)-transport gebruiken zijn onderworpen aan SSRF-controles:

```
MCP SSE connection blocked by SSRF policy
```

SSE-URL's die verwijzen naar privé-IP-adressen worden geblokkeerd. Dit is ontwerp. Gebruik het stdio-transport voor lokale MCP-servers in plaats daarvan.

### Toolaanroepfouten

```
tools/list failed: <bericht>
tools/call failed: <bericht>
```

De MCP-server heeft een fout teruggegeven. Dit is de fout van de server, niet van Triggerfish. Controleer de eigen logboeken van de MCP-server voor details.

---

## Obsidian

### "Vault path does not exist"

```
Vault path does not exist: /pad/naar/vault
```

Het geconfigureerde vaultpad in `plugins.obsidian.vault_path` bestaat niet. Zorg dat het pad correct en toegankelijk is.

### Padtraversal geblokkeerd

```
Path traversal rejected: <pad>
Path escapes vault boundary: <pad>
```

Een notitiepad heeft geprobeerd de vaultdirectory te verlaten (bijv. met `../`). Dit is een beveiligingscontrole. Alle notitieoperaties zijn beperkt tot de vaultdirectory.

### Uitgesloten mappen

```
Path is excluded: <pad>
```

De notitie bevindt zich in een map die is vermeld in `exclude_folders`. Om er toegang toe te krijgen, verwijdert u de map uit de uitsluitingslijst.

### Classificatiehandhaving

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

De vault of specifieke map heeft een classificatieniveau dat conflicteert met de sessie-taint. Zie [Beveiligingsprobleemoplossing](/nl-NL/support/troubleshooting/security) voor details over write-down-regels.
