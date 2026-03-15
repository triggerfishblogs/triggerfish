# Multi-agent ruting

Triggerfish støtter ruting av forskjellige kanaler, kontoer eller kontakter til
separate isolerte agenter, hver med sitt eget arbeidsområde, sesjoner,
personlighet og klassifiseringstak.

## Hvorfor flere agenter?

En enkelt agent med én personlighet er ikke alltid nok. Du ønsker kanskje:

- En **personlig assistent** på WhatsApp som håndterer kalender, påminnelser og
  familiemeldinger.
- En **arbeidsassistent** på Slack som administrerer Jira-billetter, GitHub PR-er
  og kodegjennomganger.
- En **støtteagent** på Discord som svarer på spørsmål fra fellesskapet med en
  annen tone og begrenset tilgang.

Multi-agent ruting lar deg kjøre alle disse simultant fra én enkelt Triggerfish-installasjon.

## Slik fungerer det

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-agent routing: inbound channels routed through AgentRouter to isolated agent workspaces" style="max-width: 100%;" />

**AgentRouter** undersøker hver innkommende melding og kartlegger den til en
agent basert på konfigurerbare rutingsregler. Hvis ingen regel samsvarer, går
meldinger til en standardagent.

## Rutingsregler

Meldinger kan rutes etter:

| Kriterium | Beskrivelse                                      | Eksempel                                          |
| --------- | ------------------------------------------------ | ------------------------------------------------- |
| Kanal     | Rut etter meldingsplattform                      | Alle Slack-meldinger går til «Arbeid»             |
| Konto     | Rut etter spesifikk konto innen en kanal         | Jobb-epost vs. personlig epost                    |
| Kontakt   | Rut etter avsender-/peer-identitet               | Meldinger fra sjefen din går til «Arbeid»         |
| Standard  | Reserve når ingen regel samsvarer                | Alt annet går til «Personlig»                     |

## Konfigurasjon

Definer agenter og ruting i `triggerfish.yaml`:

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

Hver agent angir:

- **id** — Unik identifikator for ruting.
- **name** — Menneskelig-lesbart navn.
- **channels** — Hvilke kanalinstanser denne agenten håndterer.
- **tools** — Verktøyprofil og eksplisitte tillat-/nekt-lister.
- **model** — Hvilken LLM-modell som skal brukes (kan variere per agent).
- **classification_ceiling** — Maksimalt klassifiseringsnivå denne agenten kan nå.

## Agentidentitet

Hver agent har sin egen `SPINE.md` som definerer personlighet, oppdrag og
grenser. SPINE.md-filer befinner seg i agentens arbeidsområdekatalog:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Personlig assistent-personlighet
    work/
      SPINE.md          # Arbeidsassistent-personlighet
    support/
      SPINE.md          # Støttebot-personlighet
```

## Isolasjon

Multi-agent ruting håndhever streng isolasjon mellom agenter:

| Aspekt       | Isolasjon                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------- |
| Sesjoner     | Hver agent har uavhengig sesjonsrom. Sesjoner deles aldri.                                        |
| Taint        | Taint spores per-agent, ikke på tvers av agenter. Arbeidstaint påvirker ikke personlige sesjoner. |
| Ferdigheter  | Ferdigheter lastes per-arbeidsområde. En arbeidsferdighet er ikke tilgjengelig for personlig agent.|
| Hemmeligheter| Legitimasjon er isolert per-agent. Støtteagenten kan ikke aksessere arbeids-API-nøkler.           |
| Arbeidsområde| Hver agent har sitt eget filsystem-arbeidsområde for kjøring av kode.                            |

::: warning Inter-agent kommunikasjon er mulig gjennom `sessions_send`, men er
gatert av policy-laget. Én agent kan ikke stille aksessere en annen agents data
eller sesjoner uten eksplisitte policy-regler som tillater det. :::

::: tip Multi-agent ruting er for å separere bekymringer på tvers av kanaler og
personas. For agenter som trenger å samarbeide om en felles oppgave, se
[Agentteam](/nb-NO/features/agent-teams). :::

## Standardagent

Når ingen rutingsregel samsvarer med en innkommende melding, går den til
standardagenten. Du kan sette dette i konfigurasjonen:

```yaml
agents:
  default: personal
```

Hvis ingen standard er konfigurert, brukes den første agenten i listen som standard.
