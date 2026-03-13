---
title: Policy for ansvarlig avsløring
description: Hvordan rapportere sikkerhetssårbarheter i Triggerfish.
---

# Policy for ansvarlig avsløring

## Rapportering av en sårbarhet

**Ikke åpne et offentlig GitHub-problem for sikkerhetssårbarheter.**

Rapporter via e-post:

```
security@trigger.fish
```

Vennligst inkluder:

- Beskrivelse og potensiell påvirkning
- Trinn for å reprodusere eller bevis på konsept
- Berørte versjoner eller komponenter
- Foreslått utbedring, hvis noen

## Svartidslinje

| Tidslinje | Handling                                                  |
| --------- | --------------------------------------------------------- |
| 24 timer  | Bekreftelse på mottak                                     |
| 72 timer  | Innledende vurdering og alvorlighetsskategorisering       |
| 14 dager  | Rettelse utviklet og testet (kritisk/høy alvorlighet)     |
| 90 dager  | Koordinert avsløringsvindus                               |

Vi ber om at du ikke avslører offentlig før 90-dagers vinduet eller før en rettelse er utgitt, avhengig av hva som kommer først.

## Omfang

### Innenfor omfang

- Triggerfish kjerneprogrammet
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Omgåelser av policy-håndhevelse for sikkerhet (klassifisering, taint-sporing, no-write-down)
- Plugin-sandkasseflukter
- Omgåelser av autentisering eller autorisasjon
- Sikkerhetsgrensebrudd i MCP Gateway
- Hemmelighetslekasje (legitimasjon som vises i logger, kontekst eller lagring)
- Prompt-injeksjonsangrep som vellykket påvirker deterministiske policy-beslutninger
- Offisielle Docker-images (når tilgjengelig) og installasjonsskript

### Utenfor omfang

- LLM-atferd som ikke omgår det deterministiske policy-laget (at modellen sier noe galt er ikke en sårbarhet hvis policy-laget korrekt blokkerte handlingen)
- Tredjeparts ferdigheter eller plugins ikke vedlikeholdt av Triggerfish
- Sosiale manipuleringsangrep mot Triggerfish-ansatte
- Denial-of-service-angrep
- Automatiserte skannerrapporter uten demonstrert påvirkning

## Sikker havn

Sikkerhetsforskning utført i samsvar med denne policyen er autorisert. Vi vil ikke forfølge juridiske handlinger mot forskere som rapporterer sårbarheter i god tro. Vi ber om at du gjør en god tro-innsats for å unngå personvernbrudd, dataødeleggelse og tjenesteforstyrrelser.

## Anerkjennelse

Vi krediterer forskere som rapporterer gyldige sårbarheter i våre utgivelsesnotater og sikkerhetsvarsler, med mindre du foretrekker å forbli anonym. Vi tilbyr for øyeblikket ikke et betalt bug bounty-program, men kan introdusere et i fremtiden.

## PGP-nøkkel

Hvis du trenger å kryptere rapporten din, er vår PGP-nøkkel for `security@trigger.fish` publisert på
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
og på store nøkkelservere.
