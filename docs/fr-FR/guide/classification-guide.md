# Choisir les niveaux de classification

Chaque canal, serveur MCP, intégration et plugin dans Triggerfish doit avoir un
niveau de classification. Cette page vous aide à choisir le bon.

## Les quatre niveaux

| Niveau           | Ce que cela signifie                                            | Les données circulent vers...      |
| ---------------- | --------------------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | Visible par tout le monde                                       | Partout                            |
| **INTERNAL**     | Pour vos yeux uniquement — rien de sensible, mais pas public    | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Contient des données sensibles que vous ne voudriez jamais voir fuiter | CONFIDENTIAL, RESTRICTED    |
| **RESTRICTED**   | Le plus sensible — juridique, médical, financier, PII           | RESTRICTED uniquement              |

Les données ne peuvent circuler que **vers le haut ou latéralement**, jamais
vers le bas. C'est la
[règle de non write-down](/fr-FR/security/no-write-down) et elle ne peut pas
être outrepassée.

## Deux questions à se poser

Pour toute intégration que vous configurez, demandez-vous :

**1. Quelles sont les données les plus sensibles que cette source pourrait
renvoyer ?**

Cela détermine le niveau de classification **minimum**. Si un serveur MCP
pourrait renvoyer des données financières, il doit être au moins CONFIDENTIAL —
même si la plupart de ses outils renvoient des métadonnées inoffensives.

**2. Serais-je à l'aise si les données de session circulaient _vers_ cette
destination ?**

Cela détermine le niveau de classification **maximum** que vous voudriez
attribuer. Une classification plus élevée signifie que le taint de session
s'élève lorsque vous l'utilisez, ce qui restreint les endroits où les données
peuvent circuler ensuite.

## Classification par type de données

| Type de données                              | Niveau recommandé | Pourquoi                                       |
| -------------------------------------------- | ----------------- | ---------------------------------------------- |
| Météo, pages web publiques, fuseaux horaires | **PUBLIC**        | Librement disponible pour tout le monde        |
| Vos notes personnelles, favoris, listes de tâches | **INTERNAL** | Privé mais pas dommageable si exposé           |
| Wikis internes, docs d'équipe, tableaux de projet | **INTERNAL** | Information interne à l'organisation           |
| E-mail, événements de calendrier, contacts   | **CONFIDENTIAL**  | Contient des noms, des plannings, des relations|
| Données CRM, pipeline de vente, dossiers clients | **CONFIDENTIAL** | Données sensibles, données clients          |
| Registres financiers, comptes bancaires, factures | **CONFIDENTIAL** | Informations monétaires                    |
| Dépôts de code source (privés)               | **CONFIDENTIAL**  | Propriété intellectuelle                       |
| Dossiers médicaux ou de santé                 | **RESTRICTED**    | Légalement protégés (HIPAA, etc.)              |
| Numéros d'identification gouvernementaux, SSN, passeports | **RESTRICTED** | Risque d'usurpation d'identité         |
| Documents juridiques, contrats sous NDA       | **RESTRICTED**    | Exposition juridique                           |
| Clés de chiffrement, identifiants, secrets    | **RESTRICTED**    | Risque de compromission du système             |

## Serveurs MCP

Lorsque vous ajoutez un serveur MCP à `triggerfish.yaml`, la classification
détermine deux choses :

1. **Taint de session** — appeler n'importe quel outil sur ce serveur élève la
   session à ce niveau
2. **Prévention du write-down** — une session déjà taintée au-dessus de ce
   niveau ne peut pas envoyer de données _vers_ ce serveur

```yaml
mcp_servers:
  # PUBLIC — données ouvertes, aucune sensibilité
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — votre propre système de fichiers, privé mais pas de secrets
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — accède aux dépôts privés, aux issues clients
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — base de données avec PII, dossiers médicaux, documents juridiques
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning REFUS PAR DÉFAUT Si vous omettez `classification`, le serveur est
enregistré comme **UNTRUSTED** et le Gateway rejette tous les appels d'outils.
Vous devez choisir explicitement un niveau. :::

### Classifications courantes des serveurs MCP

| Serveur MCP                    | Niveau suggéré  | Raisonnement                                        |
| ------------------------------ | --------------- | --------------------------------------------------- |
| Système de fichiers (docs publics) | PUBLIC      | N'expose que des fichiers publiquement disponibles   |
| Système de fichiers (répertoire personnel) | INTERNAL | Fichiers personnels, rien de secret           |
| Système de fichiers (projets de travail) | CONFIDENTIAL | Peut contenir du code ou des données propriétaires |
| GitHub (dépôts publics uniquement) | INTERNAL    | Le code est public mais les usages sont privés       |
| GitHub (dépôts privés)         | CONFIDENTIAL    | Code source propriétaire                             |
| Slack                          | CONFIDENTIAL    | Conversations de travail, potentiellement sensibles  |
| Base de données (analytics/reporting) | CONFIDENTIAL | Données métier agrégées                        |
| Base de données (production avec PII) | RESTRICTED | Contient des informations personnelles identifiables |
| Météo / heure / calculatrice  | PUBLIC          | Aucune donnée sensible                               |
| Recherche web                  | PUBLIC          | Renvoie des informations publiquement disponibles    |
| E-mail                         | CONFIDENTIAL    | Noms, conversations, pièces jointes                  |
| Google Drive                   | CONFIDENTIAL    | Les documents peuvent contenir des données métier sensibles |

## Canaux

La classification des canaux détermine le **plafond** — la sensibilité maximale
des données qui peuvent être livrées à ce canal.

```yaml
channels:
  cli:
    classification: INTERNAL # Votre terminal local — sûr pour les données internes
  telegram:
    classification: INTERNAL # Votre bot privé — même chose que le CLI pour le ou la propriétaire
  webchat:
    classification: PUBLIC # Visiteur·euse·s anonymes — données publiques uniquement
  email:
    classification: CONFIDENTIAL # L'e-mail est privé mais pourrait être transféré
```

::: tip PROPRIÉTAIRE vs. NON-PROPRIÉTAIRE Pour le ou la **propriétaire**, tous
les canaux ont le même niveau de confiance — vous êtes vous, quel que soit
l'application que vous utilisez. La classification des canaux importe surtout
pour les **utilisateur·rice·s non-propriétaires** (visiteur·euse·s sur webchat,
membres d'un canal Slack, etc.) où elle contrôle quelles données peuvent leur
être transmises. :::

### Choisir la classification des canaux

| Question                                                                       | Si oui...               | Si non...               |
| ------------------------------------------------------------------------------ | ----------------------- | ----------------------- |
| Un·e inconnu·e pourrait-il voir les messages sur ce canal ?                    | **PUBLIC**              | Continuer la lecture    |
| Ce canal est-il uniquement pour vous personnellement ?                          | **INTERNAL** ou plus    | Continuer la lecture    |
| Les messages pourraient-ils être transférés, capturés d'écran ou journalisés par un tiers ? | Plafonner à **CONFIDENTIAL** | Pourrait être **RESTRICTED** |
| Le canal est-il chiffré de bout en bout et sous votre contrôle total ?         | Pourrait être **RESTRICTED** | Plafonner à **CONFIDENTIAL** |

## Ce qui se passe quand vous vous trompez

**Trop bas (ex., serveur CONFIDENTIAL marqué PUBLIC) :**

- Les données de ce serveur n'élèveront pas le taint de session
- La session pourrait transmettre des données classifiées vers des canaux publics — **risque de fuite de données**
- C'est la direction dangereuse

**Trop haut (ex., serveur PUBLIC marqué CONFIDENTIAL) :**

- Le taint de session s'élève inutilement lors de l'utilisation de ce serveur
- Vous serez bloqué·e pour envoyer vers des canaux de classification inférieure ensuite
- Ennuyeux mais **sûr** — préférez classer trop haut

::: danger En cas de doute, **classifiez plus haut**. Vous pouvez toujours
abaisser plus tard après avoir examiné quelles données le serveur renvoie
réellement. Sous-classifier est un risque de sécurité ; sur-classifier n'est
qu'un désagrément. :::

## La cascade de taint

Comprendre l'impact pratique vous aide à choisir judicieusement. Voici ce qui se
passe dans une session :

```
1. La session démarre à PUBLIC
2. Vous demandez la météo (serveur PUBLIC)           → le taint reste PUBLIC
3. Vous consultez vos notes (système de fichiers INTERNAL)  → le taint s'élève à INTERNAL
4. Vous interrogez les issues GitHub (CONFIDENTIAL)   → le taint s'élève à CONFIDENTIAL
5. Vous essayez de poster sur webchat (canal PUBLIC)  → BLOQUÉ (violation de write-down)
6. Vous réinitialisez la session                      → le taint revient à PUBLIC
7. Vous postez sur webchat                            → autorisé
```

Si vous utilisez fréquemment un outil CONFIDENTIAL suivi d'un canal PUBLIC,
vous devrez réinitialiser souvent. Demandez-vous si l'outil a vraiment besoin
d'être CONFIDENTIAL, ou si le canal pourrait être reclassifié.

## Chemins du système de fichiers

Vous pouvez également classifier des chemins individuels du système de fichiers,
ce qui est utile lorsque votre agent a accès à des répertoires avec des niveaux
de sensibilité mixtes :

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## Liste de vérification de révision

Avant de mettre en production une nouvelle intégration :

- [ ] Quelles sont les pires données que cette source pourrait renvoyer ? Classifiez à ce niveau.
- [ ] La classification est-elle au moins aussi élevée que ce que suggère le tableau des types de données ?
- [ ] S'il s'agit d'un canal, la classification est-elle appropriée pour tous les destinataires possibles ?
- [ ] Avez-vous testé que la cascade de taint fonctionne pour votre workflow typique ?
- [ ] En cas de doute, avez-vous classifié plus haut plutôt que plus bas ?

## Pages connexes

- [Règle de non write-down](/fr-FR/security/no-write-down) — la règle fixe de flux de données
- [Configuration](/fr-FR/guide/configuration) — référence YAML complète
