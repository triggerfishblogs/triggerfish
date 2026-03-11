# Intégration CalDAV

Connectez votre agent Triggerfish à tout serveur de calendrier compatible CalDAV.
Cela permet des opérations de calendrier sur les fournisseurs qui prennent en
charge le standard CalDAV, notamment iCloud, Fastmail, Nextcloud, Radicale et
tout serveur CalDAV auto-hébergé.

## Fournisseurs pris en charge

| Fournisseur | URL CalDAV                                      | Notes                            |
| ----------- | ----------------------------------------------- | -------------------------------- |
| iCloud      | `https://caldav.icloud.com`                     | Nécessite un mot de passe d'application |
| Fastmail    | `https://caldav.fastmail.com/dav/calendars`     | CalDAV standard                  |
| Nextcloud   | `https://your-server.com/remote.php/dav`        | Auto-hébergé                     |
| Radicale    | `https://your-server.com`                       | Auto-hébergé léger               |
| Baikal      | `https://your-server.com/dav.php`               | Auto-hébergé                     |

::: info Pour Google Calendar, utilisez plutôt l'intégration [Google Workspace](/fr-FR/integrations/google-workspace), qui utilise l'API native Google avec OAuth2. CalDAV est destiné aux fournisseurs de calendrier non-Google. :::

## Configuration

### Étape 1 : Obtenir vos identifiants CalDAV

Vous avez besoin de trois informations de votre fournisseur de calendrier :

- **URL CalDAV** -- L'URL de base du serveur CalDAV
- **Nom d'utilisateur** -- Votre nom d'utilisateur ou email de compte
- **Mot de passe** -- Votre mot de passe de compte ou un mot de passe spécifique à l'application

::: warning Mots de passe d'application La plupart des fournisseurs exigent un mot de passe spécifique à l'application plutôt que votre mot de passe principal. Consultez la documentation de votre fournisseur pour savoir comment en générer un. :::

### Étape 2 : Configurer Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # mot de passe stocké dans le trousseau de clés du système
    classification: CONFIDENTIAL
```

| Option           | Type   | Requis | Description                                               |
| ---------------- | ------ | ------ | --------------------------------------------------------- |
| `url`            | string | Oui    | URL de base du serveur CalDAV                             |
| `username`       | string | Oui    | Nom d'utilisateur ou email du compte                      |
| `password`       | string | Oui    | Mot de passe du compte (stocké dans le trousseau de clés) |
| `classification` | string | Non    | Niveau de classification (par défaut : `CONFIDENTIAL`)    |

### Étape 3 : Découverte des calendriers

À la première connexion, l'agent exécute la découverte CalDAV pour trouver tous les calendriers disponibles. Les calendriers découverts sont mis en cache localement.

```bash
triggerfish connect caldav
```

## Outils disponibles

| Outil               | Description                                              |
| ------------------- | -------------------------------------------------------- |
| `caldav_list`       | Lister tous les calendriers du compte                    |
| `caldav_events`     | Récupérer les événements pour une plage de dates         |
| `caldav_create`     | Créer un nouvel événement                                |
| `caldav_update`     | Mettre à jour un événement existant                      |
| `caldav_delete`     | Supprimer un événement                                   |
| `caldav_search`     | Rechercher des événements par requête texte              |
| `caldav_freebusy`   | Vérifier la disponibilité pour une plage horaire         |

## Classification

Les données de calendrier sont par défaut `CONFIDENTIAL` car elles contiennent des noms, des horaires, des lieux et des détails de réunion. L'accès à tout outil CalDAV élève le taint de session au niveau de classification configuré.

## Authentification

CalDAV utilise HTTP Basic Auth sur TLS. Les identifiants sont stockés dans le trousseau de clés du système et injectés au niveau HTTP sous le contexte LLM -- l'agent ne voit jamais le mot de passe en clair.

## Pages connexes

- [Google Workspace](/fr-FR/integrations/google-workspace) -- Pour Google Calendar (utilise l'API native)
- [Cron et triggers](/fr-FR/features/cron-and-triggers) -- Planifier des actions d'agent basées sur le calendrier
- [Guide de classification](/fr-FR/guide/classification-guide) -- Choisir le bon niveau de classification
