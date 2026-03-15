# Felsökning: Säkerhet och klassificering

## Nedskrivningsblock

### "Write-down blocked"

Det här är det vanligaste säkerhetsfelet. Det innebär att data försöker flöda från en högre klassificeringsnivå till en lägre.

**Exempel:** Din session kom åt CONFIDENTIAL-data (läste en klassificerad fil, frågade en klassificerad databas). Sessionens taint är nu CONFIDENTIAL. Du försökte sedan skicka svaret till en PUBLIC WebChat-kanal. Policymotorn blockerar det eftersom CONFIDENTIAL-data inte kan flöda till PUBLIC-destinationer.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Hur du löser det:**
1. **Starta en ny session.** En ny session börjar med PUBLIC taint. Använd en ny konversation.
2. **Använd en högre klassificerad kanal.** Skicka svaret via en kanal klassificerad som CONFIDENTIAL eller högre.
3. **Förstå vad som orsakade tainten.** Kontrollera loggarna för "Taint escalation"-poster för att se vilket verktygsanrop som höjde sessionens klassificering.

### "Session taint cannot flow to channel"

Samma som nedskrivning, men specifikt om kanalklassificering:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Verktygsanrop till klassificerade integrationer tillämpar också nedskrivningsregeln:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Observera att det verkar bakvänt. Sessionens taint är högre än verktygets klassificering. Det innebär att sessionen är för taintad för att använda ett lägre klassificerat verktyg. Oron är att anropa verktyget kan läcka klassificerat sammanhang in i ett mindre säkert system.

### "Workspace write-down blocked"

Agentarbetsytor har per-katalog-klassificering. Att skriva till en lägre klassificerad katalog från en mer taintad session blockeras:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint-eskalering

### "Taint escalation"

Det här är informativt, inte ett fel. Det innebär att sessionens klassificeringsnivå just ökade eftersom agenten kom åt klassificerad data.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint går bara uppåt, aldrig nedåt. När en session väl är taintad till CONFIDENTIAL förblir den det under resten av sessionen.

### "Resource-based taint escalation firing"

Ett verktygsanrop kom åt en resurs med en klassificering som är högre än sessionens nuvarande taint. Sessionens taint eskaleras automatiskt för att matcha.

### "Non-owner taint applied"

Icke-ägaranvändare kan få sina sessioner taintade baserat på kanalens klassificering eller användarens behörigheter. Det är separat från resursbaserad taint.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

Alla utgående HTTP-förfrågningar (web_fetch, webbläsarnavigering, MCP SSE-anslutningar) genomgår SSRF-skydd. Om målvärddatorn löser upp till en privat IP-adress blockeras förfrågan.

**Blockerade intervall:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (privat)
- `172.16.0.0/12` (privat)
- `192.168.0.0/16` (privat)
- `169.254.0.0/16` (länk-lokal)
- `0.0.0.0/8` (ospecificerad)
- `::1` (IPv6 loopback)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 länk-lokal)

Det här skyddet är hårdkodat och kan inte inaktiveras eller konfigureras. Det förhindrar AI-agenten från att luras att komma åt interna tjänster.

**IPv4-mappad IPv6:** Adresser som `::ffff:127.0.0.1` identifieras och blockeras.

### "SSRF check blocked outbound request"

Samma som ovan, men loggas från web_fetch-verktyget istället för SSRF-modulen.

### DNS-upplösningsfel

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Värddatorn kunde inte lösas upp. Kontrollera:
- URL:en är stavad korrekt
- Din DNS-server är nåbar
- Domänen faktiskt finns

---

## Policymotor

### "Hook evaluation failed, defaulting to BLOCK"

En policyhook kastade ett undantag under utvärdering. När det händer är standardåtgärden BLOCK (neka). Det är det säkra standardvärdet.

Kontrollera loggarna för hela undantaget. Det indikerar troligtvis en bugg i en anpassad policyregel.

### "Policy rule blocked action"

En policyregel nekade uttryckligen åtgärden. Loggposten inkluderar vilken regel som utlöstes och varför. Kontrollera avsnittet `policy.rules` i din konfiguration för att se vilka regler som är definierade.

### "Tool floor violation"

Ett verktyg anropades som kräver en minsta klassificeringsnivå, men sessionen är under den nivån.

**Exempel:** Healthcheck-verktyget kräver minst INTERNAL-klassificering (eftersom det avslöjar systeminterna). Om en PUBLIC-session försöker använda det blockeras anropet.

---

## Plugin- och kunskapssäkerhet

### "Plugin network access blocked"

Plugins körs i en sandlåda med begränsad nätverksåtkomst. De kan bara komma åt URL:er på sin deklarerade endpoint-domän.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Plugin:et försökte komma åt en URL som inte finns i dess deklarerade endpoints, eller URL:en löste upp till en privat IP.

### "Skill activation blocked by classification ceiling"

Kunskaper deklarerar ett `classification_ceiling` i sin SKILL.md-frontmatter. Om taket är lägre än sessionens taintnivå kan kunskapen inte aktiveras:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Det förhindrar att en lägre klassificerad kunskaps exponeras för högre klassificerad data.

### "Skill content integrity check failed"

Efter installation hashar Triggerfish kunskapens innehåll. Om hashen ändras (kunskapen modifierades efter installation) misslyckas integritetskontrollen:

```
Skill content hash mismatch detected
```

Det kan indikera manipulering. Installera om kunskapen från en betrodd källa.

### "Skill install rejected by scanner"

Säkerhetsskannern hittade misstänkt innehåll i kunskapen. Skannern letar efter mönster som kan indikera skadligt beteende. De specifika varningarna ingår i felmeddelandet.

---

## Sessionssäkerhet

### "Session not found"

```
Session not found: <session-id>
```

Den begärda sessionen finns inte i sessionshanteraren. Den kan ha rensats upp, eller session-ID:t är ogiltigt.

### "Session status access denied: taint exceeds caller"

Du försökte visa en sessions status, men den sessionen har en högre taintnivå än din nuvarande session. Det förhindrar lägre klassificerade sessioner från att lära sig om högre klassificerade operationer.

### "Session history access denied"

Samma koncept som ovan, men för att visa konversationshistorik.

---

## Agentteam

### "Team message delivery denied: team status is ..."

Teamet är inte i `running`-status. Det här händer när:

- Teamet **upplöstes** (manuellt eller av livscykelmonitorn)
- Teamet **pausades** eftersom ledarens session misslyckades
- Teamet **gick ut** efter att ha överskridit sin livstidsgräns

Kontrollera teamets nuvarande status med `team_status`. Om teamet är pausat på grund av ledarfel kan du upplösa det med `team_disband` och skapa ett nytt.

### "Team member not found" / "Team member ... is not active"

Målmedlemmen finns antingen inte (fel rollnamn) eller har avslutats. Medlemmar avslutas när:

- De överstiger inaktivitetstimeout (2x `idle_timeout_seconds`)
- Teamet upplöses
- Deras session kraschar och livscykelmonitorn identifierar det

Använd `team_status` för att se alla medlemmar och deras nuvarande status.

### "Team disband denied: only the lead or creating session can disband"

Bara två sessioner kan upplösa ett team:

1. Sessionen som ursprungligen anropade `team_create`
2. Ledarmedlemmens session

Om du får det här felet inifrån teamet är den anropande medlemmen inte ledaren. Om du får det utifrån teamet är du inte sessionen som skapade det.

### Teamledaren misslyckas omedelbart efter skapande

Ledarens agentsession kunde inte slutföra sin första tur. Vanliga orsaker:

1. **LLM-leverantörsfel:** Leverantören returnerade ett fel (hastighetsgräns, autentiseringsfel, modell hittades ej). Kontrollera `triggerfish logs` för leverantörsfel.
2. **Klassificeringstak för lågt:** Om ledaren behöver verktyg klassificerade över sitt tak kan sessionen misslyckas vid sitt första verktygsanrop.
3. **Saknade verktyg:** Ledaren kan behöva specifika verktyg för att dela upp arbete. Se till att verktygsprofiler är korrekt konfigurerade.

### Teammedlemmar är inaktiva och producerar aldrig utdata

Medlemmar väntar på att ledaren ska skicka dem arbete via `sessions_send`. Om ledaren inte delar upp uppgiften:

- Ledarens modell förstår kanske inte teamkoordinering. Prova en mer kapabel modell för ledarrollen.
- Beskrivningen av `task` kan vara för vag för att ledaren ska kunna dela upp den i deluppgifter.
- Kontrollera `team_status` för att se om ledaren är `active` och har nylig aktivitet.

### "Write-down blocked" mellan teammedlemmar

Teammedlemmar följer samma klassificeringsregler som alla sessioner. Om en medlem har taintats till `CONFIDENTIAL` och försöker skicka data till en medlem med `PUBLIC`, blockerar nedskrivningskontrollen det. Det är förväntat beteende — klassificerad data kan inte flöda till lägre klassificerade sessioner, inte ens inom ett team.

---

## Delegering och multi-agent

### "Delegation certificate signature invalid"

Agentdelegering använder kryptografiska certifikat. Om signaturkontrollen misslyckas avvisas delegeringen. Det förhindrar förfalskade delegationskedjor.

### "Delegation certificate expired"

Delegeringscertifikatet har en livstid. Om det har gått ut kan den delegerade agenten inte längre agera på uppdragsgivarens vägnar.

### "Delegation chain linkage broken"

Vid fler-hopp-delegeringar (A delegerar till B, B delegerar till C) måste varje länk i kedjan vara giltig. Om någon länk är bruten avvisas hela kedjan.

---

## Webhooks

### "Webhook HMAC verification failed"

Inkommande webhooks kräver HMAC-signaturer för autentisering. Om signaturen saknas, är felaktig eller inte matchar:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Kontrollera att:
- Webhook-källan skickar korrekt HMAC-signaturheader
- Den delade hemligheten i din konfiguration matchar källans hemlighet
- Signaturformatet matchar (hexkodad HMAC-SHA256)

### "Webhook replay detected"

Triggerfish inkluderar uppspelningsskydd. Om en webhook-nyttolast tas emot en andra gång (samma signatur) avvisas den.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<källId>
```

För många webhook-förfrågningar från samma källa under kort tid. Det skyddar mot webhook-översvämningar. Vänta och försök igen.

---

## Granskningsintegritet

### "previousHash mismatch"

Granskningsloggen använder hashkedjeläggning. Varje post inkluderar hashen av den föregående posten. Om kedjan bryts innebär det att granskningsloggen manipulerades eller skadades.

### "HMAC mismatch"

Granskningspostens HMAC-signatur matchar inte. Posten kan ha ändrats efter skapandet.
