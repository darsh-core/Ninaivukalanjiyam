import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./services', async () => ({
  ...(await import('./services/mockApi')),
  IS_MOCK: true,
}));

import { AppRoutes } from './App';
import { AuthProvider } from './context/AuthContext';
import { UiProvider } from './context/UiContext';

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

const signIn = () =>
  localStorage.setItem('nk_user', JSON.stringify({ id: 'u1', fullName: 'Test', email: 't@x.com' }));

beforeEach(() => localStorage.clear());

describe('App routing', () => {
  it('shows Welcome for an unauthenticated visit to /', async () => {
    renderAt('/');
    expect(await screen.findByRole('link', { name: /Sign in|உள்நுழை/ })).toBeInTheDocument();
    expect(screen.queryByText('Family home')).not.toBeInTheDocument();
  });

  it('signs in through /signin and lands on Family home with the demo badge', async () => {
    const user = userEvent.setup();
    renderAt('/signin');
    await user.type(await screen.findByLabelText(/மின்னஞ்சல்|Email/), 'a@b.com');
    await user.type(screen.getByLabelText(/கடவுச்சொல்|Password/), 'whatever');
    await user.click(screen.getByRole('button', { name: /உள்நுழை|Sign in/ }));
    expect(await screen.findByText(/எங்கள் குடும்பம்/)).toBeInTheDocument();
    expect(screen.getByText('மாதிரி தரவு')).toBeInTheDocument();
  });

  it('elder route shows the Exit link and no app menu', async () => {
    signIn();
    renderAt('/elders/n-rajeshwari/topics');
    const exit = await screen.findByRole('link', { name: /வெளியேறு/ });
    expect(exit).toHaveAttribute('href', '/elders/n-rajeshwari');
    expect(screen.queryByRole('button', { name: /Menu|பட்டி/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Sign out/)).not.toBeInTheDocument();
  });

  it('app layout shows the menu with Sign out', async () => {
    signIn();
    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('button', { name: /Menu|பட்டி/ }));
    expect(screen.getByRole('menuitem', { name: 'வெளியேறு' })).toBeInTheDocument();
  });

  it('returns to the originally requested route after sign-in', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/recordings');
    await user.click(await screen.findByRole('link', { name: /உள்நுழை/ }));
    await user.type(await screen.findByLabelText(/மின்னஞ்சல்/), 'a@b.com');
    await user.type(screen.getByLabelText(/கடவுச்சொல்/), 'pw');
    await user.click(screen.getByRole('button', { name: /உள்நுழை/ }));
    expect(await screen.findByText('Recordings section', {}, { timeout: 4000 })).toBeInTheDocument();
  });

  it('redirects /elders/:id to interviews and unknown paths to /', async () => {
    signIn();
    const { unmount } = renderAt('/elders/n-rajeshwari');
    expect(await screen.findByRole('heading', { level: 1, name: 'ராஜேஸ்வரி பாட்டி' }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'நேர்காணல்கள்' })).toHaveAttribute('aria-current', 'page');
    unmount();
    renderAt('/nope');
    expect(await screen.findByText(/எங்கள் குடும்பம்/)).toBeInTheDocument();
  });
});
