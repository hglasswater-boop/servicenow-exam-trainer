# CIS-DF Blueprint

Source of truth: ServiceNow Now Learning Knowledge Portal, **Certified Implementation Specialist - Data Foundations (CMDB and CSDM) Exam - Mainline Blueprint**, updated November 2025.

Official source:
https://nowlearning.servicenow.com/kb?id=kb_article_view&sysparm_article=KB0012913

Last verified: 2026-10-07.

## Exam structure

- Duration: 90 minutes
- Items: 75
- Item types:
  - Multiple Choice (single answer)
  - Multiple Select
  - Drag/Drop / Matching
  - Scenario-based items
- Partial credit is not awarded for multiple-select or drag/drop items.
- Official matching semantics:
  1. one-to-one lists with equal item counts,
  2. more target options than source items so some targets remain unused,
  3. multiple source items may map to the same target.
- Every source item has exactly one correct target.

## Domains

| Domain | Weight | Primary blueprint objectives |
|---|---:|---|
| Configuration | 15% | CI Class Manager; IRE; CMDB 360 / multisource CMDB |
| Ingest | 19% | Relationships; ingestion methods; automation; upgradeability; manual/non-discoverable CIs; compliance identifiers; Asset/CI alignment |
| Govern | 35% | CMDB Health; Data Manager; governance roles; duplicate remediation; CMDB Workspace; principal classes; data quality/compliance; lifecycle |
| Insight | 20% | CMDB business value; natural-language and saved queries; complex relationship queries; Unified Map / dependency views; Data Foundations dashboards/playbooks |
| CSDM Fundamentals | 11% | Stakeholder mapping to CSDM domains; adoption approach; CSDM benefits |
| **Total** | **100%** | |

## Product implications

- Mock mode uses the official domain weights.
- Govern is the largest domain and receives the most practice coverage.
- The engine stores weight as data; it does not know CIS-DF-specific domain names.
- Scenario/application questions are preferred over vocabulary-only recall.
- Official exam questions, paid practice questions, and exam dumps are not copied into this repository.

## Question-bank quality target

The initial production bank contains 100 questions with exact coverage:

- Configuration: 15
- Ingest: 19
- Govern: 35
- Insight: 20
- CSDM Fundamentals: 11
- At least 60% scenario-oriented questions.
- Every question maps to a Blueprint objective.
- Every question includes an official ServiceNow source URL.
- Every domain contains single-select, multiple-select, and matching practice.
- Matching questions collectively cover the three official matching patterns.
- Matching is scored all-or-nothing, matching the official no-partial-credit rule.

## Versioning rule

Before materially expanding the CIS-DF bank, compare this document with the current ServiceNow blueprint. If ServiceNow changes the exam definition, update this document and `exam.json` before changing implementation.
