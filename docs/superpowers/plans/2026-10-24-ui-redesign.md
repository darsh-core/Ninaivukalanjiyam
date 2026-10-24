# UI Redesign (Clickable Mock Prototype) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old frontend with the redesigned, narrator-centred UI as a clickable prototype that runs entirely on fake data, but calls a data layer identical to `services/api.ts`, so it can later be switched to the real backend.

**Architecture:** Screens import data functions only from `src/services/index.ts`, which forwards to `mockApi.ts` (in-memory store seeded from `mockData.ts`) when `VITE_USE_MOCK=true`, otherwise to the real `api.ts`. TypeScript enforces that the mock exports the same functions as the real API. UI is built from a small set of shared components styled with CSS Modules on top of design tokens. React Router gives every screen a URL.

**Tech Stack:** React 19, TypeScript ~6, Vite 8, react-router-dom 7, lucide-react, CSS Modules, Vitest + @testing-library/react + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-24-ui-redesign-design.md` (read it before any task; it holds the palette, type scale, flow and the decisions cited below).

## Global Constraints

- Work only in `frontend/`; no backend changes. Branch `ui-redesign`.
- Palette: Parchment `#F6EFE4`, Paper `#FFFBF5`, Border `#E2D4C1` / `#E8DCCB`, Terracotta `#B4532A`, Turmeric `#D9A441`, Ink `#3B2A20`, Muted `#8A7565`; status saved `#3F6B34` on `#E5EFDF`, needs review `#7A5410` on `#F7E6BF`, failed `#9A2F14` on `#F8DCD3`.
- Fonts: Noto Serif Tamil (display, headings, interview question), Mukta Malar (body, labels, buttons), Kavivanar (short handwritten notes only; never buttons, questions or transcripts).
- Type scale (desktop / phone px): Display 32/26 · Question 26/22 · Heading 20/18 · Body 17/17, line height 1.65 · Caption 14/14 (no text below 14px) · Button 16/17, tap target ≥ 48px tall.
- Light touch only: soft rounded paper cards (14–18px radius), pill buttons, PhotoFrame with washi tape, at most one HandNote per card, a cassette window only in the recorder. No paper grain, ornaments, tilted elements or sticker badges.
- Tamil-first. English toggle = English labels + English helper text under Tamil content where a translation exists. Questions are always spoken in Tamil.
- Every status shows a word, never colour alone.
- Respect `prefers-reduced-motion` (reels and level meter stop animating).
- Must work at 375px width with no horizontal page scroll, and on desktop.
- Screens never fetch or build fake data themselves; they import from `src/services` only.
- Each new backend-missing field gets a `// TODO(api):` comment; each missing function is listed in `docs/superpowers/specs/ui-redesign-api-gaps.md`.

## Review Focus

- **Refresh mid-interview:** reloading `/interview/:sessionId?q=3` must reopen question 3 with its saved take. Test in Task 9.
- **Leaving a question with an unsaved take** (Next, a question-list tap, Back): the user must confirm before the take is discarded. Test in Task 9.
- **English toggle on content with no translation:** show the Tamil only, never "undefined", "null" or an empty gap. Test in Task 3 (`Bi`).
- **Real-API mode hitting a stub** (`NotAvailableError` from consent / topic progress / ZIP / sourced story): show a calm "not available yet" state, never a crash or blank screen. Tests in Tasks 8 and 12.
- **Microphone unavailable** (HTTP page, no `mediaDevices`, permission denied): the recorder must explain why and offer the native audio-capture fallback. Test in Task 4.

---

## File Structure

```
frontend/
  .env.mock                         VITE_USE_MOCK=true
  vitest.config.ts                  jsdom, setupFiles, env VITE_USE_MOCK=true
  public/mock-audio/sample-1.wav    copied from database/seed_recordings/sample_narration.wav
  src/
    test/setup.ts                   jest-dom, MediaRecorder/getUserMedia fakes helpers
    services/
      api.ts                        (modify) add stub functions + NotAvailableError
      errors.ts                     NotAvailableError
      mockApi.ts                    same exports as api.ts
      mockData.ts                   seed data
      mockStore.ts                  in-memory store + controls (reset, delay, error flag)
      index.ts                      the switch
    types/index.ts                  (modify) optional TODO(api) fields + new types
    styles/tokens.css, global.css
    context/AppContext.tsx          (rewrite) language, tr, toast
    context/AuthContext.tsx         (modify) import from services
    ui/                             shared components, one folder each: Button, Card, PhotoFrame,
                                    HandNote, StatusLabel, Field, EmptyState, Tabs, PageHeader,
                                    Toast, Bi, AudioPlayer, TapeRecorder, NotAvailable
    layouts/AppLayout.tsx           header (logo, language toggle, menu) + Outlet
    layouts/ElderLayout.tsx         calm header (exit + language only) + Outlet
    pages/
      SignInPage.tsx  WelcomePage.tsx  FamilyHomePage.tsx  ElderFormPage.tsx
      elder/ElderPage.tsx  elder/InterviewsSection.tsx  elder/RecordingsSection.tsx
      elder/TimelineSection.tsx  elder/StorySection.tsx  elder/ExportSection.tsx
      interview/TopicsPage.tsx  interview/ConsentPage.tsx
      interview/InterviewPage.tsx  interview/SessionDonePage.tsx
      export/PodcastPlayer.tsx
    App.tsx, main.tsx               (rewrite) routes
```

Tests sit next to their file as `*.test.ts(x)`.

---

### Task 1: Test tooling and the data-layer switch

**Files:**
- Create: `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`, `frontend/.env.mock`, `frontend/src/services/errors.ts`, `frontend/src/services/index.ts`, `frontend/src/services/mockApi.ts` (skeleton), `frontend/src/services/switch.test.ts`
- Modify: `frontend/package.json`, `frontend/src/services/api.ts`, `frontend/src/types/index.ts`

**Interfaces:**
- Produces:
  - `class NotAvailableError extends Error { feature: string }` in `services/errors.ts`
  - New types in `types/index.ts`: `ConsentRecord { narrator_id: string; consent_text_version: string; consented_at: string }`, `TopicProgress { life_stage: string; total: number; answered: number }`, `ArchiveKind = 'audio' | 'transcripts' | 'full'`, `ArchiveExport { kind: ArchiveKind; status: 'ready'; download_url: string; size_bytes: number }`
  - Optional `// TODO(api):` fields: `Transcript.job_status?: 'queued' | 'processing' | 'done' | 'needs_review' | 'failed'`, `Recording.transcript_job_status?` (same union), `Narrator.photo_frame_note?: string | null` (the handwritten "next up" note)
  - New functions in **both** `api.ts` (stub: `throw new NotAvailableError('<name>')`) and `mockApi.ts`:
    - `getConsent(narratorId: string): Promise<ConsentRecord | null>`
    - `recordConsent(narratorId: string, consentTextVersion: string): Promise<ConsentRecord>`
    - `getTopicProgress(narratorId: string): Promise<TopicProgress[]>`
    - `generateStoryDraftFromSources(narratorId: string, languageCode: string, sources: { eventIds: string[]; recordingIds: string[] }): Promise<StoryDraft>`
    - `createArchiveExport(narratorId: string, kind: ArchiveKind): Promise<ArchiveExport>`
  - `services/index.ts` exports every function name exported by `api.ts`, chosen by `import.meta.env.VITE_USE_MOCK === 'true'`, and a constant `IS_MOCK: boolean`.
  - npm scripts: `"test": "vitest run"`, `"dev:mock": "vite --mode mock"`.

- [ ] **Step 1:** Install dev dependencies `vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`, and the dependency `react-router-dom@7`. Add the two npm scripts. Write `.env.mock` with `VITE_USE_MOCK=true`. Configure `vitest.config.ts` (jsdom environment, `setupFiles: ['src/test/setup.ts']`, `env: { VITE_USE_MOCK: 'true' }`, CSS modules enabled).

- [ ] **Step 2: Write the failing test** `src/services/switch.test.ts`

```ts
import * as real from './api';
import * as mock from './mockApi';
import * as services from './index';
import { NotAvailableError } from './errors';

test('mockApi exports exactly the same functions as api', () => {
  const fns = (m: object) => Object.keys(m).filter(k => typeof (m as any)[k] === 'function' && k !== 'NotAvailableError').sort();
  expect(fns(mock)).toEqual(fns(real));
});
test('services forwards to the mock when VITE_USE_MOCK is true', () => {
  expect(services.IS_MOCK).toBe(true);
  expect(services.getNarrators).toBe(mock.getNarrators);
});
test.each(['getConsent', 'getTopicProgress'])('real %s is a stub that throws NotAvailableError', async (name) => {
  await expect((real as any)[name]('n1')).rejects.toBeInstanceOf(NotAvailableError);
});
```

- [ ] **Step 3:** Run `npx vitest run src/services/switch.test.ts`. Expected: FAIL (modules missing).

- [ ] **Step 4:** Implement `errors.ts`, the stubs in `api.ts`, the new types and fields, a `mockApi.ts` skeleton in which every function exists with the right signature (bodies may `throw new Error('mock: not implemented')` until Task 2), and `index.ts`. In `index.ts` add a compile-time check `const _check: typeof real = mock;` so signature drift fails `tsc`.

- [ ] **Step 5:** Run `npx vitest run src/services/switch.test.ts` and `npx tsc -b`. Expected: PASS, no type errors.

- [ ] **Step 6:** Commit: `feat(frontend): add mock/real data-layer switch and test tooling`.

---

### Task 2: Mock store, seed data and mock behaviour

**Files:**
- Create: `src/services/mockData.ts`, `src/services/mockStore.ts`, `src/services/mockApi.test.ts`, `public/mock-audio/sample-1.wav`
- Modify: `src/services/mockApi.ts`

**Interfaces:**
- Consumes: Task 1 types and function list.
- Produces (`mockStore.ts`, **not** exported from `mockApi`): `resetMockStore(): void` (restore seed data), `setMockDelay(ms: number): void` (default random 300–800ms; tests use 0), `getMockErrorFlag(): string | null` (reads `?mockError=<fnName>` from `window.location.search`; the named function rejects with `Error('Mock error: <fnName>')`).
- Seed data (`mockData.ts`), with ids stable so tests can reference them:
  - `n-rajeshwari`: ராஜேஸ்வரி பாட்டி / Rajeshwari, preferred name பாட்டி, birth year 1948, Erode, consent recorded, two sessions (`s-r1` completed, `s-r2` in_progress at question 3 of 8), recordings covering every `transcript_job_status`, a timeline with every `extraction_status`, one Tamil life-story draft with three chapters.
  - `n-shanmugam`: சண்முகம் தாத்தா, Madurai, one completed session, two recordings, no consent recorded (so the consent screen shows).
  - `n-new`: a narrator with no sessions (empty states).
  - A question bank of at least four life stages (குழந்தைப் பருவம் / Childhood, பள்ளி நாட்கள் / School, வேலை / Work, குடும்பம் / Family), each with 4–6 questions with `question_english`.
- Mock behaviour rules: `uploadRecordingBlob` makes the new recording active (the previous take stays with `is_active: false`), sets the question `answered`, and adds a v1 transcript with `job_status: 'queued'`. `updateTranscript` adds version N+1 with `source: 'corrected'`. `getAudioUrl(key)` returns an object URL for blobs uploaded this session, otherwise `/mock-audio/sample-1.wav`. `getTopicProgress` counts per `life_stage`. `synthesizeSpeech` rejects, so callers use the browser speech fallback. `createArchiveExport` resolves `{ status: 'ready', download_url: '#mock-download' }`.

- [ ] **Step 1: Write the failing tests** `src/services/mockApi.test.ts` (call `resetMockStore()` and `setMockDelay(0)` in `beforeEach`):
  - `createNarrator` with a Tamil name → `getNarrators()` contains it.
  - `uploadRecordingBlob('<a pending question id in s-r2>', new Blob(['x']), 12)` → `getSessionById('s-r2')` shows that question `answered` with `recording_version` 1; uploading again gives version 2, and `getAllRecordings({ session_id: 's-r2' })` returns only the active take for that question.
  - `updateTranscript(id, 'new text')` → `getTranscriptsByRecording` length grows by 1, and the newest is `source: 'corrected'`.
  - `getTopicProgress('n-rajeshwari')` → every seeded life stage appears and `answered <= total`.
  - `getConsent('n-shanmugam')` → `null`; after `recordConsent('n-shanmugam','v1')` → not null.
  - With `window.history.replaceState({}, '', '/?mockError=getNarrators')` → `getNarrators()` rejects with `'Mock error: getNarrators'`.

- [ ] **Step 2:** Run `npx vitest run src/services/mockApi.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `mockData.ts`, `mockStore.ts` and every `mockApi.ts` function against the store (deep-copy on read, so screens can't mutate the store). Copy the sample WAV into `public/mock-audio/`.
- [ ] **Step 4:** Run the tests again. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): in-memory mock API with seed family data`.

---

### Task 3: Design tokens, language context and base UI components

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/ui/<Component>/<Component>.tsx` + `.module.css` for Button, Card, PhotoFrame, HandNote, StatusLabel, Field, EmptyState, Tabs, PageHeader, Toast, Bi, NotAvailable; `src/ui/ui.test.tsx`
- Modify: `index.html` (load Noto Serif Tamil 500/700, Mukta Malar 400/600/700, Kavivanar), `src/context/AppContext.tsx` (rewrite)

**Interfaces:**
- Produces:
  - `useApp(): { lang: 'ta' | 'en'; setLang(l: 'ta' | 'en'): void; tr(ta: string, en: string): string; showToast(msg: string, kind?: 'success' | 'error' | 'info'): void }`. `lang` is persisted in localStorage key `nk_ui_lang` (wrapped in try/catch); default `'ta'`.
  - `<Button variant="primary" | "secondary" | "text" size="md" | "lg" ...buttonProps>` (`lg` is at least 56px tall, for elder screens)
  - `<Card as?>`, `<PhotoFrame initials: string photoUrl?: string | null size?: 'sm' | 'lg'>`, `<HandNote>{text}</HandNote>`
  - `<StatusLabel status: 'saved' | 'needs_review' | 'failed' | 'queued' | 'processing' | 'in_progress' | 'completed' | 'paused' | 'confirmed' | 'rejected' />`, which renders a Tamil/English word plus colour (`confirmed` uses the saved colours, `rejected` the failed colours)
  - `<Field label: string>{input}</Field>`, `<EmptyState title body? action?>`, `<Tabs items: {to: string; label: string}[]>` (NavLink-based, horizontally scrollable), `<PageHeader title subtitle? actions?>`, `<Toast/>`
  - `<Bi ta: string en?: string | null as?: 'question' | 'body' | 'heading' />`: always shows `ta`; when `lang === 'en'` and `en` is non-empty, shows `en` underneath in muted helper style
  - `<NotAvailable feature: string />`: the calm "விரைவில் கிடைக்கும் · Not available yet" panel used when a call rejects with `NotAvailableError`
  - `tokens.css` defines `--color-*` (palette), `--font-serif`, `--font-sans`, `--font-hand`, `--fs-display|question|heading|body|caption|button` (desktop values, with a `@media (max-width: 640px)` override to the phone values), `--radius-card: 16px`, `--radius-pill: 999px`, `--shadow-card: 0 2px 10px rgba(59,42,32,.08)`, `--tap: 48px`.

- [ ] **Step 1: Write the failing tests** `src/ui/ui.test.tsx`:
  - `Bi` with `ta="கேள்வி" en={null}` in English mode renders "கேள்வி" and the text content contains neither "null" nor "undefined".
  - `Bi` with `ta="கேள்வி" en="Question"` shows "Question" only after `setLang('en')`.
  - `StatusLabel` for each of `saved`, `needs_review` and `failed` renders a non-empty text label in both languages.
  - `tr('தமிழ்','English')` returns the Tamil string by default and the English one after `setLang('en')`, and the choice survives a remount (localStorage).
- [ ] **Step 2:** Run `npx vitest run src/ui/ui.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement the tokens, global styles (body background Parchment, ink text, body font, `overflow-wrap: anywhere` on text containers so long Tamil words never cause horizontal scroll) and the components. No inline layout styles.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): design tokens, language context and base components`.

---

### Task 4: TapeRecorder component

**Files:**
- Create: `src/ui/TapeRecorder/TapeRecorder.tsx`, `TapeRecorder.module.css`, `useRecorder.ts`, `TapeRecorder.test.tsx`
- Modify: `src/test/setup.ts` (helpers `installFakeMediaRecorder()` and `removeMediaDevices()`)

**Interfaces:**
- Consumes: Button, Task 3 tokens and `useApp().tr`.
- Produces: `<TapeRecorder onSave: (blob: Blob, durationSeconds: number) => Promise<void> disabled?: boolean onDirtyChange?: (dirty: boolean) => void size?: 'lg' />`, with states `idle | recording | paused | recorded | saving | saved | error`. `useRecorder()` holds the MediaRecorder logic: pick a MIME type from `['audio/webm;codecs=opus','audio/webm','audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/aac','audio/ogg;codecs=opus']`, and track elapsed time across pauses.
- Visual: a dark-brown cassette window (`#2E1F17`) with two reels and a 7-bar level meter, both animated only while `recording` and not under `prefers-reduced-motion`. Below it sit large pill buttons: idle → "● பதிவைத் தொடங்கு"; recording → Pause and Stop; recorded → an `<audio controls>` preview plus "சேமி / Save" and "மீண்டும் பதிவு / Record again" (asks for confirmation before discarding).
- Mic unavailable (`!window.isSecureContext`, no `navigator.mediaDevices`, or `getUserMedia` rejects): show the specific reason (HTTPS needed / permission denied / no microphone / unsupported) **and** a "📱 போனின் குரல் பதிவியைப் பயன்படுத்து · Use phone's voice recorder" button backed by `<input type="file" accept="audio/*" capture>`. A chosen file goes to the same `recorded` preview state.
- While dirty, register a `beforeunload` warning.

- [ ] **Step 1: Write the failing tests** `TapeRecorder.test.tsx` (with the fake MediaRecorder):
  - Click Start → status text "பதிவாகிறது" is visible; Pause → "இடைநிறுத்தப்பட்டது"; Stop → the Save button is visible.
  - Save → `onSave` is called once with a `Blob` and a number ≥ 0, then the "சேமிக்கப்பட்டது" text appears.
  - `onSave` rejects → the error text is shown and the Save button is still available (the take is kept).
  - **Review Focus:** with `removeMediaDevices()` and `isSecureContext=false`, Start shows the HTTPS message, and an `input[type=file][accept="audio/*"]` is in the document.
  - "Record again" when recorded → calls `window.confirm`; if it is declined, the preview stays.
- [ ] **Step 2:** Run `npx vitest run src/ui/TapeRecorder`. Expected: FAIL.
- [ ] **Step 3:** Implement `useRecorder` and `TapeRecorder`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): tape-recorder style recorder with native capture fallback`.

---

### Task 5: App shell, routing and sign-in

**Files:**
- Create: `src/layouts/AppLayout.tsx`, `src/layouts/ElderLayout.tsx` (+ CSS modules), `src/pages/WelcomePage.tsx`, `src/pages/SignInPage.tsx`, `src/App.test.tsx`
- Modify: `src/App.tsx`, `src/main.tsx` (wrap in `BrowserRouter`), `src/context/AuthContext.tsx` (import `loginUser` / `registerUser` from `services`)

**Interfaces:**
- Consumes: `useApp`, `useAuth`, Task 3 components.
- Produces routes (each page imported from its later task; until that task lands, use a placeholder page that shows the route name):
  - Public: `/welcome`, `/signin`
  - `AppLayout` (requires auth): `/`, `/elders/new`, `/elders/:id/edit`, `/elders/:id/:section` (`section ∈ interviews | recordings | timeline | story | export`; `/elders/:id` redirects to `interviews`)
  - `ElderLayout` (requires auth): `/elders/:id/topics`, `/elders/:id/consent`, `/interview/:sessionId`, `/interview/:sessionId/done`
  - An unknown path redirects to `/`. Unauthenticated users go to `/welcome`, and after sign-in return to where they came from.
- AppLayout header: app name "நினைவுக் களஞ்சியம்" (serif) linking to `/`, the language toggle, and a menu with Help and Sign out. ElderLayout header: only an "← வெளியேறு / Exit" link and the language toggle.
- In mock mode, sign-in accepts any email and password (mock `loginUser`), and a small "Demo data" badge shows in the header (`IS_MOCK`).

- [ ] **Step 1: Write the failing tests** `App.test.tsx` (MemoryRouter):
  - An unauthenticated visit to `/` renders the Welcome page.
  - Signing in through `/signin` lands on `/` (Family home placeholder) and shows the "Demo data" badge.
  - `/elders/n-rajeshwari/topics` renders the Exit link and **not** the app menu.
- [ ] **Step 2:** Run `npx vitest run src/App.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implement the layouts, routes, Welcome (one line about the archive, plus Sign in / Create family account) and SignIn (email and password; a toggle to create an account with a name field).
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): routing, app and elder layouts, sign-in`.

---

### Task 6: Family home and the add/edit elder form

**Files:**
- Create: `src/pages/FamilyHomePage.tsx`, `src/pages/ElderFormPage.tsx` (+ CSS modules), `src/pages/family.test.tsx`

**Interfaces:**
- Consumes: `getNarrators`, `getAllSessions`, `getNarratorById`, `createNarrator`, `updateNarrator`; PhotoFrame, HandNote, Card, Button, EmptyState, Field.
- Produces: none for later tasks (pages only).
- Family home: title "எங்கள் குடும்பம் · Our family". When any narrator has an `in_progress` or `paused` session, the top shows a large Continue card ("▶ நேர்காணலைத் தொடர் · Continue interview: <narrator> — <session title>") linking to `/interview/<id>`. Below it is a grid of narrator cards (PhotoFrame + name + hometown + counts + an optional HandNote from `photo_frame_note`) linking to `/elders/:id`, and a "+ குடும்பப் பெரியவரைச் சேர் · Add a family elder" card. On phones the grid is one column.
- Elder form fields: Tamil name, English name (at least one is required), form of address, optional photo (file input; keep it as a data URL in `profile_photo_url`), approximate birth year (optional), hometown, spoken language (ta / ta-en / en) and dialect. Save goes to `/elders/:id/interviews`.

- [ ] **Step 1: Write the failing tests** `family.test.tsx` (mock services, delay 0):
  - Home lists ராஜேஸ்வரி பாட்டி and சண்முகம் தாத்தா, and shows the Continue card naming ராஜேஸ்வரி.
  - Submitting the form with both names empty shows a validation message and does not call `createNarrator`.
  - Submitting with a Tamil name navigates to `/elders/<newId>/interviews`, and the name then appears on home.
  - With `?mockError=getNarrators`, home shows an error message with a retry button, not a blank page.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement both pages, including loading skeletons.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): family home and elder form`.

---

### Task 7: Elder page hub and the Interviews section

**Files:**
- Create: `src/pages/elder/ElderPage.tsx`, `src/pages/elder/InterviewsSection.tsx` (+ CSS modules), `src/pages/elder/elder.test.tsx`

**Interfaces:**
- Consumes: `getNarratorById`, `getAllSessions`, `getTopicProgress`; Tabs, PhotoFrame, StatusLabel, NotAvailable.
- Produces: `ElderPage` renders the section matching `:section` with `narratorId` as a prop: `<XSection narratorId: string />` (Tasks 10–12 provide Recordings, Timeline, Story and Export).
- Hub header: a large PhotoFrame, the name (Display size), hometown and birth year, a life-stage progress strip from `getTopicProgress` (one small bar per stage; on `NotAvailableError`, hide the strip silently), a big "Start interview" or "Continue interview" button (Continue when an unfinished session exists → `/interview/<id>`; otherwise → `/elders/:id/topics`), a "🎧 கேள் · Listen" button → `/elders/:id/export#podcast`, and Edit details → `/elders/:id/edit`. Tabs: நேர்காணல்கள் · Interviews / நினைவுகள் · Recordings / காலவரிசை · Timeline / வாழ்க்கைக் கதை · Life story / பகிர் · Export.
- Interviews section: sessions, newest first, as cards (title, StatusLabel, answered/total, last activity), with Continue/Open.

- [ ] **Step 1: Write the failing tests** `elder.test.tsx`:
  - `/elders/n-rajeshwari/interviews` shows "Continue interview" linking to `/interview/s-r2`, and both sessions.
  - `/elders/n-new/interviews` shows an empty state and a "Start interview" link to `/elders/n-new/topics`.
  - When `getTopicProgress` is mocked to reject with `NotAvailableError`, the page still renders the name and tabs (no crash).
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the hub and the section.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): elder hub page and interviews section`.

---

### Task 8: Topic picker and consent

**Files:**
- Create: `src/pages/interview/TopicsPage.tsx`, `src/pages/interview/ConsentPage.tsx` (+ CSS modules), `src/pages/interview/topics.test.tsx`

**Interfaces:**
- Consumes: `getQuestionBank`, `getTopicProgress`, `getAllSessions`, `createSession`, `addQuestionToSession`, `getConsent`, `recordConsent`, `getSessionById`.
- Produces: the flow rule (spec "Interview model"). Choosing a topic finds the elder's unfinished session or creates one (`createSession({ narrator_id, title: <life stage Tamil>, interview_mode: 'structured', preferred_language: 'ta' })`), adds that life stage's bank questions not yet answered by this elder (`addQuestionToSession(sessionId, { question_tamil, question_english, question_id, question_type: 'structured' })`), then goes to `/elders/:id/consent?next=/interview/<sessionId>`. ConsentPage redirects straight to `next` if `getConsent` returns a record.
- Topics: large cards (Question-size Tamil title, English helper via `Bi`, "N கேள்விகள் மீதம் · N questions left"). Fully answered topics are shown dimmed with ✓ but stay selectable.
- Consent: addresses the elder by their form of address. Plain Tamil text (with English helper) explains that their voice is recorded and kept privately for the family, and that a computer service turns speech into text. A "🔊 கேள்" button reads it aloud (browser speech, `ta-IN`). One large "நான் ஒப்புக்கொள்கிறேன் · I agree" button calls `recordConsent(narratorId, 'v1')`, then navigates to `next`; "இப்போது வேண்டாம் · Not now" goes back to the elder page. The consent text version constant `CONSENT_TEXT_VERSION = 'v1'` is exported from `ConsentPage.tsx`.

- [ ] **Step 1: Write the failing tests** `topics.test.tsx`:
  - The topics page for `n-shanmugam` lists every seeded life stage with a "questions left" count.
  - Choosing a topic for `n-shanmugam` (no consent yet) lands on the consent page; clicking "I agree" calls `recordConsent('n-shanmugam','v1')` and lands on `/interview/<id>`.
  - Choosing a topic for `n-rajeshwari` (consent on record) skips consent and adds questions to `s-r2` rather than creating a new session.
  - **Review Focus:** when `getConsent` rejects with `NotAvailableError`, the consent page still shows the explanation and "I agree" (it can't know the state, so it asks), and "I agree" failing with `NotAvailableError` still navigates on with a toast "ஒப்புதல் பதிவு இன்னும் இல்லை · Consent saving not available yet".
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement both pages.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): topic picker and consent screens`.

---

### Task 9: Interview question screen and session done

**Files:**
- Create: `src/pages/interview/InterviewPage.tsx`, `src/pages/interview/SessionDonePage.tsx`, `src/pages/interview/MoreSheet.tsx` (+ CSS modules), `src/pages/interview/interview.test.tsx`

**Interfaces:**
- Consumes: `getSessionById`, `uploadRecordingBlob`, `updateQuestionStatus`, `updateSessionStatus`, `addQuestionToSession`, `getAIFollowUpQuestions`, `synthesizeSpeech`, `getAudioUrl`; TapeRecorder, AudioPlayer, Bi, Button.
- Produces: nothing for later tasks.
- Layout (elder-friendly, ElderLayout): a small "கேள்வி 3 / 8 · <topic>" line, the question in Question size (`Bi as="question"`), "🔊 கேள்வியைக் கேள் · Hear the question" (`synthesizeSpeech`, falling back to browser speech `ta-IN`; always Tamil) plus a slow/normal speed choice, then the TapeRecorder (`size="lg"`, `disabled` while speech is playing). If the question already has a saved take: the saved answer (AudioPlayer + transcript snippet + StatusLabel) and "இன்னொரு பதிவு · Record another take (previous kept)". Bottom: large "← முந்தையது" and "அடுத்தது →".
- "⋯ மேலும் · More" opens a sheet (family actions): skip / don't remember (`updateQuestionStatus(id,'skipped')`), AI follow-up suggestions (`getAIFollowUpQuestions`; each can be added with `addQuestionToSession(... question_type: 'follow_up')`), write your own question, the question list (jump to any), Pause & leave (`updateSessionStatus(id,'paused')` → elder page), and Finish (`'completed'` → done page).
- The URL holds the position: `?q=N` (1-based). Without `q`, open the first question that is not answered or skipped, and write `q` into the URL with `replace`.
- Session done page: a large "நன்றி, <form of address>!", "இன்று N நினைவுகளைப் பகிர்ந்தீர்கள் · You shared N memories today" (N = answered in this session), a line that text conversion happens in the background, and buttons to go back to the elder page or continue another topic.

- [ ] **Step 1: Write the failing tests** `interview.test.tsx`:
  - `/interview/s-r2` with no `q` opens the first unanswered question, and the location search becomes `?q=<that index>`.
  - **Review Focus:** rendering `/interview/s-r2?q=1` (an answered question) shows its saved take (an AudioPlayer) and "Record another take", which simulates a refresh restoring the place.
  - Recording and saving a take calls `uploadRecordingBlob` with that question's id, and the question then shows as saved.
  - **Review Focus:** with an unsaved take (recorder dirty), clicking Next calls `window.confirm`; declining keeps the same `q`.
  - More → Finish navigates to `/interview/s-r2/done`, which shows the answered count.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement the interview page, the sheet and the done page.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): elder-friendly interview and session done screens`.

---

### Task 10: Recordings & transcripts section

**Files:**
- Create: `src/pages/elder/RecordingsSection.tsx` (+ CSS module), `src/pages/elder/recordings.test.tsx`; restyle `src/ui/AudioPlayer/AudioPlayer.tsx` (moved from `components/AudioPlayer.tsx`, same props `{ storageKey: string; durationSeconds?: number; title?: string; showDownload?: boolean }`, using `getAudioUrl` from `services`)

**Interfaces:**
- Consumes: `getAllRecordings`, `getTranscriptsByRecording`, `updateTranscript`, `regenerateTranscript`, `getAudioUrl`; StatusLabel, Bi, AudioPlayer.
- Layout: grouped by session (newest first). Each answer card shows the question (`Bi`), take number, date, AudioPlayer, a transcript StatusLabel from `transcript_job_status` (default to `saved` when the transcript is reviewed, otherwise `needs_review` when the field is absent), and the transcript (`Bi` with `transcript_text` / `transcript_text_english`). Actions: Edit (textarea → `updateTranscript`, with a note "saving keeps earlier versions"), Re-transcribe, and Version history (an expandable list of versions with source and date).

- [ ] **Step 1: Write the failing tests:** recordings for `n-rajeshwari` are grouped under both session titles; each seeded job status renders its label word; editing and saving a transcript increases the version-history count by one.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): recordings and transcript review section`.

---

### Task 11: Timeline section and Life story section

**Files:**
- Create: `src/pages/elder/TimelineSection.tsx`, `src/pages/elder/StorySection.tsx` (+ CSS modules), `src/pages/elder/timeline-story.test.tsx`

**Interfaces:**
- Consumes: `getTimelineByNarrator`, `updateLifeEventStatus`, `deleteLifeEvent`, `createLifeEvent`, `extractMemoriesWithAI`, `getStoryDrafts`, `updateStoryDraft`, `generateStoryDraftFromSources`; Bi, StatusLabel, NotAvailable, AudioPlayer.
- Timeline: a vertical timeline ordered by `approximate_year` (unknown dates in a final "தேதி தெரியாதவை · Date unknown" group). Each memory shows title and description (`Bi` with `title_tamil` / `title_english` and `description` / `description_english`), place, a StatusLabel mapped from `extraction_status` (`unreviewed` → needs_review), the source excerpt and a source-audio player when `storage_key` is present, and Confirm / Reject / Delete (delete asks for confirmation). Plus "+ Add memory" and an explicit "எழுத்துப்படிகளிலிருந்து கண்டறி · Find memories in transcripts (AI)" button. Nothing runs automatically on load.
- Life story: a banner "இது AI உருவாக்கிய வரைவு · AI-generated draft, not verified history". "Create a new draft" opens a chooser listing confirmed memories and recordings with checkboxes (all checked by default) and a language choice, then calls `generateStoryDraftFromSources`; on `NotAvailableError` it shows `NotAvailable`. Chapters are shown in serif headings, each editable (textarea → `updateStoryDraft`). There's a picker when several drafts exist.

- [ ] **Step 1: Write the failing tests:** the timeline puts a seeded event with no year under "Date unknown"; Confirm changes its label to the confirmed word; the story chooser passes the checked event ids to `generateStoryDraftFromSources`; **Review Focus:** when `generateStoryDraftFromSources` rejects with `NotAvailableError`, the `NotAvailable` panel appears and existing drafts stay visible.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): timeline and life story sections`.

---

### Task 12: Export section and podcast player

**Files:**
- Create: `src/pages/elder/ExportSection.tsx`, `src/pages/export/PodcastPlayer.tsx` (+ CSS modules), `src/pages/elder/export.test.tsx`

**Interfaces:**
- Consumes: `createArchiveExport`, `getAllRecordings`, `synthesizeSpeech`, `getAudioUrl`; NotAvailable.
- Export section, top to bottom:
  1. **Podcast** (anchor `#podcast`): "<narrator>'s voice". Plays each recording in question order: first the question spoken in Tamil (`synthesizeSpeech`, falling back to browser speech `ta-IN`), then the answer audio. It has play/pause, previous/next, a current-question title and a track list, and uses the cassette visual language from TapeRecorder (reels turn while playing).
  2. **Download archive:** three option cards (ஒலிப்பதிவுகள் மட்டும் · Audio only / எழுத்துப்படிகள் மட்டும் · Transcripts only / முழு காப்பகம் · Everything) → `createArchiveExport(id, kind)` → a "ready" state with a download link; on `NotAvailableError`, `NotAvailable`.
  3. **PDF book:** a card marked "விரைவில் · Coming soon" with a disabled button.

- [ ] **Step 1: Write the failing tests:** the podcast lists `n-rajeshwari` recordings in question order; Play first calls `synthesizeSpeech` with the first question's Tamil text; choosing "Everything" calls `createArchiveExport('n-rajeshwari','full')` and shows a download link; **Review Focus:** `createArchiveExport` rejecting with `NotAvailableError` shows `NotAvailable` without breaking the podcast; the PDF button is disabled.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(frontend): export section and podcast player`.

---

### Task 13: Remove old UI, API-gaps doc, final verification

**Files:**
- Delete: `src/screens/`, `src/components/` (Header, Sidebar, PageNavigationFooter, Toast, AudioPlayer; the replacements live in `ui/`), `src/App.css`, old `src/index.css` (replaced by `styles/`), the unused `DashboardOverview` UI usage
- Create: `docs/superpowers/specs/ui-redesign-api-gaps.md`
- Modify: `frontend/README.md` (how to run `npm run dev:mock`, what the switch does)

- [ ] **Step 1:** Delete the old files. Run `npx tsc -b`. Expected: no errors (no remaining imports of old files).
- [ ] **Step 2:** Write the gaps doc as a table (field or function | screen that needs it | core-feature step that will provide it): the five Task 1 functions, `job_status` / `transcript_job_status` (step 2 transcription jobs), `photo_frame_note`, ZIP (step 7), sourced story (step 8), consent (step 6), topic progress (step 4). Check it against `grep -rn "TODO(api)" frontend/src`; every hit must appear in the table.
- [ ] **Step 3:** Run `npm test`. Expected: all suites pass.
- [ ] **Step 4:** Run `npm run build` and `npx vite build --mode mock`. Expected: both succeed.
- [ ] **Step 5:** Manual check with `npm run dev:mock` at 1280px and at 375px (browser device mode), in Tamil and in English: walk Welcome → sign in → home → add elder → elder page → topics → consent → interview (record, save, next, More → Finish) → done → every elder tab. Check for no horizontal scroll at 375px, no text under 14px, and every status showing a word.
- [ ] **Step 6:** Commit: `chore(frontend): remove old screens, document API gaps`.
