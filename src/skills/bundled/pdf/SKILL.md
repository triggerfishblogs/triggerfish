---
name: pdf
version: 1.0.0
description: >
  Extract text and metadata from PDF files using the exec environment.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - run_command
  - write_file
  - read_file
network_domains:
  - registry.npmjs.org
---

# PDF Text Extraction

Extract text from PDFs using the exec environment.

## Setup (One-Time)

```
run_command: { command: "npm install pdf-parse", cwd: "{workspace}" }
```

Check if `node_modules/pdf-parse` exists before reinstalling.

## Extract Text

1. Write extraction script:
```
write_file: {
  path: "{workspace}/extract-pdf.mjs",
  content: "import fs from 'fs';\nimport pdfParse from 'pdf-parse';\nconst buf = fs.readFileSync(process.argv[2]);\nconst data = await pdfParse(buf);\nconsole.log(JSON.stringify({ pages: data.numpages, text: data.text, info: data.info }));"
}
```

2. Run on target PDF:
```
run_command: { command: "node extract-pdf.mjs /path/to/document.pdf", cwd: "{workspace}" }
```

## Specific Pages

Split by form feed (`\f`) and select ranges for large PDFs.

## Key Behaviors
- Check if pdf-parse installed before using
- PDF content inherits session classification — may be sensitive
- For 100+ page PDFs, extract specific ranges
- Garbled output = scanned/image PDF, inform user OCR is needed
- Local processing only — no network calls for extraction
