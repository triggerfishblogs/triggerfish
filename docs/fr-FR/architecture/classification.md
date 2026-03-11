# Système de classification

Le système de classification des données est le fondement du modèle de sécurité
de Triggerfish. Chaque donnée qui entre, circule ou quitte le système porte une
étiquette de classification. Ces étiquettes déterminent où les données peuvent
circuler -- et surtout, où elles ne le peuvent pas.

## Niveaux de classification

Triggerfish utilise une hiérarchie unique à quatre niveaux ordonnés pour tous les
déploiements.

| Niveau         | Rang              | Description                                          | Exemples                                                                         |
| -------------- | ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (le plus élevé) | Données les plus sensibles nécessitant une protection maximale | Documents de fusion-acquisition, PII, comptes bancaires, dossiers médicaux |
| `CONFIDENTIAL` | 3                 | Informations sensibles sur le plan commercial ou personnel | Données CRM, finances, dossiers RH, contrats, déclarations fiscales       |
| `INTERNAL`     | 2                 | Non destiné au partage externe                       | Wikis internes, documents d'équipe, notes personnelles, contacts                 |
| `PUBLIC`       | 1 (le plus bas)   | Consultable par tous                                 | Supports marketing, documentation publique, contenu web général                  |

## La règle du no write-down

L'invariant de sécurité le plus important de Triggerfish :

::: danger Les données ne peuvent circuler que vers des canaux ou des destinataires
de classification **égale ou supérieure**. C'est une **règle fixe** -- elle ne peut
être ni configurée, ni outrepassée, ni désactivée. Le LLM ne peut pas influencer
cette décision. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Hiérarchie de classification : PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Les données ne circulent que vers le haut." style="max-width: 100%;" />

Cela signifie :

- Une réponse contenant des données `CONFIDENTIAL` ne peut pas être envoyée vers un canal `PUBLIC`
- Une session marquée `RESTRICTED` ne peut pas produire de sortie vers un canal
  inférieur à `RESTRICTED`
- Il n'existe aucun contournement administratif, aucune échappatoire entreprise, et aucun moyen LLM de contourner cette règle

## Classification effective

Les canaux et les destinataires portent tous deux des niveaux de classification.
Lorsque des données sont sur le point de quitter le système, la **classification
effective** de la destination détermine ce qui peut être envoyé :

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

La classification effective est la _plus basse_ des deux. Cela signifie qu'un
canal à haute classification avec un destinataire à basse classification est
traité comme étant à basse classification.

| Canal          | Destinataire | Effective      | Peut recevoir des données CONFIDENTIAL ? |
| -------------- | ------------ | -------------- | ---------------------------------------- |
| `INTERNAL`     | `INTERNAL`   | `INTERNAL`     | Non (CONFIDENTIAL > INTERNAL)            |
| `INTERNAL`     | `EXTERNAL`   | `PUBLIC`       | Non                                      |
| `CONFIDENTIAL` | `INTERNAL`   | `INTERNAL`     | Non (CONFIDENTIAL > INTERNAL)            |
| `CONFIDENTIAL` | `EXTERNAL`   | `PUBLIC`       | Non                                      |
| `RESTRICTED`   | `INTERNAL`   | `INTERNAL`     | Non (CONFIDENTIAL > INTERNAL)            |

## Règles de classification des canaux

Chaque type de canal possède des règles spécifiques pour déterminer son niveau de
classification.

### Email

- **Correspondance de domaine** : les messages `@entreprise.com` sont classifiés `INTERNAL`
- L'administrateur configure quels domaines sont internes
- Les domaines inconnus ou externes sont par défaut `EXTERNAL`
- Les destinataires externes réduisent la classification effective à `PUBLIC`

### Slack / Teams

- **Appartenance à l'espace de travail** : les membres du même espace de travail/tenant sont `INTERNAL`
- Les utilisateurs externes Slack Connect sont classifiés `EXTERNAL`
- Les utilisateurs invités sont classifiés `EXTERNAL`
- La classification est dérivée de l'API de la plateforme, pas de l'interprétation du LLM

### WhatsApp / Telegram / iMessage

- **Entreprise** : les numéros de téléphone correspondant à la synchronisation de l'annuaire RH déterminent interne vs. externe
- **Personnel** : tous les destinataires sont par défaut `EXTERNAL`
- Vous pouvez marquer des contacts de confiance, mais cela ne change pas le calcul de classification -- cela modifie la classification du destinataire

### WebChat

- Les visiteurs WebChat sont toujours classifiés `PUBLIC` (les visiteurs ne sont jamais vérifiés comme propriétaire)
- WebChat est destiné aux interactions publiques

### CLI

- Le canal CLI s'exécute localement et est classifié en fonction de l'utilisateur authentifié
- L'accès direct au terminal est généralement `INTERNAL` ou supérieur

## Sources de classification des destinataires

### Entreprise

- **Synchronisation d'annuaire** (Okta, Azure AD, Google Workspace) renseigne automatiquement les classifications des destinataires
- Tous les membres de l'annuaire sont classifiés `INTERNAL`
- Les invités et prestataires externes sont classifiés `EXTERNAL`
- Les administrateurs peuvent faire des exceptions par contact ou par domaine

### Personnel

- **Par défaut** : tous les destinataires sont `EXTERNAL`
- Vous pouvez reclassifier les contacts de confiance via des invites intégrées au flux ou l'application compagnon
- La reclassification est explicite et journalisée

## États des canaux

Chaque canal progresse à travers une machine à états avant de pouvoir transporter des données :

<img src="/diagrams/state-machine.svg" alt="Machine à états des canaux : UNTRUSTED → CLASSIFIED ou BLOCKED" style="max-width: 100%;" />

| État         | Peut recevoir des données ? | Peut envoyer des données dans le contexte de l'agent ? | Description                                                  |
| ------------ | :-------------------------: | :----------------------------------------------------: | ------------------------------------------------------------ |
| `UNTRUSTED`  |            Non              |                          Non                           | Par défaut pour les canaux nouveaux/inconnus. Complètement isolé. |
| `CLASSIFIED` | Oui (dans le cadre de la politique) |          Oui (avec classification)                | Examiné et assigné un niveau de classification.              |
| `BLOCKED`    |            Non              |                          Non                           | Explicitement interdit par l'administrateur ou l'utilisateur. |

::: warning SÉCURITÉ Les nouveaux canaux arrivent toujours dans l'état `UNTRUSTED`.
Ils ne peuvent recevoir aucune donnée de l'agent et ne peuvent envoyer aucune
donnée dans le contexte de l'agent. Le canal reste complètement isolé jusqu'à ce
qu'un administrateur (entreprise) ou l'utilisateur (personnel) le classifie
explicitement. :::

## Interaction de la classification avec les autres systèmes

La classification n'est pas une fonctionnalité isolée -- elle pilote les
décisions à travers toute la plateforme :

| Système                | Utilisation de la classification                                                 |
| ---------------------- | -------------------------------------------------------------------------------- |
| **Taint de session**   | L'accès à des données classifiées élève la session à ce niveau                   |
| **Hooks de politique** | PRE_OUTPUT compare le taint de session à la classification de la destination     |
| **MCP Gateway**        | Les réponses du serveur MCP portent une classification qui marque la session     |
| **Lignage des données**| Chaque enregistrement de lignage inclut le niveau de classification et la raison |
| **Notifications**      | Le contenu des notifications est soumis aux mêmes règles de classification       |
| **Délégation d'agent** | Le plafond de classification de l'agent appelé doit correspondre au taint de l'appelant |
| **Sandbox de plugin**  | Le SDK de plugin classifie automatiquement toutes les données émises             |
