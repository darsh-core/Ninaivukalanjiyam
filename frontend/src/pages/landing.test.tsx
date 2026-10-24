import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../services', async () => ({
  ...(await import('../services/mockApi')),
  IS_MOCK: true,
}));

import { AppRoutes } from '../App';
import { AuthProvider } from '../context/AuthContext';
import { UiProvider } from '../context/UiContext';
import { resetMockStore, setMockDelay } from '../services/mockStore';

const TAGLINE_1 = 'குடும்ப முன்னோர்களின் குரல் மற்றும்';
const TAGLINE_2 = 'நினைவுகளைப் பாதுகாப்போம்';

function Loc() {
  return <div data-testid="loc">{useLocation().pathname}</div>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <UiProvider>
          <AppRoutes />
          <Loc />
        </UiProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  resetMockStore();
  setMockDelay(0);
  localStorage.clear();
});

describe('Landing page', () => {
  it('opens on the app information site, not the sign-in form', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { level: 1, name: new RegExp(TAGLINE_2) })).toBeInTheDocument();
    expect(screen.queryByLabelText('கடவுச்சொல்')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'எப்படி வேலை செய்கிறது' })).toBeInTheDocument();
  });

  it('Try now leads to the split sign-in screen', async () => {
    const user = userEvent.setup();
    renderAt('/welcome');
    const tries = await screen.findAllByRole('link', { name: /இப்போது முயலுங்கள்/ });
    expect(tries.length).toBeGreaterThan(0);
    await user.click(tries[0]);
    expect(screen.getByTestId('loc')).toHaveTextContent('/signin');
    expect(screen.getByLabelText('கடவுச்சொல்')).toBeInTheDocument();
  });

  it('shows the tagline in the intro side of the sign-in screen', async () => {
    renderAt('/signin');
    const intro = await screen.findByRole('complementary');
    expect(intro).toHaveTextContent(TAGLINE_1);
    expect(intro).toHaveTextContent(TAGLINE_2);
    expect(screen.getByRole('button', { name: 'உள்நுழை' })).toBeInTheDocument();
  });

  it('shows English helper copy in English mode', async () => {
    localStorage.setItem('nk_ui_lang', 'en');
    renderAt('/welcome');
    expect(await screen.findAllByRole('link', { name: /Try now/ })).not.toHaveLength(0);
    expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
  });
});
