# Multi-agent routing

Triggerfish ondersteunt het routeren van verschillende kanalen, accounts of contacten naar afzonderlijke geïsoleerde agents, elk met zijn eigen werkruimte, sessies, persoonlijkheid en classificatieplafond.

## Waarom meerdere agents?

Een enkele agent met een enkele persoonlijkheid is niet altijd genoeg. U wilt wellicht:

- Een **persoonlijk assistent** op WhatsApp die agenda, herinneringen en familieberichten verwerkt.
- Een **werkassistent** op Slack die Jira-tickets, GitHub PR's en codebeoordelingen beheert.
- Een **ondersteuningsagent** op Discord die gemeenschapsvragen beantwoordt met een andere toon en beperkte toegang.

Multi-agent routing laat u dit alles gelijktijdig draaien vanuit één Triggerfish-installatie.

## Hoe het werkt

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-agent routing: inkomende kanalen gerouteerd via AgentRouter naar geïsoleerde agentenwerkruimtes" style="max-width: 100%;" />

De **AgentRouter** onderzoekt elk inkomend bericht en wijst het toe aan een agent op basis van configureerbare routeringsregels. Als er geen regel overeenkomt, gaan berichten naar een standaardagent.

## Routeringsregels

Berichten kunnen worden gerouteerd op:

| Criterium | Beschrijving                                    | Voorbeeld                                         |
| --------- | ----------------------------------------------- | ------------------------------------------------- |
| Kanaal    | Routeer op berichtenplatform                    | Alle Slack-berichten gaan naar "Werk"             |
| Account   | Routeer op specifiek account binnen een kanaal  | Werke-mail versus persoonlijke e-mail             |
| Contact   | Routeer op afzender/peeridentiteit              | Berichten van uw manager gaan naar "Werk"         |
| Standaard | Terugval wanneer geen regel overeenkomt         | Al het andere gaat naar "Persoonlijk"             |

## Configuratie

Definieer agents en routing in `triggerfish.yaml`:

```yaml
agents:
  list:
    - id: personal
      name: "Persoonlijk Assistent"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Werkassistent"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Klantenondersteuning"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

Elke agent specificeert:

- **id** — Unieke identificatie voor routing.
- **name** — Leesbare naam.
- **channels** — Welke kanaalen dit agent verwerkt.
- **tools** — Toolprofiel en expliciete allow/deny-lijsten.
- **model** — Welk LLM-model te gebruiken (kan per agent verschillen).
- **classification_ceiling** — Maximaal classificatieniveau dat deze agent kan bereiken.

## Agentidentiteit

Elke agent heeft zijn eigen `SPINE.md` die zijn persoonlijkheid, missie en grenzen definieert. SPINE.md-bestanden bevinden zich in de werkruimtemap van de agent:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Persoonlijke assistentpersoonlijkheid
    work/
      SPINE.md          # Werkassistentpersoonlijkheid
    support/
      SPINE.md          # Supportbot-persoonlijkheid
```

## Isolatie

Multi-agent routing handhaaft strikte isolatie tussen agents:

| Aspect      | Isolatie                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Sessies     | Elke agent heeft onafhankelijke sessiespace. Sessies worden nooit gedeeld.                            |
| Taint       | Taint wordt per-agent bijgehouden, niet over agents heen. Werktaint beïnvloedt geen persoonlijke sessies. |
| Skills      | Skills worden per-werkruimte geladen. Een werkskill is niet beschikbaar voor de persoonlijke agent.   |
| Geheimen    | Inloggegevens zijn per-agent geïsoleerd. De ondersteuningsagent heeft geen toegang tot werk-API-sleutels. |
| Werkruimten | Elke agent heeft zijn eigen bestandssysteemwerkruimte voor code-uitvoering.                           |

::: warning Communicatie tussen agents is mogelijk via `sessions_send` maar wordt geblokkeerd door de beleidslaag. Één agent kan niet stilzwijgend toegang krijgen tot de gegevens of sessies van een andere agent zonder expliciete beleidsregels die dat toestaan. :::

::: tip Multi-agent routing is voor het scheiden van zorgen over kanalen en persona's. Voor agents die moeten samenwerken aan een gedeelde taak, zie [Agentteams](/nl-NL/features/agent-teams). :::

## Standaardagent

Wanneer geen routeringsregel overeenkomt met een inkomend bericht, gaat het naar de standaardagent. U kunt dit instellen in de configuratie:

```yaml
agents:
  default: personal
```

Als er geen standaard is geconfigureerd, wordt de eerste agent in de lijst gebruikt als standaard.
