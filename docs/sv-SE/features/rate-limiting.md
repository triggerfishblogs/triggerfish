# Hastighetsbegränsning

Triggerfish inkluderar en glidande fönster-hastighetsbegränsare som förhindrar att LLM-leverantörers API-gränser nås. Den omsluter valfri leverantör transparent — agentslingan behöver inte veta om hastighetsgränser. När kapaciteten är uttömd fördröjs anrop automatiskt tills fönstret glider tillräckligt för att frigöra kapacitet.

## Hur det fungerar

Hastighetsbegränsaren använder ett glidande fönster (standard 60 sekunder) för att spåra två mätvärden:

- **Tokens per minut (TPM)** — totala tokens förbrukade (prompt + komplettering) inom fönstret
- **Förfrågningar per minut (RPM)** — totala API-anrop inom fönstret

Före varje LLM-anrop kontrollerar begränsaren tillgänglig kapacitet mot båda gränserna. Om endera är uttömd väntar anropet tills de äldsta posterna glider ut ur fönstret och frigör tillräcklig kapacitet. Efter att varje anrop slutfört registreras faktisk tokenanvändning.

Både strömmande och icke-strömmande anrop konsumerar från samma budget. För strömmande anrop registreras tokenanvändning när strömmen avslutas.

<img src="/diagrams/rate-limiter-flow.svg" alt="Hastighetsbegränsarflöde: Agentslinga → Hastighetsbegränsare → kapacitetskontroll → vidarebefordra till leverantör eller vänta" style="max-width: 100%;" />

## OpenAI-nivåbegränsningar

Hastighetsbegränsaren levereras med inbyggda standardvärden för OpenAI:s publicerade nivågränser:

| Nivå   | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Gratis | 30 000     | 500        | 30 000  | 500    |
| Nivå 1 | 30 000     | 500        | 30 000  | 500    |
| Nivå 2 | 450 000    | 5 000      | 100 000 | 1 000  |
| Nivå 3 | 800 000    | 5 000      | 100 000 | 1 000  |
| Nivå 4 | 2 000 000  | 10 000     | 200 000 | 10 000 |
| Nivå 5 | 30 000 000 | 10 000     | 200 000 | 10 000 |

::: warning Det här är standardvärden baserade på OpenAI:s publicerade gränser. Dina faktiska gränser beror på din OpenAI-kontonivå och användningshistorik. Andra leverantörer (Anthropic, Google) hanterar sina egna hastighetsgränser på serversidan — begränsaren är mest användbar för OpenAI där begränsning på klientsidan förhindrar 429-fel. :::

## Konfiguration

Hastighetsbegränsning är automatisk när du använder den omslutna leverantören. Ingen användarkonfiguration krävs för standardbeteende. Begränsaren identifierar din leverantör och tillämpar lämpliga gränser.

Avancerade användare kan anpassa gränser via leverantörskonfigurationen i `triggerfish.yaml`:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens per minut
        rpm: 5000 # Förfrågningar per minut
        window_ms: 60000 # Fönsterstorlek (standard 60s)
```

::: info Hastighetsbegränsning skyddar dig från 429-fel och oväntade räkningar. Det fungerar tillsammans med felöverkedjan — om hastighetsgränserna nås och begränsaren inte kan vänta (timeout) aktiveras felöver för att prova nästa leverantör. :::

## Övervaka användning

Hastighetsbegränsaren exponerar en live-ögonblicksbild av aktuell användning:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

Kontextfältstapeln i CLI och Tide Pool visar kontextanvändning. Hastighetsgränsstatus är synlig i felsökningsloggar:

```
[DEBUG] [provider] Hastighetsbegränsare: 12 450/30 000 TPM, 8/500 RPM (fönster: 60s)
```

När begränsaren fördröjer ett anrop loggas väntetiden:

```
[INFO] [provider] Hastighetsbegränsad: väntar 4,2s på TPM-kapacitet
```

## Kanalhastighetsbegränsning

Förutom LLM-leverantörshastighetsbegränsning tillämpar Triggerfish per-kanal meddelandehastighetsgränser för att förhindra att meddelandeplattformar översväms. Varje kanaladapter spårar frekevens för utgående meddelanden och fördröjer sändningar när gränser nås.

Det skyddar mot:

- Plattforms-API-ban från för hög meddelandevolym
- Oavsiktlig spam från körande agentslingor
- Webhook-utlösta meddelandestormar

Kanalhastighetsgränser tillämpas transparent av kanalroutern. Om agenten genererar utdata snabbare än kanalen tillåter, köas meddelanden och levereras med maximal tillåten hastighet.

## Relaterat

- [LLM-leverantörer och felöver](/sv-SE/features/model-failover) — felöverkedjintegration med hastighetsbegränsning
- [Konfiguration](/sv-SE/guide/configuration) — fullständigt `triggerfish.yaml`-schema
