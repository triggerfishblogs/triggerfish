# Google Workspace

Koble Google-kontoen din for å gi agenten tilgang til Gmail, Kalender, Oppgaver, Drive og Sheets.

## Forutsetninger

- En Google-konto
- Et Google Cloud-prosjekt med OAuth-legitimasjon

## Oppsett

### Trinn 1: Opprett et Google Cloud-prosjekt

1. Gå til [Google Cloud Console](https://console.cloud.google.com/)
2. Klikk prosjektmenyen øverst og velg **New Project**
3. Navngi det «Triggerfish» (eller hva du foretrekker) og klikk **Create**

### Trinn 2: Aktiver API-er

Aktiver hvert av disse API-ene i prosjektet ditt:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Klikk **Enable** på hver side. Dette trenger bare gjøres én gang per prosjekt.

### Trinn 3: Konfigurer OAuth-samtykkeskjermen

Før du kan opprette legitimasjon, krever Google en OAuth-samtykkeskjerm.

1. Gå til [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Brukertype: velg **External** (eller **Internal** hvis du er på en Google Workspace-organisasjon)
3. Klikk **Create**
4. Fyll ut de nødvendige feltene og klikk **Save and Continue**
5. På **Scopes**-skjermen, legg til:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
6. Gå til **Audience**-siden og legg til din Google e-postadresse som testbruker

### Trinn 4: Opprett OAuth-legitimasjon

1. Gå til [Credentials](https://console.cloud.google.com/apis/credentials)
2. Klikk **+ CREATE CREDENTIALS** og velg **OAuth client ID**
3. Applikasjonstype: **Desktop app**
4. Klikk **Create**
5. Kopier **Client ID** og **Client Secret**

### Trinn 5: Koble til

```bash
triggerfish connect google
```

Et nettleservindu åpnes for å gi tilgang. Etter autorisasjon lagres tokens sikkert i OS-nøkkelringen. Ingen legitimasjon lagres i konfigurasjonsfiler eller miljøvariabler.

### Koble fra

```bash
triggerfish disconnect google
```

Fjerner alle Google-tokens fra nøkkelringen. Du kan koble til igjen når som helst ved å kjøre `connect` igjen.

## Tilgjengelige verktøy

Når de er tilkoblet, har agenten din tilgang til 14 verktøy:

| Verktøy           | Beskrivelse                                             |
| ----------------- | ------------------------------------------------------- |
| `gmail_search`    | Søk e-poster etter spørring (støtter Gmail-søkesyntaks) |
| `gmail_read`      | Les en spesifikk e-post etter ID                        |
| `gmail_send`      | Skriv og send en e-post                                 |
| `gmail_label`     | Legg til eller fjern etiketter på en melding            |
| `calendar_list`   | List kommende kalenderhendelser                         |
| `calendar_create` | Opprett en ny kalenderhendelse                          |
| `calendar_update` | Oppdater en eksisterende hendelse                       |
| `tasks_list`      | List oppgaver fra Google Oppgaver                       |
| `tasks_create`    | Opprett en ny oppgave                                   |
| `tasks_complete`  | Merk en oppgave som fullført                            |
| `drive_search`    | Søk filer i Google Drive                                |
| `drive_read`      | Les filinnhold (eksporterer Google Docs som tekst)      |
| `sheets_read`     | Les et område fra et regneark                           |
| `sheets_write`    | Skriv verdier til et regnearkomfang                     |

## Eksempelsamhandlinger

Spør agenten din ting som:

- «Hva er på kalenderen min i dag?»
- «Søk i e-posten min etter meldinger fra alice@example.com»
- «Send en e-post til bob@example.com med emnet 'Møtenotat'»
- «Finn Q4-budsjett-regnearket i Drive»
- «Legg til 'Kjøp matvarer' på oppgavelisten min»
- «Les celler A1:D10 fra Salgs-regnearket»

## OAuth-omfang

Triggerfish ber om disse omfangene under autorisasjon:

| Omfang           | Tilgangsnivå                                     |
| ---------------- | ------------------------------------------------ |
| `gmail.modify`   | Les, send og administrer e-post og etiketter     |
| `calendar`       | Full lese/skrive-tilgang til Google Kalender     |
| `tasks`          | Full lese/skrive-tilgang til Google Oppgaver     |
| `drive.readonly` | Skrivebeskyttet tilgang til Google Drive-filer   |
| `spreadsheets`   | Lese og skrive-tilgang til Google Sheets         |

## Sikkerhet

- Alle Google Workspace-data klassifiseres som minst **INTERNAL**
- E-postinnhold, kalenderdetaljer og dokumentinnhold er vanligvis **CONFIDENTIAL**
- Tokens lagres i OS-nøkkelringen
- [No-Write-Down-regelen](/nb-NO/security/no-write-down) gjelder: CONFIDENTIAL Google-data kan ikke flyte til PUBLIC-kanaler

## Feilsøking

### «No Google tokens found»

Kjør `triggerfish connect google` for å autentisere.

### «Google refresh token revoked or expired»

Oppdateringstokenet ditt ble ugyldiggjort. Kjør `triggerfish connect google` for å koble til igjen.

### «Access blocked: has not completed the Google verification process»

Google-kontoen din er ikke oppgitt som testbruker for appen.

1. Gå til [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Gå til **Audience**-siden og legg til Google e-postadressen din under **Test users**
3. Lagre og prøv `triggerfish connect google` igjen
