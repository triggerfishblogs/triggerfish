# Google Chat

<ComingSoon />

Conecte seu agente do Triggerfish ao Google Chat para que equipes que usam o
Google Workspace possam interagir com ele diretamente pela interface de chat. O
adaptador usara a API do Google Chat com credenciais de conta de servico ou
OAuth.

## Recursos planejados

- Suporte a mensagens diretas e espacos (salas)
- Verificacao de proprietario via diretorio do Google Workspace
- Indicadores de digitacao
- Divisao de mensagens para respostas longas
- Aplicacao de classificacao consistente com outros canais

## Configuracao (planejada)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Consulte [Google Workspace](/pt-BR/integrations/google-workspace) para a
integracao existente do Google que cobre Gmail, Calendar, Tasks, Drive e Sheets.
