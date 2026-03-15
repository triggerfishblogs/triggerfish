# KB: Perubahan Pecahan

Senarai perubahan mengikut versi yang mungkin memerlukan tindakan semasa menaik taraf.

## Notion: `client_secret` Dibuang

**Komit:** 6d876c3

Medan `client_secret` dibuang dari konfigurasi integrasi Notion sebagai langkah pengerasan keselamatan. Notion kini hanya menggunakan token OAuth yang disimpan dalam keychain OS.

**Tindakan diperlukan:** Jika `triggerfish.yaml` anda mempunyai medan `notion.client_secret`, buangnya. Ia akan diabaikan tetapi mungkin menyebabkan kekeliruan.

**Aliran persediaan baru:**

```bash
triggerfish connect notion
```

Ini menyimpan token integrasi dalam keychain. Tiada client secret diperlukan.

---

## Nama Alat: Titik kepada Garis Bawah

**Komit:** 505a443

Semua nama alat ditukar dari notasi bertitik (`foo.bar`) ke notasi garis bawah (`foo_bar`). Sesetengah pembekal LLM tidak menyokong titik dalam nama alat, yang menyebabkan kegagalan panggilan alat.

**Tindakan diperlukan:** Jika anda mempunyai peraturan dasar tersuai atau definisi kemahiran yang merujuk nama alat dengan titik, kemas kini untuk menggunakan garis bawah:

```yaml
# Sebelum
- tool: notion.search

# Selepas
- tool: notion_search
```

---

## Pemasang Windows: Move-Item kepada Copy-Item

**Komit:** 5e0370f

Pemasang PowerShell Windows ditukar dari `Move-Item -Force` ke `Copy-Item -Force` untuk penggantian binari semasa menaik taraf. `Move-Item` tidak boleh dipercayai menimpa fail pada Windows.

**Tindakan diperlukan:** Tiada jika anda memasang segar. Jika anda menggunakan versi lama dan `triggerfish update` gagal pada Windows, hentikan perkhidmatan secara manual sebelum mengemas kini:

```powershell
Stop-Service Triggerfish
# Kemudian jalankan semula pemasang atau triggerfish update
```

---

## Pencetakan Versi: Runtime ke Masa Binaan

**Komit:** e8b0c8c, eae3930, 6ce0c25

Maklumat versi dipindahkan dari pengesanan runtime (menyemak `deno.json`) ke pencetakan masa binaan dari tag git. Banner CLI tidak lagi menunjukkan string versi yang dikodkan keras.

**Tindakan diperlukan:** Tiada. `triggerfish version` terus berfungsi. Binaan pembangunan menunjukkan `dev` sebagai versi.

---

## Signal: JRE 21 ke JRE 25

**Komit:** e5b1047

Pemasang automatik saluran Signal dikemas kini untuk memuat turun JRE 25 (dari Adoptium) dan bukannya JRE 21. Versi signal-cli juga ditetapkan ke v0.14.0.

**Tindakan diperlukan:** Jika anda mempunyai pemasangan signal-cli sedia ada dengan JRE yang lebih lama, jalankan semula persediaan Signal:

```bash
triggerfish config add-channel signal
```

Ini memuat turun JRE dan signal-cli yang dikemas kini.

---

## Rahsia: Teks Biasa ke Disulitkan

Format storan rahsia ditukar dari JSON teks biasa ke JSON yang disulitkan AES-256-GCM.

**Tindakan diperlukan:** Tiada. Penghijrahan adalah automatik. Lihat [Penghijrahan Rahsia](/ms-MY/support/kb/secrets-migration) untuk perincian.

Selepas penghijrahan, memutar rahsia anda adalah disyorkan kerana versi teks biasa sebelumnya disimpan pada cakera.

---

## Tidepool: Protokol Panggilan Balik ke Kanvas

Antara muka Tidepool (A2UI) berhijrah dari antara muka `TidepoolTools` berasaskan-panggilan-balik ke protokol berasaskan kanvas.

**Fail yang terjejas:**
- `src/tools/tidepool/tools/tools_legacy.ts` (antara muka lama, dikekalkan untuk keserasian)
- `src/tools/tidepool/tools/tools_canvas.ts` (antara muka baru)

**Tindakan diperlukan:** Jika anda mempunyai kemahiran tersuai yang menggunakan antara muka panggilan balik Tidepool lama, ia akan terus berfungsi melalui shim warisan. Kemahiran baru sepatutnya menggunakan protokol kanvas.

---

## Konfigurasi: Format String `primary` Warisan

Medan `models.primary` sebelumnya menerima string biasa (`"anthropic/claude-sonnet-4-20250514"`). Kini ia memerlukan objek:

```yaml
# Warisan (masih diterima untuk keserasian ke belakang)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Semasa (disyorkan)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Tindakan diperlukan:** Kemas kini ke format objek. Format string masih dihurai tetapi mungkin dibuang dalam versi akan datang.

---

## Pengelogan Konsol: Dibuang

**Komit:** 9ce1ce5

Semua panggilan `console.log`, `console.warn`, dan `console.error` mentah dimigrasikan ke logger berstruktur (`createLogger()`). Memandangkan Triggerfish berjalan sebagai daemon, output stdout/stderr tidak kelihatan kepada pengguna. Semua pengelogan kini melalui penulis fail.

**Tindakan diperlukan:** Tiada. Jika anda bergantung pada output konsol untuk penyahpepijatan (contoh, paip stdout), gunakan `triggerfish logs` sebaliknya.

---

## Menganggar Impak

Apabila menaik taraf merentasi pelbagai versi, semak setiap entri di atas. Kebanyakan perubahan adalah serasi ke belakang dengan penghijrahan automatik. Satu-satunya perubahan yang memerlukan tindakan manual adalah:

1. **Pembuangan notion client_secret** (buang medan dari konfigurasi)
2. **Perubahan format nama alat** (kemas kini peraturan dasar tersuai)
3. **Kemas kini JRE Signal** (jalankan semula persediaan Signal jika menggunakan Signal)

Segalanya lain dikendalikan secara automatik.
