# Signal

Verbind uw Triggerfish-agent met Signal zodat mensen het berichten kunnen sturen vanuit de Signal-app. De adapter communiceert met een [signal-cli](https://github.com/AsamK/signal-cli)-daemon via JSON-RPC, met behulp van uw gekoppelde Signal-telefoonnummer.

## Hoe Signal anders is

De Signal-adapter **is** uw telefoonnummer. In tegenstelling tot Telegram of Slack, waar een apart botaccount bestaat, komen Signal-berichten van anderen naar uw nummer. Dit betekent:

- Alle inkomende berichten hebben `isOwner: false` — ze zijn altijd van iemand anders
- De adapter antwoordt als uw telefoonnummer
- Er is geen eigenaarcontrole per bericht zoals bij andere kanalen

Dit maakt Signal ideaal voor het ontvangen van berichten van contacten die uw nummer berichten, met de agent die namens u antwoordt.

## Standaardclassificatie

Signal is standaard ingesteld op `PUBLIC`-classificatie. Omdat alle inkomende berichten van externe contacten komen, is `PUBLIC` de veilige standaard.

## Installatie

### Stap 1: signal-cli installeren

signal-cli is een externe opdrachtregelclient voor Signal. Triggerfish communiceert ermee via een TCP- of Unix-socket.

**Linux (native build — geen Java nodig):**

Download de nieuwste native build van de [signal-cli-releases](https://github.com/AsamK/signal-cli/releases)-pagina, of laat Triggerfish het voor u downloaden tijdens de installatie.

**macOS / andere platforms (JVM-build):**

Vereist Java 21+. Triggerfish kan automatisch een draagbare JRE downloaden als Java niet is geïnstalleerd.

U kunt ook de geleide installatie uitvoeren:

```bash
triggerfish config add-channel signal
```

Dit controleert op signal-cli, biedt het te downloaden als het ontbreekt, en begeleidt u door het koppelproces.

### Stap 2: Uw apparaat koppelen

signal-cli moet worden gekoppeld aan uw bestaande Signal-account (zoals een desktopapp koppelen):

```bash
signal-cli link -n "Triggerfish"
```

Dit drukt een `tsdevice:`-URI af. Scan de QR-code met uw Signal-mobiele app (Instellingen > Gekoppelde apparaten > Nieuw apparaat koppelen).

### Stap 3: De daemon starten

signal-cli draait als een achtergrond-daemon waarmee Triggerfish verbinding maakt:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Vervang `+14155552671` door uw telefoonnummer in E.164-formaat.

### Stap 4: Triggerfish configureren

Voeg Signal toe aan uw `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Optie              | Type    | Vereist | Beschrijving                                                                               |
| ------------------ | ------- | ------- | ------------------------------------------------------------------------------------------ |
| `endpoint`         | string  | Ja      | Adres van signal-cli daemon (`tcp://host:poort` of `unix:///pad/naar/socket`)              |
| `account`          | string  | Ja      | Uw Signal-telefoonnummer (E.164-formaat)                                                   |
| `classification`   | string  | Nee     | Classificatieplafond (standaard: `PUBLIC`)                                                  |
| `defaultGroupMode` | string  | Nee     | Groepsberichtverwerking: `always`, `mentioned-only`, `owner-only` (standaard: `always`)    |
| `groups`           | object  | Nee     | Configuratie-overschrijvingen per groep                                                     |
| `ownerPhone`       | string  | Nee     | Gereserveerd voor toekomstig gebruik                                                        |
| `pairing`          | boolean | Nee     | Koppelmodus inschakelen tijdens installatie                                                 |

### Stap 5: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Stuur een bericht naar uw telefoonnummer van een andere Signal-gebruiker om de verbinding te bevestigen.

## Groepsberichten

Signal ondersteunt groepschats. U kunt bepalen hoe de agent reageert op groepsberichten:

| Modus            | Gedrag                                                                |
| ---------------- | --------------------------------------------------------------------- |
| `always`         | Reageer op alle groepsberichten (standaard)                           |
| `mentioned-only` | Reageer alleen wanneer vermeld via telefoonnummer of @vermelding       |
| `owner-only`     | Reageer nooit in groepen                                              |

Configureer globaal of per groep:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "uw-groep-id":
        mode: always
        classification: INTERNAL
```

Groeps-ID's zijn base64-gecodeerde identifiers. Gebruik `triggerfish signal list-groups` of raadpleeg de signal-cli-documentatie om ze te vinden.

## Berichtopsplitsing

Signal heeft een berichtlimiet van 4.000 tekens. Antwoorden die dit overschrijden, worden automatisch opgesplitst in meerdere berichten, waarbij op regeleinden of spaties wordt gesplitst voor leesbaarheid.

## Typaanduidingen

De adapter stuurt typaanduidingen terwijl de agent een verzoek verwerkt. De typstatus verdwijnt wanneer het antwoord is verzonden.

## Uitgebreide tools

De Signal-adapter stelt aanvullende tools beschikbaar:

- `sendTyping` / `stopTyping` — Handmatige controle van typaanduidingen
- `listGroups` — Alle Signal-groepen weergeven waarvan het account lid is
- `listContacts` — Alle Signal-contacten weergeven

## Classificatie wijzigen

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Geldige niveaus: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Herstart de daemon na het wijzigen: `triggerfish stop && triggerfish start`

## Betrouwbaarheidsfuncties

De Signal-adapter bevat verschillende betrouwbaarheidsmechanismen:

### Automatisch opnieuw verbinden

Als de verbinding met signal-cli wordt verbroken (netwerkunderbrekking, daemon-herstart), maakt de adapter automatisch opnieuw verbinding met exponentiële backoff. Geen handmatige interventie nodig.

### Gezondheidscontrole

Bij het opstarten controleert Triggerfish of een bestaande signal-cli-daemon gezond is via een JSON-RPC-ping-probe. Als de daemon niet reageert, wordt het gestopt en automatisch opnieuw gestart.

### Versietracering

Triggerfish houdt de bekende goede signal-cli-versie bij (momenteel 0.13.0) en waarschuwt bij het opstarten als uw geïnstalleerde versie ouder is. De signal-cli-versie wordt vastgelegd bij elke succesvolle verbinding.

### Unix-socketondersteuning

Naast TCP-eindpunten ondersteunt de adapter Unix-domeinsockets:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Probleemoplossing

**signal-cli-daemon niet bereikbaar:**

- Controleer of de daemon actief is: controleer op het proces of probeer `nc -z 127.0.0.1 7583`
- signal-cli bindt alleen IPv4 — gebruik `127.0.0.1`, niet `localhost`
- Standaard TCP-poort is 7583
- Triggerfish herstart de daemon automatisch als het een ongezond proces detecteert

**Berichten komen niet aan:**

- Bevestig dat het apparaat is gekoppeld: controleer de Signal-mobiele app onder Gekoppelde apparaten
- signal-cli moet minstens één synchronisatie hebben ontvangen na het koppelen
- Controleer logboeken op verbindingsfouten: `triggerfish logs --tail`

**Java-fouten (alleen JVM-build):**

- signal-cli JVM-build vereist Java 21+
- Voer `java -version` uit om te controleren
- Triggerfish kan een draagbare JRE downloaden tijdens de installatie indien nodig

**Herverbindingslussen:**

- Als u herhaalde herverbindingspogingen in de logboeken ziet, kan de signal-cli-daemon crashen
- Controleer de eigen stderr-uitvoer van signal-cli op fouten
- Probeer opnieuw op te starten met een nieuwe daemon: stop Triggerfish, stop signal-cli, start beide opnieuw
