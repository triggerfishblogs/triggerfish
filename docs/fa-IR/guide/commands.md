# دستورات CLI

Triggerfish یک CLI برای مدیریت عامل، دیمن، کانال‌ها و نشست‌ها ارائه می‌دهد.
این صفحه هر دستور موجود و میانبر درون‌گفتگویی را پوشش می‌دهد.

## دستورات اصلی

### `triggerfish dive`

اجرای جادوگر راه‌اندازی تعاملی.

```bash
triggerfish dive
```

### `triggerfish chat`

شروع یک نشست گفتگوی تعاملی در ترمینال.

```bash
triggerfish chat
```

ویژگی‌های رابط گفتگو:

- نوار ورودی تمام‌عرض در پایین ترمینال
- پاسخ‌های جریانی با نمایش توکن بلادرنگ
- نمایش فشرده فراخوانی ابزار (تغییر با Ctrl+O)
- تاریخچه ورودی (ذخیره‌شده بین نشست‌ها)
- ESC برای قطع پاسخ در حال اجرا

### `triggerfish run`

شروع سرور Gateway در پیش‌زمینه.

```bash
triggerfish run
```

### `triggerfish start`

نصب و شروع Triggerfish به‌عنوان دیمن پس‌زمینه.

```bash
triggerfish start
```

| پلتفرم  | مدیر سرویس                       |
| ------- | -------------------------------- |
| macOS   | launchd                          |
| Linux   | systemd                          |
| Windows | Windows Service / Task Scheduler |

### `triggerfish stop`

توقف دیمن در حال اجرا.

```bash
triggerfish stop
```

### `triggerfish status`

بررسی وضعیت اجرای دیمن.

```bash
triggerfish status
```

### `triggerfish logs`

مشاهده خروجی لاگ دیمن.

```bash
triggerfish logs
triggerfish logs --tail
```

### `triggerfish patrol`

اجرای بررسی سلامت نصب Triggerfish.

```bash
triggerfish patrol
```

### `triggerfish config`

مدیریت فایل پیکربندی.

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
triggerfish config validate
triggerfish config add-channel [type]
```

#### `triggerfish config migrate-secrets`

مهاجرت اعتبارنامه‌های متن‌ساده از `triggerfish.yaml` به کلیدزنجیر سیستم‌عامل.

```bash
triggerfish config migrate-secrets
```

### `triggerfish connect`

اتصال یک سرویس خارجی.

```bash
triggerfish connect google    # Google Workspace (جریان OAuth2)
triggerfish connect github    # GitHub (Personal Access Token)
```

### `triggerfish disconnect`

حذف احراز هویت یک سرویس خارجی.

```bash
triggerfish disconnect google
triggerfish disconnect github
```

### `triggerfish update`

بررسی و نصب به‌روزرسانی‌ها.

```bash
triggerfish update
```

### `triggerfish version`

نمایش نسخه فعلی Triggerfish.

```bash
triggerfish version
```

## دستورات مهارت

```bash
triggerfish skill search "calendar"     # جستجوی مهارت در The Reef
triggerfish skill install google-cal    # نصب یک مهارت
triggerfish skill list                  # لیست مهارت‌های نصب‌شده
triggerfish skill update --all          # به‌روزرسانی تمام مهارت‌ها
triggerfish skill publish               # انتشار مهارت در The Reef
triggerfish skill create                # ایجاد داربست مهارت جدید
```

## دستورات نشست

```bash
triggerfish session list                # لیست نشست‌های فعال
triggerfish session history             # مشاهده متن نشست
triggerfish session spawn               # ایجاد نشست پس‌زمینه
```

## دستورات درون‌گفتگویی

| دستور                 | توضیحات                                                       |
| --------------------- | ------------------------------------------------------------- |
| `/help`               | نمایش دستورات درون‌گفتگویی موجود                                |
| `/status`             | نمایش وضعیت نشست: مدل، تعداد توکن، هزینه، سطح Taint          |
| `/reset`              | بازنشانی Taint نشست و تاریخچه مکالمه                           |
| `/compact`            | فشرده‌سازی تاریخچه مکالمه با خلاصه‌سازی LLM                    |
| `/model <name>`       | تغییر مدل LLM برای نشست فعلی                                  |
| `/skill install <name>` | نصب مهارت از The Reef                                        |
| `/cron list`          | لیست وظایف cron زمان‌بندی‌شده                                  |

## میانبرهای صفحه‌کلید

| میانبر   | عمل                                                                         |
| -------- | --------------------------------------------------------------------------- |
| ESC      | قطع پاسخ فعلی LLM                                                          |
| Ctrl+V   | چسباندن تصویر از کلیپ‌بورد ([تصویر و بینایی](/fa-IR/features/image-vision) را ببینید) |
| Ctrl+O   | تغییر نمایش فشرده/گسترده فراخوانی ابزار                                     |
| Ctrl+C   | خروج از نشست گفتگو                                                         |
| بالا/پایین | حرکت در تاریخچه ورودی                                                    |

## خروجی اشکال‌زدایی

با تنظیم `TRIGGERFISH_DEBUG=1` لاگ‌گذاری اشکال‌زدایی جزئی فعال می‌شود:

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

::: warning خروجی اشکال‌زدایی شامل payload‌های کامل درخواست و پاسخ LLM است. آن
را در محیط تولید فعال نگذارید. :::

## مرجع سریع

```bash
# راه‌اندازی و مدیریت
triggerfish dive              # جادوگر راه‌اندازی
triggerfish start             # شروع دیمن
triggerfish stop              # توقف دیمن
triggerfish status            # بررسی وضعیت
triggerfish logs --tail       # پخش لاگ‌ها
triggerfish patrol            # بررسی سلامت
triggerfish update            # بررسی به‌روزرسانی
triggerfish version           # نمایش نسخه

# استفاده روزانه
triggerfish chat              # گفتگوی تعاملی
triggerfish run               # حالت پیش‌زمینه

# مهارت‌ها
triggerfish skill search      # جستجو در The Reef
triggerfish skill install     # نصب مهارت
triggerfish skill list        # لیست نصب‌شده
triggerfish skill create      # ایجاد مهارت جدید
```
