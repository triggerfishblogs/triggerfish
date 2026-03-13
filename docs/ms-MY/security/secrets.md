# Pengurusan Rahsia

Triggerfish tidak pernah menyimpan kelayakan dalam fail konfigurasi. Semua rahsia -- kunci API, token OAuth, kelayakan integrasi -- disimpan dalam storan selamat natif platform: keychain OS untuk peringkat peribadi, atau perkhidmatan vault untuk peringkat perusahaan. Plugin dan ejen berinteraksi dengan kelayakan melalui SDK, yang menguatkuasakan kawalan akses ketat.

## Backend Storan

| Peringkat       | Backend          | Perincian                                                                                        |
| --------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| **Peribadi**    | Keychain OS      | macOS Keychain, Linux Secret Service (melalui D-Bus), Windows Credential Manager                |
| **Perusahaan**  | Integrasi vault  | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, atau perkhidmatan vault perusahaan lain  |

Dalam kedua-dua kes, rahsia disulitkan semasa rehat oleh backend storan. Triggerfish tidak melaksanakan enkripsi sendiri untuk rahsia -- ia mendelegasikan ke sistem storan rahsia bertujuan khas yang telah diaudit.

Pada platform tanpa keychain natif (Windows tanpa Credential Manager, bekas Docker), Triggerfish jatuh balik ke fail JSON yang disulitkan di `~/.triggerfish/secrets.json`. Entri disulitkan dengan AES-256-GCM menggunakan kunci 256-bit terikat-mesin yang disimpan di `~/.triggerfish/secrets.key` (kebenaran: `0600`). Setiap entri menggunakan IV 12-bait rawak segar pada setiap penulisan. Fail rahsia teks biasa lama dimigrasikan secara automatik ke format yang disulitkan semasa muat pertama.

::: tip Peringkat peribadi memerlukan sifar konfigurasi untuk rahsia. Apabila anda menyambungkan integrasi semasa persediaan (`triggerfish dive`), kelayakan secara automatik disimpan dalam keychain OS anda. Anda tidak perlu memasang atau mengkonfigurasi apa-apa selain yang telah disediakan oleh sistem pengendalian anda. :::

## Rujukan Rahsia dalam Konfigurasi

Triggerfish menyokong rujukan `secret:` dalam `triggerfish.yaml`. Daripada menyimpan kelayakan sebagai teks biasa, anda merujuknya mengikut nama dan ia diselesaikan daripada keychain OS semasa permulaan.

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

Penyelesai melakukan penjelajahan depth-first fail konfigurasi. Sebarang nilai rentetan yang bermula dengan `secret:` digantikan dengan entri keychain yang sepadan. Jika rahsia yang dirujuk tidak ditemui, permulaan gagal serta-merta dengan mesej ralat yang jelas.

### Memigrasikan Rahsia Sedia Ada

Jika anda mempunyai kelayakan teks biasa dalam fail konfigurasi anda dari versi sebelumnya, arahan migrasi memindahkannya ke keychain secara automatik:

```bash
triggerfish config migrate-secrets
```

Arahan ini:

1. Mengimbas `triggerfish.yaml` untuk nilai kelayakan teks biasa
2. Menyimpan setiap satu dalam keychain OS
3. Menggantikan nilai teks biasa dengan rujukan `secret:`
4. Mencipta sandaran fail asal

::: warning Selepas migrasi, sahkan ejen anda bermula dengan betul sebelum memadam fail sandaran. Migrasi tidak boleh diterbalikkan tanpa sandaran. :::

## Seni Bina Kelayakan Didelegasikan

Prinsip keselamatan teras dalam Triggerfish ialah pertanyaan data berjalan dengan kelayakan **pengguna**, bukan kelayakan sistem. Ini memastikan ejen mewarisi model kebenaran sistem sumber -- pengguna hanya boleh mengakses data yang boleh mereka akses secara langsung.

<img src="/diagrams/delegated-credentials.svg" alt="Seni bina kelayakan didelegasikan: Pengguna memberi persetujuan OAuth, ejen membuat pertanyaan dengan token pengguna, sistem sumber menguatkuasakan kebenaran" style="max-width: 100%;" />

Seni bina ini bermakna:

- **Tiada kebenaran berlebihan** -- ejen tidak boleh mengakses data yang tidak boleh diakses pengguna secara langsung
- **Tiada akaun perkhidmatan sistem** -- tiada kelayakan maha-berkuasa yang boleh terkompromi
- **Penguatkuasaan sistem sumber** -- sistem sumber (Salesforce, Jira, GitHub, dsb.) menguatkuasakan kebenaranannya sendiri pada setiap pertanyaan

::: warning KESELAMATAN Platform ejen AI tradisional sering menggunakan akaun perkhidmatan sistem tunggal untuk mengakses integrasi bagi pihak semua pengguna. Ini bermakna ejen mempunyai akses ke semua data dalam integrasi, dan bergantung pada LLM untuk memutuskan apa yang hendak ditunjukkan kepada setiap pengguna. Triggerfish menghapuskan risiko ini sepenuhnya: pertanyaan berjalan dengan token OAuth yang didelegasikan pengguna sendiri. :::

## Penguatkuasaan SDK Plugin

Plugin berinteraksi dengan kelayakan secara eksklusif melalui SDK Triggerfish. SDK menyediakan kaedah sedar-kebenaran dan menyekat sebarang percubaan untuk mengakses kelayakan peringkat sistem.

### Dibenarkan: Akses Kelayakan Pengguna

```python
def get_user_opportunities(sdk, params):
    # SDK mendapatkan token yang didelegasikan pengguna dari storan selamat
    # Jika pengguna belum menyambungkan Salesforce, mengembalikan ralat berguna
    user_token = sdk.get_user_credential("salesforce")

    # Pertanyaan berjalan dengan kebenaran pengguna
    # Sistem sumber menguatkuasakan kawalan akses
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Disekat: Akses Kelayakan Sistem

```python
def get_all_opportunities(sdk, params):
    # Ini akan menghasilkan PermissionError -- DISEKAT oleh SDK
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` sentiasa disekat. Tiada konfigurasi untuk membolehkannya, tiada pengatasan admin, dan tiada jalan keluar. Ini adalah peraturan keselamatan tetap, sama seperti peraturan tanpa tulis-bawah. :::

## Alat Rahsia Boleh Dipanggil LLM

Ejen boleh membantu anda mengurus rahsia melalui tiga alat. Yang kritikal, LLM tidak pernah melihat nilai rahsia sebenar -- input dan storan berlaku luar jalur.

### `secret_save`

Meminta anda memasukkan nilai rahsia dengan selamat:

- **CLI**: Terminal beralih ke mod input tersembunyi (aksara tidak dicetak balik)
- **Tidepool**: Popup input selamat muncul dalam antara muka web

LLM meminta rahsia disimpan, tetapi nilai sebenar dimasukkan oleh anda melalui arahan selamat. Nilai disimpan terus dalam keychain -- ia tidak pernah melalui konteks LLM.

### `secret_list`

Menyenaraikan nama semua rahsia tersimpan. Tidak pernah mendedahkan nilai.

### `secret_delete`

Memadam rahsia mengikut nama dari keychain.

### Penggantian Argumen Alat

<div v-pre>

Apabila ejen menggunakan alat yang memerlukan rahsia (contohnya, menetapkan kunci API dalam pemboleh ubah persekitaran pelayan MCP), ia menggunakan sintaks <span v-pre>`{{secret:name}}`</span> dalam argumen alat:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

Runtime menyelesaikan rujukan <span v-pre>`{{secret:name}}`</span> **di bawah lapisan LLM** sebelum alat dilaksanakan. Nilai yang diselesaikan tidak pernah muncul dalam sejarah perbualan atau log.

</div>

::: warning KESELAMATAN Penggantian <code v-pre>{{secret:name}}</code> dikuatkuasakan oleh kod, bukan oleh LLM. Walaupun LLM cuba menlog atau mengembalikan nilai yang diselesaikan, lapisan dasar akan menangkap percubaan dalam hook `PRE_OUTPUT`. :::

### Kaedah Kebenaran SDK

| Kaedah                                  | Tingkah Laku                                                                                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | Mengembalikan token OAuth yang didelegasikan pengguna untuk integrasi yang dinyatakan. Jika pengguna belum menyambungkan integrasi, mengembalikan ralat dengan arahan. |
| `sdk.query_as_user(integration, query)` | Melaksanakan pertanyaan terhadap integrasi menggunakan kelayakan yang didelegasikan pengguna. Sistem sumber menguatkuasakan kebenaranannya sendiri.               |
| `sdk.get_system_credential(name)`       | **Sentiasa disekat.** Membangkitkan `PermissionError`. Dilog sebagai peristiwa keselamatan.                                                                      |
| `sdk.has_user_connection(integration)`  | Mengembalikan `true` jika pengguna telah menyambungkan integrasi yang dinyatakan, `false` sebaliknya. Tidak mendedahkan sebarang data kelayakan.                 |

## Akses Data Sedar-Kebenaran

Seni bina kelayakan yang didelegasikan berfungsi seiring dengan sistem pengkelasan. Walaupun pengguna mempunyai kebenaran untuk mengakses data dalam sistem sumber, peraturan pengkelasan Triggerfish mengawal ke mana data tersebut boleh mengalir selepas diambil.

<img src="/diagrams/secret-resolution-flow.svg" alt="Aliran resolusi rahsia: rujukan fail konfigurasi diselesaikan dari keychain OS di bawah lapisan LLM" style="max-width: 100%;" />

**Contoh:**

```
Pengguna: "Ringkaskan tawaran Acme dan hantar kepada isteri saya"

Langkah 1: Semakan kebenaran
  --> Token Salesforce pengguna digunakan
  --> Salesforce mengembalikan peluang Acme (pengguna mempunyai akses)

Langkah 2: Pengkelasan
  --> Data Salesforce dikelaskan sebagai CONFIDENTIAL
  --> Taint sesi meningkat ke CONFIDENTIAL

Langkah 3: Semakan output
  --> Isteri = penerima EXTERNAL
  --> CONFIDENTIAL --> EXTERNAL: DISEKAT

Keputusan: Data diambil (pengguna mempunyai kebenaran), tetapi tidak boleh dihantar
           (peraturan pengkelasan mencegah kebocoran)
```

Pengguna mempunyai akses sah ke tawaran Acme dalam Salesforce. Triggerfish menghormati itu dan mengambil data. Tetapi sistem pengkelasan mencegah data tersebut mengalir ke penerima luaran. Kebenaran untuk mengakses data adalah berasingan daripada kebenaran untuk berkongsinya.

## Log Akses Rahsia

Setiap akses kelayakan dilog melalui hook penguatkuasaan `SECRET_ACCESS`:

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

Percubaan yang disekat juga dilog:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "Akses kelayakan sistem adalah dilarang",
    "plugin_id": "plugin_789"
  }
}
```

::: info Percubaan akses kelayakan yang disekat dilog pada tahap amaran yang lebih tinggi. Dalam pelancaran perusahaan, peristiwa ini boleh mencetuskan pemberitahuan kepada pasukan keselamatan. :::

## Integrasi Vault Perusahaan

Pelancaran perusahaan boleh menyambungkan Triggerfish ke perkhidmatan vault berpusat untuk pengurusan kelayakan:

| Perkhidmatan Vault  | Integrasi                            |
| ------------------- | ------------------------------------ |
| HashiCorp Vault     | Integrasi API natif                  |
| AWS Secrets Manager | Integrasi AWS SDK                    |
| Azure Key Vault     | Integrasi Azure SDK                  |
| Vault tersuai       | Antara muka `SecretProvider` boleh pasang |

Integrasi vault perusahaan menyediakan:

- **Putaran berpusat** -- kelayakan diputar dalam vault dan secara automatik diambil oleh Triggerfish
- **Dasar akses** -- dasar peringkat vault mengawal ejen dan pengguna mana yang boleh mengakses kelayakan mana
- **Penyatuan audit** -- log akses kelayakan dari Triggerfish dan vault boleh dikorelasikan

## Apa yang Tidak Pernah Disimpan dalam Fail Konfigurasi

Berikut tidak pernah muncul sebagai nilai teks biasa dalam `triggerfish.yaml` atau mana-mana fail konfigurasi lain. Ia sama ada disimpan dalam keychain OS dan dirujuk melalui sintaks `secret:`, atau diurus melalui alat `secret_save`:

- Kunci API untuk pembekal LLM
- Token OAuth untuk integrasi
- Kelayakan pangkalan data
- Rahsia webhook
- Kunci enkripsi
- Kod padanan (sementara, dalam memori sahaja)

::: danger Jika anda menemui kelayakan teks biasa dalam fail konfigurasi Triggerfish (nilai yang BUKAN rujukan `secret:`), sesuatu telah salah. Jalankan `triggerfish config migrate-secrets` untuk memindahkannya ke keychain. Kelayakan yang dijumpai sebagai teks biasa perlu diputar segera. :::

## Halaman Berkaitan

- [Reka Bentuk Keselamatan-Dahulu](./) -- gambaran keseluruhan seni bina keselamatan
- [Peraturan Tanpa Tulis-Bawah](./no-write-down) -- cara pengkelasan melengkapi pengasingan kelayakan
- [Identiti & Auth](./identity) -- cara identiti pengguna digunakan dalam akses kelayakan yang didelegasikan
- [Audit & Pematuhan](./audit-logging) -- cara peristiwa akses kelayakan direkodkan
