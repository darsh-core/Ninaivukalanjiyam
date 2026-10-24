import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { UiProvider } from '../../context/UiContext';
import { TapeRecorder } from './TapeRecorder';
import { installFakeMediaRecorder, removeMediaDevices, type FakeMedia } from '../../test/setup';

let fake: FakeMedia;
beforeEach(() => {
  fake = installFakeMediaRecorder();
});
afterEach(() => {
  cleanup();
  fake.restore();
  vi.restoreAllMocks();
});

function setup(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(
    <UiProvider>
      <TapeRecorder onSave={onSave} />
    </UiProvider>,
  );
  return onSave;
}

async function recordAndStop() {
  fireEvent.click(screen.getByRole('button', { name: /பதிவைத் தொடங்கு/ }));
  await screen.findByText('பதிவாகிறது');
  fireEvent.click(screen.getByRole('button', { name: /^■/ }));
  return screen.findByRole('button', { name: /^சேமி/ });
}

describe('TapeRecorder', () => {
  it('goes through start, pause, stop', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /பதிவைத் தொடங்கு/ }));
    expect(await screen.findByText('பதிவாகிறது')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^இடைநிறுத்து$/ }));
    expect(await screen.findByText('இடைநிறுத்தப்பட்டது')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^■/ }));
    expect(await screen.findByRole('button', { name: /^சேமி/ })).toBeInTheDocument();
    expect(fake.stoppedTracks).toBe(1);
  });

  it('saves and shows saved text', async () => {
    const onSave = setup();
    fireEvent.click(await recordAndStop());
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const [blob, secs] = onSave.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(typeof secs).toBe('number');
    expect(secs).toBeGreaterThanOrEqual(0);
    expect(await screen.findByText('சேமிக்கப்பட்டது')).toBeInTheDocument();
  });

  it('keeps the take and shows the error when save fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    setup(onSave);
    fireEvent.click(await recordAndStop());
    expect(await screen.findByText(/boom/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^சேமி/ })).toBeEnabled();
  });

  it('shows the HTTPS message and a native capture input when insecure', async () => {
    removeMediaDevices();
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true, writable: true });
    setup();
    fireEvent.click(screen.getByRole('button', { name: /பதிவைத் தொடங்கு/ }));
    expect(await screen.findByText(/HTTPS/)).toBeInTheDocument();
    expect(document.querySelector('input[type=file][accept="audio/*"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /போனின் குரல் பதிவியை/ })).toBeInTheDocument();
  });

  it('keeps the preview when discarding is declined', async () => {
    setup();
    await recordAndStop();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: /மீண்டும் பதிவு/ }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^சேமி/ })).toBeInTheDocument();
  });
});

describe('TapeRecorder hardening', () => {
  const startBtn = () => screen.getByRole('button', { name: /பதிவைத் தொடங்கு/ });
  const setMic = (getUserMedia: () => Promise<unknown>) =>
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });

  it('registers beforeunload while dirty and removes it after discard; reports dirty', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const onDirtyChange = vi.fn();
    render(
      <UiProvider>
        <TapeRecorder onSave={vi.fn().mockResolvedValue(undefined)} onDirtyChange={onDirtyChange} />
      </UiProvider>,
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    fireEvent.click(startBtn());
    await screen.findByText('பதிவாகிறது');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    expect(add.mock.calls.some((c) => c[0] === 'beforeunload')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /^■/ }));
    await screen.findByRole('button', { name: /^சேமி/ });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /மீண்டும் பதிவு/ }));
    expect(await screen.findByRole('button', { name: /பதிவைத் தொடங்கு/ })).toBeInTheDocument();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(remove.mock.calls.some((c) => c[0] === 'beforeunload')).toBe(true);
  });

  it('removes beforeunload and clears dirty after save', async () => {
    const onDirtyChange = vi.fn();
    const remove = vi.spyOn(window, 'removeEventListener');
    render(
      <UiProvider>
        <TapeRecorder onSave={vi.fn().mockResolvedValue(undefined)} onDirtyChange={onDirtyChange} />
      </UiProvider>,
    );
    fireEvent.click(startBtn());
    await screen.findByText('பதிவாகிறது');
    fireEvent.click(screen.getByRole('button', { name: /^■/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^சேமி/ }));
    await screen.findByText('சேமிக்கப்பட்டது');
    // dirty is reported from a passive effect, which can run just after the text appears
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
    await waitFor(() => expect(remove.mock.calls.some((c) => c[0] === 'beforeunload')).toBe(true));
  });

  it('excludes paused time from the saved duration', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    setup(onSave);
    fireEvent.click(startBtn());
    await screen.findByText('பதிவாகிறது');
    now += 3000;
    fireEvent.click(screen.getByRole('button', { name: /^இடைநிறுத்து$/ }));
    await screen.findByText('இடைநிறுத்தப்பட்டது');
    now += 60_000;
    fireEvent.click(screen.getByRole('button', { name: /^தொடர்$/ }));
    await screen.findByText('பதிவாகிறது');
    now += 2000;
    fireEvent.click(screen.getByRole('button', { name: /^■/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^சேமி/ }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][1]).toBe(5);
  });

  it('a file from the native capture input reaches the recorded preview', async () => {
    setup();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    expect(input.hasAttribute('capture')).toBe(true);
    expect(input.getAttribute('capture')).toBe('');
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.m4a', { type: 'audio/mp4' })] } });
    expect(await screen.findByRole('button', { name: /^சேமி/ })).toBeInTheDocument();
  });

  it('stops tracks when unmounted while recording', async () => {
    const { unmount } = render(
      <UiProvider>
        <TapeRecorder onSave={vi.fn()} />
      </UiProvider>,
    );
    fireEvent.click(startBtn());
    await screen.findByText('பதிவாகிறது');
    unmount();
    expect(fake.stoppedTracks).toBe(1);
  });

  it('stops the stream if unmounted while the permission prompt is pending', async () => {
    let resolve!: (s: unknown) => void;
    let stopped = 0;
    setMic(() => new Promise((r) => (resolve = r)));
    const { unmount } = render(
      <UiProvider>
        <TapeRecorder onSave={vi.fn()} />
      </UiProvider>,
    );
    fireEvent.click(startBtn());
    unmount();
    resolve({ getTracks: () => [{ stop: () => void stopped++ }] });
    await waitFor(() => expect(stopped).toBe(1));
  });

  it('ignores a second Start while the first is pending', async () => {
    let calls = 0;
    let resolve!: (s: unknown) => void;
    setMic(() => {
      calls++;
      return new Promise((r) => (resolve = r));
    });
    setup();
    const btn = startBtn();
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(calls).toBe(1);
    expect(btn).toBeDisabled();
    resolve({ getTracks: () => [{ stop() {} }] });
    await screen.findByText('பதிவாகிறது');
    expect(calls).toBe(1);
  });

  it.each([
    ['NotAllowedError', /அனுமதி மறுக்கப்பட்டது/],
    ['NotFoundError', /மைக்ரோஃபோன் இல்லை/],
  ])('shows a specific message for %s', async (name, re) => {
    setMic(() => Promise.reject(Object.assign(new Error('x'), { name })));
    setup();
    fireEvent.click(startBtn());
    expect(await screen.findByText(re)).toBeInTheDocument();
  });

  it('shows the unsupported message when MediaRecorder is missing', async () => {
    (globalThis as unknown as Record<string, unknown>).MediaRecorder = undefined;
    setup();
    fireEvent.click(startBtn());
    expect(await screen.findByText(/ஆதரிக்கவில்லை/)).toBeInTheDocument();
  });
});
