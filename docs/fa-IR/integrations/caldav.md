# CalDAV

يیکپارچه‌سازی Triggerfish با خوادم CalDAV لإدارة التقويم. پشتیبانی می‌کند Google Calendar و Apple
Calendar و Nextcloud وهر خادم متوافق با CalDAV.

## ابزارها

### `caldav_list_events`

سرد أحداث التقويم در نطاق زازي.

### `caldav_create_event`

إنشاء حدث تقويم جديد.

### `caldav_update_event`

تحديث حدث تقويم موجود. يستخدم ETags للتحكم در التزااز المتفائل.

### `caldav_delete_event`

حذف حدث تقويم. يستخدم ETags همچنین.

## پیکربندی

```yaml
integrations:
  caldav:
    url: "https://caldav.example.com/dav/"
    calendar: "primary"
    classification: CONFIDENTIAL
```

بيانات اعتماد CalDAV تُخزن در کلیدزنجیر نظام التشغيل.

## تعارضات ETag

CalDAV يستخدم ETags للتحكم در التزااز المتفائل. إذا عدّل عميل آخر الحدث بین
القراءة والكتابة، تفشل العملية. يُعيد عامل المحاولة به‌صورت خودکار بجلب أحدث نسخة.
