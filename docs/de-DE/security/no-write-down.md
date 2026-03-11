# Die No-Write-Down-Regel

Die No-Write-Down-Regel ist die Grundlage des Datenschutzmodells von Triggerfish. Sie ist eine feste, nicht konfigurierbare Regel, die fuer jede Session, jeden Kanal und jeden Agenten gilt -- ohne Ausnahmen und ohne LLM-Override.

**Die Regel:** Daten koennen nur zu Kanaelen und Empfaengern mit **gleicher oder hoeherer** Klassifizierungsstufe fliessen.

Diese einzige Regel verhindert eine ganze Klasse von Datenleck-Szenarien, von versehentlichem Uebersharing bis hin zu ausgekluegelten Prompt-Injection-Angriffen, die darauf abzielen, sensible Informationen zu exfiltrieren.

## Wie Klassifizierung fliesst

Triggerfish verwendet vier Klassifizierungsstufen (hoechste bis niedrigste):

<img src="/diagrams/write-down-rules.svg" alt="Write-Down-Regeln: Daten fliessen nur zu gleicher oder hoeherer Klassifizierungsstufe" style="max-width: 100%;" />

Daten, die auf einer bestimmten Stufe klassifiziert sind, koennen zu dieser Stufe oder jeder darueber fliessen. Sie koennen niemals abwaerts fliessen. Dies ist die No-Write-Down-Regel.

::: danger Die No-Write-Down-Regel ist **fest und nicht konfigurierbar**. Sie kann nicht von Administratoren gelockert, durch Policy-Regeln ueberschrieben oder durch das LLM umgangen werden. Sie ist das architektonische Fundament, auf dem alle anderen Sicherheitskontrollen ruhen. :::

## Effektive Klassifizierung

Wenn Daten das System verlassen, berechnet Triggerfish die **effektive Klassifizierung** des Ziels:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Sowohl der Kanal als auch der Empfaenger muessen auf oder ueber der Klassifizierungsstufe der Daten liegen. Wenn einer von beiden darunter liegt, wird die Ausgabe blockiert.

| Kanal                | Empfaenger                    | Effektive Klassifizierung |
| -------------------- | ----------------------------- | ------------------------- |
| INTERNAL (Slack)     | INTERNAL (Kollege)            | INTERNAL                  |
| INTERNAL (Slack)     | EXTERNAL (Dienstleister)      | PUBLIC                    |
| CONFIDENTIAL (Slack) | INTERNAL (Kollege)            | INTERNAL                  |
| CONFIDENTIAL (E-Mail)| EXTERNAL (persoenlicher Kontakt) | PUBLIC                 |

::: info Ein CONFIDENTIAL-Kanal mit einem EXTERNAL-Empfaenger hat eine effektive Klassifizierung von PUBLIC. Wenn die Session auf Daten oberhalb von PUBLIC zugegriffen hat, wird die Ausgabe blockiert. :::

## Praxisbeispiel

Hier ist ein konkretes Szenario, das die No-Write-Down-Regel in Aktion zeigt.

```
Benutzer: "Pruefe meine Salesforce-Pipeline"

Agent: [greift auf Salesforce ueber delegiertes Token des Benutzers zu]
       [Salesforce-Daten als CONFIDENTIAL klassifiziert]
       [Session-Taint eskaliert zu CONFIDENTIAL]

       "Sie haben 3 Deals, die diese Woche abgeschlossen werden, mit insgesamt 2,1 Mio. $..."

Benutzer: "Sende meiner Frau eine Nachricht, dass ich heute spaet komme"

Policy-Schicht: BLOCKIERT
  - Session-Taint: CONFIDENTIAL
  - Empfaenger (Frau): EXTERNAL
  - Effektive Klassifizierung: PUBLIC
  - CONFIDENTIAL > PUBLIC --> Write-Down-Verletzung

Agent: "Ich kann in dieser Session nicht an externe Kontakte senden,
        weil wir auf vertrauliche Daten zugegriffen haben.

        -> Session zuruecksetzen und Nachricht senden
        -> Abbrechen"
```

Der Benutzer hat auf Salesforce-Daten zugegriffen (klassifiziert als CONFIDENTIAL), was die gesamte Session getaintet hat. Als er dann versuchte, eine Nachricht an einen externen Kontakt zu senden (effektive Klassifizierung PUBLIC), blockierte die Policy-Schicht die Ausgabe, weil CONFIDENTIAL-Daten nicht an ein PUBLIC-Ziel fliessen koennen.

::: tip Die Nachricht des Agenten an die Frau ("Ich komme heute spaet") enthaelt selbst keine Salesforce-Daten. Aber die Session wurde durch den frueheren Salesforce-Zugriff getaintet, und der gesamte Session-Kontext -- einschliesslich allem, was das LLM aus der Salesforce-Antwort behalten haben koennte -- koennte die Ausgabe beeinflussen. Die No-Write-Down-Regel verhindert diese gesamte Klasse von Kontextlecks. :::

## Was der Benutzer sieht

Wenn die No-Write-Down-Regel eine Aktion blockiert, erhaelt der Benutzer eine klare, umsetzbare Nachricht. Triggerfish bietet zwei Antwortmodi:

**Standard (spezifisch):**

```
Ich kann keine vertraulichen Daten an einen oeffentlichen Kanal senden.

-> Session zuruecksetzen und Nachricht senden
-> Abbrechen
```

**Lehrreich (Opt-in ueber Konfiguration):**

```
Ich kann keine vertraulichen Daten an einen oeffentlichen Kanal senden.

Warum: Diese Session hat auf Salesforce (CONFIDENTIAL) zugegriffen.
Persoenliches WhatsApp ist als PUBLIC klassifiziert.
Daten koennen nur zu gleicher oder hoeherer Klassifizierung fliessen.

Optionen:
  - Session zuruecksetzen und Nachricht senden
  - Ihren Administrator bitten, den WhatsApp-Kanal umzuklassifizieren
  - Mehr erfahren: https://trigger.fish/security/no-write-down
```

In beiden Faellen erhaelt der Benutzer klare Optionen. Er wird nie im Unklaren gelassen, was passiert ist oder was er dagegen tun kann.

## Session-Reset

Wenn ein Benutzer "Session zuruecksetzen und Nachricht senden" waehlt, fuehrt Triggerfish einen **vollstaendigen Reset** durch:

1. Der Session-Taint wird auf PUBLIC zurueckgesetzt
2. Der gesamte Gespraechsverlauf wird geloescht (verhindert Kontextlecks)
3. Die angeforderte Aktion wird dann gegen die frische Session neu bewertet
4. Wenn die Aktion jetzt erlaubt ist (PUBLIC-Daten an einen PUBLIC-Kanal), wird sie durchgefuehrt

::: warning SICHERHEIT Session-Reset loescht sowohl Taint **als auch** Gespraechsverlauf. Dies ist nicht optional. Wenn nur die Taint-Kennzeichnung geloescht wuerde, waehrend der Gespraechskontext erhalten bliebe, koennte das LLM weiterhin auf klassifizierte Informationen aus frueheren Nachrichten verweisen, was den Zweck des Resets zunichte machen wuerde. :::

## Wie die Durchsetzung funktioniert

Die No-Write-Down-Regel wird am `PRE_OUTPUT`-Hook durchgesetzt -- dem letzten Durchsetzungspunkt, bevor Daten das System verlassen. Der Hook laeuft als synchroner, deterministischer Code:

```typescript
// Vereinfachte Durchsetzungslogik
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
      reason: `Session-Taint (${sessionTaint}) uebersteigt effektive ` +
        `Klassifizierung (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Klassifizierungspruefung bestanden" };
}
```

Dieser Code ist:

- **Deterministisch** -- gleiche Eingaben erzeugen immer die gleiche Entscheidung
- **Synchron** -- der Hook wird abgeschlossen, bevor eine Ausgabe gesendet wird
- **Unfaelschbar** -- das LLM kann die Entscheidung des Hooks nicht beeinflussen
- **Protokolliert** -- jede Ausfuehrung wird mit vollstaendigem Kontext aufgezeichnet

## Session-Taint und Eskalation

Session-Taint verfolgt die hoechste Klassifizierungsstufe der waehrend einer Session abgerufenen Daten. Er folgt zwei strikten Regeln:

1. **Nur Eskalation** -- Taint kann innerhalb einer Session steigen, aber nie sinken
2. **Automatisch** -- Taint wird durch den `POST_TOOL_RESPONSE`-Hook aktualisiert, wann immer Daten in die Session eintreten

| Aktion                                  | Taint vorher   | Taint nachher              |
| --------------------------------------- | -------------- | -------------------------- |
| Wetter-API abfragen (PUBLIC)            | PUBLIC         | PUBLIC                     |
| Internes Wiki zugreifen (INTERNAL)      | PUBLIC         | INTERNAL                   |
| Salesforce zugreifen (CONFIDENTIAL)     | INTERNAL       | CONFIDENTIAL               |
| Wetter-API erneut abfragen (PUBLIC)     | CONFIDENTIAL   | CONFIDENTIAL (unveraendert)|

Sobald eine Session CONFIDENTIAL erreicht, bleibt sie CONFIDENTIAL, bis der Benutzer explizit zuruecksetzt. Es gibt keinen automatischen Verfall, kein Timeout und keine Moeglichkeit fuer das LLM, den Taint zu senken.

## Warum diese Regel fest ist

Die No-Write-Down-Regel ist nicht konfigurierbar, weil sie konfigurierbar zu machen das gesamte Sicherheitsmodell untergraben wuerde. Wenn ein Administrator eine Ausnahme erstellen koennte -- "erlaube CONFIDENTIAL-Daten an PUBLIC-Kanaele fuer diese eine Integration" -- wuerde diese Ausnahme zu einer Angriffsflaeche.

Jede andere Sicherheitskontrolle in Triggerfish baut auf der Annahme auf, dass die No-Write-Down-Regel absolut ist. Session-Taint, Daten-Lineage, Agenten-Delegations-Obergrenzen und Audit-Logging haengen alle davon ab. Sie konfigurierbar zu machen wuerde ein Umdenken der gesamten Architektur erfordern.

::: info Administratoren **koennen** die Klassifizierungsstufen konfigurieren, die Kanaelen, Empfaengern und Integrationen zugewiesen werden. Dies ist der korrekte Weg, den Datenfluss anzupassen: Wenn ein Kanal hoeher klassifizierte Daten empfangen soll, klassifizieren Sie den Kanal auf einer hoeheren Stufe. Die Regel selbst bleibt fest; die Eingaben in die Regel sind konfigurierbar. :::

## Verwandte Seiten

- [Sicherheit als Grundprinzip](./) -- Ueberblick ueber die Sicherheitsarchitektur
- [Identitaet & Authentifizierung](./identity) -- Wie Kanalidentitaet festgestellt wird
- [Audit & Compliance](./audit-logging) -- Wie blockierte Aktionen aufgezeichnet werden
- [Architektur: Taint & Sessions](/de-DE/architecture/taint-and-sessions) -- Session-Taint-Mechanik im Detail
