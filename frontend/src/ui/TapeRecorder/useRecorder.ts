import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'paused' | 'recorded' | 'saving' | 'saved' | 'error';
export type RecorderErrorKind = 'insecure' | 'denied' | 'nomic' | 'unsupported' | 'unknown' | 'save';

export interface RecorderError {
  kind: RecorderErrorKind;
  detail?: string;
}

export const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac',
  'audio/ogg;codecs=opus',
];

export function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<RecorderError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);
  const accumRef = useRef(0); // ms accumulated before the current running segment
  const segStartRef = useRef<number | null>(null);
  const finalSecondsRef = useRef(0);

  const currentMs = () => accumRef.current + (segStartRef.current ? Date.now() - segStartRef.current : 0);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const setBlobAndUrl = useCallback((b: Blob | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = b ? URL.createObjectURL(b) : null;
    setBlob(b);
    setUrl(urlRef.current);
  }, []);

  // Tick the display while recording.
  useEffect(() => {
    if (state !== 'recording') return;
    const id = setInterval(() => setElapsed(Math.floor(currentMs() / 1000)), 250);
    return () => clearInterval(id);
  }, [state]);

  // Unmount: stop tracks and the recorder without touching state.
  useEffect(
    () => () => {
      const r = recorderRef.current;
      if (r) {
        r.ondataavailable = null;
        r.onstop = null;
        if (r.state !== 'inactive') {
          try {
            r.stop();
          } catch {
            /* already stopped */
          }
        }
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const fail = useCallback((e: RecorderError) => {
    setError(e);
    setState('error');
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window !== 'undefined' && !window.isSecureContext) return fail({ kind: 'insecure' });
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function' || typeof MediaRecorder === 'undefined') {
      return fail({ kind: 'unsupported' });
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return fail({ kind: 'denied' });
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return fail({ kind: 'nomic' });
      return fail({ kind: 'unknown', detail: err instanceof Error ? err.message : undefined });
    }
    try {
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const type = rec.mimeType || mimeType || 'audio/webm';
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        releaseStream();
        accumRef.current = currentMs();
        segStartRef.current = null;
        finalSecondsRef.current = Math.round(accumRef.current / 1000);
        setElapsed(finalSecondsRef.current);
        setBlobAndUrl(new Blob(chunksRef.current, { type }));
        setState('recorded');
      };
      streamRef.current = stream;
      recorderRef.current = rec;
      accumRef.current = 0;
      segStartRef.current = Date.now();
      setElapsed(0);
      rec.start(250);
      setState('recording');
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      fail({ kind: 'unsupported', detail: err instanceof Error ? err.message : undefined });
    }
  }, [fail, releaseStream, setBlobAndUrl]);

  const pause = useCallback(() => {
    const r = recorderRef.current;
    if (!r || r.state !== 'recording') return;
    r.pause();
    accumRef.current = currentMs();
    segStartRef.current = null;
    setElapsed(Math.floor(accumRef.current / 1000));
    setState('paused');
  }, []);

  const resume = useCallback(() => {
    const r = recorderRef.current;
    if (!r || r.state !== 'paused') return;
    r.resume();
    segStartRef.current = Date.now();
    setState('recording');
  }, []);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== 'inactive') r.stop();
  }, []);

  /** A file from the phone's native recorder goes to the same preview state. */
  const loadFile = useCallback(
    (file: Blob, seconds = 0) => {
      setError(null);
      accumRef.current = seconds * 1000;
      finalSecondsRef.current = seconds;
      setElapsed(seconds);
      setBlobAndUrl(file);
      setState('recorded');
    },
    [setBlobAndUrl],
  );

  const setDuration = useCallback((seconds: number) => {
    finalSecondsRef.current = seconds;
    accumRef.current = seconds * 1000;
    setElapsed(seconds);
  }, []);

  const reset = useCallback(() => {
    setBlobAndUrl(null);
    setError(null);
    accumRef.current = 0;
    segStartRef.current = null;
    finalSecondsRef.current = 0;
    setElapsed(0);
    setState('idle');
  }, [setBlobAndUrl]);

  const markSaving = useCallback(() => {
    setError(null);
    setState('saving');
  }, []);
  const markSaved = useCallback(() => setState('saved'), []);
  const markSaveFailed = useCallback((detail?: string) => {
    setError({ kind: 'save', detail });
    setState('error');
  }, []);

  return {
    state,
    elapsed,
    blob,
    url,
    error,
    getSeconds: () => finalSecondsRef.current,
    start,
    pause,
    resume,
    stop,
    loadFile,
    setDuration,
    reset,
    markSaving,
    markSaved,
    markSaveFailed,
  };
}
