# UI redesign: API gaps

The redesigned frontend runs as a prototype on fake data (`npm run dev:mock`). Everything below is something the new UI needs that the current backend does not provide. Each row is marked `TODO(api)` in `frontend/src`. Core-feature step numbers refer to the core-feature plan: 1 recorder durability, 2 transcription jobs, 3 transcript integrity, 4 session progression/modules, 5 extraction fixes/entities, 6 consent, 7 ZIP export, 8 sourced biography.

| Field or function | Screen that needs it | Core-feature step | What the UI does today without it |
|---|---|---|---|
| `getConsent(narratorId)` (stub in `services/api.ts`, throws `NotAvailableError`) | Consent screen, interview gate | 6 consent | Real mode shows the not-available state; mock mode serves it from the mock store. |
| `recordConsent(narratorId, consentTextVersion)` (stub) | Consent screen | 6 consent | Same as above; consent cannot be saved in real mode. |
| `getTopicProgress(narratorId)` (stub) | Topics screen, elder page progress strip | 4 session progression/modules | Elder page hides the progress strip on any failure; Topics shows its not-available state. Mock mode serves fake progress. |
| `generateStoryDraftFromSources(narratorId, languageCode, sources)` (stub) | Life story builder (pick sources, then generate) | 8 sourced biography | Real mode shows not-available; the old unsourced draft call is not used by the new builder. |
| `createArchiveExport(narratorId, kind)` (stub) | Export section (ZIP archive) | 7 ZIP export | Real mode shows not-available; PDF and Word export keep using the existing download URL. |
| `Transcript.job_status` | Recordings and transcript review | 2 transcription jobs | Optional; no job state shown for the transcript. |
| `Recording.transcript_job_status` | Recordings list, interview save feedback | 2 transcription jobs | Optional; the status word is derived from `recording_status` and whether a transcript exists. |
| `SessionQuestion.transcript_job_status` | Interview question list | 2 transcription jobs | Optional; the interview page shows no job state for the question. |
| `Narrator.photo_frame_note` | Family home, elder photo frame ("next up" handwritten note) | 4 session progression/modules | Optional; the note is hidden when absent. |
| Recording question display order (`ExportSection.tsx`, podcast playlist) | Export section, podcast player | 4 session progression/modules | Tracks are sorted by `session_number`, then `created_at` ascending, as a stand-in for question order. |
