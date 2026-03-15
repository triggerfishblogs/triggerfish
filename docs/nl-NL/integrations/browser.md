# Browserautomatisering

Triggerfish biedt uitgebreide browserbesturing via een beheerde Chromium-instantie met CDP (Chrome DevTools Protocol). De agent kan op het web navigeren, met pagina's interageren, formulieren invullen, schermopnames maken en webworkflows automatiseren — alles onder beleidshandhaving.

## Architectuur

Browserautomatisering is gebouwd op `puppeteer-core` en maakt verbinding met een beheerde Chromium-instantie via CDP. Elke browseractie doorloopt de beleidslaag voordat de browser wordt bereikt.

Triggerfish detecteert automatisch Chromium-gebaseerde browsers, waaronder **Google Chrome**, **Chromium** en **Brave**. Detectie dekt standaard installatiepaden op Linux, macOS, Windows en Flatpak-omgevingen.

::: info De `browser_navigate`-tool vereist `http://`- of `https://`-URL's. Browserinterne schema's (zoals `chrome://`, `brave://`, `about:`) worden niet ondersteund en retourneren een fout met de aanbeveling om een web-URL te gebruiken. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Browserautomatiseringsflow: Agent → Browser-tool → Beleidslaag → CDP → Beheerde Chromium" style="max-width: 100%;" />

Het browserprofiel is per agent geïsoleerd. De beheerde Chromium-instantie deelt geen cookies, sessies of lokale opslag met uw persoonlijke browser. Automatisch invullen van inloggegevens is standaard uitgeschakeld.

## Beschikbare acties

| Actie      | Beschrijving                                          | Voorbeeldgebruik                                       |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------ |
| `navigate` | Naar een URL navigeren (afhankelijk van domeinbeleid) | Een webpagina openen voor onderzoek                    |
| `snapshot` | Een paginaschermopname maken                          | Een UI-status documenteren, visuele informatie extraheren |
| `click`    | Op een element op de pagina klikken                   | Een formulier indienen, een knop activeren             |
| `type`     | Tekst typen in een invoerveld                         | Een zoekvak invullen, een formulier invullen           |
| `select`   | Een optie selecteren uit een vervolgkeuzemenu         | Kiezen uit een menu                                    |
| `upload`   | Een bestand uploaden naar een formulier               | Een document bijvoegen                                 |
| `evaluate` | JavaScript uitvoeren in de paginacontext (gesandboxed) | Gegevens extraheren, de DOM manipuleren               |
| `wait`     | Wachten op een element of voorwaarde                  | Ervoor zorgen dat een pagina geladen is voordat er mee wordt geïnterageerd |

## Domeinbeleidshandhaving

Elke URL waarnaar de agent navigeert, wordt gecontroleerd aan de hand van een domeintoestaan- en -weigerlijst voordat de browser handelt.

### Configuratie

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Hoe domeinbeleid werkt

1. Agent roept `browser.navigate("https://github.com/org/repo")` aan
2. `PRE_TOOL_CALL`-hook activeert met de URL als context
3. Beleidsengine controleert het domein aan de hand van toestaan/weigeren-lijsten
4. Als geweigerd of niet op de toestaan-lijst, wordt de navigatie **geblokkeerd**
5. Als toegestaan, wordt de domeinclassificatie opgezocht
6. Sessietaint escaleert om de domeinclassificatie te evenaren
7. Navigatie gaat door

::: warning BEVEILIGING Als een domein niet op de toestaan-lijst staat, wordt navigatie standaard geblokkeerd. De LLM kan domeinbeleid niet overschrijven. Dit voorkomt dat de agent willekeurige websites bezoekt die gevoelige gegevens kunnen blootstellen of ongewenste acties kunnen activeren. :::

## Schermopnames en classificatie

Schermopnames gemaakt via `browser.snapshot` erven het huidige taint-niveau van de sessie. Als de sessie is aangetast op `CONFIDENTIAL`-niveau, worden alle schermopnames van die sessie geclassificeerd als `CONFIDENTIAL`.

Dit is van belang voor het uitvoerbeleid. Een schermopname geclassificeerd op `CONFIDENTIAL`-niveau kan niet worden verzonden naar een `PUBLIC`-kanaal. De `PRE_OUTPUT`-hook handhaaft dit op de grens.

## Geschraapte inhoud en afkomst

Wanneer de agent inhoud van een webpagina extraheert (via `evaluate`, tekst lezen of elementen parsen), worden de geëxtraheerde gegevens:

- Geclassificeerd op basis van het toegewezen classificatieniveau van het domein
- Vastgelegd in een afkomstrecord dat de bron-URL, extractietijd en classificatie bijhoudt
- Bijdragen aan sessietaint (taint escaleert om de inhoudsclassificatie te evenaren)

Deze afkomsttracking betekent dat u altijd kunt achterhalen waar gegevens vandaan kwamen, zelfs als ze weken geleden van een webpagina zijn geschraapt.

## Beveiligingscontroles

### Browserisolatie per agent

Elke agent krijgt zijn eigen browserprofiel. Dit betekent:

- Geen gedeelde cookies tussen agents
- Geen gedeelde lokale opslag of sessieopslag
- Geen toegang tot hostbrowsercookies of -sessies
- Automatisch invullen van inloggegevens standaard uitgeschakeld
- Browserextensies worden niet geladen

### Beleidshookintegratie

Alle browseracties doorlopen de standaard beleidshooks:

| Hook                 | Wanneer actief                              | Wat er wordt gecontroleerd                                         |
| -------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `PRE_TOOL_CALL`      | Vóór elke browseractie                      | Domeintoestaan-lijst, URL-beleid, actiemachtigingen                |
| `POST_TOOL_RESPONSE` | Nadat de browser gegevens retourneert        | Reactie classificeren, sessietaint bijwerken, afkomst aanmaken     |
| `PRE_OUTPUT`         | Wanneer browserinhoud het systeem verlaat   | Classificatiecontrole tegen de bestemming                          |

### Resourcelimieten

- Navigatietimeout voorkomt dat de browser onbeperkt blijft hangen
- Paginalaadgroottelimieten voorkomen overmatig geheugengebruik
- Limieten voor gelijktijdige tabbladen worden per agent gehandhaafd

## Enterprise-besturingselementen

Enterprise-implementaties hebben aanvullende besturingselementen voor browserautomatisering:

| Besturingselement                    | Beschrijving                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| Classificatie op domeinniveau        | Intranetdomeinen automatisch geclassificeerd als `INTERNAL`                            |
| Lijst met geblokkeerde domeinen      | Door beheerder beheerde lijst met verboden domeinen                                    |
| Bewaarbeleid voor schermopnames      | Hoe lang gemaakte schermopnames worden bewaard                                         |
| Auditlogboekregistratie browsersessie | Volledige logboekregistratie van alle browseracties voor naleving                     |
| Browserautomatisering uitschakelen   | Beheerder kan de browsertool volledig uitschakelen voor specifieke agents of rollen    |

## Voorbeeld: webonderzoeksworkflow

Een typische agentworkflow met browserautomatisering:

```
1. Gebruiker:  "Research competitor pricing on example-competitor.com"

2. Agent: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: domain "example-competitor.com" checked against allowlist
          -> Allowed, classified as PUBLIC
          -> Navigation proceeds

3. Agent: browser.snapshot()
          -> Screenshot captured, classified at session taint level (PUBLIC)

4. Agent: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Text extracted, classified as PUBLIC
          -> Lineage record created: source=example-competitor.com/pricing

5. Agent: Summarizes pricing information and returns to user
          -> PRE_OUTPUT: PUBLIC data to user channel -- ALLOWED
```

Elke stap wordt geregistreerd, geclassificeerd en is auditeerbaar.
