# Signal

Anslut din Triggerfish-agent till Signal så att folk kan meddela den från Signal-appen. Adaptern kommunicerar med en [signal-cli](https://github.com/AsamK/signal-cli)-daemon via JSON-RPC och använder ditt länkade Signal-telefonnummer.

## Hur Signal är annorlunda

Signal-adaptern **är** ditt telefonnummer. Till skillnad från Telegram eller Slack där ett separat bot-konto finns, kommer Signal-meddelanden från andra personer till ditt nummer. Det innebär:

- Alla inkommande meddelanden har `isOwner: false` — de kommer alltid från någon annan
- Adaptern svarar som ditt telefonnummer
- Det finns ingen ägarcheck per meddelande som i andra kanaler

Det gör Signal idealiskt för att ta emot meddelanden från kontakter som skickar till ditt nummer, med agenten som svarar å dina vägnar.

## Standardklassificering

Signal standard till `PUBLIC`-klassificering. Eftersom alla inkommande meddelanden kommer från externa kontakter är `PUBLIC` säkerhetsstandarden.

## Installation

### Steg 1: Installera signal-cli

signal-cli är en tredjepartsklient för Signal via kommandoraden. Triggerfish kommunicerar med den via en TCP- eller Unix-socket.

**Linux (inbyggd version — ingen Java krävs):**

Ladda ner den senaste inbyggda versionen från [signal-cli releases](https://github.com/AsamK/signal-cli/releases)-sidan, eller låt Triggerfish ladda ner den åt dig under installationen.

**macOS / andra plattformar (JVM-version):**

Kräver Java 21+. Triggerfish kan automatiskt ladda ner en portabel JRE om Java inte är installerat.

Du kan också köra den guidade installationen:

```bash
triggerfish config add-channel signal
```

Detta kontrollerar om signal-cli finns, erbjuder att ladda ner den om den saknas och vägleder dig genom länkning.

### Steg 2: Länka din enhet

signal-cli måste länkas till ditt befintliga Signal-konto (precis som att länka en skrivbordsapp):

```bash
signal-cli link -n "Triggerfish"
```

Detta skriver ut en `tsdevice:`-URI. Skanna QR-koden med din Signal-mobilapp (Inställningar > Länkade enheter > Länka ny enhet).

### Steg 3: Starta daemonen

signal-cli körs som en bakgrundsdaemon som Triggerfish ansluter till:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Ersätt `+14155552671` med ditt telefonnummer i E.164-format.

### Steg 4: Konfigurera Triggerfish

Lägg till Signal i din `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Alternativ         | Typ     | Obligatorisk | Beskrivning                                                                               |
| ------------------ | ------- | ------------ | ----------------------------------------------------------------------------------------- |
| `endpoint`         | string  | Ja           | signal-cli daemon-adress (`tcp://host:port` eller `unix:///sökväg/till/socket`)           |
| `account`          | string  | Ja           | Ditt Signal-telefonnummer (E.164-format)                                                  |
| `classification`   | string  | Nej          | Klassificeringstak (standard: `PUBLIC`)                                                   |
| `defaultGroupMode` | string  | Nej          | Gruppmeddelanden: `always`, `mentioned-only`, `owner-only` (standard: `always`)           |
| `groups`           | object  | Nej          | Konfigurationsöverstyrningar per grupp                                                    |
| `ownerPhone`       | string  | Nej          | Reserverat för framtida användning                                                        |
| `pairing`          | boolean | Nej          | Aktivera parkopplingsläge under installation                                              |

### Steg 5: Starta Triggerfish

```bash
triggerfish stop && triggerfish start
```

Skicka ett meddelande till ditt telefonnummer från en annan Signal-användare för att bekräfta anslutningen.

## Gruppmeddelanden

Signal stöder gruppchattar. Du kan styra hur agenten svarar på gruppmeddelanden:

| Läge             | Beteende                                                    |
| ---------------- | ----------------------------------------------------------- |
| `always`         | Svara på alla gruppmeddelanden (standard)                   |
| `mentioned-only` | Svara bara när nämnd via telefonnummer eller @omnämnande    |
| `owner-only`     | Svara aldrig i grupper                                      |

Konfigurera globalt eller per grupp:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "ditt-grupp-id":
        mode: always
        classification: INTERNAL
```

Grupp-ID:n är base64-kodade identifierare. Använd `triggerfish signal list-groups` eller kontrollera signal-cli-dokumentationen för att hitta dem.

## Meddelandechunkning

Signal har en 4 000-teckensgräns för meddelanden. Svar som är längre delas automatiskt upp i flera meddelanden vid radbrytningar eller mellanslag för läsbarhet.

## Skrivindiktatorer

Adaptern skickar skrivindiktatorer medan agenten bearbetar en förfrågan. Skrivstatusen rensas när svaret skickas.

## Utökade verktyg

Signal-adaptern exponerar ytterligare verktyg:

- `sendTyping` / `stopTyping` — Manuell kontroll av skrivindikator
- `listGroups` — Lista alla Signal-grupper kontot är medlem i
- `listContacts` — Lista alla Signal-kontakter

## Ändra klassificering

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Giltiga nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Starta om daemonen efter ändring: `triggerfish stop && triggerfish start`

## Tillförlitlighetsfunktioner

Signal-adaptern inkluderar flera tillförlitlighetsmekanismer:

### Automatisk återanslutning

Om anslutningen till signal-cli bryts (nätverksavbrott, daemon-omstart) återansluter adaptern automatiskt med exponentiell backoff. Ingen manuell åtgärd krävs.

### Hälsokontroll

Vid uppstart kontrollerar Triggerfish om en befintlig signal-cli-daemon är frisk med hjälp av ett JSON-RPC ping-test. Om daemonen inte svarar stoppas den och startas om automatiskt.

### Versionsspårning

Triggerfish spårar den kända bra signal-cli-versionen (för närvarande 0.13.0) och varnar vid uppstart om din installerade version är äldre. signal-cli-versionen loggas vid varje lyckad anslutning.

### Unix Socket-stöd

Förutom TCP-endpoints stöder adaptern Unix domain sockets:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Felsökning

**signal-cli daemon inte nåbar:**

- Kontrollera att daemonen körs: sök efter processen eller prova `nc -z 127.0.0.1 7583`
- signal-cli binder enbart IPv4 — använd `127.0.0.1`, inte `localhost`
- Standard TCP-port är 7583
- Triggerfish startar automatiskt om daemonen om den upptäcker en ohälsosam process

**Meddelanden anländer inte:**

- Bekräfta att enheten är länkad: kontrollera Signal-mobilapp under Länkade enheter
- signal-cli måste ha fått minst en synkronisering efter länkning
- Kontrollera loggar för anslutningsfel: `triggerfish logs --tail`

**Java-fel (JVM-version):**

- signal-cli JVM-version kräver Java 21+
- Kör `java -version` för att kontrollera
- Triggerfish kan ladda ner en portabel JRE under installation om det behövs

**Återanslutningsslingor:**

- Om du ser upprepade återanslutningsförsök i loggarna kan signal-cli-daemonen krascha
- Kontrollera signal-cli:s egen stderr-utdata för fel
- Försök starta om med en ny daemon: stoppa Triggerfish, döda signal-cli, starta om båda
