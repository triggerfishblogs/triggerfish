# BC : Problèmes connus

Problèmes connus actuels et leurs solutions de contournement. Cette page est mise à jour au fur et à mesure que les problèmes sont découverts et résolus.

---

## Email : pas de reconnexion IMAP

**Statut :** Ouvert

L'adaptateur de canal email interroge les nouveaux messages toutes les 30 secondes via IMAP. Si la connexion IMAP est interrompue (interruption réseau, redémarrage du serveur, timeout d'inactivité), la boucle de polling échoue silencieusement et ne tente pas de se reconnecter.

**Symptômes :**
- Le canal email cesse de recevoir de nouveaux messages
- `IMAP unseen email poll failed` apparaît dans les logs
- Pas de récupération automatique

**Solution de contournement :** Redémarrez le daemon :

```bash
triggerfish stop && triggerfish start
```

**Cause racine :** La boucle de polling IMAP ne dispose pas de logique de reconnexion. Le `setInterval` continue de se déclencher mais chaque poll échoue car la connexion est morte.

---

## SDK Slack/Discord : fuites d'opérations asynchrones

**Statut :** Problème amont connu

Les SDK Slack (`@slack/bolt`) et Discord (`discord.js`) provoquent des fuites d'opérations asynchrones à l'import. Cela affecte les tests (nécessite `sanitizeOps: false`) mais n'affecte pas l'utilisation en production.

**Symptômes :**
- Échecs de tests avec « leaking async ops » lors du test des adaptateurs de canaux
- Aucun impact en production

**Solution de contournement :** Les fichiers de test qui importent les adaptateurs Slack ou Discord doivent configurer :

```typescript
Deno.test({
  name: "test name",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => { ... }
});
```

---

## Slack : troncature au lieu du découpage des messages

**Statut :** Par conception

Les messages Slack sont tronqués à 40 000 caractères au lieu d'être divisés en plusieurs messages (comme le font Telegram et Discord). Les réponses très longues de l'agent perdent du contenu à la fin.

**Solution de contournement :** Demandez à l'agent de produire des réponses plus courtes, ou utilisez un autre canal pour les tâches qui génèrent une sortie volumineuse.

---

## WhatsApp : tous les utilisateurs traités comme propriétaire quand ownerPhone est manquant

**Statut :** Par conception (avec avertissement)

Si le champ `ownerPhone` n'est pas configuré pour le canal WhatsApp, tous les expéditeurs de messages sont traités comme le propriétaire, leur accordant un accès complet aux outils.

**Symptômes :**
- `WhatsApp ownerPhone not configured, defaulting to non-owner` (l'avertissement du log est en fait trompeur ; le comportement accorde l'accès propriétaire)
- Tout utilisateur WhatsApp peut accéder à tous les outils

**Solution de contournement :** Configurez toujours `ownerPhone` :

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

---

## systemd : PATH non mis à jour après l'installation d'outils

**Statut :** Par conception

Le fichier d'unité systemd capture votre PATH shell au moment de l'installation du daemon. Si vous installez de nouveaux outils (binaires de serveur MCP, `npx`, etc.) après avoir installé le daemon, le daemon ne les trouvera pas.

**Symptômes :**
- Les serveurs MCP échouent à se lancer
- Les binaires d'outils « introuvables » même s'ils fonctionnent dans votre terminal

**Solution de contournement :** Réinstallez le daemon pour mettre à jour le PATH capturé :

```bash
triggerfish stop
triggerfish dive --install-daemon
```

Cela s'applique également à launchd (macOS).

---

## Navigateur : restrictions CDP de Chrome Flatpak

**Statut :** Limitation de la plateforme

Certaines versions Flatpak de Chrome ou Chromium restreignent le flag `--remote-debugging-port`, ce qui empêche Triggerfish de se connecter via le Chrome DevTools Protocol.

**Symptômes :**
- `CDP endpoint on port X not ready after Yms`
- Le navigateur se lance mais Triggerfish ne peut pas le contrôler

**Solution de contournement :** Installez Chrome ou Chromium comme package natif au lieu de Flatpak :

```bash
# Fedora
sudo dnf install chromium

# Ubuntu/Debian
sudo apt install chromium-browser
```

---

## Docker : permissions de volume avec Podman

**Statut :** Spécifique à la plateforme

Lors de l'utilisation de Podman avec des conteneurs rootless, le mappage d'UID peut empêcher le conteneur (s'exécutant en tant qu'UID 65534) d'écrire dans le volume de données.

**Symptômes :**
- Erreurs `Permission denied` au démarrage
- Impossible de créer le fichier de configuration, la base de données ou les logs

**Solution de contournement :** Utilisez le flag de montage de volume `:Z` pour le réétiquetage SELinux, et assurez-vous que le répertoire du volume est inscriptible :

```bash
podman run -v triggerfish-data:/data:Z ...
```

Ou créez le volume avec la bonne propriété. D'abord, trouvez le chemin de montage du volume, puis changez le propriétaire :

```bash
podman volume create triggerfish-data
podman volume inspect triggerfish-data   # Notez le chemin "Mountpoint"
podman unshare chown 65534:65534 /chemin/ci-dessus
```

---

## Windows : csc.exe de .NET Framework introuvable

**Statut :** Spécifique à la plateforme

L'installeur Windows compile un wrapper de service C# au moment de l'installation. Si `csc.exe` n'est pas trouvé (.NET Framework manquant, ou chemin d'installation non standard), l'installation du service échoue.

**Symptômes :**
- L'installeur se termine mais le service n'est pas enregistré
- `triggerfish status` montre que le service n'existe pas

**Solution de contournement :** Installez .NET Framework 4.x, ou exécutez Triggerfish en mode premier plan :

```powershell
triggerfish run
```

Gardez le terminal ouvert. Le daemon s'exécute jusqu'à ce que vous le fermiez.

---

## CalDAV : conflits d'ETag avec des clients concurrents

**Statut :** Par conception (spécification CalDAV)

Lors de la mise à jour ou de la suppression d'événements de calendrier, CalDAV utilise les ETags pour le contrôle de concurrence optimiste. Si un autre client (application mobile, interface web) a modifié l'événement entre votre lecture et votre écriture, l'opération échoue :

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

**Solution de contournement :** L'agent devrait automatiquement réessayer en récupérant la dernière version de l'événement. S'il ne le fait pas, demandez-lui de « récupérer la dernière version de l'événement et réessayer ».

---

## Fallback mémoire : secrets perdus au redémarrage

**Statut :** Par conception

Lors de l'utilisation de `TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true`, les secrets sont stockés en mémoire uniquement et sont perdus quand le daemon redémarre. Ce mode est uniquement destiné aux tests.

**Symptômes :**
- Les secrets fonctionnent jusqu'au redémarrage du daemon
- Après redémarrage : erreurs `Secret not found`

**Solution de contournement :** Configurez un backend de secrets approprié. Sur Linux sans interface graphique, installez `gnome-keyring` :

```bash
sudo apt install gnome-keyring libsecret-tools
eval $(gnome-keyring-daemon --start --components=secrets)
```

---

## Google OAuth : token de rafraîchissement non émis lors de la réautorisation

**Statut :** Comportement de l'API Google

Google n'émet un token de rafraîchissement que lors de la première autorisation. Si vous avez précédemment autorisé l'application et relancez `triggerfish connect google`, vous obtenez un token d'accès mais pas de token de rafraîchissement.

**Symptômes :**
- L'API Google fonctionne initialement mais échoue après l'expiration du token d'accès (1 heure)
- Erreur `No refresh token`

**Solution de contournement :** Révoquez d'abord l'accès de l'application, puis réautorisez :

1. Allez dans les [Permissions du compte Google](https://myaccount.google.com/permissions)
2. Trouvez Triggerfish et cliquez sur « Supprimer l'accès »
3. Relancez `triggerfish connect google`
4. Google émettra cette fois un nouveau token de rafraîchissement

---

## Signaler de nouveaux problèmes

Si vous rencontrez un problème non listé ici, consultez la page [GitHub Issues](https://github.com/greghavens/triggerfish/issues). S'il n'est pas déjà signalé, créez une nouvelle issue en suivant le [guide de signalement](/fr-FR/support/guides/filing-issues).
