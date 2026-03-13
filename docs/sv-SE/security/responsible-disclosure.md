---
title: Policy för ansvarsfull avslöjande
description: Hur du rapporterar säkerhetssårbarheter i Triggerfish.
---

# Policy för ansvarsfull avslöjande

## Rapportera en sårbarhet

**Öppna inte ett offentligt GitHub-ärende för säkerhetssårbarheter.**

Rapportera via e-post:

```
security@trigger.fish
```

Inkludera:

- Beskrivning och potentiell påverkan
- Steg för att reproducera eller bevis på koncept
- Påverkade versioner eller komponenter
- Föreslagen åtgärd, om tillämplig

## Svarstidplan

| Tidslinje | Åtgärd                                                  |
| --------- | ------------------------------------------------------- |
| 24 timmar | Bekräftelse av mottagande                               |
| 72 timmar | Inledande bedömning och allvarlighetsgradklassificering |
| 14 dagar  | Fix utvecklad och testad (kritisk/hög allvarlighet)     |
| 90 dagar  | Koordinerat avslöjandefönster                           |

Vi ber dig att inte avslöja offentligt innan 90-dagarsfönstret eller innan en fix har släppts, beroende på vilket som inträffar först.

## Omfång

### I omfång

- Triggerfish kärnapplikation ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Kringgående av säkerhetspolicyhantering (klassificering, taint-spårning, nedskrivningsregel)
- Plugin-sandlåderymningar
- Kringgående av autentisering eller auktorisering
- Säkerhetsgränsskränkningar i MCP Gateway
- Hemlighetsintrång (uppgifter som visas i loggar, kontext eller lagring)
- Prompt-injektionsattacker som framgångsrikt påverkar deterministiska policybeslut
- Officiella Docker-bilder (när tillgängliga) och installationsskript

### Utanför omfång

- LLM-beteende som inte kringgår det deterministiska policylagret (att modellen säger något fel är inte en sårbarhet om policylagret korrekt blockerade åtgärden)
- Tredjepartsfeats eller plugins som inte underhålls av Triggerfish
- Social manipulation av Triggerfish-anställda
- Denial-of-service-attacker
- Automatiserade skannerrapporter utan demonstrerad påverkan

## Säker hamn

Säkerhetsforskning utförd i enlighet med den här policyn är auktoriserad. Vi kommer inte att vidta rättsliga åtgärder mot forskare som rapporterar sårbarheter i god tro. Vi ber att du gör ett ärligt försök att undvika integritetskränkningar, dataförstörelse och störning av tjänster.

## Erkännande

Vi krediterar forskare som rapporterar giltiga sårbarheter i våra versionsnoteringar och säkerhetsrådgivningar, såvida du inte föredrar att förbli anonym. Vi erbjuder för närvarande inget betalt bug bounty-program men kan introducera ett i framtiden.

## PGP-nyckel

Om du behöver kryptera din rapport finns vår PGP-nyckel för `security@trigger.fish` publicerad på [`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt) och på stora nyckelservrar.
