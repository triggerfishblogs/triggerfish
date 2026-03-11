# Stockage

Toutes les données avec état dans Triggerfish transitent par une abstraction
unifiée `StorageProvider`. Aucun module ne crée son propre mécanisme de
stockage -- chaque composant nécessitant de la persistance prend un
`StorageProvider` en dépendance. Cette conception rend les backends
interchangeables sans toucher à la logique métier et maintient tous les tests
rapides et déterministes.

## Interface StorageProvider

```typescript
interface StorageProvider {
  /** Récupérer une valeur par clé. Retourne null si non trouvée. */
  get(key: string): Promise<StorageValue | null>;

  /** Stocker une valeur à une clé. Écrase toute valeur existante. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Supprimer une clé. Sans effet si la clé n'existe pas. */
  delete(key: string): Promise<void>;

  /** Lister toutes les clés correspondant à un préfixe optionnel. */
  list(prefix?: string): Promise<string[]>;

  /** Supprimer toutes les clés. À utiliser avec précaution. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` est une chaîne de caractères. Toutes les données
structurées (sessions, enregistrements de lignage, configuration) sont
sérialisées en JSON avant stockage et désérialisées à la lecture. Cela maintient
l'interface simple et agnostique du backend. :::

## Implémentations

| Backend                 | Cas d'utilisation             | Persistance                                        | Configuration                         |
| ----------------------- | ----------------------------- | -------------------------------------------------- | ------------------------------------- |
| `MemoryStorageProvider` | Tests, sessions éphémères     | Aucune (perdue au redémarrage)                     | Aucune configuration nécessaire       |
| `SqliteStorageProvider` | Par défaut pour le tier personnel | SQLite WAL à `~/.triggerfish/data/triggerfish.db` | Zéro configuration                   |
| Backends entreprise     | Tier entreprise               | Géré par le client                                 | Postgres, S3 ou autres backends       |

### MemoryStorageProvider

Utilisé dans tous les tests pour la rapidité et le déterminisme. Les données
n'existent qu'en mémoire et sont perdues lorsque le processus se termine. Chaque
suite de tests crée un `MemoryStorageProvider` frais, garantissant que les tests
sont isolés et reproductibles.

### SqliteStorageProvider

Le backend par défaut pour les déploiements du tier personnel. Utilise SQLite en
mode WAL (Write-Ahead Logging) pour un accès en lecture concurrent et une
sécurité en cas de crash. La base de données se trouve à :

```
~/.triggerfish/data/triggerfish.db
```

SQLite ne nécessite aucune configuration, aucun processus serveur et aucun
réseau. Un seul fichier stocke tout l'état de Triggerfish. Le package Deno
`@db/sqlite` fournit la liaison, qui nécessite la permission `--allow-ffi`.

::: tip Le mode WAL de SQLite permet à plusieurs lecteurs d'accéder à la base de
données simultanément avec un seul écrivain. C'est important pour le Gateway,
qui peut lire l'état de session pendant que l'agent écrit les résultats
d'outils. :::

### Backends entreprise

Les déploiements entreprise peuvent intégrer des backends de stockage externes
(Postgres, S3, etc.) sans modification de code. Toute implémentation de
l'interface `StorageProvider` fonctionne. Le backend est configuré dans
`triggerfish.yaml`.

## Clés à espaces de noms

Toutes les clés du système de stockage sont préfixées par un espace de noms qui
identifie le type de données. Cela empêche les collisions et permet d'interroger,
de conserver et de purger les données par catégorie.

| Espace de noms   | Pattern de clé                               | Description                                            |
| ----------------- | -------------------------------------------- | ------------------------------------------------------ |
| `sessions:`       | `sessions:sess_abc123`                       | État de session (historique de conversation, métadonnées) |
| `taint:`          | `taint:sess_abc123`                          | Niveau de taint de session                             |
| `lineage:`        | `lineage:lin_789xyz`                         | Enregistrements de lignage (suivi de provenance)       |
| `audit:`          | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Entrées du journal d'audit                            |
| `cron:`           | `cron:job_daily_report`                      | État des tâches cron et historique d'exécution         |
| `notifications:`  | `notifications:notif_456`                    | File de notifications                                  |
| `exec:`           | `exec:run_789`                               | Historique de l'environnement d'exécution de l'agent   |
| `skills:`         | `skills:skill_weather`                       | Métadonnées des skills installés                       |
| `config:`         | `config:v3`                                  | Instantanés de configuration                           |

## Politiques de rétention

Chaque espace de noms a une politique de rétention par défaut. Les déploiements
entreprise peuvent les personnaliser.

| Espace de noms   | Rétention par défaut            | Justification                                      |
| ----------------- | ------------------------------- | -------------------------------------------------- |
| `sessions:`       | 30 jours                        | L'historique de conversation vieillit               |
| `taint:`          | Identique à la session          | Le taint n'a pas de sens sans sa session            |
| `lineage:`        | 90 jours                        | Orienté conformité, piste d'audit                   |
| `audit:`          | 1 an                            | Orienté conformité, légal et réglementaire          |
| `cron:`           | 30 jours                        | Historique d'exécution pour le débogage             |
| `notifications:`  | Jusqu'à livraison + 7 jours    | Les notifications non livrées doivent persister     |
| `exec:`           | 30 jours                        | Artefacts d'exécution pour le débogage              |
| `skills:`         | Permanent                       | Les métadonnées des skills installés ne doivent pas expirer |
| `config:`         | 10 versions                     | Historique de configuration glissant pour le rollback |

## Principes de conception

### Tous les modules utilisent StorageProvider

Aucun module de Triggerfish ne crée son propre mécanisme de stockage. Gestion
de sessions, suivi du taint, enregistrement du lignage, journalisation d'audit,
état cron, files de notifications, historique d'exécution et configuration --
tout passe par `StorageProvider`.

Cela signifie :

- Changer de backend nécessite de modifier un seul point d'injection de dépendance
- Les tests utilisent `MemoryStorageProvider` pour la rapidité -- pas de setup SQLite, pas de système de fichiers
- Il y a exactement un endroit pour implémenter le chiffrement au repos, la sauvegarde ou la réplication

### Sérialisation

Toutes les données structurées sont sérialisées en chaînes JSON avant stockage. La couche de sérialisation/désérialisation gère :

- Les objets `Date` (sérialisés en chaînes ISO 8601 via `toISOString()`, désérialisés via `new Date()`)
- Les types marqués (sérialisés comme leur valeur sous-jacente de type chaîne)
- Les objets et tableaux imbriqués

```typescript
// Stocker une session
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Récupérer une session
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Restaurer Date
}
```

### Immuabilité

Les opérations de session sont immuables. Lire une session, la modifier et la
réécrire produit toujours un nouvel objet. Les fonctions ne modifient jamais
l'objet stocké en place. Cela s'aligne avec le principe plus large de
Triggerfish selon lequel les fonctions retournent de nouveaux objets et ne
modifient jamais.

## Structure des répertoires

```
~/.triggerfish/
  config/          # Configuration de l'agent, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Environnement d'exécution de l'agent
    <agent-id>/    # Espace de travail par agent (persistant)
    background/    # Espaces de travail des sessions d'arrière-plan
  skills/          # Skills installés
  logs/            # Journaux d'audit
  secrets/         # Stockage chiffré des identifiants
```

::: warning SÉCURITÉ Le répertoire `secrets/` contient des identifiants chiffrés
gérés par l'intégration du trousseau de clés du système. Ne stockez jamais de
secrets dans les fichiers de configuration ou dans le `StorageProvider`. Utilisez
le trousseau de clés du système (tier personnel) ou l'intégration vault (tier
entreprise). :::
