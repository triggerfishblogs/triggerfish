# BC : Processus de mise à jour automatique

Comment fonctionne `triggerfish update`, ce qui peut mal tourner et comment récupérer.

## Comment cela fonctionne

La commande de mise à jour télécharge et installe la dernière version depuis GitHub :

1. **Vérification de version.** Récupère le dernier tag de version depuis l'API GitHub. Si vous êtes déjà sur la dernière version, quitte immédiatement :
   ```
   Already up to date (v0.4.2)
   ```
   Les builds de développement (`VERSION=dev`) sautent la vérification de version et procèdent toujours.

2. **Détection de plateforme.** Détermine le nom correct de l'asset binaire en fonction de votre système d'exploitation et architecture (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Téléchargement.** Récupère le binaire et `SHA256SUMS.txt` depuis la release GitHub.

4. **Vérification du checksum.** Calcule le SHA256 du binaire téléchargé et le compare à l'entrée dans `SHA256SUMS.txt`. Si les checksums ne correspondent pas, la mise à jour est annulée.

5. **Arrêt du daemon.** Arrête le daemon en cours avant de remplacer le binaire.

6. **Remplacement du binaire.** Spécifique à chaque plateforme :
   - **Linux/macOS :** Renomme l'ancien binaire, déplace le nouveau à sa place
   - **macOS étape supplémentaire :** Supprime les attributs de quarantaine avec `xattr -cr`
   - **Windows :** Renomme l'ancien binaire en `.old` (Windows ne peut pas écraser un exécutable en cours d'exécution), puis copie le nouveau binaire vers le chemin original

7. **Redémarrage du daemon.** Démarre le daemon avec le nouveau binaire.

8. **Notes de version.** Récupère et affiche les notes de version pour la nouvelle version.

## Escalade sudo

Si le binaire est installé dans un répertoire nécessitant un accès root (par ex. `/usr/local/bin`), le système de mise à jour vous demande votre mot de passe pour escalader avec `sudo`.

## Déplacements inter-systèmes de fichiers

Si le répertoire de téléchargement et le répertoire d'installation sont sur des systèmes de fichiers différents (courant avec `/tmp` sur une partition séparée), le renommage atomique échouera. Le système de mise à jour se rabat sur copie-puis-suppression, qui est sûr mais a brièvement les deux binaires sur le disque.

## Ce qui peut mal tourner

### « Checksum verification exception »

Le binaire téléchargé ne correspond pas au hash attendu. Cela signifie généralement :
- Le téléchargement a été corrompu (problème réseau)
- Les assets de la release sont périmés ou partiellement uploadés

**Correctif :** Attendez quelques minutes et réessayez. Si le problème persiste, téléchargez le binaire manuellement depuis la [page des releases](https://github.com/greghavens/triggerfish/releases).

### « Asset not found in SHA256SUMS.txt »

La release a été publiée sans checksum pour votre plateforme. C'est un problème du pipeline de release.

**Correctif :** Créez une [issue GitHub](https://github.com/greghavens/triggerfish/issues).

### « Binary replacement failed »

Le système de mise à jour n'a pas pu remplacer l'ancien binaire par le nouveau. Causes courantes :
- Permissions de fichier (le binaire appartient à root mais vous exécutez en tant qu'utilisateur normal)
- Fichier verrouillé (Windows : un autre processus a le binaire ouvert)
- Système de fichiers en lecture seule

**Correctif :**
1. Arrêtez le daemon manuellement : `triggerfish stop`
2. Tuez tout processus résiduel
3. Réessayez la mise à jour avec les permissions appropriées

### « Checksum file download failed »

Impossible de télécharger `SHA256SUMS.txt` depuis la release GitHub. Vérifiez votre connexion réseau et réessayez.

### Nettoyage du fichier `.old` sous Windows

Après une mise à jour Windows, l'ancien binaire est renommé en `triggerfish.exe.old`. Ce fichier est nettoyé automatiquement au prochain démarrage. S'il n'est pas nettoyé (par ex. le nouveau binaire plante au démarrage), vous pouvez le supprimer manuellement.

## Comparaison de versions

Le système de mise à jour utilise la comparaison de versionnage sémantique :
- Supprime le préfixe `v` initial (tant `v0.4.2` que `0.4.2` sont acceptés)
- Compare major, minor et patch numériquement
- Les versions pré-release sont gérées (par ex. `v0.4.2-rc.1`)

## Mise à jour manuelle

Si le système de mise à jour automatique ne fonctionne pas :

1. Téléchargez le binaire pour votre plateforme depuis les [Releases GitHub](https://github.com/greghavens/triggerfish/releases)
2. Arrêtez le daemon : `triggerfish stop`
3. Remplacez le binaire :
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS : supprimez la quarantaine
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Démarrez le daemon : `triggerfish start`

## Mise à jour Docker

Les déploiements Docker n'utilisent pas le système de mise à jour binaire. Mettez à jour l'image du conteneur :

```bash
# En utilisant le script wrapper
triggerfish update

# Manuellement
docker compose pull
docker compose up -d
```

Le script wrapper récupère la dernière image et redémarre le conteneur s'il est en cours d'exécution.

## Notes de version

Après une mise à jour, les notes de version sont affichées automatiquement. Vous pouvez également les consulter manuellement :

```bash
triggerfish changelog              # Version actuelle
triggerfish changelog --latest 5   # 5 dernières releases
```

Si la récupération des notes de version échoue après une mise à jour, c'est journalisé mais n'affecte pas la mise à jour elle-même.
