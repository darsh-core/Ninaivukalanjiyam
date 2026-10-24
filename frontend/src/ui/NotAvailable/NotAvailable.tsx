import { useUi } from '../../context/UiContext';
import s from './NotAvailable.module.css';

export function NotAvailable({ feature }: { feature: string }) {
  const { tr } = useUi();
  return (
    <div className={s.panel} role="note">
      <strong className={s.title}>{tr('விரைவில் கிடைக்கும்', 'Not available yet')}</strong>
      <span className={s.feature}>{feature}</span>
    </div>
  );
}
