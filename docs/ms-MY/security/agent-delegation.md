# Delegasi Ejen

Apabila ejen AI semakin berinteraksi antara satu sama lain -- satu ejen memanggil yang lain untuk menyelesaikan sub-tugas -- kelas risiko keselamatan baru muncul. Rantaian ejen boleh digunakan untuk mencuci data melalui ejen yang kurang terhad, memintas kawalan pengkelasan. Triggerfish mencegah ini dengan identiti ejen kriptografi, siling pengkelasan, dan pewarisan taint mandatori.

## Sijil Ejen

Setiap ejen dalam Triggerfish mempunyai sijil yang menentukan identiti, keupayaan, dan kebenaran delegasinya. Sijil ini ditandatangani oleh pemilik ejen dan tidak boleh diubah suai oleh ejen itu sendiri atau oleh ejen lain.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Pembantu Jualan",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Medan utama dalam sijil:

| Medan                  | Tujuan                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | **Siling pengkelasan** -- tahap taint tertinggi di mana ejen ini boleh beroperasi. Ejen dengan siling INTERNAL tidak boleh dipanggil oleh sesi yang ditaint pada CONFIDENTIAL.       |
| `can_invoke_agents`    | Sama ada ejen ini dibenarkan memanggil ejen lain.                                                                                                                                    |
| `can_be_invoked_by`    | Senarai benarkan eksplisit ejen yang boleh memanggil yang ini.                                                                                                                        |
| `max_delegation_depth` | Kedalaman maksimum rantaian invokasi ejen. Mencegah rekursi tidak terbatas.                                                                                                           |
| `signature`            | Tandatangan Ed25519 dari pemilik. Mencegah gangguan sijil.                                                                                                                           |

## Aliran Invokasi

Apabila satu ejen memanggil yang lain, lapisan dasar mengesahkan delegasi sebelum ejen yang dipanggil dilaksanakan. Semakan adalah deterministik dan berjalan dalam kod -- ejen yang memanggil tidak boleh mempengaruhi keputusan.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Urutan delegasi ejen: Ejen A memanggil Ejen B, lapisan dasar mengesahkan taint berbanding siling dan menyekat apabila taint melebihi siling" style="max-width: 100%;" />

Dalam contoh ini, Ejen A mempunyai taint sesi CONFIDENTIAL (ia mengakses data Salesforce sebelum ini). Ejen B mempunyai siling pengkelasan INTERNAL. Kerana CONFIDENTIAL lebih tinggi daripada INTERNAL, invokasi disekat. Data yang ditaint Ejen A tidak boleh mengalir ke ejen dengan siling pengkelasan lebih rendah.

::: warning KESELAMATAN Lapisan dasar menyemak **taint sesi semasa** pemanggil, bukan silingnya. Walaupun Ejen A mempunyai siling CONFIDENTIAL, yang penting adalah tahap taint sebenar sesi semasa invokasi. Jika Ejen A belum mengakses sebarang data terklasifikasi (taint adalah PUBLIC), ia boleh memanggil Ejen B (siling INTERNAL) tanpa masalah. :::

## Penjejakan Rantaian Delegasi

Apabila ejen memanggil ejen lain, rantaian penuh dijejaki dengan cap masa dan tahap taint pada setiap langkah:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Pembantu Jualan",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Ringkaskan saluran paip Q4"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Penganalisis Data",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Kira kadar kemenangan"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

Rantaian ini direkodkan dalam log audit dan boleh ditanya untuk analisis pematuhan dan forensik. Anda boleh menjejaki dengan tepat ejen mana yang terlibat, apa tahap taint mereka, dan tugas apa yang mereka lakukan.

## Invarian Keselamatan

Empat invarian mengawal delegasi ejen. Semua dikuatkuasakan oleh kod dalam lapisan dasar dan tidak boleh ditolak oleh mana-mana ejen dalam rantaian.

| Invarian                          | Penguatkuasaan                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Taint hanya meningkat**         | Setiap yang dipanggil mewarisi `max(taint sendiri, taint pemanggil)`. Yang dipanggil tidak boleh mempunyai taint lebih rendah daripada pemanggil. |
| **Siling dihormati**              | Ejen tidak boleh dipanggil jika taint pemanggil melebihi siling `max_classification` yang dipanggil.                                        |
| **Had kedalaman dikuatkuasakan**  | Rantaian tamat pada `max_delegation_depth`. Jika had adalah 3, invokasi peringkat keempat disekat.                                           |
| **Invokasi bulatan disekat**      | Ejen tidak boleh muncul dua kali dalam rantaian yang sama. Jika Ejen A memanggil Ejen B yang cuba memanggil Ejen A, invokasi kedua disekat.  |

### Pewarisan Taint secara Terperinci

Apabila Ejen A (taint: CONFIDENTIAL) berjaya memanggil Ejen B (siling: CONFIDENTIAL), Ejen B bermula dengan taint CONFIDENTIAL -- diwarisi daripada Ejen A. Jika Ejen B kemudian mengakses data RESTRICTED, taintnya meningkat ke RESTRICTED. Taint yang lebih tinggi ini dibawa kembali ke Ejen A apabila invokasi selesai.

<img src="/diagrams/taint-inheritance.svg" alt="Pewarisan taint: Ejen A (INTERNAL) memanggil Ejen B, B mewarisi taint, mengakses Salesforce (CONFIDENTIAL), mengembalikan taint yang lebih tinggi ke A" style="max-width: 100%;" />

Taint mengalir dalam kedua-dua arah -- dari pemanggil ke yang dipanggil semasa invokasi, dan dari yang dipanggil kembali ke pemanggil semasa penyiapan. Ia hanya boleh meningkat.

## Mencegah Pencucian Data

Vektor serangan utama dalam sistem berbilang ejen adalah **pencucian data** -- menggunakan rantaian ejen untuk memindahkan data terklasifikasi ke destinasi yang lebih rendah kelasnya dengan menghalanya melalui ejen perantara.

### Serangan

```
Matlamat penyerang: Mengeksfiltrasi data CONFIDENTIAL melalui saluran PUBLIC

Aliran yang dicuba:
1. Ejen A mengakses Salesforce (taint --> CONFIDENTIAL)
2. Ejen A memanggil Ejen B (yang mempunyai saluran PUBLIC)
3. Ejen B menghantar data ke saluran PUBLIC
```

### Mengapa Ia Gagal

Triggerfish menyekat serangan ini pada berbilang titik:

**Titik sekat 1: Semakan invokasi.** Jika Ejen B mempunyai siling di bawah CONFIDENTIAL, invokasi disekat terus. Taint Ejen A (CONFIDENTIAL) melebihi siling Ejen B.

**Titik sekat 2: Pewarisan taint.** Walaupun Ejen B mempunyai siling CONFIDENTIAL dan invokasi berjaya, Ejen B mewarisi taint CONFIDENTIAL Ejen A. Apabila Ejen B cuba menghantar ke saluran PUBLIC, hook `PRE_OUTPUT` menyekat tulis-bawah.

**Titik sekat 3: Tiada tetapan semula taint dalam delegasi.** Ejen dalam rantaian delegasi tidak boleh menetapkan semula taint mereka. Tetapan semula taint hanya tersedia kepada pengguna akhir, dan ia membersihkan keseluruhan sejarah perbualan. Tiada mekanisme bagi ejen untuk "membasuh" tahap taintnya semasa rantaian.

::: danger Data tidak boleh terlepas dari pengkelasannya melalui delegasi ejen. Gabungan semakan siling, pewarisan taint mandatori, dan tiada-tetapan-semula-taint-dalam-rantaian menjadikan pencucian data melalui rantaian ejen mustahil dalam model keselamatan Triggerfish. :::

## Contoh Senario

### Senario 1: Delegasi Berjaya

```
Ejen A (siling: CONFIDENTIAL, taint semasa: INTERNAL)
  memanggil Ejen B (siling: CONFIDENTIAL)

Semakan dasar:
  - A boleh memanggil B? YA (B ada dalam senarai delegasi A)
  - Taint A (INTERNAL) <= siling B (CONFIDENTIAL)? YA
  - Had kedalaman OK? YA (kedalaman 1 daripada maks 3)
  - Bulatan? TIDAK

Keputusan: DIBENARKAN
Ejen B bermula dengan taint: INTERNAL (diwarisi daripada A)
```

### Senario 2: Disekat oleh Siling

```
Ejen A (siling: RESTRICTED, taint semasa: CONFIDENTIAL)
  memanggil Ejen B (siling: INTERNAL)

Semakan dasar:
  - Taint A (CONFIDENTIAL) <= siling B (INTERNAL)? TIDAK

Keputusan: DISEKAT
Sebab: Siling Ejen B (INTERNAL) di bawah taint sesi (CONFIDENTIAL)
```

### Senario 3: Disekat oleh Had Kedalaman

```
Ejen A memanggil Ejen B (kedalaman 1)
  Ejen B memanggil Ejen C (kedalaman 2)
    Ejen C memanggil Ejen D (kedalaman 3)
      Ejen D memanggil Ejen E (kedalaman 4)

Semakan dasar untuk Ejen E:
  - Kedalaman 4 > max_delegation_depth (3)

Keputusan: DISEKAT
Sebab: Had kedalaman delegasi maksimum dilampaui
```

### Senario 4: Disekat oleh Rujukan Bulatan

```
Ejen A memanggil Ejen B (kedalaman 1)
  Ejen B memanggil Ejen C (kedalaman 2)
    Ejen C memanggil Ejen A (kedalaman 3)

Semakan dasar untuk invokasi Ejen A kedua:
  - Ejen A sudah ada dalam rantaian

Keputusan: DISEKAT
Sebab: Invokasi ejen bulatan dikesan
```

## Halaman Berkaitan

- [Reka Bentuk Keselamatan-Dahulu](./) -- gambaran keseluruhan seni bina keselamatan
- [Peraturan Tanpa Tulis-Bawah](./no-write-down) -- peraturan aliran pengkelasan yang delegasi kuatkuasakan
- [Identiti & Auth](./identity) -- cara identiti pengguna dan saluran ditetapkan
- [Audit & Pematuhan](./audit-logging) -- cara rantaian delegasi direkodkan dalam log audit
