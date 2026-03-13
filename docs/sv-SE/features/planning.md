# Plansläge och uppgiftsspårning

Triggerfish tillhandahåller två kompletterande verktyg för strukturerat arbete: **plansläge** för komplex implementeringsplanering och **uppgiftsspårning** för aktivitetshantering över sessioner.

## Plansläge

Plansläge begränsar agenten till skrivskyddad utforskning och strukturerad planering innan ändringar görs. Det förhindrar agenten från att hoppa in i implementeringen innan problemet är förstått.

### Verktyg

#### `plan_enter`

Aktivera plansläge. Blockerar skrivoperationer (`write_file`, `cron_create`, `cron_delete`) tills planen godkänts.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                            |
| --------- | ------ | ------------ | ---------------------------------------------------------------------- |
| `goal`    | string | Ja           | Vad agenten planerar att bygga/ändra                                   |
| `scope`   | string | Nej          | Begränsa utforskning till specifika kataloger eller moduler            |

#### `plan_exit`

Avsluta plansläge och presentera implementeringsplanen för användarens godkännande. Börjar **inte** automatiskt köra.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                                   |
| --------- | ------ | ------------ | ----------------------------------------------------------------------------- |
| `plan`    | object | Ja           | Implementeringsplanen (sammanfattning, approach, steg, risker, filer, tester) |

Planobjektet inkluderar:

- `summary` — Vad planen åstadkommer
- `approach` — Hur det ska göras
- `alternatives_considered` — Vilka andra approach:er utvärderades
- `steps` — Ordnad lista av implementeringssteg, var och en med filer, beroenden och verifiering
- `risks` — Kända risker och begränsningar
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Returnerar nuvarande planslägesläge: aktivt läge, mål och planframsteg.

#### `plan_approve`

Godkänn den väntande planen och börja köra. Anropas när användaren godkänner.

#### `plan_reject`

Avvisa den väntande planen och återgå till normalt läge.

#### `plan_step_complete`

Markera ett plansteg som slutfört under exekvering.

| Parameter             | Typ    | Obligatorisk | Beskrivning                                |
| --------------------- | ------ | ------------ | ------------------------------------------ |
| `step_id`             | number | Ja           | Steg-ID:t att markera som slutfört         |
| `verification_result` | string | Ja           | Utdata från verifieringskommandot          |

#### `plan_complete`

Markera hela planen som slutförd.

| Parameter    | Typ    | Obligatorisk | Beskrivning                               |
| ------------ | ------ | ------------ | ----------------------------------------- |
| `summary`    | string | Ja           | Vad som åstadkoms                         |
| `deviations` | array  | Nej          | Eventuella ändringar från den ursprungliga planen |

#### `plan_modify`

Begär en ändring av ett godkänt plansteg. Kräver användarens godkännande.

| Parameter          | Typ    | Obligatorisk | Beskrivning                       |
| ------------------ | ------ | ------------ | --------------------------------- |
| `step_id`          | number | Ja           | Vilket steg som behöver ändras    |
| `reason`           | string | Ja           | Varför ändringen behövs           |
| `new_description`  | string | Ja           | Uppdaterad stegbeskrivning        |
| `new_files`        | array  | Nej          | Uppdaterad fillista               |
| `new_verification` | string | Nej          | Uppdaterat verifieringskommando   |

### Arbetsflöde

```
1. Användaren ber om något komplext
2. Agenten anropar plan_enter({ goal: "..." })
3. Agenten utforskar kodbasen (bara skrivskyddade verktyg)
4. Agenten anropar plan_exit({ plan: { ... } })
5. Användaren granskar planen
6. Användaren godkänner → agenten anropar plan_approve
   (eller avvisar → agenten anropar plan_reject)
7. Agenten kör steg för steg och anropar plan_step_complete efter varje
8. Agenten anropar plan_complete när det är klart
```

### När plansläge används

Agenten aktiverar plansläge för komplexa uppgifter: bygga funktioner, omstrukturera system, implementera flerfilsändringar. För enkla uppgifter (rätta ett stavfel, byta namn på en variabel) hoppar den över plansläget och agerar direkt.

## Uppgiftsspårning

Agenten har en beständig uppgiftslista för att spåra arbete i flera steg över sessioner.

### Verktyg

#### `todo_read`

Läs den aktuella uppgiftslistan. Returnerar alla poster med deras ID, innehåll, status, prioritet och tidsstämplar.

#### `todo_write`

Ersätt hela uppgiftslistan. Det här är ett fullständigt byte, inte en partiell uppdatering.

| Parameter | Typ   | Obligatorisk | Beskrivning                         |
| --------- | ----- | ------------ | ----------------------------------- |
| `todos`   | array | Ja           | Komplett lista med uppgiftsposter   |

Varje uppgiftspost har:

| Fält         | Typ    | Värden                                |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | Unik identifierare                    |
| `content`    | string | Uppgiftsbeskrivning                   |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | ISO-tidsstämpel                       |
| `updated_at` | string | ISO-tidsstämpel                       |

### Beteende

- Uppgifter är scoped per agent (inte per session) — de bevaras över sessioner, trigger-uppvakningar och omstarter
- Agenten använder bara uppgifter för genuint komplexa uppgifter (3+ distinkta steg)
- En uppgift är `in_progress` åt gången; slutförda poster markeras omedelbart
- När agenten skriver en ny lista som utelämnar tidigare lagrade poster bevaras dessa poster automatiskt som `completed`
- När alla poster är `completed` bevaras inte gamla poster (rent slate)

### Visning

Uppgifter renderas i både CLI och Tidepool:

- **CLI** — Stilat ANSI-rutor med statusikoner: `✓` (slutförd, genomstrucken), `▶` (pågår, fet), `○` (väntande)
- **Tidepool** — HTML-lista med CSS-klasser för varje status
