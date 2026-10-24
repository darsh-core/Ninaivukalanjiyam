# UI redesign: API gaps

The redesigned frontend runs as a prototype on fake data (`npm run dev:mock`). Everything below is something the new UI needs that the current backend does not provide. Each row is marked `TODO(api)` in `frontend/src`. Core-feature step numbers refer to the core-feature plan: 1 recorder durability, 2 transcription jobs, 3 transcript integrity, 4 session progression/modules, 5 extraction fixes/entities, 6 consent, 7 ZIP export, 8 sourced biography.

| Field or function | Screen that needs it | Core-feature step | What the UI does today without it |
|---|---|---|---|
| `getConsent(narratorId)` (stub in `services/api.ts`, throws `NotAvailableError`) | Consent screen, interview gate | 6 consent | Real mode cannot know the consent state, so it shows the explanation and "I agree". Mock mode serves it from the mock store. |
| `recordConsent(narratorId, consentTextVersion)` (stub) | Consent screen | 6 consent | Consent cannot be saved in real mode: a not-available save continues to the interview with an info toast (any other save error stays on the page with an error toast). |
| `getTopicProgress(narratorId)` (stub) | Topics screen, elder page progress strip | 4 session progression/modules | Topics tries it first and, on any failure, computes progress client-side from the question bank and the sessions' answers. The elder page hides its progress strip on any failure. Mock mode serves fake progress. |
| `generateStoryDraftFromSources(narratorId, languageCode, sources)` (stub) | Life story builder (pick sources, then generate) | 8 sourced biography | Real mode shows not-available; the old unsourced draft call is not used by the new builder. |
| `createArchiveExport(narratorId, kind)` (stub) | Export section (ZIP archive) | 7 ZIP export | Real mode shows the "not available yet" panel in that card. The new UI does not call `getDownloadArchiveUrl` and PDF is shown as "coming soon", so real mode has no export yet. Mock mode shows the ready state with a demo note and no download link. |
| `Transcript.job_status` | Recordings and transcript review | 2 transcription jobs | Optional; no job state shown for the transcript. |
| `Recording.transcript_job_status` | Recordings section | 2 transcription jobs | Optional; the fallback is `transcript_reviewed_at` (saved if reviewed, otherwise needs review). Used by the Recordings section only; the interview screen reads `SessionQuestion.transcript_job_status`. |
| `SessionQuestion.transcript_job_status` | Interview question list | 2 transcription jobs | Optional; the interview page shows no job state for the question. |
| `Narrator.photo_frame_note` | Family home card ("next up" handwritten note) | 4 session progression/modules | Optional; only the family home card uses it, and it is hidden when absent. |
| Recording question display order (`ExportSection.tsx`, podcast playlist) | Export section, podcast player | 4 session progression/modules | Tracks are sorted by `session_number`, then `created_at` ascending, as a stand-in for question order. |
| `updateProfile(input)` (stub) | Profile page | — (not in the core plan; needs a user-profile endpoint) | Real mode saves the name, email and photo in this browser only (stored with the signed-in user) and says so on the page. |
| `User.photo_url` | Header avatar, Profile page | — (needs a user-profile endpoint) | Optional; the avatar shows the first letter of the name when absent. |
| Elder order (`utils/elderOrder.ts`) | Manage family, Family home | — (needs an ordering field on narrators) | Order is kept in this browser's localStorage; elders not in the saved order appear after the ordered ones. |
| Restore an archived elder | Manage family | — (needs an un-archive endpoint) | Archiving hides the elder; the page notes that bringing them back is coming soon. |
