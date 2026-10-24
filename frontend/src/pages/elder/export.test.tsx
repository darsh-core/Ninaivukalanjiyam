import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services', async () => {
  const mock = await import('../../services/mockApi');
  return {
    ...mock,
    synthesizeSpeech: vi.fn(mock.synthesizeSpeech),
    createArchiveExport: vi.fn(mock.createArchiveExport),
    getAllRecordings: vi.fn(mock.getAllRecordings),
    IS_MOCK: true,
  };
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

class FakeUtterance {
  text: string;
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

let spoken: FakeUtterance[];
let synth: { speak: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn> };
let audios: HTMLAudioElement[];
let playSpy: ReturnType<typeof vi.spyOn>;
let pauseSpy: ReturnType<typeof vi.spyOn>;
const g = globalThis as unknown as Record<string, unknown>;

async function expectedOrder() {
  const recs = await services.getAllRecordings({ narrator_id: 'n-rajeshwari', sort: 'asc' });
  return recs
    .filter((r) => r.storage_key)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.session_number ?? 0) - (b.r.session_number ?? 0) || a.i - b.i)
    .map(({ r }) => r.question_tamil as string);
}

beforeEach(() => {
  resetMockStore();
  setMockDelay(0);
  localStorage.clear();
  localStorage.setItem('nk_user', JSON.stringify({ id: 'u1', fullName: 'Test', email: 't@x.com' }));
  window.history.replaceState({}, '', '/');
  spoken = [];
  audios = [];
  synth = {
    speak: vi.fn((u: FakeUtterance) => void spoken.push(u)),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true, writable: true });
  g.SpeechSynthesisUtterance = FakeUtterance;
  playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    if (!audios.includes(this as HTMLAudioElement)) audios.push(this as HTMLAudioElement);
    return Promise.resolve();
  });
  pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.mocked(services.synthesizeSpeech).mockClear();
  vi.mocked(services.createArchiveExport).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
  delete g.SpeechSynthesisUtterance;
});

const trackButtons = async () => {
  const list = await screen.findByRole('list', { name: 'பகுதிகள்' });
  return Array.from(list.querySelectorAll('button'));
};

describe('Podcast', () => {
  it('lists the recordings in session then question order', async () => {
    renderAt('/elders/n-rajeshwari/export');
    const btns = await trackButtons();
    const expected = await expectedOrder();
    expect(expected.length).toBeGreaterThan(1);
    expect(btns.map((b) => b.querySelector('span:nth-child(2)')?.textContent)).toEqual(expected);
    expect(await screen.findByRole('heading', { level: 2, name: 'ராஜேஸ்வரி பாட்டி குரல்' })).toBeInTheDocument();
  });

  it('Play first asks for the Tamil question, falls back to ta-IN speech, then plays the answer', async () => {
    renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    const first = (await expectedOrder())[0];
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    expect(services.synthesizeSpeech).toHaveBeenCalledWith(first);
    expect(spoken[0].text).toBe(first);
    expect(spoken[0].lang).toBe('ta-IN');
    expect(playSpy).toHaveBeenCalledTimes(1); // silent primer inside the click
    act(() => spoken[0].onend?.());
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(2));
  });

  it('advances to the next track when the answer ends, and stops at the end', async () => {
    renderAt('/elders/n-rajeshwari/export');
    const btns = await trackButtons();
    const order = await expectedOrder();
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    act(() => spoken[0].onend?.());
    await waitFor(() => expect(audios.length).toBe(1));
    act(() => {
      audios[0].dispatchEvent(new Event('ended'));
    });
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(2));
    expect(spoken[1].text).toBe(order[1]);
    expect(btns[1]).toHaveAttribute('aria-current', 'true');
  });

  it('selecting a track starts it; pause pauses the audio', async () => {
    renderAt('/elders/n-rajeshwari/export');
    const btns = await trackButtons();
    const order = await expectedOrder();
    fireEvent.click(btns[2]);
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    expect(spoken[0].text).toBe(order[2]);
    act(() => spoken[0].onend?.());
    await waitFor(() => expect(playSpy).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /இடைநிறுத்து/ }));
    expect(pauseSpy).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /இயக்கு/ })).toBeInTheDocument();
  });

  it('stops playback and speech on unmount', async () => {
    const { unmount } = renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    act(() => spoken[0].onend?.());
    await waitFor(() => expect(audios.length).toBe(1));
    pauseSpy.mockClear();
    synth.cancel.mockClear();
    unmount();
    expect(pauseSpy).toHaveBeenCalled();
    expect(synth.cancel).toHaveBeenCalled();
  });

  it('shows an empty state when there are no recordings', async () => {
    vi.mocked(services.getAllRecordings).mockResolvedValueOnce([]);
    renderAt('/elders/n-rajeshwari/export');
    expect(await screen.findByText('இன்னும் பதிவுகள் இல்லை')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /இயக்கு/ })).toBeNull();
  });

  it('offers a retry when loading fails', async () => {
    vi.mocked(services.getAllRecordings).mockRejectedValueOnce(new Error('x'));
    renderAt('/elders/n-rajeshwari/export');
    fireEvent.click(await screen.findByRole('button', { name: 'மீண்டும் முயற்சி' }));
    expect(await screen.findByRole('list', { name: 'பகுதிகள்' })).toBeInTheDocument();
  });

  it.each([[false, 'smooth'], [true, 'auto']])('scrolls for #podcast (reduced motion %s -> %s)', async (reduce, behavior) => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    window.matchMedia = vi.fn().mockReturnValue({ matches: reduce }) as unknown as typeof window.matchMedia;
    renderAt('/elders/n-rajeshwari/export#podcast');
    await trackButtons();
    await waitFor(() => expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior })));
    delete (Element.prototype as unknown as Record<string, unknown>).scrollIntoView;
    delete (window as unknown as Record<string, unknown>).matchMedia;
  });

  it('pausing while play() is pending shows no error and Play resumes', async () => {
    renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    let rejectPlay: (e: unknown) => void = () => {};
    playSpy.mockImplementationOnce(() => new Promise((_, rej) => { rejectPlay = rej; }));
    act(() => spoken[0].onend?.());
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: /இடைநிறுத்து/ }));
    await act(async () => rejectPlay(Object.assign(new Error('x'), { name: 'AbortError' })));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('இடைநிறுத்தம்')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(3));
    expect(synth.speak).toHaveBeenCalledTimes(1);
  });

  it('a blocked answer play() asks to tap Play, and Play continues the answer, not the question', async () => {
    renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    playSpy.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })));
    act(() => spoken[0].onend?.());
    expect(await screen.findByRole('alert')).toHaveTextContent('தொடர');
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(3));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('resumes paused speech after cancel when moving to another track', async () => {
    renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /இடைநிறுத்து/ }));
    expect(synth.pause).toHaveBeenCalled();
    synth.resume.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /அடுத்தது/ }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(2));
    expect(synth.resume).toHaveBeenCalled();
    expect(synth.cancel.mock.invocationCallOrder.at(-1)!).toBeLessThan(synth.resume.mock.invocationCallOrder.at(-1)!);
  });
});

describe('Archive and PDF', () => {
  it('Everything creates a full archive and shows a download link with size', async () => {
    renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    const card = screen.getByRole('heading', { name: 'முழு காப்பகம்' }).closest('li') as HTMLElement;
    fireEvent.click(card.querySelector('button') as HTMLButtonElement);
    const link = await screen.findByRole('link', { name: 'பதிவிறக்கு' });
    expect(services.createArchiveExport).toHaveBeenCalledWith('n-rajeshwari', 'full');
    expect(link).toHaveAttribute('href', '#mock-download');
    expect(card).toHaveTextContent('1.2 MB');
  });

  it('NotAvailableError shows NotAvailable while the podcast still works', async () => {
    vi.mocked(services.createArchiveExport).mockRejectedValueOnce(new NotAvailableError('createArchiveExport'));
    renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    const card = screen.getByRole('heading', { name: 'ஒலிப்பதிவுகள் மட்டும்' }).closest('li') as HTMLElement;
    fireEvent.click(card.querySelector('button') as HTMLButtonElement);
    expect(await screen.findByText('விரைவில் கிடைக்கும்')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /இயக்கு/ }));
    await waitFor(() => expect(synth.speak).toHaveBeenCalledTimes(1));
  });

  it('other archive errors show an inline alert', async () => {
    vi.mocked(services.createArchiveExport).mockRejectedValueOnce(new Error('boom'));
    renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    const card = screen.getByRole('heading', { name: 'எழுத்துப்படிகள் மட்டும்' }).closest('li') as HTMLElement;
    fireEvent.click(card.querySelector('button') as HTMLButtonElement);
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('PDF card is marked coming soon with a disabled button', async () => {
    renderAt('/elders/n-rajeshwari/export');
    await trackButtons();
    expect(screen.getByText('விரைவில்')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'புத்தகம் உருவாக்கு' })).toBeDisabled();
  });
});
