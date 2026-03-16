---
title: Ingestion de données non structurées
description: Comment Triggerfish gère le traitement des factures, l'intake documentaire et l'analyse des e-mails sans se casser quand les formats d'entrée changent.
---

# Ingestion de données non structurées et semi-structurées

Le traitement des factures devrait être un problème résolu maintenant. Un document arrive, des champs sont extraits, les données sont validées par rapport aux enregistrements existants, et le résultat est routé vers le bon système. La réalité est que le traitement des factures seul coûte aux entreprises des milliards en main-d'œuvre manuelle chaque année, et les projets d'automatisation censés y remédier cassent constamment.

La raison est la variance des formats. Les factures arrivent en PDF, pièces jointes d'e-mail, images numérisées, exports de tableur et parfois par fax. Chaque fournisseur utilise une disposition différente. Les postes apparaissent dans des tableaux, en texte libre, ou dans une combinaison des deux. Les calculs de taxes suivent différentes règles selon les juridictions. Les formats de devises varient. Les formats de date varient. Même le même fournisseur change son modèle de facture sans préavis.

La RPA traditionnelle gère cela avec la correspondance de modèles. Définir les coordonnées où apparaît le numéro de facture, où commencent les postes, où se trouve le total. Ça fonctionne pour le modèle actuel d'un seul fournisseur. Puis le fournisseur met à jour son système, décale une colonne, ajoute une ligne d'en-tête, ou change son générateur PDF, et le bot échoue directement ou extrait des données incorrectes qui se propagent en aval jusqu'à ce que quelqu'un les attrape manuellement.

Le même schéma se répète dans tous les flux de travail de données non structurées. Le traitement des EOB d'assurance casse quand un payeur change la disposition de son formulaire. L'intake de demandes d'autorisation préalable casse quand un nouveau type de document est ajouté au processus. L'analyse des e-mails clients casse quand quelqu'un utilise un format d'objet légèrement différent. Le coût de maintenance pour faire fonctionner ces automatisations dépasse souvent le coût de faire le travail manuellement.

## Comment Triggerfish résout ce problème

Triggerfish remplace l'extraction positionnelle de champs par la compréhension documentaire basée sur LLM. L'IA lit le document comme un humain le ferait : comprend le contexte, infère les relations entre les champs, et s'adapte automatiquement aux changements de disposition. Combiné avec le moteur de flux de travail pour l'orchestration de pipeline et le système de classification pour la sécurité des données, cela crée des pipelines d'ingestion qui ne cassent pas quand le monde change.

### Analyse documentaire alimentée par LLM

Quand un document entre dans un flux de travail Triggerfish, un sous-agent LLM lit l'intégralité du document et extrait des données structurées basées sur ce que le document signifie, pas sur où se trouvent des pixels spécifiques. Un numéro de facture est un numéro de facture qu'il soit dans le coin supérieur droit étiqueté "Invoice #" ou au milieu de la page étiqueté "Factura No." ou intégré dans un paragraphe de texte. Le LLM comprend que "Net 30" signifie des conditions de paiement, que "Qté" et "Quantité" et "Unités" signifient la même chose, et qu'un tableau avec des colonnes pour description, tarif et montant est une liste de postes quelle que soit l'ordre des colonnes.

Ce n'est pas une approche générique "envoyer le document à ChatGPT et espérer le meilleur". La définition du flux de travail spécifie exactement quelle sortie structurée le LLM doit produire, quelles règles de validation s'appliquent, et ce qui se passe quand le niveau de confiance d'extraction est faible. La description de la tâche du sous-agent définit le schéma attendu, et les étapes suivantes du flux de travail valident les données extraites par rapport aux règles métier avant qu'elles n'entrent dans tout système en aval.

### Automatisation du navigateur pour la récupération de documents

De nombreux flux de travail d'ingestion documentaire commencent par l'obtention du document en premier lieu. Les EOB d'assurance se trouvent dans les portails payeurs. Les factures fournisseurs se trouvent dans les plateformes fournisseurs. Les formulaires gouvernementaux se trouvent sur les sites d'agences d'état. L'automatisation traditionnelle utilise des scripts Selenium ou des appels API pour récupérer ces documents, et ces scripts cassent quand le portail change.

L'automatisation du navigateur de Triggerfish utilise Chromium contrôlé par CDP avec un LLM lisant des instantanés de page pour naviguer. L'agent voit la page comme un humain le fait et clique, tape et défile en fonction de ce qu'il voit plutôt que des sélecteurs CSS codés en dur. Quand un portail payeur refait sa page de connexion, l'agent s'adapte parce qu'il peut encore identifier le champ nom d'utilisateur, le champ mot de passe et le bouton soumettre à partir du contexte visuel. Quand un menu de navigation change, l'agent trouve le nouveau chemin vers la section de téléchargement des documents.

Ce n'est pas parfaitement fiable. Les CAPTCHA, les flux d'authentification multi-facteurs et les portails très dépendants de JavaScript posent encore des problèmes. Mais le mode de défaillance est fondamentalement différent des scripts traditionnels. Un script Selenium échoue silencieusement quand un sélecteur CSS cesse de correspondre. Un agent Triggerfish rapporte ce qu'il voit, ce qu'il a essayé et où il est bloqué, donnant à l'opérateur suffisamment de contexte pour intervenir ou ajuster le flux de travail.

### Traitement soumis à la classification

Les documents portent différents niveaux de sensibilité, et le système de classification gère cela automatiquement. Une facture contenant des conditions de prix peut être CONFIDENTIAL. Une réponse à un appel d'offres public peut être INTERNAL. Un document contenant des PHI est RESTRICTED. Quand le sous-agent LLM lit un document et extrait des données, le hook POST_TOOL_RESPONSE classifie le contenu extrait, et le taint de session augmente en conséquence.

Cela compte pour le routage en aval. Les données de facture extraites classifiées à CONFIDENTIAL ne peuvent pas être envoyées à un canal Slack classifié à PUBLIC. Un flux de travail qui traite des documents d'assurance contenant des PHI restreint automatiquement où les données extraites peuvent circuler. La règle de prévention de write-down l'applique à chaque frontière, et le LLM n'a aucune autorité pour l'outrepasser.

Pour les soins de santé et les services financiers en particulier, cela signifie que la charge de conformité du traitement automatisé de documents chute considérablement. Au lieu de construire des contrôles d'accès personnalisés à chaque étape de chaque pipeline, le système de classification les gère uniformément. Un auditeur peut retracer exactement quels documents ont été traités, quelles données ont été extraites, où elles ont été envoyées, et confirmer qu'aucune donnée n'a circulé vers une destination inappropriée — tout cela à partir des enregistrements de lignage créés automatiquement à chaque étape.

### Adaptation de format auto-réparatrice

Quand un fournisseur change son modèle de facture, l'automatisation traditionnelle casse et reste cassée jusqu'à ce que quelqu'un mette à jour manuellement les règles d'extraction. Dans Triggerfish, le sous-agent LLM s'adapte à la prochaine exécution. Il trouve encore le numéro de facture, les postes et le total, parce qu'il lit pour le sens plutôt que la position. L'extraction réussit, les données sont validées par rapport aux mêmes règles métier, et le flux de travail se termine.

Au fil du temps, l'agent peut utiliser la mémoire inter-sessions pour apprendre des schémas. Si le fournisseur A inclut toujours des frais de restockage que les autres fournisseurs n'ont pas, l'agent s'en souvient des extractions précédentes et sait le chercher. Si le format EOB d'un payeur particulier met toujours les codes d'ajustement dans un emplacement inhabituel, la mémoire de l'agent sur les extractions réussies précédentes rend les extractions futures plus fiables.

Quand un changement de format est suffisamment significatif pour que la confiance d'extraction du LLM tombe en dessous du seuil défini dans le flux de travail, le flux de travail route le document vers une file de révision humaine au lieu de deviner. Les corrections humaines sont réinjectées dans le flux de travail, et la mémoire de l'agent stocke le nouveau schéma pour référence future. Le système devient plus intelligent avec le temps sans que personne ne réécrive les règles d'extraction.

### Orchestration de pipeline

L'ingestion documentaire n'est rarement que "extraire et stocker". Un pipeline complet récupère le document, extrait des données structurées, les valide par rapport aux enregistrements existants, les enrichit avec des données d'autres systèmes, route les exceptions pour révision humaine, et charge les données validées dans le système cible. Le moteur de flux de travail gère tout cela dans une seule définition YAML.

Un pipeline d'autorisation préalable en santé pourrait ressembler à ceci : l'automatisation du navigateur récupère l'image du fax du portail du prestataire, un sous-agent LLM extrait les identifiants patients et les codes de procédure, un appel HTTP valide le patient par rapport au DSE, un autre sous-agent évalue si l'autorisation répond aux critères de nécessité médicale selon la documentation clinique, et le résultat est routé soit vers l'approbation automatique soit vers une file de révision clinique. Chaque étape est classifiée. Chaque PHI est taggée. La piste d'audit complète existe automatiquement.

## À quoi ça ressemble en pratique

Un système de santé régional traite des demandes d'autorisation préalable de quarante cabinets prestataires différents, chacun utilisant sa propre disposition de formulaire, certains par fax, certains par e-mail, certains téléchargés sur un portail. L'approche traditionnelle nécessitait une équipe de huit personnes pour examiner et saisir manuellement chaque demande, car aucun outil d'automatisation ne pouvait gérer la variance de format de manière fiable.

Avec Triggerfish, un flux de travail gère le pipeline complet. L'automatisation du navigateur ou l'analyse des e-mails récupère les documents. Les sous-agents LLM extraient les données structurées quel que soit le format. Les étapes de validation vérifient les données extraites par rapport au DSE et aux bases de données de formulaire. Un plafond de classification de RESTRICTED garantit que les PHI ne quittent jamais le périmètre du pipeline. Les documents que le LLM ne peut pas analyser avec un niveau de confiance élevé sont routés vers un réviseur humain, mais ce volume diminue au fil du temps à mesure que la mémoire de l'agent construit une bibliothèque de schémas de format.

L'équipe de huit personnes devient deux personnes gérant les exceptions que le système signale, plus des audits qualité périodiques des extractions automatisées. Les changements de format des cabinets prestataires sont absorbés automatiquement. Les nouvelles dispositions de formulaires sont gérées dès la première rencontre. Le coût de maintenance qui consommait la majeure partie du budget d'automatisation traditionnelle chute à presque zéro.
