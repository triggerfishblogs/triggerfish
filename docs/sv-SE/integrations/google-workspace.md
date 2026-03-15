# Google Workspace

Anslut ditt Google-konto för att ge din agent tillgång till Gmail, Kalender, Uppgifter, Drive och Kalkylark.

## Förutsättningar

- Ett Google-konto
- Ett Google Cloud-projekt med OAuth-uppgifter

## Installation

### Steg 1: Skapa ett Google Cloud-projekt

1. Gå till [Google Cloud Console](https://console.cloud.google.com/)
2. Klicka på projektlistan längst upp och välj **New Project**
3. Namnge det "Triggerfish" (eller vad du föredrar) och klicka på **Create**

### Steg 2: Aktivera API:er

Aktivera vart och ett av dessa API:er i ditt projekt:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Klicka på **Enable** på varje sida. Det här behöver bara göras en gång per projekt.

### Steg 3: Konfigurera OAuth-medgivandeskärmen

Innan du kan skapa uppgifter kräver Google en OAuth-medgivandeskärm. Det här är skärmen som användare ser när de beviljar åtkomst.

1. Gå till [OAuth-medgivandeskärm](https://console.cloud.google.com/apis/credentials/consent)
2. Användartyp: välj **External** (eller **Internal** om du är i en Google Workspace-organisation och bara vill ha organisationsanvändare)
3. Klicka på **Create**
4. Fyll i de obligatoriska fälten:
   - **App name**: "Triggerfish" (eller vad du gillar)
   - **User support email**: din e-postadress
   - **Developer contact email**: din e-postadress
5. Klicka på **Save and Continue**
6. På skärmen **Scopes**, klicka på **Add or Remove Scopes** och lägg till:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Klicka på **Update**, sedan **Save and Continue**
8. Gå till sidan **Audience** (i vänstra sidofältet under "OAuth consent screen") — det är här du hittar avsnittet **Test users**
9. Klicka på **+ Add Users** och lägg till din egen Google-e-postadress
10. Klicka på **Save and Continue**, sedan **Back to Dashboard**

::: warning Medan din app har statusen "Testing" kan bara testanvändare du lagt till auktorisera. Det här är bra för personlig användning. Att publicera appen tar bort testanvändarbegränsningen men kräver Googles verifiering. :::

### Steg 4: Skapa OAuth-uppgifter

1. Gå till [Credentials](https://console.cloud.google.com/apis/credentials)
2. Klicka på **+ CREATE CREDENTIALS** längst upp
3. Välj **OAuth client ID**
4. Applikationstyp: **Desktop app**
5. Namn: "Triggerfish" (eller vad du gillar)
6. Klicka på **Create**
7. Kopiera **Client ID** och **Client Secret**

### Steg 5: Anslut

```bash
triggerfish connect google
```

Du uppmanas att ange:

1. Ditt **Client ID**
2. Ditt **Client Secret**

Ett webbläsarfönster öppnas för att du ska bevilja åtkomst. Efter auktorisering lagras tokens säkert i din OS-nyckelring (macOS Keychain eller Linux libsecret). Inga uppgifter lagras i konfigurationsfiler eller miljövariabler.

### Koppla från

```bash
triggerfish disconnect google
```

Tar bort alla Google-tokens från din nyckelring. Du kan återansluta när som helst genom att köra `connect` igen.

## Tillgängliga verktyg

När du är ansluten har din agent tillgång till 14 verktyg:

| Verktyg           | Beskrivning                                             |
| ----------------- | ------------------------------------------------------- |
| `gmail_search`    | Sök e-postmeddelanden med fråga (stöder Gmail-syntax)   |
| `gmail_read`      | Läs ett specifikt e-postmeddelande med ID               |
| `gmail_send`      | Skriv och skicka ett e-postmeddelande                   |
| `gmail_label`     | Lägg till eller ta bort etiketter på ett meddelande     |
| `calendar_list`   | Lista kommande kalenderhändelser                        |
| `calendar_create` | Skapa en ny kalenderhändelse                            |
| `calendar_update` | Uppdatera en befintlig händelse                         |
| `tasks_list`      | Lista uppgifter från Google Uppgifter                   |
| `tasks_create`    | Skapa en ny uppgift                                     |
| `tasks_complete`  | Markera en uppgift som slutförd                         |
| `drive_search`    | Sök filer i Google Drive                                |
| `drive_read`      | Läs filinnehåll (exporterar Google Docs som text)       |
| `sheets_read`     | Läs ett område från ett kalkylblad                      |
| `sheets_write`    | Skriv värden till ett kalkylbladsområde                 |

## Exempelinteraktioner

Fråga din agent saker som:

- "Vad är på min kalender idag?"
- "Sök i min e-post efter meddelanden från alice@example.com"
- "Skicka ett e-postmeddelande till bob@example.com med ämnet 'Mötesanteckningar'"
- "Hitta Q4-budgetkalkylbladet i Drive"
- "Lägg till 'Köp mat' i min uppgiftslista"
- "Läs cellerna A1:D10 från Försäljningskalkylbladet"

## OAuth-scope

Triggerfish begär dessa scope under auktorisering:

| Scope            | Åtkomstnivå                                    |
| ---------------- | ----------------------------------------------- |
| `gmail.modify`   | Läs, skicka och hantera e-post och etiketter    |
| `calendar`       | Full läs-/skrivåtkomst till Google Kalender     |
| `tasks`          | Full läs-/skrivåtkomst till Google Uppgifter    |
| `drive.readonly` | Skrivskyddad åtkomst till Google Drive-filer    |
| `spreadsheets`   | Läs- och skrivåtkomst till Google Kalkylark     |

::: tip Drive-åtkomst är skrivskyddad. Triggerfish kan söka och läsa dina filer men kan inte skapa, ändra eller ta bort dem. Kalkylark har separat skrivåtkomst för kalkylbladscellsuppdateringar. :::

## Säkerhet

- All Google Workspace-data klassificeras som minst **INTERNAL**
- E-postinnehåll, kalenderdetaljer och dokumentinnehåll är vanligtvis **CONFIDENTIAL**
- Tokens lagras i OS-nyckelringen (macOS Keychain / Linux libsecret)
- Klientuppgifter lagras bredvid tokens i nyckelringen, aldrig i miljövariabler eller konfigurationsfiler
- [Nedskrivningsregeln](/sv-SE/security/no-write-down) gäller: CONFIDENTIAL Google-data kan inte flöda till PUBLIC-kanaler
- Alla verktygsamtal loggas i granskningsspåret med fullständig klassificeringskontext

## Felsökning

### "No Google tokens found"

Kör `triggerfish connect google` för att autentisera.

### "Google refresh token revoked or expired"

Din refresh-token ogiltigförklarades (t.ex. du återkallade åtkomst i Google-kontoinställningarna). Kör `triggerfish connect google` för att återansluta.

### "Access blocked: has not completed the Google verification process"

Det betyder att ditt Google-konto inte är listat som testanvändare för appen. Medan appen har statusen "Testing" (standard) kan bara konton explicit tillagda som testanvändare auktorisera.

1. Gå till [OAuth-medgivandeskärm](https://console.cloud.google.com/apis/credentials/consent)
2. Gå till sidan **Audience** (i vänstra sidofältet)
3. I avsnittet **Test users**, klicka på **+ Add Users** och lägg till din Google-e-postadress
4. Spara och prova `triggerfish connect google` igen

### "Token exchange failed"

Dubbelkontrollera ditt Client ID och Client Secret. Se till att:

- OAuth-klienttypen är "Desktop app"
- Alla nödvändiga API:er är aktiverade i ditt Google Cloud-projekt
- Ditt Google-konto är listat som testanvändare (om appen är i testläge)

### API:er inte aktiverade

Om du ser 403-fel för specifika tjänster, se till att motsvarande API är aktiverat i ditt [Google Cloud Console API Library](https://console.cloud.google.com/apis/library).
