# KB: Zelfinhoudsproces

Hoe `triggerfish update` werkt, wat er mis kan gaan en hoe te herstellen.

## Hoe het werkt

De updateopdracht downloadt en installeert de nieuwste release van GitHub:

1. **Versiecontrole.** Haalt de nieuwste release-tag op via de GitHub API. Als u al de nieuwste versie heeft, wordt het proces vroegtijdig beëindigd:
   ```
   Already up to date (v0.4.2)
   ```
   Ontwikkelbuilds (`VERSION=dev`) slaan de versiecontrole over en gaan altijd door.

2. **Platformdetectie.** Bepaalt de juiste naam van het binaire bestand op basis van uw besturingssysteem en architectuur (linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64).

3. **Downloaden.** Haalt het binaire bestand en `SHA256SUMS.txt` op uit de GitHub-release.

4. **Checksumverificatie.** Berekent SHA256 van het gedownloade binaire bestand en vergelijkt dit met de invoer in `SHA256SUMS.txt`. Als de checksums niet overeenkomen, wordt de update afgebroken.

5. **Daemon stoppen.** Stopt de lopende daemon voordat het binaire bestand wordt vervangen.

6. **Binair bestand vervangen.** Platformspecifiek:
   - **Linux/macOS:** Hernoemt het oude binaire bestand, verplaatst het nieuwe naar de juiste locatie
   - **macOS extra stap:** Verwijdert quarantaine-attributen met `xattr -cr`
   - **Windows:** Hernoemt het oude binaire bestand naar `.old` (Windows kan een actief uitvoerbaar bestand niet overschrijven) en kopieert vervolgens het nieuwe binaire bestand naar het oorspronkelijke pad

7. **Daemon herstarten.** Start de daemon opnieuw met het nieuwe binaire bestand.

8. **Changelog.** Haalt releasenotes op voor de nieuwe versie en toont deze.

## Sudo-escalatie

Als het binaire bestand is geïnstalleerd in een directory waarvoor roottoegang vereist is (bijv. `/usr/local/bin`), vraagt het updateprogramma om uw wachtwoord om te escaleren met `sudo`.

## Bestandssysteemgrens-verplaatsingen

Als de downloaddirectory en de installatiedirectory zich op verschillende bestandssystemen bevinden (gebruikelijk bij `/tmp` op een aparte partitie), mislukt de atomische hernoeming. Het updateprogramma valt dan terug op kopiëren-dan-verwijderen, wat veilig is maar beide binaire bestanden kort op schijf heeft.

## Wat er mis kan gaan

### "Checksum verification exception"

Het gedownloade binaire bestand komt niet overeen met de verwachte hash. Dit betekent doorgaans:
- De download is beschadigd (netwerkprobleem)
- De release-assets zijn verouderd of gedeeltelijk geüpload

**Oplossing:** Wacht een paar minuten en probeer het opnieuw. Als het aanhoudt, download het binaire bestand dan handmatig van de [releasespagina](https://github.com/greghavens/triggerfish/releases).

### "Asset not found in SHA256SUMS.txt"

De release is gepubliceerd zonder een checksum voor uw platform. Dit is een probleem in de release-pipeline.

**Oplossing:** Dien een [GitHub issue](https://github.com/greghavens/triggerfish/issues) in.

### "Binary replacement failed"

Het updateprogramma kon het oude binaire bestand niet vervangen door het nieuwe. Veelvoorkomende oorzaken:
- Bestandsmachtigingen (binair bestand is eigendom van root maar u draait als gewone gebruiker)
- Bestand is vergrendeld (Windows: een ander proces heeft het binaire bestand geopend)
- Alleen-lezen bestandssysteem

**Oplossing:**
1. Stop de daemon handmatig: `triggerfish stop`
2. Beëindig eventuele verouderde processen
3. Probeer de update opnieuw met de juiste machtigingen

### "Checksum file download failed"

`SHA256SUMS.txt` kan niet worden gedownload van de GitHub-release. Controleer uw netwerkverbinding en probeer het opnieuw.

### Windows `.old`-bestandsopruiming

Na een Windows-update wordt het oude binaire bestand hernoemd naar `triggerfish.exe.old`. Dit bestand wordt automatisch opgeruimd bij de volgende start. Als dit niet wordt opgeruimd (bijv. als het nieuwe binaire bestand crasht bij opstarten), kunt u het handmatig verwijderen.

## Versievergelijking

Het updateprogramma gebruikt semantische versievergelijking:
- Verwijdert het voorvoegsel `v` (zowel `v0.4.2` als `0.4.2` worden geaccepteerd)
- Vergelijkt hoofd-, minor- en patchnummers
- Pre-releaseversies worden afgehandeld (bijv. `v0.4.2-rc.1`)

## Handmatige update

Als het automatische updateprogramma niet werkt:

1. Download het binaire bestand voor uw platform van [GitHub Releases](https://github.com/greghavens/triggerfish/releases)
2. Stop de daemon: `triggerfish stop`
3. Vervang het binaire bestand:
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: verwijder quarantaine
   xattr -cr /usr/local/bin/triggerfish
   ```
4. Start de daemon: `triggerfish start`

## Docker-update

Docker-implementaties gebruiken het binaire updateprogramma niet. Werk de container-image bij:

```bash
# Via het wrapperscript
triggerfish update

# Handmatig
docker compose pull
docker compose up -d
```

Het wrapperscript haalt de nieuwste image op en herstart de container als die actief is.

## Changelog

Na een update worden releasenotes automatisch weergegeven. U kunt deze ook handmatig bekijken:

```bash
triggerfish changelog              # Huidige versie
triggerfish changelog --latest 5   # Laatste 5 releases
```

Als het ophalen van de changelog mislukt na een update, wordt dit gelogd maar heeft het geen invloed op de update zelf.
