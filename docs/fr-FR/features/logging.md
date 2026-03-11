# Journalisation structuree

Triggerfish utilise une journalisation structuree avec niveaux de severite, rotation des fichiers et
sortie configurable. Chaque composant -- le Gateway, l'orchestrateur, le client MCP,
les fournisseurs LLM, le moteur de politique -- enregistre ses logs via un journaliseur unifie. Cela signifie que vous
obtenez un flux de logs unique et coherent, quelle que soit l'origine d'un evenement.

## Niveaux de log

Le parametre `logging.level` controle le niveau de detail capture :

| Valeur de config   | Severite           | Ce qui est enregistre                                             |
| ------------------ | ------------------ | ----------------------------------------------------------------- |
| `quiet`            | ERROR uniquement   | Plantages et defaillances critiques                               |
| `normal` (defaut)  | INFO et au-dessus  | Demarrage, connexions, evenements significatifs                   |
| `verbose`          | DEBUG et au-dessus | Appels d'outils, decisions de politique, requetes aux fournisseurs |
| `debug`            | TRACE (tout)       | Charges utiles requete/reponse completes, streaming token par token |

Chaque niveau inclut tout ce qui est au-dessus. Definir `verbose` vous donne DEBUG,
INFO et ERROR. Definir `quiet` reduit au silence tout sauf les erreurs.

## Configuration

Definissez le niveau de log dans `triggerfish.yaml` :

```yaml
logging:
  level: normal
```

C'est la seule configuration requise. Les valeurs par defaut sont sensees pour la plupart des
utilisateurs -- `normal` capture suffisamment pour comprendre ce que fait l'agent sans
inonder les logs de bruit.

## Sortie des logs

Les logs sont ecrits simultanement vers deux destinations :

- **stderr** -- pour la capture par `journalctl` lors de l'execution en tant que service systemd, ou
  la sortie directe dans le terminal pendant le developpement
- **Fichier** -- `~/.triggerfish/logs/triggerfish.log`

Chaque ligne de log suit un format structure :

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Etiquettes de composants

L'etiquette entre crochets identifie quel sous-systeme a emis l'entree de log :

| Etiquette     | Composant                                      |
| ------------- | ---------------------------------------------- |
| `[gateway]`   | Plan de controle WebSocket                     |
| `[orch]`      | Orchestrateur d'agent et dispatch d'outils     |
| `[mcp]`       | Client MCP et proxy du Gateway                 |
| `[provider]`  | Appels aux fournisseurs LLM                    |
| `[policy]`    | Moteur de politique et evaluation des hooks    |
| `[session]`   | Cycle de vie des sessions et changements de taint |
| `[channel]`   | Adaptateurs de canaux (Telegram, Slack, etc.)  |
| `[scheduler]` | Taches cron, triggers, webhooks                |
| `[memory]`    | Operations du magasin de memoire               |
| `[browser]`   | Automatisation du navigateur (CDP)             |

## Rotation des fichiers

Les fichiers de log sont automatiquement tournes pour eviter une utilisation illimitee du disque :

- **Seuil de rotation :** 1 Mo par fichier
- **Fichiers conserves :** 10 fichiers tournes (total ~10 Mo max)
- **Verification de rotation :** a chaque ecriture
- **Nommage :** `triggerfish.1.log`, `triggerfish.2.log`, ...,
  `triggerfish.10.log`

Lorsque `triggerfish.log` atteint 1 Mo, il est renomme en `triggerfish.1.log`, le
precedent `triggerfish.1.log` devient `triggerfish.2.log`, et ainsi de suite. Le fichier le plus ancien
(`triggerfish.10.log`) est supprime.

## Ecritures non bloquantes

Les ecritures de fichiers sont non bloquantes. Le journaliseur ne retarde jamais le traitement des requetes pour attendre
la fin d'une ecriture disque. Si une ecriture echoue -- disque plein, erreur de permissions,
fichier verrouille -- l'erreur est silencieusement ignoree.

C'est intentionnel. La journalisation ne devrait jamais faire planter l'application ni ralentir
l'agent. La sortie stderr sert de repli si les ecritures de fichier echouent.

## Outil de lecture des logs

L'outil `log_read` donne a l'agent un acces direct a l'historique structure des logs. L'agent
peut lire les entrees de log recentes, filtrer par etiquette de composant ou severite, et
diagnostiquer des problemes sans quitter la conversation.

| Parametre   | Type   | Requis | Description                                                            |
| ----------- | ------ | ------ | ---------------------------------------------------------------------- |
| `lines`     | number | non    | Nombre de lignes de log recentes a retourner (defaut : 100)            |
| `level`     | string | non    | Filtre de severite minimale (`error`, `warn`, `info`, `debug`)         |
| `component` | string | non    | Filtrer par etiquette de composant (par ex. `gateway`, `orch`, `provider`) |

::: tip Demandez a votre agent « quelles erreurs se sont produites aujourd'hui » ou « montre-moi les logs
recents du Gateway » -- l'outil `log_read` gere le filtrage et la recuperation. :::

## Consultation des logs

### Commandes CLI

```bash
# Voir les logs recents
triggerfish logs

# Suivre en temps reel
triggerfish logs --tail

# Acces direct au fichier
cat ~/.triggerfish/logs/triggerfish.log
```

### Avec journalctl

Lorsque Triggerfish s'execute en tant que service systemd, les logs sont egalement captures par le
journal :

```bash
journalctl --user -u triggerfish -f
```

## Debug vs journalisation structuree

::: info La variable d'environnement `TRIGGERFISH_DEBUG=1` est toujours prise en charge pour
la retrocompatibilite mais la configuration `logging.level: debug` est preferee. Les deux
produisent une sortie equivalente -- journalisation complete au niveau TRACE de toutes les charges utiles
requete/reponse et de l'etat interne. :::

## Liens connexes

- [Commandes CLI](/fr-FR/guide/commands) -- Reference de la commande `triggerfish logs`
- [Configuration](/fr-FR/guide/configuration) -- Schema complet de `triggerfish.yaml`
