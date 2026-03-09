# Google Workspace

يیکپارچه‌سازی Triggerfish با Google Workspace از طریق OAuth2، مما يازح عاملك الوصول لـ
Gmail و Calendar و Tasks و Drive و Sheets.

## راه‌اندازی

```bash
triggerfish connect google
```

يبدأ تدفق OAuth2: يدرخواست بارف OAuth Client ومفتاحه، يفتح مرورگر للتفویض، ويخزن
الرموز بأمان در سلسلة المفاتيح.

## الخدمات المدعومة

| الخدمة   | ابزارها                                                |
| -------- | ------------------------------------------------------ |
| Gmail    | قراءة، بحث، إرسال، تسمية                               |
| Calendar | سرد أحداث، إنشاء، تحديث، حذف                           |
| Tasks    | سرد، إنشاء، إكمال                                      |
| Drive    | بحث، قراءة، إنشاء مستندات                               |
| Sheets   | قراءة، كتابة، إنشاء جداول بيانات                        |

## إنشاء بيانات اعتماد OAuth

1. اذهب به [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروعاً جديداً یا اختر موجوداً
3. فعّل APIs اخیرلزامیة (Gmail, Calendar, Tasks, Drive, Sheets)
4. أنشئ بيانات اعتماد OAuth 2.0 (Desktop Application)
5. نزّل بارف العميل ومفتاح العميل

## اازیت

- Triggerfish يستخدم رموز OAuth المُفوضة از المستخدم
- Google يفرض مدل صخیرحياته الخاص
- رمز التحديث يُخزن در سلسلة المفاتيح
- طبقه‌بندی پیش‌فرض: `CONFIDENTIAL`
