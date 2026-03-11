# Comment signaler un bon problème

Un problème bien structuré est résolu plus rapidement. Un problème vague sans logs ni étapes de reproduction reste souvent en attente pendant des semaines car personne ne peut agir dessus. Voici ce qu'il faut inclure.

## Avant de signaler

1. **Cherchez dans les issues existantes.** Quelqu'un a peut-être déjà signalé le même problème. Vérifiez les [issues ouvertes](https://github.com/greghavens/triggerfish/issues) et les [issues fermées](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Consultez les guides de dépannage.** La section [Dépannage](/fr-FR/support/troubleshooting/) couvre la plupart des problèmes courants.

3. **Vérifiez les problèmes connus.** La page [Problèmes connus](/fr-FR/support/kb/known-issues) liste les problèmes dont nous avons déjà connaissance.

4. **Essayez la dernière version.** Si vous n'êtes pas sur la dernière version, mettez à jour d'abord :
   ```bash
   triggerfish update
   ```

## Ce qu'il faut inclure

### 1. Environnement

```
Version de Triggerfish : (lancez `triggerfish version`)
OS : (par ex. macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architecture : (x64 ou arm64)
Méthode d'installation : (installeur binaire, depuis les sources, Docker)
```

### 2. Étapes pour reproduire

Écrivez la séquence exacte d'actions qui mène au problème. Soyez précis :

**Mauvais :**
> Le bot a cessé de fonctionner.

**Bon :**
> 1. Démarré Triggerfish avec le canal Telegram configuré
> 2. Envoyé le message « vérifie mon calendrier pour demain » en DM au bot
> 3. Le bot a répondu avec les résultats du calendrier
> 4. Envoyé « maintenant envoie ces résultats par email à alice@example.com »
> 5. Attendu : le bot envoie l'email
> 6. Réel : le bot répond avec « Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL »

### 3. Comportement attendu vs. réel

Dites ce que vous attendiez et ce qui s'est réellement passé. Incluez le message d'erreur exact s'il y en a un. Le copier-coller est préférable à la paraphrase.

### 4. Sortie des logs

Joignez une [archive de logs](/fr-FR/support/guides/collecting-logs) :

```bash
triggerfish logs bundle
```

Si le problème est sensible du point de vue de la sécurité, vous pouvez masquer des portions, mais notez dans l'issue ce que vous avez masqué.

Au minimum, collez les lignes de log pertinentes. Incluez les horodatages pour que nous puissions corréler les événements.

### 5. Configuration (masquée)

Collez la section pertinente de votre `triggerfish.yaml`. **Masquez toujours les secrets.** Remplacez les valeurs réelles par des placeholders :

```yaml
# Bon - secrets masqués
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # stocké dans le trousseau de clés
channels:
  telegram:
    ownerId: "MASQUÉ"
    classification: INTERNAL
```

### 6. Sortie de Patrol

```bash
triggerfish patrol
```

Collez la sortie. Cela nous donne un aperçu rapide de la santé du système.

## Types d'issues

### Rapport de bug

Utilisez ce modèle pour les choses qui sont cassées :

```markdown
## Rapport de bug

**Environnement :**
- Version :
- OS :
- Méthode d'installation :

**Étapes pour reproduire :**
1.
2.
3.

**Comportement attendu :**

**Comportement réel :**

**Message d'erreur (le cas échéant) :**

**Sortie de patrol :**

**Configuration pertinente (masquée) :**

**Archive de logs :** (joindre le fichier)
```

### Demande de fonctionnalité

```markdown
## Demande de fonctionnalité

**Problème :** Que cherchez-vous à faire que vous ne pouvez pas faire aujourd'hui ?

**Solution proposée :** Comment pensez-vous que cela devrait fonctionner ?

**Alternatives envisagées :** Qu'avez-vous essayé d'autre ?
```

### Question / Demande de support

Si vous n'êtes pas sûr qu'il s'agisse d'un bug ou si vous êtes simplement bloqué, utilisez les [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) au lieu des Issues. Les discussions sont mieux adaptées aux questions qui pourraient ne pas avoir une seule bonne réponse.

## Ce qu'il ne faut PAS inclure

- **Clés API ou mots de passe bruts.** Masquez toujours.
- **Données personnelles des conversations.** Masquez les noms, emails, numéros de téléphone.
- **Fichiers de log entiers en ligne.** Joignez l'archive de logs en tant que fichier au lieu de coller des milliers de lignes.

## Après avoir signalé

- **Surveillez les questions de suivi.** Les mainteneurs peuvent avoir besoin de plus d'informations.
- **Testez les correctifs.** Si un correctif est poussé, on peut vous demander de le vérifier.
- **Fermez l'issue** si vous trouvez la solution vous-même. Publiez la solution pour que d'autres puissent en bénéficier.
