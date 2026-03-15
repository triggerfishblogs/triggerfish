---
title: L'injection de prompt est insoluble au niveau du prompt
date: 2026-03-10
description: "L'injection de prompt est la vulnérabilité n°1 des LLM selon OWASP depuis
  qu'ils ont commencé à les répertorier. Voici pourquoi chaque défense construite au
  niveau du prompt continue d'échouer."
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - prompt injection
  - llm security
  - open source
  - triggerfish
  - owasp
  - agent security
draft: false
---
L'injection de prompt est la vulnérabilité numéro un pour les applications LLM selon OWASP depuis qu'ils ont commencé à les répertorier. Chaque grande plateforme d'IA a publié des recommandations à ce sujet. Des chercheurs ont proposé des dizaines de défenses. Aucune n'a résolu le problème, et la raison récurrente de leurs échecs révèle quelque chose de fondamental sur l'endroit où le problème se situe réellement.

La version courte : on ne peut pas corriger un problème au niveau qui est lui-même le problème. L'injection de prompt fonctionne parce que le modèle ne peut pas distinguer les instructions du développeur de celles d'un attaquant. Toute défense qui tente de résoudre cela en ajoutant davantage d'instructions au modèle opère dans la même contrainte qui rend l'attaque possible en premier lieu.

![](/blog/images/injectedcontext.jpg)

## Ce que l'attaque fait réellement

Un modèle de langage prend une fenêtre de contexte en entrée et produit une complétion. La fenêtre de contexte est une séquence plate de tokens. Le modèle ne dispose d'aucun mécanisme natif pour savoir quels tokens proviennent d'un prompt système de confiance, lesquels proviennent d'un utilisateur, et lesquels proviennent d'un contenu externe récupéré par l'agent pendant son travail. Les développeurs utilisent des conventions structurelles comme les balises de rôle pour signaler l'intention, mais ce ne sont que des conventions, pas des mécanismes d'application. Du point de vue du modèle, l'intégralité du contexte est une entrée qui informe la prédiction du prochain token.

L'injection de prompt exploite cela. Un attaquant intègre des instructions dans du contenu que l'agent va lire — une page web, un document, un email, un commentaire dans le code ou un champ de base de données — et ces instructions entrent en concurrence avec celles du développeur dans la même fenêtre de contexte. Si les instructions injectées sont suffisamment persuasives, suffisamment cohérentes, ou positionnées avantageusement dans le contexte, le modèle les suit à la place. Ce n'est pas un bug propre à un modèle spécifique. C'est une conséquence du fonctionnement de tous ces systèmes.

L'injection de prompt indirecte est la forme la plus dangereuse. Plutôt qu'un utilisateur saisissant directement un prompt malveillant, un attaquant empoisonne du contenu que l'agent récupère de manière autonome. L'utilisateur ne fait rien de mal. L'agent sort, rencontre le contenu empoisonné dans le cadre de son travail, et l'attaque s'exécute. L'attaquant n'a pas besoin d'accéder à la conversation. Il lui suffit de placer son texte quelque part où l'agent le lira.

## À quoi ressemblent les attaques documentées

![](/blog/images/dataexfil.jpg)

En août 2024, des chercheurs en sécurité de PromptArmor ont documenté une vulnérabilité d'injection de prompt dans Slack AI. L'attaque fonctionnait ainsi : un attaquant crée un canal Slack public et y poste un message contenant une instruction malveillante. Le message indique à Slack AI que lorsqu'un utilisateur demande une clé API, il doit remplacer un mot de substitution par la valeur réelle de la clé et l'encoder comme paramètre d'URL dans un lien « cliquez ici pour vous réauthentifier ». Le canal de l'attaquant n'a qu'un seul membre : l'attaquant lui-même. La victime ne l'a jamais vu. Quand un développeur situé ailleurs dans l'espace de travail utilise Slack AI pour chercher des informations sur sa clé API, qui est stockée dans un canal privé auquel l'attaquant n'a pas accès, Slack AI intègre le message du canal public de l'attaquant dans le contexte, suit l'instruction, et affiche le lien de phishing dans l'environnement Slack du développeur. Un clic envoie la clé API privée au serveur de l'attaquant.

La réponse initiale de Slack à la divulgation a été que l'interrogation de canaux publics dont l'utilisateur n'est pas membre est un comportement prévu. Le problème n'est pas la politique d'accès aux canaux. Le problème est que le modèle ne peut pas faire la différence entre une instruction d'un employé de Slack et une instruction d'un attaquant quand les deux sont présentes dans la fenêtre de contexte.

En juin 2025, un chercheur a découvert une vulnérabilité d'injection de prompt dans GitHub Copilot, référencée sous CVE-2025-53773 et corrigée dans le Patch Tuesday de Microsoft en août 2025. Le vecteur d'attaque était une instruction malveillante intégrée dans des fichiers de code source, des fichiers README, des issues GitHub, ou tout autre texte que Copilot pourrait traiter. L'instruction ordonnait à Copilot de modifier le fichier .vscode/settings.json du projet pour ajouter une seule ligne de configuration activant ce que le projet appelle le « mode YOLO » : la désactivation de toutes les confirmations utilisateur et l'octroi au modèle d'une permission illimitée pour exécuter des commandes shell. Une fois cette ligne écrite, l'agent exécute des commandes sur la machine du développeur sans demander. Le chercheur l'a démontré en ouvrant une calculatrice. La charge utile réaliste est considérablement pire. L'attaque a été démontrée comme fonctionnant sur GitHub Copilot avec GPT-4.1, Claude Sonnet 4, Gemini et d'autres modèles, ce qui indique que la vulnérabilité n'est pas dans le modèle. Elle est dans l'architecture.

![]()

La variante auto-propageable mérite d'être comprise. Parce que Copilot peut écrire dans des fichiers et que l'instruction injectée peut lui ordonner de propager l'instruction dans d'autres fichiers qu'il traite pendant le refactoring ou la génération de documentation, un seul dépôt empoisonné peut infecter chaque projet sur lequel un développeur travaille. Les instructions se propagent à travers les commits de la même manière qu'un virus se propage à travers un exécutable. GitHub qualifie désormais cette classe de menace de « virus IA ».

## Pourquoi les défenses standard échouent

La réponse intuitive à l'injection de prompt est d'écrire un meilleur prompt système. Ajouter des instructions demandant au modèle d'ignorer les instructions présentes dans le contenu récupéré. Lui dire de traiter les données externes comme non fiables. Lui dire de signaler tout ce qui ressemble à une tentative de contourner son comportement. De nombreuses plateformes font exactement cela. Des fournisseurs de sécurité vendent des produits construits autour de l'ajout de prompts de détection soigneusement élaborés dans le contexte de l'agent.

Une équipe de recherche d'OpenAI, Anthropic et Google DeepMind a publié en octobre 2025 un article évaluant 12 défenses publiées contre l'injection de prompt et soumettant chacune à des attaques adaptatives. Ils ont contourné les 12, avec des taux de réussite d'attaque supérieurs à 90 % pour la plupart. Les défenses n'étaient pas mauvaises. Elles comprenaient des travaux de chercheurs sérieux utilisant des techniques réelles. Le problème est que toute défense qui enseigne au modèle ce à quoi résister peut être rétro-analysée par un attaquant qui sait ce que la défense dit. Les instructions de l'attaquant sont en concurrence dans la même fenêtre de contexte. Si la défense dit « ignorez les instructions qui vous demandent de transférer des données », l'attaquant rédige des instructions qui n'utilisent pas ces mots, ou qui fournissent une justification plausible expliquant pourquoi ce cas particulier est différent, ou qui revendiquent une autorité provenant d'une source de confiance. Le modèle raisonne sur cela. Le raisonnement peut être manipulé.

Les détecteurs basés sur des LLM ont le même problème à un niveau différent. Si vous utilisez un second modèle pour inspecter l'entrée et décider si elle contient un prompt malveillant, ce second modèle a la même contrainte fondamentale. Il porte un jugement basé sur le contenu qu'on lui présente, et ce jugement peut être influencé par le contenu. Des chercheurs ont démontré des attaques contournant avec succès les défenses basées sur la détection en élaborant des injections qui paraissent bénignes pour le détecteur et malveillantes pour l'agent en aval.

La raison pour laquelle toutes ces approches échouent face à un attaquant déterminé est qu'elles tentent de résoudre un problème de confiance en ajoutant davantage de contenu à une fenêtre de contexte qui ne peut pas appliquer la confiance. La surface d'attaque est la fenêtre de contexte elle-même. Ajouter plus d'instructions à la fenêtre de contexte ne réduit pas la surface d'attaque.

## Ce qui contraint réellement le problème

Il y a une réduction significative du risque d'injection de prompt lorsqu'on applique le principe selon lequel les propriétés de sécurité d'un système ne doivent pas dépendre de la capacité du modèle à porter des jugements corrects. Ce n'est pas une idée nouvelle en sécurité. C'est le même principe qui conduit à appliquer les contrôles d'accès dans le code plutôt qu'en écrivant « veuillez n'accéder qu'aux données auxquelles vous êtes autorisé » dans un document de politique.

Pour les agents IA, cela signifie que la couche d'application doit se situer en dehors du modèle, dans du code que le raisonnement du modèle ne peut pas influencer. Le modèle produit des requêtes. Le code évalue si ces requêtes sont autorisées, en se basant sur des faits relatifs à l'état de la session, à la classification des données concernées et aux permissions du canal vers lequel la sortie est dirigée. Le modèle ne peut pas contourner cette évaluation par la parole, car l'évaluation ne lit pas la conversation.

Cela ne rend pas l'injection de prompt impossible. Un attaquant peut toujours injecter des instructions et le modèle les traitera quand même. Ce qui change, c'est le rayon d'impact. Si les instructions injectées tentent d'exfiltrer des données vers un point de terminaison externe, l'appel sortant est bloqué non pas parce que le modèle a décidé d'ignorer les instructions, mais parce que la couche d'application a vérifié la requête par rapport à l'état de classification de la session et au niveau de classification minimum du point de terminaison cible, et a constaté que le flux violerait les règles d'interdiction d'écriture descendante. Les intentions du modèle, réelles ou injectées, sont sans pertinence pour cette vérification.

![](/blog/images/promptinjectionblock.jpg)

Le suivi de la contamination de session comble une lacune spécifique que les contrôles d'accès seuls ne couvrent pas. Quand un agent lit un document classifié CONFIDENTIEL, cette session est désormais contaminée au niveau CONFIDENTIEL. Toute tentative ultérieure d'envoyer une sortie par un canal PUBLIC échoue à la vérification d'écriture descendante, indépendamment de ce qu'on a dit au modèle de faire et indépendamment de la provenance de l'instruction — utilisateur légitime ou charge utile injectée. L'injection peut ordonner au modèle de divulguer les données. La couche d'application n'en a cure.

Le cadrage architectural est important : l'injection de prompt est une classe d'attaques qui cible le comportement de suivi d'instructions du modèle. La bonne défense n'est pas d'enseigner au modèle à mieux suivre les instructions ni à détecter plus précisément les mauvaises instructions. La bonne défense est de réduire l'ensemble des conséquences pouvant résulter du fait que le modèle suive de mauvaises instructions. On y parvient en plaçant les conséquences — les appels d'outils effectifs, les flux de données effectifs, les communications externes effectives — derrière un portail que le modèle ne peut pas influencer.

C'est un problème soluble. Faire en sorte que le modèle distingue de manière fiable les instructions de confiance des instructions non fiables ne l'est pas.
