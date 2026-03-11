# Dépannage : automatisation du navigateur

## Chrome / Chromium introuvable

Triggerfish utilise puppeteer-core (pas de Chromium intégré) et détecte automatiquement Chrome ou Chromium sur votre système. Si aucun navigateur n'est trouvé, les outils de navigateur échoueront avec une erreur de lancement.

### Chemins de détection par plateforme

**Linux :**
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/snap/bin/chromium`
- `/usr/bin/brave`
- `/usr/bin/brave-browser`
- Flatpak : `com.google.Chrome`, `org.chromium.Chromium`, `com.brave.Browser`

**macOS :**
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Brave Browser.app/Contents/MacOS/Brave Browser`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`

**Windows :**
- `%PROGRAMFILES%\Google\Chrome\Application\chrome.exe`
- `%PROGRAMFILES(X86)%\Google\Chrome\Application\chrome.exe`
- `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### Installer un navigateur

```bash
# Debian/Ubuntu
sudo apt install chromium-browser

# Fedora
sudo dnf install chromium

# macOS
brew install --cask google-chrome

# Ou installez Brave, qui est également détecté
```

### Remplacement manuel du chemin

Si votre navigateur est installé dans un emplacement non standard, vous pouvez définir le chemin. Contactez le projet pour la clé de configuration exacte (cela est actuellement défini via la configuration du gestionnaire de navigateur).

---

## Échecs de lancement

### « Direct Chrome process launch failed »

Triggerfish lance Chrome en mode headless via `Deno.Command`. Si le processus échoue à démarrer :

1. **Le binaire n'est pas exécutable.** Vérifiez les permissions du fichier.
2. **Bibliothèques partagées manquantes.** Sur les installations Linux minimales (conteneurs, WSL), Chrome peut nécessiter des bibliothèques supplémentaires :
   ```bash
   # Debian/Ubuntu
   sudo apt install libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxcomposite1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
   ```
3. **Pas de serveur d'affichage.** Chrome headless n'a pas besoin de X11/Wayland, mais certaines versions de Chrome tentent quand même de charger des bibliothèques liées à l'affichage.

### Chrome Flatpak

Si Chrome est installé comme package Flatpak, Triggerfish crée un script wrapper qui appelle `flatpak run` avec les arguments appropriés.

```
Flatpak wrapper script file write failed
Flatpak Chrome process launch failed
Flatpak Chrome launch failed
```

Si le script wrapper échoue :
- Vérifiez que `/usr/bin/flatpak` ou `/usr/local/bin/flatpak` existe
- Vérifiez que l'ID de l'application Flatpak est correct (lancez `flatpak list` pour voir les applications installées)
- Le script wrapper est écrit dans un répertoire temporaire. Si le répertoire temporaire n'est pas inscriptible, l'écriture échoue.

### Point de terminaison CDP non prêt

Après avoir lancé Chrome, Triggerfish interroge le point de terminaison du Chrome DevTools Protocol (CDP) pour établir une connexion. Le timeout par défaut est de 30 secondes avec un intervalle de polling de 200 ms.

```
CDP endpoint on port <port> not ready after <timeout>ms
```

Cela signifie que Chrome a démarré mais n'a pas ouvert le port CDP à temps. Causes :
- Chrome charge lentement (système à ressources limitées)
- Une autre instance de Chrome utilise le même port de débogage
- Chrome a planté pendant le démarrage (vérifiez la propre sortie de Chrome)

---

## Problèmes de navigation

### « Navigation blocked by domain policy »

Les outils de navigateur appliquent la même protection SSRF que web_fetch. Les URLs pointant vers des adresses IP privées sont bloquées :

```
Navigation blocked by domain policy: http://192.168.1.1/admin
```

C'est une application intentionnelle de la sécurité. Le navigateur ne peut pas accéder :
- `localhost` / `127.0.0.1`
- Réseaux privés (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`)
- Adresses link-local (`169.254.x.x`)

Il n'y a aucun moyen de désactiver cette vérification.

### « Invalid URL »

L'URL est malformée. La navigation du navigateur nécessite une URL complète avec le protocole :

```
# Incorrect
browser_navigate google.com

# Correct
browser_navigate https://google.com
```

### Timeout de navigation

```
Navigation failed: Timeout
```

La page a mis trop de temps à charger. C'est typiquement un serveur lent ou une page qui ne finit jamais de charger (redirections infinies, JavaScript bloqué).

---

## Problèmes d'interaction avec la page

### « Click failed », « Type failed », « Select failed »

Ces erreurs incluent le sélecteur CSS qui a échoué :

```
Click failed on ".submit-button": Node not found
Type failed on "#email": Node not found
```

Le sélecteur n'a correspondu à aucun élément sur la page. Causes courantes :
- La page n'a pas fini de charger
- L'élément est dans un iframe (les sélecteurs ne traversent pas les frontières d'iframe)
- Le sélecteur est incorrect (noms de classe dynamiques, shadow DOM)

### « Snapshot failed »

La capture de la page (extraction du DOM pour le contexte) a échoué. Cela peut arriver si :
- La page n'a pas de contenu (page blanche)
- Des erreurs JavaScript empêchent l'accès au DOM
- La page a navigué ailleurs pendant la capture

### « Scroll failed »

Se produit généralement sur des pages avec des conteneurs de défilement personnalisés. La commande de défilement cible la fenêtre d'affichage du document principal.

---

## Isolation des profils

Les profils de navigateur sont isolés par agent. Chaque agent obtient son propre répertoire de profil Chrome sous le répertoire de base des profils. Cela signifie :

- Les sessions de connexion ne sont pas partagées entre agents
- Les cookies, le stockage local et le cache sont par agent
- Les contrôles d'accès tenant compte de la classification empêchent la contamination croisée

Si vous observez un comportement de profil inattendu, le répertoire de profil peut être corrompu. Supprimez-le et laissez Triggerfish en créer un nouveau au prochain lancement du navigateur.
