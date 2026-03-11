# WhatsApp

قم بتوصيل وكيل Triggerfish الخاص بك بـ WhatsApp حتى تتمكن من التفاعل معه من
هاتفك. يستخدم المحوّل **WhatsApp Business Cloud API** (واجهة HTTP
الرسمية المستضافة من Meta)، ويستقبل الرسائل عبر webhook ويرسل عبر REST.

## التصنيف الافتراضي

يتم تصنيف WhatsApp افتراضياً كـ `PUBLIC`. جهات اتصال WhatsApp يمكن أن تشمل
أي شخص لديه رقم هاتفك، لذا `PUBLIC` هو الافتراضي الآمن.

## الإعداد

### الخطوة 1: إنشاء حساب Meta Business

1. اذهب إلى بوابة [Meta for Developers](https://developers.facebook.com/)
2. أنشئ حساب مطور إذا لم يكن لديك واحد
3. أنشئ تطبيقاً جديداً واختر **Business** كنوع التطبيق
4. في لوحة تحكم تطبيقك، أضف منتج **WhatsApp**

### الخطوة 2: الحصول على بيانات الاعتماد

من قسم WhatsApp في لوحة تحكم تطبيقك، اجمع هذه القيم:

- **Access Token** -- رمز وصول دائم (أو ولّد رمزاً مؤقتاً للاختبار)
- **Phone Number ID** -- معرّف رقم الهاتف المسجل في WhatsApp
  Business
- **Verify Token** -- سلسلة نصية تختارها، تُستخدم للتحقق من تسجيل webhook

### الخطوة 3: تكوين Webhooks

1. في إعدادات منتج WhatsApp، انتقل إلى **Webhooks**
2. عيّن عنوان URL للاستدعاء إلى عنوان خادمك العام (مثل
   `https://your-server.com:8443/webhook`)
3. عيّن **Verify Token** إلى نفس القيمة التي ستستخدمها في تكوين
   Triggerfish
4. اشترك في حقل webhook `messages`

::: info مطلوب عنوان URL عام تتطلب webhooks WhatsApp نقطة نهاية HTTPS
يمكن الوصول إليها عبر الإنترنت. إذا كنت تشغّل Triggerfish محلياً، ستحتاج خدمة
نفق (مثل ngrok، Cloudflare Tunnel) أو خادم بعنوان IP عام. :::

### الخطوة 4: تكوين Triggerfish

أضف قناة WhatsApp إلى `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken مخزّن في سلسلة مفاتيح نظام التشغيل
    phoneNumberId: "your-phone-number-id"
    # verifyToken مخزّن في سلسلة مفاتيح نظام التشغيل
    ownerPhone: "15551234567"
```

| الخيار           | النوع  | مطلوب     | الوصف                                                       |
| ---------------- | ------ | --------- | ----------------------------------------------------------- |
| `accessToken`    | string | نعم       | رمز وصول WhatsApp Business API                              |
| `phoneNumberId`  | string | نعم       | معرّف رقم الهاتف من لوحة Meta Business                       |
| `verifyToken`    | string | نعم       | رمز التحقق من webhook (تختاره أنت)                           |
| `webhookPort`    | number | لا        | المنفذ للاستماع لـ webhooks (الافتراضي: `8443`)              |
| `ownerPhone`     | string | موصى به   | رقم هاتفك للتحقق من المالك (مثل `"15551234567"`)            |
| `classification` | string | لا        | مستوى التصنيف (الافتراضي: `PUBLIC`)                         |

::: warning خزّن الأسرار بأمان لا تقم أبداً بإيداع رموز الوصول في التحكم بالمصادر.
استخدم متغيرات البيئة أو سلسلة مفاتيح نظام التشغيل. :::

### الخطوة 5: تشغيل Triggerfish

```bash
triggerfish stop && triggerfish start
```

أرسل رسالة من هاتفك إلى رقم WhatsApp Business لتأكيد
الاتصال.

## هوية المالك

يحدد Triggerfish حالة المالك بمقارنة رقم هاتف المرسل
مع `ownerPhone` المُعدّ. يتم هذا الفحص في الكود قبل أن يرى LLM
الرسالة:

- **تطابق** -- الرسالة أمر المالك
- **عدم تطابق** -- الرسالة إدخال خارجي بتلوث `PUBLIC`

إذا لم يتم تكوين `ownerPhone`، تُعامل جميع الرسائل كأنها من
المالك.

::: tip عيّن رقم هاتف المالك دائماً إذا كان آخرون قد يرسلون رسائل إلى رقم WhatsApp Business
الخاص بك، كوّن `ownerPhone` دائماً لمنع تنفيذ أوامر غير مصرح بها.
:::

## كيف يعمل Webhook

يبدأ المحوّل خادم HTTP على المنفذ المُعدّ (الافتراضي `8443`) يتعامل
مع نوعين من الطلبات:

1. **GET /webhook** -- يرسل Meta هذا للتحقق من نقطة نهاية webhook.
   يستجيب Triggerfish برمز التحدي إذا تطابق رمز التحقق.
2. **POST /webhook** -- يرسل Meta الرسائل الواردة هنا. يحلل Triggerfish
   حمولة webhook الخاصة بـ Cloud API، ويستخرج الرسائل النصية، ويحوّلها إلى
   معالج الرسائل.

## حدود الرسائل

يدعم WhatsApp رسائل تصل إلى 4,096 حرف. الرسائل التي تتجاوز هذا الحد
تُقسّم إلى رسائل متعددة قبل الإرسال.

## مؤشرات الكتابة

يرسل ويستقبل Triggerfish مؤشرات كتابة على WhatsApp. عندما يعالج وكيلك
طلباً، تظهر الدردشة مؤشر كتابة. إشعارات القراءة مدعومة
أيضاً.

## تغيير التصنيف

```yaml
channels:
  whatsapp:
    # accessToken مخزّن في سلسلة مفاتيح نظام التشغيل
    phoneNumberId: "your-phone-number-id"
    # verifyToken مخزّن في سلسلة مفاتيح نظام التشغيل
    classification: INTERNAL
```

المستويات الصالحة: `PUBLIC`، `INTERNAL`، `CONFIDENTIAL`، `RESTRICTED`.
