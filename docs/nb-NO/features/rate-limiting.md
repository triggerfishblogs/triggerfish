# Hastighetsbegrensning

Triggerfish inkluderer en glidende-vindu hastighetsbegrenser som forhindrer å
treffe LLM-leverandørens API-grenser. Den omslutter enhver leverandør transparent
— agentløkken trenger ikke å kjenne til hastighetsbegrensninger. Når kapasiteten
er oppbrukt, forsinkes kall automatisk inntil vinduet skyves nok til å frigjøre
kapasitet.

## Slik fungerer det

Hastighetsbegrenseren bruker et glidende vindu (standard 60 sekunder) for å
spore to metrikker:

- **Tokens per minutt (TPM)** — totale tokens forbrukt (prompt + fullføring)
  innenfor vinduet
- **Forespørsler per minutt (RPM)** — totale API-kall innenfor vinduet

Før hvert LLM-kall sjekker begrenseren tilgjengelig kapasitet mot begge grensene.
Hvis enten er oppbrukt, venter kallet til de eldste oppføringene skyver ut av
vinduet og frigjør nok kapasitet. Etter at hvert kall fullføres, registreres
faktisk tokenbruk.

Både strømmende og ikke-strømmende kall forbruker fra det samme budsjettet.
For strømmende kall registreres tokenbruk når strømmen er ferdig.

<img src="/diagrams/rate-limiter-flow.svg" alt="Rate limiter flow: Agent Loop → Rate Limiter → capacity check → forward to provider or wait" style="max-width: 100%;" />

## OpenAI-tiernivågrenser

Hastighetsbegrenseren leveres med innebygde standarder for OpenAIs publiserte
tiernivågrenser:

| Tier   | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Free   | 30 000     | 500        | 30 000  | 500    |
| Tier 1 | 30 000     | 500        | 30 000  | 500    |
| Tier 2 | 450 000    | 5 000      | 100 000 | 1 000  |
| Tier 3 | 800 000    | 5 000      | 100 000 | 1 000  |
| Tier 4 | 2 000 000  | 10 000     | 200 000 | 10 000 |
| Tier 5 | 30 000 000 | 10 000     | 200 000 | 10 000 |

::: warning Disse er standarder basert på OpenAIs publiserte grenser. De faktiske
grensene dine avhenger av OpenAI-kontonivå og brukshistorikk. Andre leverandører
(Anthropic, Google) administrerer sine egne hastighetsbegrensninger på
serversiden — begrenseren er mest nyttig for OpenAI der klientsidetrykking
forhindrer 429-feil. :::

## Konfigurasjon

Hastighetsbegrensning er automatisk når du bruker den innpakkede leverandøren.
Ingen brukerkonfigurasjon er nødvendig for standardatferd. Begrenseren oppdager
leverandøren din og anvender passende grenser.

Avanserte brukere kan tilpasse grenser via leverandørkonfigurasjonen i
`triggerfish.yaml`:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens per minutt
        rpm: 5000 # Forespørsler per minutt
        window_ms: 60000 # Vinduestørrelse (standard 60s)
```

::: info Hastighetsbegrensning beskytter deg mot 429-feil og uventede regninger.
Den fungerer sammen med failover-kjeden — hvis hastighetsbegrensninger nås og
begrenseren ikke kan vente (tidsavbrudd), sparkes failover i gang for å prøve
neste leverandør. :::

## Overvåke bruk

Hastighetsbegrenseren eksponerer et live øyeblikksbilde av gjeldende bruk:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

Kontekstfremdriftslinjen i CLI og Tide Pool viser kontekstbruk. Hastighetsbegrensningsstatus
er synlig i feilsøkingslogger:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Når begrenseren forsinker et kall, loggfører den ventetiden:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Kanal-hastighetsbegrensning

I tillegg til LLM-leverandørens hastighetsbegrensning håndhever Triggerfish
per-kanal meldingshastighetsbegrensninger for å forhindre overbelastning av
meldingsplattformer. Hver kanaladapter sporer utgående meldingsfrekvens og
forsinker sendinger når grenser nærmes.

Dette beskytter mot:

- Plattform-API-forbud fra for høyt meldingsvolum
- Utilsiktet spam fra løpende agentløkker
- Webhook-utløste meldingsstormer

Kanal-hastighetsbegrensninger håndheves transparent av kanalruteren. Hvis
agenten genererer utdata raskere enn kanalen tillater, køes meldinger og
leveres med maksimal tillatt hastighet.

## Relatert

- [LLM-leverandører og failover](/nb-NO/features/model-failover) — failover-kjede
  integrasjon med hastighetsbegrensning
- [Konfigurasjon](/nb-NO/guide/configuration) — fullstendig `triggerfish.yaml`-skjema
