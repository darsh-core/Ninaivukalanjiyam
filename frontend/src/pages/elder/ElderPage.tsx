import { Navigate, useParams } from 'react-router-dom';
import { Placeholder } from '../Placeholder';

export const ELDER_SECTIONS = ['interviews', 'recordings', 'timeline', 'story', 'export'] as const;

export function ElderPage() {
  const { section } = useParams();
  if (!ELDER_SECTIONS.includes(section as (typeof ELDER_SECTIONS)[number])) {
    return <Navigate to="../interviews" relative="path" replace />;
  }
  return <Placeholder name={`Elder: ${section}`} />;
}
