---
title: Inférence IA dans les flux de travail de production
description: Comment Triggerfish comble l'écart entre les démos IA et les flux de travail durables en production avec l'application de la sécurité, les pistes d'audit et l'orchestration des flux de travail.
---

# Intégration de l'inférence IA/ML dans les flux de travail de production

La plupart des projets IA en entreprise meurent dans l'écart entre la démo et la production. Une équipe construit une preuve de concept qui utilise GPT-4 pour classifier des tickets de support ou résumer des documents juridiques ou générer du contenu marketing. La démo fonctionne. La direction est enthousiaste. Puis le projet stagne pendant des mois en essayant de répondre aux questions que la démo n'avait jamais à se poser : D'où viennent les données ? Où va la sortie ? Qui approuve les décisions de l'IA ? Que se passe-t-il quand le modèle hallucine ? Comment auditons-nous ce qu'il a fait ? Comment empêchons-nous l'accès à des données qu'il ne devrait pas voir ? Comment l'empêchons-nous d'envoyer des informations sensibles au mauvais endroit ?

Ces préoccupations ne sont pas hypothétiques. 95 % des pilotes d'IA générative en entreprise ne parviennent pas à générer des retours financiers, et la raison n'est pas que la technologie ne fonctionne pas. Les modèles sont capables. L'échec est dans la plomberie : intégrer l'inférence IA de manière fiable dans les vrais flux de travail métier où elle doit opérer, avec les contrôles de sécurité, la gestion des erreurs et les pistes d'audit que les systèmes de production exigent.

La réponse typique d'une entreprise est de construire une couche d'intégration personnalisée. Une équipe d'ingénieurs passe des mois à connecter le modèle IA aux sources de données, à construire le pipeline, à ajouter l'authentification, à implémenter la journalisation, à créer un flux de travail d'approbation, et à ajouter des vérifications de sécurité. Au moment où l'intégration est "prête pour la production", le modèle original a été dépassé par un plus récent, les exigences métier ont évolué, et l'équipe doit recommencer.

## Comment Triggerfish résout ce problème

Triggerfish élimine l'écart d'intégration en faisant de l'inférence IA une étape de première classe dans le moteur de flux de travail, gouvernée par la même application de sécurité, la journalisation d'audit et les contrôles de classification qui s'appliquent à toutes les autres opérations dans le système. Une étape de sous-agent LLM dans un flux de travail Triggerfish n'est pas un ajout. C'est une opération native avec les mêmes hooks de politique, le suivi de lignage et la prévention de write-down qu'un appel HTTP ou une requête de base de données.

### L'IA comme étape de flux de travail, pas comme un système séparé

Dans le DSL de flux de travail, une étape d'inférence LLM est définie avec `call: triggerfish:llm`. La description de la tâche dit au sous-agent quoi faire en langage naturel. Le sous-agent a accès à chaque outil enregistré dans Triggerfish. Il peut rechercher sur le web, interroger des bases de données via des outils MCP, lire des documents, parcourir des sites web et utiliser la mémoire inter-sessions. Quand l'étape se termine, sa sortie alimente directement l'étape suivante du flux de travail.

Cela signifie qu'il n'y a pas de "système IA" séparé à intégrer. L'inférence se passe à l'intérieur du flux de travail, en utilisant les mêmes credentials, les mêmes connexions de données et la même application de sécurité que tout le reste. Une équipe d'ingénieurs n'a pas besoin de construire une couche d'intégration personnalisée parce que la couche d'intégration existe déjà.

### Sécurité qui ne nécessite pas d'ingénierie personnalisée

La partie la plus chronophage de la mise en production d'un flux de travail IA n'est pas l'IA. C'est le travail de sécurité et de conformité. Quelles données le modèle peut-il voir ? Où peut-il envoyer sa sortie ? Comment empêchons-nous la fuite d'informations sensibles ? Comment journalisons-nous tout pour l'audit ?

Dans Triggerfish, ces questions sont répondues par l'architecture de la plateforme, pas par l'ingénierie par projet. Le système de classification suit la sensibilité des données à chaque frontière. Le taint de session augmente quand le modèle accède à des données classifiées. La prévention de write-down bloque la sortie de circuler vers un canal classifié en dessous du niveau de taint de la session. Chaque appel d'outil, chaque accès aux données et chaque décision de sortie est journalisé avec un lignage complet.

Un flux de travail IA qui lit des enregistrements clients (CONFIDENTIAL) et génère un résumé ne peut pas envoyer ce résumé à un canal Slack public. Ce n'est pas appliqué par une instruction de prompt que le modèle pourrait ignorer. C'est appliqué par du code déterministe dans le hook PRE_OUTPUT que le modèle ne peut pas voir, ne peut pas modifier, et ne peut pas contourner. Les hooks de politique s'exécutent en dessous de la couche LLM. Le LLM demande une action, et la couche de politique décide si elle doit être autorisée. Le délai d'attente équivaut au rejet. Il n'y a pas de chemin du modèle vers l'extérieur qui ne passe pas par l'application.

### Pistes d'audit qui existent déjà

Chaque décision IA dans un flux de travail Triggerfish génère automatiquement des enregistrements de lignage. Le lignage suit quelles données le modèle a accédées, quel niveau de classification elles portaient, quelles transformations ont été appliquées, et où la sortie a été envoyée. Ce n'est pas une fonctionnalité de journalisation qui doit être activée ou configurée. C'est une propriété structurelle de la plateforme. Chaque élément de données porte des métadonnées de provenance depuis la création jusqu'à chaque transformation jusqu'à sa destination finale.

Pour les industries réglementées, cela signifie que les preuves de conformité pour un flux de travail IA existent dès le premier jour. Un auditeur peut retracer n'importe quelle sortie générée par IA en remontant la chaîne complète : quel modèle l'a produite, sur quelles données elle était basée, quels outils le modèle a utilisés pendant le raisonnement, quel niveau de classification s'appliquait à chaque étape, et si des actions d'application de politique ont eu lieu. Cette collecte de preuves se passe automatiquement parce qu'elle est intégrée dans les hooks d'application, pas ajoutée comme une couche de reporting.

### Flexibilité des modèles sans ré-architecture

Triggerfish prend en charge plusieurs fournisseurs LLM via l'interface LlmProvider : Anthropic, OpenAI, Google, des modèles locaux via Ollama, et OpenRouter pour tout modèle routé. La sélection du fournisseur est configurable par agent avec basculement automatique. Quand un meilleur modèle devient disponible ou qu'un fournisseur change sa tarification, le changement se passe au niveau de la configuration sans toucher aux définitions de flux de travail.

Cela adresse directement le problème "le projet est obsolète avant d'être livré". Les définitions de flux de travail décrivent ce que l'IA doit faire, pas quel modèle le fait. Passer de GPT-4 à Claude à un modèle local affiné change une valeur de configuration. Le flux de travail, les contrôles de sécurité, les pistes d'audit et les points d'intégration restent tous exactement pareils.

### Cron, webhooks et exécution pilotée par événements

Les flux de travail IA qui s'exécutent selon un calendrier ou en réponse à des événements n'ont pas besoin d'un humain pour les déclencher. Le planificateur prend en charge des expressions cron à cinq champs pour les flux de travail récurrents et des points de terminaison webhook pour les déclencheurs pilotés par événements. Un flux de travail de génération de rapport quotidien s'exécute à 6h. Un flux de travail de classification documentaire se déclenche quand un nouveau fichier arrive via webhook. Un flux de travail d'analyse de sentiment se déclenche sur chaque nouveau ticket de support.

Chaque exécution planifiée ou déclenchée par événement instancie une session isolée avec un taint frais. Le flux de travail s'exécute dans son propre contexte de sécurité, indépendamment de toute session interactive. Si le flux de travail déclenché par cron accède à des données CONFIDENTIAL, seul l'historique de cette exécution est classifié à CONFIDENTIAL. Les autres flux de travail planifiés s'exécutant à classification PUBLIC ne sont pas affectés.

### Gestion des erreurs et intervention humaine

Les flux de travail IA de production doivent gérer les échecs gracieusement. Le DSL de flux de travail prend en charge `raise` pour les conditions d'erreur explicites et des sémantiques try/catch via la gestion des erreurs dans les définitions de tâches. Quand un sous-agent LLM produit une sortie à faible confiance ou rencontre une situation qu'il ne peut pas gérer, le flux de travail peut router vers une file d'approbation humaine, envoyer une notification via le service de notification, ou prendre une action de repli.

Le service de notification livre des alertes sur tous les canaux connectés avec priorité et déduplication. Si un flux de travail nécessite une approbation humaine avant qu'un amendement de contrat généré par IA soit envoyé, la demande d'approbation peut arriver sur Slack, WhatsApp, e-mail ou où que soit l'approbateur. Le flux de travail se met en pause jusqu'à ce que l'approbation arrive, puis reprend là où il s'était arrêté.

## À quoi ça ressemble en pratique

Un département juridique veut automatiser la revue des contrats. L'approche traditionnelle : six mois de développement personnalisé pour construire un pipeline qui extrait des clauses des contrats téléchargés, classifie les niveaux de risque, signale les termes non standard, et génère un résumé pour l'avocat réviseur. Le projet nécessite une équipe d'ingénierie dédiée, une revue de sécurité personnalisée, une validation de conformité et une maintenance continue.

Avec Triggerfish, la définition du flux de travail prend un jour à écrire. Le téléchargement déclenche un webhook. Un sous-agent LLM lit le contrat, extrait les clauses clés, classifie les niveaux de risque et identifie les termes non standard. Une étape de validation vérifie l'extraction par rapport à la bibliothèque de clauses du cabinet stockée en mémoire. Le résumé est routé vers le canal de notification de l'avocat assigné. L'intégralité du pipeline s'exécute à classification RESTRICTED parce que les contrats contiennent des informations privilégiées clients, et la prévention de write-down garantit qu'aucune donnée de contrat ne fuit vers un canal en dessous de RESTRICTED.

Quand le cabinet change de fournisseur LLM (parce qu'un nouveau modèle gère mieux le langage juridique, ou parce que le fournisseur actuel augmente ses prix), le changement est une seule ligne dans la configuration. La définition du flux de travail, les contrôles de sécurité, la piste d'audit et le routage des notifications continuent tous de fonctionner sans modification. Quand le cabinet ajoute un nouveau type de clause à son cadre de risque, le sous-agent LLM le prend en compte sans réécrire les règles d'extraction parce qu'il lit pour le sens, pas pour des schémas.

L'équipe de conformité obtient une piste d'audit complète dès le premier jour. Chaque contrat traité, chaque clause extraite, chaque classification de risque assignée, chaque notification envoyée et chaque approbation d'avocat enregistrée, avec un lignage complet jusqu'au document source. La collecte de preuves qui aurait nécessité des semaines de travail de reporting personnalisé existe automatiquement comme propriété structurelle de la plateforme.
