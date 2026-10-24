import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../services', async () => {
  const mock = await import('../../services/mockApi');
  return {
    ...mock,
    generateStoryDraftFromSources: vi.fn(mock.generateStoryDraftFromSources),
    updateStoryDraft: vi.fn(mock.updateStoryDraft),
    createLifeEvent: vi.fn(mock.createLifeEvent),
    deleteLifeEvent: vi.fn(mock.deleteLifeEvent),
    IS_MOCK: true,
  };
});

import * as services from '../../services';
import { NotAvailableError } from '../../services/errors';
import { AppRoutes } from '../../App';
import { AuthProvider } from '../../context/AuthContext';
import { UiProvider } from '../../context/UiContext';
import { resetMockStore, setMockDelay } from '../../services/mockStore';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <UiProvider>
          <AppRoutes />
        </UiProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  resetMockStore();
  setMockDelay(0);
  localStorage.clear();
  localStorage.setItem('nk_user', JSON.stringify({ id: 'u1', fullName: 'Test', email: 't@x.com' }));
  window.history.replaceState({}, '', '/');
  vi.mocked(services.generateStoryDraftFromSources).mockClear();
  vi.mocked(services.updateStoryDraft).mockClear();
  vi.mocked(services.createLifeEvent).mockClear();
  vi.mocked(services.deleteLifeEvent).mockClear();
});

afterEach(() => vi.restoreAllMocks());

const item = (text: string) => screen.getAllByRole('listitem').find((li) => li.textContent?.includes(text))!;

describe('Timeline section', () => {
  it('orders by year and puts a no-year event under Date unknown; nothing runs on load', async () => {
    await services.createLifeEvent('n-rajeshwari', { title: 'தேதி இல்லாத நினைவு', date_precision: 'unknown' });
    vi.mocked(services.createLifeEvent).mockClear();
    renderAt('/elders/n-rajeshwari/timeline');
    const heading = await screen.findByRole('heading', { name: 'தேதி தெரியாதவை' });
    const group = heading.parentElement!;
    expect(within(group).getByText('தேதி இல்லாத நினைவு')).toBeInTheDocument();
    expect(within(group).queryByText('ஈரோட்டில் பிறப்பு')).toBeNull();
    const titles = screen.getAllByRole('listitem').map((li) => li.textContent ?? '');
    const iBirth = titles.findIndex((t) => t.includes('ஈரோட்டில் பிறப்பு'));
    const iSchool = titles.findIndex((t) => t.includes('முதல் பள்ளி நாள்'));
    const iHouse = titles.findIndex((t) => t.includes('ஓட்டு வீட்டில்'));
    expect(iBirth).toBeLessThan(iSchool);
    expect(iSchool).toBeLessThan(iHouse);
    expect(screen.getAllByText(/^சுமார்/).length).toBeGreaterThan(0);
  });

  it('Confirm changes the label to confirmed', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/timeline');
    await screen.findByText('ஓட்டு வீட்டில் வளர்ந்த நாட்கள்');
    const li = item('ஓட்டு வீட்டில்');
    expect(within(li).getByText('சரிபார்க்க வேண்டும்')).toBeInTheDocument();
    await user.click(within(li).getByRole('button', { name: 'உறுதி செய்' }));
    await waitFor(() => expect(within(item('ஓட்டு வீட்டில்')).getByText('உறுதி செய்யப்பட்டது')).toBeInTheDocument());
  });

  it('hides rejected until toggled', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/timeline');
    await screen.findByText('ஈரோட்டில் பிறப்பு');
    expect(screen.queryByText('தவறாகக் கண்டறியப்பட்ட நிகழ்வு')).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'நிராகரிக்கப்பட்டவற்றைக் காட்டு' }));
    expect(await screen.findByText('தவறாகக் கண்டறியப்பட்ட நிகழ்வு')).toBeInTheDocument();
  });

  it('delete asks for confirmation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    renderAt('/elders/n-rajeshwari/timeline');
    await screen.findByText('ஈரோட்டில் பிறப்பு');
    await user.click(within(item('ஈரோட்டில் பிறப்பு')).getByRole('button', { name: 'நீக்கு' }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(services.deleteLifeEvent).not.toHaveBeenCalled();
    await user.click(within(item('ஈரோட்டில் பிறப்பு')).getByRole('button', { name: 'நீக்கு' }));
    await waitFor(() => expect(screen.queryByText('ஈரோட்டில் பிறப்பு')).toBeNull());
    expect(services.deleteLifeEvent).toHaveBeenCalledTimes(1);
  });

  it('add memory requires a title and a valid year, then creates a confirmed memory', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/timeline');
    await screen.findByText('ஈரோட்டில் பிறப்பு');
    await user.click(screen.getByRole('button', { name: '+ நினைவைச் சேர்' }));
    await user.click(screen.getByRole('button', { name: 'சேர்' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('தலைப்பு தேவை');
    await user.type(screen.getByLabelText('தலைப்பு'), 'திருமணம்');
    await user.type(screen.getByLabelText('ஆண்டு'), '1700');
    await user.click(screen.getByRole('button', { name: 'சேர்' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ஆண்டு');
    expect(services.createLifeEvent).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText('ஆண்டு'));
    await user.type(screen.getByLabelText('ஆண்டு'), '1970');
    await user.click(screen.getByRole('button', { name: 'சேர்' }));
    await screen.findByText('திருமணம்');
    expect(vi.mocked(services.createLifeEvent).mock.calls[0][1]).toMatchObject({
      title: 'திருமணம்',
      approximate_year: 1970,
      extraction_status: 'confirmed',
    });
  });

  it('AI extraction only runs on button press', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/timeline');
    await screen.findByText('ஈரோட்டில் பிறப்பு');
    expect(screen.queryByText('புதிதாகக் கண்டறியப்பட்ட நினைவு')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'எழுத்துப்படிகளிலிருந்து கண்டறி (AI)' }));
    expect(await screen.findByText('புதிதாகக் கண்டறியப்பட்ட நினைவு')).toBeInTheDocument();
  });
});

describe('Life story section', () => {
  it('shows the AI banner and the seeded draft chapters', async () => {
    renderAt('/elders/n-rajeshwari/story');
    expect(await screen.findByText(/இது AI உருவாக்கிய வரைவு/)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'காவேரிக் கரையில் பிறப்பு' })).toBeInTheDocument();
  });

  it('chooser passes the checked event ids to generateStoryDraftFromSources', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/story');
    await screen.findByRole('heading', { name: 'காவேரிக் கரையில் பிறப்பு' });
    await user.click(screen.getByRole('button', { name: 'புதிய வரைவை உருவாக்கு' }));
    const generate = await screen.findByRole('button', { name: 'வரைவை உருவாக்கு' });
    const box = await screen.findByRole('checkbox', { name: 'ஈரோட்டில் பிறப்பு' });
    expect(box).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'ஓட்டு வீட்டில் வளர்ந்த நாட்கள்' })).toBeNull();
    await user.click(screen.getByRole('checkbox', { name: 'முதல் பள்ளி நாள்' }));
    await user.click(generate);
    await waitFor(() => expect(services.generateStoryDraftFromSources).toHaveBeenCalledTimes(1));
    const [id, lang, src] = vi.mocked(services.generateStoryDraftFromSources).mock.calls[0];
    expect(id).toBe('n-rajeshwari');
    expect(lang).toBe('ta');
    expect(src.eventIds).toEqual(['ev-1']);
    expect(src.recordingIds.length).toBeGreaterThan(0);
  });

  it('disables Generate when nothing is selected', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/story');
    await screen.findByRole('heading', { name: 'காவேரிக் கரையில் பிறப்பு' });
    await user.click(screen.getByRole('button', { name: 'புதிய வரைவை உருவாக்கு' }));
    await screen.findByRole('checkbox', { name: 'ஈரோட்டில் பிறப்பு' });
    for (const cb of screen.getAllByRole('checkbox')) if ((cb as HTMLInputElement).checked) await user.click(cb);
    expect(screen.getByRole('button', { name: 'வரைவை உருவாக்கு' })).toBeDisabled();
  });

  it('NotAvailableError shows the NotAvailable panel and existing drafts stay visible', async () => {
    const user = userEvent.setup();
    vi.mocked(services.generateStoryDraftFromSources).mockRejectedValueOnce(new NotAvailableError('Story drafts'));
    renderAt('/elders/n-rajeshwari/story');
    await screen.findByRole('heading', { name: 'காவேரிக் கரையில் பிறப்பு' });
    await user.click(screen.getByRole('button', { name: 'புதிய வரைவை உருவாக்கு' }));
    await user.click(await screen.findByRole('button', { name: 'வரைவை உருவாக்கு' }));
    expect(await screen.findByText('விரைவில் கிடைக்கும்')).toBeInTheDocument();
    expect(screen.getByText('Story drafts')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'காவேரிக் கரையில் பிறப்பு' })).toBeInTheDocument();
  });

  it('editing a chapter saves only that chapter content; cancel discards', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/story');
    await screen.findByRole('heading', { name: 'திண்ணையும் கதைகளும்' });
    const T = 'திண்ணையும் கதைகளும்';
    const sec = () => screen.getByRole('heading', { name: T }).closest('section')!;
    await user.click(within(sec()).getByRole('button', { name: 'திருத்து' }));
    await user.clear(within(sec()).getByRole('textbox'));
    await user.type(within(sec()).getByRole('textbox'), 'புதிய உரை');
    await user.click(within(sec()).getByRole('button', { name: 'ரத்து' }));
    expect(services.updateStoryDraft).not.toHaveBeenCalled();
    expect(within(sec()).queryByText('புதிய உரை')).toBeNull();

    await user.click(within(sec()).getByRole('button', { name: 'திருத்து' }));
    await user.clear(within(sec()).getByRole('textbox'));
    await user.type(within(sec()).getByRole('textbox'), 'புதிய உரை');
    await user.click(within(sec()).getByRole('button', { name: 'சேமி' }));
    await waitFor(() => expect(services.updateStoryDraft).toHaveBeenCalledTimes(1));
    const [id, patch] = vi.mocked(services.updateStoryDraft).mock.calls[0];
    expect(id).toBe('d-r1');
    const chs = patch.chapters!;
    expect(chs).toHaveLength(3);
    expect(chs.find((c) => c.id === 'ch-2')!.content).toBe('புதிய உரை');
    expect(chs.find((c) => c.id === 'ch-1')!.content).toMatch(/^ஈரோட்டுக்குப்/);
    expect(await within(sec()).findByText('புதிய உரை')).toBeInTheDocument();
  });

  it('English chapter titles only appear in English mode', async () => {
    renderAt('/elders/n-rajeshwari/story');
    await screen.findByRole('heading', { name: 'திண்ணையும் கதைகளும்' });
    expect(screen.queryByText('The verandah and the stories')).toBeNull();
  });

  it('English chapter titles show in English mode', async () => {
    localStorage.setItem('nk_ui_lang', 'en');
    renderAt('/elders/n-rajeshwari/story');
    expect(await screen.findByText('The verandah and the stories')).toBeInTheDocument();
  });

  it('a new draft stays selected even if the reload fails', async () => {
    const user = userEvent.setup();
    renderAt('/elders/n-rajeshwari/story');
    await screen.findByRole('heading', { name: 'காவேரிக் கரையில் பிறப்பு' });
    await user.click(screen.getByRole('button', { name: 'புதிய வரைவை உருவாக்கு' }));
    const generate = await screen.findByRole('button', { name: 'வரைவை உருவாக்கு' });
    vi.spyOn(services, 'getStoryDrafts').mockRejectedValueOnce(new Error('x'));
    await user.click(generate);
    expect(await screen.findByRole('alert')).toHaveTextContent('பட்டியலைப் புதுப்பிக்க');
    expect(screen.queryByText('இன்னும் வரைவுகள் இல்லை')).toBeNull();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
