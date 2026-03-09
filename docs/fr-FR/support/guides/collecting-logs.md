# Collecte des logs

Lors du signalement d'un bug, une archive de logs fournit aux mainteneurs les informations nécessaires pour diagnostiquer le problème sans échanges répétés pour demander des détails.

## Archive rapide

La manière la plus rapide de créer une archive de logs :

```bash
triggerfish logs bundle
```

Cela crée une archive contenant tous les fichiers de logs de `~/.triggerfish/logs/` :

- **Linux/macOS :** `triggerfish-logs.tar.gz`
- **Windows :** `triggerfish-logs.zip`

Si l'archivage échoue pour une raison quelconque, il se rabat sur la copie des fichiers de logs bruts dans un répertoire que vous pouvez compresser manuellement.

## Contenu de l'archive

- `triggerfish.log` (fichier de log actuel)
- `triggerfish.1.log` à `triggerfish.10.log` (sauvegardes par rotation, si elles existent)

L'archive ne contient **pas** :
- Votre fichier de configuration `triggerfish.yaml`
- Les clés secrètes ou identifiants
- La base de données SQLite
- SPINE.md ou TRIGGER.md

## Collecte manuelle des logs

Si la commande d'archivage n'est pas disponible (ancienne version, Docker, etc.) :

```bash
# Trouver les fichiers de logs
ls ~/.triggerfish/logs/

# Créer une archive manuellement
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Augmenter le niveau de détail des logs

Par défaut, les logs sont au niveau INFO. Pour capturer plus de détails pour un rapport de bug :

1. Réglez le niveau de log sur verbose ou debug :
   ```bash
   triggerfish config set logging.level verbose
   # ou pour un maximum de détails :
   triggerfish config set logging.level debug
   ```

2. Reproduisez le problème

3. Collectez l'archive :
   ```bash
   triggerfish logs bundle
   ```

4. Rétablissez le niveau normal :
   ```bash
   triggerfish config set logging.level normal
   ```

### Détail par niveau de log

| Niveau    | Ce qui est capturé |
|-----------|--------------------|
| `quiet`   | Erreurs uniquement |
| `normal`  | Erreurs, avertissements, info (par défaut) |
| `verbose` | Ajoute les messages de debug (appels d'outils, interactions avec les fournisseurs, décisions de classification) |
| `debug`   | Tout, y compris les messages de niveau trace (données de protocole brutes, changements d'état internes) |

**Attention :** le niveau `debug` génère beaucoup de sortie. Utilisez-le uniquement lors de la reproduction active d'un problème, puis revenez au niveau normal.

## Filtrage des logs en temps réel

Pendant la reproduction d'un problème, vous pouvez filtrer le flux de logs en direct :

```bash
# Afficher uniquement les erreurs
triggerfish logs --level ERROR

# Afficher les avertissements et au-dessus
triggerfish logs --level WARN
```

Sur Linux/macOS, cela utilise `tail -f` natif avec filtrage. Sur Windows, cela utilise PowerShell `Get-Content -Wait -Tail`.

## Format des logs

Chaque ligne de log suit ce format :

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Horodatage :** ISO 8601 en UTC
- **Niveau :** ERROR, WARN, INFO, DEBUG ou TRACE
- **Composant :** Le module qui a généré le log (par ex. `gateway`, `anthropic`, `telegram`, `policy`)
- **Message :** Le message de log avec le contexte structuré

## Ce qu'il faut inclure dans un rapport de bug

Avec l'archive de logs, incluez :

1. **Étapes pour reproduire.** Que faisiez-vous quand le problème est survenu ?
2. **Comportement attendu.** Qu'aurait-il dû se passer ?
3. **Comportement réel.** Que s'est-il passé à la place ?
4. **Informations de plateforme.** Système d'exploitation, architecture, version de Triggerfish (`triggerfish version`)
5. **Extrait de configuration.** La section pertinente de votre `triggerfish.yaml` (masquez les secrets)

Voir [Signaler un problème](/fr-FR/support/guides/filing-issues) pour la liste de vérification complète.

## Informations sensibles dans les logs

Triggerfish assainit les données externes dans les logs en encadrant les valeurs avec les délimiteurs `<<` et `>>`. Les clés API et tokens ne devraient jamais apparaître dans la sortie des logs. Cependant, avant de soumettre une archive de logs :

1. Recherchez tout ce que vous ne souhaitez pas partager (adresses email, chemins de fichiers, contenu de messages)
2. Masquez si nécessaire
3. Indiquez dans votre issue que l'archive a été masquée

Les fichiers de logs contiennent le contenu des messages de vos conversations. Si vos conversations contiennent des informations sensibles, masquez ces portions avant de partager.
