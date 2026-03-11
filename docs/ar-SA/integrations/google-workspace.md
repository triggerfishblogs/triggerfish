# Google Workspace

يتكامل Triggerfish مع Google Workspace عبر OAuth2، مما يمنح وكيلك الوصول لـ
Gmail و Calendar و Tasks و Drive و Sheets.

## الإعداد

```bash
triggerfish connect google
```

يبدأ تدفق OAuth2: يطلب معرف OAuth Client ومفتاحه، يفتح المتصفح للتفويض، ويخزن
الرموز بأمان في سلسلة المفاتيح.

## الخدمات المدعومة

| الخدمة   | الأدوات                                                |
| -------- | ------------------------------------------------------ |
| Gmail    | قراءة، بحث، إرسال، تسمية                               |
| Calendar | سرد أحداث، إنشاء، تحديث، حذف                           |
| Tasks    | سرد، إنشاء، إكمال                                      |
| Drive    | بحث، قراءة، إنشاء مستندات                               |
| Sheets   | قراءة، كتابة، إنشاء جداول بيانات                        |

## إنشاء بيانات اعتماد OAuth

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروعاً جديداً أو اختر موجوداً
3. فعّل APIs المطلوبة (Gmail, Calendar, Tasks, Drive, Sheets)
4. أنشئ بيانات اعتماد OAuth 2.0 (Desktop Application)
5. نزّل معرف العميل ومفتاح العميل

## الأمان

- Triggerfish يستخدم رموز OAuth المُفوضة من المستخدم
- Google يفرض نموذج صلاحياته الخاص
- رمز التحديث يُخزن في سلسلة المفاتيح
- التصنيف الافتراضي: `CONFIDENTIAL`
