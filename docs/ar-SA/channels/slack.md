# Slack

قم بتوصيل وكيل Triggerfish الخاص بك بـ Slack حتى يتمكن وكيلك من المشاركة في
محادثات مساحة العمل. يستخدم المحوّل إطار عمل [Bolt](https://slack.dev/bolt-js/)
مع Socket Mode، مما يعني عدم الحاجة لعنوان URL عام أو نقطة نهاية webhook.

## التصنيف الافتراضي

يتم تصنيف Slack افتراضياً كـ `PUBLIC`. يعكس هذا واقع أن مساحات عمل Slack
غالباً ما تشمل ضيوفاً خارجيين ومستخدمي Slack Connect وقنوات
مشتركة. يمكنك رفعه إلى `INTERNAL` أو أعلى إذا كانت مساحة عملك
داخلية بالكامل.

## الإعداد

### الخطوة 1: إنشاء تطبيق Slack

1. اذهب إلى [api.slack.com/apps](https://api.slack.com/apps)
2. انقر **Create New App**
3. اختر **From scratch**
4. سمِّ تطبيقك (مثل "Triggerfish") واختر مساحة عملك
5. انقر **Create App**

### الخطوة 2: تكوين صلاحيات رمز البوت

انتقل إلى **OAuth & Permissions** في الشريط الجانبي وأضف **Bot
Token Scopes** التالية:

| الصلاحية           | الغرض                             |
| ------------------ | --------------------------------- |
| `chat:write`       | إرسال الرسائل                     |
| `channels:history` | قراءة الرسائل في القنوات العامة   |
| `groups:history`   | قراءة الرسائل في القنوات الخاصة   |
| `im:history`       | قراءة الرسائل المباشرة             |
| `mpim:history`     | قراءة رسائل المجموعات المباشرة     |
| `channels:read`    | عرض القنوات العامة                 |
| `groups:read`      | عرض القنوات الخاصة                 |
| `im:read`          | عرض محادثات الرسائل المباشرة       |
| `users:read`       | البحث عن معلومات المستخدم          |

### الخطوة 3: تمكين Socket Mode

1. انتقل إلى **Socket Mode** في الشريط الجانبي
2. فعّل **Enable Socket Mode**
3. سيُطلب منك إنشاء **App-Level Token** -- سمّه (مثل
   "triggerfish-socket") وأضف صلاحية `connections:write`
4. انسخ **App Token** المُولّد (يبدأ بـ `xapp-`)

### الخطوة 4: تمكين الأحداث

1. انتقل إلى **Event Subscriptions** في الشريط الجانبي
2. فعّل **Enable Events**
3. تحت **Subscribe to bot events**، أضف:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### الخطوة 5: الحصول على بيانات الاعتماد

تحتاج ثلاث قيم:

- **Bot Token** -- اذهب إلى **OAuth & Permissions**، انقر **Install to
  Workspace**، ثم انسخ **Bot User OAuth Token** (يبدأ بـ `xoxb-`)
- **App Token** -- الرمز الذي أنشأته في الخطوة 3 (يبدأ بـ `xapp-`)
- **Signing Secret** -- اذهب إلى **Basic Information**، مرّر إلى **App
  Credentials**، وانسخ **Signing Secret**

### الخطوة 6: الحصول على معرّف مستخدم Slack

لتكوين هوية المالك:

1. افتح Slack
2. انقر صورة ملفك الشخصي في أعلى اليمين
3. انقر **Profile**
4. انقر قائمة النقاط الثلاث واختر **Copy member ID**

### الخطوة 7: تكوين Triggerfish

أضف قناة Slack إلى `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret مخزّنة في سلسلة مفاتيح نظام التشغيل
    ownerId: "U01234ABC"
```

الأسرار (رمز البوت، رمز التطبيق، سر التوقيع) تُدخل أثناء
`triggerfish config add-channel slack` وتُخزّن في سلسلة مفاتيح نظام التشغيل.

| الخيار           | النوع  | مطلوب     | الوصف                                       |
| ---------------- | ------ | --------- | ------------------------------------------- |
| `ownerId`        | string | موصى به   | معرّف عضو Slack للتحقق من المالك            |
| `classification` | string | لا        | مستوى التصنيف (الافتراضي: `PUBLIC`)         |

::: warning خزّن الأسرار بأمان لا تقم أبداً بإيداع الرموز أو الأسرار في التحكم
بالمصادر. استخدم متغيرات البيئة أو سلسلة مفاتيح نظام التشغيل. انظر
[إدارة الأسرار](/security/secrets) للتفاصيل. :::

### الخطوة 8: دعوة البوت

قبل أن يتمكن البوت من قراءة أو إرسال رسائل في قناة، تحتاج لدعوته:

1. افتح قناة Slack التي تريد البوت فيها
2. اكتب `/invite @Triggerfish` (أو أياً كان اسم تطبيقك)

يمكن للبوت أيضاً استقبال رسائل مباشرة بدون دعوته إلى قناة.

### الخطوة 9: تشغيل Triggerfish

```bash
triggerfish stop && triggerfish start
```

أرسل رسالة في قناة حيث البوت موجود، أو أرسل له رسالة مباشرة، لتأكيد
الاتصال.

## هوية المالك

يستخدم Triggerfish تدفق OAuth في Slack للتحقق من المالك. عندما تصل
رسالة، يقارن المحوّل معرّف مستخدم Slack للمرسل مع `ownerId`
المُعدّ:

- **تطابق** -- أمر المالك
- **عدم تطابق** -- إدخال خارجي بتلوث `PUBLIC`

### عضوية مساحة العمل

لتصنيف المستلم، تحدد عضوية مساحة عمل Slack ما إذا كان
المستخدم `INTERNAL` أو `EXTERNAL`:

- أعضاء مساحة العمل العاديون هم `INTERNAL`
- مستخدمو Slack Connect الخارجيون هم `EXTERNAL`
- المستخدمون الضيوف هم `EXTERNAL`

## حدود الرسائل

يدعم Slack رسائل تصل إلى 40,000 حرف. الرسائل التي تتجاوز هذا الحد
تُقطع. لمعظم ردود الوكيل، لا يتم الوصول إلى هذا الحد أبداً.

## مؤشرات الكتابة

يرسل Triggerfish مؤشرات كتابة إلى Slack عندما يعالج الوكيل
طلباً. لا يكشف Slack أحداث الكتابة الواردة للبوتات، لذا هذا
إرسال فقط.

## دردشة المجموعات

يمكن للبوت المشاركة في قنوات المجموعات. كوّن سلوك المجموعة في
`triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| السلوك           | الوصف                                |
| ---------------- | ------------------------------------ |
| `mentioned-only` | الرد فقط عند ذكر البوت بـ @         |
| `always`         | الرد على جميع الرسائل في القناة      |

## تغيير التصنيف

```yaml
channels:
  slack:
    classification: INTERNAL
```

المستويات الصالحة: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`.
