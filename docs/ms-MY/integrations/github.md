# Integrasi GitHub

Triggerfish berintegrasi dengan GitHub melalui dua pendekatan yang saling melengkapi:

## Persediaan Pantas: Alat REST API

Cara terpantas untuk menyambungkan GitHub. Memberi ejen 14 alat terbina dalam untuk repo, PR, isu, Actions, dan carian kod -- semua dengan penyebaran taint yang sedar-pengkelasan.

```bash
triggerfish connect github
```

Ini membimbing anda melalui penciptaan Token Akses Peribadi berbutiran halus, mengesahkannya, dan menyimpannya dalam keychain OS. Itu sahaja -- ejen anda kini boleh menggunakan semua alat `github_*`.

Lihat [dokumentasi Kemahiran](/ms-MY/integrations/skills) untuk maklumat lanjut tentang cara kemahiran berfungsi, atau jalankan `triggerfish skills list` untuk melihat semua alat yang tersedia.

## Lanjutan: `gh` CLI + Webhook

Untuk gelung maklum balas pembangunan penuh (ejen mencipta cawangan, membuka PR, bertindak balas kepada semakan kod), Triggerfish juga menyokong CLI `gh` melalui exec dan penghantaran semakan yang dipacu webhook. Ini menggunakan tiga bahagian yang boleh dikompos:

1. **`gh` CLI melalui exec** -- lakukan semua tindakan GitHub (cipta PR, baca semakan, komen, cantum)
2. **Penghantaran semakan** -- dua mod: **peristiwa webhook** (segera, memerlukan titik akhir awam) atau **pengundian berasaskan trigger** melalui `gh pr view` (berfungsi di belakang tembok api)
3. **Kemahiran git-branch-management** -- mengajar ejen aliran kerja cawangan/PR/semakan yang lengkap

Bersama-sama, ini mencipta gelung maklum balas pembangunan penuh: ejen mencipta cawangan, mengkomit kod, membuka PR, dan bertindak balas kepada maklum balas penyemak -- tiada kod API GitHub tersuai diperlukan.

### Prasyarat

#### gh CLI

CLI GitHub (`gh`) mesti dipasang dan ditetapkan dalam persekitaran di mana Triggerfish berjalan.

```bash
# Pasang gh (Fedora/RHEL)
sudo dnf install gh

# Pasang gh (macOS)
brew install gh

# Pasang gh (Debian/Ubuntu)
sudo apt install gh

# Tetapkan
gh auth login
```

Sahkan pengesahan:

```bash
gh auth status
```

Ejen menggunakan `gh` melalui `exec.run("gh ...")` -- tiada konfigurasi token GitHub berasingan diperlukan selain dari log masuk `gh`.

### Git

Git mesti dipasang dan dikonfigurasi dengan nama pengguna dan e-mel:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Akses Repositori

Ruang kerja ejen mesti menjadi repositori git (atau mengandungi satu) dengan akses tolak ke jauh.

## Penghantaran Semakan

Terdapat dua cara untuk ejen mengetahui tentang semakan PR baru. Pilih satu atau gunakan kedua-duanya bersama.

### Pilihan A: Pengundian Berasaskan Trigger

Tiada ketersambungan masuk diperlukan. Ejen mengundi GitHub mengikut jadual menggunakan `gh pr view`. Berfungsi di belakang mana-mana tembok api, NAT, atau VPN.

Tambah cron job ke `triggerfish.yaml`:

```yaml
scheduler:
  cron:
    jobs:
      - id: pr-review-check
        schedule: "*/15 * * * *"
        task: >
          Check all open PR tracking files in scratch/pr-tracking/.
          For each open PR, query GitHub for new reviews or state changes
          using gh pr view. Address any review feedback, handle merges
          and closures.
        classification: INTERNAL
```

Atau tambah "semak PR terbuka untuk maklum balas semakan" ke TRIGGER.md ejen untuk pelaksanaan semasa kitaran kebangkitan trigger biasa.

### Pilihan B: Persediaan Webhook

Webhook menghantar peristiwa semakan dengan segera. Ini memerlukan gateway Triggerfish boleh dicapai dari pelayan GitHub (contoh melalui Tailscale Funnel, proksi songsang, atau terowong).

### Langkah 1: Jana rahsia webhook

```bash
openssl rand -hex 32
```

Simpan ini sebagai pemboleh ubah persekitaran:

```bash
export GITHUB_WEBHOOK_SECRET="<rahsia-yang-dijana>"
```

Tambah ke profil shell atau pengurus rahsia anda supaya ia berterusan merentasi mulakan semula.

### Langkah 2: Konfigurasikan Triggerfish

Tambah titik akhir webhook ke `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # rahsia disimpan dalam keychain OS
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: >
            A PR review was submitted. Read the PR tracking file from
            scratch/pr-tracking/ to recover context. Check out the branch,
            read the review, address any requested changes, commit, push,
            and comment on the PR with a summary of changes made.
        - event: "pull_request_review_comment"
          task: >
            An inline review comment was posted on a PR. Read the PR
            tracking file, check out the branch, address the specific
            comment, commit, push.
        - event: "issue_comment"
          task: >
            A comment was posted on a PR or issue. Check if this is a
            tracked PR by looking up tracking files in scratch/pr-tracking/.
            If tracked, check out the branch and address the feedback.
        - event: "pull_request.closed"
          task: >
            A PR was closed or merged. Read the tracking file. If merged,
            clean up: delete local branch, archive tracking file to
            completed/. Notify the owner of the merge. If closed without
            merge, archive and notify.
```

### Langkah 3: Dedahkan titik akhir webhook

Gateway Triggerfish mesti boleh dicapai dari pelayan GitHub. Pilihan:

**Tailscale Funnel (disyorkan untuk kegunaan peribadi):**

```yaml
# Dalam triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

Ini mendedahkan `https://<your-machine>.ts.net/webhook/github` ke internet.

**Proksi songsang (nginx, Caddy):**

Majukan `/webhook/github` ke port tempatan gateway anda.

**ngrok (pembangunan/pengujian):**

```bash
ngrok http 8080
```

Gunakan URL yang dijana sebagai sasaran webhook.

### Langkah 4: Konfigurasikan webhook GitHub

Dalam repositori GitHub anda (atau organisasi):

1. Pergi ke **Settings** > **Webhooks** > **Add webhook**
2. Tetapkan **Payload URL** ke titik akhir anda yang didedahkan:
   ```
   https://<your-host>/webhook/github
   ```
3. Tetapkan **Content type** ke `application/json`
4. Tetapkan **Secret** ke nilai yang sama seperti `GITHUB_WEBHOOK_SECRET`
5. Di bawah **Which events would you like to trigger this webhook?**, pilih **Let me select individual events** dan tandakan:
   - **Pull requests** (merangkumi `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (merangkumi `pull_request_review`)
   - **Pull request review comments** (merangkumi `pull_request_review_comment`)
   - **Issue comments** (merangkumi `issue_comment` pada PR dan isu)
6. Klik **Add webhook**

GitHub akan menghantar peristiwa ping untuk mengesahkan sambungan. Semak log Triggerfish untuk mengesahkan penerimaan:

```bash
triggerfish logs --tail
```

## Cara Gelung Maklum Balas Berfungsi

### Dengan webhook (segera)

<img src="/diagrams/github-webhook-review.svg" alt="Gelung semakan webhook GitHub: ejen membuka PR, menunggu, menerima webhook semasa semakan, membaca fail penjejakan, menangani maklum balas, mengkomit dan menolak" style="max-width: 100%;" />

### Dengan pengundian berasaskan trigger (di belakang tembok api)

<img src="/diagrams/github-trigger-review.svg" alt="Semakan berasaskan trigger GitHub: ejen membuka PR, menulis fail penjejakan, menunggu kebangkitan trigger, mengundi semakan, menangani maklum balas" style="max-width: 100%;" />

Kedua-dua laluan menggunakan fail penjejakan yang sama. Ejen memulihkan konteks dengan membaca fail penjejakan PR dari `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## Fail Penjejakan PR

Ejen menulis fail penjejakan untuk setiap PR yang diciptanya:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json
```

Skema:

```json
{
  "branch": "triggerfish/agent-1/fix-auth-timeout",
  "prNumber": 42,
  "prUrl": "https://github.com/owner/repo/pull/42",
  "task": "Fix authentication timeout when token expires during long requests",
  "repository": "owner/repo",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "lastCheckedAt": "2025-01-15T10:30:00Z",
  "lastReviewId": "",
  "status": "open",
  "commits": [
    "feat: add token refresh before expiry",
    "test: add timeout edge case coverage"
  ]
}
```

Selepas digabungkan, fail penjejakan diarkibkan ke `completed/`.

## Dasar Cantum

Secara lalai, ejen **tidak** mencantum PR secara automatik yang diluluskan. Apabila semakan diluluskan, ejen memberitahu pemilik dan menunggu arahan cantum yang eksplisit.

Untuk mengaktifkan cantum automatik, tambah ke `triggerfish.yaml`:

```yaml
github:
  auto_merge: true
```

Apabila diaktifkan, ejen akan menjalankan `gh pr merge --squash --delete-branch` selepas menerima semakan yang meluluskan.

::: warning Cantum automatik dilumpuhkan secara lalai untuk keselamatan. Hanya aktifkannya jika anda mempercayai perubahan ejen dan telah mengkonfigurasi peraturan perlindungan cawangan (penyemak yang diperlukan, pemeriksaan CI) dalam GitHub. :::

## Pilihan: Pelayan MCP GitHub

Untuk akses API GitHub yang lebih kaya selain yang disediakan oleh CLI `gh` dan alat terbina dalam, anda juga boleh mengkonfigurasi pelayan MCP GitHub:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # Token GitHub dibaca dari keychain OS
    classification: CONFIDENTIAL
```

Ini tidak diperlukan untuk kebanyakan aliran kerja -- alat `github_*` terbina dalam (yang disediakan melalui `triggerfish connect github`) dan CLI `gh` merangkumi semua operasi biasa. Pelayan MCP berguna untuk pertanyaan lanjutan yang tidak diliputi oleh alat terbina dalam.

## Pertimbangan Keselamatan

| Kawalan                 | Perincian                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **Pengesahan HMAC**     | Semua webhook GitHub disahkan dengan HMAC-SHA256 sebelum pemprosesan (mod webhook)                    |
| **Pengkelasan**         | Data GitHub diklasifikasikan sebagai `INTERNAL` secara lalai -- kod dan data PR tidak bocor ke saluran awam |
| **Pengasingan sesi**    | Setiap peristiwa webhook atau kebangkitan trigger menjana sesi terpencil yang segar                    |
| **Tanpa Tulis-Bawah**   | Respons ejen ke peristiwa PR yang diklasifikasikan INTERNAL tidak boleh dihantar ke saluran PUBLIC     |
| **Pengendalian kelayakan** | CLI `gh` mengurus token authnya sendiri; tiada token GitHub disimpan dalam triggerfish.yaml         |
| **Penamaan cawangan**   | Awalan `triggerfish/` menjadikan cawangan ejen mudah dikenal pasti dan ditapis                        |

::: tip Jika repositori anda mengandungi kod sensitif (proprietari, kritikal keselamatan), pertimbangkan untuk menetapkan pengkelasan webhook ke `CONFIDENTIAL` berbanding `INTERNAL`. :::

## Penyelesaian Masalah

### Webhook tidak menerima peristiwa

1. Semak bahawa URL webhook boleh dicapai dari internet (gunakan `curl` dari mesin luaran)
2. Dalam GitHub, pergi ke **Settings** > **Webhooks** dan semak tab **Recent Deliveries** untuk ralat
3. Sahkan rahsia sepadan antara GitHub dan `GITHUB_WEBHOOK_SECRET`
4. Semak log Triggerfish: `triggerfish logs --tail`

### Semakan PR tidak dipilih (mod pengundian)

1. Semak bahawa cron job `pr-review-check` dikonfigurasi dalam `triggerfish.yaml`
2. Sahkan daemon berjalan: `triggerfish status`
3. Semak bahawa fail penjejakan wujud dalam `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Uji secara manual: `gh pr view <number> --json reviews`
5. Semak log Triggerfish: `triggerfish logs --tail`

### gh CLI tidak ditetapkan

```bash
gh auth status
# Jika tidak ditetapkan:
gh auth login
```

### Ejen tidak boleh menolak ke jauh

Sahkan jauh git dan kelayakan:

```bash
git remote -v
gh auth status
```

Pastikan akaun GitHub yang ditetapkan mempunyai akses tolak ke repositori.

### Fail penjejakan tidak ditemui semasa semakan

Ejen mencari fail penjejakan dalam `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. Jika fail tiada, PR mungkin telah dicipta di luar Triggerfish, atau ruang kerja telah dibersihkan. Ejen sepatutnya memberitahu pemilik dan melangkau pengendalian automatik.
