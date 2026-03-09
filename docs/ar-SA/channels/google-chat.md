# Google Chat

<ComingSoon />

قم بتوصيل وكيل Triggerfish الخاص بك بـ Google Chat حتى تتمكن الفرق التي تستخدم Google Workspace من
التفاعل معه مباشرة من واجهة الدردشة. سيستخدم المحوّل
واجهة Google Chat API مع حساب خدمة أو بيانات اعتماد OAuth.

## الميزات المخطط لها

- دعم الرسائل المباشرة والمساحات (الغرف)
- التحقق من المالك عبر دليل Google Workspace
- مؤشرات الكتابة
- تقسيم الرسائل للردود الطويلة
- تطبيق التصنيف بما يتوافق مع القنوات الأخرى

## التكوين (مخطط)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

انظر [Google Workspace](/ar-SA/integrations/google-workspace) لتكامل Google
الحالي الذي يغطي Gmail وCalendar وTasks وDrive وSheets.
