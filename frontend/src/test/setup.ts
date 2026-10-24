import '@testing-library/jest-dom/vitest';

export interface FakeMedia {
  stoppedTracks: number;
  restore(): void;
}

/** Installs a fake MediaRecorder + navigator.mediaDevices.getUserMedia and a secure context. */
export function installFakeMediaRecorder(): FakeMedia {
  const state: FakeMedia = { stoppedTracks: 0, restore: () => {} };

  class FakeRecorder {
    static isTypeSupported(t: string) {
      return t === 'audio/webm;codecs=opus';
    }
    mimeType: string;
    state: 'inactive' | 'recording' | 'paused' = 'inactive';
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(_stream: unknown, opts?: { mimeType?: string }) {
      this.mimeType = opts?.mimeType ?? '';
    }
    start() {
      this.state = 'recording';
    }
    pause() {
      this.state = 'paused';
    }
    resume() {
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob(['abc'], { type: this.mimeType || 'audio/webm' }) });
      this.onstop?.();
    }
  }

  const stream = {
    getTracks: () => [{ stop: () => void (state.stoppedTracks += 1) }],
  };
  const g = globalThis as unknown as Record<string, unknown>;
  const prevMR = g.MediaRecorder;
  const prevSecure = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
  const prevMD = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  const prevCreate = URL.createObjectURL;
  const prevRevoke = URL.revokeObjectURL;

  g.MediaRecorder = FakeRecorder;
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true, writable: true });
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: async () => stream },
    configurable: true,
  });
  URL.createObjectURL = () => 'blob:fake';
  URL.revokeObjectURL = () => {};

  state.restore = () => {
    g.MediaRecorder = prevMR;
    if (prevSecure) Object.defineProperty(window, 'isSecureContext', prevSecure);
    else delete (window as unknown as Record<string, unknown>).isSecureContext;
    if (prevMD) Object.defineProperty(navigator, 'mediaDevices', prevMD);
    else delete (navigator as unknown as Record<string, unknown>).mediaDevices;
    URL.createObjectURL = prevCreate;
    URL.revokeObjectURL = prevRevoke;
  };
  return state;
}

/** Removes navigator.mediaDevices (as on plain-HTTP pages). */
export function removeMediaDevices() {
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
}
