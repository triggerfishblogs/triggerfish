---
title: Unstructured Data Ingestion
description: How Triggerfish handles invoice processing, document intake, and email parsing without breaking when input formats change.
---

# Unstructured and Semi-Structured Data Ingestion

Invoice processing should be a solved problem by now. A document arrives, fields get extracted, data gets validated against existing records, and the result gets routed to the right system. The reality is that invoice processing alone costs enterprises billions in manual labor annually, and the automation projects meant to fix it break constantly.

The reason is format variance. Invoices arrive as PDFs, email attachments, scanned images, spreadsheet exports, and occasionally faxes. Each vendor uses a different layout. Line items appear in tables, in free text, or in a combination of both. Tax calculations follow different rules by jurisdiction. Currency formats vary. Date formats vary. Even the same vendor changes their invoice template without notice.

Traditional RPA handles this with template matching. Define the coordinates where the invoice number appears, where the line items start, where the total lives. It works for a single vendor's current template. Then the vendor updates their system, shifts a column, adds a header row, or changes their PDF generator, and the bot either fails outright or extracts garbage data that propagates downstream until someone catches it manually.

The same pattern repeats across every unstructured data workflow. Insurance EOB processing breaks when a payer changes their form layout. Prior authorization intake breaks when a new document type gets added to the process. Customer email parsing breaks when someone uses a slightly different subject line format. The maintenance cost of keeping these automations running often exceeds the cost of doing the work manually.

## How Triggerfish Solves This

Triggerfish replaces positional field extraction with LLM-based document understanding. The AI reads the document the way a human would: understanding context, inferring relationships between fields, and adapting to layout changes automatically. Combined with the workflow engine for pipeline orchestration and the classification system for data security, this creates ingestion pipelines that don't break when the world changes.

### LLM-Powered Document Parsing

When a document enters a Triggerfish workflow, an LLM sub-agent reads the entire document and extracts structured data based on what the document means, not where specific pixels are. An invoice number is an invoice number whether it's in the top-right corner labeled "Invoice #" or in the middle of the page labeled "Factura No." or embedded in a paragraph of text. The LLM understands that "Net 30" means payment terms, that "Qty" and "Quantity" and "Units" mean the same thing, and that a table with columns for description, rate, and amount is a line item list regardless of column order.

This isn't a generic "send the document to ChatGPT and hope for the best" approach. The workflow definition specifies exactly what structured output the LLM should produce, what validation rules apply, and what happens when extraction confidence is low. The sub-agent task description defines the expected schema, and the workflow's subsequent steps validate the extracted data against business rules before it enters any downstream system.

### Browser Automation for Document Retrieval

Many document ingestion workflows start with getting the document in the first place. Insurance EOBs live in payer portals. Vendor invoices live in supplier platforms. Government forms live on state agency websites. Traditional automation uses Selenium scripts or API calls to fetch these documents, and those scripts break when the portal changes.

Triggerfish's browser automation uses CDP-controlled Chromium with an LLM reading page snapshots to navigate. The agent sees the page the way a human does and clicks, types, and scrolls based on what it sees rather than hardcoded CSS selectors. When a payer portal redesigns their login page, the agent adapts because it can still identify the username field, the password field, and the submit button from visual context. When a navigation menu changes, the agent finds the new path to the document download section.

This isn't perfectly reliable. CAPTCHAs, multi-factor auth flows, and heavily JavaScript-dependent portals still cause problems. But the failure mode is fundamentally different from traditional scripts. A Selenium script fails silently when a CSS selector stops matching. A Triggerfish agent reports what it sees, what it tried, and where it got stuck, giving the operator enough context to intervene or adjust the workflow.

### Classification-Gated Processing

Documents carry different levels of sensitivity, and the classification system handles this automatically. An invoice containing pricing terms might be CONFIDENTIAL. A public RFP response might be INTERNAL. A document containing PHI is RESTRICTED. When the LLM sub-agent reads a document and extracts data, the POST_TOOL_RESPONSE hook classifies the extracted content, and session taint escalates accordingly.

This matters for downstream routing. Extracted invoice data classified at CONFIDENTIAL cannot be sent to a Slack channel classified at PUBLIC. A workflow that processes insurance documents containing PHI automatically restricts where the extracted data can flow. The write-down prevention rule enforces this at every boundary, and the LLM has zero authority to override it.

For healthcare and financial services specifically, this means the compliance overhead of automated document processing drops dramatically. Instead of building custom access controls into every step of every pipeline, the classification system handles it uniformly. An auditor can trace exactly which documents were processed, what data was extracted, where it was sent, and confirm that no data flowed to an inappropriate destination, all from the lineage records that get created automatically at every step.

### Self-Healing Format Adaptation

When a vendor changes their invoice template, traditional automation breaks and stays broken until someone manually updates the extraction rules. In Triggerfish, the LLM sub-agent adapts on the next run. It still finds the invoice number, the line items, and the total, because it's reading for meaning rather than position. The extraction succeeds, the data validates against the same business rules, and the workflow completes.

Over time, the agent can use cross-session memory to learn patterns. If vendor A always includes a restocking fee that other vendors don't, the agent remembers that from previous extractions and knows to look for it. If a particular payer's EOB format always puts the adjustment codes in an unusual location, the agent's memory of past successful extractions makes future ones more reliable.

When a format change is significant enough that the LLM's extraction confidence drops below the threshold defined in the workflow, the workflow routes the document to a human review queue instead of guessing. The human's corrections get fed back through the workflow, and the agent's memory stores the new pattern for future reference. The system gets smarter over time without anyone rewriting extraction rules.

### Pipeline Orchestration

Document ingestion is rarely just "extract and store." A complete pipeline fetches the document, extracts structured data, validates it against existing records, enriches it with data from other systems, routes exceptions for human review, and loads the validated data into the target system. The workflow engine handles all of this in a single YAML definition.

A healthcare prior authorization pipeline might look like this: browser automation fetches the fax image from the provider portal, an LLM sub-agent extracts patient identifiers and procedure codes, an HTTP call validates the patient against the EHR, another sub-agent assesses whether the authorization meets medical necessity criteria based on the clinical documentation, and the result gets routed either to auto-approval or to a clinical reviewer queue. Every step is classification-tracked. Every piece of PHI is taint-tagged. The complete audit trail exists automatically.

## What This Looks Like in Practice

A regional health system processes prior authorization requests from forty different provider offices, each using their own form layout, some faxed, some emailed, some uploaded to a portal. The traditional approach required a team of eight people to manually review and enter each request, because no automation tool could handle the format variance reliably.

With Triggerfish, a workflow handles the complete pipeline. Browser automation or email parsing retrieves the documents. LLM sub-agents extract the structured data regardless of format. Validation steps check the extracted data against the EHR and formulary databases. A classification ceiling of RESTRICTED ensures that PHI never leaves the pipeline boundary. Documents that the LLM cannot parse with high confidence get routed to a human reviewer, but that volume drops over time as the agent's memory builds a library of format patterns.

The eight-person team becomes two people handling the exceptions that the system flags, plus periodic quality audits of the automated extractions. Format changes from provider offices get absorbed automatically. New form layouts get handled on first encounter. The maintenance cost that consumed most of the traditional automation budget drops to near zero.
