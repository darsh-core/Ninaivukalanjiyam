import s from './PhotoFrame.module.css';

interface Props {
  initials: string;
  photoUrl?: string | null;
  size?: 'sm' | 'lg';
}

export function PhotoFrame({ initials, photoUrl, size = 'sm' }: Props) {
  return (
    <div className={`${s.frame} ${s[size]}`}>
      <span className={s.tape} aria-hidden="true" />
      {photoUrl ? (
        <img className={s.img} src={photoUrl} alt="" />
      ) : (
        <span className={s.initials}>{initials}</span>
      )}
    </div>
  );
}
