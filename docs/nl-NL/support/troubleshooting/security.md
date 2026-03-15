# Probleemoplossing: Beveiliging en classificatie

## Write-down-blokkades

### "Write-down blocked"

Dit is de meest voorkomende beveiligingsfout. Het betekent dat gegevens proberen te stromen van een hoger classificatieniveau naar een lager.

**Voorbeeld:** Uw sessie heeft toegang tot CONFIDENTIAL-gegevens (een geclassificeerd bestand gelezen, een geclassificeerde database bevraagd). De sessie-taint is nu CONFIDENTIAL. Daarna probeerde u de reactie te verzenden naar een PUBLIC WebChat-kanaal. De beleidsmotor blokkeert dit omdat CONFIDENTIAL-gegevens niet naar PUBLIC-bestemmingen kunnen stromen.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Hoe op te lossen:**
1. **Start een nieuwe sessie.** Een nieuwe sessie begint met PUBLIC-taint. Gebruik een nieuw gesprek.
2. **Gebruik een hoger-geclassificeerd kanaal.** Stuur de reactie via een kanaal geclassificeerd als CONFIDENTIAL of hoger.
3. **Begrijp wat de taint heeft veroorzaakt.** Controleer de logboeken op "Taint escalation"-vermeldingen om te zien welke toolaanroep de classificatie van de sessie heeft verhoogd.

### "Session taint cannot flow to channel"

Hetzelfde als write-down, maar specifiek over kanaalsclassificatie:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Toolaanroepen naar geclassificeerde integraties handhaven ook write-down:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Wacht, dit ziet er achterstevoren uit. De sessie-taint is hoger dan de classificatie van de tool. Dit betekent dat de sessie te besmet is om een lager-geclassificeerde tool te gebruiken. De zorg is dat het aanroepen van de tool geclassificeerde context in een minder beveiligd systeem kan lekken.

### "Workspace write-down blocked"

Agentwerkruimten hebben per-directory classificatie. Schrijven naar een lager-geclassificeerde directory vanuit een hoger-besmette sessie wordt geblokkeerd:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint-escalatie

### "Taint escalation"

Dit is informatief, geen fout. Het betekent dat het classificatieniveau van de sessie zojuist is verhoogd omdat de agent toegang heeft gekregen tot geclassificeerde gegevens.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint gaat alleen omhoog, nooit omlaag. Zodra een sessie is besmet tot CONFIDENTIAL, blijft dit zo voor de rest van de sessie.

### "Resource-based taint escalation firing"

Een toolaanroep heeft toegang gekregen tot een resource met een hogere classificatie dan de huidige taint van de sessie. De sessie-taint wordt automatisch geëscaleerd om te matchen.

### "Non-owner taint applied"

Niet-eigenaargebruikers kunnen hun sessies besmet zien worden op basis van de classificatie van het kanaal of de machtigingen van de gebruiker. Dit staat los van resource-gebaseerde taint.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

Alle uitgaande HTTP-verzoeken (web_fetch, browsernavigatie, MCP SSE-verbindingen) gaan door SSRF-beveiliging. Als de doelhostnaam wordt omgezet naar een privé-IP-adres, wordt het verzoek geblokkeerd.

**Geblokkeerde bereiken:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (privé)
- `172.16.0.0/12` (privé)
- `192.168.0.0/16` (privé)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (niet-gespecificeerd)
- `::1` (IPv6 loopback)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 link-local)

Deze beveiliging is hardgecodeerd en kan niet worden uitgeschakeld of geconfigureerd. Het voorkomt dat de AI-agent wordt misleid tot het benaderen van interne services.

**IPv4-gemapte IPv6:** Adressen zoals `::ffff:127.0.0.1` worden gedetecteerd en geblokkeerd.

### "SSRF check blocked outbound request"

Hetzelfde als hierboven, maar gelogd vanuit de web_fetch-tool in plaats van de SSRF-module.

### DNS-omzettingsfouten

```
DNS resolution failed for hostname
No DNS records found for hostname
```

De hostnaam kon niet worden omgezet. Controleer:
- De URL is correct gespeld
- Uw DNS-server is bereikbaar
- Het domein bestaat daadwerkelijk

---

## Beleidsmotor

### "Hook evaluation failed, defaulting to BLOCK"

Een beleidshook heeft een uitzondering gegenereerd tijdens evaluatie. Wanneer dit gebeurt, is de standaardactie BLOCK (weigeren). Dit is de veilige standaard.

Controleer de logboeken op de volledige uitzondering. Dit wijst waarschijnlijk op een bug in een aangepaste beleidsregel.

### "Policy rule blocked action"

Een beleidsregel heeft de actie expliciet geweigerd. De logboekvermeling bevat welke regel is afgegaan en waarom. Controleer de sectie `policy.rules` van uw configuratie om te zien welke regels zijn gedefinieerd.

### "Tool floor violation"

Een tool is aangeroepen die een minimaal classificatieniveau vereist, maar de sessie is onder dat niveau.

**Voorbeeld:** De healthcheck-tool vereist minimaal INTERNAL-classificatie (omdat die systeeminternals onthult). Als een PUBLIC-sessie probeert hem te gebruiken, wordt de aanroep geblokkeerd.

---

## Plugin- en skillbeveiliging

### "Plugin network access blocked"

Plugins draaien in een sandbox met beperkte netwerktoegang. Ze hebben alleen toegang tot URL's op hun opgegeven eindpuntdomein.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

De plugin heeft geprobeerd toegang te krijgen tot een URL die niet in zijn opgegeven eindpunten staat, of de URL werd omgezet naar een privé-IP.

### "Skill activation blocked by classification ceiling"

Skills geven een `classification_ceiling` op in hun SKILL.md-frontmatter. Als het plafond lager is dan het taint-niveau van de sessie, kan de skill niet worden geactiveerd:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Dit voorkomt dat een lager-geclassificeerde skill wordt blootgesteld aan hoger-geclassificeerde gegevens.

### "Skill content integrity check failed"

Na de installatie hashed Triggerfish de inhoud van de skill. Als de hash verandert (de skill is gewijzigd na installatie), mislukt de integriteitscontrole:

```
Skill content hash mismatch detected
```

Dit kan wijzen op manipulatie. Installeer de skill opnieuw vanuit een vertrouwde bron.

### "Skill install rejected by scanner"

De beveiligingsscanner heeft verdachte inhoud gevonden in de skill. De scanner controleert op patronen die kunnen wijzen op kwaadaardig gedrag. De specifieke waarschuwingen zijn opgenomen in de foutmelding.

---

## Sessiebeveiliging

### "Session not found"

```
Session not found: <sessie-id>
```

De gevraagde sessie bestaat niet in de sessiebeheerder. Deze is mogelijk opgeruimd, of het sessie-ID is ongeldig.

### "Session status access denied: taint exceeds caller"

U heeft geprobeerd de status van een sessie te bekijken, maar die sessie heeft een hoger taint-niveau dan uw huidige sessie. Dit voorkomt dat lager-geclassificeerde sessies iets leren over hoger-geclassificeerde operaties.

### "Session history access denied"

Hetzelfde concept als hierboven, maar dan voor het bekijken van gespreksgeschiedenis.

---

## Agent Teams

### "Team message delivery denied: team status is ..."

Het team heeft geen `running`-status. Dit gebeurt wanneer:

- Het team is **ontbonden** (handmatig of door de lifecycle-monitor)
- Het team is **gepauzeerd** omdat de leadsessie is mislukt
- Het team heeft een **time-out** bereikt na het overschrijden van zijn levensduurlimiet

Controleer de huidige teamstatus met `team_status`. Als het team is gepauzeerd vanwege een leadfout, kunt u het ontbinden met `team_disband` en een nieuw team aanmaken.

### "Team member not found" / "Team member ... is not active"

Het doellid bestaat niet (verkeerde rolnaam) of is beëindigd. Leden worden beëindigd wanneer:

- Ze de inactieve time-out overschrijden (2x `idle_timeout_seconds`)
- Het team wordt ontbonden
- Hun sessie crasht en de lifecycle-monitor dit detecteert

Gebruik `team_status` om alle leden en hun huidige status te zien.

### "Team disband denied: only the lead or creating session can disband"

Slechts twee sessies kunnen een team ontbinden:

1. De sessie die oorspronkelijk `team_create` heeft aangeroepen
2. De sessie van het leadlid

Als u deze fout krijgt vanuit het team, is het aanroepende lid niet de lead. Als u het krijgt van buiten het team, bent u niet de sessie die het heeft aangemaakt.

### Teamlead mislukt direct na aanmaken

De agentsessie van de lead kon zijn eerste beurt niet voltooien. Veelvoorkomende oorzaken:

1. **LLM-providerfout:** De provider heeft een fout teruggegeven (snelheidslimiet, authenticatiefout, model niet gevonden). Controleer `triggerfish logs` op providerfouten.
2. **Classificatieplafond te laag:** Als de lead tools nodig heeft die hoger zijn geclassificeerd dan zijn plafond, kan de sessie mislukken bij zijn eerste toolaanroep.
3. **Ontbrekende tools:** De lead heeft mogelijk specifieke tools nodig om werk te verdelen. Zorg dat toolprofielen correct zijn geconfigureerd.

### Teamleden zijn inactief en produceren nooit uitvoer

Leden wachten tot de lead hen werk stuurt via `sessions_send`. Als de lead de taak niet verdeelt:

- Het model van de lead begrijpt teamcoördinatie mogelijk niet. Probeer een capabeler model voor de leadrol.
- De `task`-beschrijving is mogelijk te vaag voor de lead om in subtaken te verdelen.
- Controleer `team_status` om te zien of de lead `active` is en recente activiteit heeft.

### "Write-down blocked" tussen teamleden

Teamleden volgen dezelfde classificatieregels als alle sessies. Als een lid is besmet tot `CONFIDENTIAL` en probeert gegevens te sturen naar een lid op `PUBLIC`, blokkeert de write-down-controle dit. Dit is verwacht gedrag — geclassificeerde gegevens kunnen niet stromen naar lager-geclassificeerde sessies, zelfs niet binnen een team.

---

## Delegatie en multi-agent

### "Delegation certificate signature invalid"

Agentdelegatie gebruikt cryptografische certificaten. Als de handtekeningcontrole mislukt, wordt de delegatie geweigerd. Dit voorkomt vervalste delegatieketens.

### "Delegation certificate expired"

Het delegatiecertificaat heeft een time-to-live. Als het is verlopen, kan de gedelegeerde agent niet meer namens de delegeerder handelen.

### "Delegation chain linkage broken"

Bij multi-hop delegaties (A delegeert aan B, B delegeert aan C) moet elke schakel in de keten geldig zijn. Als een schakel is verbroken, wordt de hele keten geweigerd.

---

## Webhooks

### "Webhook HMAC verification failed"

Inkomende webhooks vereisen HMAC-handtekeningen voor authenticatie. Als de handtekening ontbreekt, misvormd is, of niet overeenkomt:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Controleer of:
- De webhookbron de juiste HMAC-handtekeningheader verzendt
- Het gedeelde geheim in uw configuratie overeenkomt met het geheim van de bron
- Het handtekeningformaat overeenkomt (hexadecimaal gecodeerde HMAC-SHA256)

### "Webhook replay detected"

Triggerfish bevat replaybeveiliging. Als een webhookpayload een tweede keer wordt ontvangen (dezelfde handtekening), wordt het geweigerd.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<bronId>
```

Te veel webhookverzoeken van dezelfde bron in korte tijd. Dit beschermt tegen webhookoverstromingen. Wacht en probeer opnieuw.

---

## Auditintegriteit

### "previousHash mismatch"

Het auditlogboek gebruikt hashkoppeling. Elke vermelding bevat de hash van de vorige vermelding. Als de keten is verbroken, betekent dit dat het auditlogboek is gemanipuleerd of beschadigd.

### "HMAC mismatch"

De HMAC-handtekening van de auditvermelding komt niet overeen. De vermelding is mogelijk gewijzigd na aanmaak.
