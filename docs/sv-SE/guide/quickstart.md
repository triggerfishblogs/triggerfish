# Snabbstart

Den här guiden tar dig igenom dina första 5 minuter med Triggerfish — från att köra installationsguiden till att ha en fungerande AI-agent att chatta med.

## Kör installationsguiden

Om du använde enkommandoinstallatören körde guiden redan under installationen. För att köra den igen eller börja om från scratch:

```bash
triggerfish dive
```

Guiden leder dig genom åtta steg:

### Steg 1: Välj din LLM-leverantör

```
Steg 1/8: Välj din LLM-leverantör
  > Triggerfish Gateway — inga API-nycklar behövs
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Lokal (Ollama)
    OpenRouter
```

Välj en leverantör och ange dina uppgifter. Triggerfish stöder flera leverantörer med automatisk failover. **Triggerfish Gateway** är det enklaste alternativet — prenumerera på en [Pro- eller Power-plan](/sv-SE/pricing) och din agent ansluter till hanterad LLM- och sökinfrastruktur utan API-nycklar att konfigurera.

### Steg 2: Namnge din agent

```
Steg 2/8: Namnge din agent och ange dess personlighet
  Agentnamn: Reef
  Uppdrag (en mening): Hjälp mig hålla ordning och vara informerad
  Ton: > Professionell  Avslappnad  Kortfattad  Anpassad
```

Detta genererar din `SPINE.md`-fil — grunden för din agents systemprompt. Du kan redigera den när som helst på `~/.triggerfish/SPINE.md`.

### Steg 3: Anslut en kanal

```
Steg 3/8: Anslut din första kanal
  > CLI (redan tillgänglig)
    WebChat
    Telegram (ange bot-token)
    Hoppa över för nu
```

Välj en meddelandeplattform eller hoppa över detta steg för att börja med bara CLI. Du kan lägga till kanaler senare i din `triggerfish.yaml`.

### Steg 4: Valfria plugins

```
Steg 4/8: Installera valfria plugins
  > Obsidian
    Hoppa över
```

Anslut valfria integrationer som Obsidian för anteckningstagning.

### Steg 5: Anslut Google Workspace (valfritt)

Anslut ditt Google-konto för Gmail, Kalender, Uppgifter, Drive och Sheets via OAuth2. Du kan hoppa över detta och ansluta senare med `triggerfish connect google`.

### Steg 6: Anslut GitHub (valfritt)

Anslut GitHub genom att klistra in en personlig åtkomsttoken. Ger agenten verktyg för repos, PR:er, ärenden och Actions. Du kan hoppa över detta och ansluta senare med `triggerfish connect github`.

### Steg 7: Ställ in webbsökning

Välj en sökmotor (Brave Search eller självhostad SearXNG) för din agent att använda, eller hoppa över för nu.

### Steg 8: Starta daemonen

```
Steg 8/8: Installera som daemon?
  > Ja (starta vid inloggning, körs i bakgrunden)
    Nej (bara manuell start)
```

Välj Ja för att ha din agent igång när din dator är på.

## Börja chatta

Efter att guiden är klar kan du börja chatta direkt via CLI:

```bash
triggerfish chat
```

Eller, om du anslöt en meddelandekanal, skicka ett meddelande till din agent där.

### Exempelkonversation

```
Du: Vad kan du hjälpa mig med?

Reef: Jag kan hjälpa dig med ett brett spektrum av uppgifter. Här är
några saker jag är konfigurerad för:

  - Svara på frågor och ha konversationer
  - Hantera din kalender och schema
  - Sammanfatta e-post och meddelanden
  - Skriva och redigera dokument
  - Köra kod i en sandlådemiljö
  - Söka på webben efter information
  - Automatisera återkommande uppgifter med cron-jobb

Vad vill du börja med?

Du: Sätt upp en morgonbriefing varje dag kl 7

Reef: Jag har skapat ett cron-jobb för din morgonbriefing:

  Schema: Varje dag kl 07:00
  Uppgift: Förbered briefing med kalenderhändelser, olästa e-post,
           och väderprognoser
  Leverans: CLI (lägg till en kanal i konfigurationen för att få det
            på Telegram/Slack)

Du får din första briefing imorgon bitti. Du kan hantera
cron-jobb när som helst med /cron list.
```

## Verifiera din installation

Kör hälsokontrollen för att säkerställa att allt fungerar:

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway körs (PID 12345, drifttid 2m)
  LLM-leverantör ansluten (Anthropic, Claude Sonnet 4.5)
  1 kanal aktiv (CLI)
  Policymotor laddad (4 regler)
  3 skills installerade (3 medföljande)

Övergripande: FRISK
```

## Vad du gör härnäst

- **Anpassa din agent** — redigera `~/.triggerfish/SPINE.md` för att förfina din agents personlighet och funktioner. Se [SPINE och Triggers](./spine-and-triggers).
- **Lägg till fler kanaler** — anslut Telegram, Slack, Discord eller WhatsApp i din `triggerfish.yaml`. Se [Konfiguration](./configuration).
- **Anslut integrationer** — `triggerfish connect google` för Google Workspace, `triggerfish connect github` för GitHub. Se [Integrationer](/sv-SE/integrations/).
- **Ställ in proaktivt beteende** — skapa en `~/.triggerfish/TRIGGER.md` för att berätta för din agent vad den ska övervaka. Se [SPINE och Triggers](./spine-and-triggers).
- **Utforska kommandon** — lär dig alla tillgängliga CLI- och chatkommandon. Se [CLI-kommandon](./commands).
