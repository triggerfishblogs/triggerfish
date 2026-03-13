# Felsökning: Kanaler

## Allmänna kanalproblem

### Kanalen verkar ansluten men inga meddelanden anländer

1. **Kontrollera ägar-ID:t.** Om `ownerId` inte är inställt eller är felaktigt kan dina meddelanden dirigeras som externa (icke-ägar) meddelanden med begränsade behörigheter.
2. **Kontrollera klassificering.** Om kanalens klassificering är lägre än sessionens taint blockeras svar av nedskrivningsregeln.
3. **Kontrollera daemon-loggarna.** Kör `triggerfish logs --level WARN` och leta efter leveransfel.

### Meddelanden skickas inte

Routern loggar leveransfel. Kontrollera `triggerfish logs` för:

```
Channel send failed
```

Det innebär att routern försökte leverera men kanaladaptern returnerade ett fel. Det specifika felet loggas bredvid det.

### Återförsöksbeteende

Kanalroutern använder exponentiell backoff för misslyckade sändningar. Om ett meddelande misslyckas görs ett nytt försök med ökande fördröjningar. Efter att alla återförsök är uttömda droppas meddelandet och felet loggas.

---

## Telegram

### Boten svarar inte

1. **Verifiera token.** Gå till @BotFather på Telegram och kontrollera att din token är giltig och matchar det som lagras i nyckelringen.
2. **Meddela boten direkt.** Gruppmeddelanden kräver att boten har behörighet för gruppmeddelanden.
3. **Kontrollera för pollingfel.** Telegram använder lång polling. Om anslutningen bryts återansluter adaptern automatiskt, men ihållande nätverksproblem förhindrar meddelandemottagning.

### Meddelanden delas upp i flera delar

Telegram har en gräns på 4 096 tecken per meddelande. Långa svar delas automatiskt upp. Det är normalt beteende.

### Botkommandon visas inte i menyn

Adaptern registrerar snedstreckskommandon vid uppstart. Om registreringen misslyckas loggar den en varning men fortsätter att köra. Det är icke-dödligt. Boten fungerar fortfarande; kommandomenyn visar bara inte autokomplettförslag.

### Kan inte ta bort gamla meddelanden

Telegram tillåter inte botar att ta bort meddelanden äldre än 48 timmar. Försök att ta bort gamla meddelanden misslyckas utan felmeddelande. Det är en Telegram API-begränsning.

---

## Slack

### Boten ansluter inte

Slack kräver tre uppgifter:

| Uppgift | Format | Var du hittar det |
|---------|--------|-------------------|
| Bot Token | `xoxb-...` | OAuth & Permissions-sidan i Slack-appinställningar |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hexsträng | Basic Information > App Credentials |

Om någon av de tre saknas eller är ogiltig misslyckas anslutningen. Det vanligaste misstaget är att glömma App Token, som är separat från Bot Token.

### Socket Mode-problem

Triggerfish använder Slacks Socket Mode, inte HTTP-händelseabonnemang. I dina Slack-appinställningar:

1. Gå till "Socket Mode" och se till att det är aktiverat
2. Skapa en app-nivåtoken med `connections:write`-scope
3. Den här token är `appToken` (`xapp-...`)

Om Socket Mode inte är aktiverat räcker inte bot-token ensamt för realtidsmeddelandehantering.

### Meddelanden trunkeras

Slack har en gräns på 40 000 tecken. Till skillnad från Telegram och Discord trunkerar Triggerfish Slack-meddelanden istället för att dela upp dem. Om du regelbundet når den här gränsen, överväg att be din agent producera mer kortfattad utdata.

### SDK-resursläckor i tester

Slack SDK läcker asynkrona operationer vid import. Det är ett känt uppströmsproblem. Tester som använder Slack-adaptern behöver `sanitizeResources: false` och `sanitizeOps: false`. Det påverkar inte produktionsanvändning.

---

## Discord

### Boten kan inte läsa meddelanden i servrar

Discord kräver det **privilegierade intentet Message Content**. Utan det tar boten emot meddelandehändelser men meddelandeinnehållet är tomt.

**Åtgärd:** I [Discord Developer Portal](https://discord.com/developers/applications):
1. Välj din applikation
2. Gå till "Bot"-inställningar
3. Aktivera "Message Content Intent" under Privileged Gateway Intents
4. Spara ändringar

### Obligatoriska bot-intents

Adaptern kräver dessa aktiverade intents:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privilegierat)

### Meddelanden delas upp

Discord har en gräns på 2 000 tecken. Långa meddelanden delas automatiskt upp i flera meddelanden.

### Skrivindikator misslyckas

Adaptern skickar skrivindikatorer innan svar. Om boten saknar behörighet att skicka meddelanden i en kanal misslyckas skrivindikatorn utan synlig effekt (loggas på DEBUG-nivå). Det är bara kosmetiskt.

### SDK-resursläckor

Precis som Slack läcker discord.js SDK asynkrona operationer vid import. Tester behöver `sanitizeOps: false`. Det påverkar inte produktion.

---

## WhatsApp

### Inga meddelanden tas emot

WhatsApp använder en webhook-modell. Boten lyssnar på inkommande HTTP POST-förfrågningar från Metas servrar. För att meddelanden ska anlända:

1. **Registrera webhook-URL:en** i [Meta Business Dashboard](https://developers.facebook.com/)
2. **Konfigurera verifieringstoken.** Adaptern kör ett verifieringshandslag när Meta ansluter första gången
3. **Starta webhook-lyssnaren.** Adaptern lyssnar på port 8443 som standard. Se till att den här porten är nåbar från internet (använd en omvänd proxy eller tunnel)

### Varningen "ownerPhone not configured"

Om `ownerPhone` inte är inställt i WhatsApp-kanalkonfigurationen behandlas alla avsändare som ägaren. Det innebär att alla användare får full tillgång till alla verktyg. Det är ett säkerhetsproblem.

**Åtgärd:** Ange ägarens telefonnummer i din konfiguration:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Åtkomsttoken utgången

WhatsApp Cloud API-åtkomsttoken kan löpa ut. Om sändningar börjar misslyckas med 401-fel, regenerera token i Meta-instrumentpanelen och uppdatera den:

```bash
triggerfish config set-secret whatsapp:accessToken <ny-token>
```

---

## Signal

### signal-cli hittades ej

Signal-kanalen kräver `signal-cli`, ett tredjeparts Java-program. Triggerfish försöker autoinstallera det under inställning, men det kan misslyckas om:

- Java (JRE 21+) inte är tillgängligt och autoinstallationen av JRE 25 misslyckades
- Nedladdningen blockerades av nätverksbegränsningar
- Målkatalogen inte är skrivbar

**Manuell installation:**

```bash
# Installera signal-cli manuellt
# Se https://github.com/AsamK/signal-cli för instruktioner
```

### signal-cli-daemon nås ej

Efter att ha startat signal-cli väntar Triggerfish upp till 60 sekunder för att det ska bli nåbart. Om det tar för lång tid:

```
signal-cli daemon (tcp) not reachable within 60s
```

Kontrollera:
1. Körs signal-cli faktiskt? Kontrollera `ps aux | grep signal-cli`
2. Lyssnar det på den förväntade endpointen (TCP-socket eller Unix-socket)?
3. Behöver Signal-kontot länkas? Kör `triggerfish config add-channel signal` för att gå igenom länkningsprocessen igen.

### Enhetslänkning misslyckades

Signal kräver länkning av enheten till ditt Signal-konto via QR-kod. Om länkningsprocessen misslyckas:

1. Se till att Signal är installerat på din telefon
2. Öppna Signal > Inställningar > Länkade enheter > Länka ny enhet
3. Skanna QR-koden som visas av installationsguiden
4. Om QR-koden gick ut, starta om länkningsprocessen

### signal-cli-versionskonflikt

Triggerfish fäster vid en känd-bra version av signal-cli. Om du installerat en annan version kan du se en varning:

```
Signal CLI version older than known-good
```

Det är icke-dödligt men kan orsaka kompatibilitetsproblem.

---

## E-post

### IMAP-anslutning misslyckas

E-postadaptern ansluter till din IMAP-server för inkommande post. Vanliga problem:

- **Felaktiga uppgifter.** Verifiera IMAP-användarnamn och lösenord.
- **Port 993 blockerad.** Adaptern använder IMAP över TLS (port 993). Vissa nätverk blockerar det.
- **Appspecifikt lösenord krävs.** Gmail och andra leverantörer kräver appspecifika lösenord när 2FA är aktiverat.

Felmeddelanden du kan se:
- `IMAP LOGIN failed` — fel användarnamn eller lösenord
- `IMAP connection not established` — kan inte nå servern
- `IMAP connection closed unexpectedly` — servern stängde anslutningen

### SMTP-sändningsfel

E-postadaptern skickar via en SMTP API-relätjänst (inte direkt SMTP). Om sändningar misslyckas med HTTP-fel:

- 401/403: API-nyckeln är ogiltig
- 429: Hastighetsbegränsad
- 5xx: Relätjänsten är nere

### IMAP-polling slutar

Adaptern söker efter nya e-postmeddelanden var 30:e sekund. Om sökning misslyckas loggas felet men det finns ingen automatisk återanslutning. Starta om daemonen för att återupprätta IMAP-anslutningen.

Det här är en känd begränsning. Se [Kända problem](/sv-SE/support/kb/known-issues).

---

## WebChat

### WebSocket-uppgradering avvisad

WebChat-adaptern validerar inkommande anslutningar:

- **Headers för stora (431).** Den kombinerade headerstorleken överstiger 8 192 byte. Det kan hända med överdrivet stora cookies eller anpassade headers.
- **CORS-avvisning.** Om `allowedOrigins` är konfigurerat måste Origin-headern matcha. Standardvärdet är `["*"]` (tillåt allt).
- **Felformade ramar.** Ogiltig JSON i WebSocket-ramar loggas på WARN-nivå och ramen droppas.

### Klassificering

WebChat är som standard PUBLIC-klassificerat. Besökare behandlas aldrig som ägaren. Om du behöver högre klassificering för WebChat, ange det explicit:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub-pollingsfel

Google Chat använder Pub/Sub för meddelandeleverans. Om polling misslyckas:

```
Google Chat PubSub poll failed
```

Kontrollera:
- Google Cloud-uppgifter är giltiga (kontrollera `credentials_ref` i konfigurationen)
- Pub/Sub-abonnemanget finns och har inte tagits bort
- Tjänstkontot har rollen `pubsub.subscriber`

### Gruppmeddelanden nekas

Om gruppläge inte är konfigurerat kan gruppmeddelanden tyst droppas:

```
Google Chat group message denied by group mode
```

Konfigurera `defaultGroupMode` i Google Chat-kanalkonfigurationen.

### ownerEmail ej konfigurerad

Utan `ownerEmail` behandlas alla användare som icke-ägare:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Ange det i din konfiguration för att få full verktygsåtkomst.
