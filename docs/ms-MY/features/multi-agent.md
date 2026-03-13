# Penghalaan Berbilang Ejen

Triggerfish menyokong penghalaan saluran, akaun, atau kenalan yang berbeza ke ejen terpencil yang berasingan, masing-masing dengan ruang kerjanya sendiri, sesi, personaliti, dan siling pengkelasan.

## Mengapa Berbilang Ejen?

Satu ejen dengan satu personaliti tidak selalu mencukupi. Anda mungkin mahukan:

- **Pembantu peribadi** di WhatsApp yang mengendalikan kalendar, peringatan, dan mesej keluarga.
- **Pembantu kerja** di Slack yang mengurus tiket Jira, PR GitHub, dan semakan kod.
- **Ejen sokongan** di Discord yang menjawab soalan komuniti dengan nada yang berbeza dan akses terhad.

Penghalaan berbilang ejen membolehkan anda menjalankan semua ini serentak dari satu pemasangan Triggerfish.

## Cara Ia Berfungsi

<img src="/diagrams/multi-agent-routing.svg" alt="Penghalaan berbilang ejen: saluran masuk dihalakan melalui AgentRouter ke ruang kerja ejen terpencil" style="max-width: 100%;" />

**AgentRouter** memeriksa setiap mesej masuk dan memetakannya ke ejen berdasarkan peraturan penghalaan yang boleh dikonfigurasi. Jika tiada peraturan yang sepadan, mesej pergi ke ejen lalai.

## Peraturan Penghalaan

Mesej boleh dihalakan mengikut:

| Kriteria | Keterangan                                    | Contoh                                         |
| -------- | --------------------------------------------- | ---------------------------------------------- |
| Saluran  | Halakan mengikut platform pemesejan            | Semua mesej Slack pergi ke "Kerja"             |
| Akaun    | Halakan mengikut akaun tertentu dalam saluran | E-mel kerja berbanding e-mel peribadi          |
| Kenalan  | Halakan mengikut identiti penghantar/rakan     | Mesej dari pengurus anda pergi ke "Kerja"      |
| Lalai    | Sandaran apabila tiada peraturan yang sepadan  | Semua yang lain pergi ke "Peribadi"            |

## Konfigurasi

Tentukan ejen dan penghalaan dalam `triggerfish.yaml`:

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

Setiap ejen menentukan:

- **id** — Pengecam unik untuk penghalaan.
- **name** — Nama yang boleh dibaca manusia.
- **channels** — Instans saluran mana yang dikendalikan oleh ejen ini.
- **tools** — Profil alat dan senarai benarkan/tolak yang eksplisit.
- **model** — Model LLM mana yang digunakan (boleh berbeza per ejen).
- **classification_ceiling** — Tahap pengkelasan maksimum yang boleh dicapai oleh ejen ini.

## Identiti Ejen

Setiap ejen mempunyai `SPINE.md`nya sendiri yang mentakrifkan personaliti, misi, dan batasannya. Fail SPINE.md tinggal dalam direktori ruang kerja ejen:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Personaliti pembantu peribadi
    work/
      SPINE.md          # Personaliti pembantu kerja
    support/
      SPINE.md          # Personaliti bot sokongan
```

## Pengasingan

Penghalaan berbilang ejen menguatkuasakan pengasingan ketat antara ejen:

| Aspek     | Pengasingan                                                                                  |
| --------- | -------------------------------------------------------------------------------------------- |
| Sesi      | Setiap ejen mempunyai ruang sesi bebas. Sesi tidak pernah dikongsi.                          |
| Taint     | Taint dijejak per-ejen, bukan merentasi ejen. Taint kerja tidak mempengaruhi sesi peribadi. |
| Kemahiran | Kemahiran dimuatkan per-ruang kerja. Kemahiran kerja tidak tersedia kepada ejen peribadi.    |
| Rahsia    | Kelayakan diasingkan per-ejen. Ejen sokongan tidak boleh mengakses kunci API kerja.          |
| Ruang kerja | Setiap ejen mempunyai ruang kerja sistem fail tersendiri untuk pelaksanaan kod.            |

::: warning Komunikasi antara ejen adalah mungkin melalui `sessions_send` tetapi bergerbang oleh lapisan dasar. Satu ejen tidak boleh mengakses data atau sesi ejen lain secara senyap tanpa peraturan dasar eksplisit yang membenarkannya. :::

::: tip Penghalaan berbilang ejen adalah untuk memisahkan kebimbangan merentasi saluran dan persona. Untuk ejen yang perlu bekerjasama dalam tugas bersama, lihat [Pasukan Ejen](/ms-MY/features/agent-teams). :::

## Ejen Lalai

Apabila tiada peraturan penghalaan yang sepadan dengan mesej masuk, ia pergi ke ejen lalai. Anda boleh menetapkan ini dalam konfigurasi:

```yaml
agents:
  default: personal
```

Jika tiada lalai dikonfigurasi, ejen pertama dalam senarai digunakan sebagai lalai.
