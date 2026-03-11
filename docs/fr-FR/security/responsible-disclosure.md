---
title: Politique de divulgation responsable
description: Comment signaler les vulnérabilités de sécurité dans Triggerfish.
---

# Politique de divulgation responsable

## Signaler une vulnérabilité

**N'ouvrez pas d'issue publique sur GitHub pour les vulnérabilités de sécurité.**

Signalez par email :

```
security@trigger.fish
```

Veuillez inclure :

- Description et impact potentiel
- Étapes pour reproduire ou preuve de concept
- Versions ou composants affectés
- Remédiation suggérée, le cas échéant

## Délais de réponse

| Délai     | Action                                                |
| --------- | ----------------------------------------------------- |
| 24 heures | Accusé de réception                                   |
| 72 heures | Évaluation initiale et classification de la sévérité  |
| 14 jours  | Correctif développé et testé (sévérité critique/haute)|
| 90 jours  | Fenêtre de divulgation coordonnée                     |

Nous vous demandons de ne pas divulguer publiquement avant la fenêtre de 90 jours ou avant la publication d'un correctif, selon ce qui survient en premier.

## Périmètre

### Dans le périmètre

- Application principale Triggerfish
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Contournements de l'application de politique de sécurité (classification, suivi du taint, no-write-down)
- Évasions du sandbox de plugin
- Contournements d'authentification ou d'autorisation
- Violations de la frontière de sécurité du MCP Gateway
- Fuites de secrets (identifiants apparaissant dans les logs, le contexte ou le stockage)
- Attaques d'injection de prompt qui influencent avec succès les décisions de politique déterministes
- Images Docker officielles (quand disponibles) et scripts d'installation

### Hors périmètre

- Comportement du LLM qui ne contourne pas la couche de politique déterministe (le modèle disant quelque chose de faux n'est pas une vulnérabilité si la couche de politique a correctement bloqué l'action)
- Skills ou plugins tiers non maintenus par Triggerfish
- Attaques d'ingénierie sociale contre les employés de Triggerfish
- Attaques par déni de service
- Rapports de scanners automatisés sans impact démontré

## Safe Harbor

La recherche en sécurité menée conformément à cette politique est autorisée. Nous ne poursuivrons pas en justice les personnes qui signalent des vulnérabilités de bonne foi. Nous vous demandons de faire un effort raisonnable pour éviter les violations de la vie privée, la destruction de données et les interruptions de service.

## Reconnaissance

Nous créditons les personnes qui signalent des vulnérabilités valides dans nos notes de version et avis de sécurité, sauf si vous préférez rester anonyme. Nous n'offrons pas actuellement de programme de bug bounty rémunéré mais pourrions en introduire un à l'avenir.

## Clé PGP

Si vous devez chiffrer votre rapport, notre clé PGP pour `security@trigger.fish` est publiée sur
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
et sur les principaux serveurs de clés.
