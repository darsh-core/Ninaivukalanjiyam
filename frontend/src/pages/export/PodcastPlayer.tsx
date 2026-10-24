import { useCallback, useEffect, useRef, useState } from 'react';
import { useUi } from '../../context/UiContext';
import { getAudioUrl, synthesizeSpeech } from '../../services';
import { Bi } from '../../ui/Bi/Bi';
import { Button } from '../../ui/Button/Button';
import { CassetteWindow } from '../../ui/TapeRecorder/TapeRecorder';
import s from './PodcastPlayer.module.css';

export interface Track {
  id: string;
  storageKey: string;
  questionTamil: string;
  questionEnglish?: string;
  durationSeconds: number;
}

type Phase = 'idle' | 'question' | 'answer';
type Mode = 'none' | 'audio' | 'speech';

// Tiny silent clip used to unlock the audio element inside the Play click (iOS/Safari autoplay rules).
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const isAbort = (e: unknown) => (e as { name?: string } | null)?.name === 'AbortError';

const fmt = (secs: number) => `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;

function speechAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Plays each recording in turn: the Tamil question first (synthesizeSpeech, falling back to browser
 * speech in ta-IN), then the answer audio, then on to the next track.
 * One shared HTMLAudioElement carries both synthesized speech and answers.
 * Pause: audio is paused in place; browser speech uses speechSynthesis.pause()/resume().
 * If synthesized speech is still being fetched when paused, it is dropped and Play restarts that track.
 */
export function PodcastPlayer({ tracks }: { tracks: Track[] }) {
  const { tr } = useUi();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [problem, setProblem] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const token = useRef(0);
  const phase = useRef<Phase>('idle');
  const mode = useRef<Mode>('none');
  const indexRef = useRef(0);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const getAudio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };

  const halt = useCallback(() => {
    token.current++;
    phase.current = 'idle';
    mode.current = 'none';
    const a = audioRef.current;
    if (a) {
      a.onended = null;
      a.onerror = null;
      a.pause();
    }
    if (speechAvailable()) {
      window.speechSynthesis.cancel();
      // Chrome can stay silent for the next utterance if speech was left paused.
      window.speechSynthesis.resume?.();
    }
  }, []);

  const finish = useCallback(() => {
    halt();
    setPlaying(false);
  }, [halt]);

  const startTrack = useCallback(
    (i: number, fromGesture = true) => {
      const list = tracksRef.current;
      if (i < 0 || i >= list.length) {
        finish();
        return;
      }
      halt();
      if (fromGesture) {
        const a = getAudio();
        a.src = SILENT;
        Promise.resolve(a.play()).catch(() => {});
        a.pause();
      }
      const mine = token.current;
      const track = list[i];
      indexRef.current = i;
      setIndex(i);
      setPlaying(true);
      setProblem(false);

      const playUrl = (url: string, next: () => void) => {
        const a = getAudio();
        mode.current = 'audio';
        a.onended = () => {
          if (mine === token.current) next();
        };
        a.onerror = () => {
          if (mine === token.current) next();
        };
        a.src = url;
        Promise.resolve(a.play()).catch((e) => {
          if (mine !== token.current || isAbort(e)) return;
          // Blocked (autoplay rules): stay on this phase so Play continues from here.
          setProblem(true);
          setPlaying(false);
        });
      };

      const playAnswer = () => {
        phase.current = 'answer';
        playUrl(getAudioUrl(track.storageKey), () => startTrack(i + 1, false));
      };

      const browserSpeech = () => {
        if (!speechAvailable()) {
          playAnswer();
          return;
        }
        mode.current = 'speech';
        const u = new SpeechSynthesisUtterance(track.questionTamil);
        u.lang = 'ta-IN';
        u.rate = 1;
        const done = () => {
          if (mine === token.current) playAnswer();
        };
        u.onend = done;
        u.onerror = done;
        window.speechSynthesis.speak(u);
      };

      phase.current = 'question';
      synthesizeSpeech(track.questionTamil).then(
        (res) => {
          if (mine !== token.current) return;
          playUrl(`data:${res.contentType};base64,${res.audioBase64}`, playAnswer);
        },
        () => {
          if (mine === token.current) browserSpeech();
        },
      );
    },
    [finish, halt],
  );

  const pause = () => {
    setPlaying(false);
    if (mode.current === 'audio') audioRef.current?.pause();
    else if (mode.current === 'speech' && speechAvailable()) window.speechSynthesis.pause?.();
    else {
      token.current++;
      phase.current = 'idle';
    }
  };

  const resume = () => {
    if (phase.current === 'idle') {
      startTrack(indexRef.current);
      return;
    }
    setPlaying(true);
    setProblem(false);
    if (mode.current === 'audio') {
      const mine = token.current;
      Promise.resolve(audioRef.current?.play()).catch((e) => {
        if (mine === token.current && !isAbort(e)) {
          setProblem(true);
          setPlaying(false);
        }
      });
    } else if (mode.current === 'speech' && speechAvailable()) {
      window.speechSynthesis.resume?.();
    }
  };

  useEffect(() => halt, [halt]);

  const current = tracks[index];

  return (
    <div className={s.player}>
      <CassetteWindow active={playing} />
      <div className={s.now} aria-live="polite">
        <p className={s.counter}>{tr(`பகுதி ${index + 1} / ${tracks.length}`, `Track ${index + 1} of ${tracks.length}`)}</p>
        <Bi ta={current.questionTamil} en={current.questionEnglish} as="question" />
        <p className={s.counter}>{playing ? tr('இயங்குகிறது', 'Playing') : tr('இடைநிறுத்தம்', 'Paused')}</p>
      </div>
      <div className={s.controls}>
        <Button variant="secondary" onClick={() => startTrack(index - 1)} disabled={index === 0}>
          ⏮ {tr('முந்தையது', 'Previous')}
        </Button>
        {playing ? (
          <Button size="lg" onClick={pause}>⏸ {tr('இடைநிறுத்து', 'Pause')}</Button>
        ) : (
          <Button size="lg" onClick={resume}>▶ {tr('இயக்கு', 'Play')}</Button>
        )}
        <Button variant="secondary" onClick={() => startTrack(index + 1)} disabled={index >= tracks.length - 1}>
          {tr('அடுத்தது', 'Next')} ⏭
        </Button>
      </div>
      {problem && (
        <p role="alert" className={s.problem}>
          {tr('தொடர இயக்கு பொத்தானைத் தட்டவும்.', 'Tap Play to continue.')}
        </p>
      )}
      <ol className={s.list} aria-label={tr('பகுதிகள்', 'Tracks')}>
        {tracks.map((t, i) => (
          <li key={t.id}>
            <button type="button" className={s.track} aria-current={i === index ? 'true' : undefined} onClick={() => startTrack(i)}>
              <span className={s.num}>{i + 1}</span>
              <span className={s.q}>
                <Bi ta={t.questionTamil} en={t.questionEnglish} inline />
              </span>
              <span className={s.dur}>{fmt(t.durationSeconds)}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
