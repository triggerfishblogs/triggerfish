# Google Chat

<ComingSoon />

قم بتوصيل عامل Triggerfish الخاص بك بـ Google Chat حتى تتمكن الفرق التي تستخدم Google Workspace از
التفاعل باه مستقیماً از واجهة الدردشة. سيستخدم المحوّل
واجهة Google Chat API با حساب خدمة یا بيانات اعتماد OAuth.

## ویژگی‌ها المخطط لها

- دعم الپیام‌ها المستقیماً والمساحات (الغرف)
- التحقق از المالك از طریق دليل Google Workspace
- مؤشرات الكتابة
- تقسيم الپیام‌ها للردود الطويلة
- تطبيق طبقه‌بندی بما يتوافق با کانال‌ها الأخرى

## پیکربندی (مخطط)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

ببینید [Google Workspace](/fa-IR/integrations/google-workspace) لیکپارچه‌سازی Google
الحالي الذي يغطي Gmail وCalendar وTasks وDrive وSheets.
