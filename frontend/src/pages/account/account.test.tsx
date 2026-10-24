import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../../services', async () => ({
  ...(await import('../../services/mockApi')),
  IS_MOCK: true,
}));

import { AppRoutes } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { UiProvider } from '../../context/UiContext';
import { resetMockStore, setMockDelay } from '../../services/mockStore';
import * as services from '../../services';
import { NotAvailableError } from '../../services/errors';

function Loc() {
  const l = useLocation();
  return <div data-testid="loc">{l.pathname}</div>;
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
  localStorage.setItem('nk_user', JSON.stringify({ id: 'u-demo', fullName: 'அன்பரசன் குமார்', email: 'anbu@family.test', role: 'assistant' }));
  vi.restoreAllMocks();
});

describe('Account menu', () => {
  it('shows an avatar and opens a menu with profile, family, help, privacy and sign out', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const btn = await screen.findByRole('button', { name: /பட்டி/ });
    expect(within(btn).getByText('அ')).toBeInTheDocument();
    await user.click(btn);
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('அன்பரசன் குமார்')).toBeInTheDocument();
    expect(within(menu).getByText('anbu@family.test')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /சுயவிவரம்/ })).toHaveAttribute('href', '/profile');
    expect(within(menu).getByRole('menuitem', { name: /குடும்பத்தை நிர்வகி/ })).toHaveAttribute('href', '/family');
    expect(within(menu).getByRole('menuitem', { name: /உதவி/ })).toHaveAttribute('href', '/help');
    expect(within(menu).getByRole('menuitem', { name: /தனியுரிமை/ })).toHaveAttribute('href', '/privacy');
    expect(within(menu).getByRole('menuitem', { name: /வெளியேறு/ })).toBeInTheDocument();
  });

  it('switches language from inside the menu', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('button', { name: /பட்டி/ }));
    await user.click(screen.getByRole('menuitem', { name: /English/ }));
    expect(await screen.findByRole('heading', { name: 'Our family' })).toBeInTheDocument();
  });

  it('shows the profile photo in the avatar when there is one', async () => {
    localStorage.setItem('nk_user', JSON.stringify({ id: 'u-demo', fullName: 'அன்பரசன்', email: 'a@b.c', role: 'assistant', photo_url: 'data:image/png;base64,AAAA' }));
    renderAt('/');
    const btn = await screen.findByRole('button', { name: /பட்டி/ });
    expect(btn.querySelector('img')).toHaveAttribute('src', 'data:image/png;base64,AAAA');
  });
});

describe('Profile', () => {
  it('saves name and email and the header menu shows the new name', async () => {
    const user = userEvent.setup();
    renderAt('/profile');
    const name = await screen.findByLabelText('பெயர்');
    expect(name).toHaveValue('அன்பரசன் குமார்');
    await user.clear(name);
    await user.type(name, 'கவிதா');
    await user.click(screen.getByRole('button', { name: 'சேமி' }));
    await user.click(await screen.findByRole('button', { name: /பட்டி/ }));
    expect(within(screen.getByRole('menu')).getByText('கவிதா')).toBeInTheDocument();
  });

  it('requires a name', async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(services, 'updateProfile');
    renderAt('/profile');
    await user.clear(await screen.findByLabelText('பெயர்'));
    await user.click(screen.getByRole('button', { name: 'சேமி' }));
    expect(await screen.findByText('பெயர் தேவை.')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps the change on this device when the backend has no profile endpoint yet', async () => {
    const user = userEvent.setup();
    vi.spyOn(services, 'updateProfile').mockRejectedValue(new NotAvailableError('updateProfile'));
    renderAt('/profile');
    const name = await screen.findByLabelText('பெயர்');
    await user.clear(name);
    await user.type(name, 'மீனா');
    await user.click(screen.getByRole('button', { name: 'சேமி' }));
    expect(await screen.findByText(/இந்தச் சாதனத்தில் மட்டும்/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('nk_user') ?? '{}').fullName).toBe('மீனா');
  });
});

describe('Manage family', () => {
  it('lists elders with edit links', async () => {
    renderAt('/family');
    expect(await screen.findByText('ராஜேஸ்வரி பாட்டி')).toBeInTheDocument();
    expect(screen.getByText('சண்முகம் தாத்தா')).toBeInTheDocument();
    const edit = screen.getAllByRole('link', { name: /திருத்து/ })[0];
    expect(edit.getAttribute('href')).toMatch(/^\/elders\/n-[a-z]+\/edit$/);
  });

  it('moves an elder down and the order is remembered', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/family');
    const rows = await screen.findAllByRole('listitem');
    const firstName = within(rows[0]).getByRole('heading').textContent;
    await user.click(within(rows[0]).getByRole('button', { name: /கீழே நகர்த்து/ }));
    const after = screen.getAllByRole('listitem');
    expect(within(after[1]).getByRole('heading').textContent).toBe(firstName);
    unmount();
    renderAt('/family');
    const again = await screen.findAllByRole('listitem');
    expect(within(again[1]).getByRole('heading').textContent).toBe(firstName);
  });

  it('archives an elder after confirming', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderAt('/family');
    const row = (await screen.findByText('சண்முகம் தாத்தா')).closest('li') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: /காப்பகப்படுத்து/ }));
    expect(screen.getByText('சண்முகம் தாத்தா')).toBeInTheDocument();
    await user.click(within(row).getByRole('button', { name: /காப்பகப்படுத்து/ }));
    await waitFor(() => expect(screen.queryByText('சண்முகம் தாத்தா')).not.toBeInTheDocument());
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});

describe('Privacy & consent', () => {
  it('shows each elder’s consent status', async () => {
    renderAt('/privacy');
    const r = (await screen.findByText('ராஜேஸ்வரி பாட்டி')).closest('li') as HTMLElement;
    expect(within(r).getByText(/ஒப்புதல் பெறப்பட்டது/)).toBeInTheDocument();
    const s2 = screen.getByText('சண்முகம் தாத்தா').closest('li') as HTMLElement;
    expect(within(s2).getByText(/இன்னும் ஒப்புதல் இல்லை/)).toBeInTheDocument();
  });

  it('shows status unknown when consent cannot be read yet', async () => {
    vi.spyOn(services, 'getConsent').mockRejectedValue(new NotAvailableError('getConsent'));
    renderAt('/privacy');
    const r = (await screen.findByText('ராஜேஸ்வரி பாட்டி')).closest('li') as HTMLElement;
    expect(within(r).getByText(/நிலை தெரியவில்லை/)).toBeInTheDocument();
  });
});

describe('Help', () => {
  it('explains how to record a memory', async () => {
    renderAt('/help');
    expect(await screen.findByRole('heading', { name: 'உதவி & வழிகாட்டி' })).toBeInTheDocument();
  });
});
