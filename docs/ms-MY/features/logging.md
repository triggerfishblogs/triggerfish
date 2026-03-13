# Pengelogan Berstruktur

Triggerfish menggunakan pengelogan berstruktur dengan tahap keterukan, putaran fail, dan output yang boleh dikonfigurasi. Setiap komponen -- gateway, pengorkestra, klien MCP, pembekal LLM, enjin dasar -- mencatat melalui logger yang bersatu. Ini bermakna anda mendapat aliran log tunggal yang konsisten tanpa mengira di mana peristiwa berasal.

## Tahap Log

Tetapan `logging.level` mengawal berapa banyak perincian yang ditangkap:

| Nilai Konfigurasi  | Keterukan           | Apa yang Dicatat                                          |
| ------------------ | ------------------- | --------------------------------------------------------- |
| `quiet`            | ERROR sahaja        | Ranap dan kegagalan kritikal                              |
| `normal` (lalai)   | INFO dan ke atas    | Permulaan, sambungan, peristiwa penting                   |
| `verbose`          | DEBUG dan ke atas   | Panggilan alat, keputusan dasar, permintaan pembekal      |
| `debug`            | TRACE (semua)       | Muatan permintaan/respons penuh, penstriman tahap token   |

Setiap tahap merangkumi semua di atasnya. Menetapkan `verbose` memberi anda DEBUG, INFO, dan ERROR. Menetapkan `quiet` membisu semua kecuali ralat.

## Konfigurasi

Tetapkan tahap log dalam `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Itulah satu-satunya konfigurasi yang diperlukan. Lalai adalah wajar untuk kebanyakan pengguna -- `normal` menangkap cukup untuk memahami apa yang ejen lakukan tanpa membanjiri log dengan bunyi.

## Output Log

Log ditulis ke dua destinasi serentak:

- **stderr** -- untuk tangkapan `journalctl` apabila berjalan sebagai perkhidmatan systemd, atau output terminal langsung semasa pembangunan
- **Fail** -- `~/.triggerfish/logs/triggerfish.log`

Setiap baris log mengikut format berstruktur:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Tag Komponen

Tag dalam kurungan mengenal pasti subsistem mana yang mengeluarkan entri log:

| Tag           | Komponen                                      |
| ------------- | --------------------------------------------- |
| `[gateway]`   | Satah kawalan WebSocket                       |
| `[orch]`      | Pengorkestra ejen dan pengiriman alat         |
| `[mcp]`       | Klien MCP dan proksi gateway                  |
| `[provider]`  | Panggilan pembekal LLM                        |
| `[policy]`    | Enjin dasar dan penilaian hook                |
| `[session]`   | Kitaran hayat sesi dan perubahan taint        |
| `[channel]`   | Penyesuai saluran (Telegram, Slack, dll.)     |
| `[scheduler]` | Cron job, trigger, webhook                    |
| `[memory]`    | Operasi stor memori                           |
| `[browser]`   | Automasi pelayar (CDP)                        |

## Putaran Fail

Fail log diputar secara automatik untuk mencegah penggunaan cakera yang tidak terbatas:

- **Ambang putaran:** 1 MB per fail
- **Fail yang dikekalkan:** 10 fail yang diputar (jumlah ~10 MB maksimum)
- **Pemeriksaan putaran:** pada setiap penulisan
- **Penamaan:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

Apabila `triggerfish.log` mencapai 1 MB, ia dinamakan semula ke `triggerfish.1.log`, `triggerfish.1.log` sebelumnya menjadi `triggerfish.2.log`, dan seterusnya. Fail tertua (`triggerfish.10.log`) dipadamkan.

## Penulisan Tembak-dan-Lupakan

Penulisan fail adalah tidak menyekat. Logger tidak pernah melambatkan pemprosesan permintaan untuk menunggu penulisan cakera selesai. Jika penulisan gagal -- cakera penuh, ralat kebenaran, fail dikunci -- ralat ditelan secara senyap.

Ini adalah disengajakan. Pengelogan tidak sepatutnya pernah meranap aplikasi atau melambatkan ejen. Output stderr berfungsi sebagai sandaran jika penulisan fail gagal.

## Alat Baca Log

Alat `log_read` memberi ejen akses langsung ke sejarah log berstruktur. Ejen boleh membaca entri log terkini, menapis mengikut tag komponen atau keterukan, dan mendiagnosis isu tanpa meninggalkan perbualan.

| Parameter   | Jenis  | Diperlukan | Keterangan                                                          |
| ----------- | ------ | ---------- | ------------------------------------------------------------------- |
| `lines`     | number | tidak      | Bilangan baris log terkini untuk dikembalikan (lalai: 100)          |
| `level`     | string | tidak      | Penapis keterukan minimum (`error`, `warn`, `info`, `debug`)        |
| `component` | string | tidak      | Tapis mengikut tag komponen (contoh, `gateway`, `orch`, `provider`) |

::: tip Tanya ejen anda "ralat apa yang berlaku hari ini" atau "tunjukkan saya log gateway terkini" -- alat `log_read` mengendalikan penapisan dan pengambilan semula. :::

## Melihat Log

### Arahan CLI

```bash
# Lihat log terkini
triggerfish logs

# Strim secara masa nyata
triggerfish logs --tail

# Akses fail langsung
cat ~/.triggerfish/logs/triggerfish.log
```

### Dengan journalctl

Apabila Triggerfish berjalan sebagai perkhidmatan systemd, log juga ditangkap oleh jurnal:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs Pengelogan Berstruktur

::: info Pemboleh ubah persekitaran `TRIGGERFISH_DEBUG=1` masih disokong untuk keserasian ke belakang tetapi konfigurasi `logging.level: debug` adalah pilihan. Kedua-duanya menghasilkan output yang setara -- pengelogan TRACE penuh semua muatan permintaan/respons dan keadaan dalaman. :::

## Berkaitan

- [Arahan CLI](/ms-MY/guide/commands) -- rujukan arahan `triggerfish logs`
- [Konfigurasi](/ms-MY/guide/configuration) -- skema `triggerfish.yaml` penuh
