# Snelheidsbegrenzing

Triggerfish bevat een schuifvenster-snelheidsbegrenzer die voorkomt dat u de API-limieten van LLM-providers bereikt. Deze wrapper werkt transparant rond elke provider — de agentlus hoeft niets te weten over snelheidsbegrenzing. Wanneer de capaciteit uitgeput is, worden aanroepen automatisch vertraagd totdat het venster genoeg verschuift om capaciteit vrij te maken.

## Hoe het werkt

De snelheidsbegrenzer gebruikt een schuifvenster (standaard 60 seconden) om twee meetwaarden bij te houden:

- **Tokens per minuut (TPM)** — totaal verbruikte tokens (prompt + completering) binnen het venster
- **Aanvragen per minuut (RPM)** — totaal API-aanroepen binnen het venster

Vóór elke LLM-aanroep controleert de begrenzer de beschikbare capaciteit voor beide limieten. Als een van beide uitgeput is, wacht de aanroep totdat de oudste vermeldingen uit het venster schuiven en voldoende capaciteit vrijmaken. Na elke voltooide aanroep wordt het werkelijke tokengebruik geregistreerd.

Zowel streaming- als niet-streamingaanroepen verbruiken van hetzelfde budget. Voor streamingaanroepen wordt tokengebruik geregistreerd wanneer de stream eindigt.

<img src="/diagrams/rate-limiter-flow.svg" alt="Snelheidsbegrenzerflow: Agentlus → Snelheidsbegrenzer → capaciteitscontrole → doorsturen naar provider of wachten" style="max-width: 100%;" />

## OpenAI-tierlimieten

De snelheidsbegrenzer wordt geleverd met ingebouwde standaardwaarden voor de gepubliceerde tierlimieten van OpenAI:

| Tier   | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Free   | 30.000     | 500        | 30.000  | 500    |
| Tier 1 | 30.000     | 500        | 30.000  | 500    |
| Tier 2 | 450.000    | 5.000      | 100.000 | 1.000  |
| Tier 3 | 800.000    | 5.000      | 100.000 | 1.000  |
| Tier 4 | 2.000.000  | 10.000     | 200.000 | 10.000 |
| Tier 5 | 30.000.000 | 10.000     | 200.000 | 10.000 |

::: warning Dit zijn standaardwaarden gebaseerd op de gepubliceerde limieten van OpenAI. Uw werkelijke limieten hangen af van uw OpenAI-accounttier en gebruiksgeschiedenis. Andere providers (Anthropic, Google) beheren hun eigen snelheidslimieten aan de serverzijde — de begrenzer is het meest nuttig voor OpenAI, waar begrenzening aan de clientzijde 429-fouten voorkomt. :::

## Configuratie

Snelheidsbegrenzing is automatisch actief bij gebruik van de gewrapte provider. Er is geen gebruikersconfiguratie nodig voor standaardgedrag. De begrenzer detecteert uw provider en past de juiste limieten toe.

Gevorderde gebruikers kunnen limieten aanpassen via de providerconfiguratie in `triggerfish.yaml`:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens per minute
        rpm: 5000 # Requests per minute
        window_ms: 60000 # Window size (default 60s)
```

::: info Snelheidsbegrenzing beschermt u tegen 429-fouten en onverwachte kosten. Het werkt samen met de failoverreeks — als snelheidslimieten worden bereikt en de begrenzer niet kan wachten (timeout), treedt failover in werking om de volgende provider te proberen. :::

## Gebruik monitoren

De snelheidsbegrenzer biedt een live momentopname van het huidige gebruik:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

De contextvoortgangsbalk in de CLI en Tide Pool toont het contextgebruik. De status van de snelheidsbegrenzer is zichtbaar in debuglogboeken:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Wanneer de begrenzer een aanroep vertraagt, wordt de wachttijd geregistreerd:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Kanaalsnelheidsbegrenzing

Naast de snelheidsbegrenzing van LLM-providers hanteert Triggerfish ook berichtsnelheidslimieten per kanaal om overstroming van berichtenplatforms te voorkomen. Elke kanaaladapter houdt de frequentie van uitgaande berichten bij en vertraagt verzendingen wanneer limieten worden benaderd.

Dit beschermt tegen:

- Platformverboden door overmatig berichtvolume
- Onbedoelde spam door uitgelopen agentlussen
- Berichtstormen veroorzaakt door webhooks

Kanaalsnelheidslimieten worden transparant afgedwongen door de kanaalrouter. Als de agent uitvoer sneller genereert dan het kanaal toestaat, worden berichten in de wachtrij geplaatst en afgeleverd op de maximaal toegestane snelheid.

## Zie ook

- [LLM-providers en failover](/nl-NL/features/model-failover) — integratie van de failoverreeks met snelheidsbegrenzing
- [Configuratie](/nl-NL/guide/configuration) — volledig `triggerfish.yaml`-schema
