# Peraturan Tanpa Tulis-Bawah

Peraturan tanpa tulis-bawah adalah asas model perlindungan data Triggerfish. Ia adalah peraturan tetap, tidak boleh dikonfigurasi yang terpakai untuk setiap sesi, setiap saluran, dan setiap ejen -- tanpa pengecualian dan tanpa pengatasan LLM.

**Peraturannya:** Data hanya boleh mengalir ke saluran dan penerima pada tahap pengkelasan yang **sama atau lebih tinggi**.

Peraturan tunggal ini mencegah keseluruhan kelas senario kebocoran data, daripada perkongsian terlampau tidak sengaja hingga serangan suntikan arahan canggih yang direka untuk mengeksfiltrasi maklumat sensitif.

## Cara Pengkelasan Mengalir

Triggerfish menggunakan empat tahap pengkelasan (tertinggi ke terendah):

<img src="/diagrams/write-down-rules.svg" alt="Peraturan tulis-bawah: data hanya mengalir ke tahap pengkelasan yang sama atau lebih tinggi" style="max-width: 100%;" />

Data yang dikelaskan pada tahap tertentu boleh mengalir ke tahap tersebut atau mana-mana tahap di atasnya. Ia tidak boleh mengalir ke bawah. Inilah peraturan tanpa tulis-bawah.

::: danger Peraturan tanpa tulis-bawah adalah **tetap dan tidak boleh dikonfigurasi**. Ia tidak boleh dilonggarkan oleh pentadbir, ditolak oleh peraturan dasar, atau dipintas oleh LLM. Ia adalah asas seni bina di mana semua kawalan keselamatan lain bersandar. :::

## Pengkelasan Berkesan

Apabila data akan meninggalkan sistem, Triggerfish mengira **pengkelasan berkesan** destinasi:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

Kedua-dua saluran dan penerima mesti berada pada atau di atas tahap pengkelasan data. Jika mana-mana satu berada di bawah, output disekat.

| Saluran                   | Penerima                       | Pengkelasan Berkesan |
| ------------------------- | ------------------------------ | -------------------- |
| INTERNAL (Slack)          | INTERNAL (rakan sekerja)       | INTERNAL             |
| INTERNAL (Slack)          | EXTERNAL (vendor)              | PUBLIC               |
| CONFIDENTIAL (Slack)      | INTERNAL (rakan sekerja)       | INTERNAL             |
| CONFIDENTIAL (E-mel)      | EXTERNAL (kenalan peribadi)    | PUBLIC               |

::: info Saluran CONFIDENTIAL dengan penerima EXTERNAL mempunyai pengkelasan berkesan PUBLIC. Jika sesi telah mengakses sebarang data di atas PUBLIC, output disekat. :::

## Contoh Dunia Sebenar

Berikut adalah senario konkrit yang menunjukkan peraturan tanpa tulis-bawah dalam tindakan.

```
Pengguna: "Semak saluran paip Salesforce saya"

Ejen: [mengakses Salesforce melalui token yang didelegasikan pengguna]
      [data Salesforce dikelaskan sebagai CONFIDENTIAL]
      [taint sesi meningkat ke CONFIDENTIAL]

      "Anda mempunyai 3 tawaran tutup minggu ini berjumlah $2.1 juta..."

Pengguna: "Hantar mesej kepada isteri saya bahawa saya akan lambat malam ini"

Lapisan dasar: DISEKAT
  - Taint sesi: CONFIDENTIAL
  - Penerima (isteri): EXTERNAL
  - Pengkelasan berkesan: PUBLIC
  - CONFIDENTIAL > PUBLIC --> pelanggaran tulis-bawah

Ejen: "Saya tidak boleh menghantar ke kenalan luaran dalam sesi ini
       kerana kami mengakses data sulit.

       -> Tetapkan semula sesi dan hantar mesej
       -> Batal"
```

Pengguna mengakses data Salesforce (dikelaskan CONFIDENTIAL), yang menaint keseluruhan sesi. Apabila mereka kemudian cuba menghantar mesej kepada kenalan luaran (pengkelasan berkesan PUBLIC), lapisan dasar menyekat output kerana data CONFIDENTIAL tidak boleh mengalir ke destinasi PUBLIC.

::: tip Mesej ejen kepada isteri ("Saya akan lambat malam ini") tidak sendirinya mengandungi data Salesforce. Tetapi sesi telah ditaint oleh akses Salesforce sebelumnya, dan seluruh konteks sesi -- termasuk apa sahaja yang mungkin dikekalkan LLM daripada respons Salesforce -- boleh mempengaruhi output. Peraturan tanpa tulis-bawah mencegah keseluruhan kelas kebocoran konteks ini. :::

## Apa yang Dilihat Pengguna

Apabila peraturan tanpa tulis-bawah menyekat sesuatu tindakan, pengguna menerima mesej yang jelas dan boleh diambil tindakan. Triggerfish menawarkan dua mod respons:

**Lalai (spesifik):**

```
Saya tidak boleh menghantar data sulit ke saluran awam.

-> Tetapkan semula sesi dan hantar mesej
-> Batal
```

**Pendidikan (opsyen melalui konfigurasi):**

```
Saya tidak boleh menghantar data sulit ke saluran awam.

Sebab: Sesi ini mengakses Salesforce (CONFIDENTIAL).
WhatsApp peribadi dikelaskan sebagai PUBLIC.
Data hanya boleh mengalir ke pengkelasan yang sama atau lebih tinggi.

Pilihan:
  - Tetapkan semula sesi dan hantar mesej
  - Minta pentadbir anda mengklasifikasikan semula saluran WhatsApp
  - Ketahui lebih lanjut: https://trigger.fish/security/no-write-down
```

Dalam kedua-dua kes, pengguna diberikan pilihan yang jelas. Mereka tidak pernah keliru tentang apa yang berlaku atau apa yang boleh mereka lakukan.

## Tetapan Semula Sesi

Apabila pengguna memilih "Tetapkan semula sesi dan hantar mesej," Triggerfish melakukan **tetapan semula penuh**:

1. Taint sesi dibersihkan kembali ke PUBLIC
2. Keseluruhan sejarah perbualan dibersihkan (mencegah kebocoran konteks)
3. Tindakan yang diminta kemudian dinilai semula berbanding sesi segar
4. Jika tindakan kini dibenarkan (data PUBLIC ke saluran PUBLIC), ia diteruskan

::: warning KESELAMATAN Tetapan semula sesi membersihkan taint **dan** sejarah perbualan. Ini bukan pilihan. Jika hanya label taint dibersihkan sementara konteks perbualan kekal, LLM masih boleh merujuk maklumat terklasifikasi daripada mesej sebelumnya, mengalahkan tujuan tetapan semula. :::

## Cara Penguatkuasaan Berfungsi

Peraturan tanpa tulis-bawah dikuatkuasakan di hook `PRE_OUTPUT` -- titik penguatkuasaan terakhir sebelum sebarang data meninggalkan sistem. Hook berjalan sebagai kod sinkronus, deterministik:

```typescript
// Logik penguatkuasaan yang dipermudahkan
function preOutputHook(context: HookContext): HookResult {
  const sessionTaint = getSessionTaint(context.sessionId);
  const channelClassification = getChannelClassification(context.channelId);
  const recipientClassification = getRecipientClassification(
    context.recipientId,
  );

  const effectiveClassification = min(
    channelClassification,
    recipientClassification,
  );

  if (sessionTaint > effectiveClassification) {
    return {
      decision: "BLOCK",
      reason: `Taint sesi (${sessionTaint}) melebihi ` +
        `pengkelasan berkesan (${effectiveClassification})`,
    };
  }

  return { decision: "ALLOW", reason: "Semakan pengkelasan lulus" };
}
```

Kod ini adalah:

- **Deterministik** -- input yang sama sentiasa menghasilkan keputusan yang sama
- **Sinkronus** -- hook selesai sebelum sebarang output dihantar
- **Tidak boleh dipalsukan** -- LLM tidak boleh mempengaruhi keputusan hook
- **Dilog** -- setiap pelaksanaan direkodkan dengan konteks penuh

## Taint Sesi dan Peningkatan

Taint sesi menjejaki tahap pengkelasan data tertinggi yang diakses semasa sesi. Ia mengikuti dua peraturan ketat:

1. **Peningkatan sahaja** -- taint boleh meningkat, tidak boleh menurun dalam sesi
2. **Automatik** -- taint dikemas kini oleh hook `POST_TOOL_RESPONSE` apabila data memasuki sesi

| Tindakan                               | Taint Sebelum | Taint Selepas            |
| -------------------------------------- | ------------- | ------------------------ |
| Akses API cuaca (PUBLIC)               | PUBLIC        | PUBLIC                   |
| Akses wiki dalaman (INTERNAL)          | PUBLIC        | INTERNAL                 |
| Akses Salesforce (CONFIDENTIAL)        | INTERNAL      | CONFIDENTIAL             |
| Akses API cuaca semula (PUBLIC)        | CONFIDENTIAL  | CONFIDENTIAL (tiada ubah) |

Setelah sesi mencapai CONFIDENTIAL, ia kekal CONFIDENTIAL sehingga pengguna menetapkan semula secara eksplisit. Tiada pereputan automatik, tiada tamat masa, dan tiada cara bagi LLM untuk menurunkan taint.

## Mengapa Peraturan Ini Tetap

Peraturan tanpa tulis-bawah tidak boleh dikonfigurasi kerana menjadikannya boleh dikonfigurasi akan menjejaskan keseluruhan model keselamatan. Jika pentadbir boleh mencipta pengecualian -- "benarkan data CONFIDENTIAL mengalir ke saluran PUBLIC untuk satu integrasi ini" -- pengecualian tersebut menjadi permukaan serangan.

Setiap kawalan keselamatan lain dalam Triggerfish dibina atas andaian bahawa peraturan tanpa tulis-bawah adalah mutlak. Taint sesi, keturunan data, siling delegasi ejen, dan log audit semuanya bergantung padanya. Menjadikannya boleh dikonfigurasi akan memerlukan pemikiran semula keseluruhan seni bina.

::: info Pentadbir **boleh** mengkonfigurasi tahap pengkelasan yang diberikan kepada saluran, penerima, dan integrasi. Ini adalah cara yang betul untuk menyesuaikan aliran data: jika saluran perlu menerima data yang lebih tinggi kelasnya, kelaskan saluran pada tahap yang lebih tinggi. Peraturan itu sendiri kekal tetap; input kepada peraturan boleh dikonfigurasi. :::

## Halaman Berkaitan

- [Reka Bentuk Keselamatan-Dahulu](./) -- gambaran keseluruhan seni bina keselamatan
- [Identiti & Auth](./identity) -- cara identiti saluran ditetapkan
- [Audit & Pematuhan](./audit-logging) -- cara tindakan yang disekat direkodkan
- [Seni Bina: Taint & Sesi](/ms-MY/architecture/taint-and-sessions) -- mekanik taint sesi secara terperinci
