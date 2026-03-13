# Akses Jauh

<ComingSoon />

Akses jauh membolehkan anda mencapai contoh Triggerfish anda dari luar rangkaian tempatan anda. Ini diperlukan untuk penghantaran webhook dari perkhidmatan luaran (GitHub, Stripe, dll.) dan untuk mengakses ejen anda dari peranti mudah alih apabila berada di luar rumah.

## Pilihan yang Dirancang

| Kaedah               | Keterangan                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| **Tailscale Serve**  | Dedahkan gateway melalui rangkaian Tailscale anda (peribadi, disulitkan) |
| **Tailscale Funnel** | Dedahkan laluan tertentu (contoh, `/webhook/*`) ke internet awam        |
| **Cloudflare Tunnel** | Halakan melalui rangkaian Cloudflare ke contoh tempatan anda           |
| **Reverse Proxy**    | Persediaan manual dengan nginx, Caddy, atau yang serupa                 |

## Konfigurasi (Dirancang)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Token auth disimpan dalam keychain OS
```

## Keselamatan

- Titik akhir webhook adalah satu-satunya laluan yang didedahkan secara lalai
- Token pengesahan disimpan dalam keychain OS
- Semua trafik disulitkan dalam transit
- WebSocket gateway tidak pernah didedahkan ke internet awam tanpa auth
