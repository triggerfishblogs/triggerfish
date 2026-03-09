# Notes de plateforme

Comportements, exigences et particularités spécifiques à chaque plateforme.

## macOS

### Gestionnaire de services : launchd

Triggerfish s'enregistre comme agent launchd à :
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Le plist est configuré avec `RunAtLoad: true` et `KeepAlive: true`, donc le daemon démarre à la connexion et redémarre s'il plante.

### Capture du PATH

Le plist launchd capture votre PATH shell au moment de l'installation. C'est critique car launchd ne source pas votre profil shell. Si vous installez des dépendances de serveur MCP (comme `npx`, `python`) après avoir installé le daemon, ces binaires ne seront pas dans le PATH du daemon.

**Correctif :** Réinstallez le daemon pour mettre à jour le PATH capturé :

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Quarantaine

macOS applique un attribut de quarantaine aux binaires téléchargés. L'installeur le supprime avec `xattr -cr`, mais si vous avez téléchargé le binaire manuellement :

```bash
xattr -cr /usr/local/bin/triggerfish
```

### Trousseau de clés

Les secrets sont stockés dans le trousseau de clés de connexion macOS via le CLI `security`. Si l'accès au trousseau de clés est verrouillé, les opérations sur les secrets échoueront jusqu'à ce que vous le déverrouilliez (généralement en vous connectant).

### Deno via Homebrew

Si vous compilez depuis les sources et que Deno a été installé via Homebrew, assurez-vous que le répertoire bin de Homebrew est dans votre PATH avant d'exécuter le script d'installation.

---

## Linux

### Gestionnaire de services : systemd (mode utilisateur)

Le daemon s'exécute comme service utilisateur systemd :
```
~/.config/systemd/user/triggerfish.service
```

### Linger

Par défaut, les services utilisateur systemd s'arrêtent quand l'utilisateur se déconnecte. Triggerfish active linger au moment de l'installation :

```bash
loginctl enable-linger $USER
```

Si cela échoue (par ex. votre administrateur système l'a désactivé), le daemon ne fonctionne que pendant que vous êtes connecté. Sur les serveurs où vous voulez que le daemon persiste, demandez à votre administrateur d'activer linger pour votre compte.

### PATH et environnement

L'unité systemd capture votre PATH et définit `DENO_DIR=~/.cache/deno`. Comme pour macOS, les modifications du PATH après l'installation nécessitent de réinstaller le daemon.

L'unité définit également `Environment=PATH=...` explicitement. Si le daemon ne trouve pas les binaires de serveur MCP, c'est la cause la plus probable.

### Fedora Atomic / Silverblue / Bazzite

Les bureaux Fedora Atomic ont `/home` lié symboliquement à `/var/home`. Triggerfish gère cela automatiquement lors de la résolution du répertoire personnel, en suivant les liens symboliques pour trouver le chemin réel.

Les navigateurs installés via Flatpak sont détectés et lancés via un script wrapper qui appelle `flatpak run`.

### Serveurs sans interface graphique

Sur les serveurs sans environnement de bureau, le daemon GNOME Keyring / Secret Service peut ne pas être en cours d'exécution. Voir [Dépannage des secrets](/fr-FR/support/troubleshooting/secrets) pour les instructions de configuration.

### SQLite FFI

Le backend de stockage SQLite utilise `@db/sqlite`, qui charge une bibliothèque native via FFI. Cela nécessite la permission Deno `--allow-ffi` (incluse dans le binaire compilé). Sur certaines distributions Linux minimales, la bibliothèque C partagée ou les dépendances associées peuvent manquer. Installez les bibliothèques de développement de base si vous voyez des erreurs liées à FFI.

---

## Windows

### Gestionnaire de services : Windows Service

Triggerfish s'installe comme service Windows nommé « Triggerfish ». Le service est implémenté par un wrapper C# compilé pendant l'installation en utilisant `csc.exe` de .NET Framework 4.x.

**Exigences :**
- .NET Framework 4.x (installé sur la plupart des systèmes Windows 10/11)
- Privilèges administrateur pour l'installation du service
- `csc.exe` accessible dans le répertoire .NET Framework

### Remplacement du binaire pendant les mises à jour

Windows ne permet pas d'écraser un exécutable en cours d'exécution. Le système de mise à jour :

1. Renomme le binaire en cours en `triggerfish.exe.old`
2. Copie le nouveau binaire vers le chemin original
3. Redémarre le service
4. Nettoie le fichier `.old` au prochain démarrage

Si le renommage ou la copie échoue, arrêtez le service manuellement avant la mise à jour.

### Support des couleurs ANSI

Triggerfish active le traitement du terminal virtuel pour la sortie console colorée. Cela fonctionne dans PowerShell moderne et Windows Terminal. Les anciennes fenêtres `cmd.exe` peuvent ne pas afficher les couleurs correctement.

### Verrouillage exclusif des fichiers

Windows utilise des verrous de fichiers exclusifs. Si le daemon est en cours d'exécution et que vous essayez de lancer une autre instance, le verrou du fichier de log l'empêche :

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

Cette détection est spécifique à Windows et est basée sur l'erreur EBUSY / « os error 32 » lors de l'ouverture du fichier de log.

### Stockage des secrets

Windows utilise le stockage de fichier chiffré (AES-256-GCM) à `~/.triggerfish/secrets.json`. Il n'y a pas d'intégration avec Windows Credential Manager. Traitez le fichier `secrets.key` comme sensible.

### Notes sur l'installeur PowerShell

L'installeur PowerShell (`install.ps1`) :
- Détecte l'architecture du processeur (x64/arm64)
- Installe dans `%LOCALAPPDATA%\Triggerfish`
- Ajoute le répertoire d'installation au PATH utilisateur via le registre
- Compile le wrapper de service C#
- Enregistre et démarre le service Windows

Si l'installeur échoue à l'étape de compilation du service, vous pouvez toujours exécuter Triggerfish manuellement :

```powershell
triggerfish run    # Mode premier plan
```

---

## Docker

### Runtime conteneur

Le déploiement Docker supporte à la fois Docker et Podman. La détection est automatique, ou définissez explicitement :

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### Détails de l'image

- Base : `gcr.io/distroless/cc-debian12` (minimale, sans shell)
- Variante debug : `distroless:debug` (inclut un shell pour le dépannage)
- S'exécute en tant qu'UID 65534 (nonroot)
- Init : `true` (transfert de signal PID 1 via `tini`)
- Politique de redémarrage : `unless-stopped`

### Persistance des données

Toutes les données persistantes se trouvent dans le répertoire `/data` à l'intérieur du conteneur, supporté par un volume nommé Docker :

```
/data/
  triggerfish.yaml        # Configuration
  secrets.json            # Secrets chiffrés
  secrets.key             # Clé de chiffrement
  SPINE.md                # Identité de l'agent
  TRIGGER.md              # Comportement de trigger
  data/triggerfish.db     # Base de données SQLite
  logs/                   # Fichiers de log
  skills/                 # Skills installés
  workspace/              # Espaces de travail des agents
  .deno/                  # Cache de plugins FFI Deno
```

### Variables d'environnement

| Variable                | Par défaut                     | Usage                              |
|-------------------------|--------------------------------|------------------------------------|
| `TRIGGERFISH_DATA_DIR`  | `/data`                        | Répertoire de données de base      |
| `TRIGGERFISH_CONFIG`    | `/data/triggerfish.yaml`       | Chemin du fichier de configuration |
| `TRIGGERFISH_DOCKER`    | `true`                         | Active le comportement Docker      |
| `DENO_DIR`              | `/data/.deno`                  | Cache Deno (plugins FFI)           |
| `HOME`                  | `/data`                        | Répertoire personnel pour nonroot  |

### Secrets dans Docker

Les conteneurs Docker ne peuvent pas accéder au trousseau de clés du système hôte. Le stockage de fichier chiffré est utilisé automatiquement. La clé de chiffrement (`secrets.key`) et les données chiffrées (`secrets.json`) sont stockées dans le volume `/data`.

**Note de sécurité :** Toute personne ayant accès au volume Docker peut lire la clé de chiffrement. Sécurisez le volume de manière appropriée. En production, envisagez d'utiliser les secrets Docker ou un gestionnaire de secrets pour injecter la clé au moment de l'exécution.

### Ports

Le fichier compose expose :
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

Les ports supplémentaires (WebChat sur 8765, webhook WhatsApp sur 8443) doivent être ajoutés au fichier compose si vous activez ces canaux.

### Exécution de l'assistant de configuration dans Docker

```bash
# Si le conteneur est en cours d'exécution
docker exec -it triggerfish triggerfish dive

# Si le conteneur n'est pas en cours d'exécution (usage unique)
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### Mise à jour

```bash
# En utilisant le script wrapper
triggerfish update

# Manuellement
docker compose pull
docker compose up -d
```

### Débogage

Utilisez la variante debug de l'image pour le dépannage :

```yaml
# Dans docker-compose.yml
image: ghcr.io/greghavens/triggerfish:debug
```

Cela inclut un shell pour que vous puissiez exécuter des commandes dans le conteneur :

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak (navigateur uniquement)

Triggerfish lui-même ne s'exécute pas comme Flatpak, mais il peut utiliser les navigateurs installés via Flatpak pour l'automatisation du navigateur.

### Navigateurs Flatpak détectés

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### Comment cela fonctionne

Triggerfish crée un script wrapper temporaire qui appelle `flatpak run` avec les options du mode headless, puis lance Chrome via ce script. Le wrapper est écrit dans un répertoire temporaire.

### Problèmes courants

- **Flatpak non installé.** Le binaire doit être à `/usr/bin/flatpak` ou `/usr/local/bin/flatpak`.
- **Répertoire temporaire non inscriptible.** Le script wrapper doit être écrit sur le disque avant l'exécution.
- **Conflits de sandbox Flatpak.** Certaines versions Flatpak de Chrome restreignent `--remote-debugging-port`. Si la connexion CDP échoue, essayez une installation de Chrome non-Flatpak.
