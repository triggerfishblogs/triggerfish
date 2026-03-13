# Probleemoplossing: Kanalen

## Algemene kanaalproblemen

### Kanaal lijkt verbonden maar er komen geen berichten aan

1. **Controleer het eigenaar-ID.** Als `ownerId` niet is ingesteld of onjuist is, kunnen berichten van u worden doorstuurd als externe (niet-eigenaar) berichten met beperkte machtigingen.
2. **Controleer de classificatie.** Als de classificatie van het kanaal lager is dan de sessie-taint, worden reacties geblokkeerd door de no-write-down-regel.
3. **Controleer de daemonlogboeken.** Voer `triggerfish logs --level WARN` uit en zoek naar bezorgingsfouten.

### Berichten worden niet verzonden

De router logt bezorgingsfouten. Controleer `triggerfish logs` op:

```
Channel send failed
```

Dit betekent dat de router bezorging heeft geprobeerd maar de kanaladapter een fout heeft teruggegeven. De specifieke fout wordt ernaast gelogd.

### Herproberinggedrag

De kanaalrouter gebruikt exponentiële terugval voor mislukte verzendingen. Als een bericht mislukt, wordt het opnieuw geprobeerd met toenemende vertragingen. Na het uitputten van alle pogingen wordt het bericht verwijderd en de fout gelogd.

---

## Telegram

### Bot reageert niet

1. **Verifieer het token.** Ga naar @BotFather op Telegram en controleer of uw token geldig is en overeenkomt met wat is opgeslagen in de sleutelhanger.
2. **Stuur een bericht direct naar de bot.** Groepsberichten vereisen dat de bot groepsberichtmachtigingen heeft.
3. **Controleer op pollingfouten.** Telegram gebruikt long polling. Als de verbinding wegvalt, maakt de adapter automatisch opnieuw verbinding, maar aanhoudende netwerkproblemen voorkomen berichtontvangst.

### Berichten worden opgesplitst in meerdere delen

Telegram heeft een limiet van 4.096 tekens per bericht. Lange reacties worden automatisch opgesplitst. Dit is normaal gedrag.

### Botopdrachten verschijnen niet in het menu

De adapter registreert slash-opdrachten bij opstarten. Als de registratie mislukt, logt hij een waarschuwing maar blijft hij actief. Dit is niet fataal. De bot werkt nog steeds; het opdrachtensmenu toont alleen geen autocomplete-suggesties.

### Kan oude berichten niet verwijderen

Telegram staat bots niet toe berichten ouder dan 48 uur te verwijderen. Pogingen om oude berichten te verwijderen mislukken stilzwijgend. Dit is een Telegram API-beperking.

---

## Slack

### Bot maakt geen verbinding

Slack vereist drie inloggegevens:

| Inloggegevens | Formaat | Waar te vinden |
|--------------|---------|----------------|
| Bot Token | `xoxb-...` | OAuth & Permissions-pagina in Slack app-instellingen |
| App Token | `xapp-...` | Basisinformatie > App-niveautokens |
| Signing Secret | Hexadecimale tekenreeks | Basisinformatie > App-inloggegevens |

Als een van de drie ontbreekt of ongeldig is, mislukt de verbinding. De meest voorkomende fout is het vergeten van het App Token, dat afzonderlijk is van het Bot Token.

### Socket Mode-problemen

Triggerfish gebruikt Slack's Socket Mode, geen HTTP-evenementabonnementen. In uw Slack app-instellingen:

1. Ga naar "Socket Mode" en zorg dat het is ingeschakeld
2. Maak een app-niveautoken aan met het bereik `connections:write`
3. Dit token is het `appToken` (`xapp-...`)

Als Socket Mode niet is ingeschakeld, is het bot-token alleen niet voldoende voor realtime berichten.

### Berichten worden afgekapt

Slack heeft een limiet van 40.000 tekens. Anders dan Telegram en Discord kapt Triggerfish Slack-berichten af in plaats van ze op te splitsen. Als u deze limiet regelmatig bereikt, overweeg dan uw agent om beknoptere uitvoer te vragen.

### SDK-resourcelekken in tests

De Slack SDK lekt asynchrone operaties bij import. Dit is een bekend upstream-probleem. Tests die de Slack-adapter gebruiken hebben `sanitizeResources: false` en `sanitizeOps: false` nodig. Dit heeft geen invloed op productiegebruik.

---

## Discord

### Bot kan berichten niet lezen in servers

Discord vereist de **Message Content** geprivilegeerde intent. Zonder deze intent ontvangt de bot berichtgebeurtenissen maar is de berichtinhoud leeg.

**Oplossing:** In het [Discord Ontwikkelaarsportaal](https://discord.com/developers/applications):
1. Selecteer uw applicatie
2. Ga naar "Bot"-instellingen
3. Schakel "Message Content Intent" in onder Privileged Gateway Intents
4. Sla de wijzigingen op

### Vereiste bot-intents

De adapter vereist deze ingeschakelde intents:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (geprivilegieerd)

### Berichten worden opgesplitst

Discord heeft een limiet van 2.000 tekens. Lange berichten worden automatisch opgesplitst in meerdere berichten.

### Typindicator mislukt

De adapter verzendt typindicatoren vóór reacties. Als de bot geen toestemming heeft om berichten te verzenden in een kanaal, mislukt de typindicator stilzwijgend (gelogd op DEBUG-niveau). Dit is alleen cosmetisch.

### SDK-resourcelekken

Net als Slack lekt de discord.js SDK asynchrone operaties bij import. Tests hebben `sanitizeOps: false` nodig. Dit heeft geen invloed op productie.

---

## WhatsApp

### Geen berichten ontvangen

WhatsApp gebruikt een webhook-model. De bot luistert naar inkomende HTTP POST-verzoeken van de servers van Meta. Voor berichten om aan te komen:

1. **Registreer de webhook-URL** in het [Meta Business-dashboard](https://developers.facebook.com/)
2. **Configureer het verificatietoken.** De adapter voert een verificatiehanddruk uit wanneer Meta voor het eerst verbinding maakt
3. **Start de webhookluisteraar.** De adapter luistert standaard op poort 8443. Zorg dat deze poort bereikbaar is vanaf het internet (gebruik een reverse proxy of tunnel)

### Waarschuwing "ownerPhone not configured"

Als `ownerPhone` niet is ingesteld in de WhatsApp-kanaalconfiguratie, worden alle verzenders als eigenaar behandeld. Dit betekent dat elke gebruiker volledige toegang heeft tot alle tools. Dit is een beveiligingsprobleem.

**Oplossing:** Stel het telefoonnummer van de eigenaar in uw configuratie in:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Toegangstoken verlopen

WhatsApp Cloud API-toegangstokens kunnen verlopen. Als verzendingen beginnen te mislukken met 401-fouten, genereer dan een nieuw token in het Meta-dashboard en werk het bij:

```bash
triggerfish config set-secret whatsapp:accessToken <nieuw-token>
```

---

## Signal

### signal-cli niet gevonden

Het Signal-kanaal vereist `signal-cli`, een externe Java-applicatie. Triggerfish probeert het automatisch te installeren tijdens de instelling, maar dit kan mislukken als:

- Java (JRE 21+) niet beschikbaar is en de auto-installatie van JRE 25 is mislukt
- De download is geblokkeerd door netwerkbeperkingen
- De doeldirectory niet beschrijfbaar is

**Handmatige installatie:**

```bash
# signal-cli handmatig installeren
# Zie https://github.com/AsamK/signal-cli voor instructies
```

### signal-cli daemon niet bereikbaar

Na het starten van signal-cli wacht Triggerfish tot 60 seconden totdat het bereikbaar wordt. Als dit een time-out geeft:

```
signal-cli daemon (tcp) not reachable within 60s
```

Controleer:
1. Is signal-cli daadwerkelijk actief? Controleer `ps aux | grep signal-cli`
2. Luistert het op het verwachte eindpunt (TCP-socket of Unix-socket)?
3. Moet het Signal-account worden gekoppeld? Voer `triggerfish config add-channel signal` opnieuw uit om het koppelingsproces te doorlopen.

### Apparaatkoppeling mislukt

Signal vereist dat het apparaat wordt gekoppeld aan uw Signal-account via een QR-code. Als het koppelingsproces mislukt:

1. Zorg dat Signal is geïnstalleerd op uw telefoon
2. Open Signal > Instellingen > Gekoppelde apparaten > Nieuw apparaat koppelen
3. Scan de QR-code weergegeven door de installatiewizard
4. Als de QR-code is verlopen, herstart het koppelingsproces

### signal-cli versie-mismatch

Triggerfish is vastgezet op een bekende goede versie van signal-cli. Als u een andere versie hebt geïnstalleerd, ziet u mogelijk een waarschuwing:

```
Signal CLI version older than known-good
```

Dit is niet fataal maar kan compatibiliteitsproblemen veroorzaken.

---

## E-mail

### IMAP-verbinding mislukt

De e-mailadapter verbindt met uw IMAP-server voor inkomende mail. Veelvoorkomende problemen:

- **Verkeerde inloggegevens.** Verifieer IMAP-gebruikersnaam en -wachtwoord.
- **Poort 993 geblokkeerd.** De adapter gebruikt IMAP over TLS (poort 993). Sommige netwerken blokkeren dit.
- **App-specifiek wachtwoord vereist.** Gmail en andere providers vereisen app-specifieke wachtwoorden wanneer 2FA is ingeschakeld.

Foutmeldingen die u kunt zien:
- `IMAP LOGIN failed` — verkeerde gebruikersnaam of wachtwoord
- `IMAP connection not established` — kan de server niet bereiken
- `IMAP connection closed unexpectedly` — server heeft de verbinding verbroken

### SMTP-verzendfouten

De e-mailadapter verzendt via een SMTP API-relay (geen directe SMTP). Als verzendingen mislukken met HTTP-fouten:

- 401/403: API-sleutel is ongeldig
- 429: Te veel verzoeken
- 5xx: Relayservice is uitgevallen

### IMAP-polling stopt

De adapter pollt elke 30 seconden op nieuwe e-mails. Als polling mislukt, wordt de fout gelogd maar is er geen automatische herverbinding. Herstart de daemon om de IMAP-verbinding opnieuw tot stand te brengen.

Dit is een bekende beperking. Zie [Bekende problemen](/nl-NL/support/kb/known-issues).

---

## WebChat

### WebSocket-upgrade geweigerd

De WebChat-adapter valideert inkomende verbindingen:

- **Headers te groot (431).** De gecombineerde headergrootte overschrijdt 8.192 bytes. Dit kan gebeuren met te grote cookies of aangepaste headers.
- **CORS-weigering.** Als `allowedOrigins` is geconfigureerd, moet de Origin-header overeenkomen. De standaard is `["*"]` (alles toestaan).
- **Misvormde frames.** Ongeldige JSON in WebSocket-frames wordt gelogd op WARN-niveau en het frame wordt verwijderd.

### Classificatie

WebChat is standaard geclassificeerd als PUBLIC. Bezoekers worden nooit als eigenaar behandeld. Als u hogere classificatie nodig heeft voor WebChat, stel dit dan expliciet in:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub-pollingfouten

Google Chat gebruikt Pub/Sub voor berichtbezorging. Als polling mislukt:

```
Google Chat PubSub poll failed
```

Controleer:
- Google Cloud-inloggegevens zijn geldig (controleer de `credentials_ref` in de configuratie)
- Het Pub/Sub-abonnement bestaat en is niet verwijderd
- Het serviceaccount heeft de rol `pubsub.subscriber`

### Groepsberichten geweigerd

Als de groepsmodus niet is geconfigureerd, kunnen groepsberichten stilzwijgend worden verwijderd:

```
Google Chat group message denied by group mode
```

Configureer `defaultGroupMode` in de Google Chat-kanaalconfiguratie.

### ownerEmail niet geconfigureerd

Zonder `ownerEmail` worden alle gebruikers behandeld als niet-eigenaar:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Stel dit in uw configuratie in om volledige tooltoegang te krijgen.
