# Agentteam

Triggerfish-agenter kan skapa beständiga team av samarbetande agenter som arbetar tillsammans med komplexa uppgifter. Varje teammedlem får sin egen session, roll, konversationskontext och verktyg. En medlem utses till **ledare** och koordinerar arbetet.

Team är bäst lämpade för öppna uppgifter som drar nytta av specialiserade roller som arbetar parallellt: undersökning + analys + skrivande, arkitektur + implementering + granskning, eller uppgifter där olika perspektiv behöver iterera på varandras arbete.

::: info Tillgänglighet
Agentteam kräver **Power**-planen (149 $/månad) vid användning av Triggerfish Gateway. Användare med öppen källkod som kör egna API-nycklar har full åtkomst till agentteam — varje teammedlem konsumerar inferens från din konfigurerade leverantör.
:::

## Verktyg

### `team_create`

Skapa ett beständigt team av agenter som samarbetar kring en uppgift. Definiera medlemsroller, verktyg och modeller. Exakt en medlem måste vara ledaren.

| Parameter                | Typ    | Obligatorisk | Beskrivning                                                        |
| ------------------------ | ------ | ------------ | ------------------------------------------------------------------ |
| `name`                   | string | Ja           | Mänskligt läsbart teamnamn                                         |
| `task`                   | string | Ja           | Teamets mål (skickas till ledaren som initiala instruktioner)      |
| `members`                | array  | Ja           | Teammedlemsdefinitioner (se nedan)                                 |
| `idle_timeout_seconds`   | number | Nej          | Per-member inaktivitetstimeout. Standard: 300 (5 minuter)          |
| `max_lifetime_seconds`   | number | Nej          | Maximal teamlivstid. Standard: 3600 (1 timme)                      |
| `classification_ceiling` | string | Nej          | Teamomfattande klassificeringstak (t.ex. `CONFIDENTIAL`)           |

**Medlemsdefinition:**

| Fält                     | Typ     | Obligatorisk | Beskrivning                                                    |
| ------------------------ | ------- | ------------ | -------------------------------------------------------------- |
| `role`                   | string  | Ja           | Unik rollidentifierare (t.ex. `researcher`, `reviewer`)        |
| `description`            | string  | Ja           | Vad den här medlemmen gör (injiceras i systemprompt)           |
| `is_lead`                | boolean | Ja           | Om den här medlemmen är teamledaren                            |
| `model`                  | string  | Nej          | Modellöverstyrning för den här medlemmen                       |
| `classification_ceiling` | string  | Nej          | Per-member klassificeringstak                                  |
| `initial_task`           | string  | Nej          | Initiala instruktioner (ledaren standard till teamuppgiften)   |

**Valideringsregler:**

- Teamet måste ha exakt en medlem med `is_lead: true`
- Alla roller måste vara unika och icke-tomma
- Medlemmars klassificeringstak kan inte överstiga teamets tak
- `name` och `task` måste vara icke-tomma

### `team_status`

Kontrollera det aktuella läget för ett aktivt team.

| Parameter | Typ    | Obligatorisk | Beskrivning  |
| --------- | ------ | ------------ | ------------ |
| `team_id` | string | Ja           | Team-ID      |

Returnerar teamets status, aggregerat taint-nivå och per-member detaljer inklusive varje members aktuella taint, status och senaste aktivitetstidsstämpel.

### `team_message`

Skicka ett meddelande till en specifik teammedlem. Användbart för att tillhandahålla ytterligare kontext, omdirigera arbete eller begära statusuppdateringar.

| Parameter | Typ    | Obligatorisk | Beskrivning                                          |
| --------- | ------ | ------------ | ---------------------------------------------------- |
| `team_id` | string | Ja           | Team-ID                                              |
| `role`    | string | Nej          | Målmedlemsroll (standard till ledaren)               |
| `message` | string | Ja           | Meddelandeinnehåll                                   |

Teamet måste ha status `running` och målmedlemmen måste vara `active` eller `idle`.

### `team_disband`

Stäng av ett team och avsluta alla medlemssessioner.

| Parameter | Typ    | Obligatorisk | Beskrivning                          |
| --------- | ------ | ------------ | ------------------------------------ |
| `team_id` | string | Ja           | Team-ID                              |
| `reason`  | string | Nej          | Varför teamet upplöses               |

Bara den session som skapade teamet eller ledarsmedlemmen kan upplösa teamet.

## Hur team fungerar

### Skapande

När agenten anropar `team_create` gör Triggerfish följande:

1. Validerar teamdefinitionen (roller, ledarantal, klassificeringstak)
2. Skapar en isolerad agentsession för varje medlem via orkestratorsfabriken
3. Injicerar en **teamrosteringsprompt** i varje members systemprompt, beskriver deras roll, lagkamrater och samarbetsinstruktioner
4. Skickar den initiala uppgiften till ledaren (eller anpassad `initial_task` per member)
5. Startar en livscykelövervakare som kontrollerar teamhälsa var 30:e sekund

Varje membersession är helt isolerad med sin egen konversationskontext, taint-spårning och verktygsstillgång.

### Samarbete

Teammedlemmar kommunicerar med varandra via `sessions_send`. Den skapande agenten behöver inte vidarebefordra meddelanden mellan medlemmar. Det typiska flödet:

1. Ledaren tar emot teamets mål
2. Ledaren bryter ned uppgiften och skickar uppdrag till medlemmar via `sessions_send`
3. Medlemmar arbetar autonomt, anropar verktyg och itererar
4. Medlemmar skickar resultat tillbaka till ledaren (eller direkt till en annan member)
5. Ledaren syntetiserar resultat och avgör när arbetet är klart
6. Ledaren anropar `team_disband` för att stänga av teamet

Meddelanden mellan teammedlemmar levereras direkt via orkestratorn — varje meddelande utlöser ett fullständigt agenttur i mottagarens session.

### Status

Använd `team_status` för att kontrollera framsteg när som helst. Svaret inkluderar:

- **Teamstatus:** `running`, `paused`, `completed`, `disbanded` eller `timed_out`
- **Aggregerat taint:** Den högsta klassificeringsnivån över alla medlemmar
- **Per-member detaljer:** Roll, status (`active`, `idle`, `completed`, `failed`), aktuell taint-nivå och senaste aktivitetstidsstämpel

### Upplösning

Team kan upplösas av:

- Den skapande sessionen som anropar `team_disband`
- Ledarsmedlemmen som anropar `team_disband`
- Livscykelövervakaren som automatiskt upplöser efter livstidsgränsen
- Livscykelövervakaren som identifierar att alla medlemmar är inaktiva

När ett team upplöses avslutas alla aktiva medlemssessioner och resurser rensas upp.

## Teamroller

### Ledare

Ledarsmedlemmen koordinerar teamet. När den skapas:

- Tar emot teamets `task` som initiala instruktioner (om inte åsidosatt av `initial_task`)
- Får systemprompinstruktioner för att bryta ned arbete, tilldela uppgifter och avgöra när målet uppnåtts
- Är behörig att upplösa teamet

Det finns exakt en ledare per team.

### Medlemmar

Icke-ledare är specialister. När de skapas:

- Tar emot sin `initial_task` om den tillhandahålls, annars väntar de tills ledaren skickar dem arbete
- Får systemprompinstruktioner för att skicka slutfört arbete till ledaren eller nästa lämpliga lagkamrat
- Kan inte upplösa teamet

## Livscykelövervakning

Team har automatisk livscykelövervakning som körs var 30:e sekund.

### Inaktivitetstimeout

Varje member har en inaktivitetstimeout (standard: 5 minuter). När en member är inaktiv:

1. **Första tröskel (idle_timeout_seconds):** Membern får ett uppmaningsmeddelande om att skicka resultat om deras arbete är slutfört
2. **Dubbel tröskel (2x idle_timeout_seconds):** Membern avslutas och ledaren meddelas

### Livstidstimeout

Team har en maximal livstid (standard: 1 timme). När gränsen nås:

1. Ledaren tar emot ett varningsmeddelande med 60 sekunder för att producera slutresultat
2. Efter respitperioden upplöses teamet automatiskt

### Hälsokontroller

Övervakaren kontrollerar sessionshälsa var 30:e sekund:

- **Ledarsfel:** Om ledarsessionen inte längre kan nås pausas teamet och den skapande sessionen meddelas
- **Membersfel:** Om en membersession är borta markeras den som `failed` och ledaren meddelas för att fortsätta med återstående members
- **Alla inaktiva:** Om alla members är `completed` eller `failed` meddelas den skapande sessionen för att antingen injicera nya instruktioner eller upplösa

## Klassificering och taint

Teammedlemssessioner följer samma klassificeringsregler som alla andra sessioner:

- Varje member startar vid `PUBLIC` taint och eskalerar när klassificerad data nås
- **Klassificeringstak** kan ställas in per team eller per member för att begränsa vilka data members kan nå
- **Nedskrivningstillämpning** gäller all kommunikation mellan members. En member med `CONFIDENTIAL`-taint kan inte skicka data till en member vid `PUBLIC`
- Det **aggregerade taintet** (det högsta taintet över alla members) rapporteras i `team_status` så att den skapande sessionen kan spåra teamets totala klassificeringsexponering

::: danger SÄKERHET Medlemmars klassificeringstak kan inte överstiga teamets tak. Om teamets tak är `INTERNAL` kan ingen member konfigureras med ett `CONFIDENTIAL`-tak. Det valideras vid skapandetiden. :::

## Team vs Underagenter

| Aspekt          | Underagent (`subagent`)                     | Team (`team_create`)                                         |
| --------------- | ------------------------------------------- | ------------------------------------------------------------ |
| **Livstid**     | Enkelt uppdrag, returnerar resultat och avslutas | Beständigt tills upplöst eller timeout              |
| **Medlemmar**   | En agent                                    | Flera agenter med distinkta roller                           |
| **Interaktion** | Sköt-och-glöm från föräldern                | Medlemmar kommunicerar fritt via `sessions_send`             |
| **Koordination**| Föräldern väntar på resultat                | Ledaren koordinerar, föräldern kan checka in via `team_status` |
| **Användningsfall** | Fokuserad delegation av enkelt steg     | Komplex multi-roll samarbete                                 |

**Använd underagenter** när du behöver en enda agent för att göra en fokuserad uppgift och returnera ett resultat. **Använd team** när uppgiften drar nytta av flera specialiserade perspektiv som itererar på varandras arbete.

::: tip Team är autonoma när de väl skapats. Den skapande agenten kan kontrollera status och skicka meddelanden, men behöver inte detaljstyra. Ledaren hanterar koordinationen. :::
