import {
  addQuestionToSession, createSession, getAllSessions, getQuestionBank, getSessionById,
} from '../../services';
import type { BankQuestion, InterviewSession, SessionQuestion } from '../../types';
import { topicLabel } from './topicLabels';

/** What to ask an elder next: either resume an open session, or start a life stage. */
export type NextQuestion =
  | { kind: 'resume'; sessionId: string; q: number; question: SessionQuestion }
  | { kind: 'start'; lifeStage: string; question: BankQuestion };

export const unfinishedOf = (sessions: InterviewSession[]) =>
  sessions
    .filter((x) => x.status === 'in_progress' || x.status === 'paused')
    .sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''))[0];

export const loadDetails = (sessions: InterviewSession[]): Promise<InterviewSession[]> =>
  Promise.all(sessions.map((x) => getSessionById(x.id)));

export const answeredIds = (details: InterviewSession[]) =>
  new Set(
    details.flatMap((d) => d.questions ?? [])
      .filter((q) => q.status === 'answered' && q.question_id)
      .map((q) => q.question_id as string),
  );

const byOrder = <T extends { display_order: number }>(a: T, b: T) => a.display_order - b.display_order;

/** The next question for this elder, or null when every bank question is answered. */
export async function findNextQuestion(narratorId: string): Promise<NextQuestion | null> {
  const details = await loadDetails(await getAllSessions(narratorId));
  const open = unfinishedOf(details);
  if (open) {
    const questions = [...(open.questions ?? [])].sort(byOrder);
    const i = questions.findIndex((q) => q.status === 'pending' || q.status === 'asked');
    if (i >= 0) return { kind: 'resume', sessionId: open.id, q: i + 1, question: questions[i] };
  }
  const done = answeredIds(details);
  const bank = await getQuestionBank();
  const next = [...bank.data].sort(byOrder).find((b) => !done.has(b.id));
  return next ? { kind: 'start', lifeStage: next.life_stage, question: next } : null;
}

/** Consent URL that leads into the interview at the given question. */
export const consentUrl = (narratorId: string, sessionId: string, q: number) =>
  `/elders/${narratorId}/consent?next=${encodeURIComponent(`/interview/${sessionId}?q=${q}`)}`;

/**
 * Adds this life stage's unanswered bank questions to the elder's open session
 * (creating one if needed) and returns the consent URL for the first new question.
 */
export async function startLifeStage(narratorId: string, stage: string): Promise<string> {
  const [bank, sessions] = await Promise.all([getQuestionBank(), getAllSessions(narratorId)]);
  const details = await loadDetails(sessions);
  const done = answeredIds(details);
  let session = unfinishedOf(details);
  if (!session) {
    session = await createSession({
      narrator_id: narratorId, title: topicLabel(stage).ta, interview_mode: 'structured', preferred_language: 'ta',
    });
  }
  const existing: SessionQuestion[] = session.questions ?? [];
  const present = new Set(existing.map((q) => q.question_id).filter(Boolean));
  const toAdd = bank.data
    .filter((b) => b.life_stage === stage && !done.has(b.id) && !present.has(b.id))
    .sort(byOrder);
  const added: SessionQuestion[] = [];
  for (const b of toAdd) {
    added.push(await addQuestionToSession(session.id, {
      question_tamil: b.question_tamil, question_english: b.question_english, question_id: b.id,
      question_type: 'structured',
    }));
  }
  const all = [...existing, ...added].sort(byOrder);
  const target = added[0] ?? all.find((q) => q.status === 'pending' || q.status === 'asked');
  const index = target ? all.findIndex((q) => q.id === target.id) + 1 : 1;
  return consentUrl(narratorId, session.id, index);
}
