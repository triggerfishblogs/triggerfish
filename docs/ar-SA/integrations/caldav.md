# CalDAV

يتكامل Triggerfish مع خوادم CalDAV لإدارة التقويم. يدعم Google Calendar و Apple
Calendar و Nextcloud وأي خادم متوافق مع CalDAV.

## الأدوات

### `caldav_list_events`

سرد أحداث التقويم في نطاق زمني.

### `caldav_create_event`

إنشاء حدث تقويم جديد.

### `caldav_update_event`

تحديث حدث تقويم موجود. يستخدم ETags للتحكم في التزامن المتفائل.

### `caldav_delete_event`

حذف حدث تقويم. يستخدم ETags أيضاً.

## التكوين

```yaml
integrations:
  caldav:
    url: "https://caldav.example.com/dav/"
    calendar: "primary"
    classification: CONFIDENTIAL
```

بيانات اعتماد CalDAV تُخزن في سلسلة مفاتيح نظام التشغيل.

## تعارضات ETag

CalDAV يستخدم ETags للتحكم في التزامن المتفائل. إذا عدّل عميل آخر الحدث بين
القراءة والكتابة، تفشل العملية. يُعيد الوكيل المحاولة تلقائياً بجلب أحدث نسخة.
