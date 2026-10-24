import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services', async () => {
  const mock = await import('../../services/mockApi');
  return { ...mock, getTopicProgress: vi.fn(mock.getTopicProgress), IS_MOCK: true };
});

import * as services from '../../services';
import { NotAvailableError } from '../../services/errors';
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
  vi.mocked(services.getTopicProgress).mockClear();
});

describe('Elder hub and interviews', () => {
  it('shows Continue interview for an unfinished session and lists both sessions', async () => {
    renderAt('/elders/n-rajeshwari/interviews');
    expect(await screen.findByRole('heading', { level: 1, name: 'ராஜேஸ்வரி பாட்டி' })).toBeInTheDocument();
    const cont = screen.getByRole('link', { name: /நேர்காணலைத் தொடர்/ });
    expect(cont).toHaveAttribute('href', '/interview/s-r2');
    expect(await screen.findAllByRole('heading', { level: 2 })).toHaveLength(2);
    expect(screen.getByText('முடிந்தது')).toBeInTheDocument();
    expect(screen.getByText('நடைபெறுகிறது')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /கேள்/ })).toHaveAttribute('href', '/elders/n-rajeshwari/export#podcast');
    expect(screen.getByRole('link', { name: /திருத்து/ })).toHaveAttribute('href', '/elders/n-rajeshwari/edit');
  });

  it('shows an empty state and a Start interview link for an elder without sessions', async () => {
    renderAt('/elders/n-new/interviews');
    expect(await screen.findByText('இன்னும் நேர்காணல் இல்லை')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'நேர்காணலைத் தொடங்கு' });
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((l) => expect(l).toHaveAttribute('href', '/elders/n-new/topics'));
  });

  it('still renders name and tabs when topic progress is not available', async () => {
    vi.mocked(services.getTopicProgress).mockRejectedValueOnce(new NotAvailableError('getTopicProgress'));
    renderAt('/elders/n-rajeshwari/interviews');
    expect(await screen.findByRole('heading', { level: 1, name: 'ராஜேஸ்வரி பாட்டி' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'நேர்காணல்கள்' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'வாழ்க்கைக் கதை' })).toBeInTheDocument();
    expect(screen.queryByLabelText('தலைப்பு முன்னேற்றம்')).not.toBeInTheDocument();
  });

  it('shows the progress strip when available, and a retry on load failure', async () => {
    window.history.replaceState({}, '', '/?mockError=getNarratorById');
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/interviews');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    window.history.replaceState({}, '', '/');
    await user.click(screen.getByRole('button', { name: /மீண்டும் முயற்சி/ }));
    expect(await screen.findByLabelText('தலைப்பு முன்னேற்றம்')).toBeInTheDocument();
    expect(screen.getByText('குழந்தைப் பருவம்')).toBeInTheDocument();
  });

  it('switches labels to English', async () => {
    localStorage.setItem('nk_ui_lang', 'en');
    renderAt('/elders/n-rajeshwari/interviews');
    expect(await screen.findByRole('link', { name: 'Continue interview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Life story' })).toBeInTheDocument();
  });

  it('renders other sections by route', async () => {
    renderAt('/elders/n-rajeshwari/timeline');
    expect(await screen.findByText('ஈரோட்டில் பிறப்பு')).toBeInTheDocument();
  });
});
