# Planmodus og oppgavesporing

Triggerfish tilbyr to komplementære verktøy for strukturert arbeid: **planmodus**
for kompleks implementasjonsplanlegging, og **todo-sporing** for oppgaveadministrasjon
på tvers av sesjoner.

## Planmodus

Planmodus begrenser agenten til skrivebeskyttet utforskning og strukturert
planlegging før endringer gjøres. Dette forhindrer agenten fra å hoppe inn i
implementasjon før problemet er forstått.

### Verktøy

#### `plan_enter`

Gå inn i planmodus. Blokkerer skriveoperasjoner (`write_file`, `cron_create`,
`cron_delete`) inntil planen er godkjent.

| Parameter | Type   | Påkrevd | Beskrivelse                                                         |
| --------- | ------ | ------- | ------------------------------------------------------------------- |
| `goal`    | string | Ja      | Hva agenten planlegger å bygge/endre                                |
| `scope`   | string | Nei     | Begrens utforskning til spesifikke kataloger eller moduler          |

#### `plan_exit`

Gå ut av planmodus og presenter implementasjonsplanen for brukergodkjenning.
Starter **ikke** kjøring automatisk.

| Parameter | Type   | Påkrevd | Beskrivelse                                                                        |
| --------- | ------ | ------- | ---------------------------------------------------------------------------------- |
| `plan`    | object | Ja      | Implementasjonsplanen (sammendrag, tilnærming, trinn, risikoer, filer, tester)     |

Planobjektet inkluderer:

- `summary` — Hva planen oppnår
- `approach` — Hvordan det skal gjøres
- `alternatives_considered` — Hvilke andre tilnærminger som ble vurdert
- `steps` — Ordnet liste over implementasjonstrinn, hvert med filer,
  avhengigheter og verifikasjon
- `risks` — Kjente risikoer og avbøtende tiltak
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Returnerer gjeldende planmodestatus: aktiv modus, mål og planfremdrift.

#### `plan_approve`

Godkjenn den ventende planen og begynn kjøring. Kalles når brukeren godkjenner.

#### `plan_reject`

Avvis den ventende planen og gå tilbake til normal modus.

#### `plan_step_complete`

Merk et plantrinn som fullført under kjøring.

| Parameter             | Type   | Påkrevd | Beskrivelse                               |
| --------------------- | ------ | ------- | ----------------------------------------- |
| `step_id`             | number | Ja      | Trinns-ID-en som skal merkes som fullført |
| `verification_result` | string | Ja      | Utdata fra verifiseringskommandoen        |

#### `plan_complete`

Merk hele planen som fullført.

| Parameter    | Type   | Påkrevd | Beskrivelse                            |
| ------------ | ------ | ------- | -------------------------------------- |
| `summary`    | string | Ja      | Hva som ble oppnådd                    |
| `deviations` | array  | Nei     | Eventuelle avvik fra den opprinnelige planen |

#### `plan_modify`

Be om en endring av et godkjent plantrinn. Krever brukergodkjenning.

| Parameter          | Type   | Påkrevd | Beskrivelse                       |
| ------------------ | ------ | ------- | --------------------------------- |
| `step_id`          | number | Ja      | Hvilket trinn som trenger endring |
| `reason`           | string | Ja      | Hvorfor endringen er nødvendig    |
| `new_description`  | string | Ja      | Oppdatert trinns-beskrivelse      |
| `new_files`        | array  | Nei     | Oppdatert filliste                |
| `new_verification` | string | Nei     | Oppdatert verifiseringskommando   |

### Arbeidsflyt

```
1. Bruker ber om noe komplekst
2. Agent kaller plan_enter({ goal: "..." })
3. Agent utforsker kodebase (bare skrivebeskyttede verktøy)
4. Agent kaller plan_exit({ plan: { ... } })
5. Bruker gjennomgår planen
6. Bruker godkjenner → agent kaller plan_approve
   (eller avviser → agent kaller plan_reject)
7. Agent kjører trinn for trinn, kaller plan_step_complete etter hvert
8. Agent kaller plan_complete når ferdig
```

### Når planmodus brukes

Agenten går inn i planmodus for komplekse oppgaver: bygge funksjoner, refaktorere
systemer, implementere endringer i flere filer. For enkle oppgaver (rette en
skrivefeil, gi nytt navn til en variabel), hopper den over planmodus og handler
direkte.

## Todo-sporing

Agenten har en vedvarende todo-liste for sporing av flertrinnsarbeid på tvers
av sesjoner.

### Verktøy

#### `todo_read`

Les den gjeldende todo-listen. Returnerer alle elementer med ID, innhold,
status, prioritet og tidsstempler.

#### `todo_write`

Erstatt hele todo-listen. Dette er en komplett erstatning, ikke en delvis
oppdatering.

| Parameter | Type  | Påkrevd | Beskrivelse                   |
| --------- | ----- | ------- | ----------------------------- |
| `todos`   | array | Ja      | Komplett liste over todo-elementer |

Hvert todo-element har:

| Felt         | Type   | Verdier                                   |
| ------------ | ------ | ----------------------------------------- |
| `id`         | string | Unik identifikator                        |
| `content`    | string | Oppgavebeskrivelse                        |
| `status`     | string | `pending`, `in_progress`, `completed`     |
| `priority`   | string | `high`, `medium`, `low`                   |
| `created_at` | string | ISO-tidsstempel                           |
| `updated_at` | string | ISO-tidsstempel                           |

### Atferd

- Todos er scoped per-agent (ikke per sesjon) — de vedvarer på tvers av sesjoner,
  trigger-oppvåkninger og omstarter
- Agenten bruker bare todos for genuint komplekse oppgaver (3+ distinkte trinn)
- Én oppgave er `in_progress` om gangen; fullførte elementer merkes umiddelbart
- Når agenten skriver en ny liste som utelater tidligere lagrede elementer,
  bevares disse automatisk som `completed`
- Når alle elementer er `completed`, bevares ikke gamle elementer (ren start)

### Visning

Todos gjengis i både CLI og Tidepool:

- **CLI** — Stilisert ANSI-boks med statusikoner: `✓` (fullført, gjennomstreket),
  `▶` (pågår, fet), `○` (venter)
- **Tidepool** — HTML-liste med CSS-klasser for hver status
