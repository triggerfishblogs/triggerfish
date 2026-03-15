---
title: Responsible Disclosure-beleid
description: Hoe beveiligingskwetsbaarheden in Triggerfish te melden.
---

# Responsible Disclosure-beleid

## Een kwetsbaarheid melden

**Open geen publiek GitHub-issue voor beveiligingskwetsbaarheden.**

Meld via e-mail:

```
security@trigger.fish
```

Voeg het volgende toe:

- Beschrijving en potentiële impact
- Stappen om te reproduceren of proof of concept
- Getroffen versies of componenten
- Voorgestelde remediation, indien van toepassing

## Reactietijdlijn

| Tijdlijn   | Actie                                                       |
| ---------- | ----------------------------------------------------------- |
| 24 uur     | Ontvangstbevestiging                                        |
| 72 uur     | Initiële beoordeling en ernstclassificatie                  |
| 14 dagen   | Fix ontwikkeld en getest (kritieke/hoge ernst)              |
| 90 dagen   | Gecoördineerd openbaarmakingsvenster                        |

Wij verzoeken u niet publiek te onthullen vóór het 90-dagenvenster of vóór een fix is uitgebracht, afhankelijk van wat het eerst komt.

## Bereik

### Binnen bereik

- Triggerfish-kerntoepassing ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Omzeilingen van beveiligingsbeleidshandhaving (classificatie, taint-tracking, no-write-down)
- Plugin-sandbox-ontsnappingen
- Omzeilingen van authenticatie of autorisatie
- Overtredingen van de MCP Gateway-beveiligingsgrens
- Geheimenlekken (inloggegevens die verschijnen in logboeken, context of opslag)
- Prompt-injectieaanvallen die met succes deterministische beleidsbeslissingen beïnvloeden
- Officiële Docker-images (indien beschikbaar) en installatiescripts

### Buiten bereik

- LLM-gedrag dat de deterministische beleidslaag niet omzeilt (het model dat iets fout zegt is geen kwetsbaarheid als de beleidslaag de actie correct heeft geblokkeerd)
- Skills of plugins van derden die niet worden onderhouden door Triggerfish
- Social engineering-aanvallen tegen Triggerfish-medewerkers
- Denial-of-service-aanvallen
- Geautomatiseerde scannerrapporten zonder aangetoonde impact

## Safe Harbor

Beveiligingsonderzoek uitgevoerd in overeenstemming met dit beleid is geautoriseerd. Wij zullen geen juridische stappen ondernemen tegen onderzoekers die kwetsbaarheden te goeder trouw melden. Wij verzoeken u een goede poging te doen om privacyschendingen, gegevensvernietiging en verstoring van de service te vermijden.

## Erkenning

Wij geven credits aan onderzoekers die geldige kwetsbaarheden melden in onze release notes en beveiligingsadviezen, tenzij u anoniem wilt blijven. Wij bieden momenteel geen betaald bug bounty-programma maar kunnen er in de toekomst een introduceren.

## PGP-sleutel

Als u uw rapport wilt versleutelen, is onze PGP-sleutel voor `security@trigger.fish` gepubliceerd op [`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt) en op grote sleutelservers.
