# De No-Write-Down-Regel

De no-write-down-regel is de basis van het gegevensbeschermingsmodel van Triggerfish. Het is een vaste, niet-configureerbare regel die van toepassing is op elke sessie, elk kanaal en elke agent — zonder uitzonderingen en zonder LLM-overschrijving.

**De regel:** Gegevens kunnen alleen stromen naar kanalen en ontvangers op een **gelijk of hoger** classificatieniveau.

Deze ene regel voorkomt een hele klasse van gegevenslekscenario's, van onbedoeld oversharing tot geavanceerde prompt-injectieaanvallen die zijn ontworpen om gevoelige informatie te exfiltreren.

## Hoe classificatie stroomt

Triggerfish gebruikt vier classificatieniveaus (hoogste naar laagste):

<img src="/diagrams/write-down-rules.svg" alt="No-write-down-regels: gegevens stromen alleen naar gelijke of hogere classificatieniveaus" style="max-width: 100%;" />

Gegevens die op een bepaald niveau zijn geclassificeerd, kunnen naar dat niveau of een hoger niveau stromen. Ze kunnen nooit naar beneden stromen. Dit is de no-write-down-regel.

::: danger De no-write-down-regel is **vast en niet-configureerbaar**. Hij kan niet worden versoepeld door beheerders, overschreven door beleidsregels of omzeild door het LLM. Het is de architecturale basis waarop alle andere beveiligingscontroles rusten. :::

## Effectieve classificatie

Wanneer gegevens het systeem gaan verlaten, berekent Triggerfish de **effectieve classificatie** van de bestemming:

```
EFFECTIEVE_CLASSIFICATIE = min(kanaal_classificatie, ontvanger_classificatie)
```

Zowel het kanaal als de ontvanger moeten op of boven het classificatieniveau van de gegevens zijn. Als een van de twee eronder is, wordt de uitvoer geblokkeerd.

| Kanaal                  | Ontvanger                       | Effectieve classificatie |
| ----------------------- | ------------------------------- | ------------------------ |
| INTERNAL (Slack)        | INTERNAL (collega)              | INTERNAL                 |
| INTERNAL (Slack)        | EXTERNAL (leverancier)          | PUBLIC                   |
| CONFIDENTIAL (Slack)    | INTERNAL (collega)              | INTERNAL                 |
| CONFIDENTIAL (e-mail)   | EXTERNAL (persoonlijk contact)  | PUBLIC                   |

::: info Een CONFIDENTIAL-kanaal met een EXTERNAL-ontvanger heeft een effectieve classificatie van PUBLIC. Als de sessie gegevens boven PUBLIC heeft geraadpleegd, wordt de uitvoer geblokkeerd. :::

## Praktijkvoorbeeld

Hier is een concreet scenario dat de no-write-down-regel in actie toont.

```
Gebruiker: "Controleer mijn Salesforce-pipeline"

Agent: [raadpleegt Salesforce via gedelegeerd token van gebruiker]
       [Salesforce-gegevens geclassificeerd als CONFIDENTIAL]
       [sessie-taint escaleert naar CONFIDENTIAL]

       "U heeft 3 deals die deze week sluiten voor in totaal €2,1M..."

Gebruiker: "Stuur mijn partner een bericht dat ik vanavond laat thuis kom"

Beleidslaag: GEBLOKKEERD
  - Sessie-taint: CONFIDENTIAL
  - Ontvanger (partner): EXTERNAL
  - Effectieve classificatie: PUBLIC
  - CONFIDENTIAL > PUBLIC --> write-down-schending

Agent: "Ik kan in deze sessie geen berichten naar externe contacten sturen
        omdat we vertrouwelijke gegevens hebben geraadpleegd.

        -> Sessie resetten en bericht versturen
        -> Annuleren"
```

De gebruiker heeft Salesforce-gegevens geraadpleegd (geclassificeerd als CONFIDENTIAL), waardoor de hele sessie is besmet. Toen ze vervolgens probeerden een bericht te sturen naar een extern contact (effectieve classificatie PUBLIC), blokkeerde de beleidslaag de uitvoer omdat CONFIDENTIAL-gegevens niet naar een PUBLIC-bestemming kunnen stromen.

::: tip Het bericht van de agent aan de partner ("ik kom vanavond laat") bevat zelf geen Salesforce-gegevens. Maar de sessie is besmet door de eerdere Salesforce-toegang, en de volledige sessiecontext — inclusief alles wat het LLM mogelijk heeft onthouden van het Salesforce-antwoord — kan de uitvoer beïnvloeden. De no-write-down-regel voorkomt deze hele klasse van contextlekken. :::

## Wat de gebruiker ziet

Wanneer de no-write-down-regel een actie blokkeert, ontvangt de gebruiker een duidelijk, uitvoerbaar bericht. Triggerfish biedt twee antwoordmodi:

**Standaard (specifiek):**

```
Ik kan geen vertrouwelijke gegevens naar een openbaar kanaal sturen.

-> Sessie resetten en bericht versturen
-> Annuleren
```

**Educatief (opt-in via configuratie):**

```
Ik kan geen vertrouwelijke gegevens naar een openbaar kanaal sturen.

Waarom: Deze sessie heeft Salesforce (CONFIDENTIAL) geraadpleegd.
WhatsApp persoonlijk is geclassificeerd als PUBLIC.
Gegevens kunnen alleen stromen naar een gelijke of hogere classificatie.

Opties:
  - Sessie resetten en bericht versturen
  - Uw beheerder vragen het WhatsApp-kanaal opnieuw te classificeren
  - Meer informatie: https://trigger.fish/security/no-write-down
```

In beide gevallen krijgt de gebruiker duidelijke opties. Ze worden nooit in verwarring gelaten over wat er is gebeurd of wat ze eraan kunnen doen.

## Sessiereset

Wanneer een gebruiker kiest voor "Sessie resetten en bericht versturen," voert Triggerfish een **volledige reset** uit:

1. De sessie-taint wordt teruggezet naar PUBLIC
2. De volledige gespreksgeschiedenis wordt gewist (contextlekken voorkomen)
3. De gevraagde actie wordt vervolgens opnieuw geëvalueerd aan de hand van de frisse sessie
4. Als de actie nu is toegestaan (PUBLIC-gegevens naar een PUBLIC-kanaal), gaat het door

::: warning BEVEILIGING Sessiereset wist zowel taint **als** gespreksgeschiedenis. Dit is niet optioneel. Als alleen het taint-label werd gewist terwijl de gesprekscontext bleef, zou het LLM nog steeds kunnen verwijzen naar geclassificeerde informatie uit eerdere berichten, waarmee het doel van de reset teniet wordt gedaan. :::

## Hoe handhaving werkt

De no-write-down-regel wordt gehandhaafd op de `PRE_OUTPUT`-hook — het laatste handhavingspunt voordat gegevens het systeem verlaten. De hook draait als synchrone, deterministische code:

```typescript
// Vereenvoudigde handhavingslogica
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Sessie-taint (${sessionTaint}) overschrijdt effectieve ` +
        `classificatie (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Classificatiecontrole geslaagd" };
}
```

Deze code is:

- **Deterministisch** — dezelfde invoeren leveren altijd dezelfde beslissing op
- **Synchroon** — de hook wordt voltooid voordat uitvoer wordt verzonden
- **Onvervalsbaar** — het LLM kan de beslissing van de hook niet beïnvloeden
- **Vastgelegd** — elke uitvoering wordt vastgelegd met volledige context

## Sessie-taint en escalatie

Sessie-taint volgt het hoogste classificatieniveau van gegevens die tijdens een sessie zijn geraadpleegd. Het volgt twee strikte regels:

1. **Alleen escalatie** — taint kan toenemen, nooit afnemen binnen een sessie
2. **Automatisch** — taint wordt bijgewerkt door de `POST_TOOL_RESPONSE`-hook wanneer gegevens de sessie binnenkomen

| Actie                                    | Taint voor   | Taint na                     |
| ---------------------------------------- | ------------ | ----------------------------- |
| Toegang tot weer-API (PUBLIC)            | PUBLIC       | PUBLIC                        |
| Toegang tot interne wiki (INTERNAL)      | PUBLIC       | INTERNAL                      |
| Toegang tot Salesforce (CONFIDENTIAL)    | INTERNAL     | CONFIDENTIAL                  |
| Opnieuw toegang tot weer-API (PUBLIC)    | CONFIDENTIAL | CONFIDENTIAL (ongewijzigd)    |

Zodra een sessie CONFIDENTIAL bereikt, blijft het CONFIDENTIAL totdat de gebruiker expliciet reset. Er is geen automatisch verval, geen time-out en geen manier voor het LLM om de taint te verlagen.

## Waarom deze regel vast is

De no-write-down-regel is niet configureerbaar omdat het configureerbaar maken het hele beveiligingsmodel zou ondermijnen. Als een beheerder een uitzondering kon maken — "sta toe dat CONFIDENTIAL-gegevens naar PUBLIC-kanalen stromen voor deze ene integratie" — wordt die uitzondering een aanvalsoppervlak.

Elke andere beveiligingscontrole in Triggerfish bouwt op de aanname dat de no-write-down-regel absoluut is. Sessie-taint, gegevenslineage, agentdelegatieplafonds en auditregistratie zijn er allemaal van afhankelijk. Het configureerbaar maken zou het herdenken van de hele architectuur vereisen.

::: info Beheerders **kunnen** de classificatieniveaus configureren die zijn toegewezen aan kanalen, ontvangers en integraties. Dit is de juiste manier om gegevensstromen aan te passen: als een kanaal hogere geclassificeerde gegevens moet ontvangen, classificeer het kanaal dan op een hoger niveau. De regel zelf blijft vast; de invoeren voor de regel zijn configureerbaar. :::

## Gerelateerde pagina's

- [Beveiligingsgericht ontwerp](./) — overzicht van de beveiligingsarchitectuur
- [Identiteit en authenticatie](./identity) — hoe kanaalidentiteit wordt vastgesteld
- [Audit en compliance](./audit-logging) — hoe geblokkeerde acties worden vastgelegd
- [Architectuur: Taint en sessies](/nl-NL/architecture/taint-and-sessions) — sessie-taint-mechanismen in detail
