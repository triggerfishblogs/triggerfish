---
title: Richtlinie zur verantwortungsvollen Offenlegung
description: Wie Sie Sicherheitsschwachstellen in Triggerfish melden koennen.
---

# Richtlinie zur verantwortungsvollen Offenlegung

## Eine Schwachstelle melden

**Oeffnen Sie kein oeffentliches GitHub-Issue fuer Sicherheitsschwachstellen.**

Melden Sie per E-Mail:

```
security@trigger.fish
```

Bitte fuegen Sie bei:

- Beschreibung und potenzielle Auswirkung
- Schritte zur Reproduktion oder Proof of Concept
- Betroffene Versionen oder Komponenten
- Vorgeschlagene Behebung, falls vorhanden

## Reaktionszeitplan

| Zeitrahmen | Aktion                                               |
| ---------- | ---------------------------------------------------- |
| 24 Stunden | Empfangsbestaetigung                                 |
| 72 Stunden | Erste Bewertung und Schweregradeinstufung             |
| 14 Tage    | Fix entwickelt und getestet (kritischer/hoher Schweregrad) |
| 90 Tage    | Koordiniertes Offenlegungsfenster                    |

Wir bitten Sie, nicht vor dem 90-Tage-Fenster oder vor der Veroeffentlichung eines Fixes oeffentlich zu machen, je nachdem, was zuerst eintritt.

## Geltungsbereich

### Im Geltungsbereich

- Triggerfish-Kernanwendung ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Umgehungen der Sicherheits-Policy-Durchsetzung (Klassifizierung, Taint-Tracking, No-Write-Down)
- Plugin-Sandbox-Ausbrueche
- Authentifizierungs- oder Autorisierungsumgehungen
- MCP-Gateway-Sicherheitsgrenzenverletzungen
- Secrets-Lecks (Anmeldedaten erscheinen in Logs, Kontext oder Speicherung)
- Prompt-Injection-Angriffe, die deterministische Policy-Entscheidungen erfolgreich beeinflussen
- Offizielle Docker-Images (wenn verfuegbar) und Installationsskripte

### Ausserhalb des Geltungsbereichs

- LLM-Verhalten, das die deterministische Policy-Schicht nicht umgeht (wenn das Modell etwas Falsches sagt, ist es keine Schwachstelle, solange die Policy-Schicht die Aktion korrekt blockiert hat)
- Skills oder Plugins von Drittanbietern, die nicht von Triggerfish gepflegt werden
- Social-Engineering-Angriffe gegen Triggerfish-Mitarbeiter
- Denial-of-Service-Angriffe
- Automatisierte Scanner-Berichte ohne nachgewiesene Auswirkung

## Safe Harbor

Sicherheitsforschung, die in Uebereinstimmung mit dieser Richtlinie durchgefuehrt wird, ist autorisiert. Wir werden keine rechtlichen Schritte gegen Forscher einleiten, die Schwachstellen in gutem Glauben melden. Wir bitten Sie, in gutem Glauben Datenschutzverletzungen, Datenvernichtung und Dienstunterbrechungen zu vermeiden.

## Anerkennung

Wir wuerdigen Forscher, die gueltige Schwachstellen melden, in unseren Release-Notes und Sicherheitshinweisen, es sei denn, Sie moechten anonym bleiben. Wir bieten derzeit kein bezahltes Bug-Bounty-Programm an, koennen aber in Zukunft eines einfuehren.

## PGP-Schluessel

Wenn Sie Ihren Bericht verschluesseln muessen, ist unser PGP-Schluessel fuer `security@trigger.fish` veroeffentlicht unter [`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt) und auf den gaengigen Schluesselsservern.
