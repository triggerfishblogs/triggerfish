# Sessionshantering

Agenten kan inspektera, kommunicera med och skapa sessioner. Dessa verktyg möjliggör korsessionsarbetsflöden, delegering av bakgrundsuppgifter och korskanal-meddelanden — allt under nedskrivningstillämpning.

## Verktyg

### `sessions_list`

Lista alla aktiva sessioner synliga för den aktuella sessionen.

Tar inga parametrar. Resultat filtreras av taint-nivå — en `PUBLIC`-session kan inte se `CONFIDENTIAL`-sessions metadata.

### `sessions_history`

Hämta meddelandehistoriken för en session med ID.

| Parameter    | Typ    | Obligatorisk | Beskrivning                                  |
| ------------ | ------ | ------------ | -------------------------------------------- |
| `session_id` | string | Ja           | Sessions-ID:t att hämta historik för         |

Åtkomst nekas om målsessionens taint är högre än anroparens taint.

### `sessions_send`

Skicka innehåll från den aktuella sessionen till en annan session. Underkastad nedskrivningstillämpning.

| Parameter    | Typ    | Obligatorisk | Beskrivning                          |
| ------------ | ------ | ------------ | ------------------------------------ |
| `session_id` | string | Ja           | Målsessions-ID                       |
| `content`    | string | Ja           | Meddelandeinnehållet att skicka      |

**Nedskrivningskontroll:** Anroparens taint måste kunna flöda till målsessionens klassificeringsnivå. En `CONFIDENTIAL`-session kan inte skicka data till en `PUBLIC`-session.

### `sessions_spawn`

Skapa en ny bakgrundssession för en autonom uppgift.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                |
| --------- | ------ | ------------ | ---------------------------------------------------------- |
| `task`    | string | Ja           | Beskrivning av vad bakgrundssessionen ska göra             |

Den skapade sessionen startar med oberoende `PUBLIC` taint och sin egen isolerade arbetsyta. Den körs autonomt och returnerar resultat när det är klart.

### `session_status`

Hämta metadata och status för en specifik session.

| Parameter    | Typ    | Obligatorisk | Beskrivning                        |
| ------------ | ------ | ------------ | ---------------------------------- |
| `session_id` | string | Ja           | Sessions-ID:t att kontrollera      |

Returnerar sessions-ID, kanal, användare, taint-nivå och skapandetid. Åtkomst är taint-begränsad.

### `message`

Skicka ett meddelande till en kanal och mottagare. Underkastat nedskrivningstillämpning via policykrokar.

| Parameter   | Typ    | Obligatorisk | Beskrivning                                    |
| ----------- | ------ | ------------ | ---------------------------------------------- |
| `channel`   | string | Ja           | Målkanal (t.ex. `telegram`, `slack`)           |
| `recipient` | string | Ja           | Mottagaridentifierare inom kanalen             |
| `text`      | string | Ja           | Meddelandetext att skicka                      |

### `summarize`

Generera en kortfattad sammanfattning av den aktuella konversationen. Användbart för att skapa överlämningsanteckningar, komprimera kontext eller producera en återberättelse för leverans till en annan kanal.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                   |
| --------- | ------ | ------------ | ------------------------------------------------------------- |
| `scope`   | string | Nej          | Vad som ska sammanfattas: `session` (standard), `topic`       |

### `simulate_tool_call`

Simulera ett verktygsanrop för att förhandsgranska policymoterns beslut utan att köra verktyget. Returnerar krokutvärdingsresultatet (ALLOW, BLOCK eller REDACT) och de regler som utvärderades.

| Parameter   | Typ    | Obligatorisk | Beskrivning                                           |
| ----------- | ------ | ------------ | ----------------------------------------------------- |
| `tool_name` | string | Ja           | Verktyget att simulera anrop för                      |
| `args`      | object | Nej          | Argument att inkludera i simuleringen                 |

::: tip Använd `simulate_tool_call` för att kontrollera om ett verktygsanrop kommer att tillåtas innan det körs. Det här är användbart för att förstå policybeteende utan sidoeffekter. :::

## Användningsfall

### Delegering av bakgrundsuppgifter

Agenten kan skapa en bakgrundssession för att hantera en långvarig uppgift utan att blockera den aktuella konversationen:

```
Användare: "Undersök konkurrentpriser och sammanställ en sammanfattning"
Agent: [anropar sessions_spawn med uppgiften]
Agent: "Jag har startat en bakgrundssession för att undersöka det. Jag har resultat snart."
```

### Korsessionskommunikation

Sessioner kan skicka data till varandra, vilket möjliggör arbetsflöden där en session producerar data som en annan konsumerar:

```
Bakgrundssession slutför undersökning → sessions_send till förälder → förälder meddelar användaren
```

### Kanalöverskridande meddelanden

Verktyget `message` låter agenten proaktivt nå ut på alla anslutna kanaler:

```
Agent identifierar en brådskande händelse → message({ channel: "telegram", recipient: "owner", text: "Varning: ..." })
```

## Säkerhet

- Alla sessionsoperationer är taint-begränsade: du kan inte se, läsa eller skicka till sessioner ovanför din taint-nivå
- `sessions_send` tillämpar nedskrivningsskydd: data kan inte flöda till en lägre klassificering
- Skapade sessioner startar vid `PUBLIC` taint med oberoende taint-spårning
- Verktyget `message` passerar genom `PRE_OUTPUT`-policykrokar före leverans
- Sessions-ID:n injekteras från körkontexten, inte från LLM-argument — agenten kan inte imitera en annan session

::: warning SÄKERHET Nedskrivningsskydd tillämpas på all korsessionskommunikation. En session märkt som `CONFIDENTIAL` kan inte skicka data till en `PUBLIC`-session eller kanal. Det här är en hård gräns som tillämpas av policynivån. :::
