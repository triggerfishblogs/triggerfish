# Obsidian

Koble Triggerfish-agenten din til ett eller flere [Obsidian](https://obsidian.md/)-hvelvmapper slik at den kan lese, opprette og søke i notatene dine. Integrasjonen aksesserer hvelvmapper direkte på filsystemet — ingen Obsidian-app eller plugin er nødvendig.

## Hva det gjør

Obsidian-integrasjonen gir agenten disse verktøyene:

| Verktøy              | Beskrivelse                                     |
| -------------------- | ----------------------------------------------- |
| `obsidian_read`      | Les et notats innhold og frontmatter            |
| `obsidian_write`     | Opprett eller oppdater et notat                 |
| `obsidian_list`      | List notater i en mappe                         |
| `obsidian_search`    | Søk i notatinnhold                              |
| `obsidian_daily`     | Les eller opprett dagens daglige notat          |
| `obsidian_links`     | Løs wikilinks og finn tilbakekoblinger          |
| `obsidian_delete`    | Slett et notat                                  |

## Oppsett

### Trinn 1: Koble til hvelvmappen din

```bash
triggerfish connect obsidian
```

Dette ber om hvelvstien din og skriver konfigurasjonen.

### Trinn 2: Konfigurer i triggerfish.yaml

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/HovedHvelv
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Privat/Helse": CONFIDENTIAL
        "Privat/Økonomi": RESTRICTED
        "Arbeid": INTERNAL
        "Offentlig": PUBLIC
```

| Alternativ              | Type     | Påkrevd | Beskrivelse                                             |
| ----------------------- | -------- | ------- | ------------------------------------------------------- |
| `vaultPath`             | string   | Ja      | Absolutt sti til Obsidian-hvelvrooten                   |
| `defaultClassification` | string   | Nei     | Standard klassifisering for notater (standard: `INTERNAL`) |
| `excludeFolders`        | string[] | Nei     | Mapper å ignorere (standard: `.obsidian`, `.trash`)     |
| `folderClassifications` | object   | Nei     | Kartlegg mappestier til klassifiseringsnivåer           |

### Flere hvelvmapper

Du kan koble til flere hvelvmapper med forskjellige klassifiseringsnivåer:

```yaml
obsidian:
  vaults:
    personlig:
      vaultPath: ~/Obsidian/Personlig
      defaultClassification: CONFIDENTIAL
    arbeid:
      vaultPath: ~/Obsidian/Arbeid
      defaultClassification: INTERNAL
    offentlig:
      vaultPath: ~/Obsidian/OffentligeNotater
      defaultClassification: PUBLIC
```

## Mappebasert klassifisering

Notater arver klassifisering fra mappen sin. Den mest spesifikke samsvarende mappen vinner:

```yaml
folderClassifications:
  "Privat": CONFIDENTIAL
  "Privat/Helse": RESTRICTED
  "Arbeid": INTERNAL
```

Med denne konfigurasjonen:

- `Privat/gjøremål.md` er `CONFIDENTIAL`
- `Privat/Helse/journal.md` er `RESTRICTED`
- `Arbeid/prosjekt.md` er `INTERNAL`
- `notater.md` (hvelvrot) bruker `defaultClassification`

Klassifiseringsgating gjelder: agenten kan bare lese notater hvis klassifiseringsnivå flyter til gjeldende session taint. En `PUBLIC`-taintet sesjon kan ikke aksessere `CONFIDENTIAL`-notater.

## Sikkerhet

### Stibegrensning

Alle filoperasjoner er begrenset til hvelvrooten. Adapteren bruker `Deno.realPath` for å løse symbolske lenker og forhindre stioverskridingsangrep. Ethvert forsøk på å lese `../../etc/passwd` eller lignende blokkeres før filsystemet berøres.

### Hvelvverifisering

Adapteren verifiserer at en `.obsidian/`-mappe finnes ved hvelvrooten før stien aksepteres. Dette sikrer at du peker på et faktisk Obsidian-hvelv, ikke en vilkårlig mappe.

### Klassifiseringshåndhevelse

- Notater bærer klassifisering fra mappekartleggingen sin
- Å lese et `CONFIDENTIAL`-notat eskalerer session taint til `CONFIDENTIAL`
- No-write-down-regelen forhindrer skriving av klassifisert innhold til lavere-klassifiserte mapper
- Alle notatoperasjoner passerer gjennom standard policy-hooks

## Wikilinks

Adapteren forstår Obsidians `[[wikilink]]`-syntaks. `obsidian_links`-verktøyet løser wikilinks til faktiske filstier og finner alle notater som lenker tilbake til et gitt notat (tilbakekoblinger).

## Daglige notater

`obsidian_daily`-verktøyet leser eller oppretter dagens daglige notat ved hjelp av hvelvets daglige notatmappekonvensjon. Hvis notatet ikke finnes, opprettes det med en standardmal.

## Frontmatter

Notater med YAML-frontmatter analyseres automatisk. Frontmatter-felter er tilgjengelige som metadata ved lesing av notater. Adapteren bevarer frontmatter ved skriving eller oppdatering av notater.
