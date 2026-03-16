---
layout: home

hero:
  name: Triggerfish
  text: عامل‌های هوش مصنوعی امن
  tagline: اعمال قطعی سیاست‌ها در زیر لایه LLM. هر کانال. بدون استثنا.
  image:
    src: /triggerfish.webp
    alt: Triggerfish — در حال گشت‌وگذار در دریای دیجیتال
  actions:
    - theme: brand
      text: شروع کنید
      link: /fa-IR/guide/
    - theme: alt
      text: قیمت‌گذاری
      link: /fa-IR/pricing
    - theme: alt
      text: مشاهده در GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: امنیت در زیر لایه LLM
    details: اعمال قطعی سیاست‌ها در زیر لایه LLM. Hook‌های کد خالص که هوش مصنوعی نمی‌تواند آن‌ها را دور بزند، لغو کند یا بر آن‌ها تأثیر بگذارد. ورودی یکسان همیشه تصمیم یکسان تولید می‌کند.
  - icon: "\U0001F4AC"
    title: هر کانالی که استفاده می‌کنید
    details: Telegram، Slack، Discord، WhatsApp، ایمیل، WebChat، CLI — همه با طبقه‌بندی مجزا برای هر کانال و ردیابی خودکار Taint.
  - icon: "\U0001F528"
    title: هر چیزی بسازید
    details: محیط اجرای عامل با حلقه بازخورد نوشتن/اجرا/رفع. مهارت‌های خودنویس. بازار The Reef برای کشف و اشتراک‌گذاری قابلیت‌ها.
  - icon: "\U0001F916"
    title: هر ارائه‌دهنده LLM
    details: Anthropic، OpenAI، Google Gemini، مدل‌های محلی از طریق Ollama، OpenRouter. زنجیره‌های جایگزینی خودکار. یا Triggerfish Gateway را انتخاب کنید — بدون نیاز به کلیدهای API.
  - icon: "\U0001F3AF"
    title: فعال به‌صورت پیش‌فرض
    details: وظایف زمان‌بندی‌شده، محرک‌ها و webhook‌ها. عامل شما بررسی می‌کند، نظارت می‌کند و به‌صورت مستقل عمل می‌کند — در محدوده سیاست‌های سخت‌گیرانه.
  - icon: "\U0001F310"
    title: متن‌باز
    details: مجوز Apache 2.0. اجزای حیاتی امنیتی کاملاً برای بازرسی باز هستند. به ما اعتماد نکنید — کد را بررسی کنید.
---

<LatestRelease />

## نصب با یک دستور

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

نصب‌کننده باینری یک نسخه از پیش ساخته‌شده را دانلود می‌کند، چک‌سام آن را تأیید می‌کند و
جادوگر راه‌اندازی را اجرا می‌کند. [راهنمای نصب](/fa-IR/guide/installation) را برای راه‌اندازی Docker،
ساخت از سورس و فرآیند انتشار ببینید.

نمی‌خواهید کلیدهای API را مدیریت کنید؟ [قیمت‌گذاری](/fa-IR/pricing) را برای Triggerfish Gateway ببینید —
زیرساخت مدیریت‌شده LLM و جستجو، آماده در چند دقیقه.

## نحوه کار

Triggerfish یک لایه سیاست قطعی بین عامل هوش مصنوعی شما و هر چیزی که با آن تعامل
دارد قرار می‌دهد. LLM اقدامات را پیشنهاد می‌دهد — Hook‌های کد خالص تصمیم می‌گیرند
که آیا مجاز هستند.

- **سیاست قطعی** — تصمیمات امنیتی کد خالص هستند. بدون تصادف، بدون تأثیر
  LLM، بدون استثنا. ورودی یکسان، تصمیم یکسان، هر بار.
- **کنترل جریان اطلاعات** — چهار سطح طبقه‌بندی (PUBLIC، INTERNAL،
  CONFIDENTIAL، RESTRICTED) به‌صورت خودکار از طریق Taint نشست منتشر می‌شوند.
  داده‌ها هرگز نمی‌توانند به سمت پایین به زمینه‌ای با امنیت کمتر جریان یابند.
- **شش Hook اعمال** — هر مرحله از خط لوله داده محافظت شده است: آنچه وارد
  زمینه LLM می‌شود، کدام ابزارها فراخوانی می‌شوند، چه نتایجی برمی‌گردند و
  چه چیزی از سیستم خارج می‌شود. هر تصمیم در گزارش بازرسی ثبت می‌شود.
- **رد پیش‌فرض** — هیچ‌چیز به‌صورت خاموش مجاز نیست. ابزارها، یکپارچه‌سازی‌ها
  و منابع داده طبقه‌بندی‌نشده تا زمان پیکربندی صریح رد می‌شوند.
- **هویت عامل** — مأموریت عامل شما در SPINE.md و رفتارهای فعالانه در
  TRIGGER.md زندگی می‌کنند. مهارت‌ها قابلیت‌ها را از طریق قراردادهای ساده
  پوشه‌ای گسترش می‌دهند. بازار The Reef به شما امکان کشف و اشتراک‌گذاری آن‌ها
  را می‌دهد.

[درباره معماری بیشتر بدانید.](/fa-IR/architecture/)
