---
layout: home

hero:
  name: Triggerfish
  text: Agents IA sécurisés
  tagline: Application déterministe des politiques en dessous de la couche LLM. Chaque canal. Sans exception.
  image:
    src: /triggerfish.png
    alt: Triggerfish — parcourant l'océan numérique
  actions:
    - theme: brand
      text: Commencer
      link: /fr-FR/guide/
    - theme: alt
      text: Tarifs
      link: /fr-FR/pricing
    - theme: alt
      text: Voir sur GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: Sécurité en dessous du LLM
    details: Application déterministe des politiques sous le LLM. Des hooks en code pur que l'IA ne peut ni contourner, ni outrepasser, ni influencer. Même entrée, même décision, à chaque fois.
  - icon: "\U0001F4AC"
    title: Tous vos canaux
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — tous avec une classification par canal et un suivi automatique du taint.
  - icon: "\U0001F528"
    title: Construisez n'importe quoi
    details: Environnement d'exécution d'agent avec une boucle écriture/exécution/correction. Skills auto-générés. The Reef, le marketplace pour découvrir et partager des capacités.
  - icon: "\U0001F916"
    title: N'importe quel fournisseur LLM
    details: Anthropic, OpenAI, Google Gemini, modèles locaux via Ollama, OpenRouter. Chaînes de basculement automatique. Ou choisissez Triggerfish Gateway — aucune clé API nécessaire.
  - icon: "\U0001F3AF"
    title: Proactif par défaut
    details: Tâches cron, triggers et webhooks. Votre agent surveille, vérifie et agit de manière autonome — dans les limites strictes de la politique.
  - icon: "\U0001F310"
    title: Open Source
    details: Licence Apache 2.0. Les composants critiques de sécurité sont entièrement ouverts à l'audit. Ne nous faites pas confiance — vérifiez le code.
---

<LatestRelease />

## Installez en une seule commande

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

Les installateurs binaires téléchargent une version pré-compilée, vérifient sa
somme de contrôle et lancent l'assistant de configuration. Consultez le
[guide d'installation](/fr-FR/guide/installation) pour la configuration Docker,
la compilation depuis les sources et le processus de publication.

Vous ne souhaitez pas gérer des clés API ? [Voir les tarifs](/fr-FR/pricing)
pour Triggerfish Gateway — infrastructure LLM et recherche gérée, prête en
quelques minutes.

## Comment ça fonctionne

Triggerfish place une couche de politique déterministe entre votre agent IA et
tout ce qu'il touche. Le LLM propose des actions — des hooks en code pur
décident si elles sont autorisées.

- **Politique déterministe** — Les décisions de sécurité sont du code pur. Pas
  d'aléatoire, pas d'influence du LLM, pas d'exception. Même entrée, même
  décision, à chaque fois.
- **Contrôle des flux d'information** — Quatre niveaux de classification
  (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) se propagent automatiquement via
  le taint de session. Les données ne peuvent jamais descendre vers un contexte
  moins sécurisé.
- **Six hooks d'application** — Chaque étape du pipeline de données est
  contrôlée : ce qui entre dans le contexte du LLM, quels outils sont appelés,
  quels résultats reviennent et ce qui quitte le système. Chaque décision est
  journalisée.
- **Refus par défaut** — Rien n'est autorisé silencieusement. Les outils,
  intégrations et sources de données non classifiés sont rejetés tant qu'ils ne
  sont pas explicitement configurés.
- **Identité de l'agent** — La mission de votre agent vit dans SPINE.md, les
  comportements proactifs dans TRIGGER.md. Les skills étendent les capacités via
  de simples conventions de dossiers. The Reef, le marketplace, vous permet de
  les découvrir et de les partager.

[En savoir plus sur l'architecture.](/fr-FR/architecture/)
