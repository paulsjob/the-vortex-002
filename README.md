# Renderless Studio (Reset Baseline)

This repository has been reset to a clean Vite + React + TypeScript baseline.

## Why

The previous build had too much broken surface area. This baseline keeps only:

- a small app shell,
- one tiny domain helper (`createTemplateDraft`),
- one focused test file.

From here, new features can be reintroduced deliberately.

## Run

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

## Validation

```bash
npm run test
npm run build
```
