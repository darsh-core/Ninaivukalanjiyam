import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UiProvider, useUi } from '../context/UiContext';
import { Bi } from './Bi/Bi';
import { StatusLabel } from './StatusLabel/StatusLabel';
import { Tabs } from './Tabs/Tabs';

type Ui = ReturnType<typeof useUi>;
let ui: Ui;
const Probe = () => {
  ui = useUi();
  return null;
};

const wrap = (node: React.ReactNode) => (
  <MemoryRouter>
    <UiProvider>
      <Probe />
      {node}
    </UiProvider>
  </MemoryRouter>
);

beforeEach(() => localStorage.clear());

describe('Bi', () => {
  it('renders Tamil without null/undefined when en is null in English mode', () => {
    const { container } = render(wrap(<Bi ta="கேள்வி" en={null} />));
    act(() => ui.setLang('en'));
    expect(container.textContent).toContain('கேள்வி');
    expect(container.textContent).not.toMatch(/null|undefined/);
  });

  it('shows English only after setLang(en)', () => {
    render(wrap(<Bi ta="கேள்வி" en="Question" />));
    expect(screen.queryByText('Question')).toBeNull();
    act(() => ui.setLang('en'));
    expect(screen.getByText('Question')).toBeTruthy();
    expect(screen.getByText('கேள்வி')).toBeTruthy();
  });
});

describe('StatusLabel', () => {
  it.each(['saved', 'needs_review', 'failed', 'confirmed', 'rejected'] as const)(
    'renders a label for %s in both languages',
    (status) => {
      const { container } = render(wrap(<StatusLabel status={status} />));
      const ta = container.textContent ?? '';
      expect(ta.trim().length).toBeGreaterThan(0);
      act(() => ui.setLang('en'));
      const en = container.textContent ?? '';
      expect(en.trim().length).toBeGreaterThan(0);
      expect(en).not.toBe(ta);
    },
  );
});

describe('tr / language persistence', () => {
  it('defaults to Tamil, switches, and survives remount', () => {
    const first = render(wrap(null));
    expect(ui.tr('தமிழ்', 'English')).toBe('தமிழ்');
    act(() => ui.setLang('en'));
    expect(ui.tr('தமிழ்', 'English')).toBe('English');
    first.unmount();
    render(wrap(null));
    expect(ui.lang).toBe('en');
    expect(ui.tr('தமிழ்', 'English')).toBe('English');
  });
});

describe('Tabs', () => {
  it('renders links', () => {
    render(wrap(<Tabs items={[{ to: '/a', label: 'A' }, { to: '/b', label: 'B' }]} />));
    expect(screen.getByText('A').closest('a')?.getAttribute('href')).toBe('/a');
  });
});
