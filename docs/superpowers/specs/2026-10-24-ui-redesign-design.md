# UI Redesign: Design

Date: 2026-10-24 · Branch: `ui-redesign` (from `main` at `65ed459`)

## Intent

The current frontend (15 screens, about 15.7k lines, mostly inline styles) is confusing to use and doesn't feel like what the product is: a warm, private family archive of elders' voices. We are redesigning the whole UI (visual language, user flow, layout and every screen) as a **clickable prototype running on fake data inside the real frontend**. The owner iterates on that prototype until it's approved. Connecting it to the real backend then means flipping a switch and fixing what real data reveals, with nothing to rebuild.

Audience: Tamil families recording elders' life stories. **Anyone may hold the device**, either the elder or a family member helping them, so every interview screen must be elder-friendly. Review, editing and export are done by family members.

## Goals

- A complete new visual language (palette, type scale, component style), applied consistently.
- A narrator-centred user flow that replaces today's scattered screens.
- Every screen in the flow below exists as a working, clickable React screen backed by realistic fake data, including empty, loading and error states.
- Screens call a data layer whose functions have the **same names, arguments and return types as `frontend/src/services/api.ts`**, so switching to the real backend needs no screen changes.
- Desktop-first layouts that also work at phone width (the final product is mobile-first, so phone layouts must be real, not an afterthought).
- Tamil-first UI text with an English toggle.

## Non-goals

- No backend changes. No new endpoints, schema or jobs; the core-feature plan (recorder durability, transcription jobs, consent table, ZIP export and so on) is separate work.
- No real recording reliability work. The prototype recorder may use the real microphone to *feel* right, but durable storage and upload are core-feature step 1.
- No auth/security changes.
- No print/PDF book design or generation (the PDF option appears as "coming soon").

## Anti-goals (would make this a failure even if it "works")

- Over-themed decoration. The owner rejected two rounds: plain (too bland) and full skeuomorphic themes (palm leaf, tape deck, scrapbook, postcards: "too much"). Keep to the **light touch** agreed below.
- Any screen the elder might see that needs reading small text, precise taps, or choosing among many buttons.
- A prototype that can't be wired up without rewriting screens (for example screens that build their own fake data inline or fetch directly).
- Colour as the only signal for a status.

## Constraints

- Existing stack: React 19, TypeScript ~6, Vite 8, `lucide-react` icons; Tailwind 4 is installed. Build on what's there. React Router is not yet a dependency (see Approaches).
- Fonts from Google Fonts (already loaded the same way in `frontend/index.html`).
- Must run on current mobile Safari/Chrome and desktop browsers.
- Keep the teammate's mobile fallback in mind: when the live microphone isn't available, the recorder offers the phone's native audio capture (`<input type="file" accept="audio/*" capture>`, added in `45d5d81`). The new recorder must keep an equivalent fallback path.

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| A | Separate mock app in `/mockups` | Fully isolated, but every approved screen has to be ported into `frontend/` and then wired, so design and hookup become two projects and details get lost in between. |
| **B (chosen)** | **New UI inside `frontend/` on the `ui-redesign` branch, with a mock data layer that mirrors `api.ts`, switched by `VITE_USE_MOCK`** | The mockup *is* the app; connecting it is a switch plus fixes. Old screens are replaced on this branch, while `main` keeps the working app until merge. |
| C | Storybook component catalogue | Great for components, too much setup for a two-person team, and doesn't give a clickable flow. |

The owner chose **B**.

## Decisions made with the owner

### Visual language

- **Direction:** warm heritage, like a family album or keepsake book.
- **Palette, "Terracotta & Parchment":**
  - Parchment `#F6EFE4` (page background), Paper `#FFFBF5` (cards, surfaces), Border `#E2D4C1` / `#E8DCCB`
  - Terracotta `#B4532A` (primary actions, record), Turmeric `#D9A441` (highlights, washi tape, accents)
  - Ink brown `#3B2A20` (text), Muted `#8A7565` (secondary text)
  - Status (from the agreed component sheet): saved `#3F6B34` on `#E5EFDF`; needs review `#7A5410` on `#F7E6BF`; failed `#9A2F14` on `#F8DCD3`
- **Fonts, "Literary":** **Noto Serif Tamil** for display, headings and the interview question; **Mukta Malar** for body, labels and buttons. **Kavivanar** (Tamil handwriting) only for short personal notes, never for buttons, questions or transcripts.
- **Component style, "Light touch" (tape recorder + scrapbook, minimal):**
  - Clean paper cards: soft rounded corners (about 14–18px), soft shadow, pill buttons (filled terracotta primary, outlined secondary).
  - **Scrapbook** appears only where memories live: narrator photos sit in a small white photo frame with a strip of turmeric washi tape, and at most one short handwritten note per card (for example "அடுத்தது: பள்ளி நாட்கள்").
  - **Tape recorder** appears only in the recorder: a dark brown cassette window with two turning reels and a moving level meter while recording, with normal pill buttons below (Pause / Stop, then Listen / Save / Record again).
  - No paper grain, no ornaments, no tilted elements, no sticker badges.
- **Language:** Tamil first, with an English toggle in the header. **The toggle switches UI labels to English and also shows English helper text under Tamil content** where a translation exists: `question_english` under the question, `transcript_text_english` under transcripts, `title_english` / `description_english` under timeline items. Questions are **always read aloud in Tamil**, regardless of the toggle. Content without a translation simply shows Tamil only. The toggle can be changed mid-interview.

### Type scale

| Role | Desktop | Phone | Use |
|---|---|---|---|
| Display | 32 | 26 | App name, home title |
| Question | 26 | 22 | Interview question, the largest text on elder screens |
| Heading | 20 | 18 | Narrator names, section titles |
| Body | 17 | 17 | Transcripts, stories, labels; line height 1.65 for Tamil |
| Caption | 14 | 14 | Dates, counts, helper text; never smaller than 14 |
| Button | 16 | 17 | Minimum tap target 48px tall |

### User flow (agreed)

1. **Getting in:** Welcome (what the archive is; Sign in / Create family account) → **Family home** (taped-photo narrator cards, a big "Continue interview" for the latest unfinished session, "+ Add a family elder") → **Add / edit elder** (Tamil and/or English name, form of address such as Paati or Thatha, optional photo, birth year, hometown, dialect).
2. **Narrator page (the hub):** photo, name, hometown, progress across life stages, a big "Start / continue interview", a small "🎧 Listen" button (opens the podcast player), and sections: **Interviews · Recordings & transcripts · Timeline · Life story · Export & podcast**.
3. **Interview (elder-friendly):** **Pick a topic** (life-stage cards with questions remaining) → **Consent** (first time only: spoken and written explanation of recording and AI processing, one big "I agree") → **Question & record** (question read aloud and shown large; one big record button; reels turn while recording; then Listen back / Save / Record again; family actions such as skip, add question, AI follow-ups and end session behind a single "⋯ more") → **Session done** ("You shared N memories today"; transcription happens in the background; continue another day).
4. **Review & keep (family):** **Recordings** (audio, transcript status queued / processing / done / needs review / failed, corrections saved as new versions with history) → **Timeline** (memories marked "needs review" until a family member confirms, each linked to its source answer) → **Life story** (AI draft built from chosen memories, clearly labelled as a draft, editable chapters) → **Export** (ZIP: audio only / transcripts only / everything; PDF book; podcast player).

**Dropped:** the separate dashboard, the global Recordings/Timeline/Story pages (moved into each narrator's page), the step-by-step footer (`PageNavigationFooter`), and the full Settings/Help screens (reduced to a small header menu: language, sign out, help link).

### Export scope in the prototype (owner's decision)

- **Podcast player works:** redesigned in the new visual language, keeping today's behaviour of a spoken question (via `synthesizeSpeech`, with the browser speech fallback) followed by the elder's recorded answer, in question order. Uses the mock sample audio in mock mode.
- **PDF book:** the option is shown but marked "விரைவில் · coming soon". No PDF generation in the prototype.
- **ZIP export** (audio only / transcripts only / everything): designed and clickable; in mock mode it returns a fake "ready to download" state, and the real function is a gap (see below).

### Interview model (my call, owner may override)

- **A session is one sitting with the elder.** Picking a topic on the topic screen adds that topic's not-yet-answered bank questions to the current session (`addQuestionToSession`). If there's no unfinished session, picking a topic first creates one (`createSession`).
- **A "topic" is a `BankQuestion.life_stage`** (falling back to `category` when `life_stage` is empty). Per-topic progress ("N questions left") counts that life stage's bank questions not yet answered by this elder in any session.
- **"Continue interview" resumes the elder's latest session with status `in_progress` or `paused`**, at its first unanswered question.
- **Consent is recorded once per elder**, before their first recording, and re-shown only if withdrawn. The route is per elder (`/elders/:id/consent`), shown automatically before the first question when there's no consent on record.

### Calls I made (owner may override in review)

- The podcast stays under Export; the narrator page gets a "🎧 Listen" shortcut to the same player.
- Each status is shown as a coloured label **and** a word (and an icon where helpful).
- The elder-friendly screens (topic, consent, question & record, session done) hide the global header navigation except a back/exit control and the language toggle, to keep them calm.
- On phones, the narrator page sections become a horizontally scrollable tab bar at the top. A bottom tab bar is not used, because these sections are per-narrator, not app-wide.

## How it's built

### Data layer: the switch

- Create `frontend/src/services/mockApi.ts` exporting **every function `api.ts` exports, with identical signatures and return types** (today: `loginUser`, `registerUser`, `getCurrentUser`, `getDashboardOverview`, `getNarrators`, `getNarratorById`, `createNarrator`, `updateNarrator`, `archiveNarrator`, `getAllSessions`, `getSessionById`, `createSession`, `updateSessionStatus`, `addQuestionToSession`, `updateQuestionStatus`, `getQuestionBank`, `getAllRecordings`, `uploadRecordingBlob`, `getTranscriptsByRecording`, `updateTranscript`, `regenerateTranscript`, `refineTranscriptProse`, `getAIFollowUpQuestions`, `extractMemoriesWithAI`, `generateStoryDraftWithAI`, `synthesizeSpeech`, `getTimelineByNarrator`, `createLifeEvent`, `updateLifeEventStatus`, `deleteLifeEvent`, `getStoryDrafts`, `saveStoryDraft`, `updateStoryDraft`, `getExportPreview`, `getAudioUrl`, `getDownloadArchiveUrl`).
- Create `frontend/src/services/index.ts` that re-exports from `mockApi` when `import.meta.env.VITE_USE_MOCK === 'true'`, otherwise from `api`. **Screens import only from `services/index.ts`.** Use TypeScript so a signature drift between the two files is a compile error (for example `mockApi` typed as `typeof import('./api')`).
- Mock data lives in `frontend/src/services/mockData.ts`: 2–3 narrators (one rich, one sparse, one brand new), sessions in different states, recordings with every transcript status, timeline events in every review state, one life-story draft. Use the existing types in `frontend/src/types/index.ts`.
- Mock behaviour: an in-memory store so actions persist while clicking (create narrator, save answer, confirm memory), short artificial delays (300–800ms) so loading states are visible, and one way to trigger error states for review (for example a `?mockError=upload` query flag).
- Mock audio: a few short bundled sample clips (an existing sample such as `database/seed_recordings/sample_narration.wav` can be copied into `frontend/public/mock-audio/`), returned by the mock `getAudioUrl`.
- `frontend/.env.mock` (or a `dev:mock` npm script) sets `VITE_USE_MOCK=true`.

### Fields the new UI needs that today's API doesn't return

The design calls for data and actions the real API lacks. These are handled in two ways (my call):

- **Missing fields** (transcript job states such as queued/processing/needs review, people/places entities, per-topic progress if computed server-side later) become **optional additions to the existing types** in `types/index.ts`, each marked `// TODO(api):`.
- **Missing actions or queries** get **new functions added to both `api.ts` and `mockApi.ts`** with the same signature, so the "screens only import from `services/index.ts`" rule and the compile-time signature check still hold. In `api.ts` each one is a clearly marked stub (`// TODO(api): no backend endpoint yet`) that throws a typed `NotAvailableError`. Screens catch that error and show a calm "not available yet" state instead of crashing. Initial list:
  - `getConsent(narratorId)` / `recordConsent(narratorId, consentTextVersion)`: consent state and timestamp
  - `getTopicProgress(narratorId)`: life stages with total and answered counts (the real version may be computed client-side from `getQuestionBank` + `getAllRecordings` until an endpoint exists; the builder decides)
  - `generateStoryDraftFromSources(narratorId, languageCode, { eventIds, recordingIds })`: a draft from chosen memories (today's `generateStoryDraftWithAI` takes no selection)
  - `createArchiveExport(narratorId, kind: 'audio' | 'transcripts' | 'full')`: the ZIP export

Every field and function above is collected, with the screen that needs it and the core-feature step that will provide it, in `docs/superpowers/specs/ui-redesign-api-gaps.md`. Screens must still render sensibly when fields are absent or a stub throws, because the real API won't support them until the core features land.

### Styling

- Design tokens (colours, type scale, radii, shadows, spacing) as CSS custom properties in one place (`frontend/src/styles/tokens.css`), consumed by a small set of shared components. Builder's choice whether components use Tailwind utilities (already installed) or plain CSS/CSS modules; pick one and stick to it, with no inline style objects for layout.
- Shared components (minimum): Button (primary / secondary / text, large size for elder screens), Card, PhotoFrame (photo + washi tape), HandNote, StatusLabel, TapeRecorder (cassette window + reels + level meter + controls, with idle / recording / paused / recorded / saving / saved / error states), Tabs, PageHeader, EmptyState, Field (input/select/textarea with label), Toast, AudioPlayer (restyled from the existing one).
- Respect `prefers-reduced-motion`: the reels and level meter stop animating, and the state is shown with text only.

### Routing

Add `react-router-dom` so every screen has a URL and refresh keeps your place (also needed later for recording recovery). Suggested routes: `/`, `/signin`, `/elders/new`, `/elders/:id/edit`, `/elders/:id/:section`, `/elders/:id/topics`, `/elders/:id/consent`, `/interview/:sessionId?q=N`, `/interview/:sessionId/done`.

### Old screens

On this branch the old `screens/*`, `Header`, `Sidebar` and `PageNavigationFooter` are removed once their replacements exist. `main` keeps the working app until the redesign is approved and wired.

## Left to the builder

- Exact spacing scale, shadows and radii within the "light touch" description.
- Icon choices (from `lucide-react`).
- Exact Tamil and English copy, kept short, respectful and conversational. The interview copy addresses the elder directly by their form of address (for example "பாட்டி, …").
- Component file structure and whether to use Tailwind or CSS modules.
- The precise phone layout of each screen, within the decisions above.

## Done when

- `npm run dev:mock` (or equivalent) runs the full prototype with no backend.
- Every screen in the flow is reachable by clicking, at desktop and phone width (375px), in Tamil and English.
- Loading, empty and error states are visible for every data-driven screen.
- `npm run build` typechecks with `VITE_USE_MOCK` both on and off.
- The API-gaps list exists and matches the `TODO(api)` comments.
