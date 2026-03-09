# ذخیره‌سازی

تمام داده‌های وضعیت‌دار در Triggerfish از طریق تجرید یکپارچه `StorageProvider` جریان می‌یابند. هیچ ماژولی مکانیزم ذخیره‌سازی خود را ایجاد نمی‌کند — هر مؤلفه‌ای که به پایداری نیاز دارد، یک `StorageProvider` به‌عنوان وابستگی می‌گیرد.

## رابط StorageProvider

```typescript
interface StorageProvider {
  set(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
  close(): Promise<void>;
}
```

## فضاهای نام کلید

| پیشوند      | محتویات                    |
| ----------- | -------------------------- |
| `sessions:` | وضعیت و متادیتای نشست      |
| `taint:`    | سطوح Taint نشست            |
| `lineage:`  | متادیتای منشأ داده          |
| `audit:`    | رکوردهای ثبت بازرسی        |
| `memory:`   | ذخیره‌سازی حافظه پایدار     |
| `cron:`     | وضعیت وظایف زمان‌بندی‌شده   |

## بک‌اند پیش‌فرض

بک‌اند پیش‌فرض SQLite WAL در `~/.triggerfish/data/triggerfish.db` است. این حداقل هزینه عملیاتی ارائه می‌دهد در حالی که تداوم و همزمانی خواندن را تضمین می‌کند.

## سریال‌سازی

- مقادیر به‌عنوان رشته‌های JSON ذخیره می‌شوند
- اشیاء Date به `toISOString` / `new Date` سریال و غیرسریال می‌شوند
- تمام عملیات نشست تغییرناپذیر هستند — اشیاء جدید بازمی‌گردانند

## صفحات مرتبط

- [Gateway](./gateway)
- [نشست‌ها و Taint](./taint-and-sessions)
