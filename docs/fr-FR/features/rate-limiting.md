# Limitation de debit

Triggerfish inclut un limiteur de debit a fenetre glissante qui empeche d'atteindre les limites
API des fournisseurs LLM. Il enveloppe tout fournisseur de maniere transparente -- la boucle de l'agent n'a pas
besoin de connaitre les limites de debit. Lorsque la capacite est epuisee, les appels sont
retardes automatiquement jusqu'a ce que la fenetre glisse suffisamment pour liberer de la capacite.

## Fonctionnement

Le limiteur de debit utilise une fenetre glissante (60 secondes par defaut) pour suivre deux
metriques :

- **Tokens par minute (TPM)** -- total de tokens consommes (prompt + completion)
  dans la fenetre
- **Requetes par minute (RPM)** -- total d'appels API dans la fenetre

Avant chaque appel LLM, le limiteur verifie la capacite disponible par rapport aux deux limites.
Si l'une des deux est epuisee, l'appel attend que les entrees les plus anciennes sortent de
la fenetre et liberent suffisamment de capacite. Apres chaque appel termine, l'utilisation reelle des tokens
est enregistree.

Les appels en streaming et non-streaming consomment le meme budget. Pour les
appels en streaming, l'utilisation des tokens est enregistree a la fin du flux.

<img src="/diagrams/rate-limiter-flow.svg" alt="Flux du limiteur de debit : Boucle de l'agent -> Limiteur de debit -> verification de capacite -> transfert au fournisseur ou attente" style="max-width: 100%;" />

## Limites par tier OpenAI

Le limiteur de debit est livre avec des valeurs par defaut integrees pour les limites publiees par tier
d'OpenAI :

| Tier   | GPT-4o TPM  | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ----------- | ---------- | ------- | ------ |
| Free   | 30 000      | 500        | 30 000  | 500    |
| Tier 1 | 30 000      | 500        | 30 000  | 500    |
| Tier 2 | 450 000     | 5 000      | 100 000 | 1 000  |
| Tier 3 | 800 000     | 5 000      | 100 000 | 1 000  |
| Tier 4 | 2 000 000   | 10 000     | 200 000 | 10 000 |
| Tier 5 | 30 000 000  | 10 000     | 200 000 | 10 000 |

::: warning Ce sont des valeurs par defaut basees sur les limites publiees d'OpenAI. Vos limites reelles
dependent de votre tier de compte OpenAI et de votre historique d'utilisation. Les autres fournisseurs
(Anthropic, Google) gerent leurs propres limites de debit cote serveur -- le limiteur est
le plus utile pour OpenAI ou le throttling cote client empeche les erreurs 429. :::

## Configuration

La limitation de debit est automatique lors de l'utilisation du fournisseur enveloppe. Aucune
configuration utilisateur n'est necessaire pour le comportement par defaut. Le limiteur detecte votre fournisseur
et applique les limites appropriees.

Les utilisateurs avances peuvent personnaliser les limites via la configuration du fournisseur dans
`triggerfish.yaml` :

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens par minute
        rpm: 5000 # Requetes par minute
        window_ms: 60000 # Taille de la fenetre (60s par defaut)
```

::: info La limitation de debit vous protege des erreurs 429 et des factures inattendues. Elle
fonctionne conjointement avec la chaine de basculement -- si les limites de debit sont atteintes et que le limiteur
ne peut pas attendre (delai depasse), le basculement entre en action pour essayer le fournisseur suivant. :::

## Surveillance de l'utilisation

Le limiteur de debit expose un instantane en direct de l'utilisation actuelle :

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

La barre de progression du contexte en CLI et dans le Tide Pool affiche l'utilisation du contexte. Le statut
de la limite de debit est visible dans les logs de debug :

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Lorsque le limiteur retarde un appel, il enregistre le temps d'attente :

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Limitation de debit par canal

En plus de la limitation de debit des fournisseurs LLM, Triggerfish applique des limites de debit
de messages par canal pour eviter d'inonder les plateformes de messagerie. Chaque adaptateur de canal
suit la frequence des messages sortants et retarde les envois lorsque les limites sont approchees.

Cela protege contre :

- Les bannissements API des plateformes pour volume de messages excessif
- Le spam accidentel provenant de boucles d'agent hors de controle
- Les tempetes de messages declenchees par des webhooks

Les limites de debit par canal sont appliquees de maniere transparente par le routeur de canaux. Si
l'agent genere une sortie plus rapidement que le canal ne le permet, les messages sont mis en file d'attente et
livres au debit maximal autorise.

## Liens connexes

- [Fournisseurs LLM et basculement](/fr-FR/features/model-failover) -- Integration de la chaine de basculement
  avec la limitation de debit
- [Configuration](/fr-FR/guide/configuration) -- Schema complet de `triggerfish.yaml`
