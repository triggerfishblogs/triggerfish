# Google Chat

<ComingSoon />

अपने Triggerfish agent को Google Chat से जोड़ें ताकि Google Workspace का उपयोग करने वाली टीमें
सीधे अपने चैट इंटरफ़ेस से इसके साथ इंटरैक्ट कर सकें। Adapter service account या OAuth
क्रेडेंशियल के साथ Google Chat API का उपयोग करेगा।

## नियोजित सुविधाएँ

- प्रत्यक्ष संदेश और space (room) समर्थन
- Google Workspace निर्देशिका के माध्यम से Owner सत्यापन
- टाइपिंग संकेतक
- लंबी प्रतिक्रियाओं के लिए संदेश चंकिंग
- अन्य channels के अनुरूप Classification प्रवर्तन

## कॉन्फ़िगरेशन (नियोजित)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Gmail, Calendar, Tasks, Drive, और Sheets को कवर करने वाले मौजूदा Google
एकीकरण के लिए [Google Workspace](/hi-IN/integrations/google-workspace) देखें।
