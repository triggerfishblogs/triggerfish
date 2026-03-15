# KB: Selvoppdateringsprosess

Hvordan `triggerfish update` fungerer, hva som kan gå galt, og hvordan du
gjenoppretter.

## Slik fungerer det

Oppdateringskommandoen laster ned og installerer den nyeste utgivelsen fra GitHub:

1. **Versjonskontroll.** Henter den nyeste utgivelsesetiketten fra GitHub API.
   Hvis du allerede er på den nyeste versjonen, avsluttes den tidlig:
   ```
   Already up to date (v0.4.2)
   ```
   Utviklingsbygg (`VERSION=dev`) hopper over versjonskontrollen og fortsetter
   alltid.

2. **Plattformdeteksjon.** Bestemmer riktig binærressursnavn basert på ditt OS
   og arkitektur (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Nedlasting.** Henter binærfilen og `SHA256SUMS.txt` fra GitHub-utgivelsen.

4. **Kontrollsumverifisering.** Beregner SHA256 av den nedlastede binærfilen og
   sammenligner den med oppføringen i `SHA256SUMS.txt`. Hvis kontrollsummene ikke
   stemmer, avbrytes oppdateringen.

5. **Daemon-stopp.** Stopper den kjørende daemonen før binærfilen erstattes.

6. **Binærfilerstatning.** Plattformspesifikk:
   - **Linux/macOS:** Gir gammel binær nytt navn, flytter ny på plass
   - **macOS ekstra trinn:** Fjerner karanteneattributter med `xattr -cr`
   - **Windows:** Gir gammel binær nytt navn til `.old` (Windows kan ikke overskrive
     en kjørende kjørbar fil), kopierer deretter den nye binærfilen til den
     opprinnelige banen

7. **Daemon-restart.** Starter daemonen med den nye binærfilen.

8. **Endringslogg.** Henter og viser utgivelsesnotater for den nye versjonen.

## Sudo-eskalering

Hvis binærfilen er installert i en mappe som krever root-tilgang (f.eks.
`/usr/local/bin`), ber oppdatereren om passordet ditt for å eskalere med `sudo`.

## Tverrfilesystemflytting

Hvis nedlastingsmappen og installasjonsmappen er på forskjellige filsystemer
(vanlig med `/tmp` på en separat partisjon), vil den atomiske omdøpingen
mislykkes. Oppdatereren faller tilbake til kopi-deretter-fjern, som er trygt,
men midlertidig har begge binærfiler på disk.

## Hva kan gå galt

### «Checksum verification exception»

Den nedlastede binærfilen samsvarer ikke med forventet hash. Dette betyr vanligvis:
- Nedlastingen ble korruptert (nettverksproblem)
- Utgivelsesressursene er utdaterte eller delvis opplastet

**Løsning:** Vent noen minutter og prøv igjen. Hvis problemet vedvarer, last ned
binærfilen manuelt fra [utgivelsessiden](https://github.com/greghavens/triggerfish/releases).

### «Asset not found in SHA256SUMS.txt»

Utgivelsen ble publisert uten en kontrollsum for din plattform. Dette er et
utgivelsespipeline-problem.

**Løsning:** Rapporter en [GitHub-sak](https://github.com/greghavens/triggerfish/issues).

### «Binary replacement failed»

Oppdatereren kunne ikke erstatte den gamle binærfilen med den nye. Vanlige årsaker:
- Filtillatelser (binærfilen eies av root, men du kjører som en vanlig bruker)
- Filen er låst (Windows: en annen prosess har binærfilen åpen)
- Skrivebeskyttet filsystem

**Løsning:**
1. Stopp daemonen manuelt: `triggerfish stop`
2. Avslutt alle utdaterte prosesser
3. Prøv oppdateringen igjen med riktige tillatelser

### «Checksum file download failed»

Kan ikke laste ned `SHA256SUMS.txt` fra GitHub-utgivelsen. Sjekk
nettverkstilkoblingen og prøv igjen.

### Windows `.old`-filopprydding

Etter en Windows-oppdatering gis den gamle binærfilen nytt navn til
`triggerfish.exe.old`. Denne filen ryddes opp automatisk ved neste oppstart. Hvis
den ikke ryddes opp (f.eks. den nye binærfilen krasjer ved oppstart), kan du
slette den manuelt.

## Versjonssammenligning

Oppdatereren bruker semantisk versjonering:
- Fjerner ledende `v`-prefiks (både `v0.4.2` og `0.4.2` godtas)
- Sammenligner major, minor og patch numerisk
- Forhåndsutgivelsesversjoner håndteres (f.eks. `v0.4.2-rc.1`)

## Manuell oppdatering

Hvis den automatiske oppdatereren ikke fungerer:

1. Last ned binærfilen for din plattform fra [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. Stopp daemonen: `triggerfish stop`
3. Erstatt binærfilen:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: fjern karantene
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Start daemonen: `triggerfish start`

## Docker-oppdatering

Docker-distribusjoner bruker ikke binæroppdatereren. Oppdater containerbildet:

```bash
# Bruker innpakningsskriptet
triggerfish update

# Manuelt
docker compose pull
docker compose up -d
```

Innpakningsskriptet henter det nyeste bildet og restarter containeren hvis en
kjører.

## Endringslogg

Etter en oppdatering vises utgivelsesnotater automatisk. Du kan også se dem
manuelt:

```bash
triggerfish changelog              # Gjeldende versjon
triggerfish changelog --latest 5   # Siste 5 utgivelser
```

Hvis henting av endringslogg mislykkes etter en oppdatering, logges det, men
påvirker ikke selve oppdateringen.
