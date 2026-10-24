# NinaivuKalanjiyam frontend

React + Vite + TypeScript app for recording elders' memories, reviewing transcripts, building a timeline and life story, and exporting them. The UI is bilingual (Tamil and English).

## Run

```
npm install
npm run dev:mock   # prototype on fake data, no backend needed
npm run dev        # real backend at VITE_API_URL (default http://localhost:5002/api)
npm test           # vitest
npm run build      # type-check and production build
```

## Mock or real

`src/services/index.ts` picks the data layer. When `VITE_USE_MOCK` is `true` (set by `--mode mock`, see `.env.mock`) it exports `mockApi`, which reads and writes `mockData`/`mockStore` in memory. Otherwise it exports the real `api.ts` client. Pages only import from `services/index.ts`.

In mock mode a page reload resets all demo data (new elders, saved takes, consent).

Add `?mockError=<functionName>` to any URL in mock mode (for example `?mockError=getAllRecordings`) to make that call fail, so error states can be checked.

## API gaps

Fields and endpoints the new UI needs that the backend does not provide yet are listed in `../docs/superpowers/specs/ui-redesign-api-gaps.md`. They are marked `TODO(api)` in the source.
