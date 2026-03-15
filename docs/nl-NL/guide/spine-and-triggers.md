# SPINE en Triggers

Triggerfish gebruikt twee markdownbestanden om het gedrag van uw agent te definiëren: **SPINE.md** bepaalt wie uw agent is, en **TRIGGER.md** bepaalt wat uw agent proactief doet. Beide zijn vrije markdown — u schrijft ze in gewone taal.

## SPINE.md — Agent-identiteit

`SPINE.md` is de basis van de systeemprompt van uw agent. Het definieert de naam, persoonlijkheid, missie, kennisdomeinen en grenzen van de agent. Triggerfish laadt dit bestand elke keer dat het een bericht verwerkt, zodat wijzigingen direct effect hebben.

### Bestandslocatie

```
~/.triggerfish/SPINE.md
```

Voor multi-agent-instellingen heeft elke agent zijn eigen SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Aan de slag

De installatiewizard (`triggerfish dive`) genereert een startende SPINE.md op basis van uw antwoorden. U kunt het op elk moment vrij bewerken — het is gewoon markdown.

### Een effectieve SPINE.md schrijven

Een goede SPINE.md is specifiek. Hoe concreter u bent over de rol van uw agent, hoe beter die presteert. Hier is een aanbevolen structuur:

```markdown
# Identiteit

U bent Reef, een persoonlijke AI-assistent voor Sarah.

# Missie

Help Sarah georganiseerd, geïnformeerd en productief te blijven. Prioriteer agendabeheer, e-mailtriagering en taakbeheer.

# Communicatiestijl

- Wees beknopt en direct. Geen opvulling.
- Gebruik opsommingstekens voor lijsten van 3+ items.
- Geef bij onzekerheid aan dat u het niet weet in plaats van te gokken.
- Pas de formaliteit aan het kanaal aan: informeel op WhatsApp, professioneel op Slack.

# Domeinkennis

- Sarah is productmanager bij Acme Corp.
- Belangrijkste tools: Linear voor taken, Google Agenda, Gmail, Slack.
- VIP-contacten: @baas (David Chen), @skip (Maria Lopez).
- Huidige prioriteiten: Q2-roadmap, lancering mobiele app.

# Grenzen

- Stuur nooit berichten naar externe contacten zonder expliciete goedkeuring.
- Voer nooit financiële transacties uit.
- Bevestig altijd voordat u agenda-evenementen verwijdert of wijzigt.
- Herinner Sarah bij het bespreken van werkomderwerpen op persoonlijke kanalen aan classificatiegrenzen.

# Antwoordvoorkeuren

- Standaard korte antwoorden (2-3 zinnen).
- Gebruik langere antwoorden alleen wanneer de vraag detail vereist.
- Voeg bij code korte opmerkingen toe die de belangrijkste beslissingen uitleggen.
```

### Beste praktijken

::: tip **Wees specifiek over persoonlijkheid.** In plaats van "wees behulpzaam", schrijf "wees beknopt, direct en gebruik opsommingstekens voor duidelijkheid." :::

::: tip **Voeg context over de eigenaar toe.** De agent presteert beter wanneer die uw rol, tools en prioriteiten kent. :::

::: tip **Stel expliciete grenzen in.** Definieer wat de agent nooit mag doen. Dit vormt een aanvulling op (maar vervangt niet) de deterministische handhaving door de beleidsengine. :::

::: warning SPINE.md-instructies sturen het gedrag van het LLM, maar zijn geen beveiligingscontroles. Voor afdwingbare beperkingen gebruikt u de beleidsengine in `triggerfish.yaml`. De beleidsengine is deterministisch en kan niet worden omzeild — SPINE.md-instructies wel. :::

## TRIGGER.md — Proactief gedrag

`TRIGGER.md` definieert wat uw agent moet controleren, bewaken en uitvoeren tijdens periodieke activeringen. In tegenstelling tot cron-jobs (die vaste taken op een schema uitvoeren), geven triggers de agent de vrijheid om voorwaarden te evalueren en te beslissen of actie nodig is.

### Bestandslocatie

```
~/.triggerfish/TRIGGER.md
```

Voor multi-agent-instellingen:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Hoe triggers werken

1. De triggerlus wekt de agent op met een geconfigureerd interval (ingesteld in `triggerfish.yaml`)
2. Triggerfish laadt uw TRIGGER.md en presenteert deze aan de agent
3. De agent evalueert elk item en neemt actie indien nodig
4. Alle triggeracties worden via de normale beleidshooks uitgevoerd
5. De triggersessie draait met een classificatieplafond (ook geconfigureerd in YAML)
6. Stille uren worden gerespecteerd — er worden geen triggers geactiveerd gedurende die tijden

### Triggerconfiguratie in YAML

Stel de timing en beperkingen in uw `triggerfish.yaml` in:

```yaml
trigger:
  interval: 30m # Elke 30 minuten controleren
  classification: INTERNAL # Maximaal taint-plafond voor triggersessies
  quiet_hours: "22:00-07:00" # Geen activeringen gedurende deze uren
```

### TRIGGER.md schrijven

Organiseer uw triggers op prioriteit. Wees specifiek over wat als uitvoerbaar wordt beschouwd en wat de agent eraan moet doen.

```markdown
# Prioriteitscontroles

- Ongelezen berichten op alle kanalen ouder dan 1 uur — samenvatten en melden op primair kanaal.
- Agendaconflicten in de komende 24 uur — markeren en oplossing voorstellen.
- Achterstallige taken in Linear — een lijst met dagen achterstand.

# Bewaking

- GitHub: PR's die op mijn beoordeling wachten — melden als ouder dan 4 uur.
- E-mail: alles van VIP-contacten (David Chen, Maria Lopez) — markeren voor onmiddellijke melding, ongeacht stille uren.
- Slack: vermeldingen in het kanaal #incidenten — samenvatten en escaleren indien onopgelost.

# Proactief

- Als het ochtend is (7-9 uur), dagelijks overzicht opstellen met agenda, weer en top 3 prioriteiten.
- Als het vrijdagmiddag is, wekelijks overzicht van voltooide taken en openstaande items opstellen.
- Als het aantal ongelezen e-mails hoger is dan 50, aanbieden om in batch te triageren.
```

### Voorbeeld: Minimale TRIGGER.md

Als u een eenvoudig startpunt wilt:

```markdown
# Controleer bij elke activering

- Ongelezen berichten ouder dan 1 uur
- Agenda-evenementen in de komende 4 uur
- Iets dringends in de e-mail
```

### Voorbeeld: Op ontwikkelaar gerichte TRIGGER.md

```markdown
# Hoge prioriteit

- CI-fouten op de main-branch — onderzoeken en melden.
- PR's die langer dan 2 uur op mijn beoordeling wachten.
- Sentry-fouten met "kritieke" ernst in het afgelopen uur.

# Bewaking

- Dependabot-PR's — patch-updates automatisch goedkeuren, minor/major markeren.
- Buildtijden die hoger zijn dan 10 minuten — wekelijks rapporteren.
- Open issues die aan mij zijn toegewezen zonder updates gedurende 3 dagen.

# Dagelijks

- Ochtend: een overzicht geven van nachtelijke CI-runs en de implementatiestatus.
- Einde van de dag: een lijst met PR's die ik heb geopend en die nog wachten op beoordeling.
```

### Triggers en de beleidsengine

Alle triggeracties zijn onderworpen aan dezelfde beleidshandhaving als interactieve gesprekken:

- Elke triggeractivering spawnt een geïsoleerde sessie met zijn eigen taint-tracking
- Het classificatieplafond in uw YAML-configuratie beperkt welke gegevens de trigger kan raadplegen
- De no-write-down-regel is van toepassing — als een trigger vertrouwelijke gegevens raadpleegt, kan het de resultaten niet naar een openbaar kanaal sturen
- Alle triggeracties worden vastgelegd in de audittrail

::: info Als TRIGGER.md afwezig is, vinden triggeractivering nog steeds plaats met het geconfigureerde interval. De agent gebruikt zijn algemene kennis en SPINE.md om te beslissen wat aandacht nodig heeft. Voor de beste resultaten schrijft u een TRIGGER.md. :::

## SPINE.md versus TRIGGER.md

| Aspect     | SPINE.md                                | TRIGGER.md                           |
| ---------- | --------------------------------------- | ------------------------------------ |
| Doel       | Wie de agent is definiëren              | Wat de agent bewaakt definiëren      |
| Geladen    | Bij elk bericht                         | Bij elke triggeractivering           |
| Bereik     | Alle gesprekken                         | Alleen triggersessies                |
| Beïnvloedt | Persoonlijkheid, kennis, grenzen        | Proactieve controles en acties       |
| Vereist    | Ja (gegenereerd door dive-wizard)       | Nee (maar aanbevolen)                |

## Volgende stappen

- Configureer triggertiming en cron-jobs in uw [triggerfish.yaml](./configuration)
- Leer alle beschikbare CLI-opdrachten kennen in de [Opdrachtreference](./commands)
