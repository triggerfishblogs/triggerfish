# GitHub

يتكامل Triggerfish مع GitHub عبر Personal Access Token، مما يمنح وكيلك أدوات
للمستودعات وطلبات السحب والمشكلات و Actions.

## الإعداد

```bash
triggerfish connect github
```

يرشدك عبر إنشاء fine-grained Personal Access Token والتحقق منه وتخزينه في
سلسلة المفاتيح.

## الأدوات

| الأداة                  | الوصف                                    |
| ----------------------- | ---------------------------------------- |
| `github_search_repos`   | البحث في المستودعات                       |
| `github_get_repo`       | معلومات المستودع                          |
| `github_list_prs`       | سرد طلبات السحب                          |
| `github_get_pr`         | تفاصيل طلب سحب                           |
| `github_create_issue`   | إنشاء مشكلة                              |
| `github_clone_repo`     | استنساخ مستودع في مساحة العمل             |
| `github_create_pr`      | إنشاء طلب سحب                            |
| `github_list_actions`   | سرد تشغيلات Actions                      |

## الأمان

- الوكيل يستخدم رمز المستخدم المُفوض، وليس حساب خدمة
- GitHub يفرض نموذج صلاحياته الخاص
- التصنيف الافتراضي: `CONFIDENTIAL` (مستودعات خاصة)
