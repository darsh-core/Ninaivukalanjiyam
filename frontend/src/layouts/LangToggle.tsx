import { useUi } from '../context/UiContext';
import { Button } from '../ui/Button/Button';

export function LangToggle() {
  const { lang, setLang } = useUi();
  return (
    <Button variant="text" onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}>
      {lang === 'ta' ? 'English' : 'தமிழ்'}
    </Button>
  );
}
