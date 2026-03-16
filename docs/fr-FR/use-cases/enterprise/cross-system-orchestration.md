---
title: Orchestration multi-systèmes
description: Comment Triggerfish gère les flux de travail couvrant plus de 12 systèmes avec des décisions contextuelles à chaque étape, sans la fragilité qui tue l'automatisation traditionnelle.
---

# Orchestration multi-systèmes avec prises de décision

Un flux de travail procure-to-pay typique touche une douzaine de systèmes. Une demande d'achat commence dans une plateforme, est routée vers une chaîne d'approbation dans une autre, déclenche une recherche de fournisseur dans une troisième, crée un bon de commande dans une quatrième, lance un processus de réception dans une cinquième, réconcilie des factures dans une sixième, planifie le paiement dans une septième, et enregistre tout dans une huitième. Chaque système a sa propre API, son propre calendrier de mise à jour, son propre modèle d'authentification et ses propres modes de défaillance.

L'automatisation traditionnelle gère cela avec des pipelines rigides. L'étape un appelle l'API A, analyse la réponse, passe un champ à l'étape deux, qui appelle l'API B. Ça fonctionne jusqu'à ce que ça ne fonctionne plus. Un enregistrement de fournisseur a un format légèrement différent de celui attendu. Une approbation revient avec un code de statut pour lequel le pipeline n'a pas été conçu. Un nouveau champ obligatoire apparaît lors d'une mise à jour d'API. Une étape cassée brise toute la chaîne, et personne ne le sait jusqu'à ce qu'un processus en aval échoue des jours plus tard.

Le problème profond n'est pas la fragilité technique. C'est que les vrais processus métier nécessitent un jugement. Ce désaccord de facture doit-il être escaladé ou résolu automatiquement ? Le schéma de livraisons en retard de ce fournisseur justifie-t-il une révision du contrat ? Cette demande d'approbation est-elle suffisamment urgente pour passer outre le routage standard ? Ces décisions vivent actuellement dans la tête des gens, ce qui signifie que l'automatisation ne peut gérer que le chemin heureux.

## Comment Triggerfish résout ce problème

Le moteur de flux de travail de Triggerfish exécute des définitions de flux de travail en YAML qui mélangent l'automatisation déterministe avec le raisonnement IA dans un seul pipeline. Chaque étape du flux de travail passe par la même couche d'application de sécurité qui gouverne toutes les opérations Triggerfish, de sorte que le suivi de classification et les pistes d'audit tiennent sur toute la chaîne, quel que soit le nombre de systèmes impliqués.

### Étapes déterministes pour le travail déterministe

Quand une étape du flux de travail a une entrée connue et une sortie connue, elle s'exécute comme un appel HTTP standard, une commande shell ou une invocation d'outil MCP. Pas d'implication LLM, pas de pénalité de latence, pas de coût d'inférence. Le moteur de flux de travail prend en charge `call: http` pour les API REST, `call: triggerfish:mcp` pour tout serveur MCP connecté, et `run: shell` pour les outils en ligne de commande. Ces étapes s'exécutent exactement comme l'automatisation traditionnelle, car pour le travail prévisible, l'automatisation traditionnelle est la bonne approche.

### Sous-agents LLM pour les prises de décision

Quand une étape du flux de travail nécessite un raisonnement contextuel, le moteur instancie une vraie session de sous-agent LLM avec `call: triggerfish:llm`. Ce n'est pas une seule paire prompt/réponse. Le sous-agent a accès à tous les outils enregistrés dans Triggerfish, y compris la recherche web, la mémoire, l'automatisation du navigateur et toutes les intégrations connectées. Il peut lire des documents, interroger des bases de données, comparer des enregistrements et prendre une décision basée sur tout ce qu'il trouve.

La sortie du sous-agent alimente directement l'étape suivante du flux de travail. S'il a accédé à des données classifiées pendant son raisonnement, le taint de session augmente automatiquement et se propage vers le flux de travail parent. Le moteur de flux de travail suit cela, de sorte qu'un flux de travail qui a commencé à PUBLIC mais a touché des données CONFIDENTIAL pendant une prise de décision voit l'intégralité de son historique d'exécution stocké au niveau CONFIDENTIAL. Une session de classification inférieure ne peut même pas voir que le flux de travail s'est exécuté.

### Branchement conditionnel basé sur le contexte réel

Le DSL de flux de travail prend en charge les blocs `switch` pour le routage conditionnel, les boucles `for` pour le traitement par lot, et les opérations `set` pour mettre à jour l'état du flux de travail. Combiné avec des étapes de sous-agent LLM pouvant évaluer des conditions complexes, cela signifie que le flux de travail peut se brancher en fonction du contexte métier réel plutôt que simplement des valeurs de champs.

Un flux de travail de procurement peut router différemment selon l'évaluation du risque fournisseur par le sous-agent. Un flux de travail d'onboarding peut ignorer les étapes non pertinentes pour un rôle particulier. Un flux de travail de réponse aux incidents peut escalader vers différentes équipes selon l'analyse des causes racines par le sous-agent. La logique de branchement vit dans la définition du flux de travail, mais les entrées de décision viennent du raisonnement IA.

### Auto-réparation lors des changements de systèmes

Quand une étape déterministe échoue parce qu'une API a changé son format de réponse ou qu'un système a renvoyé une erreur inattendue, le flux de travail ne s'arrête pas simplement. Le moteur peut déléguer l'étape échouée à un sous-agent LLM qui lit l'erreur, inspecte la réponse et tente une approche alternative. Une API qui a ajouté un nouveau champ obligatoire est gérée par le sous-agent qui lit le message d'erreur et ajuste la requête. Un système qui a changé son flux d'authentification est navigué par les outils d'automatisation du navigateur.

Cela ne signifie pas que chaque échec est magiquement résolu. Mais cela signifie que le flux de travail dégrade gracieusement plutôt que d'échouer silencieusement. Le sous-agent trouve soit un chemin en avant, soit produit une explication claire de ce qui a changé et pourquoi une intervention manuelle est nécessaire, au lieu d'un code d'erreur cryptique enterré dans un fichier journal que personne ne vérifie.

### Sécurité sur toute la chaîne

Chaque étape d'un flux de travail Triggerfish passe par les mêmes hooks d'application de politique que tout appel d'outil direct. PRE_TOOL_CALL valide les permissions et vérifie les limites de débit avant l'exécution. POST_TOOL_RESPONSE classifie les données retournées et met à jour le taint de session. PRE_OUTPUT s'assure que rien ne quitte le système à un niveau de classification supérieur à ce que la destination autorise.

Cela signifie qu'un flux de travail qui lit depuis votre CRM (CONFIDENTIAL), traite les données via un LLM, et envoie un résumé sur Slack ne fuit pas accidentellement des détails confidentiels dans un canal public. La règle de prévention de write-down l'attrape au hook PRE_OUTPUT, quel que soit le nombre d'étapes intermédiaires par lesquelles les données ont transité. La classification voyage avec les données tout au long du flux de travail.

La définition du flux de travail elle-même peut définir un `classification_ceiling` qui empêche le flux de travail de jamais toucher des données au-dessus d'un niveau spécifié. Un flux de travail de résumé hebdomadaire classifié à INTERNAL ne peut pas accéder aux données CONFIDENTIAL même s'il a les credentials pour le faire. Le plafond est appliqué dans le code, pas en espérant que le LLM respecte une instruction dans le prompt.

### Déclencheurs cron et webhook

Les flux de travail ne nécessitent pas que quelqu'un les lance manuellement. Le planificateur prend en charge les déclencheurs basés sur cron pour les flux de travail récurrents et les déclencheurs webhook pour l'exécution pilotée par événements. Un flux de travail de brief matinal s'exécute à 7h. Un flux de travail de revue de PR se déclenche quand GitHub envoie un webhook. Un flux de travail de traitement des factures se déclenche quand un nouveau fichier apparaît dans un lecteur partagé.

Les événements webhook portent leur propre niveau de classification. Un webhook GitHub pour un dépôt privé est classifié automatiquement à CONFIDENTIAL selon les mappings de classification de domaine dans la configuration de sécurité. Le flux de travail hérite de cette classification et toute l'application en aval s'applique.

## À quoi ça ressemble en pratique

Une entreprise de taille intermédiaire gérant le procure-to-pay sur NetSuite, Coupa, DocuSign et Slack définit un flux de travail Triggerfish qui gère le cycle complet. Les étapes déterministes gèrent les appels API pour créer des bons de commande, router les approbations et réconcilier les factures. Les étapes de sous-agent LLM gèrent les exceptions : factures avec des postes qui ne correspondent pas au bon de commande, fournisseurs qui ont soumis de la documentation dans un format inattendu, demandes d'approbation qui ont besoin de contexte sur l'historique du demandeur.

Le flux de travail s'exécute sur une instance Triggerfish auto-hébergée. Aucune donnée ne quitte l'infrastructure de l'entreprise. Le système de classification garantit que les données financières de NetSuite restent à CONFIDENTIAL et ne peuvent pas être envoyées à un canal Slack classifié à INTERNAL. La piste d'audit capture chaque décision prise par le sous-agent LLM, chaque outil qu'il a appelé, et chaque donnée à laquelle il a accédé, stockée avec un suivi de lignage complet pour la révision de conformité.

Quand Coupa met à jour son API et change un nom de champ, l'étape HTTP déterministe du flux de travail échoue. Le moteur délègue à un sous-agent qui lit l'erreur, identifie le champ modifié, et réessaie avec le bon paramètre. Le flux de travail se termine sans intervention humaine, et l'incident est journalisé pour qu'un ingénieur puisse mettre à jour la définition du flux de travail pour gérer le nouveau format à l'avenir.
