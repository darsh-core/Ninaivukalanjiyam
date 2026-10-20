import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Pause,
  Play,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { uploadRecordingBlob } from '../services/api';
import type { SessionQuestion } from '../types';

export const Screen9_RecordingStudio: React.FC = () => {
  const {
    activeSession,
    activeQuestionIndex,
    setActiveQuestionIndex,
    setCurrentScreen,
    showToast,
    uiLanguage,
  } = useApp();

  const currentQuestion: SessionQuestion | undefined =
    activeSession?.questions?.[activeQuestionIndex];

  // Recording states
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped' | 'saved'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Custom playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);

  // Audio stream & context refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const webAudioCtxRef = useRef<AudioContext | null>(null);

  // Timer logic
  useEffect(() => {
    if (recordingState === 'recording') {
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState]);

  // Clean up audio streams and animation on unmount ONLY
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        void audioContextRef.current.close().catch(() => {});
      }
      if (webAudioCtxRef.current && webAudioCtxRef.current.state !== 'closed') {
        void webAudioCtxRef.current.close().catch(() => {});
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // Start Real Microphone Recording
  const startRecording = async () => {
    setUploadError('');
    // Stop any existing playback
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }
    if (webAudioSourceRef.current) {
      try { webAudioSourceRef.current.stop(); } catch (_) {}
      webAudioSourceRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackCurrentTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Web Audio API Visualizer Setup
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      drawWaveform();

      // Probe for browser-supported MIME type
      let mimeType = '';
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
      ];
      for (const t of candidateTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
          mimeType = t;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const actualMimeType = recorder.mimeType || mimeType || 'audio/webm';
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Explicitly release visualizer AudioContext to restore macOS speaker mode from voice comms
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }

        const finalBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType,
        });
        setAudioBlob(finalBlob);

        // Revoke previous URL if any to prevent leaks
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
        }

        const url = URL.createObjectURL(finalBlob);
        audioUrlRef.current = url;
        setAudioUrl(url);

        // Stop all media tracks to release microphone hardware
        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start(250);
      setRecordingState('recording');
      setDuration(0);
    } catch (err) {
      console.error('Microphone error:', err);
      setUploadError(
        uiLanguage === 'ta'
          ? 'ஒலிவாங்கி அனுமதி மறுக்கப்பட்டது அல்லது சாதனத்தில் கிடைக்கவில்லை.'
          : 'Microphone permission denied or not available. Please allow mic access.'
      );
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      mediaRecorderRef.current.stop();
      setRecordingState('stopped');
    }
  };

  // Dual-Engine Playback (HTML5 Audio + Web Audio API decode fallback)
  const togglePlayback = async () => {
    // If playing via Web Audio API fallback, stop it
    if (webAudioSourceRef.current) {
      try {
        webAudioSourceRef.current.stop();
      } catch (_) {}
      webAudioSourceRef.current = null;
      setIsPlaying(false);
      return;
    }

    const audio = playbackAudioRef.current;

    if (isPlaying) {
      if (audio) audio.pause();
      setIsPlaying(false);
    } else {
      let html5Played = false;
      if (audio) {
        audio.volume = 1.0;
        audio.muted = false;
        try {
          await audio.play();
          setIsPlaying(true);
          html5Played = true;
        } catch (playErr) {
          console.warn('HTML5 Audio.play() notice:', playErr);
        }
      }

      // If HTML5 Audio didn't play (e.g. Safari WebM or header issue), use Web Audio API decode
      if (!html5Played && audioBlob) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          webAudioCtxRef.current = ctx;
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.onended = () => {
            setIsPlaying(false);
            setPlaybackCurrentTime(0);
            webAudioSourceRef.current = null;
          };
          source.start(0);
          webAudioSourceRef.current = source;
          setIsPlaying(true);
          setPlaybackDuration(Math.floor(audioBuffer.duration));
        } catch (webAudioErr) {
          console.error('Web Audio API playback failed:', webAudioErr);
          setIsPlaying(false);
        }
      }
    }
  };

  const handleReRecord = () => {
    // Stop playback if playing
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
      playbackAudioRef.current.currentTime = 0;
    }
    if (webAudioSourceRef.current) {
      try { webAudioSourceRef.current.stop(); } catch (_) {}
      webAudioSourceRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackCurrentTime(0);
    setPlaybackDuration(0);

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setVersionNumber((prev) => prev + 1);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setRecordingState('idle');
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = '#6B7C98';
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };

    render();
  };

  // Save Recording to Backend
  const handleSaveRecording = async () => {
    if (!currentQuestion) return;

    setUploading(true);
    setUploadError('');

    try {
      let blobToUpload = audioBlob;
      if (!blobToUpload) {
        setUploadError(
          uiLanguage === 'ta'
            ? 'ஒலிப்பதிவு எதுவும் கண்டறியப்படவில்லை. தயவுசெய்து முதலில் பேசி பதிவு செய்யவும்.'
            : 'No audio recorded. Please record your answer before saving.'
        );
        return;
      }

      await uploadRecordingBlob(
        currentQuestion.id,
        blobToUpload,
        duration
      );

      setRecordingState('saved');
      showToast(
        uiLanguage === 'ta'
          ? `பதிவு (v${versionNumber}) வெற்றிகரமாக காப்பகத்தில் சேமிக்கப்பட்டது!`
          : `Recording (v${versionNumber}) saved to family archive!`
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextQuestion = () => {
    if (!activeSession?.questions) return;
    if (activeQuestionIndex < activeSession.questions.length - 1) {
      setActiveQuestionIndex(activeQuestionIndex + 1);
      setCurrentScreen('interview_question');
    } else {
      setCurrentScreen('dashboard');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '860px', textAlign: 'center' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <button
          onClick={() => setCurrentScreen('interview_question')}
          className="btn-pill-outline"
          style={{ padding: '8px 18px', fontSize: '13px' }}
        >
          <ArrowLeft size={15} />
          <span>{uiLanguage === 'ta' ? 'கேள்விக்குத் திரும்பு' : 'Back to Question'}</span>
        </button>

        <span className="badge-pill">
          {activeSession?.full_name_tamil || 'Shanmugam'} — {activeSession?.title || 'Childhood Memories'}
        </span>
      </div>

      {/* Question Card */}
      <div
        className="modern-card"
        style={{
          background: '#FFFFFF',
          borderRadius: '32px',
          padding: '40px 36px',
          boxShadow: '0 16px 40px rgba(94, 86, 83, 0.06)',
          border: '1px solid var(--border-card)',
          marginBottom: '28px',
        }}
      >
        <span className="badge-pill" style={{ marginBottom: '14px', fontSize: '11px' }}>
          CURRENT INTERVIEW QUESTION
        </span>

        <h2 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--slate-taupe-dark)', lineHeight: 1.5, marginBottom: '10px' }}>
          {currentQuestion?.question_tamil || 'உங்கள் குழந்தைப் பருவத்தைப் பற்றி சொல்ல முடியுமா?'}
        </h2>

        {currentQuestion?.question_english && (
          <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
            {currentQuestion.question_english}
          </p>
        )}
      </div>

      {/* Recording Studio Center */}
      <div
        className="modern-card"
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          borderRadius: '32px',
          padding: '48px 36px',
          marginBottom: '28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 48px rgba(94, 86, 83, 0.08)',
        }}
      >
        {/* Large Microphone Button with animated ripple */}
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          {recordingState === 'recording' && (
            <div
              style={{
                position: 'absolute',
                inset: '-16px',
                borderRadius: '50%',
                background: 'rgba(210, 75, 75, 0.2)',
                animation: 'pulse 1.4s ease-out infinite',
              }}
            />
          )}

          <button
            onClick={
              recordingState === 'idle'
                ? startRecording
                : recordingState === 'recording'
                ? pauseRecording
                : recordingState === 'paused'
                ? resumeRecording
                : undefined
            }
            disabled={recordingState === 'saved'}
            style={{
              width: '104px',
              height: '104px',
              borderRadius: '50%',
              background:
                recordingState === 'recording'
                  ? 'var(--status-red)'
                  : recordingState === 'paused'
                  ? 'var(--status-amber)'
                  : recordingState === 'saved'
                  ? 'var(--accent-green)'
                  : 'var(--slate-taupe-dark)',
              color: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              boxShadow:
                recordingState === 'recording'
                  ? '0 12px 32px rgba(210, 75, 75, 0.4)'
                  : '0 12px 32px rgba(94, 86, 83, 0.25)',
              position: 'relative',
              zIndex: 2,
              cursor: recordingState === 'saved' ? 'default' : 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            {recordingState === 'saved' ? (
              <CheckCircle2 size={48} />
            ) : recordingState === 'recording' ? (
              <Pause size={44} />
            ) : (
              <Mic size={48} />
            )}
          </button>
        </div>

        {/* Recording Duration Timer */}
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: '44px',
            fontWeight: 800,
            color: 'var(--slate-taupe-dark)',
            letterSpacing: '2px',
            marginBottom: '8px',
          }}
        >
          {formatTimer(duration)}
        </div>

        {/* Status Label */}
        <div
          style={{
            marginBottom: '22px',
          }}
        >
          <span
            className="badge-pill"
            style={{
              fontSize: '13px',
              fontWeight: 700,
              background:
                recordingState === 'recording'
                  ? 'var(--status-red-bg)'
                  : recordingState === 'paused'
                  ? 'var(--status-amber-bg)'
                  : recordingState === 'saved'
                  ? 'var(--status-green-bg)'
                  : 'var(--slate-bg-tint)',
              color:
                recordingState === 'recording'
                  ? 'var(--status-red)'
                  : recordingState === 'paused'
                  ? 'var(--status-amber)'
                  : recordingState === 'saved'
                  ? 'var(--status-green)'
                  : 'var(--slate-gray)',
            }}
          >
            {recordingState === 'idle' && (uiLanguage === 'ta' ? 'பதிவு செய்யத் தயாராக உள்ளது' : 'Ready to record')}
            {recordingState === 'recording' && (uiLanguage === 'ta' ? '🎙️ ஒலிப்பதிவு நடைபெறுகிறது...' : '🎙️ Recording voice...')}
            {recordingState === 'paused' && (uiLanguage === 'ta' ? '⏸️ இடைநிறுத்தப்பட்டுள்ளது' : '⏸️ Paused')}
            {recordingState === 'stopped' && (uiLanguage === 'ta' ? '⏹️ பதிவு முடிந்தது — சரிபார்க்கவும்' : '⏹️ Recording stopped — review audio')}
            {recordingState === 'saved' && (uiLanguage === 'ta' ? '✓ காப்பகத்தில் சேமிக்கப்பட்டது (v' + versionNumber + ')' : `✓ Saved to archive (v${versionNumber})`)}
          </span>
        </div>

        {/* Live Audio Visualizer Canvas */}
        <canvas
          ref={canvasRef}
          width={300}
          height={44}
          style={{
            display: recordingState === 'recording' ? 'block' : 'none',
            borderRadius: '22px',
            background: 'var(--slate-bg-tint)',
            marginBottom: '20px',
          }}
        />

        {uploadError && (
          <div style={{ color: 'var(--status-red)', fontSize: '13px', marginBottom: '18px', fontWeight: 600 }}>
            {uploadError}
          </div>
        )}

        {/* Controls: Pause / Resume / Stop */}
        {(recordingState === 'recording' || recordingState === 'paused') && (
          <div style={{ display: 'flex', gap: '14px', marginBottom: '18px' }}>
            {recordingState === 'recording' ? (
              <button className="btn-pill-secondary" onClick={pauseRecording}>
                <Pause size={16} />
                <span>Pause</span>
              </button>
            ) : (
              <button className="btn-pill-secondary" onClick={resumeRecording}>
                <Play size={16} />
                <span>Resume</span>
              </button>
            )}

            <button
              className="btn-pill-outline"
              style={{ color: 'var(--status-red)', borderColor: 'var(--status-red)' }}
              onClick={stopRecording}
            >
              <Square size={16} />
              <span>Stop Recording</span>
            </button>
          </div>
        )}

        {/* Playback & Re-record when Stopped */}
        {(recordingState === 'stopped' || recordingState === 'saved') && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '480px' }}>
            {audioUrl && (
              <div
                style={{
                  width: '100%',
                  background: 'var(--slate-bg-tint, #FAF8F5)',
                  border: '1px solid var(--border-subtle, rgba(47, 42, 40, 0.08))',
                  borderRadius: '24px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 4px 16px rgba(47, 42, 40, 0.04)',
                }}
              >
                {/* Big circular Play / Pause Button */}
                <button
                  type="button"
                  onClick={togglePlayback}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--terracotta, #D9532F)',
                    color: '#FFFFFF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 83, 47, 0.35)',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                  title={isPlaying ? 'Pause' : 'Play recorded voice'}
                  aria-label={isPlaying ? 'Pause' : 'Play recorded voice'}
                >
                  {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
                </button>

                {/* Progress Bar & Timers */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--slate-taupe-dark, #2F2A28)' }}>
                    <span>{formatTimer(playbackCurrentTime)}</span>
                    <span style={{ color: '#6B7280' }}>
                      {playbackDuration > 0 ? formatTimer(playbackDuration) : formatTimer(duration)}
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={playbackDuration || duration || 1}
                    step={0.1}
                    value={playbackCurrentTime}
                    onChange={(e) => {
                      const newTime = parseFloat(e.target.value);
                      setPlaybackCurrentTime(newTime);
                      if (playbackAudioRef.current) {
                        playbackAudioRef.current.currentTime = newTime;
                      }
                    }}
                    style={{
                      width: '100%',
                      accentColor: 'var(--terracotta, #D9532F)',
                      cursor: 'pointer',
                    }}
                  />
                </div>

                {/* Hidden HTML5 Audio element */}
                <audio
                  ref={playbackAudioRef}
                  src={audioUrl}
                  preload="auto"
                  onTimeUpdate={() => {
                    if (playbackAudioRef.current) {
                      setPlaybackCurrentTime(Math.floor(playbackAudioRef.current.currentTime));
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (playbackAudioRef.current && isFinite(playbackAudioRef.current.duration)) {
                      setPlaybackDuration(Math.floor(playbackAudioRef.current.duration));
                    }
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    setPlaybackCurrentTime(0);
                  }}
                  style={{ display: 'none' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn-pill-outline" onClick={handleReRecord}>
                <RotateCcw size={16} />
                <span>{uiLanguage === 'ta' ? 'மீண்டும் பதிவு செய்' : 'Re-record Answer'}</span>
              </button>

              {recordingState !== 'saved' && (
                <button
                  className="btn-pill-primary"
                  onClick={handleSaveRecording}
                  disabled={uploading}
                >
                  <Save size={16} />
                  <span>{uploading ? 'Saving...' : 'Save Recording'}</span>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '11px',
                    }}
                  >
                    ↗
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice & Next Step Guard */}
      <div
        className="modern-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 28px',
          borderRadius: '26px',
        }}
      >
        <div style={{ textAlign: 'left', fontSize: '13px', color: 'var(--slate-gray)', lineHeight: 1.5 }}>
          <strong>Safety Rule:</strong> Never replaces existing recordings silently. Version {versionNumber} history is retained.
        </div>

        {recordingState === 'saved' ? (
          <button className="btn-pill-primary" onClick={handleNextQuestion}>
            <span>{uiLanguage === 'ta' ? 'அடுத்த கேள்விக்குச் செல்க' : 'Proceed to Next Question'}</span>
            <span
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '11px',
              }}
            >
              ↗
            </span>
          </button>
        ) : (
          <button
            className="btn-pill-outline"
            style={{ opacity: 0.7 }}
            onClick={() => {
              if (confirm('Discard unsaved recording and advance?')) {
                handleNextQuestion();
              }
            }}
          >
            {uiLanguage === 'ta' ? 'சேமிக்காமல் தொடர' : 'Discard & Skip'}
          </button>
        )}
      </div>
    </div>
  );
};
