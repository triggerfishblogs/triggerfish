# Plugin SDK والبيئة البازولة

تتيح لك إضافات Triggerfish توسيع عامل بكود مخصص يتفاعل
با أنظمة خارجية -- استعخیرمات CRM، عمليات قوانین البيانات، یکپارچه‌سازیات API،
سير عمل متعدد الخطوات -- أثناء التشغيل داخل بيئة بازولة مزدوجة تازع
الكود از فعل هر شيء لم يُسمح له به صراحةً.

## محیط اجرا

تعمل plugin‌ها روی Deno + Pyodide (WASM). خیر Docker. خیر حاويات. خیر متدرخواستات مسبقة
سوى تثبيت Triggerfish نفسه.

- **إضافات TypeScript** تعمل مستقیماً در بيئة Deno البازولة
- **إضافات Python** تعمل داخل Pyodide (مفسّر Python مُجمّع به
  WebAssembly)، والذي کار می‌کند بدوره داخل بيئة Deno البازولة

<img src="/diagrams/plugin-sandbox.svg" alt="بيئة الplugin البازولة: بيئة Deno تغلف بيئة WASM، كود الplugin کار می‌کند در الطبقة الداخلية" style="max-width: 100%;" />

این باماری البازولة المزدوجة تعني أنه حتى لو احتوت plugin روی كود
خبيث، نمی‌توانها الوصول به سیستم فایل یا إجراء فراخوانیات شبكة غير مُعلنة یا الهروب
به نظام المضيف.

## ما يمكن للإضافات فعله

plugin‌ها لديها مرونة داخلية ضاز حدود صارمة. داخل البيئة البازولة،
يمكن لإضافتك:

- تندرذ عمليات CRUD كاملة روی الأنظمة المستهدفة (باستخدام أذونات المستخدم)
- تندرذ استعخیرمات باقدة وتحويخیرت بيانات
- تنسيق سير عمل متعدد الخطوات
- باالجة وتحليل البيانات
- الحفاظ روی حالة الplugin از طریق فراخوانیات
- فراخوانی هر نقطة نهاية API خارجية مُعلنة

## ما نمی‌توان للإضافات فعله

| القيد                                    | چگونه يُطبّق                                                  |
| ---------------------------------------- | ------------------------------------------------------------ |
| الوصول لنقاط نهاية شبكة غير مُعلنة      | البيئة البازولة تحظر تمام فراخوانیات الشبكة غير المدرجة      |
| إخراج بيانات بدون تسمية طبقه‌بندی            | SDK يرفض البيانات غير المصنّفة                               |
| قراءة بيانات بدون نشر Taint             | SDK يلوّث نشست به‌صورت خودکار عند الوصول للبيانات                |
| حفظ بيانات خارج Triggerfish              | خیر وصول لسیستم فایل از داخل البيئة البازولة                |
| التسريب از طریق قنوات جانبية                 | حدود الموارد مفروضة، خیر وصول للمقابس الخام                   |
| استخدام بيانات اعتماد النظام              | SDK يحظر `get_system_credential()`؛ بيانات اعتماد المستخدم فقط |

::: warning أمان `sdk.get_system_credential()` **محظورة** بالتصميم.
باید روی plugin‌ها همیشه استخدام بيانات اعتماد المستخدم المُفوّضة از طریق
`sdk.get_user_credential()`. این يضاز أن عامل يمكنه فقط الوصول به ما يمكن
للمستخدم الوصول إليه -- خیر أكثر هرگز. :::

## طرق Plugin SDK

فراهم می‌کند SDK واجهة محكومة للإضافات للتفاعل با الأنظمة
الخارجية وازصة Triggerfish.

### الوصول لبيانات اخیرعتماد

```typescript
// الحصول روی بيانات اعتماد المستخدم المُفوّضة لخدمة
const credential = await sdk.get_user_credential("salesforce");

// التحقق مما إذا كان المستخدم قد وصل خدمة
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` يسترجع رمز OAuth یا مفتاح API للمستخدم
للخدمة المُسمّاة. إذا لم يكن المستخدم قد وصل الخدمة، يُعيد فراخوانی
`null` وباید روی الplugin التعامل با این بأناقة.

### عمليات البيانات

```typescript
// استعخیرم نظام خارجي باستخدام أذونات المستخدم
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// إخراج البيانات به عامل — تسمية طبقه‌بندی الزامیة
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info هر فراخوانی لـ `sdk.emitData()` يتدرخواست تسمية `classification`. إذا
حذفتها، يرفض SDK فراخوانی. این يضاز طبقه‌بندی تمام البيانات المتدفقة از
plugin‌ها به زمینه عامل بشهر صحیح. :::

### فحص اخیرتصال

```typescript
// التحقق مما إذا كان المستخدم لديه اتصال مباشر بخدمة
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## دورة حياة الplugin

هر plugin تتبع دورة حياة تضاز ممراجعه کنیدة أازية قبل التفعيل.

```
1. إنشاء الplugin (از قبل المستخدم یا عامل یا جهة خارجية)
       |
       v
2. بناء الplugin باستخدام Plugin SDK
   - باید تندرذ رابط‌ها اخیرلزامیة
   - باید إعخیرن نقاط النهاية والقدرات
   - باید اجتياز التحقق
       |
       v
3. الplugin تدخل حالة UNTRUSTED
   - عامل نمی‌توانه استخدامها
   - المالك/المسؤول يُخطر: "در انتظار طبقه‌بندی"
       |
       v
4. المالك (شخصي) یا المسؤول (مؤسسي) يمراجعه کنید:
   - ما البيانات التي تصل إليها این الplugin؟
   - ما الإجراءات التي يمكنها اتخاذها؟
   - تعيين سطح طبقه‌بندی
       |
       v
5. الplugin نشطة بطبقه‌بندی المُعيّن
   - عامل يمكنه فراخوانی ضاز قيود سیاست
   - تمام فراخوانیات تمر از طریق Hookات سیاست
```

::: tip در المستوى الشخصي، أنت المالك -- تمراجعه کنید وتصنّف
إضافاتك بنفسك. در المستوى المؤسسي، يدير مسؤول سجل plugin‌ها ويعيّن
سطوح طبقه‌بندی. :::

## اخیرتصال بقوانین البيانات

برامج التشغيل الأصلية لقوانین البيانات (psycopg2، mysqlclient، إلخ) خیر تعمل داخل البيئة
البازولة WASM. تتصل plugin‌ها بقوانین البيانات از طریق واجهات API المبنية روی HTTP بدخیرً از آن.

| قانون البيانات | خيار HTTP                         |
| -------------- | --------------------------------- |
| PostgreSQL     | PostgREST، Supabase SDK، Neon API |
| MySQL          | PlanetScale API                   |
| MongoDB        | Atlas Data API                    |
| Snowflake      | REST API                          |
| BigQuery       | REST API                          |
| DynamoDB       | AWS SDK (HTTP)                    |

این ویژگی أازية، وليست قيداً. تمام الوصول لقوانین البيانات يتدفق
از طریق درخواستات HTTP قابلة للفحص والتحكم يمكن للبيئة البازولة فرضها ولنظام
بازرسی تسجيلها.

## كتابة plugin TypeScript

plugin TypeScript بسيطة تستعلم واجهة REST API:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // التحقق مما إذا كان المستخدم قد وصل الخدمة
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // اخیرستعخیرم باستخدام بيانات اعتماد المستخدم
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // إخراج بيانات مصنّفة به عامل
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## كتابة plugin Python

plugin Python بسيطة:

```python
async def execute(sdk):
    # التحقق از اخیرتصال
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # اخیرستعخیرم باستخدام بيانات اعتماد المستخدم
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # الإخراج با طبقه‌بندی
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

تعمل إضافات Python داخل بيئة Pyodide WASM. وحدات المكتبة القياسية
متاحة، لكن امتدادات C الأصلية ليست كآن. استخدم واجهات API المبنية روی HTTP لخیرتصال
الخارجي.

## ملخص أمان plugin‌ها

- تعمل plugin‌ها در بيئة بازولة مزدوجة (Deno + WASM) با عزل صارم
- تمام الوصول للشبكة باید إعخیرنه در بيان الplugin
- تمام البيانات المُخرجة باید أن تحمل تسمية طبقه‌بندی
- بيانات اعتماد النظام محظورة -- فقط بيانات اعتماد المستخدم المُفوّضة
  متاحة
- هر plugin تدخل النظام كـ `UNTRUSTED` وباید طبقه‌بندیها قبل استفاده
- تمام فراخوانیات plugin‌ها تمر از طریق Hookات سیاست وانجام می‌شود تدقيقها کامخیرً
