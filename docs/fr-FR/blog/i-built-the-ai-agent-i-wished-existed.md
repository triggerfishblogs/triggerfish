---
title: "J'ai construit l'agent IA que je rêvais d'avoir"
date: 2026-03-09
description: "J'ai construit Triggerfish parce que tous les agents IA que j'ai
  trouvés faisaient confiance au modèle pour appliquer ses propres règles. Ce
  n'est pas de la sécurité. Voici ce que j'ai fait à la place."
author: Greg Havens
tags:
  - ai
  - ai agents
  - security
  - open source
  - self-hosted
  - llm
  - prompt injection
  - agent security
  - triggerfish
draft: false
---
Il y a quelque temps, j'ai commencé à observer de près ce que les agents IA pouvaient réellement faire. Pas les démos. Les vrais, tournant sur des données réelles, dans des environnements réels où les erreurs ont des conséquences. Ce que j'ai constaté, c'est que la capacité était véritablement là. Vous pouviez connecter un agent à votre messagerie, votre calendrier, votre code, vos fichiers, et il pouvait accomplir un travail significatif. Cette partie m'a impressionné.

Ce qui ne m'a pas impressionné, c'est le modèle de sécurité. Ou plutôt, son absence. Toutes les plateformes que j'ai examinées appliquaient leurs règles de la même manière : en disant au modèle ce qu'il n'était pas censé faire. Rédigez un bon system prompt, décrivez les limites, faites confiance au modèle pour rester à l'intérieur. Cela fonctionne jusqu'à ce que quelqu'un trouve comment formuler une requête qui convainc le modèle que les règles ne s'appliquent pas ici, maintenant, dans ce cas précis. Et les gens trouvent. Ce n'est pas si difficile.

J'ai continué à attendre que quelqu'un construise la version que je voulais vraiment utiliser. Une version capable de se connecter à tout, de fonctionner sur tous les canaux que j'utilisais déjà, et de traiter des données véritablement sensibles sans que j'aie à croiser les doigts en espérant que le modèle soit en forme ce jour-là. Elle n'est jamais apparue.

Alors je l'ai construite moi-même.

Triggerfish est l'agent que je voulais. Il se connecte à votre messagerie, votre calendrier, vos fichiers, votre code, vos applications de messagerie instantanée. Il fonctionne de manière proactive, pas uniquement quand vous lui envoyez un prompt. Il travaille là où vous travaillez déjà. Mais la partie que je prends le plus au sérieux, c'est l'architecture de sécurité. Les règles qui définissent ce à quoi l'agent peut accéder et où les données peuvent circuler ne se trouvent pas dans un prompt. Elles se trouvent dans une couche d'enforcement qui existe entièrement en dehors du modèle. Le modèle indique au système ce qu'il veut faire, et une couche séparée décide si cela se produit réellement. Le modèle ne peut pas négocier avec cette couche. Il ne peut pas raisonner pour la contourner. Il ne peut pas la voir.

Cette distinction compte plus qu'il n'y paraît. Elle signifie que les propriétés de sécurité du système ne se dégradent pas à mesure que le modèle devient plus capable. Elle signifie qu'un outil tiers compromis ne peut pas convaincre l'agent de faire quelque chose qu'il ne devrait pas. Elle signifie que vous pouvez regarder les règles, les comprendre et leur faire confiance, parce que ce sont du code, pas de la prose.

J'ai publié le noyau d'enforcement en open source précisément pour cette raison. Si vous ne pouvez pas le lire, vous ne pouvez pas lui faire confiance. C'est vrai pour toute revendication de sécurité, et c'est particulièrement vrai lorsque ce que vous protégez est un agent autonome ayant accès à vos données les plus sensibles.

La plateforme est gratuite pour les particuliers et vous pouvez l'héberger vous-même. Si vous préférez ne pas vous soucier de l'infrastructure, il existe une option d'abonnement où nous gérons le modèle et la recherche. Dans les deux cas, le modèle de sécurité est le même.

Voici l'agent que je rêvais d'avoir il y a deux ans. Je pense que beaucoup de gens attendaient la même chose.
