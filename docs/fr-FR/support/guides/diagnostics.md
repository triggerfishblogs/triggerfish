# Exécution des diagnostics

Triggerfish dispose de deux outils de diagnostic intégrés : `patrol` (vérification de santé externe) et l'outil `healthcheck` (sonde interne du système).

## Patrol

Patrol est une commande CLI qui vérifie si les systèmes principaux sont opérationnels :

```bash
triggerfish patrol
```

### Ce qu'il vérifie

| Vérification         | Statut                | Signification                                         |
|---------------------|-----------------------|-------------------------------------------------------|
| Gateway en cours     | CRITICAL si arrêté    | Le plan de contrôle WebSocket ne répond pas            |
| LLM connecté         | CRITICAL si arrêté    | Impossible de joindre le fournisseur de LLM principal  |
| Canaux actifs         | WARNING si 0          | Aucun adaptateur de canal n'est connecté               |
| Règles de politique   | WARNING si 0          | Aucune règle de politique n'est chargée                |
| Skills installés      | WARNING si 0          | Aucun skill n'est découvert                            |

### Statut global

- **HEALTHY** - toutes les vérifications réussissent
- **WARNING** - certaines vérifications non critiques sont signalées (par ex. aucun skill installé)
- **CRITICAL** - au moins une vérification critique a échoué (gateway ou LLM inaccessible)

### Quand utiliser patrol

- Après l'installation, pour vérifier que tout fonctionne
- Après des modifications de configuration, pour confirmer que le daemon a redémarré proprement
- Quand le bot cesse de répondre, pour identifier quel composant a échoué
- Avant de signaler un bug, pour inclure la sortie de patrol

### Exemple de sortie

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Outil Healthcheck

L'outil healthcheck est un outil interne de l'agent qui sonde les composants du système depuis l'intérieur du gateway en cours d'exécution. Il est disponible pour l'agent pendant les conversations.

### Ce qu'il vérifie

**Fournisseurs :**
- Le fournisseur par défaut existe et est accessible
- Retourne le nom du fournisseur

**Stockage :**
- Test aller-retour : écrit une clé, la relit, la supprime
- Vérifie que la couche de stockage est fonctionnelle

**Skills :**
- Compte les skills découverts par source (intégrés, installés, espace de travail)

**Configuration :**
- Validation basique de la configuration

### Niveaux de statut

Chaque composant rapporte l'un des statuts :
- `healthy` - entièrement opérationnel
- `degraded` - partiellement fonctionnel (certaines fonctionnalités peuvent ne pas marcher)
- `error` - composant en panne

### Exigence de classification

L'outil healthcheck nécessite au minimum la classification INTERNAL car il révèle des détails internes du système (noms des fournisseurs, nombre de skills, statut du stockage). Une session PUBLIC ne peut pas l'utiliser.

### Utilisation du healthcheck

Demandez à votre agent :

> Lance un healthcheck

Ou en utilisant l'outil directement :

```
tool: healthcheck
```

La réponse est un rapport structuré :

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## Combiner les diagnostics

Pour une session de diagnostic approfondie :

1. **Lancez patrol** depuis le CLI :
   ```bash
   triggerfish patrol
   ```

2. **Vérifiez les logs** pour les erreurs récentes :
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Demandez à l'agent** de lancer un healthcheck (si l'agent répond) :
   > Lance un healthcheck système et dis-moi s'il y a des problèmes

4. **Collectez une archive de logs** si vous devez signaler un problème :
   ```bash
   triggerfish logs bundle
   ```

---

## Diagnostics de démarrage

Si le daemon ne démarre pas du tout, vérifiez dans cet ordre :

1. **La configuration existe et est valide :**
   ```bash
   triggerfish config validate
   ```

2. **Les secrets peuvent être résolus :**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Pas de conflit de ports :**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **Pas d'autre instance en cours :**
   ```bash
   triggerfish status
   ```

5. **Vérifiez le journal système (Linux) :**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Vérifiez launchd (macOS) :**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Vérifiez le journal d'événements Windows (Windows) :**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
