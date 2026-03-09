# 원격 접근

<ComingSoon />

원격 접근을 사용하면 로컬 네트워크 외부에서 Triggerfish 인스턴스에 접근할 수 있습니다. 이는 외부 서비스(GitHub, Stripe 등)로부터의 webhook 전달과 외출 시 모바일 기기에서 에이전트에 접근하는 데 필요합니다.

## 계획된 옵션

| 방법                | 설명                                                                        |
| ------------------- | --------------------------------------------------------------------------- |
| **Tailscale Serve** | Tailscale 네트워크를 통해 gateway 노출 (비공개, 암호화)                     |
| **Tailscale Funnel** | 특정 경로(예: `/webhook/*`)를 공용 인터넷에 노출                           |
| **Cloudflare Tunnel** | Cloudflare 네트워크를 통해 로컬 인스턴스로 라우팅                         |
| **리버스 프록시**    | nginx, Caddy 또는 유사 도구를 사용한 수동 설정                             |

## 구성 (계획됨)

```yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth token stored in OS keychain
```

## 보안

- Webhook 엔드포인트만 기본적으로 노출됩니다
- 인증 토큰은 OS 키체인에 저장됩니다
- 모든 트래픽은 전송 중 암호화됩니다
- Gateway WebSocket은 인증 없이 공용 인터넷에 노출되지 않습니다
