# Multi-agentdirigering

Triggerfish stöder dirigering av olika kanaler, konton eller kontakter till separata isolerade agenter, var och en med sin egen arbetsyta, sessioner, personlighet och klassificeringstak.

## Varför flera agenter?

En enda agent med en enda personlighet räcker inte alltid. Du kanske vill ha:

- En **personlig assistent** på WhatsApp som hanterar kalender, påminnelser och familjemeddelanden.
- En **jobbassistent** på Slack som hanterar Jira-ärenden, GitHub-PRs och kodgranskningar.
- En **supportagent** på Discord som svarar på community-frågor med en annan ton och begränsad åtkomst.

Multi-agentdirigering låter dig köra alla dessa samtidigt från en enda Triggerfish-installation.

## Hur det fungerar

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-agentdirigering: inkommande kanaler dirigeras genom AgentRouter till isolerade agentarbetsytor" style="max-width: 100%;" />

**AgentRouter** undersöker varje inkommande meddelande och mappar det till en agent baserat på konfigurerbara dirigeringsregler. Om ingen regel matchar går meddelanden till en standardagent.

## Dirigeringsregler

Meddelanden kan dirigeras efter:

| Kriterier | Beskrivning                                     | Exempel                                           |
| --------- | ----------------------------------------------- | ------------------------------------------------- |
| Kanal     | Dirigera efter meddelandeplattform              | Alla Slack-meddelanden går till "Jobb"            |
| Konto     | Dirigera efter specifikt konto inom en kanal    | Jobbe-post vs personlig e-post                    |
| Kontakt   | Dirigera efter avsändar-/peer-identitet         | Meddelanden från din chef går till "Jobb"         |
| Standard  | Reserv när ingen regel matchar                  | Allt annat går till "Personlig"                   |

## Konfiguration

Definiera agenter och dirigering i `triggerfish.yaml`:

```yaml
agents:
  list:
    - id: personal
      name: "Personlig assistent"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Jobbassistent"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Kundsupport"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

Varje agent anger:

- **id** — Unik identifierare för dirigering.
- **name** — Mänskligt läsbart namn.
- **channels** — Vilka kanalinstanser den här agenten hanterar.
- **tools** — Verktygsprofil och explicita tillåt/neka-listor.
- **model** — Vilken LLM-modell som ska användas (kan skilja sig per agent).
- **classification_ceiling** — Maximal klassificeringsnivå den här agenten kan nå.

## Agentidentitet

Varje agent har sin egen `SPINE.md` som definierar dess personlighet, uppdrag och gränser. SPINE.md-filer finns i agentens arbetsytekatalog:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Personlig assistentpersonlighet
    work/
      SPINE.md          # Jobbassistentpersonlighet
    support/
      SPINE.md          # Supportbot-personlighet
```

## Isolering

Multi-agentdirigering tillämpar strikt isolering mellan agenter:

| Aspekt      | Isolering                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------- |
| Sessioner   | Varje agent har ett oberoende sessionsutrymme. Sessioner delas aldrig.                             |
| Taint       | Taint spåras per agent, inte över agenter. Jobbets taint påverkar inte personliga sessioner.       |
| Kunskaper   | Kunskaper laddas per arbetsyta. En jobbkunskap är inte tillgänglig för den personliga agenten.     |
| Hemligheter | Uppgifter är isolerade per agent. Supportagenten kan inte nå jobbets API-nycklar.                  |
| Arbetsytor  | Varje agent har sin egen filsystemsarbetsyta för kodexekvering.                                    |

::: warning Kommunikation mellan agenter är möjlig via `sessions_send` men gatas av policynivån. En agent kan inte tyst komma åt en annan agents data eller sessioner utan explicita policyregler som tillåter det. :::

::: tip Multi-agentdirigering är för att separera ansvarsområden över kanaler och personas. För agenter som behöver samarbeta om en delad uppgift, se [Agentteam](/sv-SE/features/agent-teams). :::

## Standardagent

När ingen dirigeringsregel matchar ett inkommande meddelande går det till standardagenten. Du kan ange detta i konfigurationen:

```yaml
agents:
  default: personal
```

Om ingen standard konfigureras används den första agenten i listan som standard.
