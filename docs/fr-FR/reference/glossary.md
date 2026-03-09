# Glossaire

| Terme                            | Définition                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**                   | Un groupe persistant de sessions d'agent collaboratives avec des rôles distincts. Un membre est le lead qui coordonne le travail. Créé via `team_create`, suivi par des vérifications de cycle de vie. |
| **A2UI**                         | Protocole Agent-to-UI pour pousser du contenu visuel de l'agent vers l'espace de travail Tide Pool en temps réel.                                                   |
| **Background Session**           | Une session créée pour des tâches autonomes (cron, triggers) qui démarre avec un taint PUBLIC frais et s'exécute dans un espace de travail isolé.                   |
| **Buoy**                         | Une application compagnon native (iOS, Android) qui fournit des capacités d'appareil telles que caméra, localisation, enregistrement d'écran et notifications push à l'agent. (Bientôt disponible.) |
| **Classification**               | Une étiquette de sensibilité attribuée aux données, canaux et destinataires. Quatre niveaux : RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                           |
| **Cron**                         | Une tâche récurrente planifiée exécutée par l'agent à un moment spécifié utilisant la syntaxe standard d'expression cron.                                           |
| **Dive**                         | L'assistant de configuration initiale (`triggerfish dive`) qui génère `triggerfish.yaml`, SPINE.md et la configuration initiale.                                     |
| **Effective Classification**     | Le niveau de classification utilisé pour les décisions de sortie, calculé comme `min(channel_classification, recipient_classification)`.                            |
| **Exec Environment**             | L'espace de travail de code de l'agent pour écrire, exécuter et déboguer du code dans une boucle écriture-exécution-correction rapide, distinct du sandbox de plugin. |
| **Failover**                     | Basculement automatique vers un fournisseur LLM alternatif lorsque le fournisseur actuel est indisponible en raison de limites de débit, d'erreurs serveur ou de timeouts. |
| **Gateway**                      | Le plan de contrôle local persistant qui gère les sessions, les canaux, les outils, les événements et les processus d'agent via un point de terminaison WebSocket JSON-RPC. |
| **Hook**                         | Un point d'application déterministe dans le flux de données où le policy engine évalue les règles et décide d'autoriser, bloquer ou masquer une action.               |
| **Lineage**                      | Métadonnées de provenance traçant l'origine, les transformations et la localisation actuelle de chaque élément de données traité par Triggerfish.                    |
| **LlmProvider**                  | L'interface pour les complétions LLM, implémentée par chaque fournisseur supporté (Anthropic, OpenAI, Google, Local, OpenRouter).                                   |
| **MCP**                          | Model Context Protocol, un standard pour la communication agent-outil. Le MCP Gateway de Triggerfish ajoute des contrôles de classification à tout serveur MCP.     |
| **No Write-Down**                | La règle fixe et non configurable selon laquelle les données ne peuvent circuler que vers des canaux ou destinataires de niveau de classification égal ou supérieur. |
| **NotificationService**          | L'abstraction unifiée pour la livraison de notifications au propriétaire sur tous les canaux connectés avec priorité, mise en file et déduplication.                 |
| **Patrol**                       | La commande de vérification diagnostique de santé (`triggerfish patrol`) qui vérifie le Gateway, les fournisseurs LLM, les canaux et la configuration de politique. |
| **Reef (The)**                   | Le marketplace communautaire de skills pour découvrir, installer, publier et gérer les skills Triggerfish.                                                           |
| **Ripple**                       | Indicateurs de frappe en temps réel et signaux de statut en ligne relayés sur les canaux qui le supportent.                                                          |
| **Session**                      | L'unité fondamentale de l'état de conversation avec suivi de taint indépendant. Chaque session a un ID unique, un utilisateur, un canal, un niveau de taint et un historique. |
| **Skill**                        | Un dossier contenant un fichier `SKILL.md` et des fichiers de support optionnels qui donnent de nouvelles capacités à l'agent sans écrire de plugins.                |
| **SPINE.md**                     | Le fichier d'identité et de mission de l'agent chargé comme fondation du prompt système. Définit la personnalité, les règles et les limites. Équivalent Triggerfish de CLAUDE.md. |
| **StorageProvider**              | L'abstraction de persistance unifiée (interface clé-valeur) à travers laquelle transitent toutes les données avec état. Les implémentations incluent Memory, SQLite et les backends entreprise. |
| **Taint**                        | Le niveau de classification attaché à une session basé sur les données consultées. Le taint ne peut que s'élever au sein d'une session, jamais diminuer.             |
| **Tide Pool**                    | Un espace de travail visuel piloté par l'agent où Triggerfish affiche du contenu interactif (tableaux de bord, graphiques, formulaires) via le protocole A2UI.       |
| **TRIGGER.md**                   | Le fichier de définition du comportement proactif de l'agent, spécifiant quoi vérifier, surveiller et sur quoi agir lors des réveils de trigger périodiques.         |
| **Webhook**                      | Un point de terminaison HTTP entrant qui accepte des événements de services externes (GitHub, Sentry, etc.) et déclenche des actions de l'agent.                     |
| **Team Lead**                    | Le coordinateur désigné dans un agent team. Reçoit l'objectif de l'équipe, décompose le travail, assigne des tâches aux membres et décide quand l'équipe a terminé. |
| **Workspace**                    | Un répertoire de système de fichiers par agent où l'agent écrit et exécute son propre code, isolé des autres agents.                                                 |
| **Write-Down**                   | Le flux interdit de données d'un niveau de classification supérieur vers un niveau inférieur (ex. données CONFIDENTIAL envoyées vers un canal PUBLIC).               |
