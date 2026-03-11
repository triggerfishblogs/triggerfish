# Google Chat

<ComingSoon />

Connectez votre agent Triggerfish a Google Chat pour que les equipes utilisant
Google Workspace puissent interagir avec lui directement depuis leur interface de
chat. L'adaptateur utilisera l'API Google Chat avec un compte de service ou des
identifiants OAuth.

## Fonctionnalites prevues

- Support des messages directs et des espaces (salons)
- Verification du proprietaire via l'annuaire Google Workspace
- Indicateurs de saisie
- Decoupage des messages pour les longues reponses
- Application de la classification coherente avec les autres canaux

## Configuration (prevue)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Consultez [Google Workspace](/fr-FR/integrations/google-workspace) pour
l'integration Google existante qui couvre Gmail, Calendar, Tasks, Drive et Sheets.
