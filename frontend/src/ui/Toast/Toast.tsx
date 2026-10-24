import { useUi } from '../../context/UiContext';
import s from './Toast.module.css';

export function Toast() {
  const { toast } = useUi();
  if (!toast) return null;
  return (
    <div className={`${s.toast} ${s[toast.kind]}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
