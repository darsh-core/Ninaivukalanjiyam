import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services', async () => {
  const mock = await import('../../services/mockApi');
  return {
    ...mock,
    getConsent: vi.fn(mock.getConsent),
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

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <UiProvider>
          <AppRoutes />
          <Toast />
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
    renderAt('/elders/n-shanmugam/topics');
    await user.click(await screen.findByRole('button', { name: /குழந்தைப் பருவம்/ }));
    const agree = await screen.findByRole('button', { name: /நான் ஒப்புக்கொள்கிறேன்/ });
    expect(services.recordConsent).not.toHaveBeenCalled();
    await user.click(agree);
    expect(await screen.findByRole('heading', { level: 1, name: 'Interview' })).toBeInTheDocument();
    expect(services.recordConsent).toHaveBeenCalledWith('n-shanmugam', 'v1');
    const sessions = await services.getAllSessions('n-shanmugam');
    expect(sessions).toHaveLength(2);
    const created = sessions.find((s) => s.title === 'குழந்தைப் பருவம்' || s.status === 'in_progress');
    expect(created?.question_count).toBeGreaterThan(0);
  });

  it('skips consent and reuses the unfinished session when consent is on record', async () => {
    const user = userEvent.setup();
    const before = await services.getSessionById('s-r2');
    renderAt('/elders/n-rajeshwari/topics');
    await user.click(await screen.findByRole('button', { name: /குடும்பம்/ }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Interview' })).toBeInTheDocument();
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
    expect(await screen.findByRole('heading', { level: 1, name: 'Interview' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('ஒப்புதல் பதிவு இன்னும் இல்லை')).toBeInTheDocument());
  });
});
