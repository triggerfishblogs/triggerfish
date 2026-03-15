# Webhooks

Triggerfish kan inkomende gebeurtenissen accepteren van externe services, waardoor realtime reacties op e-mails, foutmeldingen, CI/CD-gebeurtenissen, kalenderwijzigingen en meer mogelijk zijn. Webhooks transformeren uw agent van een reactief vraag-en-antwoordsysteem naar een proactieve deelnemer in uw workflows.

## Hoe webhooks werken

Externe services sturen HTTP POST-verzoeken naar geregistreerde webhook-eindpunten op de Triggerfish-gateway. Elke inkomende gebeurtenis wordt geverifieerd op authenticiteit, geclassificeerd en naar de agent gerouteerd voor verwerking.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook-pijplijn: externe services sturen HTTP POST via HMAC-verificatie, classificatie, sessie-isolatie en beleidshooks naar agentverwerking" style="max-width: 100%;" />

## Ondersteunde gebeurtenisbronnen

Triggerfish kan webhooks ontvangen van elke service die HTTP-webhook-levering ondersteunt. Veelgebruikte integraties zijn:

| Bron     | Mechanisme                    | Voorbeeldgebeurtenissen                          |
| -------- | ----------------------------- | ------------------------------------------------ |
| Gmail    | Pub/Sub-pushmeldingen         | Nieuwe e-mail, labelwijziging                    |
| GitHub   | Webhook                       | PR geopend, issue-commentaar, CI-mislukking      |
| Sentry   | Webhook                       | Foutmelding, regressie gedetecteerd              |
| Stripe   | Webhook                       | Betaling ontvangen, abonnementswijziging         |
| Agenda   | Pollen of pushen              | Gebeurtenisherinnering, conflict gedetecteerd    |
| Aangepast | Generiek webhook-eindpunt    | Elke JSON-payload                                |

## Configuratie

Webhook-eindpunten worden geconfigureerd in `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret stored in OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # secret stored in OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Configuratievelden

| Veld               | Vereist | Beschrijving                                                  |
| ------------------ | :-----: | ------------------------------------------------------------- |
| `id`               |   Ja    | Unieke identificatie voor dit webhook-eindpunt                |
| `path`             |   Ja    | URL-pad waar het eindpunt is geregistreerd                    |
| `secret`           |   Ja    | Gedeeld geheim voor HMAC-handtekeningverificatie              |
| `classification`   |   Ja    | Classificatieniveau toegewezen aan gebeurtenissen van deze bron |
| `actions`          |   Ja    | Lijst met gebeurtenis-naar-taak-mappings                      |
| `actions[].event`  |   Ja    | Gebeurtenistypepatroon om te matchen                          |
| `actions[].task`   |   Ja    | Natuurlijke taal-taak voor de agent om uit te voeren          |

::: tip Webhook-geheimen worden opgeslagen in de OS-sleutelhanger. Voer `triggerfish dive` uit of configureer webhooks interactief om ze veilig in te voeren. :::

## HMAC-handtekeningverificatie

Elk inkomend webhook-verzoek wordt geverifieerd op authenticiteit via HMAC-handtekeningvalidatie voordat de payload wordt verwerkt.

### Hoe verificatie werkt

1. Externe service stuurt een webhook met een handtekeningheader (bijv. `X-Hub-Signature-256` voor GitHub)
2. Triggerfish berekent de HMAC van de verzoekbody met het geconfigureerde gedeelde geheim
3. De berekende handtekening wordt vergeleken met de handtekening in de verzoekheader
4. Als de handtekeningen niet overeenkomen, wordt het verzoek **onmiddellijk geweigerd**
5. Als geverifieerd, gaat de payload verder naar classificatie en verwerking

<img src="/diagrams/hmac-verification.svg" alt="HMAC-verificatieflow: controleer aanwezigheid handtekening, bereken HMAC, vergelijk handtekeningen, weigeren of verdergaan" style="max-width: 100%;" />

::: warning BEVEILIGING Webhook-verzoeken zonder geldige HMAC-handtekeningen worden geweigerd voordat enige verwerking plaatsvindt. Dit voorkomt dat vervalste gebeurtenissen agentacties activeren. Schakel handtekeningverificatie nooit uit in productie. :::

## Gebeurtenisverwerkingspijplijn

Zodra een webhook-gebeurtenis de handtekeningverificatie doorstaat, stroomt hij door de standaard beveiligingspijplijn:

### 1. Classificatie

De gebeurtenispayload wordt geclassificeerd op het niveau dat voor het webhook-eindpunt is geconfigureerd. Een webhook-eindpunt geconfigureerd als `CONFIDENTIAL` produceert `CONFIDENTIAL`-gebeurtenissen.

### 2. Sessie-isolatie

Elke webhook-gebeurtenis spawnt zijn eigen geïsoleerde sessie. Dit betekent:

- De gebeurtenis wordt onafhankelijk verwerkt van lopende conversaties
- Sessietaint begint vers (op het classificatieniveau van de webhook)
- Geen gegevenslekken tussen door webhook geactiveerde sessies en gebruikerssessies
- Elke sessie heeft zijn eigen taint-tracking en afkomst

### 3. PRE_CONTEXT_INJECTION-hook

De gebeurtenispayload doorloopt de `PRE_CONTEXT_INJECTION`-hook voordat hij de agentcontext ingaat. Deze hook:

- Valideert de payloadstructuur
- Past classificatie toe op alle gegevensvelden
- Maakt een afkomstrecord voor de inkomende gegevens
- Scant op injectiepatronen in stringvelden
- Kan de gebeurtenis blokkeren als beleidsregels dat voorschrijven

### 4. Agentverwerking

De agent ontvangt de geclassificeerde gebeurtenis en voert de geconfigureerde taak uit. De taak is een instructie in natuurlijke taal — de agent gebruikt zijn volledige mogelijkheden (tools, skills, browser, uitvoeringsomgeving) om hem te voltooien binnen beleidsbeperkingen.

### 5. Uitvoerlevering

Alle uitvoer van de agent (berichten, meldingen, acties) doorloopt de `PRE_OUTPUT`-hook. De No-Write-Down-regel is van toepassing: uitvoer van een door `CONFIDENTIAL`-webhook geactiveerde sessie kan niet worden gestuurd naar een `PUBLIC`-kanaal.

### 6. Audit

De volledige gebeurtenislevenscyclus wordt geregistreerd: ontvangst, verificatie, classificatie, sessieaanmaak, agentacties en uitvoerbeslissingen.

## Integratie met de planner

Webhooks integreren van nature met het [cron- en triggersysteem](/nl-NL/features/cron-and-triggers) van Triggerfish. Een webhook-gebeurtenis kan:

- **Een bestaande cron-taak eerder activeren** (bijv. een deployment-webhook activeert een onmiddellijke gezondheidscontrole)
- **Een nieuwe geplande taak aanmaken** (bijv. een kalender-webhook plant een herinnering)
- **Triggerprioriteiten bijwerken** (bijv. een Sentry-melding laat de agent foutonderzoek prioriteren bij zijn volgende trigger-wakeup)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Agent may use cron.create to schedule follow-up checks
```

## Beveiligingssamenvatting

| Besturingselement       | Beschrijving                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------- |
| HMAC-verificatie        | Alle inkomende webhooks geverifieerd vóór verwerking                                  |
| Classificatie           | Webhook-payloads geclassificeerd op het geconfigureerde niveau                        |
| Sessie-isolatie         | Elke gebeurtenis krijgt zijn eigen geïsoleerde sessie                                 |
| `PRE_CONTEXT_INJECTION` | Payload gescand en geclassificeerd vóór invoer in context                             |
| No Write-Down           | Uitvoer van hoog-classificatie-gebeurtenissen kan geen laag-classificatie-kanalen bereiken |
| Auditlogboekregistratie | Volledige gebeurtenislevenscyclus vastgelegd                                          |
| Niet publiek blootgesteld | Webhook-eindpunten zijn standaard niet blootgesteld aan het publieke internet       |

## Voorbeeld: GitHub PR-beoordelingslus

Een praktijkvoorbeeld van webhooks in actie: de agent opent een PR, waarna GitHub-webhook-gebeurtenissen de codebeoordelings-feedbacklus aansturen zonder enige pollen.

### Hoe het werkt

1. De agent maakt een feature-branch, commit code en opent een PR via `gh pr create`
2. De agent schrijft een trackingbestand naar `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` met de branchnaam, PR-nummer en taakontext
3. De agent stopt en wacht — geen pollen

Wanneer een reviewer feedback plaatst:

4. GitHub stuurt een `pull_request_review`-webhook naar Triggerfish
5. Triggerfish verifieert de HMAC-handtekening, classificeert de gebeurtenis en spawnt een geïsoleerde sessie
6. De agent leest het trackingbestand om context te herstellen, checkt de branch uit, verwerkt de beoordeling, commit, pusht en plaatst een commentaar op de PR
7. Stappen 4-6 herhalen zich totdat de beoordeling is goedgekeurd

Wanneer de PR wordt samengevoegd:

8. GitHub stuurt een `pull_request.closed`-webhook met `merged: true`
9. De agent ruimt op: verwijdert de lokale branch, archiveert het trackingbestand

### Configuratie

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret stored in OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

De GitHub-webhook moet versturen: `Pull requests`, `Pull request reviews`, `Pull request review comments` en `Issue comments`.

Zie de volledige [GitHub-integratiehandleiding](/nl-NL/integrations/github) voor installatie-instructies en de gebundelde `git-branch-management`-skill voor de complete agentworkflow.

### Enterprise-besturingselementen

- **Webhook-toestaan-lijst** beheerd door beheerder — alleen goedgekeurde externe bronnen kunnen eindpunten registreren
- **Snelheidsbegrenzing** per eindpunt om misbruik te voorkomen
- **Payloadgroottebeperkingen** om geheugenuitputting te voorkomen
- **IP-toestaan-lijst** voor aanvullende bronverificatie
- **Bewaarbeleid** voor webhook-gebeurtenislogboeken

::: info Webhook-eindpunten zijn standaard niet blootgesteld aan het publieke internet. Om externe services uw Triggerfish-instantie te laten bereiken, moet u poortdoorschakeling, een reverse proxy of een tunnel configureren. Het [externe toegangs](/nl-NL/reference/)-gedeelte van de documentatie behandelt veilige blootstellingsopties. :::
