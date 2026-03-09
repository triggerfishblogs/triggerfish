# Telegram

Connectez votre agent Triggerfish a Telegram pour pouvoir interagir avec lui
depuis n'importe quel appareil ou vous utilisez Telegram. L'adaptateur utilise le
framework [grammY](https://grammy.dev/) pour communiquer avec l'API Telegram Bot.

## Configuration

### Etape 1 : Creer un bot

1. Ouvrez Telegram et recherchez [@BotFather](https://t.me/BotFather)
2. Envoyez `/newbot`
3. Choisissez un nom d'affichage pour votre bot (ex. : "Mon Triggerfish")
4. Choisissez un nom d'utilisateur pour votre bot (doit se terminer par `bot`,
   ex. : `mon_triggerfish_bot`)
5. BotFather repondra avec votre **token de bot** -- copiez-le

::: warning Gardez votre token secret Votre token de bot donne le controle total
de votre bot. Ne le commitez jamais dans un depot de code source et ne le partagez
pas publiquement. Triggerfish le stocke dans le trousseau de cles de votre
systeme. :::

### Etape 2 : Obtenir votre ID utilisateur Telegram

Triggerfish a besoin de votre ID utilisateur numerique pour verifier que les
messages proviennent bien de vous. Les noms d'utilisateur Telegram peuvent etre
changes et ne sont pas fiables pour l'identite -- l'ID numerique est permanent et
attribue par les serveurs de Telegram, il ne peut donc pas etre usurpe.

1. Recherchez [@getmyid_bot](https://t.me/getmyid_bot) sur Telegram
2. Envoyez-lui n'importe quel message
3. Il repond avec votre ID utilisateur (un nombre comme `8019881968`)

### Etape 3 : Ajouter le canal

Lancez la configuration interactive :

```bash
triggerfish config add-channel telegram
```

Cela vous demande votre token de bot, votre ID utilisateur et le niveau de
classification, puis ecrit la configuration dans `triggerfish.yaml` et propose
de redemarrer le daemon.

Vous pouvez aussi l'ajouter manuellement :

```yaml
channels:
  telegram:
    # botToken stocke dans le trousseau de cles du systeme
    ownerId: 8019881968
    classification: INTERNAL
```

| Option           | Type   | Requis | Description                                            |
| ---------------- | ------ | ------ | ------------------------------------------------------ |
| `botToken`       | string | Oui    | Token API du bot fourni par @BotFather                 |
| `ownerId`        | number | Oui    | Votre ID utilisateur Telegram numerique                |
| `classification` | string | Non    | Plafond de classification (defaut : `INTERNAL`)        |

### Etape 4 : Commencer a discuter

Apres le redemarrage du daemon, ouvrez votre bot dans Telegram et envoyez
`/start`. Le bot vous saluera pour confirmer que la connexion est active. Vous
pouvez ensuite discuter directement avec votre agent.

## Comportement de classification

Le parametre `classification` est un **plafond** -- il controle la sensibilite
maximale des donnees pouvant transiter par ce canal pour les conversations du
**proprietaire**. Il ne s'applique pas uniformement a toutes les personnes.

**Fonctionnement par message :**

- **Vous envoyez un message au bot** (votre ID utilisateur correspond a
  `ownerId`) : La session utilise le plafond du canal. Avec le defaut `INTERNAL`,
  votre agent peut partager des donnees de niveau interne avec vous.
- **Quelqu'un d'autre envoie un message au bot** : Sa session est automatiquement
  marquee `PUBLIC` quel que soit la classification du canal. La regle de non
  ecriture descendante empeche toute donnee interne d'atteindre sa session.

Cela signifie qu'un seul bot Telegram gere en toute securite les conversations du
proprietaire et des autres personnes. La verification d'identite se fait dans le
code avant que le LLM ne voie le message -- le LLM ne peut pas l'influencer.

| Classification du canal |  Messages du proprietaire  | Messages des autres |
| ----------------------- | :------------------------: | :-----------------: |
| `PUBLIC`                |           PUBLIC           |       PUBLIC        |
| `INTERNAL` (defaut)     |     Jusqu'a INTERNAL       |       PUBLIC        |
| `CONFIDENTIAL`          |   Jusqu'a CONFIDENTIAL     |       PUBLIC        |
| `RESTRICTED`            |    Jusqu'a RESTRICTED      |       PUBLIC        |

Consultez le [Systeme de classification](/fr-FR/architecture/classification) pour
le modele complet et [Sessions et taint](/fr-FR/architecture/taint-and-sessions)
pour le fonctionnement de l'escalade de taint.

## Identite du proprietaire

Triggerfish determine le statut de proprietaire en comparant l'ID utilisateur
Telegram numerique de l'expediteur avec le `ownerId` configure. Cette
verification se fait dans le code **avant** que le LLM ne voie le message :

- **Correspondance** -- Le message est marque comme proprietaire et peut acceder
  aux donnees jusqu'au plafond de classification du canal
- **Pas de correspondance** -- Le message est marque avec un taint `PUBLIC`, et la
  regle de non ecriture descendante empeche toute donnee classifiee de transiter
  vers cette session

::: danger Definissez toujours votre ID proprietaire Sans `ownerId`, Triggerfish
traite **tous** les expediteurs comme proprietaire. Quiconque trouve votre bot
peut acceder a vos donnees jusqu'au niveau de classification du canal. Ce champ
est requis lors de la configuration pour cette raison. :::

## Decoupage des messages

Telegram a une limite de message de 4 096 caracteres. Lorsque votre agent genere
une reponse plus longue, Triggerfish la decoupe automatiquement en plusieurs
messages. Le decoupage se fait sur les retours a la ligne ou les espaces pour la
lisibilite -- il evite de couper les mots ou les phrases en deux.

## Types de messages pris en charge

L'adaptateur Telegram gere actuellement :

- **Messages texte** -- Support complet d'envoi et de reception
- **Longues reponses** -- Decoupees automatiquement pour respecter les limites de
  Telegram

## Indicateurs de saisie

Lorsque votre agent traite une requete, le bot affiche "en train d'ecrire..." dans
le chat Telegram. L'indicateur s'affiche pendant que le LLM genere une reponse et
disparait lorsque la reponse est envoyee.

## Modification de la classification

Pour augmenter ou diminuer le plafond de classification :

```bash
triggerfish config add-channel telegram
# Selectionnez l'ecrasement de la configuration existante lorsque demande
```

Ou modifiez directement `triggerfish.yaml` :

```yaml
channels:
  telegram:
    # botToken stocke dans le trousseau de cles du systeme
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Niveaux valides : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Redemarrez le daemon apres modification : `triggerfish stop && triggerfish start`
