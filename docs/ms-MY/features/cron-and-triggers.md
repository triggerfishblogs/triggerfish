# Cron dan Trigger

Ejen Triggerfish tidak terhad kepada soal-jawab reaktif. Sistem cron dan trigger membolehkan tingkah laku proaktif: tugas berjadual, daftar masuk berkala, taklimat pagi, pemantauan latar belakang, dan aliran kerja berbilang langkah autonomi.

## Cron Job

Cron job adalah tugas berjadual dengan arahan tetap, saluran penghantaran, dan siling pengkelasan. Mereka menggunakan sintaks ungkapan cron standard.

### Konfigurasi

Tentukan cron job dalam `triggerfish.yaml` atau biarkan ejen mengurusnya pada masa larian melalui alat cron:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 PG setiap hari
        task: "Sediakan taklimat pagi dengan kalendar,
          e-mel yang belum dibaca, dan cuaca"
        channel: telegram # Di mana untuk dihantar
        classification: INTERNAL # Taint maks untuk tugas ini

      - id: pipeline-check
        schedule: "0 */4 * * *" # Setiap 4 jam
        task: "Semak saluran paip Salesforce untuk perubahan"
        channel: slack
        classification: CONFIDENTIAL
```

### Cara Ia Berfungsi

1. **CronManager** menghurai ungkapan cron standard dan mengekalkan daftar tugas berterusan yang bertahan selepas pemulaan semula.
2. Apabila tugas diaktifkan, **OrchestratorFactory** mencipta pengorkestra dan sesi terpencil khusus untuk pelaksanaan tersebut.
3. Tugas berjalan dalam **ruang kerja sesi latar belakang** dengan penjejakan taintnya sendiri.
4. Output dihantar ke saluran yang dikonfigurasi, tertakluk kepada peraturan pengkelasan saluran tersebut.
5. Sejarah pelaksanaan direkodkan untuk audit.

### Cron Diurus Ejen

Ejen boleh mencipta dan mengurus cron jobnya sendiri melalui alat `cron`:

| Tindakan       | Keterangan             | Keselamatan                                    |
| -------------- | ---------------------- | ---------------------------------------------- |
| `cron.list`    | Senaraikan semua tugas berjadual | Pemilik sahaja                      |
| `cron.create`  | Jadualkan tugas baru   | Pemilik sahaja, siling pengkelasan dikuatkuasakan |
| `cron.delete`  | Buang tugas berjadual  | Pemilik sahaja                                 |
| `cron.history` | Lihat pelaksanaan lepas | Jejak audit dikekalkan                        |

::: warning Penciptaan cron job memerlukan pengesahan pemilik. Ejen tidak boleh menjadualkan tugas bagi pihak pengguna luaran atau melebihi siling pengkelasan yang dikonfigurasi. :::

### Pengurusan Cron CLI

Cron job juga boleh diurus terus dari baris perintah:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

Bendera `--classification` menetapkan siling pengkelasan untuk tugas. Tahap yang sah adalah `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, dan `RESTRICTED`. Jika diabaikan, lalai kepada `INTERNAL`.

## Sistem Trigger

Trigger adalah gelung "daftar masuk" berkala di mana ejen bangun untuk menilai sama ada ada tindakan proaktif yang diperlukan. Tidak seperti cron job dengan tugas tetap, trigger memberi ejen budi bicara untuk memutuskan apa yang perlu diberi perhatian.

### TRIGGER.md

`TRIGGER.md` menentukan apa yang perlu diperiksa oleh ejen semasa setiap wakeup. Ia terletak di `~/.triggerfish/config/TRIGGER.md` dan merupakan fail markdown bebas bentuk di mana anda menentukan keutamaan pemantauan, peraturan peningkatan, dan tingkah laku proaktif.

Jika `TRIGGER.md` tiada, ejen menggunakan pengetahuan umumnya untuk memutuskan apa yang perlu diberi perhatian.

**Contoh TRIGGER.md:**

```markdown
# TRIGGER.md -- Apa yang perlu diperiksa pada setiap wakeup

## Semakan Keutamaan

- Mesej yang belum dibaca merentasi semua saluran yang lebih tua dari 1 jam
- Konflik kalendar dalam 24 jam akan datang
- Tugas yang tertunggak dalam Linear atau Jira

## Pemantauan

- GitHub: PR yang menunggu semakan saya
- E-mel: apa-apa dari kenalan VIP (tandakan untuk pemberitahuan segera)
- Slack: sebutan dalam saluran #incidents

## Proaktif

- Jika pagi (7-9pg), sediakan taklimat harian
- Jika petang Jumaat, draf ringkasan mingguan
```

### Konfigurasi Trigger

Masa trigger dan kekangan ditetapkan dalam `triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # Tetapkan ke false untuk melumpuhkan trigger (lalai: true)
    interval_minutes: 30 # Semak setiap 30 minit (lalai: 30)
    # Tetapkan ke 0 untuk melumpuhkan trigger tanpa membuang konfigurasi
    classification_ceiling: CONFIDENTIAL # Siling taint maks (lalai: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Jangan bangun antara pukul 10 malam ...
      end: 7 # ... dan 7 pagi
```

| Tetapan                                 | Keterangan                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`                               | Sama ada wakeup trigger berkala aktif. Tetapkan ke `false` untuk melumpuhkan.                                                                    |
| `interval_minutes`                      | Seberapa kerap (dalam minit) ejen bangun untuk memeriksa trigger. Lalai: `30`. Tetapkan ke `0` untuk melumpuhkan trigger tanpa membuang blok konfigurasi. |
| `classification_ceiling`                | Tahap pengkelasan maksimum yang boleh dicapai oleh sesi trigger. Lalai: `CONFIDENTIAL`.                                                          |
| `quiet_hours.start` / `quiet_hours.end` | Julat jam (jam 24j) di mana trigger ditindas.                                                                                                    |

::: tip Untuk melumpuhkan trigger sementara, tetapkan `interval_minutes: 0`. Ini bersamaan dengan `enabled: false` dan membolehkan anda mengekalkan tetapan trigger lain supaya anda boleh mendayakan semula dengan mudah. :::

### Pelaksanaan Trigger

Setiap wakeup trigger mengikut urutan ini:

1. Penjadual diaktifkan pada selang yang dikonfigurasi.
2. Sesi latar belakang segar dijanakan dengan taint `PUBLIC`.
3. Ejen membaca `TRIGGER.md` untuk arahan pemantauannya.
4. Ejen menilai setiap semakan, menggunakan alat dan pelayan MCP yang tersedia.
5. Jika tindakan diperlukan, ejen bertindak — menghantar pemberitahuan, mencipta tugas, atau menyampaikan ringkasan.
6. Taint sesi mungkin meningkat apabila data terklasifikasi diakses, tetapi ia tidak boleh melebihi siling yang dikonfigurasi.
7. Sesi diarkibkan selepas selesai.

::: tip Trigger dan cron job saling melengkapi. Gunakan cron untuk tugas yang perlu berjalan pada masa yang tepat tanpa mengira keadaan (taklimat pagi pada pukul 7 PG). Gunakan trigger untuk pemantauan yang memerlukan pertimbangan (semak jika ada yang memerlukan perhatian saya setiap 30 minit). :::

## Alat Konteks Trigger

Ejen boleh memuatkan keputusan trigger ke dalam perbualan semasanya menggunakan alat `trigger_add_to_context`. Ini berguna apabila pengguna bertanya tentang sesuatu yang diperiksa semasa wakeup trigger terakhir.

### Penggunaan

| Parameter | Lalai      | Keterangan                                                                                              |
| --------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"` | Output trigger mana yang perlu dimuatkan: `"trigger"` (berkala), `"cron:<job-id>"`, atau `"webhook:<source>"` |

Alat memuatkan hasil pelaksanaan terkini untuk sumber yang ditentukan dan menambahnya ke konteks perbualan.

### Penguatkuasaan Write-Down

Suntikan konteks trigger menghormati peraturan tiada write-down:

- Jika pengkelasan trigger **melebihi** taint sesi, taint sesi **meningkat** untuk sepadan
- Jika taint sesi **melebihi** pengkelasan trigger, suntikan **dibenarkan** — data pengkelasan rendah sentiasa boleh mengalir ke sesi pengkelasan lebih tinggi (tingkah laku `canFlowTo` normal). Taint sesi tidak berubah.

::: info Sesi CONFIDENTIAL boleh memuatkan hasil trigger PUBLIC tanpa masalah — data mengalir ke atas. Sebaliknya (menyuntik data trigger CONFIDENTIAL ke sesi dengan siling PUBLIC) akan meningkatkan taint sesi kepada CONFIDENTIAL. :::

### Kegigihan

Keputusan trigger disimpan melalui `StorageProvider` dengan kunci dalam format `trigger:last:<source>`. Hanya hasil terkini per sumber yang disimpan.

## Integrasi Keselamatan

Semua pelaksanaan berjadual berintegrasi dengan model keselamatan teras:

- **Sesi terpencil** — Setiap cron job dan wakeup trigger berjalan dalam sesinya sendiri yang dijanakan dengan penjejakan taint bebas.
- **Siling pengkelasan** — Tugas latar belakang tidak boleh melebihi tahap pengkelasan yang dikonfigurasi, walaupun alat yang diinvokasinya mengembalikan data yang lebih tinggi diklasifikasikan.
- **Hook dasar** — Semua tindakan dalam tugas berjadual melalui hook penguatkuasaan yang sama seperti sesi interaktif (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Pengkelasan saluran** — Penghantaran output menghormati tahap pengkelasan saluran sasaran. Hasil `CONFIDENTIAL` tidak boleh dihantar ke saluran `PUBLIC`.
- **Jejak audit** — Setiap pelaksanaan berjadual direkodkan dengan konteks penuh: ID tugas, ID sesi, sejarah taint, tindakan yang diambil, dan status penghantaran.
- **Kegigihan** — Cron job disimpan melalui `StorageProvider` (namespace: `cron:`) dan bertahan selepas pemulaan semula gateway.
