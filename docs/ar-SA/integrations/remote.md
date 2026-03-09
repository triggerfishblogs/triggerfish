# التكاملات البعيدة

يدعم Triggerfish الاتصال بتكاملات بعيدة عبر HTTP وخوادم MCP البعيدة.

## خوادم MCP البعيدة

بالإضافة لخوادم MCP المحلية (التي تُنشأ كعمليات فرعية)، يمكنك الاتصال بخوادم
MCP بعيدة عبر HTTP SSE:

```yaml
mcp_servers:
  remote-service:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

## الأمان

- جميع الاتصالات البعيدة تمر عبر نفس فحوصات SSRF
- خوادم MCP البعيدة تحتاج تصنيفاً صريحاً
- المصادقة عبر رؤوس HTTP مُكوّنة
