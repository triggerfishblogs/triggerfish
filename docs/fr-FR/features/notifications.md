# Notifications

Le NotificationService est l'abstraction de premiere classe de Triggerfish pour livrer
des notifications au proprietaire de l'agent a travers tous les canaux connectes.

## Pourquoi un service de notifications ?

Sans service dedie, la logique de notification tend a se disperser dans le
code -- chaque fonctionnalite implementant son propre schema « notifier le proprietaire ». Cela
conduit a un comportement incoherent, des notifications manquees et des doublons.

Triggerfish centralise toute la livraison de notifications via un service unique qui
gere la priorite, la mise en file d'attente et la deduplication.

## Fonctionnement

<img src="/diagrams/notification-routing.svg" alt="Routage des notifications : les sources passent par le NotificationService avec routage par priorite, mise en file d'attente et deduplication vers les canaux" style="max-width: 100%;" />

Lorsqu'un composant doit notifier le proprietaire -- une tache cron terminee, un trigger
detectant quelque chose d'important, un webhook declenche -- il appelle le
NotificationService. Le service determine comment et ou livrer la
notification.

## Interface

```typescript
interface NotificationService {
  /** Deliver or queue a notification for a user. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Get pending (undelivered) notifications for a user. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Acknowledge a notification as delivered. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Niveaux de priorite

Chaque notification porte une priorite qui affecte le comportement de livraison :

| Priorite   | Comportement                                                                         |
| ---------- | ------------------------------------------------------------------------------------ |
| `critical` | Livree immediatement sur tous les canaux connectes. Ignore les heures calmes.        |
| `normal`   | Livree sur le canal prefere. Mise en file d'attente si l'utilisateur est hors ligne. |
| `low`      | Mise en file d'attente et livree par lots. Peut etre resumee.                        |

## Options de livraison

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Mise en file d'attente et livraison hors ligne

Lorsque l'utilisateur cible est hors ligne ou qu'aucun canal n'est connecte, les notifications sont
mises en file d'attente. Elles sont livrees lorsque :

- L'utilisateur demarre une nouvelle session.
- Un canal se reconnecte.
- L'utilisateur demande explicitement les notifications en attente.

Les notifications en attente peuvent etre recuperees avec `getPending()` et acquittees avec
`acknowledge()`.

## Deduplication

Le NotificationService empeche les notifications en double d'atteindre l'utilisateur.
Si le meme contenu de notification est livre plusieurs fois dans une fenetre,
seule la premiere livraison est effectuee.

## Configuration

Configurez le comportement des notifications dans `triggerfish.yaml` :

```yaml
notifications:
  preferred_channel: telegram # Canal de livraison par defaut
  quiet_hours: "22:00-07:00" # Supprimer les notifications normales/basses pendant ces heures
  batch_interval: 15m # Regrouper les notifications de faible priorite
```

## Exemples d'utilisation

Les notifications sont utilisees dans tout le systeme :

- Les **taches cron** notifient le proprietaire lorsqu'une tache planifiee se termine ou echoue.
- Les **triggers** notifient le proprietaire lorsque la surveillance detecte quelque chose qui necessite
  une attention.
- Les **webhooks** notifient le proprietaire lorsqu'un evenement externe se declenche (PR GitHub, alerte
  Sentry).
- Les **violations de politique** notifient le proprietaire lorsqu'une action bloquee est tentee.
- Le **statut des canaux** notifie le proprietaire lorsqu'un canal se deconnecte ou
  se reconnecte.

::: info La file d'attente de notifications est persistee via `StorageProvider` (espace de noms :
`notifications:`) avec une retention par defaut de 7 jours apres la livraison. Les notifications
non livrees sont conservees jusqu'a acquittement. :::
