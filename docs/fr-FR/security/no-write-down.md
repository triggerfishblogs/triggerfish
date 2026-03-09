# La règle du No Write-Down

La règle du no write-down est le fondement du modèle de protection des données de Triggerfish. C'est une règle fixe, non configurable, qui s'applique à chaque session, chaque canal et chaque agent -- sans exception et sans contournement par le LLM.

**La règle :** les données ne peuvent circuler que vers des canaux et destinataires de classification **égale ou supérieure**.

Cette règle unique empêche toute une classe de scénarios de fuite de données, du partage accidentel aux attaques sophistiquées d'injection de prompt conçues pour exfiltrer des informations sensibles.

## Comment circule la classification

Triggerfish utilise quatre niveaux de classification (du plus élevé au plus bas) :

<img src="/diagrams/write-down-rules.svg" alt="Règles de write-down : les données ne circulent que vers des niveaux de classification égaux ou supérieurs" style="max-width: 100%;" />

Les données classifiées à un niveau donné peuvent circuler vers ce niveau ou tout niveau au-dessus. Elles ne peuvent jamais circuler vers le bas. C'est la règle du no write-down.

::: danger La règle du no write-down est **fixe et non configurable**. Elle ne peut être assouplie par les administrateurs, outrepassée par les règles de politique, ni contournée par le LLM. C'est le fondement architectural sur lequel reposent tous les autres contrôles de sécurité. :::

## Classification effective

Lorsque des données sont sur le point de quitter le système, Triggerfish calcule la **classification effective** de la destination :

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Le canal et le destinataire doivent tous deux être au niveau ou au-dessus du niveau de classification des données. Si l'un des deux est en dessous, la sortie est bloquée.

| Canal                | Destinataire                  | Classification effective |
| -------------------- | ----------------------------- | ------------------------ |
| INTERNAL (Slack)     | INTERNAL (collègue)           | INTERNAL                 |
| INTERNAL (Slack)     | EXTERNAL (prestataire)        | PUBLIC                   |
| CONFIDENTIAL (Slack) | INTERNAL (collègue)           | INTERNAL                 |
| CONFIDENTIAL (Email) | EXTERNAL (contact personnel)  | PUBLIC                   |

::: info Un canal CONFIDENTIAL avec un destinataire EXTERNAL a une classification effective PUBLIC. Si la session a accédé à des données au-dessus de PUBLIC, la sortie est bloquée. :::

## Exemple concret

Voici un scénario concret montrant la règle du no write-down en action.

```
Utilisateur : "Vérifie mon pipeline Salesforce"

Agent : [accède à Salesforce via le token délégué de l'utilisateur]
       [données Salesforce classifiées CONFIDENTIAL]
       [taint de session s'élève à CONFIDENTIAL]

       "Vous avez 3 deals qui se closent cette semaine pour un total de 2,1 M$..."

Utilisateur : "Envoie un message à ma femme que je serai en retard ce soir"

Couche de politique : BLOQUÉ
  - Taint de session : CONFIDENTIAL
  - Destinataire (femme) : EXTERNAL
  - Classification effective : PUBLIC
  - CONFIDENTIAL > PUBLIC --> violation de write-down

Agent : "Je ne peux pas envoyer vers des contacts externes dans cette session
        car nous avons accédé à des données confidentielles.

        -> Réinitialiser la session et envoyer le message
        -> Annuler"
```

::: tip Le message de l'agent à la femme (« je serai en retard ce soir ») ne contient pas en lui-même de données Salesforce. Mais la session a été marquée par l'accès Salesforce précédent, et tout le contexte de session -- y compris tout ce que le LLM pourrait avoir retenu de la réponse Salesforce -- pourrait influencer la sortie. La règle du no write-down empêche toute cette classe de fuite de contexte. :::

## Ce que voit l'utilisateur

Quand la règle du no write-down bloque une action, l'utilisateur reçoit un message clair et actionnable. Triggerfish propose deux modes de réponse :

**Par défaut (spécifique) :**

```
Je ne peux pas envoyer de données confidentielles vers un canal public.

-> Réinitialiser la session et envoyer le message
-> Annuler
```

**Éducatif (opt-in via configuration) :**

```
Je ne peux pas envoyer de données confidentielles vers un canal public.

Pourquoi : cette session a accédé à Salesforce (CONFIDENTIAL).
WhatsApp personnel est classifié comme PUBLIC.
Les données ne peuvent circuler que vers un niveau de classification égal ou supérieur.

Options :
  - Réinitialiser la session et envoyer le message
  - Demander à votre administrateur de reclassifier le canal WhatsApp
  - En savoir plus : https://trigger.fish/security/no-write-down
```

Dans les deux cas, l'utilisateur se voit proposer des options claires. Il n'est jamais laissé dans la confusion quant à ce qui s'est passé ou ce qu'il peut faire.

## Réinitialisation de session

Quand un utilisateur choisit « Réinitialiser la session et envoyer le message », Triggerfish effectue une **réinitialisation complète** :

1. Le taint de session est effacé à PUBLIC
2. L'historique de conversation entier est effacé (empêchant la fuite de contexte)
3. L'action demandée est réévaluée par rapport à la session fraîche
4. Si l'action est maintenant autorisée (données PUBLIC vers un canal PUBLIC), elle se poursuit

::: warning SÉCURITÉ La réinitialisation de session efface à la fois le taint **et** l'historique de conversation. Ce n'est pas optionnel. Si seule l'étiquette de taint était effacée tandis que le contexte de conversation restait, le LLM pourrait toujours référencer des informations classifiées des messages précédents, annulant l'objectif de la réinitialisation. :::

## Comment l'application fonctionne

La règle du no write-down est appliquée au hook `PRE_OUTPUT` -- le dernier point d'application avant que toute donnée ne quitte le système. Le hook s'exécute en tant que code synchrone et déterministe :

```typescript
// Logique d'application simplifiée
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Session taint (${sessionTaint}) exceeds effective ` +
        `classification (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classification check passed" };
}
```

Ce code est :

- **Déterministe** -- mêmes entrées produisent toujours la même décision
- **Synchrone** -- le hook se termine avant tout envoi de sortie
- **Infalsifiable** -- le LLM ne peut pas influencer la décision du hook
- **Journalisé** -- chaque exécution est enregistrée avec le contexte complet

## Taint de session et escalade

Le taint de session suit le plus haut niveau de classification des données consultées pendant une session. Il suit deux règles strictes :

1. **Escalade uniquement** -- le taint peut augmenter, jamais diminuer au sein d'une session
2. **Automatique** -- le taint est mis à jour par le hook `POST_TOOL_RESPONSE` chaque fois que des données entrent dans la session

| Action                                    | Taint avant   | Taint après                    |
| ----------------------------------------- | ------------- | ------------------------------ |
| Accès API météo (PUBLIC)                  | PUBLIC        | PUBLIC                         |
| Accès wiki interne (INTERNAL)             | PUBLIC        | INTERNAL                       |
| Accès Salesforce (CONFIDENTIAL)           | INTERNAL      | CONFIDENTIAL                   |
| Accès API météo à nouveau (PUBLIC)        | CONFIDENTIAL  | CONFIDENTIAL (inchangé)        |

Une fois qu'une session atteint CONFIDENTIAL, elle reste CONFIDENTIAL jusqu'à ce que l'utilisateur la réinitialise explicitement. Il n'y a pas de décroissance automatique, pas de timeout, et aucun moyen pour le LLM de baisser le taint.

## Pourquoi cette règle est fixe

La règle du no write-down n'est pas configurable car la rendre configurable saperait tout le modèle de sécurité. Si un administrateur pouvait créer une exception -- « autoriser les données CONFIDENTIAL à circuler vers les canaux PUBLIC pour cette intégration » -- cette exception deviendrait une surface d'attaque.

Tous les autres contrôles de sécurité de Triggerfish reposent sur l'hypothèse que la règle du no write-down est absolue. Le taint de session, le lignage des données, les plafonds de délégation d'agent et la journalisation d'audit en dépendent tous. La rendre configurable nécessiterait de repenser toute l'architecture.

::: info Les administrateurs **peuvent** configurer les niveaux de classification attribués aux canaux, destinataires et intégrations. C'est la bonne manière d'ajuster le flux de données : si un canal doit recevoir des données de classification plus élevée, classifiez le canal à un niveau plus élevé. La règle elle-même reste fixe ; les entrées de la règle sont configurables. :::

## Pages connexes

- [Conception axée sécurité](./) -- vue d'ensemble de l'architecture de sécurité
- [Identité et authentification](./identity) -- comment l'identité du canal est établie
- [Audit et conformité](./audit-logging) -- comment les actions bloquées sont enregistrées
- [Architecture : Taint et sessions](/fr-FR/architecture/taint-and-sessions) -- mécanique du taint de session en détail
