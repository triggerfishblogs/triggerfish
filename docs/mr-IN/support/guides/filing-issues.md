# How to File a Good Issue

Well-structured issue जलद resolve होतो. Logs नसलेला आणि reproduction steps नसलेला
vague issue अनेक आठवडे बसतो कारण कोणी त्यावर act करू शकत नाही. येथे काय include
करायचे ते आहे.

## Filing पूर्वी

1. **Existing issues search करा.** कोणाने आधीच same problem report केले असेल.
   [open issues](https://github.com/greghavens/triggerfish/issues) आणि
   [closed issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed) check करा.

2. **Troubleshooting guides check करा.** [Troubleshooting section](/mr-IN/support/troubleshooting/)
   बहुतेक common problems cover करतो.

3. **Known issues check करा.** [Known Issues](/mr-IN/support/kb/known-issues) page
   आम्हाला आधीच माहीत असलेल्या problems list करतो.

4. **Latest version try करा.** तुम्ही latest release वर नसल्यास, आधी update करा:
   ```bash
   triggerfish update
   ```

## काय Include करायचे

### 1. Environment

```
Triggerfish version: (`triggerfish version` run करा)
OS: (उदा. macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architecture: (x64 किंवा arm64)
Installation method: (binary installer, from source, Docker)
```

### 2. Steps to Reproduce

Problem कडे lead करणाऱ्या actions चा exact sequence लिहा. Specific व्हा:

**वाईट:**
> Bot काम करणे बंद झाले.

**चांगले:**
> 1. Telegram channel configured सह Triggerfish start केले
> 2. Bot ला DM मध्ये "check my calendar for tomorrow" message पाठवला
> 3. Bot ने calendar results सह respond केले
> 4. "now email those results to alice@example.com" पाठवला
> 5. Expected: bot email send करतो
> 6. Actual: bot "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL" सह respond केला

### 3. Expected vs. Actual Behavior

काय होणे expected होते आणि प्रत्यक्षात काय झाले ते सांगा. Error message असल्यास
exact message include करा. Paraphrasing पेक्षा copy-paste चांगले.

### 4. Log Output

[Log bundle](/mr-IN/support/guides/collecting-logs) attach करा:

```bash
triggerfish logs bundle
```

Issue security-sensitive असल्यास, portions redact करू शकता, पण issue मध्ये
काय redact केले ते note करा.

किमान, relevant log lines paste करा. Events correlate करण्यासाठी timestamps include करा.

### 5. Configuration (Redacted)

तुमच्या `triggerfish.yaml` चा relevant section paste करा. **नेहमी secrets redact करा.**
Actual values placeholders सह replace करा:

```yaml
# चांगले - secrets redacted
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # keychain मध्ये stored
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol Output

```bash
triggerfish patrol
```

Output paste करा. हे system health चे quick snapshot देते.

## Issue Types

### Bug Report

Broken गोष्टींसाठी हे template वापरा:

```markdown
## Bug Report

**Environment:**
- Version:
- OS:
- Install method:

**Steps to reproduce:**
1.
2.
3.

**Expected behavior:**

**Actual behavior:**

**Error message (if any):**

**Patrol output:**

**Relevant config (redacted):**

**Log bundle:** (attach file)
```

### Feature Request

```markdown
## Feature Request

**Problem:** आज तुम्ही काय करण्याचा प्रयत्न करत आहात जे तुम्ही करू शकत नाही?

**Proposed solution:** ते कसे काम करायला हवे असे तुम्हाला वाटते?

**Alternatives considered:** तुम्ही आणखी काय try केले?
```

### Question / Support Request

तुम्हाला खात्री नसल्यास काहीतरी bug आहे का किंवा तुम्ही stuck आहात, Issues
ऐवजी [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) वापरा.
Single right answer नसू शकणाऱ्या questions साठी Discussions चांगले आहेत.

## काय Include करायचे नाही

- **Raw API keys किंवा passwords.** नेहमी redact करा.
- **Conversations मधील Personal data.** Names, emails, phone numbers redact करा.
- **Inline पूर्ण log files.** हजारो lines paste करण्याऐवजी log bundle file म्हणून attach करा.

## Filing नंतर

- **Follow-up questions साठी watch करा.** Maintainers ला अधिक information लागू शकते.
- **Fixes test करा.** Fix pushed झाल्यास, verify करण्यास सांगितले जाऊ शकते.
- **Issue close करा** तुम्हाला स्वतः solution सापडल्यास. इतरांना benefit व्हावे म्हणून solution post करा.
