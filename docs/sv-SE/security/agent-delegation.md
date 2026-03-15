# Agentdelegering

I takt med att AI-agenter allt oftare interagerar med varandra — en agent anropar en annan för att slutföra deluppgifter — uppstår en ny klass av säkerhetsrisker. En agentkedja kan användas för att tvätta data via en mindre begränsad agent och kringgå klassificeringskontroller. Triggerfish förhindrar detta med kryptografisk agentidentitet, klassificeringstak och obligatoriskt taint-arv.

## Agentcertifikat

Varje agent i Triggerfish har ett certifikat som definierar dess identitet, funktioner och delegeringsbehörigheter. Det här certifikatet signeras av agentens ägare och kan inte ändras av agenten själv eller av andra agenter.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Säljassistent",
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

Nyckelfält i certifikatet:

| Fält                   | Syfte                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`    | **Klassificeringstaken** — den högsta taint-nivå vid vilken agenten kan verka. En agent med ett INTERNAL-tak kan inte anropas av en session taintad vid CONFIDENTIAL.                                   |
| `can_invoke_agents`     | Huruvida den här agenten är tillåten att anropa andra agenter.                                                                                                                                          |
| `can_be_invoked_by`     | Uttrycklig tillåtelselista för agenter som kan anropa den här.                                                                                                                                          |
| `max_delegation_depth`  | Maximalt djup för agentanropskedjan. Förhindrar obegränsad rekursion.                                                                                                                                   |
| `signature`             | Ed25519-signatur från ägaren. Förhindrar certifikatsmanipulation.                                                                                                                                       |

## Anropsflöde

När en agent anropar en annan verifierar policylagret delegeringen innan den kallade agenten körs. Kontrollen är deterministisk och körs i kod — den anropande agenten kan inte påverka beslutet.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Agentdelegeringssekvens: Agent A anropar Agent B, policylagret verifierar taint kontra tak och blockerar när taint överstiger tak" style="max-width: 100%;" />

I det här exemplet har Agent A en session-taint på CONFIDENTIAL (den kom åt Salesforce-data tidigare). Agent B har ett klassificeringstak på INTERNAL. Eftersom CONFIDENTIAL är högre än INTERNAL blockeras anropet. Agent A:s taintade data kan inte flöda till en agent med ett lägre klassificeringstak.

::: warning SÄKERHET Policylagret kontrollerar anroparens **aktuella session-taint**, inte dess tak. Även om Agent A har ett CONFIDENTIAL-tak är det som spelar roll den faktiska taint-nivån för sessionen vid tidpunkten för anropet. Om Agent A inte har kommit åt klassificerade data (taint är PUBLIC) kan den anropa Agent B (INTERNAL-tak) utan problem. :::

## Delegeringskedjespårning

När agenter anropar andra agenter spåras hela kedjan med tidsstämplar och taint-nivåer vid varje steg:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Säljassistent",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Sammanfatta Q4-pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Dataanalytiker",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Beräkna vinstfrekvenser"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

Den här kedjan registreras i revisionsloggen och kan frågas för efterlevnad och kriminalteknisk analys. Du kan spåra exakt vilka agenter som var inblandade, vad deras taint-nivåer var och vilka uppgifter de utförde.

## Säkerhetsinvarianter

Fyra invarianter styr agentdelegering. Alla tillämpas av kod i policylagret och kan inte åsidosättas av någon agent i kedjan.

| Invariant                          | Tillämpning                                                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Taint ökar bara**                | Varje kallad agent ärver `max(eget taint, anroparens taint)`. En kallad agent kan aldrig ha lägre taint än sin anropare.                       |
| **Tak respekteras**                | En agent kan inte anropas om anroparens taint överstiger den kallade agentens `max_classification`-tak.                                        |
| **Djupgränser tillämpas**          | Kedjan avslutas vid `max_delegation_depth`. Om gränsen är 3 blockeras ett fjärde-nivå-anrop.                                                  |
| **Cirkulärt anrop blockerat**      | En agent kan inte förekomma två gånger i samma kedja. Om Agent A anropar Agent B som försöker anropa Agent A blockeras det andra anropet.      |

### Taint-arv i detalj

När Agent A (taint: CONFIDENTIAL) framgångsrikt anropar Agent B (tak: CONFIDENTIAL) börjar Agent B med taint CONFIDENTIAL — ärvt från Agent A. Om Agent B sedan kommer åt RESTRICTED-data eskalerar dess taint till RESTRICTED. Denna förhöjda taint förs tillbaka till Agent A när anropet slutförs.

<img src="/diagrams/taint-inheritance.svg" alt="Taint-arv: Agent A (INTERNAL) anropar Agent B, B ärver taint, kommer åt Salesforce (CONFIDENTIAL), returnerar förhöjt taint till A" style="max-width: 100%;" />

Taint flödar i båda riktningarna — från anropare till kallad agent vid anropstid, och från kallad agent tillbaka till anropare vid slutförande. Det kan bara eskalera.

## Förhindra datatvätt

En viktig attackvektor i multi-agent-system är **datatvätt** — att använda en agentkedja för att flytta klassificerade data till en lägre-klassificerad destination genom att dirigera dem via mellanliggande agenter.

### Attacken

```
Angriparmål: Exfiltrera CONFIDENTIAL-data via en PUBLIC-kanal

Försökt flöde:
1. Agent A kommer åt Salesforce (taint --> CONFIDENTIAL)
2. Agent A anropar Agent B (som har en PUBLIC-kanal)
3. Agent B skickar data till PUBLIC-kanalen
```

### Varför det misslyckas

Triggerfish blockerar den här attacken vid flera punkter:

**Blockpunkt 1: Anropskontroll.** Om Agent B har ett tak under CONFIDENTIAL blockeras anropet direkt. Agent A:s taint (CONFIDENTIAL) överstiger Agent B:s tak.

**Blockpunkt 2: Taint-arv.** Även om Agent B har ett CONFIDENTIAL-tak och anropet lyckas ärver Agent B Agent A:s CONFIDENTIAL taint. När Agent B försöker mata ut till en PUBLIC-kanal blockerar `PRE_OUTPUT`-hooken nedskrivningen.

**Blockpunkt 3: Ingen taint-återställning i delegering.** Agenter i en delegeringskedja kan inte återställa sin taint. Taint-återställning är bara tillgänglig för slutanvändaren, och den rensar hela konversationshistoriken. Det finns ingen mekanism för en agent att "tvätta" sin taint-nivå under en kedja.

::: danger Data kan inte fly sin klassificering via agentdelegering. Kombinationen av takkontroller, obligatoriskt taint-arv och inget-taint-återställning-i-kedjor gör datatvätt via agentkedjor omöjlig inom Triggerfish säkerhetsmodell. :::

## Exempelscenarier

### Scenario 1: Framgångsrik delegering

```
Agent A (tak: CONFIDENTIAL, aktuell taint: INTERNAL)
  anropar Agent B (tak: CONFIDENTIAL)

Policykontroll:
  - A kan anropa B? JA (B är i A:s delegeringslista)
  - A:s taint (INTERNAL) <= B:s tak (CONFIDENTIAL)? JA
  - Djupgräns OK? JA (djup 1 av max 3)
  - Cirkulärt? NEJ

Resultat: TILLÅTEN
Agent B börjar med taint: INTERNAL (ärvt från A)
```

### Scenario 2: Blockerad av tak

```
Agent A (tak: RESTRICTED, aktuell taint: CONFIDENTIAL)
  anropar Agent B (tak: INTERNAL)

Policykontroll:
  - A:s taint (CONFIDENTIAL) <= B:s tak (INTERNAL)? NEJ

Resultat: BLOCKERAD
Orsak: Agent B:s tak (INTERNAL) under session-taint (CONFIDENTIAL)
```

### Scenario 3: Blockerad av djupgräns

```
Agent A anropar Agent B (djup 1)
  Agent B anropar Agent C (djup 2)
    Agent C anropar Agent D (djup 3)
      Agent D anropar Agent E (djup 4)

Policykontroll för Agent E:
  - Djup 4 > max_delegation_depth (3)

Resultat: BLOCKERAD
Orsak: Maximalt delegeringsdjup överskridet
```

### Scenario 4: Blockerad av cirkulär referens

```
Agent A anropar Agent B (djup 1)
  Agent B anropar Agent C (djup 2)
    Agent C anropar Agent A (djup 3)

Policykontroll för det andra Agent A-anropet:
  - Agent A förekommer redan i kedjan

Resultat: BLOCKERAD
Orsak: Cirkulärt agentanrop upptäckt
```

## Relaterade sidor

- [Säkerhetscentrerat design](./) — översikt över säkerhetsarkitekturen
- [Nedskrivningsregeln](./no-write-down) — klassificeringsflödesregeln som delegering tillämpar
- [Identitet och autentisering](./identity) — hur användare- och kanalidentitet upprättas
- [Revision och efterlevnad](./audit-logging) — hur delegeringskedjor registreras i revisionsloggen
