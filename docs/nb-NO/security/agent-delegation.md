# Agentdelegasjon

Etter hvert som KI-agenter i økende grad samhandler med hverandre — én agent kaller en annen for å fullføre deloppgaver — oppstår en ny klasse sikkerhetsrisikoer. En agentkjede kan brukes til å «vaske» data gjennom en agent med lavere klassifisering, og dermed omgå klassifiseringskontroller. Triggerfish forhindrer dette med kryptografisk agentidentitet, klassifiseringstak og obligatorisk taint-arv.

## Agentsertifikater

Hver agent i Triggerfish har et sertifikat som definerer dens identitet, evner og delegeringstillatelser. Dette sertifikatet er signert av agentens eier og kan ikke endres av agenten selv eller av andre agenter.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Nøkkelfelter i sertifikatet:

| Felt                   | Formål                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | **Klassifiseringstake** — det høyeste taint-nivået agenten kan operere på. En agent med INTERNAL-tak kan ikke kalles av en sesjon taintet på CONFIDENTIAL.                                           |
| `can_invoke_agents`    | Om denne agenten har tillatelse til å kalle andre agenter.                                                                                                                                           |
| `can_be_invoked_by`    | Eksplisitt tillatelsesliste over agenter som kan kalle denne.                                                                                                                                        |
| `max_delegation_depth` | Maksimal dybde i agentinvokasjonskjeden. Forhindrer ubegrenset rekursjon.                                                                                                                            |
| `signature`            | Ed25519-signatur fra eieren. Forhindrer sertifikatmanipulering.                                                                                                                                      |

## Invokasjonsprosess

Når én agent kaller en annen, verifiserer policy-laget delegeringen før kallee-agenten utfører. Sjekken er deterministisk og kjøres i kode — den kallende agenten kan ikke påvirke beslutningen.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Agentdelegeringssekvens: Agent A kaller Agent B, policy-lag verifiserer taint mot tak og blokkerer når taint overstiger tak" style="max-width: 100%;" />

I dette eksemplet har Agent A en session taint på CONFIDENTIAL (den aksesserte Salesforce-data tidligere). Agent B har et klassifiseringstak på INTERNAL. Fordi CONFIDENTIAL er høyere enn INTERNAL, blokkeres invokasjonsen. Agent As taintede data kan ikke flyte til en agent med et lavere klassifiseringstak.

::: warning SIKKERHET Policy-laget sjekker kallerens **nåværende session taint**, ikke dens tak. Selv om Agent A har et CONFIDENTIAL-tak, er det det faktiske taint-nivået til sesjonen på invokasjonspunktet som er avgjørende. Hvis Agent A ikke har aksessert noen klassifiserte data (taint er PUBLIC), kan den kalle Agent B (INTERNAL-tak) uten problemer. :::

## Delegeringskjedesporing

Når agenter kaller andre agenter, spores hele kjeden med tidsstempel og taint-nivåer ved hvert trinn:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Summarize Q4 pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calculate win rates"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

Denne kjeden registreres i revisjonsloggen og kan spørres for samsvars- og kriminalteknisk analyse. Du kan spore nøyaktig hvilke agenter som var involvert, hva deres taint-nivåer var og hvilke oppgaver de utførte.

## Sikkerhetsinvarianter

Fire invarianter styrer agentdelegasjon. Alle håndheves av kode i policy-laget og kan ikke overstyres av noen agent i kjeden.

| Invariant                          | Håndhevelse                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Taint øker bare**                | Hver kallee arver `max(eget taint, kaller-taint)`. En kallee kan aldri ha lavere taint enn sin kaller.                                          |
| **Tak respekteres**                | En agent kan ikke kalles hvis kallerens taint overstiger kallee-ens `max_classification`-tak.                                                   |
| **Dybdegrenser håndheves**         | Kjeden avsluttes ved `max_delegation_depth`. Hvis grensen er 3, blokkeres en fjerde-nivå-invokasjon.                                            |
| **Sirkulær invokasjon blokkert**   | En agent kan ikke vises to ganger i samme kjede. Hvis Agent A kaller Agent B som prøver å kalle Agent A, blokkeres den andre invokasjonsen.     |

### Taint-arv i detalj

Når Agent A (taint: CONFIDENTIAL) vellykket kaller Agent B (tak: CONFIDENTIAL), starter Agent B med taint CONFIDENTIAL — arvet fra Agent A. Hvis Agent B deretter aksesserer RESTRICTED-data, eskalerer dens taint til RESTRICTED. Denne forhøyede taints bæres tilbake til Agent A når invokasjonsen fullføres.

<img src="/diagrams/taint-inheritance.svg" alt="Taint-arv: Agent A (INTERNAL) kaller Agent B, B arver taint, aksesserer Salesforce (CONFIDENTIAL), returnerer forhøyet taint til A" style="max-width: 100%;" />

Taint flyter i begge retninger — fra kaller til kallee ved invokasjonspunktet, og fra kallee tilbake til kaller ved fullføring. Det kan bare eskalere.

## Forhindring av datavask

Et sentralt angrepsvektor i fleragt-systemer er **datavask** — bruk av en agentkjede for å flytte klassifiserte data til en destinasjon med lavere klassifisering ved å rute dem gjennom mellomliggende agenter.

### Angrepet

```
Angriperensmål: Eksfiltrere CONFIDENTIAL-data via en PUBLIC-kanal

Forsøkt flyt:
1. Agent A aksesserer Salesforce (taint --> CONFIDENTIAL)
2. Agent A kaller Agent B (som har en PUBLIC-kanal)
3. Agent B sender data til PUBLIC-kanalen
```

### Hvorfor det mislykkes

Triggerfish blokkerer dette angrepet på flere punkter:

**Blokkeringspunkt 1: Invokasjonsjekk.** Hvis Agent B har et tak under CONFIDENTIAL, blokkeres invokasjonsen direkte. Agent As taint (CONFIDENTIAL) overstiger Agent Bs tak.

**Blokkeringspunkt 2: Taint-arv.** Selv om Agent B har et CONFIDENTIAL-tak og invokasjonsen lykkes, arver Agent B Agent As CONFIDENTIAL-taint. Når Agent B prøver å sende til en PUBLIC-kanal, blokkerer `PRE_OUTPUT`-hooken write-down.

**Blokkeringspunkt 3: Ingen taint-tilbakestilling i delegasjon.** Agenter i en delegeringskjede kan ikke tilbakestille sin taint. Taint-tilbakestilling er bare tilgjengelig for sluttbrukeren, og det tømmer hele samtalehistorikken. Det finnes ingen mekanisme for at en agent kan «vaske» sitt taint-nivå under en kjede.

::: danger Data kan ikke slippe unna sin klassifisering gjennom agentdelegasjon. Kombinasjonen av takkontroller, obligatorisk taint-arv og ingen-taint-tilbakestilling-i-kjeder gjør datavask gjennom agentkjeder umulig innen Triggerfish sin sikkerhetsmodell. :::

## Eksempelscenarioer

### Scenario 1: Vellykket delegasjon

```
Agent A (tak: CONFIDENTIAL, nåværende taint: INTERNAL)
  kaller Agent B (tak: CONFIDENTIAL)

Policy-sjekk:
  - A kan kalle B? JA (B er i As delegeringsliste)
  - As taint (INTERNAL) <= Bs tak (CONFIDENTIAL)? JA
  - Dybdegrense OK? JA (dybde 1 av maks 3)
  - Sirkulær? NEI

Resultat: TILLATT
Agent B starter med taint: INTERNAL (arvet fra A)
```

### Scenario 2: Blokkert av tak

```
Agent A (tak: RESTRICTED, nåværende taint: CONFIDENTIAL)
  kaller Agent B (tak: INTERNAL)

Policy-sjekk:
  - As taint (CONFIDENTIAL) <= Bs tak (INTERNAL)? NEI

Resultat: BLOKKERT
Årsak: Agent B-tak (INTERNAL) under session taint (CONFIDENTIAL)
```

### Scenario 3: Blokkert av dybdegrense

```
Agent A kaller Agent B (dybde 1)
  Agent B kaller Agent C (dybde 2)
    Agent C kaller Agent D (dybde 3)
      Agent D kaller Agent E (dybde 4)

Policy-sjekk for Agent E:
  - Dybde 4 > max_delegation_depth (3)

Resultat: BLOKKERT
Årsak: Maksimal delegeringsdybde overskredet
```

### Scenario 4: Blokkert av sirkulær referanse

```
Agent A kaller Agent B (dybde 1)
  Agent B kaller Agent C (dybde 2)
    Agent C kaller Agent A (dybde 3)

Policy-sjekk for den andre Agent A-invokasjonsen:
  - Agent A vises allerede i kjeden

Resultat: BLOKKERT
Årsak: Sirkulær agentinvokasjon oppdaget
```

## Relaterte sider

- [Sikkerhetsfokusert design](./) — oversikt over sikkerhetsarkitekturen
- [No-Write-Down-regelen](./no-write-down) — klassifiseringsflytregelen som delegasjon håndhever
- [Identitet og autentisering](./identity) — hvordan bruker- og kanalidentitet etableres
- [Revisjon og samsvar](./audit-logging) — hvordan delegeringskjeder registreres i revisjonsloggen
