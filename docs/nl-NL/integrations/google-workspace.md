# Google Workspace

Verbind uw Google-account om uw agent toegang te geven tot Gmail, Calendar, Tasks, Drive en Sheets.

## Vereisten

- Een Google-account
- Een Google Cloud-project met OAuth-inloggegevens

## Installatie

### Stap 1: Maak een Google Cloud-project

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Klik op het projectvervolgkeuzemenu bovenaan en selecteer **New Project**
3. Noem het "Triggerfish" (of wat u wilt) en klik op **Create**

### Stap 2: Schakel API's in

Schakel elk van deze API's in uw project in:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Klik op elke pagina op **Enable**. Dit hoeft maar één keer per project te worden gedaan.

### Stap 3: Configureer het OAuth-toestemmingsscherm

Voordat u inloggegevens kunt aanmaken, vereist Google een OAuth-toestemmingsscherm. Dit is het scherm dat gebruikers zien wanneer ze toegang verlenen.

1. Ga naar [OAuth-toestemmingsscherm](https://console.cloud.google.com/apis/credentials/consent)
2. Gebruikerstype: selecteer **External** (of **Internal** als u deel uitmaakt van een Google Workspace-organisatie en alleen organisatiegebruikers wilt toestaan)
3. Klik op **Create**
4. Vul de vereiste velden in:
   - **App name**: "Triggerfish" (of wat u wilt)
   - **User support email**: uw e-mailadres
   - **Developer contact email**: uw e-mailadres
5. Klik op **Save and Continue**
6. Klik in het scherm **Scopes** op **Add or Remove Scopes** en voeg toe:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Klik op **Update**, daarna **Save and Continue**
8. Ga naar de pagina **Audience** (in de linkerzijbalk onder "OAuth-toestemmingsscherm") — hier vindt u de sectie **Test users**
9. Klik op **+ Add Users** en voeg uw eigen Google-e-mailadres toe
10. Klik op **Save and Continue**, daarna **Back to Dashboard**

::: warning Zolang uw app de status "Testing" heeft, kunnen alleen testgebruikers die u heeft toegevoegd autoriseren. Dit is prima voor persoonlijk gebruik. Het publiceren van de app verwijdert de testgebruikersbeperking, maar vereist verificatie door Google. :::

### Stap 4: Maak OAuth-inloggegevens aan

1. Ga naar [Credentials](https://console.cloud.google.com/apis/credentials)
2. Klik bovenaan op **+ CREATE CREDENTIALS**
3. Selecteer **OAuth client ID**
4. Applicatietype: **Desktop app**
5. Naam: "Triggerfish" (of wat u wilt)
6. Klik op **Create**
7. Kopieer de **Client ID** en het **Client Secret**

### Stap 5: Verbinden

```bash
triggerfish connect google
```

U wordt gevraagd om:

1. Uw **Client ID**
2. Uw **Client Secret**

Er wordt een browservenster geopend om toegang te verlenen. Na autorisatie worden tokens veilig opgeslagen in uw OS-sleutelhanger (macOS Keychain of Linux libsecret). Er worden geen inloggegevens opgeslagen in configuratiebestanden of omgevingsvariabelen.

### Verbinding verbreken

```bash
triggerfish disconnect google
```

Verwijdert alle Google-tokens uit uw sleutelhanger. U kunt op elk moment opnieuw verbinding maken door `connect` opnieuw uit te voeren.

## Beschikbare tools

Eenmaal verbonden heeft uw agent toegang tot 14 tools:

| Tool              | Beschrijving                                               |
| ----------------- | ---------------------------------------------------------- |
| `gmail_search`    | E-mails zoeken op query (ondersteunt Gmail-zoeksyntaxis)   |
| `gmail_read`      | Een specifieke e-mail lezen op ID                          |
| `gmail_send`      | Een e-mail opstellen en verzenden                          |
| `gmail_label`     | Labels toevoegen aan of verwijderen van een bericht        |
| `calendar_list`   | Aankomende kalendergebeurtenissen weergeven                |
| `calendar_create` | Een nieuwe kalendergebeurtenis aanmaken                    |
| `calendar_update` | Een bestaande gebeurtenis bijwerken                        |
| `tasks_list`      | Taken weergeven uit Google Tasks                           |
| `tasks_create`    | Een nieuwe taak aanmaken                                   |
| `tasks_complete`  | Een taak markeren als voltooid                             |
| `drive_search`    | Bestanden zoeken in Google Drive                           |
| `drive_read`      | Bestandsinhoud lezen (exporteert Google Docs als tekst)    |
| `sheets_read`     | Een bereik lezen uit een spreadsheet                       |
| `sheets_write`    | Waarden schrijven naar een spreadsheetbereik               |

## Voorbeeldinteracties

Vraag uw agent dingen als:

- "What's on my calendar today?"
- "Search my email for messages from alice@example.com"
- "Send an email to bob@example.com with the subject 'Meeting notes'"
- "Find the Q4 budget spreadsheet in Drive"
- "Add 'Buy groceries' to my task list"
- "Read cells A1:D10 from the Sales spreadsheet"

## OAuth-scopes

Triggerfish vraagt deze scopes tijdens autorisatie:

| Scope            | Toegangsniveau                                  |
| ---------------- | ----------------------------------------------- |
| `gmail.modify`   | E-mail en labels lezen, verzenden en beheren    |
| `calendar`       | Volledige lees-/schrijftoegang tot Google Calendar |
| `tasks`          | Volledige lees-/schrijftoegang tot Google Tasks |
| `drive.readonly` | Alleen-lezen toegang tot Google Drive-bestanden |
| `spreadsheets`   | Lees- en schrijftoegang tot Google Sheets       |

::: tip Drive-toegang is alleen-lezen. Triggerfish kan uw bestanden zoeken en lezen, maar kan ze niet aanmaken, wijzigen of verwijderen. Sheets heeft afzonderlijke schrijftoegang voor spreadsheetcelupdates. :::

## Beveiliging

- Alle Google Workspace-gegevens zijn geclassificeerd als minstens **INTERNAL**
- E-mailinhoud, kalenderdetails en documentinhoud zijn doorgaans **CONFIDENTIAL**
- Tokens worden opgeslagen in de OS-sleutelhanger (macOS Keychain / Linux libsecret)
- Clientinloggegevens worden samen met tokens opgeslagen in de sleutelhanger, nooit in omgevingsvariabelen of configuratiebestanden
- De [No-Write-Down-regel](/nl-NL/security/no-write-down) is van toepassing: CONFIDENTIAL Google-gegevens kunnen niet stromen naar PUBLIC-kanalen
- Alle toolaanroepen worden vastgelegd in het audittrail met volledige classificatiecontext

## Probleemoplossing

### "No Google tokens found"

Voer `triggerfish connect google` uit om te verifiëren.

### "Google refresh token revoked or expired"

Uw vernieuwingstoken is ongeldig gemaakt (bijv. u heeft de toegang ingetrokken in uw Google-accountinstellingen). Voer `triggerfish connect google` uit om opnieuw verbinding te maken.

### "Access blocked: has not completed the Google verification process"

Dit betekent dat uw Google-account niet is vermeld als testgebruiker voor de app. Zolang de app de status "Testing" heeft (de standaard), kunnen alleen accounts die expliciet zijn toegevoegd als testgebruikers autoriseren.

1. Ga naar [OAuth-toestemmingsscherm](https://console.cloud.google.com/apis/credentials/consent)
2. Ga naar de pagina **Audience** (in de linkerzijbalk)
3. Klik in de sectie **Test users** op **+ Add Users** en voeg uw Google-e-mailadres toe
4. Sla op en probeer `triggerfish connect google` opnieuw

### "Token exchange failed"

Controleer uw Client ID en Client Secret. Zorg ervoor dat:

- Het OAuth-clienttype "Desktop app" is
- Alle vereiste API's zijn ingeschakeld in uw Google Cloud-project
- Uw Google-account is vermeld als testgebruiker (als de app in testmodus is)

### API's niet ingeschakeld

Als u 403-fouten ziet voor specifieke services, zorg er dan voor dat de bijbehorende API is ingeschakeld in uw [Google Cloud Console API Library](https://console.cloud.google.com/apis/library).
