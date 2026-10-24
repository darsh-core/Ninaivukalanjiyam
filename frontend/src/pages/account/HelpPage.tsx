import { Link } from 'react-router-dom';
import { useUi } from '../../context/UiContext';
import { Card } from '../../ui/Card/Card';
import { PageHeader } from '../../ui/PageHeader/PageHeader';
import s from './account.module.css';

export function HelpPage() {
  const { tr } = useUi();
  const steps = [
    [tr('பெரியவரைச் சேருங்கள்', 'Add an elder'), tr('பெயர், அழைக்கும் முறை (பாட்டி, தாத்தா), விருப்பப்பட்டால் ஒரு படம்.', 'Their name, how you address them (Paati, Thatha), and a photo if you like.')],
    [tr('ஒரு தலைப்பைத் தேர்ந்தெடுங்கள்', 'Pick a topic'), tr('சிறுவயது, பள்ளி, வேலை, குடும்பம்… அல்லது முகப்பில் உள்ள "இன்றைய கேள்வி"யைத் தொடுங்கள்.', 'Childhood, school, work, family… or just tap "Today\'s question" on the home page.')],
    [tr('கேள்வியைக் கேளுங்கள்', 'Hear the question'), tr('🔊 பொத்தான் கேள்வியைத் தமிழில் வாசிக்கும்.', 'The 🔊 button reads the question aloud in Tamil.')],
    [tr('பதிவு செய்யுங்கள்', 'Record the answer'), tr('பெரிய பொத்தானை அழுத்தி பேசுங்கள். முடிந்ததும் நிறுத்தி, கேட்டுப் பார்த்து, சேமியுங்கள்.', 'Press the big button and talk. Stop when done, listen back, then save.')],
    [tr('பின்னர் சரிபாருங்கள்', 'Review later'), tr('எழுத்துப்படிகளைத் திருத்தலாம்; பழைய பதிப்புகள் அப்படியே இருக்கும்.', 'You can correct transcripts; earlier versions are always kept.')],
  ];
  return (
    <div className={s.page}>
      <PageHeader title={tr('உதவி & வழிகாட்டி', 'Help & guide')} subtitle={tr('ஒரு நினைவைப் பதிவு செய்வது எப்படி', 'How to record a memory')} />
      <ol className={s.steps}>
        {steps.map(([title, body], i) => (
          <li key={i}>
            <Card className={s.step}>
              <span className={s.stepNo} aria-hidden="true">{i + 1}</span>
              <div>
                <h2 className={s.rowName}>{title}</h2>
                <p className={s.meta}>{body}</p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <Card className={s.prose}>
        <h2>{tr('குறிப்புகள்', 'Tips')}</h2>
        <ul>
          <li>{tr('அமைதியான இடத்தில், போனை பெரியவருக்கு அருகில் வையுங்கள்.', 'Find a quiet spot and keep the phone close to the elder.')}</li>
          <li>{tr('நினைவில்லை என்றால் "தவிர்" — எந்த அழுத்தமும் வேண்டாம்.', 'If they don\'t remember, just skip — no pressure.')}</li>
          <li>{tr('போனில் ஒலிவாங்கி வேலை செய்ய தளத்தை https:// முகவரியில் திறக்கவும்.', 'On phones, open the site with an https:// address so the microphone works.')}</li>
        </ul>
        <p><Link to="/privacy">{tr('தனியுரிமை & ஒப்புதல் →', 'Privacy & consent →')}</Link></p>
      </Card>
    </div>
  );
}
