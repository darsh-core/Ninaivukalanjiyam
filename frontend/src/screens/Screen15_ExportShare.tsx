import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Archive,
  BookOpen,
  Clock,
  Check,
  Eye,
  Trash2,
  ShieldAlert,
  User,
  CheckCircle2,
  FileCheck,
  X,
  Search,
  ListFilter,
  Printer,
  Loader2,
  PlusCircle,
  Lock,
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  getNarrators,
  getStoryDrafts,
  getTimelineByNarrator,
  getExportPreview,
  getDownloadArchiveUrl,
} from '../services/api';
import type { Narrator, StoryDraft, StoryChapter, LifeEvent } from '../types';
import { PreservationWorkflowFooter } from '../components/PreservationWorkflowFooter';

export const Screen15_ExportShare: React.FC = () => {
  const { user } = useAuth();
  const { activeNarrator, setActiveNarrator, setCurrentScreen, showToast, uiLanguage } = useApp();

  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>(activeNarrator?.id || '');
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<LifeEvent[]>([]);
  const [selectedTimelineEventIds, setSelectedTimelineEventIds] = useState<string[]>([]);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [exportLanguage, setExportLanguage] = useState<'ta' | 'en' | 'both'>('ta');
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'zip' | 'transcript' | 'timeline'>('pdf');
  const [search, setSearch] = useState('');

  // Preview Modal
  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Multi-tenant: Only narrators owned by current user can be exported
  const userNarrators = narrators.filter((n) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return (
      (n.created_by && n.created_by === user.id) ||
      (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
    );
  });

  const currentNarrator = narrators.find((n) => n.id === selectedNarratorId) || activeNarrator;
  const isOwner = Boolean(
    user &&
    (
      (currentNarrator?.created_by && user.id === currentNarrator.created_by) ||
      (currentNarrator?.creator_email && user.email && currentNarrator.creator_email.toLowerCase() === user.email.toLowerCase()) ||
      user.role === 'admin'
    )
  );

  const loadNarratorData = async () => {
    try {
      setLoading(true);
      const nList = await getNarrators();
      setNarrators(nList);

      const owned = nList.filter((n) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return (
          (n.created_by && n.created_by === user.id) ||
          (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
        );
      });

      const targetId =
        selectedNarratorId && owned.some((n) => n.id === selectedNarratorId)
          ? selectedNarratorId
          : activeNarrator?.id && owned.some((n) => n.id === activeNarrator.id)
          ? activeNarrator.id
          : owned[0]?.id || '';

      if (targetId) {
        setSelectedNarratorId(targetId);
        const [drafts, timeline] = await Promise.all([
          getStoryDrafts(targetId),
          getTimelineByNarrator(targetId),
        ]);
        let matchingDraft = null;
        if (exportLanguage === 'en') {
          matchingDraft = drafts?.find((d: any) => d.language_code === 'en') || drafts?.[0];
        } else if (exportLanguage === 'ta') {
          matchingDraft = drafts?.find((d: any) => d.language_code === 'ta') || drafts?.[0];
        } else {
          matchingDraft = drafts?.find((d: any) => d.language_code === 'ta') || drafts?.[0];
        }

        const chaps = matchingDraft?.chapters || [];
        setChapters(chaps);
        setSelectedChapterIds(chaps.map((c: any) => c.id));

        const confirmedEvents = (timeline || []).filter(
          (e: any) => e.extraction_status === 'confirmed' || e.extraction_status === 'corrected'
        );
        const eventsToShow = confirmedEvents.length > 0 ? confirmedEvents : (timeline || []);
        setTimelineEvents(eventsToShow);
        setSelectedTimelineEventIds(eventsToShow.map((e: any) => e.id));
      } else {
        setSelectedNarratorId('');
        setChapters([]);
        setTimelineEvents([]);
      }
    } catch (err) {
      console.error('Failed to load narrator export data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNarratorData();
  }, [selectedNarratorId, user?.id, user?.email]);

  const handleLanguageChange = async (newLang: 'ta' | 'en' | 'both') => {
    setExportLanguage(newLang);

    if (selectedNarratorId) {
      try {
        const drafts = await getStoryDrafts(selectedNarratorId);
        let matchingDraft = null;
        if (newLang === 'en') {
          matchingDraft = drafts.find((d: any) => d.language_code === 'en') || drafts[0];
        } else if (newLang === 'ta') {
          matchingDraft = drafts.find((d: any) => d.language_code === 'ta') || drafts[0];
        } else {
          matchingDraft = drafts.find((d: any) => d.language_code === 'ta') || drafts[0];
        }

        if (matchingDraft && matchingDraft.chapters) {
          setChapters(matchingDraft.chapters);
          setSelectedChapterIds(matchingDraft.chapters.map((c: any) => c.id));
        }
      } catch (err) {
        console.error('Failed to switch draft language:', err);
      }

      // If preview is open, immediately refresh preview in the newly selected language!
      if (isPreviewOpen) {
        try {
          setLoadingPreview(true);
          const preview = await getExportPreview({
            narratorId: selectedNarratorId,
            chapterIds: selectedChapterIds,
            timelineEventIds: selectedTimelineEventIds,
            includeAudio,
            language: newLang,
            format: selectedFormat,
          });
          setPreviewData(preview);
        } catch (previewErr) {
          console.error('Failed to refresh preview in new language:', previewErr);
        } finally {
          setLoadingPreview(false);
        }
      }
    }
  };

  const handleToggleChapter = (id: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSelectAllChapters = () => {
    if (selectedChapterIds.length === chapters.length) {
      setSelectedChapterIds([]);
    } else {
      setSelectedChapterIds(chapters.map((c) => c.id));
    }
  };

  const handleToggleTimelineEvent = (id: string) => {
    setSelectedTimelineEventIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSelectAllTimelineEvents = () => {
    if (selectedTimelineEventIds.length === timelineEvents.length) {
      setSelectedTimelineEventIds([]);
    } else {
      setSelectedTimelineEventIds(timelineEvents.map((e) => e.id));
    }
  };

  const handleOpenPreview = async () => {
    if (!selectedNarratorId) return;
    try {
      setLoadingPreview(true);
      const preview = await getExportPreview({
        narratorId: selectedNarratorId,
        chapterIds: selectedChapterIds,
        timelineEventIds: selectedTimelineEventIds,
        includeAudio,
        language: exportLanguage,
        format: selectedFormat,
      });
      setPreviewData(preview);
      setIsPreviewOpen(true);
    } catch (err) {
      alert('Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedNarratorId) return;

    const downloadUrl = getDownloadArchiveUrl(
      selectedNarratorId,
      selectedFormat,
      selectedChapterIds,
      selectedTimelineEventIds,
      exportLanguage
    );

    if (selectedFormat === 'pdf') {
      try {
        setDownloadingPdf(true);
        showToast(
          uiLanguage === 'ta'
            ? 'PDF புத்தகம் பதிவிறக்கப்படுகிறது... சற்று காத்திருக்கவும்.'
            : 'Downloading PDF biography book... Please wait.',
          'info'
        );

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `${(activeNarrator?.full_name_english || activeNarrator?.full_name_tamil || 'Narrator').replace(/[\s/\\?%*:|"<>]+/g, '_')}_NinaivuKalanjiyam_${exportLanguage}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => {
          setDownloadingPdf(false);
          showToast(
            uiLanguage === 'ta'
              ? 'PDF புத்தகம் வெற்றிகரமாக பதிவிறக்கப்பட்டது!'
              : 'PDF book downloaded successfully!'
          );
        }, 1200);
      } catch (err) {
        console.error('Download error:', err);
        window.open(downloadUrl, '_blank');
        setDownloadingPdf(false);
      }
      return;
    }

    // Trigger download for other formats (zip, transcript, timeline)
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast(
      uiLanguage === 'ta'
        ? `ஆவணப் பதிவிறக்கம் (${selectedFormat.toUpperCase()} · ${exportLanguage.toUpperCase()}) தொடங்கியது!`
        : `Archive download initiated for ${selectedFormat.toUpperCase()} (${exportLanguage.toUpperCase()}) format!`
    );
  };

  const handleDeleteArchive = () => {
    const confirmation = prompt(
      uiLanguage === 'ta'
        ? 'எச்சரிக்கை: இந்த நினைவாளரின் காப்பகத்தை அழிக்க விரும்பினால் "DELETE" என்று உள்ளிடவும்:'
        : 'CAUTION: Type "DELETE" to permanently remove this export archive:'
    );

    if (confirmation === 'DELETE') {
      showToast(
        uiLanguage === 'ta'
          ? 'காப்பகக் கோப்புகள் பாதுகாப்பாக நீக்கப்பட்டன.'
          : 'Archive cleared in accordance with family retention policies.',
        'info'
      );
    }
  };

  const filteredChapters = chapters.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return c.title.toLowerCase().includes(q) || (c.content && c.content.toLowerCase().includes(q));
  });

  const filteredTimelineEvents = timelineEvents.filter((ev) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      ev.title.toLowerCase().includes(q) ||
      (ev.description && ev.description.toLowerCase().includes(q)) ||
      (ev.place_name && ev.place_name.toLowerCase().includes(q)) ||
      (ev.approximate_year && ev.approximate_year.toString().includes(q))
    );
  });

  const getEventDisplayTitle = (ev: LifeEvent) => {
    const rawTitle = ev.title || '';
    const parenMatch = rawTitle.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const taPart = (ev as any).title_tamil || (parenMatch ? parenMatch[1].trim() : rawTitle);
    const enPart = (ev as any).title_english || (parenMatch ? parenMatch[2].trim() : rawTitle);

    if (exportLanguage === 'en') {
      return enPart || rawTitle;
    } else if (exportLanguage === 'both') {
      return parenMatch ? `${taPart} / ${enPart}` : rawTitle;
    } else {
      return taPart || rawTitle;
    }
  };

  if (userNarrators.length === 0) {
    return (
      <div className="page-container" style={{ maxWidth: '960px' }}>
        <div style={{ marginBottom: '32px' }}>
          <span className="badge-pill" style={{ marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'பாதுகாப்பு & ஏற்றுமதி' : 'Preservation & Export'}
          </span>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginTop: '4px' }}>
            {uiLanguage === 'ta' ? 'ஏற்றுமதி மற்றும் பகிர்வு (Export & Share)' : 'Export Archive & Preservation'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px' }}>
            {uiLanguage === 'ta'
              ? 'வாழ்க்கைக் கதைகளை புத்தகமாகவும், முழுமையான ஒலி ஆவணக் காப்பகமாகவும் பாதுகாத்திடுங்கள்'
              : 'Preserve the family life story outside the application in standardized formats'}
          </p>
        </div>

        <div
          className="modern-card"
          style={{
            textAlign: 'center',
            padding: '64px 32px',
            background: '#FFFFFF',
            border: '2px dashed var(--border-subtle)',
            borderRadius: '32px',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'var(--slate-bg-tint)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 20px',
              color: 'var(--slate-taupe-dark)',
            }}
          >
            <ShieldAlert size={34} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '10px' }}>
            {uiLanguage === 'ta' ? 'குடும்ப ஆவண ஏற்றுமதி' : 'Private Family Archive Export'}
          </h2>
          <p
            style={{
              fontSize: '15px',
              color: 'var(--text-muted)',
              maxWidth: '560px',
              margin: '0 auto 28px',
              lineHeight: 1.6,
            }}
          >
            {uiLanguage === 'ta'
              ? 'PDF புத்தகப் பதிவிறக்கம், அசல் குரல் ஆவணங்கள் ஏற்றுமதி, மற்றும் ஆவண நீக்கம் ஆகியவை நினைவாளரின் சொந்தக் குடும்ப உறுப்பினருக்கு மட்டுமே அனுமதிக்கப்படும். தங்களின் கணக்கில் இன்னும் நினைவாளர் சேர்க்கப்படவில்லை.'
              : 'Exporting PDF books, downloading master voice recordings, and archive management are strictly restricted to the narrator’s registered family archivist. No narrators are associated with your account yet.'}
          </p>
          <button
            className="btn-pill-primary"
            onClick={() => {
              setCurrentScreen('session_setup');
            }}
            style={{ padding: '14px 28px', fontSize: '14px' }}
          >
            <PlusCircle size={16} />
            <span>{uiLanguage === 'ta' ? 'புதிய நினைவாளர் சேர்க்க' : 'Add New Narrator'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '32px' }}>
        <span className="badge-pill" style={{ marginBottom: '8px' }}>
          {uiLanguage === 'ta' ? 'பாதுகாப்பு & ஏற்றுமதி' : 'Preservation & Export'}
        </span>
        <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginTop: '4px' }}>
          {uiLanguage === 'ta' ? 'ஏற்றுமதி மற்றும் பகிர்வு (Export & Share)' : 'Export Archive & Preservation'}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px' }}>
          {uiLanguage === 'ta'
            ? 'வாழ்க்கைக் கதைகளை புத்தகமாகவும், முழுமையான ஒலி ஆவணக் காப்பகமாகவும் பாதுகாத்திடுங்கள்'
            : 'Preserve the family life story outside the application in standardized formats'}
        </p>
      </div>

      {/* Search and Filters: Separate Independent Elements (Matching Screenshot Layout) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '26px',
          flexWrap: 'wrap',
          width: '100%',
        }}
      >
        {/* 1. Left: Search Input Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flex: '1 1 320px',
            minWidth: '220px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '9px 14px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
        >
          <Search size={16} color="#4B5563" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              uiLanguage === 'ta'
                ? 'காப்பக அத்தியாயங்கள், நிகழ்வுகளைத் தேடுக...'
                : 'Search chapters and timeline events...'
            }
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              background: 'transparent',
              color: '#1F2937',
              fontWeight: 400,
            }}
          />
        </div>

        {/* 2. Middle: Profile Icon with Narrator Select Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '9px 14px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            flexShrink: 0,
          }}
        >
          <User size={16} color="#4B5563" style={{ flexShrink: 0 }} />
          <select
            value={selectedNarratorId}
            onChange={(e) => setSelectedNarratorId(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              color: '#1F2937',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              paddingRight: '6px',
            }}
          >
            {userNarrators.map((n) => (
              <option key={n.id} value={n.id}>
                {n.full_name_tamil || n.full_name_english} ({n.preferred_name || 'Narrator'})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Right: Status / Format Filter Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '9px 14px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
            flexShrink: 0,
          }}
        >
          <ListFilter size={16} color="#4B5563" style={{ flexShrink: 0 }} />
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value as any)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              color: '#1F2937',
              fontWeight: 500,
              outline: 'none',
              cursor: 'pointer',
              paddingRight: '6px',
            }}
          >
            <option value="pdf">PDF Book (புத்தகம்)</option>
            <option value="zip">Audio Archive (ZIP காப்பகம்)</option>
            <option value="transcript">Text Transcripts (உரை பிரதி)</option>
            <option value="timeline">Timeline Milestones (காலவரிசை)</option>
          </select>
        </div>
      </div>

      {/* 4 Standard Export Options Grid */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
            {uiLanguage === 'ta' ? '1. ஏற்றுமதி வடிவத்தைத் தேர்ந்தெடுக்கவும் (Export Options)' : '1. Choose Export Format'}
          </h3>
          <span className="badge-pill" style={{ fontSize: '11px' }}>Standard preservation formats</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          {/* Format 1: PDF Biography */}
          <div
            onClick={() => setSelectedFormat('pdf')}
            className="modern-card"
            style={{
              padding: '28px',
              borderRadius: '28px',
              border: selectedFormat === 'pdf' ? '2px solid var(--accent-green)' : '1px solid var(--border-card)',
              background: '#FFFFFF',
              boxShadow: selectedFormat === 'pdf' ? '0 12px 32px rgba(140, 83, 56, 0.15)' : '0 8px 24px rgba(94, 86, 83, 0.04)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: selectedFormat === 'pdf' ? 'var(--accent-green)' : 'var(--slate-bg-tint)',
                    color: selectedFormat === 'pdf' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <BookOpen size={22} />
                </div>
                <div
                  className="circle-action-btn"
                  style={{
                    background: selectedFormat === 'pdf' ? 'var(--accent-green)' : '#FAF9F8',
                    color: selectedFormat === 'pdf' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    border: 'none',
                  }}
                >
                  ↗
                </div>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: '0 0 6px' }}>
                PDF Biography
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {uiLanguage === 'ta'
                  ? 'அத்தியாயங்கள், புகைப்படங்கள், மற்றும் அச்சிடக்கூடிய நேர்த்தியான வடிவமைப்புடன் கூடிய வாழ்க்கை வரலாற்றுப் புத்தகம்.'
                  : 'Formatted life story book with chapters, timeline, and photographs.'}
              </p>
            </div>
          </div>

          {/* Format 2: ZIP Archive */}
          <div
            onClick={() => setSelectedFormat('zip')}
            className="modern-card"
            style={{
              padding: '28px',
              borderRadius: '28px',
              border: selectedFormat === 'zip' ? '2px solid var(--accent-green)' : '1px solid var(--border-card)',
              background: '#FFFFFF',
              boxShadow: selectedFormat === 'zip' ? '0 12px 32px rgba(140, 83, 56, 0.15)' : '0 8px 24px rgba(94, 86, 83, 0.04)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: selectedFormat === 'zip' ? 'var(--accent-green)' : 'var(--slate-bg-tint)',
                    color: selectedFormat === 'zip' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Archive size={22} />
                </div>
                <div
                  className="circle-action-btn"
                  style={{
                    background: selectedFormat === 'zip' ? 'var(--accent-green)' : '#FAF9F8',
                    color: selectedFormat === 'zip' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    border: 'none',
                  }}
                >
                  ↗
                </div>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: '0 0 6px' }}>
                ZIP Master Archive
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {uiLanguage === 'ta'
                  ? 'அசல் ஒலிப்பதிவு கோப்புகள் (.webm/.wav), முழு உரை பிரதிகள், மற்றும் JSON மெட்டாடேட்டா கொண்ட முழு காப்பகம்.'
                  : 'Complete bundle with master audio recordings, transcripts, JSON metadata, and approved assets.'}
              </p>
            </div>
          </div>

          {/* Format 3: Transcript Export */}
          <div
            onClick={() => setSelectedFormat('transcript')}
            className="modern-card"
            style={{
              padding: '28px',
              borderRadius: '28px',
              border: selectedFormat === 'transcript' ? '2px solid var(--accent-green)' : '1px solid var(--border-card)',
              background: '#FFFFFF',
              boxShadow: selectedFormat === 'transcript' ? '0 12px 32px rgba(140, 83, 56, 0.15)' : '0 8px 24px rgba(94, 86, 83, 0.04)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: selectedFormat === 'transcript' ? 'var(--accent-green)' : 'var(--slate-bg-tint)',
                    color: selectedFormat === 'transcript' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <FileText size={22} />
                </div>
                <div
                  className="circle-action-btn"
                  style={{
                    background: selectedFormat === 'transcript' ? 'var(--accent-green)' : '#FAF9F8',
                    color: selectedFormat === 'transcript' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    border: 'none',
                  }}
                >
                  ↗
                </div>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: '0 0 6px' }}>
                Transcript Export
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {uiLanguage === 'ta'
                  ? 'பதிவிறக்கம் செய்யக்கூடிய தமிழ் மற்றும் ஆங்கில உரை ஆவணம் (.txt / .md).'
                  : 'Downloadable clean Tamil or English transcript document.'}
              </p>
            </div>
          </div>

          {/* Format 4: Timeline Export */}
          <div
            onClick={() => setSelectedFormat('timeline')}
            className="modern-card"
            style={{
              padding: '28px',
              borderRadius: '28px',
              border: selectedFormat === 'timeline' ? '2px solid var(--accent-green)' : '1px solid var(--border-card)',
              background: '#FFFFFF',
              boxShadow: selectedFormat === 'timeline' ? '0 12px 32px rgba(140, 83, 56, 0.15)' : '0 8px 24px rgba(94, 86, 83, 0.04)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: selectedFormat === 'timeline' ? 'var(--accent-green)' : 'var(--slate-bg-tint)',
                    color: selectedFormat === 'timeline' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Clock size={22} />
                </div>
                <div
                  className="circle-action-btn"
                  style={{
                    background: selectedFormat === 'timeline' ? 'var(--accent-green)' : '#FAF9F8',
                    color: selectedFormat === 'timeline' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                    border: 'none',
                  }}
                >
                  ↗
                </div>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: '0 0 6px' }}>
                Timeline Export
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                {uiLanguage === 'ta'
                  ? 'சரிபார்க்கப்பட்ட வாழ்க்கை வரலாற்று நிகழ்வுகளின் காலவரிசைப் பட்டியல்.'
                  : 'Chronological timeline of reviewed milestones and family events.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Controls */}
      <div className="modern-card" style={{ padding: '30px 34px', borderRadius: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '18px' }}>
          {uiLanguage === 'ta' ? 'சேர்க்க வேண்டிய உள்ளடக்கங்கள் (Export Contents & Filtering)' : 'Export Contents & Filtering'}
        </h3>

        {/* Archive Language Selection at Top */}
        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '10px' }}>
            {uiLanguage === 'ta' ? 'காப்பக மொழி (Archive Language):' : 'Archive Language:'}
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={exportLanguage === 'ta' ? 'btn-pill-primary' : 'btn-pill-outline'}
              style={{ padding: '8px 18px', fontSize: '13px' }}
              onClick={() => handleLanguageChange('ta')}
            >
              தமிழ் (Tamil)
            </button>
            <button
              type="button"
              className={exportLanguage === 'en' ? 'btn-pill-primary' : 'btn-pill-outline'}
              style={{ padding: '8px 18px', fontSize: '13px' }}
              onClick={() => handleLanguageChange('en')}
            >
              ENGLISH
            </button>
            <button
              type="button"
              className={exportLanguage === 'both' ? 'btn-pill-primary' : 'btn-pill-outline'}
              style={{ padding: '8px 18px', fontSize: '13px' }}
              onClick={() => handleLanguageChange('both')}
            >
              இருமொழி (Bilingual Both)
            </button>
          </div>
        </div>

        {/* Life Story Chapters Filter */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={17} color="var(--accent-green)" />
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-taupe-dark)' }}>
                {uiLanguage === 'ta' ? 'வாழ்க்கை வரலாற்று அத்தியாயங்கள் (Life Story Chapters):' : 'Life Story Chapters:'}
              </label>
              <span className="badge-pill" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {selectedChapterIds.length} / {chapters.length}
              </span>
            </div>
            {chapters.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllChapters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-green)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {selectedChapterIds.length === chapters.length
                  ? (uiLanguage === 'ta' ? 'அனைத்தையும் நீக்கு (Deselect All)' : 'Deselect All')
                  : (uiLanguage === 'ta' ? 'அனைத்தையும் தேர்ந்தெடு (Select All)' : 'Select All')}
              </button>
            )}
          </div>

          {chapters.length === 0 ? (
            <div style={{ padding: '14px 18px', background: '#FAF9F8', borderRadius: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {uiLanguage === 'ta'
                ? 'வாழ்க்கை வரலாற்று அத்தியாயங்கள் இன்னும் உருவாக்கப்படவில்லை. (Life Story Builder பக்கத்தில் உருவாக்கலாம்)'
                : 'No life story chapters generated yet for this narrator.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredChapters.map((chap, idx) => {
                const isChecked = selectedChapterIds.includes(chap.id);
                return (
                  <label
                    key={chap.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '13px',
                      color: 'var(--slate-taupe-dark)',
                      cursor: 'pointer',
                      padding: '10px 14px',
                      background: isChecked ? '#F5F9F6' : '#FAF9F8',
                      border: isChecked ? '1px solid #D2E4D6' : '1px solid transparent',
                      borderRadius: '14px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleChapter(chap.id)}
                      style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontWeight: isChecked ? 700 : 500 }}>
                      {chap.title}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Timeline Milestones Filter */}
        <div style={{ marginBottom: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={17} color="var(--accent-green)" />
              <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--slate-taupe-dark)' }}>
                {uiLanguage === 'ta' ? 'வாழ்க்கைக் காலவரிசை நினைவுகள் (Timeline Milestones):' : 'Timeline Milestones:'}
              </label>
              <span className="badge-pill" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {selectedTimelineEventIds.length} / {timelineEvents.length}
              </span>
            </div>
            {timelineEvents.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllTimelineEvents}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-green)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {selectedTimelineEventIds.length === timelineEvents.length
                  ? (uiLanguage === 'ta' ? 'அனைத்தையும் நீக்கு (Deselect All)' : 'Deselect All')
                  : (uiLanguage === 'ta' ? 'அனைத்தையும் தேர்ந்தெடு (Select All)' : 'Select All')}
              </button>
            )}
          </div>

          {timelineEvents.length === 0 ? (
            <div style={{ padding: '14px 18px', background: '#FAF9F8', borderRadius: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
              {uiLanguage === 'ta'
                ? 'காலவரிசை நினைவுகள் இன்னும் உருவாக்கப்படவில்லை.'
                : 'No timeline milestones extracted yet for this narrator.'}
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                paddingRight: '6px',
              }}
            >
              {filteredTimelineEvents.map((ev) => {
                const isChecked = selectedTimelineEventIds.includes(ev.id);
                return (
                  <label
                    key={ev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '13px',
                      color: 'var(--slate-taupe-dark)',
                      cursor: 'pointer',
                      padding: '8px 14px',
                      background: isChecked ? '#F5F9F6' : '#FAF9F8',
                      border: isChecked ? '1px solid #D2E4D6' : '1px solid transparent',
                      borderRadius: '14px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleTimelineEvent(ev.id)}
                      style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {ev.approximate_year && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: '#EAE6E1',
                            color: 'var(--slate-taupe-dark)',
                          }}
                        >
                          {ev.approximate_year}
                        </span>
                      )}
                      <span style={{ fontWeight: isChecked ? 700 : 500 }}>
                        {getEventDisplayTitle(ev)}
                      </span>
                      {ev.place_name && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          📍 {ev.place_name}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Audio Toggle strictly for narrator owner */}
        {isOwner && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)' }}>
              <input
                type="checkbox"
                checked={includeAudio}
                onChange={(e) => setIncludeAudio(e.target.checked)}
                style={{ accentColor: 'var(--accent-green)', width: '16px', height: '16px' }}
              />
              <span>{uiLanguage === 'ta' ? 'அசல் குரல் பதிவுகளை இணைக்கவும் (Include Audio Recordings)' : 'Include Master Voice Recordings (.webm / .wav)'}</span>
            </label>
          </div>
        )}
      </div>

      {/* Action Buttons: Preview, Download, Delete */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {isOwner ? (
          <button
            className="btn-pill-outline"
            style={{ color: 'var(--status-red)', borderColor: 'var(--status-red)' }}
            onClick={handleDeleteArchive}
          >
            <Trash2 size={16} />
            <span>{uiLanguage === 'ta' ? 'காப்பகத்தை நீக்குக' : 'Delete Archive'}</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Lock size={15} />
            <span>{uiLanguage === 'ta' ? 'பார்வையாளர் பயன்முறை (Reader Mode · சொந்தக் குடும்ப உறுப்பினர் மட்டுமே பதிவிறக்க முடியும்)' : 'Reader Mode · Export and master audio restricted to family archivist'}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '14px' }}>
          <button
            className="btn-pill-secondary"
            onClick={handleOpenPreview}
            disabled={loadingPreview}
          >
            <Eye size={16} />
            <span>{loadingPreview ? 'Loading...' : uiLanguage === 'ta' ? 'மாதிரி முன்னோட்டம்' : 'Preview Export'}</span>
          </button>

          {isOwner && (
            <button
              className="btn-pill-primary"
              onClick={handleDownload}
              disabled={downloadingPdf}
              style={{
                padding: '12px 28px',
                opacity: downloadingPdf ? 0.85 : 1,
                cursor: downloadingPdf ? 'wait' : 'pointer',
              }}
            >
              {downloadingPdf ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>
                {downloadingPdf
                  ? (uiLanguage === 'ta' ? 'PDF தயாராகிறது...' : 'Generating PDF...')
                  : selectedFormat === 'pdf'
                  ? (uiLanguage === 'ta' ? 'PDF புத்தகத்தைப் பதிவிறக்கு' : 'Download PDF Book')
                  : (uiLanguage === 'ta' ? 'காப்பகத்தைப் பதிவிறக்கு' : 'Download Archive')}
              </span>
              <span
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '11px',
                }}
              >
                ↗
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Privacy Notice Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          padding: '20px 24px',
          borderRadius: '24px',
          background: 'var(--slate-bg-tint)',
          border: '1px solid var(--border-subtle)',
          fontSize: '13px',
          color: 'var(--slate-taupe-dark)',
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldAlert size={18} color="var(--slate-sand)" />
        </div>
        <div>
          <strong>{uiLanguage === 'ta' ? 'தனியுரிமை மற்றும் சம்மத அறிவிப்பு:' : 'Consent & Sharing Guidelines:'}</strong>{' '}
          {uiLanguage === 'ta'
            ? 'தனிப்பட்ட குடும்பக் கதைகள் இயல்பாகவே பொது இணைப்புகள் வழியாக பகிரப்படக் கூடாது. பதிவுகளையோ அல்லது கதைகளையோ குடும்பத்திற்கு வெளியே பகிர்வதற்கு முன் நினைவாளரின் நேரடி ஒப்புதலைப் பெறுங்கள்.'
            : 'Private stories should not be shared through public links by default. Obtain the narrator’s explicit permission before sharing recordings or personal stories.'}
        </div>
      </div>

      {/* 6-Step Workflow Footer */}
      <PreservationWorkflowFooter
        currentStep="export"
        onPrev={() => setCurrentScreen('story_builder')}
        onNext={() => setCurrentScreen('narrators')}
        customPrevLabel={{
          en: 'Previous: LifeStory Builder',
          ta: 'முந்தைய படி: வாழ்க்கை வரலாறு',
        }}
        customNextLabel={{
          en: 'Complete Archive / View Narrators',
          ta: 'ஆவணம் நிறைவு / நினைவாளர் பட்டியல்',
        }}
      />

      {/* Live Preview Modal */}
      {isPreviewOpen && previewData && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              maxWidth: '860px',
              borderRadius: '32px',
              padding: '36px 40px',
              boxShadow: '0 24px 60px rgba(94, 86, 83, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="badge-pill" style={{ marginBottom: '6px' }}>
                  EXPORT PREVIEW · {selectedFormat.toUpperCase()} · {exportLanguage.toUpperCase()}
                </span>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                  {previewData.draftTitle}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Language Switcher inside modal */}
                <div
                  style={{
                    display: 'flex',
                    background: '#EDEAE6',
                    borderRadius: '9999px',
                    padding: '3px',
                    gap: '4px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('ta')}
                    style={{
                      border: 'none',
                      background: exportLanguage === 'ta' ? 'var(--slate-taupe-dark)' : 'transparent',
                      color: exportLanguage === 'ta' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                      borderRadius: '9999px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    தமிழ்
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    style={{
                      border: 'none',
                      background: exportLanguage === 'en' ? 'var(--slate-taupe-dark)' : 'transparent',
                      color: exportLanguage === 'en' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                      borderRadius: '9999px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ENGLISH
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('both')}
                    style={{
                      border: 'none',
                      background: exportLanguage === 'both' ? 'var(--slate-taupe-dark)' : 'transparent',
                      color: exportLanguage === 'both' ? '#FFFFFF' : 'var(--slate-taupe-dark)',
                      borderRadius: '9999px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    இருமொழி (Both)
                  </button>
                </div>

                <button
                  onClick={() => setIsPreviewOpen(false)}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#FAF9F8',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--slate-taupe-dark)',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div
              style={{
                maxHeight: '60vh',
                overflowY: 'auto',
                background: '#FAF9F8',
                padding: '28px',
                borderRadius: '24px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '24px',
                lineHeight: 1.8,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '18px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>{previewData.draftTitle}</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  {exportLanguage === 'en' ? 'Narrator: ' : exportLanguage === 'both' ? 'நினைவாளர் (Narrator): ' : 'நினைவாளர்: '}
                  {exportLanguage === 'en'
                    ? (previewData.narrator?.full_name_english || previewData.narrator?.full_name_tamil)
                    : (previewData.narrator?.full_name_tamil || previewData.narrator?.full_name_english)}
                  {previewData.narrator?.preferred_name ? ` (${previewData.narrator.preferred_name})` : ''}
                  {previewData.narrator?.birth_year ? ` · ${exportLanguage === 'en' ? 'Birth Year: ' : 'பிறந்த ஆண்டு: '}${previewData.narrator.birth_year}` : ''}
                  {previewData.narrator?.place_of_birth ? ` · 📍 ${previewData.narrator.place_of_birth}` : ''}
                </p>
              </div>

              {/* Chapters */}
              {previewData.chapters && previewData.chapters.length > 0 ? (
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '16px' }}>
                    📖 {exportLanguage === 'en' ? 'Life Story Chapters' : exportLanguage === 'both' ? 'வாழ்க்கை வரலாற்று அத்தியாயங்கள் (Life Story Chapters)' : 'வாழ்க்கை வரலாற்று அத்தியாயங்கள்'}
                  </h3>
                  {previewData.chapters.map((chap: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px dashed var(--border-subtle)' }}>
                      <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                        {chap.title}
                      </h4>
                      <p style={{ fontSize: '15px', color: '#3C3735', whiteSpace: 'pre-line', lineHeight: 1.8 }}>{chap.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>
                  {exportLanguage === 'en' ? 'No chapters selected or generated.' : 'அத்தியாயங்கள் எதுவும் தேர்ந்தெடுக்கப்படவில்லை.'}
                </p>
              )}

              {/* Timeline Milestones */}
              {previewData.timelineEvents && previewData.timelineEvents.length > 0 && (
                <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '16px' }}>
                    ⏳ {exportLanguage === 'en' ? 'Life Timeline Milestones' : exportLanguage === 'both' ? 'வாழ்க்கைக் காலவரிசை நினைவுகள் (Timeline Milestones)' : 'வாழ்க்கைக் காலவரிசை நினைவுகள்'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {previewData.timelineEvents.map((ev: any, idx: number) => (
                      <div key={idx} style={{ padding: '12px 16px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          {ev.approximate_year && (
                            <span style={{ fontWeight: 800, color: 'var(--accent-green)', fontSize: '12px', background: '#EAE6E1', padding: '2px 8px', borderRadius: '9999px' }}>
                              {ev.approximate_year}
                            </span>
                          )}
                          <span style={{ fontWeight: 700, color: 'var(--slate-taupe-dark)', fontSize: '14px' }}>
                            {ev.title}
                          </span>
                          {ev.place_name && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                              📍 {ev.place_name}
                            </span>
                          )}
                        </div>
                        {ev.description && <p style={{ fontSize: '13px', color: '#555', margin: '4px 0 0', lineHeight: 1.6 }}>{ev.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px', flexWrap: 'wrap' }}>
              <button className="btn-pill-outline" onClick={() => setIsPreviewOpen(false)}>
                Close Preview
              </button>

              {selectedFormat === 'pdf' && (
                <button
                  className="btn-pill-secondary"
                  onClick={() => {
                    const printUrl =
                      getDownloadArchiveUrl(
                        selectedNarratorId,
                        'pdf',
                        selectedChapterIds,
                        selectedTimelineEventIds,
                        exportLanguage
                      ) + '&autoprint=true';
                    window.open(printUrl, '_blank');
                  }}
                  title="Open high-resolution print view with browser Print to PDF"
                >
                  <Printer size={16} />
                  <span>{uiLanguage === 'ta' ? 'அச்சிடுக / Print PDF' : 'Print / Save as PDF'}</span>
                </button>
              )}

              <button
                className="btn-pill-primary"
                disabled={downloadingPdf}
                style={{
                  opacity: downloadingPdf ? 0.85 : 1,
                  cursor: downloadingPdf ? 'wait' : 'pointer',
                }}
                onClick={async () => {
                  await handleDownload();
                  setIsPreviewOpen(false);
                }}
              >
                {downloadingPdf ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span>
                  {downloadingPdf
                    ? (uiLanguage === 'ta' ? 'PDF தயாராகிறது...' : 'Generating PDF...')
                    : selectedFormat === 'pdf'
                    ? (uiLanguage === 'ta' ? 'PDF புத்தகத்தைப் பதிவிறக்கு' : 'Download PDF Book')
                    : 'Confirm & Download Archive'}
                </span>
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '11px',
                  }}
                >
                  ↗
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
