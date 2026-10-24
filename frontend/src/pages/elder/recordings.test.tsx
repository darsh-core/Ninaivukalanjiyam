import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services', async () => {
  const mock = await import('../../services/mockApi');
  return {
    ...mock,
    regenerateTranscript: vi.fn(mock.regenerateTranscript),
    updateTranscript: vi.fn(mock.updateTranscript),
    IS_MOCK: true,
  };
});

import * as services from '../../services';
import { AppRoutes } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { UiProvider } from '../../context/UiContext';
import { resetMockStore, setMockDelay } from '../../services/mockStore';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <UiProvider>
          <AppRoutes />
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
  vi.mocked(services.regenerateTranscript).mockClear();
});

afterEach(() => vi.restoreAllMocks());

describe('Recordings section', () => {
  it('groups recordings under both session titles, newest session first', async () => {
    renderAt('/elders/n-rajeshwari/recordings');
    const h = await screen.findAllByRole('heading', { level: 2 });
    expect(h.map((x) => x.textContent)).toEqual(['வேலை நாட்கள்', 'சிறுவயது நினைவுகள்']);
  });

  it('does not show English question text inside the audio player in Tamil mode', async () => {
    const { container } = renderAt('/elders/n-rajeshwari/recordings');
    await screen.findAllByRole('heading', { level: 2 });
    expect(container.querySelector('audio')).not.toBeNull();
    expect(container.textContent).not.toMatch(/[A-Za-z]{4,} [A-Za-z]{3,} [A-Za-z]{3,}/);
  });

  it('renders every seeded transcript status label', async () => {
    renderAt('/elders/n-rajeshwari/recordings');
    await screen.findAllByRole('heading', { level: 2 });
    for (const word of ['சேமிக்கப்பட்டது', 'சரிபார்க்க வேண்டும்', 'தோல்வி', 'வரிசையில்', 'செயலாக்கத்தில்']) {
      expect(screen.getAllByText(word).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('editing and saving a transcript adds one version to the history', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/recordings');
    await screen.findAllByRole('heading', { level: 2 });
    const card = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('பல்லாங்குழி'))!;
    await user.click(within(card).getByRole('button', { name: 'பதிப்பு வரலாறு' }));
    const before = (await within(card).findAllByText(/^பதிப்பு \d+ ·/)).length;
    await user.click(within(card).getByRole('button', { name: 'திருத்து' }));
    expect(within(card).getByText(/முந்தைய பதிப்புகள் பாதுகாக்கப்படும்/)).toBeInTheDocument();
    const box = within(card).getByRole('textbox');
    await user.clear(box);
    await user.type(box, 'திருத்திய உரை');
    await user.click(within(card).getByRole('button', { name: 'சேமி' }));
    expect(await within(card).findByText('திருத்திய உரை', { selector: 'div' })).toBeInTheDocument();
    expect(await within(card).findAllByText(/^பதிப்பு \d+ ·/)).toHaveLength(before + 1);
  });

  it('does not save an empty transcript', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/recordings');
    await screen.findAllByRole('heading', { level: 2 });
    const card = screen.getAllByRole('listitem').find((li) => li.textContent?.includes('பல்லாங்குழி'))!;
    await user.click(within(card).getByRole('button', { name: 'திருத்து' }));
    await user.clear(within(card).getByRole('textbox'));
    await user.click(within(card).getByRole('button', { name: 'சேமி' }));
    expect(within(card).getByRole('alert')).toBeInTheDocument();
    expect(services.updateTranscript).not.toHaveBeenCalled();
  });

  it('asks for confirmation before re-transcribing', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderAt('/elders/n-rajeshwari/recordings');
    await screen.findAllByRole('heading', { level: 2 });
    const btn = screen.getAllByRole('button', { name: 'மீண்டும் எழுத்தாக்கு' })[0];
    await user.click(btn);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(services.regenerateTranscript).not.toHaveBeenCalled();
    await user.click(btn);
    expect(services.regenerateTranscript).toHaveBeenCalledTimes(1);
  });

  it('shows an inline error on the card when an action fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(services.regenerateTranscript).mockRejectedValueOnce(new Error('x'));
    renderAt('/elders/n-rajeshwari/recordings');
    await screen.findAllByRole('heading', { level: 2 });
    await user.click(screen.getAllByRole('button', { name: 'மீண்டும் எழுத்தாக்கு' })[0]);
    expect(await screen.findAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
  });

  it('shows an empty state for an elder with no recordings', async () => {
    renderAt('/elders/n-new/recordings');
    expect(await screen.findByText('இன்னும் பதிவுகள் இல்லை')).toBeInTheDocument();
  });

  it('shows a retry when loading fails', async () => {
    window.history.replaceState({}, '', '/?mockError=getAllRecordings');
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/recordings');
    expect(await screen.findByText('பதிவுகளை ஏற்ற முடியவில்லை.')).toBeInTheDocument();
    window.history.replaceState({}, '', '/');
    await user.click(screen.getByRole('button', { name: /மீண்டும் முயற்சி/ }));
    expect(await screen.findByText('வேலை நாட்கள்')).toBeInTheDocument();
  });
});
