# Dépannage : daemon

## Le daemon ne démarre pas

### « Triggerfish is already running »

Ce message apparaît quand le fichier de log est verrouillé par un autre processus. Sous Windows, cela est détecté via une erreur `EBUSY` / « os error 32 » quand le writer de fichier essaie d'ouvrir le fichier de log.

**Correctif :**

```bash
triggerfish status    # Vérifiez s'il y a une instance en cours
triggerfish stop      # Arrêtez l'instance existante
triggerfish start     # Démarrez à nouveau
```

Si `triggerfish status` indique que le daemon ne fonctionne pas mais que vous obtenez toujours cette erreur, un autre processus maintient le fichier de log ouvert. Vérifiez les processus zombies :

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

Tuez tout processus résiduel, puis réessayez.

### Port 18789 ou 18790 déjà utilisé

Le gateway écoute sur le port 18789 (WebSocket) et Tidepool sur le 18790 (A2UI). Si une autre application occupe ces ports, le daemon ne pourra pas démarrer.

**Trouvez ce qui utilise le port :**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### Aucun fournisseur de LLM configuré

Si `triggerfish.yaml` n'a pas de section `models` ou si le fournisseur principal n'a pas de clé API, le gateway journalise :

```
No LLM provider configured. Check triggerfish.yaml.
```

**Correctif :** Lancez l'assistant de configuration ou configurez manuellement :

```bash
triggerfish dive                    # Configuration interactive
# ou
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Fichier de configuration introuvable

Le daemon quitte si `triggerfish.yaml` n'existe pas au chemin attendu. Le message d'erreur diffère selon l'environnement :

- **Installation native :** Suggère de lancer `triggerfish dive`
- **Docker :** Suggère de monter le fichier de configuration avec `-v ./triggerfish.yaml:/data/triggerfish.yaml`

Vérifiez le chemin :

```bash
ls ~/.triggerfish/triggerfish.yaml      # Natif
docker exec triggerfish ls /data/       # Docker
```

### Échec de résolution de secret

Si votre configuration référence un secret (`secret:provider:anthropic:apiKey`) qui n'existe pas dans le trousseau de clés, le daemon quitte avec une erreur nommant le secret manquant.

**Correctif :**

```bash
triggerfish config set-secret provider:anthropic:apiKey <votre-clé>
```

---

## Gestion du service

### systemd : le daemon s'arrête après la déconnexion

Par défaut, les services utilisateur systemd s'arrêtent quand l'utilisateur se déconnecte. Triggerfish active `loginctl enable-linger` pendant l'installation pour empêcher cela. Si linger n'a pas pu être activé :

```bash
# Vérifiez le statut de linger
loginctl show-user $USER | grep Linger

# Activez-le (peut nécessiter sudo)
sudo loginctl enable-linger $USER
```

Sans linger, le daemon ne fonctionne que pendant que vous êtes connecté.

### systemd : le service ne démarre pas

Vérifiez le statut du service et le journal :

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

Causes courantes :
- **Binaire déplacé ou supprimé.** Le fichier d'unité a un chemin codé en dur vers le binaire. Réinstallez le daemon : `triggerfish dive --install-daemon`
- **Problèmes de PATH.** L'unité systemd capture votre PATH au moment de l'installation. Si vous avez installé de nouveaux outils (comme des serveurs MCP) après l'installation du daemon, réinstallez le daemon pour mettre à jour le PATH.
- **DENO_DIR non défini.** L'unité systemd définit `DENO_DIR=~/.cache/deno`. Si ce répertoire n'est pas inscriptible, les plugins FFI SQLite échoueront à se charger.

### launchd : le daemon ne démarre pas à la connexion

Vérifiez le statut du plist :

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

Si le plist n'est pas chargé :

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Causes courantes :
- **Plist supprimé ou corrompu.** Réinstallez : `triggerfish dive --install-daemon`
- **Binaire déplacé.** Le plist a un chemin codé en dur. Réinstallez après avoir déplacé le binaire.
- **PATH au moment de l'installation.** Comme systemd, launchd capture le PATH quand le plist est créé. Réinstallez si vous avez ajouté de nouveaux outils au PATH.

### Windows : le service ne démarre pas

Vérifiez le statut du service :

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

Causes courantes :
- **Service non installé.** Réinstallez : lancez l'installeur en tant qu'administrateur.
- **Chemin du binaire changé.** Le wrapper de service a un chemin codé en dur. Réinstallez.
- **Compilation .NET échouée pendant l'installation.** Le wrapper de service C# nécessite `csc.exe` de .NET Framework 4.x.

### La mise à jour casse le daemon

Après avoir lancé `triggerfish update`, le daemon redémarre automatiquement. S'il ne le fait pas :

1. L'ancien binaire est peut-être encore en cours d'exécution. Arrêtez-le manuellement : `triggerfish stop`
2. Sous Windows, l'ancien binaire est renommé en `.old`. Si le renommage échoue, la mise à jour signalera une erreur. Arrêtez le service d'abord, puis mettez à jour.

---

## Problèmes de fichiers de log

### Le fichier de log est vide

Le daemon écrit dans `~/.triggerfish/logs/triggerfish.log`. Si le fichier existe mais est vide :

- Le daemon vient peut-être de démarrer. Attendez un moment.
- Le niveau de log est réglé sur `quiet`, qui ne journalise que les messages de niveau ERROR. Réglez-le sur `normal` ou `verbose` :

```bash
triggerfish config set logging.level normal
```

### Les logs sont trop bruyants

Réglez le niveau de log sur `quiet` pour ne voir que les erreurs :

```bash
triggerfish config set logging.level quiet
```

Correspondance des niveaux :

| Valeur de configuration | Niveau minimum journalisé |
|-------------------------|---------------------------|
| `quiet`                 | ERROR uniquement           |
| `normal`                | INFO et au-dessus          |
| `verbose`               | DEBUG et au-dessus         |
| `debug`                 | TRACE et au-dessus (tout)  |

### Rotation des logs

Les logs subissent une rotation automatique quand le fichier actuel dépasse 1 Mo. Jusqu'à 10 fichiers de rotation sont conservés :

```
triggerfish.log        # Actuel
triggerfish.1.log      # Sauvegarde la plus récente
triggerfish.2.log      # Deuxième plus récente
...
triggerfish.10.log     # La plus ancienne (supprimée quand une nouvelle rotation se produit)
```

Il n'y a pas de rotation basée sur le temps, uniquement basée sur la taille.
