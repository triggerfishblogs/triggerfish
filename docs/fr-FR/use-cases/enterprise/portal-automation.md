---
title: Automatisation des portails tiers
description: Comment Triggerfish automatise les interactions avec les portails fournisseurs, les sites gouvernementaux et les systèmes payeurs sans se casser quand l'interface change.
---

# Automatisation d'interfaces contre des portails tiers

Chaque entreprise a une liste de portails dans lesquels les employés se connectent manuellement, chaque jour, pour effectuer un travail qui devrait être automatisé mais ne l'est pas. Les portails fournisseurs pour vérifier l'état des commandes. Les sites gouvernementaux pour soumettre des dépôts réglementaires. Les portails des assureurs pour vérifier l'éligibilité et le statut des réclamations. Les conseils des ordres d'État pour la vérification des accréditations. Les portails des autorités fiscales pour les dépôts de conformité.

Ces portails n'ont pas d'API. Ou ils ont des API non documentées, limitées en débit, ou réservées aux "partenaires préférés" qui paient pour l'accès. Les données se trouvent derrière une page de connexion, rendues en HTML, et le seul moyen de les extraire est de se connecter et de naviguer dans l'interface.

L'automatisation traditionnelle utilise des scripts de navigateur. Des scripts Selenium, Playwright ou Puppeteer qui se connectent, naviguent vers la bonne page, trouvent des éléments par sélecteur CSS ou XPath, extraient les données et se déconnectent. Ces scripts fonctionnent jusqu'à ce qu'ils ne fonctionnent plus. Une refonte du portail change les noms de classes CSS. Un nouveau CAPTCHA est ajouté au flux de connexion. Le menu de navigation passe d'une barre latérale à un menu hamburger. Une bannière de consentement aux cookies commence à couvrir le bouton de soumission. Le script échoue silencieusement, et personne ne le remarque jusqu'à ce que le processus en aval qui dépend des données commence à produire des erreurs.

Les conseils médicaux d'État sont un exemple particulièrement brutal. Il y en a cinquante, chacun avec un site web différent, des dispositions différentes, des méthodes d'authentification différentes et des formats de données différents. Ils redesignent selon leurs propres calendriers sans préavis. Un service de vérification des accréditations qui dépend du scraping de ces sites peut avoir cinq ou dix de ses cinquante scripts cassés à tout moment, chacun nécessitant qu'un développeur inspecte la nouvelle disposition et réécrive les sélecteurs.

## Comment Triggerfish résout ce problème

L'automatisation du navigateur de Triggerfish combine Chromium contrôlé par CDP avec une navigation visuelle basée sur LLM. L'agent voit la page sous forme de pixels rendus et d'instantanés d'accessibilité, pas comme un arbre DOM. Il identifie les éléments par leur apparence et leur fonction, pas par leurs noms de classes CSS. Quand un portail est refondu, l'agent s'adapte parce que les formulaires de connexion ressemblent toujours à des formulaires de connexion, les menus de navigation ressemblent toujours à des menus de navigation, et les tableaux de données ressemblent toujours à des tableaux de données.

### Navigation visuelle au lieu de scripts de sélecteurs

Les outils d'automatisation du navigateur fonctionnent à travers sept opérations : naviguer, capturer, cliquer, taper, sélectionner, défiler et attendre. L'agent navigue vers une URL, prend un instantané de la page rendue, raisonne sur ce qu'il voit, et décide quelle action prendre. Il n'y a pas d'outil `evaluate` qui exécute du JavaScript arbitraire dans le contexte de la page. C'est une décision de sécurité délibérée. L'agent interagit avec la page de la même façon qu'un humain le ferait — à travers l'interface — et ne peut pas exécuter du code qui pourrait être exploité par une page malveillante.

Quand l'agent rencontre un formulaire de connexion, il identifie le champ nom d'utilisateur, le champ mot de passe et le bouton soumettre en fonction de la disposition visuelle, du texte de substitution, des étiquettes et de la structure de la page. Il n'a pas besoin de savoir que le champ nom d'utilisateur a `id="auth-input-email"` ou `class="login-form__email-field"`. Quand ces identifiants changent lors d'une refonte, l'agent ne le remarque pas parce qu'il ne s'en était jamais appuyé.

### Sécurité de domaine partagée

La navigation du navigateur partage la même configuration de sécurité de domaine que les opérations de récupération web. Un seul bloc de configuration dans `triggerfish.yaml` définit les listes de refus SSRF, les listes d'autorisation de domaines, les listes de refus de domaines et les mappings domaine-vers-classification. Quand l'agent navigue vers un portail fournisseur classifié à CONFIDENTIAL, le taint de session augmente automatiquement à CONFIDENTIAL, et toutes les actions suivantes dans ce flux de travail sont soumises aux restrictions de niveau CONFIDENTIAL.

La liste de refus SSRF est codée en dur et non remplaçable. Les plages d'IP privées, les adresses link-local et les points de terminaison de métadonnées cloud sont toujours bloqués. La résolution DNS est vérifiée avant la requête, empêchant les attaques de rebinding DNS. Cela compte parce que l'automatisation du navigateur est la surface d'attaque la plus risquée dans tout système d'agent. Une page malveillante qui essaie de rediriger l'agent vers un service interne est bloquée avant que la requête ne quitte le système.

### Tatouage du profil de navigateur

Chaque agent maintient son propre profil de navigateur, qui accumule des cookies, du stockage local et des données de session au fur et à mesure qu'il interagit avec des portails au fil du temps. Le profil porte un tatouage de classification qui enregistre le niveau de classification le plus élevé auquel il a été utilisé. Ce tatouage ne peut qu'augmenter, jamais diminuer.

Si un agent utilise son profil de navigateur pour se connecter à un portail fournisseur CONFIDENTIAL, le profil est tatoué à CONFIDENTIAL. Une session suivante s'exécutant à classification PUBLIC ne peut pas utiliser ce profil, empêchant les fuites de données via les credentials en cache, les cookies ou les tokens de session qui pourraient contenir des informations sensibles. L'isolation du profil est par agent, et l'application du tatouage est automatique.

Cela résout un problème subtil mais important dans l'automatisation des portails. Les profils de navigateur accumulent un état qui reflète les données auxquelles ils ont accédé. Sans tatouage, un profil qui s'est connecté à un portail sensible pourrait divulguer des informations via des suggestions de saisie automatique, des données de page en cache ou des cookies persistants vers une session de classification inférieure.

### Gestion des identifiants

Les identifiants de portail sont stockés dans le trousseau du système d'exploitation (niveau personnel) ou dans le coffre-fort d'entreprise (niveau enterprise), jamais dans des fichiers de configuration ou des variables d'environnement. Le hook SECRET_ACCESS journalise chaque récupération d'identifiants. Les identifiants sont résolus au moment de l'exécution par le moteur de flux de travail et injectés dans les sessions de navigateur via l'interface de frappe, pas en définissant les valeurs de formulaire de manière programmatique. Cela signifie que les identifiants circulent à travers la même couche de sécurité que toute autre opération sensible.

### Résilience aux changements courants de portails

Voici ce qui se passe lors des changements courants de portails :

**Refonte de la page de connexion.** L'agent prend un nouvel instantané, identifie la disposition mise à jour, et trouve les champs de formulaire par contexte visuel. À moins que le portail n'ait basculé vers une méthode d'authentification entièrement différente (SAML, OAuth, jeton matériel), la connexion continue de fonctionner sans aucun changement de configuration.

**Restructuration de la navigation.** L'agent lit la page après connexion et navigue vers la section cible en fonction du texte des liens, des étiquettes de menu et des en-têtes de page plutôt que des schémas d'URL. Si le portail fournisseur a déplacé "Statut de commande" de la barre latérale gauche vers un menu déroulant de navigation supérieure, l'agent le trouve là.

**Nouvelle bannière de consentement aux cookies.** L'agent voit la bannière, identifie le bouton accepter/ignorer, clique dessus et continue avec la tâche originale. C'est géré par la compréhension générale de la page par le LLM, pas par un gestionnaire spécial de cookies.

**CAPTCHA ajouté.** C'est là que l'approche a des limites honnêtes. Les CAPTCHA simples basés sur des images peuvent être solubles selon les capacités de vision du LLM, mais reCAPTCHA v3 et les systèmes d'analyse comportementale similaires peuvent bloquer les navigateurs automatisés. Le flux de travail route ces cas vers une file d'intervention humaine plutôt que d'échouer silencieusement.

**Invites d'authentification multi-facteurs.** Si le portail commence à nécessiter MFA qui n'était pas précédemment requis, l'agent détecte la page inattendue, signale la situation via le système de notification, et met le flux de travail en pause jusqu'à ce qu'un humain complète l'étape MFA. Le flux de travail peut être configuré pour attendre la complétion du MFA et reprendre là où il s'était arrêté.

### Traitement par lot sur plusieurs portails

Le support des boucles `for` du moteur de flux de travail signifie qu'un seul flux de travail peut itérer sur plusieurs cibles de portail. Un service de vérification des accréditations peut définir un flux de travail qui vérifie le statut des licences dans les cinquante conseils médicaux d'État lors d'une seule exécution par lot. Chaque interaction de portail s'exécute comme une sous-étape séparée avec sa propre session de navigateur, son propre suivi de classification et sa propre gestion des erreurs. Si trois portails sur cinquante échouent, le flux de travail complète les quarante-sept autres et route les trois échecs vers une file de révision avec un contexte d'erreur détaillé.

## À quoi ça ressemble en pratique

Une organisation d'accréditation vérifie les licences des prestataires de soins de santé dans les conseils médicaux d'État dans le cadre du processus d'inscription des prestataires. Traditionnellement, les assistants de vérification se connectent manuellement au site de chaque conseil, recherchent le prestataire, font une capture d'écran du statut de la licence, et saisissent les données dans le système d'accréditation. Chaque vérification prend cinq à quinze minutes, et l'organisation en traite des centaines par semaine.

Avec Triggerfish, un flux de travail gère le cycle de vérification complet. Le flux de travail reçoit un lot de prestataires avec leurs numéros de licence et leurs États cibles. Pour chaque prestataire, l'automatisation du navigateur navigue vers le portail du conseil d'État concerné, se connecte avec des identifiants stockés, recherche le prestataire, extrait le statut de la licence et la date d'expiration, et stocke le résultat. Les données extraites sont classifiées à CONFIDENTIAL parce qu'elles contiennent des PII de prestataire, et les règles de write-down empêchent qu'elles soient envoyées à tout canal en dessous de ce niveau de classification.

Quand un conseil d'État refait son portail, l'agent s'adapte lors de la prochaine tentative de vérification. Quand un conseil ajoute un CAPTCHA qui bloque l'accès automatisé, le flux de travail signale cet État pour une vérification manuelle et continue de traiter le reste du lot. Les assistants de vérification passent de faire toutes les vérifications manuellement à ne gérer que les exceptions que l'automatisation ne peut pas résoudre.
