import { beforeEach, describe, expect, it } from 'vitest';
import * as api from './mockApi';
import { resetMockStore, setMockDelay } from './mockStore';

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  resetMockStore();
  setMockDelay(0);
});

describe('mockApi', () => {
  it('createNarrator adds a Tamil-named narrator', async () => {
    await api.createNarrator({
      full_name_tamil: 'கமலா அம்மாள்', full_name_english: 'Kamala', preferred_name: 'அம்மா',
      birth_year: '1950', place_of_birth: 'சேலம்', preferred_language: 'ta', tamil_dialect: '',
    });
    const list = await api.getNarrators();
    expect(list.some((n) => n.full_name_tamil === 'கமலா அம்மாள்')).toBe(true);
  });

  it('uploadRecordingBlob answers the question and versions takes', async () => {
    const s = await api.getSessionById('s-r2');
    const q = s.questions!.find((x) => x.status === 'pending')!;
    const r1 = await api.uploadRecordingBlob(q.id, new Blob(['x']), 12);
    expect(r1.version_number).toBe(1);
    let s2 = await api.getSessionById('s-r2');
    const q2 = s2.questions!.find((x) => x.id === q.id)!;
    expect(q2.status).toBe('answered');
    expect(q2.recording_version).toBe(1);
    const r2 = await api.uploadRecordingBlob(q.id, new Blob(['y']), 15);
    expect(r2.version_number).toBe(2);
    s2 = await api.getSessionById('s-r2');
    expect(s2.questions!.find((x) => x.id === q.id)!.recording_version).toBe(2);
    const recs = await api.getAllRecordings({ session_id: 's-r2' });
    const forQ = recs.filter((r) => r.session_question_id === q.id);
    expect(forQ).toHaveLength(1);
    expect(forQ[0].version_number).toBe(2);
    const ts = await api.getTranscriptsByRecording(r1.id);
    expect(ts[0].job_status).toBe('queued');
  });

  it('updateTranscript adds a corrected version', async () => {
    const recs = await api.getAllRecordings({ narrator_id: 'n-rajeshwari' });
    const rec = recs.find((r) => r.transcript_id)!;
    const before = await api.getTranscriptsByRecording(rec.id);
    await api.updateTranscript(before[0].id, 'new text');
    const after = await api.getTranscriptsByRecording(rec.id);
    expect(after).toHaveLength(before.length + 1);
    const newest = after.reduce((a, b) => (b.version_number > a.version_number ? b : a));
    expect(newest.source).toBe('corrected');
    expect(newest.transcript_text).toBe('new text');
  });

  it('getTopicProgress covers every life stage', async () => {
    const bank = await api.getQuestionBank();
    const stages = [...new Set(bank.data.map((q) => q.life_stage))];
    const progress = await api.getTopicProgress('n-rajeshwari');
    for (const st of stages) expect(progress.map((p) => p.life_stage)).toContain(st);
    for (const p of progress) expect(p.answered).toBeLessThanOrEqual(p.total);
  });

  it('consent: null until recorded', async () => {
    expect(await api.getConsent('n-shanmugam')).toBeNull();
    await api.recordConsent('n-shanmugam', 'v1');
    expect(await api.getConsent('n-shanmugam')).not.toBeNull();
  });

  it('?mockError=<fn> rejects that function', async () => {
    window.history.replaceState({}, '', '/?mockError=getNarrators');
    await expect(api.getNarrators()).rejects.toThrow('Mock error: getNarrators');
  });

  it('seed covers statuses and misc behaviour', async () => {
    const recs = await api.getAllRecordings({ narrator_id: 'n-rajeshwari' });
    const js = new Set(recs.map((r) => r.transcript_job_status));
    for (const s of ['queued', 'processing', 'done', 'needs_review', 'failed']) expect(js.has(s as never)).toBe(true);
    const d = await api.getNarratorById('n-rajeshwari');
    expect(new Set(d.timeline.map((e) => e.extraction_status)).size).toBe(4);
    expect(d.drafts[0].chapters).toHaveLength(3);
    expect((await api.getNarratorById('n-new')).sessions).toHaveLength(0);
    expect(api.getAudioUrl('whatever')).toBe('/mock-audio/sample-1.wav');
    await expect(api.synthesizeSpeech('hi')).rejects.toThrow();
    expect(await api.createArchiveExport('n-rajeshwari', 'full')).toMatchObject({ status: 'ready', download_url: '#mock-download' });
    const bank = await api.getQuestionBank();
    expect(bank.categories.length).toBeGreaterThanOrEqual(4);
  });
});
