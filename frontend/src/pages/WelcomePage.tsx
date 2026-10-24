import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUi } from '../context/UiContext';
import { Tagline } from './Tagline';
import s from './WelcomePage.module.css';

/** The public information site shown before signing in. */
export function WelcomePage() {
  const { isAuthenticated } = useAuth();
  const { lang, setLang, tr } = useUi();
  const location = useLocation();
  if (isAuthenticated) return <Navigate to="/" replace />;

  const tryNow = (extra?: string) => (
    <Link to="/signin?mode=register" state={location.state} className={`${s.cta} ${extra ?? ''}`}>
      {tr('இப்போது முயலுங்கள்', 'Try now')} →
    </Link>
  );

  const steps = [
    { icon: '🗣️', ta: 'கேளுங்கள்', en: 'Ask', bodyTa: 'ஒவ்வொரு நாளும் ஒரு எளிய கேள்வி — தமிழில், அன்புடன், உரக்க வாசிக்கப்படும்.', bodyEn: 'One gentle question at a time — in Tamil, read aloud, with warmth.' },
    { icon: '🎙️', ta: 'பதிவு செய்யுங்கள்', en: 'Record', bodyTa: 'ஒரு பெரிய பொத்தான். பாட்டி பேசுகிறார்; அவரின் குரல் அப்படியே பாதுகாக்கப்படுகிறது.', bodyEn: 'One big button. Paati talks; her voice is kept exactly as it is.' },
    { icon: '📖', ta: 'பாதுகாத்துப் பகிருங்கள்', en: 'Keep & share', bodyTa: 'எழுத்துப்படி, வாழ்க்கைக் காலவரிசை, வாழ்க்கைக் கதை — பேரக்குழந்தைகளுக்காக.', bodyEn: 'Transcripts, a life timeline and a life story — for the grandchildren.' },
  ];

  const features = [
    { icon: '🔊', ta: 'குரல் அப்படியே', en: 'The voice, as it is', bodyTa: 'மூல ஒலிப்பதிவு எப்போதும் வைக்கப்படும் — எழுத்து அதிலிருந்தே வரும்.', bodyEn: 'The original recording is always kept — every word traces back to it.' },
    { icon: '👵', ta: 'பெரியவர்களுக்கு எளிது', en: 'Easy for elders', bodyTa: 'பெரிய எழுத்து, குறைந்த பொத்தான்கள், தமிழ் முதலில்.', bodyEn: 'Large text, few buttons, Tamil first.' },
    { icon: '🧵', ta: 'வாழ்க்கை ஒரு கோட்டில்', en: 'A life on one thread', bodyTa: 'நினைவுகள் தானாக ஒரு காலவரிசையாகச் சேர்கின்றன.', bodyEn: 'Memories gather into a timeline you can review and correct.' },
    { icon: '🎧', ta: 'கேட்கக்கூடிய கதை', en: 'A story you can hear', bodyTa: 'கேள்வியும் பதிலும் ஒரு குடும்ப வானொலி போல ஒலிக்கும்.', bodyEn: 'Questions and answers play back like a family radio show.' },
    { icon: '🔒', ta: 'குடும்பத்துக்கு மட்டும்', en: 'Just for family', bodyTa: 'எதுவும் பொதுவில் இல்லை. ஒப்புதலுடன் மட்டுமே பதிவு.', bodyEn: 'Nothing is public. Recording only with consent.' },
  ];

  return (
    <div className={s.site}>
      <header className={s.nav}>
        <span className={s.brand}>நினைவுக் களஞ்சியம்</span>
        <div className={s.navRight}>
          <button type="button" className={s.lang} onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}>
            {lang === 'ta' ? 'English' : 'தமிழ்'}
          </button>
          <Link to="/signin" state={location.state} className={s.signIn}>{tr('உள்நுழை', 'Sign in')}</Link>
          {tryNow(s.ctaSmall)}
        </div>
      </header>

      <main>
        <section className={s.hero}>
          <div className={s.heroInner}>
            <p className={s.eyebrow}>{tr('குடும்ப நினைவுக் காப்பகம்', 'A family memory archive')}</p>
            <h1 className={s.tagline}><Tagline /></h1>
            {lang === 'en' && <p className={s.taglineEn}>Let’s preserve the voices and memories of our family elders.</p>}
            <p className={s.heroBody}>
              {tr(
                'பாட்டியின் சிரிப்பு, தாத்தாவின் ஊர்க் கதைகள், அம்மா பாடிய தாலாட்டு — இவை ஒருமுறைதான் சொல்லப்படுகின்றன. அவை மறைவதற்குள், அவர்களின் சொந்தக் குரலிலேயே பதிவு செய்வோம்.',
                "Paati's laugh, Thatha's stories of the village, the lullaby Amma sang — they are told only once. Let's keep them, in their own voices, before they fade.",
              )}
            </p>
            <div className={s.heroActions}>
              {tryNow(s.ctaLarge)}
              <a href="#how" className={s.ghost}>{tr('எப்படி வேலை செய்கிறது ↓', 'How it works ↓')}</a>
            </div>
          </div>
        </section>

        <section className={s.quote}>
          <p>
            {tr(
              '“ஒரு பெரியவர் மறையும்போது, ஒரு நூலகமே எரிகிறது.”',
              '“When an elder passes, a library burns.”',
            )}
          </p>
        </section>

        <section id="how" className={s.section}>
          <h2 className={s.h2}>{tr('எப்படி வேலை செய்கிறது', 'How it works')}</h2>
          <ol className={s.steps}>
            {steps.map((st, i) => (
              <li key={st.en} className={s.step}>
                <span className={s.stepNo}>{i + 1}</span>
                <span className={s.stepIcon} aria-hidden="true">{st.icon}</span>
                <h3 className={s.h3}>{tr(st.ta, st.en)}</h3>
                <p className={s.muted}>{tr(st.bodyTa, st.bodyEn)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={`${s.section} ${s.tinted}`}>
          <h2 className={s.h2}>{tr('ஏன் நினைவுக் களஞ்சியம்?', 'Why Ninaivu Kalanjiyam?')}</h2>
          <ul className={s.features}>
            {features.map((f) => (
              <li key={f.en} className={s.feature}>
                <span className={s.featureIcon} aria-hidden="true">{f.icon}</span>
                <h3 className={s.h3}>{tr(f.ta, f.en)}</h3>
                <p className={s.muted}>{tr(f.bodyTa, f.bodyEn)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={s.final}>
          <h2 className={s.finalTitle}>{tr('இன்றே ஒரு கேள்வியுடன் தொடங்குங்கள்.', 'Start with one question today.')}</h2>
          <p className={s.finalBody}>
            {tr('பத்து நிமிடம். ஒரு கேள்வி. ஒரு குரல் — என்றென்றைக்குமாக.', 'Ten minutes. One question. One voice — kept for good.')}
          </p>
          {tryNow(s.ctaLarge)}
        </section>
      </main>

      <footer className={s.footer}>
        <span className={s.brand}>நினைவுக் களஞ்சியம்</span>
        <span className={s.muted}>{tr('உங்கள் குடும்பத்தின் நினைவுகள், உங்கள் குடும்பத்துக்கு மட்டும்.', "Your family's memories, for your family only.")}</span>
      </footer>
    </div>
  );
}
