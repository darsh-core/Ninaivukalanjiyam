import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../../services', async () => {
  const mock = await import('../../services/mockApi');
  return {
    ...mock,
    uploadRecordingBlob: vi.fn(mock.uploadRecordingBlob),
    updateQuestionStatus: vi.fn(mock.updateQuestionStatus),
    updateSessionStatus: vi.fn(mock.updateSessionStatus),
    addQuestionToSession: vi.fn(mock.addQuestionToSession),
    getAIFollowUpQuestions: vi.fn(mock.getAIFollowUpQuestions),
    IS_MOCK: true,
  };
});

import * as services from '../../services';
import { AppRoutes } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { UiProvider } from '../../context/UiContext';
import { Toast } from '../../ui/Toast/Toast';
import { resetMockStore, setMockDelay } from '../../services/mockStore';
import { installFakeMediaRecorder, type FakeMedia } from '../../test/setup';

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

const loc = () => screen.getByTestId('loc').textContent;
const questionText = async (n: number) => (await services.getSessionById('s-r2')).questions![n - 1].question_tamil;

async function startRecording() {
  fireEvent.click(await screen.findByRole('button', { name: /பதிவைத் தொடங்கு/ }));
  await screen.findByText('பதிவாகிறது');
  await act(async () => {}); // let the recorder report that it is dirty
}

async function openMore(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /மேலும்/ }));
  return screen.findByRole('dialog');
}

let fake: FakeMedia;
beforeEach(() => {
  resetMockStore();
  setMockDelay(0);
  localStorage.clear();
  localStorage.setItem('nk_user', JSON.stringify({ id: 'u1', fullName: 'Test', email: 't@x.com' }));
  window.history.replaceState({}, '', '/');
  fake = installFakeMediaRecorder();
  vi.mocked(services.uploadRecordingBlob).mockClear();
  vi.mocked(services.updateQuestionStatus).mockClear();
  vi.mocked(services.updateSessionStatus).mockClear();
  vi.mocked(services.addQuestionToSession).mockClear();
  vi.mocked(services.getAIFollowUpQuestions).mockClear();
});
afterEach(() => {
  cleanup();
  fake.restore();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
});

describe('Interview question screen', () => {
  it('opens the first unanswered question when there is no q, and writes q into the URL', async () => {
    const text = await questionText(3);
    renderAt('/interview/s-r2');
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByText(/^கேள்வி 3 \/ 8/)).toBeInTheDocument();
    await waitFor(() => expect(loc()).toBe('/interview/s-r2?q=3'));
  });

  it('restores an answered question with its saved take and Record another take', async () => {
    const text = await questionText(1);
    renderAt('/interview/s-r2?q=1');
    expect(await screen.findByText(text)).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /இன்னொரு பதிவு/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /பதிவைத் தொடங்கு/ })).not.toBeInTheDocument();
    expect(loc()).toBe('/interview/s-r2?q=1');
  });

  it('saves a take for this question and then shows it as saved, staying on the question', async () => {
    renderAt('/interview/s-r2?q=3');
    await startRecording();
    fireEvent.click(screen.getByRole('button', { name: /^■/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^சேமி/ }));
    await waitFor(() => expect(services.uploadRecordingBlob).toHaveBeenCalledTimes(1));
    expect(vi.mocked(services.uploadRecordingBlob).mock.calls[0][0]).toBe('q-r2-3');
    expect(await screen.findByRole('button', { name: /இன்னொரு பதிவு/ })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeInTheDocument();
    expect(screen.getAllByText('சேமிக்கப்பட்டது').length).toBeGreaterThan(0);
    expect(loc()).toBe('/interview/s-r2?q=3');
  });

  it('asks before leaving an unsaved take with Next, and declining keeps the place', async () => {
    renderAt('/interview/s-r2?q=3');
    await startRecording();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: /அடுத்தது/ }));
    expect(confirm).toHaveBeenCalled();
    expect(loc()).toBe('/interview/s-r2?q=3');
    expect(screen.getByText('பதிவாகிறது')).toBeInTheDocument();
  });

  it('Next and Previous move through the questions', async () => {
    const user = userEvent.setup();
    renderAt('/interview/s-r2?q=3');
    await screen.findByText(await questionText(3));
    await user.click(screen.getByRole('button', { name: /அடுத்தது/ }));
    expect(await screen.findByText(await questionText(4))).toBeInTheDocument();
    expect(loc()).toBe('/interview/s-r2?q=4');
    await user.click(screen.getByRole('button', { name: /முந்தையது/ }));
    expect(await screen.findByText(await questionText(3))).toBeInTheDocument();
  });

  it('More → Skip marks the question skipped and moves on', async () => {
    const user = userEvent.setup();
    renderAt('/interview/s-r2?q=3');
    const dialog = await openMore(user);
    await user.click(within(dialog).getByRole('button', { name: /தவிர்/ }));
    await waitFor(() => expect(services.updateQuestionStatus).toHaveBeenCalledWith('q-r2-3', 'skipped'));
    await waitFor(() => expect(loc()).toBe('/interview/s-r2?q=4'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('More → AI follow-up can be added and opens the new question', async () => {
    const user = userEvent.setup();
    renderAt('/interview/s-r2?q=3');
    const dialog = await openMore(user);
    const suggestion = await within(dialog).findByText('அந்த நாட்களில் உங்களுடன் இருந்தவர்கள் யார்?');
    const item = suggestion.closest('li')!;
    await user.click(within(item).getByRole('button', { name: /சேர்/ }));
    await waitFor(() =>
      expect(services.addQuestionToSession).toHaveBeenCalledWith('s-r2', {
        question_tamil: 'அந்த நாட்களில் உங்களுடன் இருந்தவர்கள் யார்?',
        question_english: 'Who was with you in those days?',
        question_type: 'follow_up',
      }),
    );
    await waitFor(() => expect(loc()).toBe('/interview/s-r2?q=9'));
    expect(screen.getByText(/^கேள்வி 9 \/ 9/)).toBeInTheDocument();
  });

  it('shows a calm message when AI suggestions fail, and the sheet closes on Escape', async () => {
    vi.mocked(services.getAIFollowUpQuestions).mockRejectedValueOnce(new Error('down'));
    const user = userEvent.setup();
    renderAt('/interview/s-r2?q=3');
    const dialog = await openMore(user);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await within(dialog).findByText(/பரிந்துரைகள் இப்போது கிடைக்கவில்லை/)).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('More → Finish completes the session and the done page shows the answered count', async () => {
    const user = userEvent.setup();
    renderAt('/interview/s-r2?q=3');
    const dialog = await openMore(user);
    await user.click(within(dialog).getByRole('button', { name: /அமர்வை முடி/ }));
    await waitFor(() => expect(loc()).toBe('/interview/s-r2/done'));
    expect(services.updateSessionStatus).toHaveBeenCalledWith('s-r2', 'completed');
    expect(await screen.findByText(/இன்று 2 நினைவுகளைப் பகிர்ந்தீர்கள்/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /நன்றி/ })).toBeInTheDocument();
  });

  it('More → Pause & leave pauses and returns to the elder page', async () => {
    const user = userEvent.setup();
    renderAt('/interview/s-r2?q=3');
    const dialog = await openMore(user);
    await user.click(within(dialog).getByRole('button', { name: /இடைநிறுத்தி/ }));
    await waitFor(() => expect(loc()).toBe('/elders/n-rajeshwari/interviews'));
    expect(services.updateSessionStatus).toHaveBeenCalledWith('s-r2', 'paused');
  });

  it('shows a retry when the session cannot be loaded', async () => {
    window.history.replaceState({}, '', '/?mockError=getSessionById');
    renderAt('/interview/s-r2?q=1');
    expect(await screen.findByRole('button', { name: /மீண்டும் முயற்சி/ })).toBeInTheDocument();
  });
});
