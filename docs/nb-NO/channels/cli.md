# CLI-kanal

Kommandolinjegrensesnittet er standardkanalen i Triggerfish. Den er alltid tilgjengelig, krever ingen ekstern oppsett, og er den primære måten du samhandler med agenten din under utvikling og lokal bruk.

## Klassifisering

CLI-kanalen er som standard `INTERNAL`-klassifisert. Terminalbrukeren behandles **alltid** som eier — det finnes ingen paring eller autentiseringsflyt fordi du kjører prosessen direkte på maskinen din.

::: info Hvorfor INTERNAL? CLI er et direkte, lokalt grensesnitt. Bare noen med tilgang til terminalen din kan bruke det. Dette gjør `INTERNAL` til riktig standard — agenten din kan dele interne data fritt i denne konteksten. :::

## Funksjoner

### Rå terminalinndata

CLI bruker rå terminalmodus med full ANSI escape-sekvensanalyse. Dette gir deg en rik redigeringsopplevelse direkte i terminalen din:

- **Linjeredigering** — Naviger med piltaster, Home/End, slett ord med Ctrl+W
- **Inndatahistorikk** — Trykk opp/ned for å bla gjennom tidligere inndataer
- **Forslag** — Tab-fullføring for vanlige kommandoer
- **Flerlinjeinndata** — Skriv inn lengre prompter naturlig

### Kompakt verktøyvisning

Når agenten kaller verktøy, viser CLI en kompakt enlinjeoppsummering som standard:

```
tool_name arg  result
```

Veksle mellom kompakt og utvidet verktøyutdata med **Ctrl+O**.

### Avbryt pågående operasjoner

Trykk **ESC** for å avbryte gjeldende operasjon. Dette sender et avbruddsignal gjennom orkestratorern til LLM-leverandøren, og stopper genereringen umiddelbart. Du trenger ikke vente på at et langt svar skal fullføres.

### Taint-visning

Du kan valgfritt vise gjeldende session taint-nivå i utdataet ved å aktivere `showTaint` i CLI-kanalkonfigurasjonen. Dette setter klassifiseringsnivået foran hvert svar:

```
[CONFIDENTIAL] Her er Q4-pipeline-tallene dine...
```

### Kontekstlengde-fremdriftslinje

CLI viser en sanntids kontekstvindubrukslinje i separatorlinjen nederst på terminalen:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Linjen fylles etter hvert som konteksttokens forbrukes
- En blå markør vises ved 70%-terskelen (der automatisk komprimering utløses)
- Linjen blir rød når den nærmer seg grensen
- Etter komprimering (`/compact` eller automatisk) tilbakestilles linjen

### MCP-serverstatus

Separatoren viser også MCP-servertilkoblingsstatus:

| Visning            | Betydning                                      |
| ------------------ | ---------------------------------------------- |
| `MCP 3/3` (grønn)  | Alle konfigurerte servere tilkoblet            |
| `MCP 2/3` (gul)    | Noen servere kobler til fortsatt eller feilet  |
| `MCP 0/3` (rød)    | Ingen servere tilkoblet                        |

MCP-servere kobler til latent i bakgrunnen etter oppstart. Statusen oppdateres i sanntid etter hvert som servere kommer online.

## Inndatahistorikk

Inndatahistorikken din lagres på tvers av sesjoner på:

```
~/.triggerfish/data/input_history.json
```

Historikken lastes inn ved oppstart og lagres etter hvert inndata. Du kan tømme den ved å slette filen.

## Ikke-TTY / dirigert inndata

Når stdin ikke er en TTY (for eksempel ved å dirigere inndata fra en annen prosess), faller CLI automatisk tilbake til **linjelagret modus**. I denne modusen:

- Rå terminalfunksjoner (piltaster, historikknavigering) er deaktivert
- Inndata leses linje for linje fra stdin
- Utdata skrives til stdout uten ANSI-formatering

Dette lar deg skripte interaksjoner med agenten din:

```bash
echo "Hva er været i dag?" | triggerfish run
```

## Konfigurasjon

CLI-kanalen krever minimal konfigurasjon. Den opprettes automatisk når du kjører `triggerfish run` eller bruker den interaktive REPL.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Alternativ    | Type    | Standard | Beskrivelse                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| `interactive` | boolean | `true`   | Aktiver interaktiv REPL-modus                   |
| `showTaint`   | boolean | `false`  | Vis session taint-nivå i utdata                 |

::: tip Ingen oppsett nødvendig CLI-kanalen fungerer rett ut av esken. Du trenger ikke konfigurere noe for å begynne å bruke Triggerfish fra terminalen din. :::

## Tastatursnarveier

| Snarvei    | Handling                                                        |
| ---------- | --------------------------------------------------------------- |
| Enter      | Send melding                                                    |
| Opp / Ned  | Naviger inndatahistorikk                                        |
| Ctrl+V     | Lim inn bilde fra utklippstavle (sendes som multimodalt innhold)|
| Ctrl+O     | Veksle mellom kompakt/utvidet verktøyvisning                   |
| ESC        | Avbryt gjeldende operasjon                                      |
| Ctrl+C     | Avslutt CLI                                                     |
| Ctrl+W     | Slett forrige ord                                               |
| Home / End | Hopp til start/slutt av linje                                   |
