# Dépannage : installation

## Problèmes de l'installeur binaire

### Échec de vérification du checksum

L'installeur télécharge un fichier `SHA256SUMS.txt` à côté du binaire et vérifie le hash avant l'installation. Si cela échoue :

- **Le réseau a interrompu le téléchargement.** Supprimez le téléchargement partiel et réessayez.
- **Le miroir ou CDN a servi du contenu périmé.** Attendez quelques minutes et réessayez. L'installeur récupère depuis les Releases GitHub.
- **Asset introuvable dans SHA256SUMS.txt.** Cela signifie que la release a été publiée sans checksum pour votre plateforme. Créez une [issue GitHub](https://github.com/greghavens/triggerfish/issues).

L'installeur utilise `sha256sum` sur Linux et `shasum -a 256` sur macOS. Si aucun des deux n'est disponible, il ne peut pas vérifier le téléchargement.

### Permission refusée pour écrire dans `/usr/local/bin`

L'installeur essaie d'abord `/usr/local/bin`, puis se rabat sur `~/.local/bin`. Si aucun des deux ne fonctionne :

```bash
# Option 1 : Lancez avec sudo pour une installation système
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# Option 2 : Créez ~/.local/bin et ajoutez au PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# Puis relancez l'installeur
```

### Avertissement de quarantaine macOS

macOS bloque les binaires téléchargés depuis Internet. L'installeur lance `xattr -cr` pour supprimer l'attribut de quarantaine, mais si vous avez téléchargé le binaire manuellement, lancez :

```bash
xattr -cr /usr/local/bin/triggerfish
```

Ou faites un clic droit sur le binaire dans le Finder, sélectionnez « Ouvrir » et confirmez l'invite de sécurité.

### PATH non mis à jour après l'installation

L'installeur ajoute le répertoire d'installation à votre profil shell (`.zshrc`, `.bashrc` ou `.bash_profile`). Si la commande `triggerfish` n'est pas trouvée après l'installation :

1. Ouvrez une nouvelle fenêtre de terminal (le shell actuel ne prendra pas en compte les modifications du profil)
2. Ou sourcez votre profil manuellement : `source ~/.zshrc` (ou le fichier de profil que votre shell utilise)

Si l'installeur a sauté la mise à jour du PATH, cela signifie que le répertoire d'installation était déjà dans votre PATH.

---

## Compilation depuis les sources

### Deno introuvable

L'installeur depuis les sources (`deploy/scripts/install-from-source.sh`) installe Deno automatiquement s'il n'est pas présent. Si cela échoue :

```bash
# Installez Deno manuellement
curl -fsSL https://deno.land/install.sh | sh

# Vérifiez
deno --version   # Doit être 2.x
```

### La compilation échoue avec des erreurs de permissions

La commande `deno compile` nécessite `--allow-all` car le binaire compilé nécessite un accès système complet (réseau, système de fichiers, FFI pour SQLite, lancement de sous-processus). Si vous voyez des erreurs de permissions pendant la compilation, assurez-vous que vous exécutez le script d'installation en tant qu'utilisateur ayant un accès en écriture au répertoire cible.

### Branche ou version spécifique

Définissez `TRIGGERFISH_BRANCH` pour cloner une branche spécifique :

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Pour l'installeur binaire, définissez `TRIGGERFISH_VERSION` :

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Problèmes spécifiques à Windows

### La politique d'exécution PowerShell bloque l'installeur

Lancez PowerShell en tant qu'administrateur et autorisez l'exécution de scripts :

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Puis relancez l'installeur.

### La compilation du service Windows échoue

L'installeur Windows compile un wrapper de service C# à la volée en utilisant `csc.exe` de .NET Framework 4.x. Si la compilation échoue :

1. **Vérifiez que .NET Framework est installé.** Lancez `where csc.exe` dans une invite de commande. L'installeur cherche dans le répertoire .NET Framework sous `%WINDIR%\Microsoft.NET\Framework64\`.
2. **Lancez en tant qu'administrateur.** L'installation du service nécessite des privilèges élevés.
3. **Solution de repli.** Si la compilation du service échoue, vous pouvez toujours exécuter Triggerfish manuellement : `triggerfish run` (mode premier plan). Vous devrez garder le terminal ouvert.

### Échec de `Move-Item` pendant la mise à jour

Les anciennes versions de l'installeur Windows utilisaient `Move-Item -Force` qui échoue quand le binaire cible est en cours d'utilisation. Cela a été corrigé dans la version 0.3.4+. Si vous rencontrez ce problème sur une version plus ancienne, arrêtez manuellement le service d'abord :

```powershell
Stop-Service Triggerfish
# Puis relancez l'installeur
```

---

## Problèmes Docker

### Le conteneur quitte immédiatement

Vérifiez les logs du conteneur :

```bash
docker logs triggerfish
```

Causes courantes :

- **Fichier de configuration manquant.** Montez votre `triggerfish.yaml` dans `/data/` :
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Conflit de port.** Si le port 18789 ou 18790 est utilisé, le gateway ne peut pas démarrer.
- **Permission refusée sur le volume.** Le conteneur s'exécute en tant qu'UID 65534 (nonroot). Assurez-vous que le volume est inscriptible par cet utilisateur.

### Impossible d'accéder à Triggerfish depuis l'hôte

Le gateway se lie à `127.0.0.1` à l'intérieur du conteneur par défaut. Pour y accéder depuis l'hôte, le fichier compose Docker mappe les ports `18789` et `18790`. Si vous utilisez `docker run` directement, ajoutez :

```bash
-p 18789:18789 -p 18790:18790
```

### Podman au lieu de Docker

Le script d'installation Docker détecte automatiquement `podman` comme runtime conteneur. Vous pouvez aussi le définir explicitement :

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Le script wrapper `triggerfish` (installé par l'installeur Docker) détecte aussi automatiquement podman.

### Image ou registre personnalisé

Remplacez l'image avec `TRIGGERFISH_IMAGE` :

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## Post-installation

### L'assistant de configuration ne démarre pas

Après l'installation binaire, l'installeur lance `triggerfish dive --install-daemon` pour lancer l'assistant de configuration. S'il ne démarre pas :

1. Lancez-le manuellement : `triggerfish dive`
2. Si vous voyez « Terminal requirement not met », l'assistant nécessite un TTY interactif. Les sessions SSH, les pipelines CI et les entrées redirigées ne fonctionneront pas. Configurez `triggerfish.yaml` manuellement à la place.

### L'auto-installation du canal Signal échoue

Signal nécessite `signal-cli`, qui est une application Java. L'auto-installeur télécharge un binaire `signal-cli` pré-compilé et un runtime JRE 25. Des échecs peuvent survenir si :

- **Pas d'accès en écriture au répertoire d'installation.** Vérifiez les permissions sur `~/.triggerfish/signal-cli/`.
- **Échec du téléchargement du JRE.** L'installeur récupère depuis Adoptium. Les restrictions réseau ou les proxys d'entreprise peuvent bloquer cela.
- **Architecture non supportée.** L'auto-installation du JRE supporte uniquement x64 et aarch64.

Si l'auto-installation échoue, installez `signal-cli` manuellement et assurez-vous qu'il est dans votre PATH. Voir la [documentation du canal Signal](/fr-FR/channels/signal) pour les étapes de configuration manuelle.
