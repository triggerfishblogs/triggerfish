# Foutreferentie

Een doorzoekbare index van foutmeldingen. Gebruik de zoekfunctie van uw browser (Ctrl+F / Cmd+F) om te zoeken op de exacte fouttekst die u in uw logboeken ziet.

## Opstarten en daemon

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Fatal startup error` | Niet-afgehandelde uitzondering tijdens gateway-opstart | Controleer de volledige stack-trace in logboeken |
| `Daemon start failed` | Servicebeheerder kon de daemon niet starten | Controleer `triggerfish logs` of het systeemjournaal |
| `Daemon stop failed` | Servicebeheerder kon de daemon niet stoppen | Beëindig het proces handmatig |
| `Failed to load configuration` | Configuratiebestand onleesbaar of misvormd | Voer `triggerfish config validate` uit |
| `No LLM provider configured. Check triggerfish.yaml.` | Ontbrekende sectie `models` of geen provider gedefinieerd | Configureer minimaal één provider |
| `Configuration file not found` | `triggerfish.yaml` bestaat niet op verwacht pad | Voer `triggerfish dive` uit of maak handmatig aan |
| `Configuration parse failed` | YAML-syntaxisfout | Herstel YAML-syntaxis (controleer inspringing, dubbele punten, aanhalingstekens) |
| `Configuration file did not parse to an object` | YAML geparseerd maar resultaat is geen mapping | Zorg dat het hoogste niveau een YAML-mapping is, geen lijst of scalaire waarde |
| `Configuration validation failed` | Verplichte velden ontbreken of ongeldige waarden | Controleer de specifieke validatiemelding |
| `Triggerfish is already running` | Logboekbestand is vergrendeld door een andere instantie | Stop de actieve instantie eerst |
| `Linger enable failed` | `loginctl enable-linger` is mislukt | Voer `sudo loginctl enable-linger $USER` uit |

## Geheimenbeheer

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Secret store failed` | Kon de geheimensbackend niet initialiseren | Controleer beschikbaarheid van sleutelhanger/libsecret |
| `Secret not found` | Referentiesleutel bestaat niet | Sla op: `triggerfish config set-secret <sleutel> <waarde>` |
| `Machine key file permissions too open` | Sleutelbestand heeft ruimere machtigingen dan 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Sleutelbestand is onleesbaar of afgekapt | Verwijder en sla alle geheimen opnieuw op |
| `Machine key chmod failed` | Kan machtigingen op sleutelbestand niet instellen | Controleer of het bestandssysteem chmod ondersteunt |
| `Secret file permissions too open` | Geheimensbestand heeft te ruime machtigingen | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Kan machtigingen op geheimensbestand niet instellen | Controleer het bestandssysteemtype |
| `Secret backend selection failed` | Niet-ondersteund besturingssysteem of geen sleutelhanger beschikbaar | Gebruik Docker of schakel geheugen-fallback in |
| `Migrating legacy plaintext secrets to encrypted format` | Geheimensbestand in oud formaat gedetecteerd (INFO, geen fout) | Geen actie nodig; migratie is automatisch |

## LLM-providers

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Primary provider not found in registry` | Providernaam in `models.primary.provider` staat niet in `models.providers` | Herstel de providernaam |
| `Classification model provider not configured` | `classification_models` verwijst naar onbekende provider | Voeg de provider toe aan `models.providers` |
| `All providers exhausted` | Elke provider in de failover-keten heeft gefaald | Controleer alle API-sleutels en providerstatus |
| `Provider request failed with retryable error, retrying` | Tijdelijke fout, opnieuw proberen bezig | Wachten; dit is automatisch herstel |
| `Provider stream connection failed, retrying` | Streamingverbinding verbroken | Wachten; dit is automatisch herstel |
| `Local LLM request failed (status): tekst` | Ollama/LM Studio heeft een fout teruggegeven | Controleer of de lokale server actief is en het model is geladen |
| `No response body for streaming` | Provider heeft lege streaming-reactie teruggegeven | Probeer opnieuw; kan een tijdelijk providerprobleem zijn |
| `Unknown provider name in createProviderByName` | Code verwijst naar een providertype dat niet bestaat | Controleer de spelling van de providernaam |

## Kanalen

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Channel send failed` | Router kon een bericht niet bezorgen | Controleer kanaal-specifieke fouten in logboeken |
| `WebSocket connection failed` | CLI-chat kan de gateway niet bereiken | Controleer of de daemon actief is |
| `Message parse failed` | Ontvangen ongeldige JSON van kanaal | Controleer of client geldige JSON verzendt |
| `WebSocket upgrade rejected` | Verbinding geweigerd door de gateway | Controleer auth-token en Origin-headers |
| `Chat WebSocket message rejected: exceeds size limit` | Berichtlichaam overschrijdt 1 MB | Stuur kleinere berichten |
| `Discord channel configured but botToken is missing` | Discord-configuratie bestaat maar token is leeg | Stel het bot-token in |
| `WhatsApp send failed (status): fout` | Meta API heeft het verzendverzoek geweigerd | Controleer geldigheid van het toegangstoken |
| `Signal connect failed` | Kan signal-cli-daemon niet bereiken | Controleer of signal-cli actief is |
| `Signal ping failed after retries` | signal-cli is actief maar reageert niet | Herstart signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli is niet op tijd gestart | Controleer Java-installatie en signal-cli-instelling |
| `IMAP LOGIN failed` | Verkeerde IMAP-inloggegevens | Controleer gebruikersnaam en wachtwoord |
| `IMAP connection not established` | Kan IMAP-server niet bereiken | Controleer serverhostnaam en poort 993 |
| `Google Chat PubSub poll failed` | Kan niet ophalen uit Pub/Sub-abonnement | Controleer Google Cloud-inloggegevens |
| `Clipboard image rejected: exceeds size limit` | Geplakte afbeelding is te groot voor de invoerbuffer | Gebruik een kleinere afbeelding |

## Integraties

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Google OAuth token exchange failed` | OAuth-code-uitwisseling heeft een fout teruggegeven | Authenticeer opnieuw: `triggerfish connect google` |
| `GitHub token verification failed` | PAT is ongeldig of verlopen | Sla opnieuw op: `triggerfish connect github` |
| `GitHub API request failed` | GitHub API heeft een fout teruggegeven | Controleer tokenbereiken en snelheidslimieten |
| `Clone failed` | git clone mislukt | Controleer token, repository-toegang en netwerk |
| `Notion enabled but token not found in keychain` | Notion-integratietoken niet opgeslagen | Voer `triggerfish connect notion` uit |
| `Notion API rate limited` | Meer dan 3 verzoeken/seconde | Wacht op automatisch herproberingen (tot 3 pogingen) |
| `Notion API network request failed` | Kan api.notion.com niet bereiken | Controleer netwerkverbinding |
| `CalDAV credential resolution failed` | Ontbrekende CalDAV-gebruikersnaam of -wachtwoord | Stel inloggegevens in in configuratie en sleutelhanger |
| `CalDAV principal discovery failed` | Kan CalDAV-principal-URL niet vinden | Controleer server-URL-formaat |
| `MCP server 'naam' not found` | Gerefereerde MCP-server staat niet in configuratie | Voeg hem toe aan `mcp_servers` in configuratie |
| `MCP SSE connection blocked by SSRF policy` | MCP SSE-URL verwijst naar privé-IP | Gebruik in plaats daarvan stdio-transport |
| `Vault path does not exist` | Obsidian-vaultpad is onjuist | Herstel `plugins.obsidian.vault_path` |
| `Path traversal rejected` | Notitiepad heeft geprobeerd de vaultdirectory te verlaten | Gebruik paden binnen de vault |

## Beveiliging en beleid

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Write-down blocked` | Gegevens stromen van hoog naar laag classificatieniveau | Gebruik een kanaal/tool op het juiste classificatieniveau |
| `SSRF blocked: hostname resolves to private IP` | Uitgaand verzoek richt zich op intern netwerk | Kan niet worden uitgeschakeld; gebruik een publieke URL |
| `Hook evaluation failed, defaulting to BLOCK` | Beleidshook heeft een uitzondering gegenereerd | Controleer aangepaste beleidsregels |
| `Policy rule blocked action` | Een beleidsregel heeft de actie geweigerd | Bekijk `policy.rules` in configuratie |
| `Tool floor violation` | Tool vereist hogere classificatie dan de sessie heeft | Escaleer sessie of gebruik een andere tool |
| `Plugin network access blocked` | Plugin heeft geprobeerd een niet-geautoriseerde URL te benaderen | Plugin moet eindpunten opgeven in zijn manifest |
| `Plugin SSRF blocked` | Plugin-URL wordt omgezet naar privé-IP | Plugin kan geen privénetwerken benaderen |
| `Skill activation blocked by classification ceiling` | Sessie-taint overschrijdt het plafond van de skill | Kan deze skill niet gebruiken op huidig taint-niveau |
| `Skill content integrity check failed` | Skillbestanden zijn gewijzigd na installatie | Installeer de skill opnieuw |
| `Skill install rejected by scanner` | Beveiligingsscanner heeft verdachte inhoud gevonden | Bekijk de scanwaarschuwingen |
| `Delegation certificate signature invalid` | Delegatieketen heeft een ongeldige handtekening | Geef de delegatie opnieuw uit |
| `Delegation certificate expired` | Delegatie is verlopen | Geef opnieuw uit met langere TTL |
| `Webhook HMAC verification failed` | Webhookhandtekening komt niet overeen | Controleer gedeelde geheimconfiguratie |
| `Webhook replay detected` | Dubbele webhookpayload ontvangen | Geen fout als verwacht; anders onderzoeken |
| `Webhook rate limit exceeded` | Te veel webhookaanroepen van één bron | Verminder webhookfrequentie |

## Browser

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Browser launch failed` | Kon Chrome/Chromium niet starten | Installeer een op Chromium gebaseerde browser |
| `Direct Chrome process launch failed` | Chrome-binair bestand is niet gestart | Controleer binaire bestandsmachtigingen en afhankelijkheden |
| `Flatpak Chrome launch failed` | Flatpak Chrome-wrapper mislukt | Controleer Flatpak-installatie |
| `CDP endpoint not ready after Xms` | Chrome heeft de foutopsporingspoort niet op tijd geopend | Systeem is mogelijk resource-beperkt |
| `Navigation blocked by domain policy` | URL richt zich op een geblokkeerd domein of privé-IP | Gebruik een publieke URL |
| `Navigation failed` | Paginalaadfout of time-out | Controleer URL en netwerk |
| `Click/Type/Select failed on "selector"` | CSS-selector heeft geen enkel element gevonden | Controleer de selector tegen de pagina-DOM |
| `Snapshot failed` | Kon paginastatus niet vastleggen | Pagina kan leeg zijn of JavaScript heeft een fout |

## Uitvoering en sandbox

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Working directory path escapes workspace jail` | Padtraversalpoging in de uitvoeringsomgeving | Gebruik paden binnen de werkruimte |
| `Working directory does not exist` | Opgegeven werkdirectory niet gevonden | Maak de directory eerst aan |
| `Workspace access denied for PUBLIC session` | PUBLIC-sessies kunnen geen werkruimten gebruiken | Werkruimte vereist INTERNAL+-classificatie |
| `Workspace path traversal attempt blocked` | Pad heeft geprobeerd de werkruimtegrens te verlaten | Gebruik relatieve paden binnen de werkruimte |
| `Workspace agentId rejected: empty after sanitization` | Agent-ID bevat alleen ongeldige tekens | Controleer agentconfiguratie |
| `Sandbox worker unhandled error` | Plugin-sandboxwerker gecrasht | Controleer plugincode op fouten |
| `Sandbox has been shut down` | Bewerking geprobeerd op vernietigde sandbox | Herstart de daemon |

## Planner

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Trigger callback failed` | Trigger-handler heeft een uitzondering gegenereerd | Controleer TRIGGER.md op problemen |
| `Trigger store persist failed` | Kan triggerresultaten niet opslaan | Controleer opslagverbinding |
| `Notification delivery failed` | Kon triggermelding niet verzenden | Controleer kanaalverbinding |
| `Cron expression parse error` | Ongeldige cron-expressie | Herstel de expressie in `scheduler.cron.jobs` |

## Zelfupdate

| Fout | Oorzaak | Oplossing |
|------|---------|-----------|
| `Triggerfish self-update failed` | Updateproces heeft een fout ondervonden | Controleer specifieke fout in logboeken |
| `Binary replacement failed` | Kon oud binair bestand niet verwisselen voor nieuw | Controleer bestandsmachtigingen; stop daemon eerst |
| `Checksum file download failed` | Kon SHA256SUMS.txt niet downloaden | Controleer netwerkverbinding |
| `Asset not found in SHA256SUMS.txt` | Release mist checksum voor uw platform | Dien een GitHub issue in |
| `Checksum verification exception` | Hash van gedownload binair bestand komt niet overeen | Probeer opnieuw; download kan beschadigd zijn |
