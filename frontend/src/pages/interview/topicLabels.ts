const LABELS: Record<string, { ta: string; en: string }> = {
  'Early Years': { ta: 'குழந்தைப் பருவம்', en: 'Early Years' },
  Education: { ta: 'பள்ளி நாட்கள்', en: 'Education' },
  Youth: { ta: 'இளமை', en: 'Youth' },
  Adult: { ta: 'வேலை', en: 'Adult' },
  Family: { ta: 'குடும்பம்', en: 'Family' },
  Milestones: { ta: 'முக்கிய நிகழ்வுகள்', en: 'Milestones' },
  Traditions: { ta: 'பண்டிகைகள் & மரபுகள்', en: 'Traditions' },
  Wisdom: { ta: 'வாழ்க்கை அறிவுரை', en: 'Wisdom' },
};

export function topicLabel(lifeStage: string): { ta: string; en: string } {
  return LABELS[lifeStage] ?? { ta: lifeStage, en: lifeStage };
}
