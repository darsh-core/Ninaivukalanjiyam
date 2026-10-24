import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Play, Pause, Download } from 'lucide-react';
import { getAudioUrl } from '../../services';
import s from './AudioPlayer.module.css';

interface AudioPlayerProps {
  storageKey: string;
  durationSeconds?: number;
  title?: string;
  showDownload?: boolean;
}

const SPEEDS = [1, 1.25, 1.5, 0.75];

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60);
  const sec = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export function AudioPlayer({ storageKey, durationSeconds = 0, title, showDownload = true }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioSrc = getAudioUrl(storageKey);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => {
      if (audio.duration && isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const changeSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(playbackRate) + 1) % SPEEDS.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div className={s.player}>
      <audio ref={audioRef} src={audioSrc} preload="metadata" />
      <button type="button" className={s.play} onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </button>
      <div className={s.middle}>
        {title && <div className={s.title}>{title}</div>}
        <input
          className={s.range}
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          aria-label="Seek"
        />
        <div className={s.times}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <button type="button" className={s.speed} onClick={changeSpeed} aria-label="Playback speed">
        {playbackRate}x
      </button>
      {showDownload && (
        <a className={s.download} href={audioSrc} download={storageKey.split('/').pop() || 'recording.webm'} aria-label="Download audio">
          <Download size={18} />
        </a>
      )}
    </div>
  );
}
