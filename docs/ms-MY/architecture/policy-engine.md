# Enjin Dasar & Hook

Enjin dasar adalah lapisan penguatkuasaan yang berada di antara LLM dan dunia luar. Ia mencelah setiap tindakan pada titik kritikal dalam aliran data dan membuat keputusan ALLOW, BLOCK, atau REDACT yang deterministik. LLM tidak boleh memintas, mengubah, atau mempengaruhi keputusan ini.

## Prinsip Teras: Penguatkuasaan di Bawah LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Lapisan penguatkuasaan dasar: LLM berada di atas lapisan dasar, yang berada di atas lapisan pelaksanaan" style="max-width: 100%;" />

::: warning KESELAMATAN LLM berada di atas lapisan dasar. Ia boleh disuntik prompt, dijailbreak, atau dimanipulasi — dan itu tidak penting. Lapisan dasar adalah kod tulen yang berjalan di bawah LLM, memeriksa permintaan tindakan berstruktur dan membuat keputusan binari berdasarkan peraturan pengkelasan. Tiada laluan daripada output LLM ke pintas hook. :::

## Jenis Hook

Lapan hook penguatkuasaan mencelah tindakan pada setiap titik kritikal dalam aliran data.

### Seni Bina Hook

<img src="/diagrams/hook-chain-flow.svg" alt="Aliran rantaian hook: PRE_CONTEXT_INJECTION → Konteks LLM → PRE_TOOL_CALL → Pelaksanaan Alat → POST_TOOL_RESPONSE → Respons LLM → PRE_OUTPUT → Saluran Output" style="max-width: 100%;" />

### Semua Jenis Hook

| Hook | Pencetus | Tindakan Utama | Mod Kegagalan |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------- | -------------------- |
| `PRE_CONTEXT_INJECTION` | Input luaran memasuki konteks | Kelaskan input, tetapkan taint, cipta keturunan, imbas untuk suntikan | Tolak input |
| `PRE_TOOL_CALL` | LLM meminta pelaksanaan alat | Semakan kebenaran, had kadar, pengesahan parameter | Sekat panggilan alat |
| `POST_TOOL_RESPONSE` | Alat mengembalikan data | Kelaskan respons, kemas kini taint sesi, cipta/kemas kini keturunan | Redact atau sekat |
| `PRE_OUTPUT` | Respons hendak meninggalkan sistem | Semakan pengkelasan akhir terhadap sasaran, imbas PII | Sekat output |
| `SECRET_ACCESS` | Plugin meminta kelayakan | Log akses, sahkan kebenaran terhadap skop yang diisytiharkan | Tolak kelayakan |
| `SESSION_RESET` | Pengguna meminta tetapan semula taint | Arkibkan keturunan, kosongkan konteks, sahkan pengesahan | Perlukan pengesahan |
| `AGENT_INVOCATION` | Ejen memanggil ejen lain | Sahkan rantaian delegasi, kuatkuasakan siling taint | Sekat invokasi |
| `MCP_TOOL_CALL` | Alat pelayan MCP dipanggil | Semakan dasar gateway (status pelayan, kebenaran alat, skema) | Sekat panggilan MCP |

## Antara Muka Hook

Setiap hook menerima konteks dan mengembalikan keputusan. Pengendali adalah fungsi tulen yang sinkronous.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Muatan khusus hook berbeza mengikut jenis
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` adalah sinkronous dan mengembalikan `HookResult` secara langsung — bukan Promise. Ini adalah reka bentuk yang disengajakan. Hook mesti selesai sebelum tindakan diteruskan, dan menjadikannya sinkronous menghapuskan sebarang kemungkinan pintas async. Jika hook tamat masa, tindakan ditolak. :::

## Jaminan Hook

Setiap pelaksanaan hook membawa empat invarian:

| Jaminan | Maksudnya |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Deterministik** | Input yang sama sentiasa menghasilkan keputusan yang sama. Tiada kerawakan. Tiada panggilan LLM dalam hook. Tiada panggilan API luaran yang mempengaruhi keputusan. |
| **Sinkronous** | Hook selesai sebelum tindakan diteruskan. Tiada pintas async yang mungkin. Tamat masa bersamaan penolakan. |
| **Dilog** | Setiap pelaksanaan hook direkodkan: parameter input, keputusan yang dibuat, cap masa, dan peraturan dasar yang dinilai. |
| **Tidak boleh dipalsukan** | Output LLM tidak boleh mengandungi arahan pintas hook. Lapisan hook tidak mempunyai logik "hurai output LLM untuk perintah". |

## Hierarki Peraturan Dasar

Peraturan dasar disusun ke dalam tiga peringkat. Peringkat yang lebih tinggi tidak boleh menggantikan peringkat yang lebih rendah.

### Peraturan Tetap (sentiasa dikuatkuasakan, TIDAK boleh dikonfigurasi)

Peraturan-peraturan ini dikodkan keras dan tidak boleh dilumpuhkan oleh mana-mana pentadbir, pengguna, atau konfigurasi:

- **Tiada write-down**: Aliran pengkelasan adalah satu arah. Data tidak boleh mengalir ke tahap yang lebih rendah.
- **Saluran UNTRUSTED**: Tiada data masuk atau keluar. Titik.
- **Taint sesi**: Setelah dinaikkan, ia kekal dinaikkan untuk sepanjang hayat sesi.
- **Pengelogan audit**: Semua tindakan dilog. Tiada pengecualian. Tiada cara untuk melumpuhkan.

### Peraturan yang Boleh Dikonfigurasi (boleh diselaraskan pentadbir)

Pentadbir boleh melaraskan ini melalui UI atau fail konfigurasi:

- Pengkelasan lalai integrasi (cth., Salesforce lalai kepada `CONFIDENTIAL`)
- Pengkelasan saluran
- Senarai benarkan/tolak tindakan per-integrasi
- Senarai benarkan domain untuk komunikasi luaran
- Had kadar per-alat, per-pengguna, atau per-sesi

### Escape Hatch Deklaratif (enterprise)

Penyebaran enterprise boleh menentukan peraturan dasar tersuai dalam YAML berstruktur untuk senario lanjutan:

```yaml
# Sekat sebarang pertanyaan Salesforce yang mengandungi corak SSN
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# Perlukan kelulusan untuk transaksi bernilai tinggi
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# Sekatan berasaskan masa: tiada penghantaran luaran selepas waktu pejabat
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Komunikasi luaran disekat di luar waktu perniagaan"
```

## Pengalaman Pengguna Penolakan

Apabila enjin dasar menyekat tindakan, pengguna melihat penjelasan yang jelas — bukan ralat generik.

**Lalai (spesifik):**

```
Saya tidak boleh menghantar data sulit ke saluran awam.

  -> Tetapkan semula sesi dan hantar mesej
  -> Batal
```

**Pilih-masuk (pendidikan):**

```
Saya tidak boleh menghantar data sulit ke saluran awam.

Mengapa: Sesi ini mengakses Salesforce (CONFIDENTIAL).
WhatsApp peribadi dikelaskan sebagai PUBLIC.
Data hanya boleh mengalir ke pengkelasan yang sama atau lebih tinggi.

Pilihan:
  -> Tetapkan semula sesi dan hantar mesej
  -> Minta pentadbir anda mengklasifikasikan semula saluran WhatsApp
  -> Ketahui lebih lanjut: [pautan dok]
```

Mod pendidikan adalah pilih-masuk dan membantu pengguna memahami _mengapa_ tindakan disekat, termasuk sumber data mana yang menyebabkan eskalasi taint dan apakah ketidakpadanan pengkelasan. Kedua-dua mod menawarkan langkah seterusnya yang boleh diambil tindakan dan bukannya ralat jalan buntu.

## Cara Hook Berantai Bersama

Dalam kitaran permintaan/respons biasa, berbilang hook diaktifkan berurutan. Setiap hook mempunyai keterlihatan penuh ke dalam keputusan yang dibuat oleh hook lebih awal dalam rantaian.

```
Pengguna menghantar: "Semak saluran paip Salesforce saya dan mesej isteri saya"

1. PRE_CONTEXT_INJECTION
   - Input daripada pemilik, dikelaskan sebagai PUBLIC
   - Taint sesi: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Alat dibenarkan? YA
   - Pengguna mempunyai sambungan Salesforce? YA
   - Had kadar? OK
   - Keputusan: ALLOW

3. POST_TOOL_RESPONSE (keputusan salesforce)
   - Data dikelaskan: CONFIDENTIAL
   - Taint sesi meningkat: PUBLIC -> CONFIDENTIAL
   - Rekod keturunan dicipta

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Alat dibenarkan? YA
   - Keputusan: ALLOW (semakan tahap alat lulus)

5. PRE_OUTPUT (mesej kepada isteri melalui WhatsApp)
   - Taint sesi: CONFIDENTIAL
   - Pengkelasan berkesan sasaran: PUBLIC (penerima luaran)
   - CONFIDENTIAL -> PUBLIC: DISEKAT
   - Keputusan: BLOCK
   - Sebab: "classification_violation"

6. Ejen membentangkan pilihan tetapan semula kepada pengguna
```
