import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../../services', async () => {
  const mock = await import('../../services/mockApi');
  return {
    ...mock,
    getConsent: vi.fn(mock.getConsent),
    getTopicProgress: vi.fn(mock.getTopicProgress),
    createSession: vi.fn(mock.createSession),
    recordConsent: vi.fn(mock.recordConsent),
    IS_MOCK: true,
  };
});

import * as services from '../../services';
import { NotAvailableError } from '../../services/errors';
import { AppRoutes } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { UiProvider } from '../../context/UiContext';
import { Toast } from '../../ui/Toast/Toast';
import { resetMockStore, setMockDelay } from '../../services/mockStore';

const Loc = () => {
  const l = useLocation();
  return <div data-testid="loc">{l.pathname + l.search}</div>;
};

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <UiProvider>
          <AppRoutes />
          <Toast />
          <Loc />
        </UiProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  resetMockStore();
  setMockDelay(0);
  localStorage.clear();
  localStorage.setItem('nk_user', JSON.stringify({ id: 'u1', fullName: 'Test', email: 't@x.com' }));
  window.history.replaceState({}, '', '/');
  vi.mocked(services.getConsent).mockClear();
  vi.mocked(services.recordConsent).mockClear();
  vi.mocked(services.getTopicProgress).mockClear();
  vi.mocked(services.createSession).mockClear();
});

describe('Topic picker and consent', () => {
  it('lists every seeded life stage with a questions-left count', async () => {
    renderAt('/elders/n-shanmugam/topics');
    for (const t of ['குழந்தைப் பருவம்', 'பள்ளி நாட்கள்', 'வேலை', 'குடும்பம்']) {
      expect(await screen.findByRole('button', { name: new RegExp(t) })).toBeInTheDocument();
    }
    expect(screen.getAllByText(/கேள்விகள் மீதம்/).length).toBeGreaterThanOrEqual(4);
  });

  it('asks for consent first when none is on record, then opens the interview', async () => {
    const user = userEvent.setup();
    const before = (await services.getAllSessions('n-shanmugam')).map((s) => s.id);
    renderAt('/elders/n-shanmugam/topics');
    await user.click(await screen.findByRole('button', { name: /குழந்தைப் பருவம்/ }));
    const consentUrl = screen.getByTestId('loc').textContent!;
    expect(decodeURIComponent(consentUrl)).toMatch(/^\/elders\/n-shanmugam\/consent\?next=\/interview\/s-[^?]+\?q=1$/);
    const agree = await screen.findByRole('button', { name: /நான் ஒப்புக்கொள்கிறேன்/ });
    expect(services.recordConsent).not.toHaveBeenCalled();
    await user.click(agree);
    expect(await screen.findByText(/^கேள்வி \d+ \/ \d+/)).toBeInTheDocument();
    expect(services.recordConsent).toHaveBeenCalledWith('n-shanmugam', 'v1');
    const sessions = await services.getAllSessions('n-shanmugam');
    expect(sessions).toHaveLength(2);
    const created = sessions.find((s) => !before.includes(s.id))!;
    expect(created.title).toBe('குழந்தைப் பருவம்');
    expect(created.question_count).toBeGreaterThan(0);
    expect(screen.getByTestId('loc').textContent).toBe(`/interview/${created.id}?q=1`);
  });

  it('skips consent and reuses the unfinished session when consent is on record', async () => {
    const user = userEvent.setup();
    const before = await services.getSessionById('s-r2');
    renderAt('/elders/n-rajeshwari/topics');
    await user.click(await screen.findByRole('button', { name: /குடும்பம்/ }));
    expect(await screen.findByText(/^கேள்வி \d+ \/ \d+/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /நான் ஒப்புக்கொள்கிறேன்/ })).not.toBeInTheDocument();
    const sessions = await services.getAllSessions('n-rajeshwari');
    expect(sessions).toHaveLength(2);
    const after = await services.getSessionById('s-r2');
    expect(after.questions!.length).toBeGreaterThan(before.questions!.length);
  });

  it('still asks when consent state is unavailable, and moves on when saving is unavailable', async () => {
    vi.mocked(services.getConsent).mockRejectedValueOnce(new NotAvailableError('getConsent'));
    vi.mocked(services.recordConsent).mockRejectedValueOnce(new NotAvailableError('recordConsent'));
    const user = userEvent.setup();
    renderAt('/elders/n-shanmugam/consent?next=%2Finterview%2Fs-m1');
    const agree = await screen.findByRole('button', { name: /நான் ஒப்புக்கொள்கிறேன்/ });
    expect(screen.getByText(/குரல் பதிவு/)).toBeInTheDocument();
    await user.click(agree);
    expect(await screen.findByText(/^கேள்வி \d+ \/ \d+/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('ஒப்புதல் பதிவு இன்னும் இல்லை')).toBeInTheDocument());
  });
  it('re-picking a topic adds nothing and never adds answered questions', async () => {
    const user = userEvent.setup();
    const count = async () => (await services.getSessionById('s-r2')).questions!.length;
    const before = await count();
    renderAt('/elders/n-rajeshwari/topics');
    await user.click(await screen.findByRole('button', { name: /குடும்பம்/ }));
    await screen.findByText(/^கேள்வி \d+ \/ \d+/);
    const afterFirst = await count();
    expect(afterFirst).toBeGreaterThan(before);
    const r2 = await services.getSessionById('s-r2');
    const all = await Promise.all((await services.getAllSessions('n-rajeshwari')).map((x) => services.getSessionById(x.id)));
    const answered = new Set(all.flatMap((x) => x.questions!).filter((q) => q.status === 'answered').map((q) => q.question_id));
    const added = r2.questions!.slice(before);
    expect(added.length).toBeGreaterThan(0);
    added.forEach((q) => expect(answered.has(q.question_id)).toBe(false));
    expect(screen.getByTestId('loc').textContent).toBe(`/interview/s-r2?q=${before + 1}`);

    renderAt('/elders/n-rajeshwari/topics');
    const again = await screen.findAllByRole('button', { name: /குடும்பம்/ });
    await user.click(again[again.length - 1]);
    await waitFor(() => expect(screen.getAllByTestId('loc')[1].textContent).toMatch(/^\/interview\/s-r2\?q=/));
    expect(await count()).toBe(afterFirst);
  });

  it('shows a fully answered topic dimmed with a check but still selectable', async () => {
    const bank = await services.getQuestionBank();
    for (const b of bank.data.filter((x) => x.life_stage === 'Early Years')) {
      const q = await services.addQuestionToSession('s-m1', { question_tamil: b.question_tamil, question_id: b.id });
      await services.updateQuestionStatus(q.id, 'answered');
    }
    const user = userEvent.setup();
    renderAt('/elders/n-shanmugam/topics');
    const card = await screen.findByRole('button', { name: /✓.*குழந்தைப் பருவம்/ });
    expect(card).toBeEnabled();
    expect(card).toHaveTextContent('அனைத்தும் முடிந்தது');
    await user.click(card);
    expect(await screen.findByRole('button', { name: /நான் ஒப்புக்கொள்கிறேன்/ })).toBeInTheDocument();
  });

  it('falls back to bank and session data when topic progress fails', async () => {
    vi.mocked(services.getTopicProgress).mockRejectedValue(new NotAvailableError('getTopicProgress'));
    renderAt('/elders/n-shanmugam/topics');
    expect(await screen.findByRole('button', { name: /குழந்தைப் பருவம்/ })).toBeInTheDocument();
    expect(screen.getAllByText(/\d+ கேள்விகள் மீதம்/).length).toBeGreaterThanOrEqual(4);
    vi.mocked(services.getTopicProgress).mockImplementation((await import('../../services/mockApi')).getTopicProgress);
  });

  it('keeps the cards and shows an inline error when picking fails', async () => {
    vi.mocked(services.createSession).mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderAt('/elders/n-shanmugam/topics');
    await user.click(await screen.findByRole('button', { name: /குழந்தைப் பருவம்/ }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    const card = screen.getByRole('button', { name: /குழந்தைப் பருவம்/ });
    expect(card).toBeEnabled();
    await user.click(card);
    expect(await screen.findByRole('button', { name: /நான் ஒப்புக்கொள்கிறேன்/ })).toBeInTheDocument();
  });

  it('ignores a next outside /interview/ and Not now returns to the elder page', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-shanmugam/consent?next=https%3A%2F%2Fevil.test');
    await user.click(await screen.findByRole('button', { name: /நான் ஒப்புக்கொள்கிறேன்/ }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/elders/n-shanmugam/interviews'));
  });

  it('Not now goes back to the elder page', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-shanmugam/consent?next=%2Finterview%2Fs-m1');
    await user.click(await screen.findByRole('button', { name: /இப்போது வேண்டாம்/ }));
    await waitFor(() => expect(screen.getByTestId('loc').textContent).toBe('/elders/n-shanmugam/interviews'));
    expect(services.recordConsent).not.toHaveBeenCalled();
  });
});
