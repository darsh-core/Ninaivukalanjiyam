import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

const createSpy = vi.hoisted(() => ({ fn: undefined as undefined | ((...a: unknown[]) => unknown) }));
vi.mock('../services', async () => {
  const mock = await import('../services/mockApi');
  const createNarrator = vi.fn(mock.createNarrator);
  createSpy.fn = createNarrator as never;
  return { ...mock, createNarrator, IS_MOCK: true };
});

import { FamilyHomePage } from './FamilyHomePage';
import { ElderFormPage } from './ElderFormPage';
import { UiProvider } from '../context/UiContext';
import { AuthProvider } from '../context/AuthContext';
import { getSessionById } from '../services/mockApi';
import { resetMockStore, setMockDelay } from '../services/mockStore';

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
      <UiProvider>
        <Routes>
          <Route path="/" element={<FamilyHomePage />} />
          <Route path="/elders/new" element={<ElderFormPage />} />
          <Route path="/elders/:id/edit" element={<ElderFormPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </UiProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  resetMockStore();
  setMockDelay(0);
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  (createSpy.fn as unknown as ReturnType<typeof vi.fn>).mockClear();
});

describe('Family home', () => {
  it("lists narrators and a Today's question card per elder", async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'ராஜேஸ்வரி பாட்டி' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'சண்முகம் தாத்தா' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'இன்றைய கேள்வி' })).toBeInTheDocument();
    // Rajeshwari resumes her open session at its first unanswered question.
    const s2 = await getSessionById('s-r2');
    const sorted = [...(s2.questions ?? [])].sort((a, b) => a.display_order - b.display_order);
    const i = sorted.findIndex((q) => q.status === 'pending' || q.status === 'asked');
    const ask = await screen.findByRole('link', { name: /பாட்டி — இப்போது கேளுங்கள்/ });
    expect(ask).toHaveAttribute('href', `/elders/n-rajeshwari/consent?next=${encodeURIComponent(`/interview/s-r2?q=${i + 1}`)}`);
    expect(screen.getByText(sorted[i].question_tamil)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /குடும்பப் பெரியவரைச் சேர்/ })).toHaveAttribute('href', '/elders/new');
  });

  it("starts an interview from a Today's question card when there is no open session", async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(await screen.findByRole('button', { name: /தாத்தா — இப்போது கேளுங்கள்/ }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/elders/n-shanmugam/consent'));
  });

  it('greets the signed-in family member', async () => {
    localStorage.setItem('nk_user', JSON.stringify({ id: 'u-demo', fullName: 'அன்பரசன் குமார்', email: 'a@b.c', role: 'assistant' }));
    renderAt('/');
    expect(await screen.findByText('மீண்டும் வருக, அன்பரசன்!')).toBeInTheDocument();
  });

  it('shows an error with a retry that reloads', async () => {
    window.history.replaceState({}, '', '/?mockError=getNarrators');
    const user = userEvent.setup();
    renderAt('/');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    window.history.replaceState({}, '', '/');
    await user.click(screen.getByRole('button', { name: /மீண்டும் முயற்சி|Try again/ }));
    expect(await screen.findByRole('heading', { name: 'ராஜேஸ்வரி பாட்டி' })).toBeInTheDocument();
  });
});

describe('Elder form', () => {
  it('blocks submit when both names are empty', async () => {
    const user = userEvent.setup();
    renderAt('/elders/new');
    await user.click(screen.getByRole('button', { name: /சேமி/ }));
    expect(await screen.findByText(/ஒரு பெயராவது/)).toBeInTheDocument();
    expect(createSpy.fn).not.toHaveBeenCalled();
  });

  it('creates an elder, navigates to interviews, and lists them on home', async () => {
    const user = userEvent.setup();
    renderAt('/elders/new');
    await user.type(screen.getByLabelText(/தமிழ் பெயர்/), 'லட்சுமி பாட்டி');
    await user.click(screen.getByRole('button', { name: /சேமி/ }));
    await waitFor(() => expect(screen.getByTestId('where').textContent).toMatch(/^\/elders\/.+\/interviews$/));
  });

  it('new elder appears on home', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/elders/new');
    await user.type(screen.getByLabelText(/தமிழ் பெயர்/), 'லட்சுமி பாட்டி');
    await user.click(screen.getByRole('button', { name: /சேமி/ }));
    await screen.findByTestId('where');
    unmount();
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'லட்சுமி பாட்டி' })).toBeInTheDocument();
  });

  it('validates birth year', async () => {
    const user = userEvent.setup();
    renderAt('/elders/new');
    await user.type(screen.getByLabelText(/தமிழ் பெயர்/), 'அ');
    await user.type(screen.getByLabelText(/பிறந்த ஆண்டு/), '1800');
    await user.click(screen.getByRole('button', { name: /சேமி/ }));
    expect(await screen.findByText(/1900/)).toBeInTheDocument();
    expect(createSpy.fn).not.toHaveBeenCalled();
  });

  it('rejects non-image and oversize photos', async () => {
    renderAt('/elders/new');
    const input = screen.getByLabelText(/புகைப்படம்/) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText(/படக் கோப்பை/)).toBeInTheDocument();
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'b.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByText(/2 MB/)).toBeInTheDocument();
  });

  it('clears the photo error when a valid image is chosen', async () => {
    renderAt('/elders/new');
    const input = screen.getByLabelText(/புகைப்படம்/) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] } });
    expect(await screen.findByText(/படக் கோப்பை/)).toBeInTheDocument();
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.queryByText(/படக் கோப்பை/)).not.toBeInTheDocument());
  });

  it('edit-mode load failure offers a retry', async () => {
    window.history.replaceState({}, '', '/?mockError=getNarratorById');
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/edit');
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    window.history.replaceState({}, '', '/');
    await user.click(screen.getByRole('button', { name: /மீண்டும் முயற்சி/ }));
    await waitFor(() => expect(screen.getByLabelText(/தமிழ் பெயர்/)).toHaveValue('ராஜேஸ்வரி பாட்டி'));
  });

  it('prefills when editing', async () => {
    renderAt('/elders/n-rajeshwari/edit');
    await waitFor(() => expect(screen.getByLabelText(/தமிழ் பெயர்/)).toHaveValue('ராஜேஸ்வரி பாட்டி'));
  });
});

describe('Language toggle', () => {
  it('switches home and form to English', async () => {
    localStorage.setItem('nk_ui_lang', 'en');
    const { unmount } = renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Our family' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /Ask பாட்டி now/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "Today's question" })).toBeInTheDocument();
    unmount();
    renderAt('/elders/new');
    expect(screen.getByLabelText('Tamil name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
