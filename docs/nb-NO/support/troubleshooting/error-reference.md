# Feilreferanse

Et søkbart indeks over feilmeldinger. Bruk nettleserens finn (Ctrl+F / Cmd+F) for
å søke etter den eksakte feilteksten du ser i loggene.

## Oppstart og daemon

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Fatal startup error` | Uhåndtert unntak under gateway-oppstart | Sjekk full stack trace i loggene |
| `Daemon start failed` | Tjenestebehandleren kunne ikke starte daemonen | Sjekk `triggerfish logs` eller systemjournal |
| `Daemon stop failed` | Tjenestebehandleren kunne ikke stoppe daemonen | Avslutt prosessen manuelt |
| `Failed to load configuration` | Konfigurasjonsfilen er ulesbar eller feilformatert | Kjør `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Mangler `models`-seksjon eller ingen leverandør er definert | Konfigurer minst én leverandør |
| `Configuration file not found` | `triggerfish.yaml` eksisterer ikke på forventet bane | Kjør `triggerfish dive` eller opprett manuelt |
| `Configuration parse failed` | YAML-syntaksfeil | Fiks YAML-syntaks (sjekk innrykk, kolon, anførselstegn) |
| `Configuration file did not parse to an object` | YAML ble tolket, men resultatet er ikke en tilordning | Sørg for at overordnet nivå er en YAML-tilordning, ikke en liste eller skalerverdi |
| `Configuration validation failed` | Obligatoriske felt mangler eller ugyldige verdier | Sjekk den spesifikke valideringsmeldingen |
| `Triggerfish is already running` | Loggfilen er låst av en annen instans | Stopp den kjørende instansen først |
| `Linger enable failed` | `loginctl enable-linger` lyktes ikke | Kjør `sudo loginctl enable-linger $USER` |

## Hemmelighetbehandling

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Secret store failed` | Kunne ikke initialisere hemmelighetbackenden | Sjekk tilgjengelighet av nøkkelring/libsecret |
| `Secret not found` | Referert hemmelighetenøkkel eksisterer ikke | Lagre det: `triggerfish config set-secret <nøkkel> <verdi>` |
| `Machine key file permissions too open` | Nøkkelfilen har videre tillatelser enn 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Nøkkelfilen er ulesbar eller avkortet | Slett og lagre alle hemmeligheter på nytt |
| `Machine key chmod failed` | Kan ikke sette tillatelser på nøkkelfil | Sjekk at filsystemet støtter chmod |
| `Secret file permissions too open` | Hemmelighetfilen har for åpne tillatelser | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Kan ikke sette tillatelser på hemmelighetfilen | Sjekk filsystemtype |
| `Secret backend selection failed` | Ustøttet OS eller ingen nøkkelring tilgjengelig | Bruk Docker eller aktiver minnefallback |
| `Migrating legacy plaintext secrets to encrypted format` | Eldre-format hemmelighetfil oppdaget (INFO, ikke feil) | Ingen handling nødvendig; migrasjonen er automatisk |

## LLM-leverandører

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Primary provider not found in registry` | Leverandørnavn i `models.primary.provider` ikke i `models.providers` | Fiks leverandørnavnet |
| `Classification model provider not configured` | `classification_models` refererer til ukjent leverandør | Legg til leverandøren i `models.providers` |
| `All providers exhausted` | Alle leverandørene i failover-kjeden mislyktes | Sjekk alle API-nøkler og leverandørstatus |
| `Provider request failed with retryable error, retrying` | Forbigående feil, ny forsøk pågår | Vent; dette er automatisk gjenoppretting |
| `Provider stream connection failed, retrying` | Strømmingstilkobling droppet | Vent; dette er automatisk gjenoppretting |
| `Local LLM request failed (status): text` | Ollama/LM Studio returnerte en feil | Sjekk at den lokale serveren kjører og modellen er lastet |
| `No response body for streaming` | Leverandøren returnerte tom strømmingsrespons | Prøv igjen; kan være et forbigående leverandørproblem |
| `Unknown provider name in createProviderByName` | Kode refererer til en leverandørtype som ikke eksisterer | Sjekk leverandørnavnets stavemåte |

## Kanaler

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Channel send failed` | Ruteren kunne ikke levere en melding | Sjekk kanalspesifikke feil i loggene |
| `WebSocket connection failed` | CLI-chat kan ikke nå gatewayen | Sjekk at daemonen kjører |
| `Message parse failed` | Mottok feilformatert JSON fra kanalen | Sjekk at klienten sender gyldig JSON |
| `WebSocket upgrade rejected` | Tilkobling avvist av gatewayen | Sjekk auth-token og origin-overskrifter |
| `Chat WebSocket message rejected: exceeds size limit` | Meldingskroppen overskrider 1 MB | Send mindre meldinger |
| `Discord channel configured but botToken is missing` | Discord-konfigurasjon eksisterer, men tokenet er tomt | Sett bot-tokenet |
| `WhatsApp send failed (status): error` | Meta API avviste sendingsforespørselen | Sjekk gyldigheten av tilgangstoken |
| `Signal connect failed` | Kan ikke nå signal-cli daemon | Sjekk at signal-cli kjører |
| `Signal ping failed after retries` | signal-cli kjører, men svarer ikke | Start signal-cli på nytt |
| `signal-cli daemon not reachable within 60s` | signal-cli startet ikke i tide | Sjekk Java-installasjon og signal-cli-oppsett |
| `IMAP LOGIN failed` | Feil IMAP-legitimasjon | Sjekk brukernavn og passord |
| `IMAP connection not established` | Kan ikke nå IMAP-server | Sjekk serverens vertsnavn og port 993 |
| `Google Chat PubSub poll failed` | Kan ikke hente fra Pub/Sub-abonnement | Sjekk Google Cloud-legitimasjon |
| `Clipboard image rejected: exceeds size limit` | Det limte bildet er for stort for inndatabufferen | Bruk et mindre bilde |

## Integrasjoner

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Google OAuth token exchange failed` | OAuth-kodeutveksling returnerte en feil | Autentiser på nytt: `triggerfish connect google` |
| `GitHub token verification failed` | PAT er ugyldig eller utløpt | Lagre på nytt: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API returnerte en feil | Sjekk token-omfang og hastighetsbegrensninger |
| `Clone failed` | git clone mislyktes | Sjekk token, repo-tilgang og nettverk |
| `Notion enabled but token not found in keychain` | Notion-integrasjonstoken er ikke lagret | Kjør `triggerfish connect notion` |
| `Notion API rate limited` | Overskredet 3 forespørsler/sek | Vent på automatisk gjenforsøk (opptil 3 forsøk) |
| `Notion API network request failed` | Kan ikke nå api.notion.com | Sjekk nettverkstilkobling |
| `CalDAV credential resolution failed` | Mangler CalDAV brukernavn eller passord | Sett legitimasjon i konfigurasjon og nøkkelring |
| `CalDAV principal discovery failed` | Kan ikke finne CalDAV principal-URL | Sjekk format på server-URL |
| `MCP server 'name' not found` | Referert MCP-server ikke i konfigurasjonen | Legg det til i `mcp_servers` i konfigurasjon |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE-URL peker til privat IP | Bruk stdio-transport i stedet |
| `Vault path does not exist` | Obsidian-hvelv-banen er feil | Fiks `plugins.obsidian.vault_path` |
| `Path traversal rejected` | Notatbane prøvde å flykte hvelv-mappen | Bruk baner innenfor hvelvet |

## Sikkerhet og policy

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Write-down blocked` | Data flyter fra høy til lav klassifisering | Bruk en kanal/verktøy på riktig klassifiseringsnivå |
| `SSRF blocked: hostname resolves to private IP` | Utgående forespørsel er rettet mot internt nettverk | Kan ikke deaktiveres; bruk en offentlig URL |
| `Hook evaluation failed, defaulting to BLOCK` | Policy-hook kastet et unntak | Sjekk egendefinerte policyregler |
| `Policy rule blocked action` | En policyregel nektet handlingen | Gjennomgå `policy.rules` i konfigurasjonen |
| `Tool floor violation` | Verktøy krever høyere klassifisering enn sesjonen har | Eskalere sesjonen eller bruk et annet verktøy |
| `Plugin network access blocked` | Plugin prøvde å få tilgang til uautorisert URL | Plugin må deklarere endepunkter i manifestet |
| `Plugin SSRF blocked` | Plugin-URL løses til privat IP | Plugin kan ikke få tilgang til private nettverk |
| `Skill activation blocked by classification ceiling` | Sesjons-Taint overskrider ferdighetens tak | Kan ikke bruke denne ferdigheten på gjeldende Taint-nivå |
| `Skill content integrity check failed` | Ferdighetfiler ble endret etter installasjon | Reinstaller ferdigheten |
| `Skill install rejected by scanner` | Sikkerhetsscanneren fant mistenkelig innhold | Gjennomgå scanneadvarslene |
| `Delegation certificate signature invalid` | Delegasjonskjeden har en ugyldig signatur | Utsted delegasjonen på nytt |
| `Delegation certificate expired` | Delegasjonen er utløpt | Utsted på nytt med lengre TTL |
| `Webhook HMAC verification failed` | Webhook-signatur stemmer ikke | Sjekk konfigurasjon av delt hemmelighet |
| `Webhook replay detected` | Duplisert webhook-melding mottatt | Ikke en feil hvis forventet; ellers etterforskes |
| `Webhook rate limit exceeded` | For mange webhook-kall fra én kilde | Reduser webhook-frekvens |

## Nettleser

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Browser launch failed` | Kunne ikke starte Chrome/Chromium | Installer en Chromium-basert nettleser |
| `Direct Chrome process launch failed` | Chrome-binærfilen mislyktes ved kjøring | Sjekk binærtillatelser og avhengigheter |
| `Flatpak Chrome launch failed` | Flatpak Chrome-innpakningsskript mislyktes | Sjekk Flatpak-installasjon |
| `CDP endpoint not ready after Xms` | Chrome åpnet ikke feilsøkingsporten i tide | Systemet kan være ressursbegrenset |
| `Navigation blocked by domain policy` | URL er rettet mot et blokkert domene eller privat IP | Bruk en offentlig URL |
| `Navigation failed` | Sideinnlastingsfeil eller tidsavbrudd | Sjekk URL og nettverk |
| `Click/Type/Select failed on "selector"` | CSS-selektor samsvarte ikke med noe element | Sjekk selektoren mot siden-DOM |
| `Snapshot failed` | Kunne ikke ta sidebilde | Siden kan være blank eller JavaScript feilet |

## Kjøring og sandkasse

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Working directory path escapes workspace jail` | Sti-traverseringsforsøk i exec-miljøet | Bruk baner innenfor arbeidsområdet |
| `Working directory does not exist` | Angitt arbeidskatalog er ikke funnet | Opprett mappen først |
| `Workspace access denied for PUBLIC session` | PUBLIC-sesjoner kan ikke bruke arbeidsområder | Arbeidsområde krever INTERNAL+-klassifisering |
| `Workspace path traversal attempt blocked` | Sti prøvde å flykte arbeidsområdegrensen | Bruk relative baner innenfor arbeidsområdet |
| `Workspace agentId rejected: empty after sanitization` | Agent-ID inneholder bare ugyldige tegn | Sjekk agentkonfigurasjon |
| `Sandbox worker unhandled error` | Plugin-sandkassearbeider krasjet | Sjekk plugin-kode for feil |
| `Sandbox has been shut down` | Operasjon forsøkt på ødelagt sandkasse | Start daemonen på nytt |

## Planlegger

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Trigger callback failed` | Trigger-behandler kastet et unntak | Sjekk TRIGGER.md for problemer |
| `Trigger store persist failed` | Kan ikke lagre trigger-resultater | Sjekk lagringstilkobling |
| `Notification delivery failed` | Kunne ikke sende trigger-varsling | Sjekk kanaltilkobling |
| `Cron expression parse error` | Ugyldig cron-uttrykk | Fiks uttrykket i `scheduler.cron.jobs` |

## Selvoppdatering

| Feil | Årsak | Løsning |
|-------|-------|-----|
| `Triggerfish self-update failed` | Oppdateringsprosessen støtte på en feil | Sjekk spesifikk feil i loggene |
| `Binary replacement failed` | Kunne ikke bytte gammel binær med ny | Sjekk filtillatelser; stopp daemonen først |
| `Checksum file download failed` | Kunne ikke laste ned SHA256SUMS.txt | Sjekk nettverkstilkobling |
| `Asset not found in SHA256SUMS.txt` | Utgivelsen mangler kontrollsum for din plattform | Rapporter en GitHub-sak |
| `Checksum verification exception` | Nedlastet binær hash stemmer ikke | Prøv igjen; nedlastingen kan ha blitt korruptert |
