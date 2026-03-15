# SPINE och Triggers

Triggerfish använder två markdown-filer för att definiera din agents beteende: **SPINE.md** styr vem din agent är, och **TRIGGER.md** styr vad din agent gör proaktivt. Båda är fritextformat i markdown — du skriver dem på vanligt språk.

## SPINE.md — Agentidentitet

`SPINE.md` är grunden för din agents systemprompt. Den definierar agentens namn, personlighet, uppdrag, kunskapsdomäner och gränser. Triggerfish läser in den här filen varje gång den bearbetar ett meddelande, så ändringar träder i kraft omedelbart.

### Filplats

```
~/.triggerfish/SPINE.md
```

För multi-agent-installationer har varje agent sin egen SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Komma igång

Installationsguiden (`triggerfish dive`) genererar en starter-SPINE.md baserat på dina svar. Du kan redigera den fritt när som helst — det är bara markdown.

### Skriva en effektiv SPINE.md

En bra SPINE.md är specifik. Ju mer konkret du är om din agents roll, desto bättre presterar den. Här är en rekommenderad struktur:

```markdown
# Identitet

Du är Reef, en personlig AI-assistent för Sara.

# Uppdrag

Hjälp Sara att hålla sig organiserad, informerad och produktiv. Prioritera
kalenderhantering, e-posttriagering och uppgiftsspårning.

# Kommunikationsstil

- Var kortfattad och direkt. Inga utfyllnadsord.
- Använd punktlistor för listor med 3+ objekt.
- Säg att du är osäker snarare än att gissa.
- Anpassa formaliteten till kanalen: avslappnad på WhatsApp, professionell på Slack.

# Domänkunskap

- Sara är produktchef på Acme Corp.
- Nyckelverktyg: Linear för uppgifter, Google Calendar, Gmail, Slack.
- VIP-kontakter: @chef (David Chen), @skipchef (Maria Lopez).
- Aktuella prioriteringar: Q2-färdplan, mobilapplansering.

# Gränser

- Skicka aldrig meddelanden till externa kontakter utan uttryckligt godkännande.
- Genomför aldrig ekonomiska transaktioner.
- Bekräfta alltid innan du tar bort eller ändrar kalenderhändelser.
- När du diskuterar arbetsämnen på personliga kanaler, påminn Sara om
  klassificeringsgränser.

# Svarspreferenser

- Standard är korta svar (2-3 meningar).
- Använd längre svar bara när frågan kräver det.
- För kod, inkludera korta kommentarer som förklarar viktiga beslut.
```

### Bästa praxis

::: tip **Var specifik om personligheten.** Istället för "var hjälpsam", skriv "var kortfattad, direkt och använd punktlistor för tydlighet." :::

::: tip **Inkludera kontext om ägaren.** Agenten presterar bättre när den känner till din roll, verktyg och prioriteringar. :::

::: tip **Sätt upp tydliga gränser.** Definiera vad agenten aldrig ska göra. Detta kompletterar (men ersätter inte) policymotonrs deterministiska hantering. :::

::: warning SPINE.md-instruktioner styr LLM:ens beteende men är inte säkerhetskontroller. För hanteringsbara begränsningar, använd policymotorn i `triggerfish.yaml`. Policymotorn är deterministisk och kan inte kringgås — SPINE.md-instruktioner kan det. :::

## TRIGGER.md — Proaktivt beteende

`TRIGGER.md` definierar vad din agent ska kontrollera, övervaka och agera på under periodiska uppvaknanden. Till skillnad från cron-jobb (som utför fasta uppgifter enligt ett schema) ger triggers agenten befogenhet att utvärdera förhållanden och avgöra om åtgärder behövs.

### Filplats

```
~/.triggerfish/TRIGGER.md
```

För multi-agent-installationer:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Hur Triggers fungerar

1. Triggerslingan väcker agenten med ett konfigurerat intervall (inställt i `triggerfish.yaml`)
2. Triggerfish läser in din TRIGGER.md och presenterar den för agenten
3. Agenten utvärderar varje post och vidtar åtgärder vid behov
4. Alla triggeråtgärder passerar de normala policy-hooksen
5. Triggersessionen körs med ett klassificeringstak (även konfigurerat i YAML)
6. Tysta timmar respekteras — inga triggers utlöses under dessa tider

### Triggerkonfiguration i YAML

Ange timing och begränsningar i din `triggerfish.yaml`:

```yaml
trigger:
  interval: 30m # Kontrollera var 30:e minut
  classification: INTERNAL # Max taint-tak för triggersessioner
  quiet_hours: "22:00-07:00" # Inga uppvaknanden under dessa timmar
```

### Skriva TRIGGER.md

Organisera dina triggers efter prioritet. Var specifik om vad som räknas som åtgärdsbart och vad agenten ska göra åt det.

```markdown
# Prioritetskontroller

- Olästa meddelanden på alla kanaler äldre än 1 timme — sammanfatta och notifiera
  på primärkanal.
- Kalenderkonflikter de närmaste 24 timmarna — flagga och föreslå lösning.
- Förfallna uppgifter i Linear — lista dem med antal dagar försenade.

# Övervakning

- GitHub: PR:er som väntar på min granskning — notifiera om äldre än 4 timmar.
- E-post: allt från VIP-kontakter (David Chen, Maria Lopez) — flagga för
  omedelbar notifiering oavsett tysta timmar.
- Slack: omnämnanden i #incidents-kanalen — sammanfatta och eskalera om olöst.

# Proaktivt

- Om det är morgon (7-9), förbered daglig briefing med kalender, väder och topp 3
  prioriteringar.
- Om det är fredag eftermiddag, utkast till vecklig sammanfattning av slutförda
  uppgifter och öppna poster.
- Om inkorgen överstiger 50 olästa, erbjud batchbearbetning.
```

### Exempel: Minimal TRIGGER.md

Om du vill ha en enkel startpunkt:

```markdown
# Kontrollera vid varje uppvaknande

- Olästa meddelanden äldre än 1 timme
- Kalenderhändelser de närmaste 4 timmarna
- Något brådskande i e-posten
```

### Exempel: Utvecklarfokuserad TRIGGER.md

```markdown
# Hög prioritet

- CI-fel på main-grenen — undersök och notifiera.
- PR:er som väntar på min granskning äldre än 2 timmar.
- Sentry-fel med "kritisk" allvarlighet den senaste timmen.

# Övervakning

- Dependabot PR:er — autogodkänn patch-uppdateringar, flagga minor/major.
- Byggtider som tenderar överstiga 10 minuter — rapportera veckovis.
- Öppna ärenden tilldelade till mig utan uppdateringar på 3 dagar.

# Dagligen

- Morgon: sammanfatta nattens CI-körningar och driftsättningsstatus.
- Slutet av dagen: lista PR:er jag öppnade som fortfarande väntar på granskning.
```

### Triggers och policymotorn

Alla triggeråtgärder är föremål för samma policyhantering som interaktiva konversationer:

- Varje triggeruppvaknande skapar en isolerad session med egen taint-spårning
- Klassificeringstaken i din YAML-konfiguration begränsar vilken data triggern kan komma åt
- Nedskrivningsförbudet gäller — om en trigger kommer åt konfidentiell data kan den inte skicka resultaten till en publik kanal
- Alla triggeråtgärder loggas i revisionsloggen

::: info Om TRIGGER.md saknas utlöses triggrar fortfarande med det konfigurerade intervallet. Agenten använder sin allmänna kunskap och SPINE.md för att avgöra vad som behöver uppmärksamhet. För bästa resultat, skriv en TRIGGER.md. :::

## SPINE.md kontra TRIGGER.md

| Aspekt    | SPINE.md                               | TRIGGER.md                           |
| --------- | -------------------------------------- | ------------------------------------ |
| Syfte     | Definiera vem agenten är               | Definiera vad agenten övervakar      |
| Laddas    | Varje meddelande                       | Varje triggeruppvaknande             |
| Omfång    | Alla konversationer                    | Enbart triggersessioner              |
| Påverkar  | Personlighet, kunskap, gränser         | Proaktiva kontroller och åtgärder    |
| Krävs     | Ja (genereras av dive-guiden)          | Nej (men rekommenderas)              |

## Nästa steg

- Konfigurera triggertiming och cron-jobb i din [triggerfish.yaml](./configuration)
- Lär dig alla tillgängliga CLI-kommandon i [Kommandoreferensen](./commands)
