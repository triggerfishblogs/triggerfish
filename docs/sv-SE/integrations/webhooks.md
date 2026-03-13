# Webhooks

Triggerfish kan ta emot inkommande händelser från externa tjänster, vilket möjliggör realtidsreaktioner på e-post, felaviseringar, CI/CD-händelser, kalenderändringar och mer. Webhooks förvandlar din agent från ett reaktivt fråge-svar-system till en proaktiv deltagare i dina arbetsflöden.

## Hur webhooks fungerar

Externa tjänster skickar HTTP POST-begäranden till registrerade webhook-slutpunkter på Triggerfish-gatewayen. Varje inkommande händelse verifieras för autenticitet, klassificeras och dirigeras till agenten för bearbetning.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook-pipeline: externa tjänster skickar HTTP POST via HMAC-verifiering, klassificering, sessionsisolering och policykrokar till agentbearbetning" style="max-width: 100%;" />

## Stödda händelsekällor

Triggerfish kan ta emot webhooks från alla tjänster som stöder HTTP webhook-leverans. Vanliga integrationer inkluderar:

| Källa    | Mekanism                    | Exempelhändelser                              |
| -------- | --------------------------- | --------------------------------------------- |
| Gmail    | Pub/Sub push-notifikationer | Ny e-post, etikettändring                     |
| GitHub   | Webhook                     | PR öppnad, ärendekommentar, CI-misslyckande   |
| Sentry   | Webhook                     | Felavvisering, regression identifierad        |
| Stripe   | Webhook                     | Betalning mottagen, prenumerationsändring     |
| Kalender | Polling eller push           | Händelsepåminnelse, konflikt identifierad     |
| Anpassad | Generisk webhook-slutpunkt  | Valfri JSON-nyttolast                         |

## Konfiguration

Webhook-slutpunkter konfigureras i `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # hemlighet lagrad i OS-nyckelring
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # hemlighet lagrad i OS-nyckelring
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # hemlighet lagrad i OS-nyckelring
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Konfigurationsfält

| Fält              | Obligatorisk | Beskrivning                                                |
| ----------------- | :----------: | ---------------------------------------------------------- |
| `id`              |     Ja       | Unikt identifierare för denna webhook-slutpunkt            |
| `path`            |     Ja       | URL-sökväg där slutpunkten är registrerad                  |
| `secret`          |     Ja       | Delad hemlighet för HMAC-signaturverifiering               |
| `classification`  |     Ja       | Klassificeringsnivå tilldelad händelser från denna källa  |
| `actions`         |     Ja       | Lista med händelse-till-uppgift-mappningar                 |
| `actions[].event` |     Ja       | Händelsetypmönster att matcha                              |
| `actions[].task`  |     Ja       | Naturspråksuppgift för agenten att utföra                  |

::: tip Webhook-hemligheter lagras i OS-nyckelringen. Kör `triggerfish dive` eller konfigurera webhooks interaktivt för att ange dem säkert. :::

## HMAC-signaturverifiering

Varje inkommande webhook-begäran verifieras för autenticitet med HMAC-signaturvalidering innan nyttolasten bearbetas.

### Hur verifiering fungerar

1. Extern tjänst skickar en webhook med ett signaturhuvud (till exempel `X-Hub-Signature-256` för GitHub)
2. Triggerfish beräknar HMAC för begäranens kropp med den konfigurerade delade hemligheten
3. Den beräknade signaturen jämförs med signaturen i begäranshuvudet
4. Om signaturerna inte matchar **avvisas** begäran omedelbart
5. Om verifierad fortsätter nyttolasten till klassificering och bearbetning

<img src="/diagrams/hmac-verification.svg" alt="HMAC-verifieringsflöde: kontrollera signaturförekomst, beräkna HMAC, jämför signaturer, avvisa eller fortsätt" style="max-width: 100%;" />

::: warning SÄKERHET Webhook-begäranden utan giltiga HMAC-signaturer avvisas innan någon bearbetning sker. Det förhindrar förfalskade händelser från att utlösa agentåtgärder. Inaktivera aldrig signaturverifiering i produktion. :::

## Händelsebearbetningspipeline

När en webhook-händelse passerat signaturverifiering flödar den genom standardsäkerhetspipelinen:

### 1. Klassificering

Händelsenyttolasten klassificeras på nivån konfigurerad för webhook-slutpunkten. En webhook-slutpunkt konfigurerad som `CONFIDENTIAL` producerar `CONFIDENTIAL`-händelser.

### 2. Sessionsisolering

Varje webhook-händelse skapar sin egen isolerade session. Det innebär:

- Händelsen bearbetas oberoende av pågående konversationer
- Sessions-taint börjar fräscht (vid webhookens klassificeringsnivå)
- Ingen dataläcka mellan webhook-utlösta sessioner och användarsessioner
- Varje session får sin egen taint-spårning och härstamning

### 3. PRE_CONTEXT_INJECTION-krok

Händelsenyttolasten passerar genom `PRE_CONTEXT_INJECTION`-kroken innan den träder in i agentkontexten. Denna krok:

- Validerar nyttolastens struktur
- Tillämpar klassificering på alla datafält
- Skapar en härstamningspost för inkommande data
- Skannar efter injectionsmönster i strängfält
- Kan blockera händelsen om policyregler dikterar

### 4. Agentbearbetning

Agenten tar emot den klassificerade händelsen och utför den konfigurerade uppgiften. Uppgiften är en naturspråksinstruktion — agenten använder sina fullständiga funktioner (verktyg, kunskaper, webbläsare, exec-miljön) för att slutföra den inom policybegränsningar.

### 5. Utdataleverans

All utdata från agenten (meddelanden, notifikationer, åtgärder) passerar genom `PRE_OUTPUT`-kroken. Nedskrivningsregeln gäller: utdata från en `CONFIDENTIAL` webhook-utlöst session kan inte skickas till en `PUBLIC`-kanal.

### 6. Granskning

Den kompletta händelselivscykeln loggas: mottagande, verifiering, klassificering, sessionsskapande, agentåtgärder och utdatabeslut.

## Integration med schemaläggaren

Webhooks integreras naturligt med Triggerfishs [cron- och triggersystem](/sv-SE/features/cron-and-triggers). En webhook-händelse kan:

- **Utlösa ett befintligt cron-jobb** före schemat (till exempel utlöser en driftsättningswebhook en omedelbar hälsokontroll)
- **Skapa en ny schemalagd uppgift** (till exempel schemalägger en kalenderwebhook en påminnelse)
- **Uppdatera triggerprioriteter** (till exempel gör en Sentry-avisering att agenten prioriterar felutredning vid nästa triggervaknat)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # hemlighet lagrad i OS-nyckelring
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # Agenten kan använda cron.create för att schemalägga uppföljningskontroller
```

## Säkerhetssammanfattning

| Kontroll                | Beskrivning                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------ |
| HMAC-verifiering        | Alla inkommande webhooks verifieras före bearbetning                                 |
| Klassificering          | Webhook-nyttolaster klassificeras på konfigurerad nivå                               |
| Sessionsisolering       | Varje händelse får sin egen isolerade session                                        |
| `PRE_CONTEXT_INJECTION` | Nyttolast skannas och klassificeras innan den träder in i kontexten                  |
| Nedskrivningsregeln     | Utdata från högklassificerade händelser kan inte nå lågklassificerade kanaler        |
| Granskningsloggning     | Komplett händelselivscykel registrerad                                               |
| Ej offentligt exponerad | Webhook-slutpunkter exponeras inte till det offentliga internet som standard         |

## Exempel: GitHub PR-granskningsslinga

Ett verkligt exempel på webhooks i praktiken: agenten öppnar en PR, sedan driver GitHub webhook-händelser kodgranskningsfeedbackslingan utan pollning.

### Hur det fungerar

1. Agenten skapar en funktionsgren, commitar kod och öppnar en PR via `gh pr create`
2. Agenten skriver en spårningsfil till `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` med grennamnet, PR-numret och uppgiftskontexten
3. Agenten stannar och väntar — ingen pollning

När en granskare publicerar feedback:

4. GitHub skickar en `pull_request_review`-webhook till Triggerfish
5. Triggerfish verifierar HMAC-signaturen, klassificerar händelsen och skapar en isolerad session
6. Agenten läser spårningsfilen för att återhämta kontexten, checkar ut grenen, åtgärdar granskningen, commitar, pushar och kommenterar på PR:en
7. Steg 4–6 upprepas tills granskningen godkänns

När PR:en mergas:

8. GitHub skickar en `pull_request.closed`-webhook med `merged: true`
9. Agenten städar upp: tar bort den lokala grenen, arkiverar spårningsfilen

### Konfiguration

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # hemlighet lagrad i OS-nyckelring
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

GitHub-webhooken måste skicka: `Pull requests`, `Pull request reviews`, `Pull request review comments` och `Issue comments`.

Se den fullständiga [GitHub-integrationsguiden](/sv-SE/integrations/github) för installationsinstruktioner och `git-branch-management`-kunskapen för det kompletta agentarbetsflödet.

### Företagskontroller

- **Webhook-tillåtlista** hanterad av administratören — bara godkända externa källor kan registrera slutpunkter
- **Hastighetsbegränsning** per slutpunkt för att förhindra missbruk
- **Nyttolaststorleksgränser** för att förhindra minnesutmattning
- **IP-tillåtlistning** för ytterligare källverifiering
- **Kvarhållningspolicyer** för webhook-händelseloggar

::: info Webhook-slutpunkter exponeras inte till det offentliga internet som standard. För att externa tjänster ska nå din Triggerfish-instans behöver du konfigurera portvidarebefordran, en omvänd proxy eller en tunnel. Avsnittet [Fjärråtkomst](/sv-SE/integrations/remote) i dokumentationen täcker säkra exponeringsalternativ. :::
