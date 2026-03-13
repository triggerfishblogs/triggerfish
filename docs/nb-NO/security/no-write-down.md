# No-Write-Down-regelen

No-write-down-regelen er grunnlaget for Triggerfish sin databeskyttelsesmodell. Det er en fast, ikke-konfigurerbar regel som gjelder for hver sesjon, hver kanal og hver agent — uten unntak og uten LLM-overstyring.

**Regelen:** Data kan bare flyte til kanaler og mottakere på et **likt eller høyere** klassifiseringsnivå.

Denne ene regelen forhindrer en hel klasse av datalekkasjesenarioer, fra utilsiktet overdeling til sofistikerte prompt-injeksjonsangrep designet for å eksfiltrere sensitiv informasjon.

## Slik flyter klassifisering

Triggerfish bruker fire klassifiseringsnivåer (høyest til lavest):

<img src="/diagrams/write-down-rules.svg" alt="Write-down-regler: data flyter bare til like eller høyere klassifiseringsnivåer" style="max-width: 100%;" />

Data klassifisert på et gitt nivå kan flyte til det nivået eller et høyere. Det kan aldri flyte nedover. Dette er no-write-down-regelen.

::: danger No-write-down-regelen er **fast og ikke-konfigurerbar**. Den kan ikke avslakkes av administratorer, overstyres av policyregler eller omgås av LLM-en. Det er det arkitektoniske grunnlaget som alle andre sikkerhetskontroller hviler på. :::

## Effektiv klassifisering

Når data er i ferd med å forlate systemet, beregner Triggerfish den **effektive klassifiseringen** av destinasjonen:

```
EFFEKTIV_KLASSIFISERING = min(kanal_klassifisering, mottaker_klassifisering)
```

Både kanalen og mottakeren må være på eller over dataenes klassifiseringsnivå. Hvis én av dem er under, blokkeres utdataet.

| Kanal                 | Mottaker                     | Effektiv klassifisering |
| --------------------- | ---------------------------- | ----------------------- |
| INTERNAL (Slack)      | INTERNAL (kollega)           | INTERNAL                |
| INTERNAL (Slack)      | EXTERNAL (leverandør)        | PUBLIC                  |
| CONFIDENTIAL (Slack)  | INTERNAL (kollega)           | INTERNAL                |
| CONFIDENTIAL (E-post) | EXTERNAL (personlig kontakt) | PUBLIC                  |

::: info En CONFIDENTIAL-kanal med en EXTERNAL-mottaker har effektiv klassifisering PUBLIC. Hvis sesjonen har aksessert data over PUBLIC, blokkeres utdataet. :::

## Eksempel fra virkeligheten

Her er et konkret scenario som viser no-write-down-regelen i aksjon.

```
Bruker: "Sjekk Salesforce-pipelinen min"

Agent: [aksesserer Salesforce via brukerens delegerte token]
       [Salesforce-data klassifisert som CONFIDENTIAL]
       [session taint eskalerer til CONFIDENTIAL]

       "Du har 3 avtaler som stenger denne uken for totalt 2,1 mill kr..."

Bruker: "Send en melding til kona mi at jeg blir sen i kveld"

Policy-lag: BLOKKERT
  - Session taint: CONFIDENTIAL
  - Mottaker (kona): EXTERNAL
  - Effektiv klassifisering: PUBLIC
  - CONFIDENTIAL > PUBLIC --> write-down-brudd

Agent: "Jeg kan ikke sende til eksterne kontakter i denne sesjonen
        fordi vi aksesserte konfidensielle data.

        -> Tilbakestill sesjon og send melding
        -> Avbryt"
```

Brukeren aksesserte Salesforce-data (klassifisert CONFIDENTIAL), som tainted hele sesjonen. Da de prøvde å sende en melding til en ekstern kontakt (effektiv klassifisering PUBLIC), blokkerte policy-laget utdataet fordi CONFIDENTIAL-data ikke kan flyte til en PUBLIC-destinasjon.

::: tip Agentens melding til kona ("Jeg blir sen i kveld") inneholder ikke i seg selv Salesforce-data. Men sesjonen er tainted av den tidligere Salesforce-tilgangen, og hele sesjonskonteksten — inkludert alt LLM-en kan ha beholdt fra Salesforce-svaret — kan påvirke utdataet. No-write-down-regelen forhindrer hele denne klassen av kontekstlekkasje. :::

## Hva brukeren ser

Når no-write-down-regelen blokkerer en handling, mottar brukeren en klar, handlingsdyktig melding. Triggerfish tilbyr to svarmodi:

**Standard (spesifikk):**

```
Jeg kan ikke sende konfidensielle data til en offentlig kanal.

-> Tilbakestill sesjon og send melding
-> Avbryt
```

**Pedagogisk (opt-in via konfigurasjon):**

```
Jeg kan ikke sende konfidensielle data til en offentlig kanal.

Hvorfor: Denne sesjonen aksesserte Salesforce (CONFIDENTIAL).
WhatsApp personlig er klassifisert som PUBLIC.
Data kan bare flyte til lik eller høyere klassifisering.

Alternativer:
  - Tilbakestill sesjon og send melding
  - Be adminen reklassifisere WhatsApp-kanalen
  - Lær mer: https://trigger.fish/nb-NO/security/no-write-down
```

I begge tilfeller får brukeren klare alternativer. De er aldri forvirret over hva som skjedde eller hva de kan gjøre med det.

## Sesjonstilbakestilling

Når en bruker velger "Tilbakestill sesjon og send melding," utfører Triggerfish en **full tilbakestilling**:

1. Session taint tømmes tilbake til PUBLIC
2. Hele samtalehistorikken tømmes (forhindrer kontekstlekkasje)
3. Den forespurte handlingen re-evalueres mot den friske sesjonen
4. Hvis handlingen nå er tillatt (PUBLIC-data til en PUBLIC-kanal), fortsetter den

::: warning SIKKERHET Sesjonstilbakestilling tømmer både taint **og** samtalehistorikk. Dette er ikke valgfritt. Hvis bare taint-etiketten ble tømt mens samtalekonteksten forble, kunne LLM-en fortsatt referere til klassifisert informasjon fra tidligere meldinger, noe som ville beseire hensikten med tilbakestillingen. :::

## Slik fungerer håndhevelse

No-write-down-regelen håndheves ved `PRE_OUTPUT`-hooken — det siste håndhevelsespunktet før data forlater systemet. Hooken kjører som synkron, deterministisk kode:

```typescript
// Forenklet håndhevelseslogikk
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
      reason: `Session taint (${sessionTaint}) overstiger effektiv ` +
        `klassifisering (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Klassifiseringssjekk bestått" };
}
```

Denne koden er:

- **Deterministisk** — samme inndata gir alltid samme beslutning
- **Synkron** — hooken fullføres før noe utdata sendes
- **Uforfalskerbar** — LLM-en kan ikke påvirke hookens beslutning
- **Logget** — hver utførelse registreres med full kontekst

## Session Taint og eskalering

Session taint sporer det høyeste klassifiseringsnivået til data aksessert under en sesjon. Den følger to strenge regler:

1. **Kun eskalering** — taint kan øke, aldri synke innen en sesjon
2. **Automatisk** — taint oppdateres av `POST_TOOL_RESPONSE`-hooken når data kommer inn i sesjonen

| Handling                                 | Taint før    | Taint etter              |
| ---------------------------------------- | ------------ | ------------------------ |
| Aksesser vær-API (PUBLIC)                | PUBLIC       | PUBLIC                   |
| Aksesser intern wiki (INTERNAL)          | PUBLIC       | INTERNAL                 |
| Aksesser Salesforce (CONFIDENTIAL)       | INTERNAL     | CONFIDENTIAL             |
| Aksesser vær-API igjen (PUBLIC)          | CONFIDENTIAL | CONFIDENTIAL (uendret)   |

Når en sesjon når CONFIDENTIAL, forblir den CONFIDENTIAL inntil brukeren eksplisitt tilbakestiller. Det er ingen automatisk forfall, ingen tidsavbrudd og ingen måte for LLM-en å senke taint på.

## Hvorfor denne regelen er fast

No-write-down-regelen er ikke konfigurerbar fordi å gjøre den konfigurerbar ville undergrave hele sikkerhetsmodellen. Hvis en administrator kunne opprette et unntak — "tillat CONFIDENTIAL-data å flyte til PUBLIC-kanaler for denne ene integrasjonen" — blir det unntaket en angrepsflate.

Alle andre sikkerhetskontroller i Triggerfish er bygget på antagelsen om at no-write-down-regelen er absolutt. Session taint, datalinje, agentdelegeringstak og revisjonslogging er alle avhengige av den. Å gjøre den konfigurerbar ville kreve omtenking av hele arkitekturen.

::: info Administratorer **kan** konfigurere klassifiseringsnivåene tildelt til kanaler, mottakere og integrasjoner. Dette er den riktige måten å justere dataflyt på: hvis en kanal skal motta høyere klassifiserte data, klassifiser kanalen på et høyere nivå. Regelen i seg selv forblir fast; inndataene til regelen er konfigurerbare. :::

## Relaterte sider

- [Sikkerhetsfokusert design](./) — oversikt over sikkerhetsarkitekturen
- [Identitet og autentisering](./identity) — hvordan kanalidentitet etableres
- [Revisjon og samsvar](./audit-logging) — hvordan blokkerte handlinger registreres
- [Arkitektur: Taint og sesjoner](/nb-NO/architecture/taint-and-sessions) — session taint-mekanikk i detalj
