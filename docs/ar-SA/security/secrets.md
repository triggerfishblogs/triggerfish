# إدارة الأسرار

بيانات الاعتماد في Triggerfish لا تظهر أبداً في ملفات التكوين أو السجلات أو
سياق LLM. تُخزن في سلسلة مفاتيح نظام التشغيل (شخصي) أو تكامل الخزنة (مؤسسي).

## تخزين الأسرار

| المنصة   | الواجهة الخلفية                                    |
| -------- | -------------------------------------------------- |
| macOS    | سلسلة مفاتيح تسجيل الدخول (عبر CLI `security`)     |
| Linux    | Secret Service (GNOME Keyring / KDE Wallet)         |
| Windows  | مخزن ملفات مُشفر (AES-256-GCM)                     |
| Docker   | مخزن ملفات مُشفر (AES-256-GCM)                     |

## مراجع الأسرار في التكوين

أي قيمة سلسلة في `triggerfish.yaml` يمكنها استخدام بادئة `secret:` للإشارة إلى
بيانات اعتماد مخزنة في سلسلة المفاتيح:

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
```

## إدارة الأسرار

```bash
# تعيين سر
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...

# نقل أسرار نص عادي للسلسلة
triggerfish config migrate-secrets
```

## Hook الأمان

hook `SECRET_ACCESS` يسجل كل وصول لبيانات اعتماد مع plugin الطالب ونطاق بيانات
الاعتماد والقرار.

::: warning SECURITY لا تخزن أبداً الأسرار في ملفات التكوين أو في
`StorageProvider`. استخدم سلسلة مفاتيح نظام التشغيل أو تكامل الخزنة. :::
