# ServiceNow Exam Trainer

ServiceNow資格試験の学習用トレーナーです。

最初の対応資格は **CIS-DF (Data Foundations / CMDB and CSDM)** です。試験エンジンと資格固有データを分離し、CSA / CAD / CIS-ITSM などを試験データ追加で拡張できる構成です。

## Current version

- App: 0.4.0
- CIS-DF question content: v4
- CIS-DF bank: 100 questions (official-source mapped; matching supported)
- Delivery: installable PWA
- Storage: local only
- Update: app and exam data are automatically refreshed on startup when online; cached content is used offline

## Study modes

- Domain practice
- Random practice
- Blueprint-weighted mock exam
- Drag/drop + tap-to-match practice
- Wrong-answer review
- Official ServiceNow evidence link after each answer
- Overall/domain accuracy tracking

## Principles

1. Documentation first
2. TDD
3. Minimal implementation
4. Remove dead code and documentation drift

## Development

```bash
npm install
npm test
npm run build
npm run dev
```

Current matching support work is tracked in Issue #8.
