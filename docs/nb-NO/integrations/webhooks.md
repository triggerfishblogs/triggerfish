# Webhooks

Triggerfish kan akseptere innkommende hendelser fra eksterne tjenester, og gjøre det mulig å reagere i sanntid på e-poster, feilmeldinger, CI/CD-hendelser, kalenderendringer og mer. Webhooks gjør agenten din fra et reaktivt spørsmålssvaringssystem til en proaktiv deltaker i arbeidsflytene dine.

## Slik fungerer webhooks

Eksterne tjenester sender HTTP POST-forespørsler til registrerte webhook-endepunkter på Triggerfish-gatewayen. Alle innkommende hendelser verifiseres for autentisitet, klassifiseres og rutes til agenten for behandling.

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook-rørledning: eksterne tjenester sender HTTP POST gjennom HMAC-verifisering, klassifisering, sesjonsisolering og policy-hooks til agentbehandling" style="max-width: 100%;" />

## Støttede hendelseskilder

Triggerfish kan motta webhooks fra enhver tjeneste som støtter HTTP webhook-levering. Vanlige integrasjoner inkluderer:

| Kilde    | Mekanisme                   | Eksempelhendelser                               |
| -------- | --------------------------- | ----------------------------------------------- |
| Gmail    | Pub/Sub push-varslinger     | Ny e-post, etikettendring                       |
| GitHub   | Webhook                     | PR åpnet, problemkommentar, CI-feil             |
| Sentry   | Webhook                     | Feilvarsel, regresjon oppdaget                  |
| Stripe   | Webhook                     | Betaling mottatt, abonnementsendring            |
| Kalender | Polling eller push          | Hendelsespåminnelse, konflikt oppdaget          |
| Egendefinert | Generisk webhook-endepunkt | Hvilken som helst JSON-nyttelast               |

## Konfigurasjon

Webhook-endepunkter er konfigurert i `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # hemmelighet lagret i OS-nøkkelringen
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # hemmelighet lagret i OS-nøkkelringen
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # hemmelighet lagret i OS-nøkkelringen
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### Konfigurasjonsfelter

| Felt              | Påkrevd | Beskrivelse                                                         |
| ----------------- | :-----: | ------------------------------------------------------------------- |
| `id`              |   Ja    | Unik identifikator for dette webhook-endepunktet                    |
| `path`            |   Ja    | URL-sti der endepunktet er registrert                               |
| `secret`          |   Ja    | Delt hemmelighet for HMAC-signaturverifisering                      |
| `classification`  |   Ja    | Klassifiseringsnivå tildelt hendelser fra denne kilden              |
| `actions`         |   Ja    | Liste over hendelse-til-oppgave-kartlegginger                       |
| `actions[].event` |   Ja    | Hendelsestypemønster å samsvare                                     |
| `actions[].task`  |   Ja    | Naturlig språkoppgave for agenten å utføre                          |

::: tip Webhook-hemmeligheter lagres i OS-nøkkelringen. Kjør `triggerfish dive` eller konfigurer webhooks interaktivt for å angi dem sikkert. :::

## HMAC-signaturverifisering

Alle innkommende webhook-forespørsler verifiseres for autentisitet ved hjelp av HMAC-signaturvalidering før nyttelasten behandles.

### Slik fungerer verifisering

1. Ekstern tjeneste sender en webhook med en signaturhode (for eksempel `X-Hub-Signature-256` for GitHub)
2. Triggerfish beregner HMAC-en til forespørselsteksten ved hjelp av den konfigurerte delte hemmeligheten
3. Den beregnede signaturen sammenlignes med signaturen i forespørselshodet
4. Hvis signaturene ikke samsvarer, **avvises** forespørselen umiddelbart
5. Hvis verifisert, fortsetter nyttelasten til klassifisering og behandling

<img src="/diagrams/hmac-verification.svg" alt="HMAC-verifiseringsflyt: sjekk signaturet tilstedeværelse, beregn HMAC, sammenlign signaturer, avvis eller fortsett" style="max-width: 100%;" />

::: warning SIKKERHET Webhook-forespørsler uten gyldige HMAC-signaturer avvises før all behandling skjer. Dette forhindrer falske hendelser fra å utløse agenthandlinger. Deaktiver aldri signaturverifisering i produksjon. :::

## Hendelsesbehandlingsrørledning

Når en webhook-hendelse passerer signaturverifisering, flyter den gjennom standard sikkerhetssrørledning:

### 1. Klassifisering

Hendelsesnyttelasten klassifiseres på nivået konfigurert for webhook-endepunktet. Et webhook-endepunkt konfigurert som `CONFIDENTIAL` produserer `CONFIDENTIAL`-hendelser.

### 2. Sesjonsisolasjon

Alle webhook-hendelser spawner sin egen isolerte sesjon. Dette betyr:

- Hendelsen behandles uavhengig av pågående samtaler
- Session taint starter friskt (på webhookens klassifiseringsnivå)
- Ingen datalekasje mellom webhook-utløste sesjoner og brukersesjoner
- Hver sesjon får sin egen taint-sporing og lineage

### 3. PRE_CONTEXT_INJECTION-hook

Hendelsesnyttelasten passerer gjennom `PRE_CONTEXT_INJECTION`-hooken før den går inn i agentkonteksten. Denne hooken:

- Validerer nyttelaststrukturen
- Anvender klassifisering på alle datafelter
- Oppretter en linjepost for innkommende data
- Skanner etter injeksjonsmønstre i strengfelter
- Kan blokkere hendelsen hvis policy-regler dikterer det

### 4. Agentbehandling

Agenten mottar den klassifiserte hendelsen og utfører den konfigurerte oppgaven. Oppgaven er en naturlig språkinstruksjon — agenten bruker sine fulle evner (verktøy, ferdigheter, nettleser, exec-miljø) for å fullføre den innenfor policy-begrensninger.

### 5. Utdatalevering

Alle utdata fra agenten (meldinger, varsler, handlinger) passerer gjennom `PRE_OUTPUT`-hooken. No-Write-Down-regelen gjelder: utdata fra en `CONFIDENTIAL` webhook-utløst sesjon kan ikke sendes til en `PUBLIC`-kanal.

### 6. Revisjon

Det fullstendige hendelseslivssyklusen logges: mottak, verifisering, klassifisering, sesjonopprettelse, agenthandlinger og utdatabeslutninger.

## Integrasjon med planleggeren

Webhooks integreres naturlig med Triggerfish sitt [cron- og trigger-system](/nb-NO/features/cron-and-triggers). En webhook-hendelse kan:

- **Utløse en eksisterende cron-jobb** foran planen (for eksempel utløser en distribusjonswebhook en umiddelbar helsesjekk)
- **Opprette en ny planlagt oppgave** (for eksempel planlegger en kalenderwebhook en påminnelse)
- **Oppdatere trigger-prioriteter** (for eksempel gjør en Sentry-varsel agenten prioritere feilundersøkelse ved neste trigger-oppvåkning)

## Sikkerhetsoversikt

| Kontroll                | Beskrivelse                                                                      |
| ----------------------- | -------------------------------------------------------------------------------- |
| HMAC-verifisering       | Alle innkommende webhooks verifisert før behandling                              |
| Klassifisering          | Webhook-nyttelaster klassifisert på konfigurert nivå                             |
| Sesjonsisolasjon        | Hver hendelse får sin egen isolerte sesjon                                       |
| `PRE_CONTEXT_INJECTION` | Nyttelast skannet og klassifisert før den går inn i kontekst                     |
| No-Write-Down           | Utdata fra høy-klassifisering hendelser kan ikke nå lav-klassifisering kanaler   |
| Revisjonslogging        | Komplett hendelseslivssyklus registrert                                          |
| Ikke offentlig eksponert | Webhook-endepunkter er som standard ikke eksponert til det offentlige internett  |

## Eksempel: GitHub PR-gjennomgangsloop

Et virkelighetsnært eksempel på webhooks i aksjon: agenten åpner en PR, deretter driver GitHub webhook-hendelser kodegjennomgangstilbakemeldingsloopen uten polling.

Se [GitHub-integrasjonen](/nb-NO/integrations/github) for fullstendige oppsettinstruksjoner og `git-branch-management`-ferdigheten for den fullstendige agentarbeidsflyten.

### Bedriftskontroller

- **Webhook-tillatelsesliste** administrert av admin — bare godkjente eksterne kilder kan registrere endepunkter
- **Hastighetsbegrensning** per endepunkt for å forhindre misbruk
- **Nyttelaststørrelsesgrenser** for å forhindre minneutmattelse
- **IP-tillatelseslistring** for ytterligere kildeverifisering
- **Oppbevaringspolicyer** for webhook-hendelseslogger

::: info Webhook-endepunkter er som standard ikke eksponert til det offentlige internett. For at eksterne tjenester skal nå Triggerfish-instansen din, må du konfigurere portviderekobling, en omvendt proxy eller en tunnel. :::
