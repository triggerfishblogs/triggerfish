---
title: Policy di Divulgazione Responsabile
description: Come segnalare vulnerabilità di sicurezza in Triggerfish.
---

# Policy di Divulgazione Responsabile

## Segnalare una Vulnerabilità

**Non aprire una issue pubblica su GitHub per le vulnerabilità di sicurezza.**

Segnalare via email:

```
security@trigger.fish
```

Includere:

- Descrizione e impatto potenziale
- Passaggi per la riproduzione o proof of concept
- Versioni o componenti interessati
- Rimedio suggerito, se presente

## Tempi di Risposta

| Tempistica | Azione                                                |
| ---------- | ----------------------------------------------------- |
| 24 ore     | Conferma di ricezione                                 |
| 72 ore     | Valutazione iniziale e classificazione della gravità  |
| 14 giorni  | Fix sviluppato e testato (gravità critica/alta)       |
| 90 giorni  | Finestra di divulgazione coordinata                   |

Chiediamo di non divulgare pubblicamente prima della finestra di 90 giorni o
prima del rilascio di un fix, a seconda di quale evento si verifichi per primo.

## Ambito

### In ambito

- Applicazione core di Triggerfish
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- Bypass dell'applicazione delle policy di sicurezza (classificazione,
  tracciamento del taint, no write-down)
- Escape dal sandbox dei plugin
- Bypass dell'autenticazione o dell'autorizzazione
- Violazioni dei confini di sicurezza del MCP Gateway
- Fuga di secret (credenziali che appaiono nei log, nel contesto o nello storage)
- Attacchi di prompt injection che influenzano con successo le decisioni di policy
  deterministiche
- Immagini Docker ufficiali (quando disponibili) e script di installazione

### Fuori ambito

- Comportamento del LLM che non aggira il livello di policy deterministico (il
  modello che dice qualcosa di errato non è una vulnerabilità se il livello delle
  policy ha correttamente bloccato l'azione)
- Skill o plugin di terze parti non mantenuti da Triggerfish
- Attacchi di ingegneria sociale contro i dipendenti di Triggerfish
- Attacchi denial-of-service
- Report di scanner automatizzati senza impatto dimostrato

## Porto Sicuro

La ricerca sulla sicurezza condotta in conformità con questa policy è
autorizzata. Non intraprenderemo azioni legali contro i ricercatori che
segnalano vulnerabilità in buona fede. Chiediamo di fare uno sforzo in buona
fede per evitare violazioni della privacy, distruzione di dati e interruzione
del servizio.

## Riconoscimento

Accreditiamo i ricercatori che segnalano vulnerabilità valide nelle nostre note
di rilascio e negli avvisi di sicurezza, a meno che non si preferisca rimanere
anonimi. Al momento non offriamo un programma di bug bounty a pagamento, ma
potremmo introdurne uno in futuro.

## Chiave PGP

Se è necessario crittografare la segnalazione, la nostra chiave PGP per
`security@trigger.fish` è pubblicata su
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
e sui principali keyserver.
