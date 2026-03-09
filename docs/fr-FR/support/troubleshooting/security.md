# Dépannage : sécurité et classification

## Blocages write-down

### « Write-down blocked »

C'est l'erreur de sécurité la plus courante. Cela signifie que des données tentent de circuler d'un niveau de classification élevé vers un niveau inférieur.

**Exemple :** Votre session a accédé à des données CONFIDENTIAL (lu un fichier classifié, interrogé une base de données classifiée). Le taint de session est maintenant CONFIDENTIAL. Vous avez ensuite essayé d'envoyer la réponse vers un canal WebChat PUBLIC. Le policy engine le bloque car les données CONFIDENTIAL ne peuvent pas circuler vers des destinations PUBLIC.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Comment résoudre :**
1. **Démarrez une nouvelle session.** Une session fraîche commence au taint PUBLIC. Utilisez une nouvelle conversation.
2. **Utilisez un canal de classification plus élevée.** Envoyez la réponse via un canal classifié CONFIDENTIAL ou au-dessus.
3. **Comprenez ce qui a causé le taint.** Vérifiez les logs pour les entrées « Taint escalation » pour voir quel appel d'outil a élevé la classification de la session.

### « Session taint cannot flow to channel »

Identique au write-down, mais spécifiquement sur la classification du canal :

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### « Integration write-down blocked »

Les appels d'outils vers des intégrations classifiées appliquent également le write-down :

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Cela peut sembler inversé. Le taint de session est plus élevé que la classification de l'outil. Cela signifie que la session est trop marquée pour utiliser un outil de classification inférieure. Le souci est que l'appel de l'outil pourrait fuiter du contexte classifié vers un système moins sécurisé.

### « Workspace write-down blocked »

Les espaces de travail des agents ont une classification par répertoire. L'écriture vers un répertoire de classification inférieure depuis une session de taint supérieur est bloquée :

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Escalade du taint

### « Taint escalation »

C'est informatif, pas une erreur. Cela signifie que le niveau de classification de la session vient d'augmenter car l'agent a accédé à des données classifiées.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Le taint ne fait que monter, jamais descendre. Une fois qu'une session est marquée CONFIDENTIAL, elle le reste pour le reste de la session.

### « Resource-based taint escalation firing »

Un appel d'outil a accédé à une ressource avec une classification supérieure au taint actuel de la session. Le taint de session est automatiquement élevé pour correspondre.

### « Non-owner taint applied »

Les utilisateurs non propriétaires peuvent voir leurs sessions marquées en fonction de la classification du canal ou de leurs permissions. Cela est distinct du taint basé sur les ressources.

---

## SSRF (Server-Side Request Forgery)

### « SSRF blocked: hostname resolves to private IP »

Toutes les requêtes HTTP sortantes (web_fetch, navigation du navigateur, connexions SSE MCP) passent par la protection SSRF. Si le nom d'hôte cible résout vers une adresse IP privée, la requête est bloquée.

**Plages bloquées :**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (privé)
- `172.16.0.0/12` (privé)
- `192.168.0.0/16` (privé)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (non spécifié)
- `::1` (loopback IPv6)
- `fc00::/7` (ULA IPv6)
- `fe80::/10` (link-local IPv6)

Cette protection est codée en dur et ne peut être ni désactivée ni configurée. Elle empêche l'agent IA d'être trompé pour accéder à des services internes.

**IPv4 mappé en IPv6 :** Les adresses comme `::ffff:127.0.0.1` sont détectées et bloquées.

### « SSRF check blocked outbound request »

Identique au précédent, mais journalisé depuis l'outil web_fetch au lieu du module SSRF.

### Échecs de résolution DNS

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Le nom d'hôte n'a pas pu être résolu. Vérifiez :
- L'URL est correctement orthographiée
- Votre serveur DNS est accessible
- Le domaine existe réellement

---

## Policy engine

### « Hook evaluation failed, defaulting to BLOCK »

Un hook de politique a levé une exception pendant l'évaluation. Quand cela arrive, l'action par défaut est BLOCK (refus). C'est la valeur par défaut sûre.

Vérifiez les logs pour l'exception complète. Cela indique probablement un bug dans une règle de politique personnalisée.

### « Policy rule blocked action »

Une règle de politique a explicitement refusé l'action. L'entrée de log inclut quelle règle s'est déclenchée et pourquoi. Vérifiez la section `policy.rules` de votre configuration pour voir quelles règles sont définies.

### « Tool floor violation »

Un outil a été appelé qui nécessite un niveau de classification minimum, mais la session est en dessous de ce niveau.

**Exemple :** L'outil healthcheck nécessite au minimum la classification INTERNAL (car il révèle des détails internes du système). Si une session PUBLIC essaie de l'utiliser, l'appel est bloqué.

---

## Sécurité des plugins et skills

### « Plugin network access blocked »

Les plugins s'exécutent dans un sandbox avec un accès réseau restreint. Ils ne peuvent accéder qu'aux URLs de leur domaine de point de terminaison déclaré.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Le plugin a essayé d'accéder à une URL pas dans ses points de terminaison déclarés, ou l'URL a résolu vers une IP privée.

### « Skill activation blocked by classification ceiling »

Les skills déclarent un `classification_ceiling` dans le frontmatter de leur SKILL.md. Si le plafond est en dessous du niveau de taint de la session, le skill ne peut pas être activé :

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Cela empêche un skill de classification inférieure d'être exposé à des données de classification supérieure.

### « Skill content integrity check failed »

Après l'installation, Triggerfish hash le contenu du skill. Si le hash change (le skill a été modifié après l'installation), la vérification d'intégrité échoue :

```
Skill content hash mismatch detected
```

Cela pourrait indiquer une altération. Réinstallez le skill depuis une source de confiance.

### « Skill install rejected by scanner »

Le scanner de sécurité a trouvé du contenu suspect dans le skill. Le scanner vérifie les patterns qui pourraient indiquer un comportement malveillant. Les avertissements spécifiques sont inclus dans le message d'erreur.

---

## Sécurité des sessions

### « Session not found »

```
Session not found: <session-id>
```

La session demandée n'existe pas dans le gestionnaire de sessions. Elle a peut-être été nettoyée, ou l'identifiant de session est invalide.

### « Session status access denied: taint exceeds caller »

Vous avez essayé de voir le statut d'une session, mais cette session a un niveau de taint plus élevé que votre session actuelle. Cela empêche les sessions de classification inférieure d'apprendre des opérations de classification supérieure.

### « Session history access denied »

Même concept que ci-dessus, mais pour la consultation de l'historique de conversation.

---

## Équipes d'agents

### « Team message delivery denied: team status is ... »

L'équipe n'est pas en statut `running`. Cela arrive quand :

- L'équipe a été **dissoute** (manuellement ou par le moniteur de cycle de vie)
- L'équipe a été **mise en pause** car la session du leader a échoué
- L'équipe a **expiré** après avoir dépassé sa limite de durée de vie

Vérifiez le statut actuel de l'équipe avec `team_status`. Si l'équipe est en pause à cause de l'échec du leader, vous pouvez la dissoudre avec `team_disband` et en créer une nouvelle.

### « Team member not found » / « Team member ... is not active »

Le membre cible n'existe pas (mauvais nom de rôle) ou a été terminé. Les membres sont terminés quand :

- Ils dépassent le timeout d'inactivité (2x `idle_timeout_seconds`)
- L'équipe est dissoute
- Leur session plante et le moniteur de cycle de vie le détecte

Utilisez `team_status` pour voir tous les membres et leur statut actuel.

### « Team disband denied: only the lead or creating session can disband »

Seules deux sessions peuvent dissoudre une équipe :

1. La session qui a initialement appelé `team_create`
2. La session du membre leader

Si vous obtenez cette erreur depuis l'intérieur de l'équipe, le membre appelant n'est pas le leader. Si vous l'obtenez depuis l'extérieur de l'équipe, vous n'êtes pas la session qui l'a créée.

### Le leader d'équipe échoue immédiatement après la création

La session de l'agent du leader n'a pas pu compléter son premier tour. Causes courantes :

1. **Erreur du fournisseur de LLM :** Le fournisseur a retourné une erreur (limite de débit, échec d'authentification, modèle introuvable). Vérifiez `triggerfish logs` pour les erreurs de fournisseur autour du moment de la création de l'équipe.
2. **Plafond de classification trop bas :** Si le leader a besoin d'outils classifiés au-dessus de son plafond, la session peut échouer à son premier appel d'outil.
3. **Outils manquants :** Le leader peut avoir besoin d'outils spécifiques pour décomposer le travail. Assurez-vous que les profils d'outils sont correctement configurés.

### Les membres de l'équipe sont inactifs et ne produisent aucune sortie

Les membres attendent que le leader leur envoie du travail via `sessions_send`. Si le leader ne décompose pas la tâche :

- Le modèle du leader peut ne pas comprendre la coordination d'équipe. Essayez un modèle plus capable pour le rôle de leader.
- La description de la `task` peut être trop vague pour que le leader la décompose en sous-tâches.
- Vérifiez `team_status` pour voir si le leader est `active` et a une activité récente.

### « Write-down blocked » entre les membres de l'équipe

Les membres de l'équipe suivent les mêmes règles de classification que toutes les sessions. Si un membre a été marqué `CONFIDENTIAL` et essaie d'envoyer des données à un membre à `PUBLIC`, la vérification write-down le bloque. C'est le comportement attendu -- les données classifiées ne peuvent pas circuler vers des sessions de classification inférieure, même au sein d'une équipe.

---

## Délégation et multi-agent

### « Delegation certificate signature invalid »

La délégation d'agent utilise des certificats cryptographiques. Si la vérification de signature échoue, la délégation est rejetée. Cela empêche les chaînes de délégation falsifiées.

### « Delegation certificate expired »

Le certificat de délégation a une durée de vie. S'il a expiré, l'agent délégué ne peut plus agir au nom du délégant.

### « Delegation chain linkage broken »

Dans les délégations multi-saut (A délègue à B, B délègue à C), chaque lien de la chaîne doit être valide. Si un lien est cassé, la chaîne entière est rejetée.

---

## Webhooks

### « Webhook HMAC verification failed »

Les webhooks entrants nécessitent des signatures HMAC pour l'authentification. Si la signature est manquante, malformée ou ne correspond pas :

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Vérifiez que :
- La source du webhook envoie le bon en-tête de signature HMAC
- Le secret partagé dans votre configuration correspond au secret de la source
- Le format de signature correspond (HMAC-SHA256 encodé en hexadécimal)

### « Webhook replay detected »

Triggerfish inclut une protection contre le rejeu. Si un payload de webhook est reçu une seconde fois (même signature), il est rejeté.

### « Webhook rate limit exceeded »

```
Webhook rate limit exceeded: source=<sourceId>
```

Trop de requêtes webhook de la même source en peu de temps. Cela protège contre les inondations de webhooks. Attendez et réessayez.

---

## Intégrité de l'audit

### « previousHash mismatch »

Le journal d'audit utilise le chaînage de hash. Chaque entrée inclut le hash de l'entrée précédente. Si la chaîne est rompue, cela signifie que le journal d'audit a été altéré ou corrompu.

### « HMAC mismatch »

La signature HMAC de l'entrée d'audit ne correspond pas. L'entrée a peut-être été modifiée après sa création.
