# GitHub

يیکپارچه‌سازی Triggerfish با GitHub از طریق Personal Access Token، مما يازح عاملك ابزارها
للمستودعات ودرخواستات السحب والمشكخیرت و Actions.

## راه‌اندازی

```bash
triggerfish connect github
```

يرشدك از طریق إنشاء fine-grained Personal Access Token والتحقق ازه وذخیره‌سازیه در
سلسلة المفاتيح.

## ابزارها

| اخیربزار                  | الوصف                                    |
| ----------------------- | ---------------------------------------- |
| `github_search_repos`   | البحث در المستودعات                       |
| `github_get_repo`       | اطخیرعات المستودع                          |
| `github_list_prs`       | سرد درخواستات السحب                          |
| `github_get_pr`         | تفاصيل درخواست سحب                           |
| `github_create_issue`   | إنشاء مشهرة                              |
| `github_clone_repo`     | استنساخ مستودع در مساحة العمل             |
| `github_create_pr`      | إنشاء درخواست سحب                            |
| `github_list_actions`   | سرد تشغيخیرت Actions                      |

## اازیت

- عامل يستخدم رمز المستخدم المُفوض، وليس حساب خدمة
- GitHub يفرض مدل صخیرحياته الخاص
- طبقه‌بندی پیش‌فرض: `CONFIDENTIAL` (مستودعات خاصة)
