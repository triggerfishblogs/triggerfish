# KB: Självuppdateringsprocess

Hur `triggerfish update` fungerar, vad som kan gå fel och hur man återhämtar sig.

## Hur det fungerar

Uppdateringskommandot laddar ner och installerar den senaste utgåvan från GitHub:

1. **Versionskontroll.** Hämtar den senaste utgåvstaggen från GitHub API. Om du redan är på den senaste versionen avslutar det tidigt:
   ```
   Already up to date (v0.4.2)
   ```
   Utvecklingsbyggen (`VERSION=dev`) hoppar över versionskontrollen och fortsätter alltid.

2. **Plattformsidentifiering.** Fastställer korrekt binärtillgångsnamn baserat på ditt OS och arkitektur (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Nedladdning.** Hämtar binären och `SHA256SUMS.txt` från GitHub-utgåvan.

4. **Kontrollsummaverifiering.** Beräknar SHA256 för den nedladdade binären och jämför den med posten i `SHA256SUMS.txt`. Om kontrollsummorna inte matchar avbryts uppdateringen.

5. **Daemon-stopp.** Stoppar den körande daemonen innan binären ersätts.

6. **Binärersättning.** Plattformsspecifikt:
   - **Linux/macOS:** Byter namn på gammal binär, flyttar ny på plats
   - **macOS extra steg:** Rensar karantänattribut med `xattr -cr`
   - **Windows:** Byter namn på gammal binär till `.old` (Windows kan inte skriva över en körande körbar fil), kopierar sedan den nya binären till den ursprungliga sökvägen

7. **Daemon-omstart.** Startar daemonen med den nya binären.

8. **Ändringslogg.** Hämtar och visar versionsinformation för den nya versionen.

## Sudo-eskalering

Om binären är installerad i en katalog som kräver root-åtkomst (t.ex. `/usr/local/bin`) uppmanar uppdateringsverktyget för ditt lösenord för att eskalera med `sudo`.

## Flytt mellan filsystem

Om nedladdningskatalogen och installationskatalogen finns på olika filsystem (vanligt med `/tmp` på en separat partition) misslyckas den atomiska namnbytet. Uppdateringsverktyget faller tillbaka till kopiera-sedan-ta-bort, vilket är säkert men har båda binärer kortvarigt på disk.

## Vad som kan gå fel

### "Checksum verification exception"

Den nedladdade binären matchar inte den förväntade hashen. Det innebär vanligtvis:
- Nedladdningen korrupterades (nätverksproblem)
- Utgångstillgångarna är inaktuella eller delvis uppladdade

**Åtgärd:** Vänta några minuter och försök igen. Om det kvarstår, ladda ner binären manuellt från [utgåvssidan](https://github.com/greghavens/triggerfish/releases).

### "Asset not found in SHA256SUMS.txt"

Utgåvan publicerades utan en kontrollsumma för din plattform. Det är ett problem med utgåvspipelinen.

**Åtgärd:** Rapportera ett [GitHub-ärende](https://github.com/greghavens/triggerfish/issues).

### "Binary replacement failed"

Uppdateringsverktyget kunde inte ersätta den gamla binären med den nya. Vanliga orsaker:
- Filbehörigheter (binären ägs av root men du kör som en vanlig användare)
- Fil är låst (Windows: en annan process har binären öppen)
- Skrivskyddat filsystem

**Åtgärd:**
1. Stoppa daemonen manuellt: `triggerfish stop`
2. Avsluta eventuella inaktuella processer
3. Försök uppdateringen igen med lämpliga behörigheter

### "Checksum file download failed"

Kan inte ladda ner `SHA256SUMS.txt` från GitHub-utgåvan. Kontrollera din nätverksanslutning och försök igen.

### Windows `.old`-filrensning

Efter en Windows-uppdatering döps den gamla binären om till `triggerfish.exe.old`. Den här filen rensas automatiskt upp vid nästa start. Om den inte rensas upp (t.ex. den nya binären kraschar vid uppstart) kan du ta bort den manuellt.

## Versionsjämförelse

Uppdateringsverktyget använder semantisk versionsjämförelse:
- Tar bort det ledande `v`-prefixet (både `v0.4.2` och `0.4.2` accepteras)
- Jämför major, minor och patch numeriskt
- Förhandsutgåveversioner hanteras (t.ex. `v0.4.2-rc.1`)

## Manuell uppdatering

Om det automatiska uppdateringsverktyget inte fungerar:

1. Ladda ner binären för din plattform från [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. Stoppa daemonen: `triggerfish stop`
3. Ersätt binären:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: rensa karantän
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Starta daemonen: `triggerfish start`

## Docker-uppdatering

Docker-distributioner använder inte binäruppdateringsverktyget. Uppdatera containeravbildningen:

```bash
# Använda omskriptsskriptet
triggerfish update

# Manuellt
docker compose pull
docker compose up -d
```

Omskriptsskriptet hämtar den senaste avbildningen och startar om containern om en körs.

## Ändringslogg

Efter en uppdatering visas versionsinformation automatiskt. Du kan också se dem manuellt:

```bash
triggerfish changelog              # Aktuell version
triggerfish changelog --latest 5   # De 5 senaste utgåvorna
```

Om hämtning av ändringslogg misslyckas efter en uppdatering loggas det men påverkar inte uppdateringen i sig.
