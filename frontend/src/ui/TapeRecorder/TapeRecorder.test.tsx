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
