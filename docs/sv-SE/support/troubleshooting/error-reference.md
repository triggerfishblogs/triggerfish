# Felreferens

Ett sökbart index över felmeddelanden. Använd webbläsarens sökfunktion (Ctrl+F / Cmd+F) för att söka efter den exakta feltexten du ser i dina loggar.

## Uppstart och daemon

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Fatal startup error` | Ohanterat undantag under gateway-start | Kontrollera fullständig stackspårning i loggar |
| `Daemon start failed` | Tjänsthanteraren kunde inte starta daemonen | Kontrollera `triggerfish logs` eller systemjournalen |
| `Daemon stop failed` | Tjänsthanteraren kunde inte stoppa daemonen | Avsluta processen manuellt |
| `Failed to load configuration` | Konfigurationsfilen är oläsbar eller felaktig | Kör `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Saknas `models`-avsnitt eller ingen leverantör definierad | Konfigurera minst en leverantör |
| `Configuration file not found` | `triggerfish.yaml` finns inte på förväntad sökväg | Kör `triggerfish dive` eller skapa manuellt |
| `Configuration parse failed` | YAML-syntaxfel | Åtgärda YAML-syntax (kontrollera indragning, kolon, citattecken) |
| `Configuration file did not parse to an object` | YAML tolkades men resultatet är inte en mappning | Se till att toppnivån är en YAML-mappning, inte en lista eller skalär |
| `Configuration validation failed` | Obligatoriska fält saknas eller ogiltiga värden | Kontrollera det specifika valideringsmeddelandet |
| `Triggerfish is already running` | Loggfilen är låst av en annan instans | Stoppa den körande instansen först |
| `Linger enable failed` | `loginctl enable-linger` lyckades inte | Kör `sudo loginctl enable-linger $USER` |

## Hemlighethantering

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Secret store failed` | Kunde inte initiera hemlighetsbakänden | Kontrollera nyckelringens/libsecrets tillgänglighet |
| `Secret not found` | Refererad hemlighetsnyckel finns inte | Lagra den: `triggerfish config set-secret <nyckel> <värde>` |
| `Machine key file permissions too open` | Nyckelfilen har bredare behörigheter än 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Nyckelfilen är oläsbar eller trunkerad | Ta bort och lagra om alla hemligheter |
| `Machine key chmod failed` | Kan inte ange behörigheter på nyckelfilen | Kontrollera att filsystemet stöder chmod |
| `Secret file permissions too open` | Hemlighetsfilen har alltför öppna behörigheter | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Kan inte ange behörigheter på hemlighetsfilen | Kontrollera filsystemstyp |
| `Secret backend selection failed` | OS stöds ej eller ingen nyckelring tillgänglig | Använd Docker eller aktivera minnesfallback |
| `Migrating legacy plaintext secrets to encrypted format` | Gammalformat hemlighetsfil identifierad (INFO, inte fel) | Ingen åtgärd krävs; migrering är automatisk |

## LLM-leverantörer

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Primary provider not found in registry` | Leverantörsnamnet i `models.primary.provider` inte i `models.providers` | Rätta leverantörsnamnet |
| `Classification model provider not configured` | `classification_models` refererar till okänd leverantör | Lägg till leverantören i `models.providers` |
| `All providers exhausted` | Varje leverantör i failover-kedjan misslyckades | Kontrollera alla API-nycklar och leverantörsstatus |
| `Provider request failed with retryable error, retrying` | Övergående fel, återförsök pågår | Vänta; det är automatisk återhämtning |
| `Provider stream connection failed, retrying` | Streaminganslutning avbröts | Vänta; det är automatisk återhämtning |
| `Local LLM request failed (status): text` | Ollama/LM Studio returnerade ett fel | Kontrollera att den lokala servern körs och modellen är laddad |
| `No response body for streaming` | Leverantören returnerade tomt streamingsvar | Försök igen; kan vara ett övergående leverantörsproblem |
| `Unknown provider name in createProviderByName` | Kod refererar till en leverantörstyp som inte finns | Kontrollera stavning av leverantörsnamnet |

## Kanaler

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Channel send failed` | Routern kunde inte leverera ett meddelande | Kontrollera kanalspecifika fel i loggar |
| `WebSocket connection failed` | CLI-chatt kan inte nå gatewayen | Kontrollera att daemonen körs |
| `Message parse failed` | Tog emot felaktig JSON från kanal | Kontrollera att klienten skickar giltig JSON |
| `WebSocket upgrade rejected` | Anslutning avvisad av gatewayen | Kontrollera auth-token och origin-headers |
| `Chat WebSocket message rejected: exceeds size limit` | Meddelandekroppen överstiger 1 MB | Skicka mindre meddelanden |
| `Discord channel configured but botToken is missing` | Discord-konfiguration finns men token är tom | Ange bot-token |
| `WhatsApp send failed (status): error` | Meta API avvisade sändningsförfrågan | Kontrollera åtkomsttoken giltighet |
| `Signal connect failed` | Kan inte nå signal-cli daemon | Kontrollera att signal-cli körs |
| `Signal ping failed after retries` | signal-cli körs men svarar inte | Starta om signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli startade inte i tid | Kontrollera Java-installation och signal-cli-inställning |
| `IMAP LOGIN failed` | Felaktiga IMAP-uppgifter | Kontrollera användarnamn och lösenord |
| `IMAP connection not established` | Kan inte nå IMAP-servern | Kontrollera servervärdnamn och port 993 |
| `Google Chat PubSub poll failed` | Kan inte hämta från Pub/Sub-abonnemang | Kontrollera Google Cloud-uppgifter |
| `Clipboard image rejected: exceeds size limit` | Inklistrad bild är för stor för indatabufferten | Använd en mindre bild |

## Integrationer

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Google OAuth token exchange failed` | OAuth-kodutbyte returnerade ett fel | Återautentisera: `triggerfish connect google` |
| `GitHub token verification failed` | PAT är ogiltig eller utgången | Lagra om: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API returnerade ett fel | Kontrollera token-scopes och hastighetsgränser |
| `Clone failed` | git clone misslyckades | Kontrollera token, repo-åtkomst och nätverk |
| `Notion enabled but token not found in keychain` | Notion-integrationstoken inte lagrad | Kör `triggerfish connect notion` |
| `Notion API rate limited` | Överskred 3 fråg/sek | Vänta på automatiskt återförsök (upp till 3 försök) |
| `Notion API network request failed` | Kan inte nå api.notion.com | Kontrollera nätverksanslutning |
| `CalDAV credential resolution failed` | CalDAV-användarnamn eller lösenord saknas | Ange uppgifter i konfiguration och nyckelring |
| `CalDAV principal discovery failed` | Kan inte hitta CalDAV-huvud-URL | Kontrollera serverURL-format |
| `MCP server 'namn' not found` | Refererad MCP-server inte i konfigurationen | Lägg till den i `mcp_servers` i konfigurationen |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE-URL pekar till privat IP | Använd stdio-transport istället |
| `Vault path does not exist` | Obsidian vault-sökväg är fel | Rätta `plugins.obsidian.vault_path` |
| `Path traversal rejected` | Anteckningssökväg försökte fly vault-katalogen | Använd sökvägar inom vault:en |

## Säkerhet och policy

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Write-down blocked` | Data flödar från hög till låg klassificering | Använd en kanal/verktyg på rätt klassificeringsnivå |
| `SSRF blocked: hostname resolves to private IP` | Utgående förfrågan riktar sig mot internt nätverk | Kan inte inaktiveras; använd en publik URL |
| `Hook evaluation failed, defaulting to BLOCK` | Policy-hook kastade ett undantag | Kontrollera anpassade policyregler |
| `Policy rule blocked action` | En policyregel nekade åtgärden | Granska `policy.rules` i konfigurationen |
| `Tool floor violation` | Verktyget kräver högre klassificering än sessionen har | Eskalera session eller använd ett annat verktyg |
| `Plugin network access blocked` | Plugin försökte komma åt obehörig URL | Plugin måste deklarera endpoints i sitt manifest |
| `Plugin SSRF blocked` | Plugin-URL löser upp till privat IP | Plugin kan inte komma åt privata nätverk |
| `Skill activation blocked by classification ceiling` | Sessions taint överstiger kunskapens tak | Kan inte använda den här kunskapen vid nuvarande taintnivå |
| `Skill content integrity check failed` | Kunskapsfiler ändrades efter installation | Installera om kunskapen |
| `Skill install rejected by scanner` | Säkerhetsskannern hittade misstänkt innehåll | Granska skanningsvarningarna |
| `Delegation certificate signature invalid` | Delegationskedjan har en ogiltig signatur | Utfärda om delegeringen |
| `Delegation certificate expired` | Delegeringen har gått ut | Utfärda om med längre TTL |
| `Webhook HMAC verification failed` | Webhook-signatur matchar inte | Kontrollera konfiguration av delad hemlighet |
| `Webhook replay detected` | Duplicerad webhook-nyttolast mottagen | Inte ett fel om förväntat; annars undersök |
| `Webhook rate limit exceeded` | För många webhook-anrop från en källa | Minska webhook-frekvensen |

## Webbläsare

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Browser launch failed` | Kunde inte starta Chrome/Chromium | Installera en Chromium-baserad webbläsare |
| `Direct Chrome process launch failed` | Chrome-binären misslyckades att köra | Kontrollera binärbehörigheter och beroenden |
| `Flatpak Chrome launch failed` | Flatpak Chrome-omskript misslyckades | Kontrollera Flatpak-installation |
| `CDP endpoint not ready after Xms` | Chrome öppnade inte debuggningsporten i tid | Systemet kan vara resursbegränsat |
| `Navigation blocked by domain policy` | URL riktar sig mot en blockerad domän eller privat IP | Använd en publik URL |
| `Navigation failed` | Sidladdningsfel eller timeout | Kontrollera URL och nätverk |
| `Click/Type/Select failed on "selector"` | CSS-selektorn matchade inget element | Kontrollera selektorn mot sidans DOM |
| `Snapshot failed` | Kunde inte fånga sidtillstånd | Sidan kan vara tom eller JavaScript gav ett fel |

## Körning och sandlåda

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Working directory path escapes workspace jail` | Sökvägstraverseringsförsök i exec-miljö | Använd sökvägar inom arbetsytan |
| `Working directory does not exist` | Angiven arbetskatalog hittades ej | Skapa katalogen först |
| `Workspace access denied for PUBLIC session` | PUBLIC-sessioner kan inte använda arbetsytor | Arbetsyta kräver INTERNAL+-klassificering |
| `Workspace path traversal attempt blocked` | Sökväg försökte fly arbetsytans gräns | Använd relativa sökvägar inom arbetsytan |
| `Workspace agentId rejected: empty after sanitization` | Agent-ID innehåller bara ogiltiga tecken | Kontrollera agentkonfiguration |
| `Sandbox worker unhandled error` | Plugin-sandlåde-worker kraschade | Kontrollera pluginkod för fel |
| `Sandbox has been shut down` | Operation försökt på förstörd sandlåda | Starta om daemonen |

## Schemaläggare

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Trigger callback failed` | Trigger-hanteraren kastade ett undantag | Kontrollera TRIGGER.md för problem |
| `Trigger store persist failed` | Kan inte spara trigger-resultat | Kontrollera lagringsanslutning |
| `Notification delivery failed` | Kunde inte skicka trigger-notifiering | Kontrollera kanalanslutning |
| `Cron expression parse error` | Ogiltig cron-uttryck | Rätta uttrycket i `scheduler.cron.jobs` |

## Självuppdatering

| Fel | Orsak | Åtgärd |
|-----|-------|--------|
| `Triggerfish self-update failed` | Uppdateringsprocessen stötte på ett fel | Kontrollera specifikt fel i loggar |
| `Binary replacement failed` | Kunde inte byta ut gammal binär mot ny | Kontrollera filbehörigheter; stoppa daemon först |
| `Checksum file download failed` | Kunde inte ladda ner SHA256SUMS.txt | Kontrollera nätverksanslutning |
| `Asset not found in SHA256SUMS.txt` | Utgåvan saknar kontrollsumma för din plattform | Rapportera ett GitHub-ärende |
| `Checksum verification exception` | Nedladdad binär hash matchar inte | Försök igen; nedladdningen kan ha skadats |
