---
title: 가격
---

<style>
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin: 32px 0;
}

.pricing-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 32px 24px;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
}

.pricing-card.featured {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
}

.pricing-card h3 {
  margin: 0 0 8px;
  font-size: 22px;
}

.pricing-card .price {
  font-size: 36px;
  font-weight: 700;
  margin: 8px 0 4px;
}

.pricing-card .price span {
  font-size: 16px;
  font-weight: 400;
  color: var(--vp-c-text-2);
}

.pricing-card .subtitle {
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin-bottom: 24px;
}

.pricing-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  flex: 1;
}

.pricing-card ul li {
  padding: 6px 0;
  font-size: 14px;
  line-height: 1.5;
}

.pricing-card ul li::before {
  content: "\2713\00a0";
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.pricing-card ul li.excluded::before {
  content: "\2014\00a0";
  color: var(--vp-c-text-3);
}

.pricing-card .cta {
  display: block;
  text-align: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  margin-top: auto;
}

.pricing-card .cta.primary {
  background: #16a34a;
  color: var(--vp-c-white);
}

.pricing-card .cta.primary:hover {
  background: #15803d;
}

.pricing-card .cta.secondary {
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.pricing-card .cta.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  margin: 32px 0;
  font-size: 14px;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.comparison-table th {
  font-weight: 600;
  background: var(--vp-c-bg-soft);
}

.comparison-table td:not(:first-child) {
  text-align: center;
}

.comparison-table th:not(:first-child) {
  text-align: center;
}

.comparison-table .section-header {
  font-weight: 700;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.faq-section h3 {
  margin-top: 32px;
}
</style>

# 가격

Triggerfish는 오픈 소스이며 앞으로도 그럴 것입니다. 자체 API 키를 사용하여
로컬에서 모든 것을 무료로 실행할 수 있습니다. Triggerfish Gateway는 관리형 LLM
백엔드, 웹 검색, 터널, 업데이트를 추가하여 — 이 모든 것을 직접 관리할 필요가
없습니다.

::: info 얼리 액세스
Triggerfish Gateway는 현재 얼리 액세스 중입니다. 제품을 개선하면서 가격과
기능이 변경될 수 있습니다. 얼리 액세스 구독자는 해당 요금이 유지됩니다.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>오픈 소스</h3>
  <div class="price">무료</div>
  <div class="subtitle">영원히. Apache 2.0.</div>
  <ul>
    <li>전체 에이전트 플랫폼</li>
    <li>모든 채널 (Telegram, Slack, Discord, WhatsApp 등)</li>
    <li>모든 통합 (GitHub, Google, Obsidian 등)</li>
    <li>분류 등급 &amp; 정책 시행</li>
    <li>Skill, plugin, cron, webhook</li>
    <li>브라우저 자동화</li>
    <li>자체 LLM 키 사용 (Anthropic, OpenAI, Google, Ollama 등)</li>
    <li>자체 검색 키 사용 (Brave, SearXNG)</li>
    <li>자동 업데이트</li>
  </ul>
  <a href="/ko-KR/guide/installation" class="cta secondary">지금 설치</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/월</span></div>
  <div class="subtitle">필요한 모든 것. API 키 불필요.</div>
  <ul>
    <li>오픈 소스의 모든 것</li>
    <li>AI 추론 포함 — 관리형 LLM 백엔드, API 키 불필요</li>
    <li>웹 검색 포함</li>
    <li>webhook용 클라우드 터널</li>
    <li>예약 작업</li>
    <li>2분 이내 설정</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=ko" class="cta primary">구독하기</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/월</span></div>
  <div class="subtitle">Pro의 5배 사용량. 대용량 워크로드용.</div>
  <ul>
    <li>Pro의 모든 것</li>
    <li>AI 추론 포함 — 더 높은 사용량 한도</li>
    <li>에이전트 팀 — 다중 에이전트 협업</li>
    <li>더 많은 동시 세션</li>
    <li>복수 클라우드 터널</li>
    <li>무제한 예약 작업</li>
    <li>더 긴 AI 응답</li>
    <li>우선 지원</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=ko" class="cta primary">구독하기</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">맞춤형</div>
  <div class="subtitle">SSO 및 규정 준수를 갖춘 팀 배포.</div>
  <ul>
    <li>Power의 모든 것</li>
    <li>다중 사용자 라이선스</li>
    <li>SSO / SAML 통합</li>
    <li>맞춤형 사용량 한도</li>
    <li>맞춤형 모델 라우팅</li>
    <li>전용 지원</li>
    <li>SLA 보장</li>
    <li>온프레미스 배포 옵션</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">영업팀 문의</a>
</div>

</div>

## 기능 비교

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>오픈 소스</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">플랫폼</td></tr>
<tr><td>모든 채널</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>모든 통합</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>분류 등급 &amp; 정책 엔진</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skill, plugin, webhook</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>브라우저 자동화</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>실행 환경</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>에이전트 팀</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; 검색</td></tr>
<tr><td>LLM 제공업체</td><td>자체 키 사용</td><td>관리형</td><td>관리형</td><td>관리형</td></tr>
<tr><td>웹 검색</td><td>자체 키 사용</td><td>포함</td><td>포함</td><td>포함</td></tr>
<tr><td>AI 사용량</td><td>자체 API 한도</td><td>표준</td><td>확장</td><td>맞춤형</td></tr>

<tr class="section-header"><td colspan="5">인프라</td></tr>
<tr><td>클라우드 터널</td><td>&mdash;</td><td>&#10003;</td><td>복수</td><td>맞춤형</td></tr>
<tr><td>예약 작업</td><td>무제한</td><td>&#10003;</td><td>무제한</td><td>무제한</td></tr>
<tr><td>자동 업데이트</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">지원 &amp; 관리</td></tr>
<tr><td>커뮤니티 지원</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>우선 지원</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>다중 사용자 라이선스</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Triggerfish Gateway 작동 방식

Triggerfish Gateway는 별도의 제품이 아닙니다 — 이미 로컬에서 실행하고 있는 동일한
오픈 소스 에이전트의 관리형 백엔드입니다.

1. **위에서 구독**하면 — 결제 후 이메일로 라이선스 키를 받게 됩니다
2. **`triggerfish dive --force`를 실행**하고 제공업체로 Triggerfish Gateway를 선택합니다
3. **라이선스 키를 입력**하거나 매직 링크 흐름을 사용하여 자동으로 활성화합니다

다른 기기에서 이미 구독하셨습니까? `triggerfish dive --force`를 실행하고
Triggerfish Gateway를 선택한 후 "이미 계정이 있습니다"를 선택하여 이메일로
로그인하십시오.

라이선스 키는 OS keychain에 저장됩니다. 고객 포털을 통해 언제든지 구독을 관리할
수 있습니다.

## FAQ {.faq-section}

### 오픈 소스와 클라우드 간에 전환할 수 있습니까?

네. 에이전트 구성은 단일 YAML 파일입니다. `triggerfish dive --force`를 실행하여
언제든지 재구성할 수 있습니다. 자체 API 키에서 Triggerfish Gateway로 또는
그 반대로 전환해도 — SPINE, skill, 채널, 데이터는 정확히 동일하게 유지됩니다.

### Triggerfish Gateway는 어떤 LLM을 사용합니까?

Triggerfish Gateway는 최적화된 모델 인프라를 통해 라우팅합니다. 모델 선택은
자동으로 관리됩니다 — 최적의 비용/품질 균형을 선택하고 캐싱, failover, 최적화를
자동으로 처리합니다.

### 클라우드와 함께 자체 API 키를 사용할 수 있습니까?

네. Triggerfish는 failover 체인을 지원합니다. 클라우드를 기본 제공업체로 구성하고
자체 Anthropic 또는 OpenAI 키로 폴백하거나 그 반대로 할 수 있습니다.

### 구독이 만료되면 어떻게 됩니까?

에이전트는 계속 실행됩니다. 로컬 전용 모드로 폴백합니다 — 자체 API 키가 구성되어
있으면 계속 작동합니다. 클라우드 기능(관리형 LLM, 검색, 터널)은 재구독할 때까지
중지됩니다. 데이터는 손실되지 않습니다.

### 제 데이터가 서버를 통해 전송됩니까?

LLM 요청은 클라우드 Gateway를 통해 모델 제공업체로 프록시됩니다. 대화 내용은
저장하지 않습니다. 사용량 메타데이터는 청구를 위해 기록됩니다. 에이전트, 데이터,
SPINE, skill은 전적으로 사용자의 기기에 남아 있습니다.

### 구독을 어떻게 관리합니까?

고객 포털을 방문하여 결제 방법을 업데이트하거나, 요금제를 변경하거나, 취소할 수
있습니다.
