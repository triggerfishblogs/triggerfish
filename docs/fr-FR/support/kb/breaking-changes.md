# BC : Changements majeurs

Liste version par version des changements pouvant nécessiter une action lors de la mise à jour.

## Notion : `client_secret` supprimé

**Commit :** 6d876c3

Le champ `client_secret` a été supprimé de la configuration de l'intégration Notion comme mesure de renforcement de la sécurité. Notion utilise désormais uniquement le token OAuth stocké dans le trousseau de clés du système d'exploitation.

**Action requise :** Si votre `triggerfish.yaml` contient un champ `notion.client_secret`, supprimez-le. Il sera ignoré mais peut prêter à confusion.

**Nouveau flux de configuration :**

```bash
triggerfish connect notion
```

Cela stocke le token d'intégration dans le trousseau de clés. Aucun client secret n'est nécessaire.

---

## Noms d'outils : points vers underscores

**Commit :** 505a443

Tous les noms d'outils ont été changés de la notation pointée (`foo.bar`) vers la notation underscore (`foo_bar`). Certains fournisseurs de LLM ne supportent pas les points dans les noms d'outils, ce qui causait des échecs d'appels d'outils.

**Action requise :** Si vous avez des règles de politique personnalisées ou des définitions de skills qui référencent des noms d'outils avec des points, mettez-les à jour pour utiliser des underscores :

```yaml
# Avant
- tool: notion.search

# Après
- tool: notion_search
```

---

## Installeur Windows : Move-Item vers Copy-Item

**Commit :** 5e0370f

L'installeur PowerShell Windows a été changé de `Move-Item -Force` vers `Copy-Item -Force` pour le remplacement du binaire pendant les mises à jour. `Move-Item` ne remplace pas de manière fiable les fichiers sur Windows.

**Action requise :** Aucune si vous faites une installation neuve. Si vous êtes sur une version plus ancienne et que `triggerfish update` échoue sur Windows, arrêtez le service manuellement avant la mise à jour :

```powershell
Stop-Service Triggerfish
# Puis relancez l'installeur ou triggerfish update
```

---

## Estampillage de version : de l'exécution à la compilation

**Commits :** e8b0c8c, eae3930, 6ce0c25

Les informations de version ont été déplacées de la détection à l'exécution (vérification de `deno.json`) vers l'estampillage au moment de la compilation à partir des tags git. La bannière CLI n'affiche plus une chaîne de version codée en dur.

**Action requise :** Aucune. `triggerfish version` continue de fonctionner. Les builds de développement affichent `dev` comme version.

---

## Signal : JRE 21 vers JRE 25

**Commit :** e5b1047

L'auto-installeur du canal Signal a été mis à jour pour télécharger JRE 25 (d'Adoptium) au lieu de JRE 21. La version de signal-cli a également été fixée à v0.14.0.

**Action requise :** Si vous avez une installation signal-cli existante avec un JRE plus ancien, relancez la configuration Signal :

```bash
triggerfish config add-channel signal
```

Cela télécharge le JRE et signal-cli mis à jour.

---

## Secrets : clair vers chiffré

Le format de stockage des secrets a changé de JSON en clair vers JSON chiffré AES-256-GCM.

**Action requise :** Aucune. La migration est automatique. Voir [Migration des secrets](/fr-FR/support/kb/secrets-migration) pour les détails.

Après la migration, le renouvellement de vos secrets est recommandé car les versions en clair étaient précédemment stockées sur le disque.

---

## Tidepool : du callback au protocole Canvas

L'interface Tidepool (A2UI) a migré d'une interface `TidepoolTools` basée sur les callbacks vers un protocole basé sur le canvas.

**Fichiers affectés :**
- `src/tools/tidepool/tools/tools_legacy.ts` (ancienne interface, conservée pour la compatibilité)
- `src/tools/tidepool/tools/tools_canvas.ts` (nouvelle interface)

**Action requise :** Si vous avez des skills personnalisés qui utilisent l'ancienne interface callback Tidepool, ils continueront de fonctionner via la couche de compatibilité. Les nouveaux skills doivent utiliser le protocole canvas.

---

## Configuration : ancien format chaîne `primary`

Le champ `models.primary` acceptait précédemment une chaîne simple (`"anthropic/claude-sonnet-4-20250514"`). Il nécessite maintenant un objet :

```yaml
# Ancien (toujours accepté pour la rétrocompatibilité)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Actuel (préféré)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Action requise :** Passez au format objet. Le format chaîne est toujours analysé mais pourrait être supprimé dans une future version.

---

## Journalisation console : supprimée

**Commit :** 9ce1ce5

Tous les appels bruts `console.log`, `console.warn` et `console.error` ont été migrés vers le logger structuré (`createLogger()`). Comme Triggerfish s'exécute en tant que daemon, la sortie stdout/stderr n'est pas visible pour les utilisateurs. Toute la journalisation passe désormais par le writer de fichiers.

**Action requise :** Aucune. Si vous vous appuyiez sur la sortie console pour le débogage (par ex. redirection de stdout), utilisez `triggerfish logs` à la place.

---

## Estimation de l'impact

Lors d'une mise à jour couvrant plusieurs versions, vérifiez chaque entrée ci-dessus. La plupart des changements sont rétrocompatibles avec migration automatique. Les seuls changements nécessitant une action manuelle sont :

1. **Suppression du client_secret Notion** (supprimer le champ de la configuration)
2. **Changement de format des noms d'outils** (mettre à jour les règles de politique personnalisées)
3. **Mise à jour du JRE Signal** (relancer la configuration Signal si vous utilisez Signal)

Tout le reste est géré automatiquement.
