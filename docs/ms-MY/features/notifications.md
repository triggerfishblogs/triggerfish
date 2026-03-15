# Pemberitahuan

NotificationService adalah abstraksi kelas pertama Triggerfish untuk menyampaikan pemberitahuan kepada pemilik ejen merentasi semua saluran yang disambungkan.

## Mengapa Perkhidmatan Pemberitahuan?

Tanpa perkhidmatan khusus, logik pemberitahuan cenderung tersebar merentasi kod — setiap ciri melaksanakan corak "beritahu pemilik"nya sendiri. Ini membawa kepada tingkah laku yang tidak konsisten, pemberitahuan yang terlepas, dan duplikasi.

Triggerfish memusatkan semua penghantaran pemberitahuan melalui satu perkhidmatan yang mengendalikan keutamaan, baris gilir, dan penyahduplikatan.

## Cara Ia Berfungsi

<img src="/diagrams/notification-routing.svg" alt="Penghalaan pemberitahuan: sumber mengalir melalui NotificationService dengan penghalaan keutamaan, baris gilir, dan penyahduplikatan ke saluran" style="max-width: 100%;" />

Apabila mana-mana komponen perlu memberitahu pemilik — cron job selesai, trigger mengesan sesuatu yang penting, webhook diaktifkan — ia memanggil NotificationService. Perkhidmatan menentukan cara dan di mana untuk menyampaikan pemberitahuan.

## Antara Muka

```typescript
interface NotificationService {
  /** Sampaikan atau berikan pemberitahuan dalam baris gilir untuk pengguna. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Dapatkan pemberitahuan yang belum dihantar untuk pengguna. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Akui pemberitahuan sebagai disampaikan. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Tahap Keutamaan

Setiap pemberitahuan membawa keutamaan yang mempengaruhi tingkah laku penghantaran:

| Keutamaan  | Tingkah Laku                                                                    |
| ---------- | ------------------------------------------------------------------------------- |
| `critical` | Disampaikan dengan segera ke semua saluran yang disambungkan. Memintas waktu senyap. |
| `normal`   | Disampaikan ke saluran pilihan. Diberikan dalam baris gilir jika pengguna luar talian. |
| `low`      | Diberikan dalam baris gilir dan disampaikan dalam kelompok. Mungkin diringkaskan. |

## Pilihan Penghantaran

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Baris Gilir dan Penghantaran Luar Talian

Apabila pengguna sasaran luar talian atau tiada saluran yang disambungkan, pemberitahuan diberikan dalam baris gilir. Mereka disampaikan apabila:

- Pengguna memulakan sesi baru.
- Saluran disambungkan semula.
- Pengguna meminta pemberitahuan yang belum dihantar secara eksplisit.

Pemberitahuan yang belum dihantar boleh didapatkan semula dengan `getPending()` dan diakui dengan `acknowledge()`.

## Penyahduplikatan

NotificationService menghalang pemberitahuan berganda daripada mencapai pengguna. Jika kandungan pemberitahuan yang sama disampaikan beberapa kali dalam tetingkap, hanya penghantaran pertama yang melalui.

## Konfigurasi

Konfigurasi tingkah laku pemberitahuan dalam `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Saluran penghantaran lalai
  quiet_hours: "22:00-07:00" # Tindas normal/rendah semasa jam-jam ini
  batch_interval: 15m # Kelompok pemberitahuan keutamaan rendah
```

## Contoh Penggunaan

Pemberitahuan digunakan merentasi sistem:

- **Cron job** memberitahu pemilik apabila tugas berjadual selesai atau gagal.
- **Trigger** memberitahu pemilik apabila pemantauan mengesan sesuatu yang memerlukan perhatian.
- **Webhook** memberitahu pemilik apabila peristiwa luaran diaktifkan (PR GitHub, amaran Sentry).
- **Pelanggaran dasar** memberitahu pemilik apabila tindakan yang disekat dicuba.
- **Status saluran** memberitahu pemilik apabila saluran terputus atau disambungkan semula.

::: info Baris gilir pemberitahuan dikekalkan melalui `StorageProvider` (namespace: `notifications:`) dengan pengekalan lalai 7 hari selepas penghantaran. Pemberitahuan yang belum dihantar dikekalkan sehingga diakui. :::
