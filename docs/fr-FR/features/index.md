# Apercu des fonctionnalites

Au-dela de son [modele de securite](/fr-FR/security/) et de sa [prise en charge des canaux](/fr-FR/channels/),
Triggerfish offre des fonctionnalites qui etendent votre agent IA au-dela
du simple questions-reponses : taches planifiees, memoire persistante, acces web, entree
vocale et basculement multi-modele.

## Comportement proactif

### [Cron et Triggers](./cron-and-triggers)

Planifiez des taches recurrentes avec des expressions cron standard et definissez un
comportement de surveillance proactif via `TRIGGER.md`. Votre agent peut delivrer des
briefings matinaux, verifier des pipelines, surveiller les messages non lus et agir de maniere autonome
selon un calendrier configurable -- le tout avec application de la classification et des
sessions isolees.

### [Notifications](./notifications)

Un service de livraison de notifications qui achemine les messages a travers tous les
canaux connectes avec des niveaux de priorite, une mise en file d'attente hors ligne et une deduplication.
Remplace les schemas de notification ad-hoc par une abstraction unifiee.

## Outils de l'agent

### [Recherche et recuperation web](./web-search)

Recherchez sur le web et recuperez le contenu des pages. L'agent utilise `web_search` pour trouver
des informations et `web_fetch` pour lire les pages web, avec prevention SSRF et application
des politiques sur toutes les requetes sortantes.

### [Memoire persistante](./memory)

Memoire inter-sessions avec controle de classification. L'agent sauvegarde et rappelle
des faits, preferences et contextes a travers les conversations. La classification de la memoire est
forcee au niveau de taint de la session -- le LLM ne peut pas choisir le niveau.

### [Analyse d'images et vision](./image-vision)

Collez des images depuis votre presse-papiers (Ctrl+V en CLI, coller dans le navigateur dans Tidepool) et
analysez des fichiers image sur le disque. Configurez un modele de vision separe pour decrire
automatiquement les images lorsque le modele principal ne prend pas en charge la vision.

### [Exploration de code](./explore)

Comprehension structuree du code source via des sous-agents paralleles. L'outil `explore`
cartographie les arborescences de repertoires, detecte les motifs de codage, trace les imports et analyse
l'historique git -- le tout en parallele.

### [Gestion des sessions](./sessions)

Inspectez, communiquez avec et creez des sessions. L'agent peut deleguer des taches
en arriere-plan, envoyer des messages inter-sessions et communiquer a travers les canaux -- le tout sous
controle de write-down.

### [Mode plan et suivi des taches](./planning)

Planification structuree avant implementation (mode plan) et suivi persistant des taches
(todos) a travers les sessions. Le mode plan contraint l'agent a une exploration en lecture seule
jusqu'a ce que vous approuviez le plan.

### [Systeme de fichiers et shell](./filesystem)

Lisez, ecrivez, recherchez et executez des commandes. Les outils fondamentaux pour les operations
sur les fichiers, avec delimitation de l'espace de travail et liste de refus de commandes.

### [Sous-agents et taches LLM](./subagents)

Deleguez du travail a des sous-agents autonomes ou executez des prompts LLM isoles pour
la synthese, la classification et le raisonnement cible sans polluer la conversation
principale.

### [Equipes d'agents](./agent-teams)

Creez des equipes persistantes d'agents collaborant avec des roles specialises. Un responsable
coordonne les membres qui communiquent de maniere autonome via la messagerie inter-sessions.
Inclut la surveillance du cycle de vie avec des delais d'inactivite, des limites de duree de vie et des
verifications de sante. Ideal pour les taches complexes qui beneficient de perspectives multiples iterant
sur le travail de chacun.

## Interaction riche

### [Pipeline vocal](./voice)

Prise en charge complete de la parole avec des fournisseurs STT et TTS configurables. Utilisez Whisper pour
la transcription locale, Deepgram ou OpenAI pour le STT cloud, et ElevenLabs ou OpenAI
pour la synthese vocale. L'entree vocale passe par les memes controles de classification et
d'application des politiques que le texte.

### [Tide Pool / A2UI](./tidepool)

Un espace de travail visuel pilote par l'agent ou Triggerfish affiche du contenu interactif
-- tableaux de bord, graphiques, formulaires et apercu de code. Le protocole A2UI (Agent-to-UI)
envoie des mises a jour en temps reel de l'agent vers les clients connectes.

## Multi-agent et multi-modele

### [Routage multi-agent](./multi-agent)

Dirigez differents canaux, comptes ou contacts vers des agents isoles separes,
chacun avec son propre SPINE.md, espace de travail, skills et plafond de classification. Votre
Slack professionnel va vers un agent ; votre WhatsApp personnel va vers un autre.

### [Fournisseurs LLM et basculement](./model-failover)

Connectez-vous a Anthropic, OpenAI, Google, des modeles locaux (Ollama) ou OpenRouter.
Configurez des chaines de basculement pour que votre agent bascule automatiquement vers un
fournisseur alternatif lorsqu'un n'est pas disponible. Chaque agent peut utiliser un modele different.

### [Limitation de debit](./rate-limiting)

Limiteur de debit a fenetre glissante qui empeche d'atteindre les limites API des fournisseurs LLM.
Suit les tokens par minute et les requetes par minute, retarde les appels lorsque la capacite est
epuisee et s'integre a la chaine de basculement.

## Operations

### [Journalisation structuree](./logging)

Journalisation structuree unifiee avec niveaux de severite, rotation des fichiers et double sortie
vers stderr et fichier. Lignes de log etiquetees par composant, rotation automatique a 1 Mo et un
outil `log_read` pour acceder a l'historique des journaux.

::: info Toutes les fonctionnalites s'integrent au modele de securite central. Les taches cron respectent
les plafonds de classification. L'entree vocale porte le taint. Le contenu du Tide Pool passe
par le hook PRE_OUTPUT. Le routage multi-agent applique l'isolation des sessions. Aucune
fonctionnalite ne contourne la couche de politique. :::
