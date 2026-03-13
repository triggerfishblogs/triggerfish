# Nedskrivningsregeln

Nedskrivningsregeln är grunden för Triggerfish dataskyddsmodell. Det är en fast, icke-konfigurerbar regel som gäller för varje session, varje kanal och varje agent — utan undantag och utan LLM-åsidosättning.

**Regeln:** Data kan bara flöda till kanaler och mottagare vid en **lika eller högre** klassificeringsnivå.

Denna enda regel förhindrar en hel klass av dataintrångsscenarier, från oavsiktlig överdelning till sofistikerade prompt-injektionsattacker utformade för att exfiltrera känslig information.

## Hur klassificering flödar

Triggerfish använder fyra klassificeringsnivåer (högst till lägst):

<img src="/diagrams/write-down-rules.svg" alt="Nedskrivningsregler: data flödar bara till lika eller högre klassificeringsnivåer" style="max-width: 100%;" />

Data klassificerad vid en given nivå kan flöda till den nivån eller vilken nivå som helst ovanför den. Det kan aldrig flöda nedåt. Det här är nedskrivningsregeln.

::: danger Nedskrivningsregeln är **fast och icke-konfigurerbar**. Den kan inte lättas av administratörer, åsidosättas av policyregler eller kringgås av LLM:en. Det är den arkitektoniska grunden på vilken alla andra säkerhetskontroller vilar. :::

## Effektiv klassificering

När data är på väg att lämna systemet beräknar Triggerfish den **effektiva klassificeringen** för destinationen:

```
EFFEKTIV_KLASSIFICERING = min(kanalklassificering, mottagarklassificering)
```

Både kanalen och mottagaren måste vara vid eller ovanför datans klassificeringsnivå. Om endera är under blockeras utdata.

| Kanal                 | Mottagare                        | Effektiv klassificering |
| --------------------- | -------------------------------- | ----------------------- |
| INTERNAL (Slack)      | INTERNAL (kollega)               | INTERNAL                |
| INTERNAL (Slack)      | EXTERNAL (leverantör)            | PUBLIC                  |
| CONFIDENTIAL (Slack)  | INTERNAL (kollega)               | INTERNAL                |
| CONFIDENTIAL (E-post) | EXTERNAL (personlig kontakt)     | PUBLIC                  |

::: info En CONFIDENTIAL-kanal med en EXTERNAL-mottagare har en effektiv klassificering på PUBLIC. Om sessionen har kommit åt data ovanför PUBLIC blockeras utdata. :::

## Verkligt exempel

Här är ett konkret scenario som visar nedskrivningsregeln i praktiken.

```
Användare: "Kontrollera min Salesforce-pipeline"

Agent: [kommer åt Salesforce via användarens delegerade token]
       [Salesforce-data klassificerad som CONFIDENTIAL]
       [session-taint eskalerar till CONFIDENTIAL]

       "Du har 3 affärer som stängs den här veckan totalt 2,1 miljoner kr..."

Användare: "Skicka ett meddelande till min fru att jag blir sen ikväll"

Policylager: BLOCKERAD
  - Session-taint: CONFIDENTIAL
  - Mottagare (frun): EXTERNAL
  - Effektiv klassificering: PUBLIC
  - CONFIDENTIAL > PUBLIC --> nedskrivningsöverträdelse

Agent: "Jag kan inte skicka till externa kontakter i den här sessionen
        eftersom vi kom åt konfidentiell data.

        -> Återställ session och skicka meddelande
        -> Avbryt"
```

Användaren kom åt Salesforce-data (klassificerad CONFIDENTIAL), vilket taintade hela sessionen. När de sedan försökte skicka ett meddelande till en extern kontakt (effektiv klassificering PUBLIC) blockerade policylagret utdata eftersom CONFIDENTIAL-data inte kan flöda till en PUBLIC-destination.

::: tip Agentens meddelande till frun ("Jag blir sen") innehåller inte i sig Salesforce-data. Men sessionen har taintats av den tidigare Salesforce-åtkomsten, och hela sessionskontexten — inklusive allt som LLM:en kan ha behållit från Salesforce-svaret — kan påverka utdata. Nedskrivningsregeln förhindrar denna hela klass av kontextintrång. :::

## Vad användaren ser

När nedskrivningsregeln blockerar en åtgärd får användaren ett tydligt, handlingsbart meddelande. Triggerfish erbjuder två svarslägen:

**Standard (specifikt):**

```
Jag kan inte skicka konfidentiell data till en publik kanal.

-> Återställ session och skicka meddelande
-> Avbryt
```

**Pedagogisk (opt-in via konfiguration):**

```
Jag kan inte skicka konfidentiell data till en publik kanal.

Varför: Den här sessionen kom åt Salesforce (CONFIDENTIAL).
WhatsApp personlig är klassificerad som PUBLIC.
Data kan bara flöda till lika eller högre klassificering.

Alternativ:
  - Återställ session och skicka meddelande
  - Be din admin omklassificera WhatsApp-kanalen
  - Läs mer: https://trigger.fish/security/no-write-down
```

I båda fallen får användaren tydliga alternativ. De lämnas aldrig förvirrade om vad som hände eller vad de kan göra åt det.

## Sessionsåterställning

När en användare väljer "Återställ session och skicka meddelande" utför Triggerfish en **fullständig återställning**:

1. Session-taint rensas tillbaka till PUBLIC
2. Hela konversationshistoriken rensas (förhindrar kontextintrång)
3. Den begärda åtgärden utvärderas sedan mot den nya sessionen
4. Om åtgärden nu är tillåten (PUBLIC-data till en PUBLIC-kanal) fortsätter den

::: warning SÄKERHET Sessionsåterställning rensar både taint **och** konversationshistorik. Det här är inte valfritt. Om bara taint-etiketten rensades medan konversationskontexten förblev kunde LLM:en fortfarande referera till klassificerad information från tidigare meddelanden, vilket motverkar syftet med återställningen. :::

## Hur hantering fungerar

Nedskrivningsregeln tillämpas vid `PRE_OUTPUT`-hooken — den sista hanteringspunkten innan data lämnar systemet. Hooken körs som synkron, deterministisk kod:

```typescript
// Förenklad hanteringslogik
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
      reason: `Session-taint (${sessionTaint}) överstiger effektiv ` +
        `klassificering (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Klassificeringskontroll godkänd" };
}
```

Denna kod är:

- **Deterministisk** — samma indata ger alltid samma beslut
- **Synkron** — hooken slutförs innan utdata skickas
- **Ofalsknlig** — LLM:en kan inte påverka hookens beslut
- **Loggad** — varje körning registreras med fullständigt sammanhang

## Session-taint och eskalering

Session-taint spårar den högsta klassificeringsnivån av data som nåtts under en session. Den följer två strikta regler:

1. **Bara eskalering** — taint kan öka, aldrig minska inom en session
2. **Automatisk** — taint uppdateras av `POST_TOOL_RESPONSE`-hooken när data hamnar i sessionen

| Åtgärd                               | Taint före  | Taint efter              |
| ------------------------------------- | ----------- | ------------------------ |
| Kom åt väder-API (PUBLIC)            | PUBLIC      | PUBLIC                   |
| Kom åt intern wiki (INTERNAL)        | PUBLIC      | INTERNAL                 |
| Kom åt Salesforce (CONFIDENTIAL)     | INTERNAL    | CONFIDENTIAL             |
| Kom åt väder-API igen (PUBLIC)       | CONFIDENTIAL | CONFIDENTIAL (oförändrad) |

När en session når CONFIDENTIAL förblir den CONFIDENTIAL tills användaren uttryckligen återställer. Det finns inget automatiskt förfall, ingen timeout och inget sätt för LLM:en att sänka taint.

## Varför den här regeln är fast

Nedskrivningsregeln är inte konfigurerbar eftersom att göra den konfigurerbar skulle undergräva hela säkerhetsmodellen. Om en administratör kunde skapa ett undantag — "tillåt CONFIDENTIAL-data att flöda till PUBLIC-kanaler för just den här integrationen" — blir det undantaget en attackyta.

Varje annan säkerhetskontroll i Triggerfish bygger på antagandet att nedskrivningsregeln är absolut. Session-taint, datalinjegrafi, agentdelegeringstak och revisionsloggning är alla beroende av den. Att göra den konfigurerbar skulle kräva att man tänker om hela arkitekturen.

::: info Administratörer **kan** konfigurera klassificeringsnivåerna som tilldelas kanaler, mottagare och integrationer. Det här är det korrekta sättet att justera dataflöde: om en kanal ska ta emot högre klassificerade data, klassificera kanalen på en högre nivå. Regeln i sig förblir fast; indata till regeln är konfigurerbara. :::

## Relaterade sidor

- [Säkerhetscentrerat design](./) — översikt över säkerhetsarkitekturen
- [Identitet och autentisering](./identity) — hur kanalidentitet upprättas
- [Revision och efterlevnad](./audit-logging) — hur blockerade åtgärder registreras
- [Arkitektur: Taint och sessioner](/sv-SE/architecture/taint-and-sessions) — session-taint-mekanik i detalj
