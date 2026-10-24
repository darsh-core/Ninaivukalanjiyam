import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Sparkles,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Edit3,
  Calendar,
  MapPin,
  Headphones,
  FileText,
  User,
  Shield,
  Trash2,
  Search,
  ListFilter,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import {
  getNarrators,
  getTimelineByNarrator,
  updateLifeEventStatus,
  createLifeEvent,
  deleteLifeEvent,
  extractMemoriesWithAI,
} from '../services/api';
import type { Narrator, LifeEvent } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { PageNavigationFooter } from '../components/PageNavigationFooter';

export const Screen12_MemoriesTimeline: React.FC = () => {
  const { user } = useAuth();
  const {
    activeNarrator,
    setActiveNarrator,
    setCurrentScreen,
    showToast,
    uiLanguage,
    setIsAddNarratorOpen,
    setEditingNarrator,
  } = useApp();

  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [selectedNarratorId, setSelectedNarratorId] = useState<string>(activeNarrator?.id || '');
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'unreviewed' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Multi-tenant: Only narrators owned by current user can be accessed
  const userNarrators = narrators.filter((n) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Boolean(
      (n.created_by && n.created_by === user.id) ||
      (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
    );
  });

  const currentNarrator = userNarrators.find((n) => n.id === selectedNarratorId) || (activeNarrator && userNarrators.find((n) => n.id === activeNarrator.id));
  const isOwner = Boolean(
    user &&
    (
      (currentNarrator?.created_by && user.id === currentNarrator.created_by) ||
      (currentNarrator?.creator_email && user.email && currentNarrator.creator_email.toLowerCase() === user.email.toLowerCase()) ||
      user.role === 'admin'
    )
  );

  // New Event Form
  const [newTitle, setNewTitle] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newPlace, setNewPlace] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadNarratorsAndTimeline = async () => {
    try {
      setLoading(true);
      const list = await getNarrators();
      setNarrators(list);

      const owned = list.filter((n) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return Boolean(
          (n.created_by && n.created_by === user.id) ||
          (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
        );
      });

      // Strictly prioritize from user's owned narrators
      const narratorWithContent = owned.find((n) => (n.recording_count || 0) > 0 || (n.event_count || 0) > 0);
      const targetId =
        (selectedNarratorId && owned.some((n) => n.id === selectedNarratorId) && selectedNarratorId) ||
        (activeNarrator?.id && owned.some((n) => n.id === activeNarrator.id) && activeNarrator.id) ||
        narratorWithContent?.id ||
        owned[0]?.id ||
        '';

      if (targetId) {
        setSelectedNarratorId(targetId);
        const chosen = owned.find((n) => n.id === targetId);
        if (chosen) setActiveNarrator(chosen);

        const evs = await getTimelineByNarrator(targetId);
        setEvents(evs);

        // Auto-extract if this narrator has recordings but no events extracted yet
        if (evs.length === 0 && (chosen?.recording_count || 0) > 0) {
          try {
            setExtracting(true);
            await extractMemoriesWithAI(targetId);
            const fresh = await getTimelineByNarrator(targetId);
            setEvents(fresh);
          } catch (autoErr) {
            console.warn('Auto memory extraction notice:', autoErr);
          } finally {
            setExtracting(false);
          }
        }
      } else {
        setSelectedNarratorId('');
        setEvents([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNarratorsAndTimeline();
  }, [selectedNarratorId]);

  const handleNarratorSwitch = async (id: string) => {
    setSelectedNarratorId(id);
    const chosen = narrators.find((n) => n.id === id);
    if (chosen) setActiveNarrator(chosen);
    setLoading(true);
    try {
      const evs = await getTimelineByNarrator(id);
      setEvents(evs);

      if (evs.length === 0 && (chosen?.recording_count || 0) > 0) {
        try {
          setExtracting(true);
          await extractMemoriesWithAI(id);
          const fresh = await getTimelineByNarrator(id);
          setEvents(fresh);
        } catch (autoErr) {
          console.warn('Auto memory extraction notice:', autoErr);
        } finally {
          setExtracting(false);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    try {
      await updateLifeEventStatus(eventId, newStatus);
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId ? { ...ev, extraction_status: newStatus as any } : ev
        )
      );
      showToast(
        uiLanguage === 'ta'
          ? `நினைவு நிலை "${newStatus}" என மாற்றப்பட்டது.`
          : `Event marked as ${newStatus}.`
      );
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to remove this memory from timeline?')) return;
    try {
      await deleteLifeEvent(eventId);
      setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      showToast('Memory removed from timeline.');
    } catch (err) {
      alert('Failed to delete event');
    }
  };

  const handleExtractWithAI = async () => {
    if (!selectedNarratorId) return;
    try {
      setExtracting(true);
      await extractMemoriesWithAI(selectedNarratorId);
      const fresh = await getTimelineByNarrator(selectedNarratorId);
      setEvents(fresh);
      showToast(
        uiLanguage === 'ta'
          ? 'AI மூலம் புதிய வாழ்க்கை நினைவுகள் கண்டறியப்பட்டு சேர்க்கப்பட்டன!'
          : 'AI extracted new milestones from transcripts!'
      );
    } catch (err) {
      alert('Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const created = await createLifeEvent(selectedNarratorId, {
        title: newTitle,
        approximate_year: newYear ? parseInt(newYear, 10) : undefined,
        place_name: newPlace,
        description: newDesc,
        extraction_status: 'confirmed',
      });
      setEvents((prev) => [...prev, created].sort((a, b) => (a.approximate_year || 0) - (b.approximate_year || 0)));
      setShowAddModal(false);
      setNewTitle('');
      setNewYear('');
      setNewPlace('');
      setNewDesc('');
      showToast(uiLanguage === 'ta' ? 'புதிய நினைவு காலவரிசையில் சேர்க்கப்பட்டது!' : 'Life event added to timeline!');
    } catch (err) {
      alert('Failed to add event');
    }
  };

  // Semantic deduplication & filtering for timeline events
  const displayedEvents = useMemo(() => {
    const seen = new Set<string>();
    return events.filter((ev) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        (ev.description && ev.description.toLowerCase().includes(q)) ||
        (ev.place_name && ev.place_name.toLowerCase().includes(q)) ||
        (ev.approximate_year && ev.approximate_year.toString().includes(q));
      const matchesStatus =
        statusFilter === 'all' || ev.extraction_status === statusFilter;
      if (!matchesSearch || !matchesStatus) return false;

      // In-memory semantic deduplication safeguard
      const taKey = (ev.title_tamil || '').trim().toLowerCase();
      const srcKey = (ev.source_excerpt || '').trim().slice(0, 80);
      const dedupKey = taKey ? `ta:${taKey}` : (srcKey ? `src:${srcKey}` : `id:${ev.id}`);
      if (seen.has(dedupKey)) return false;
      seen.add(dedupKey);
      return true;
    });
  }, [events, search, statusFilter]);

  return (
    <div className="page-container" style={{ maxWidth: '960px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <span className="badge-pill" style={{ marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'நினைவுகள் அமைப்பு' : 'Memory Organization'}
          </span>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginTop: '4px' }}>
            {uiLanguage === 'ta' ? 'நினைவுகள் & வாழ்க்கைக் காலவரிசை' : 'Memories & Life Timeline'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '6px' }}>
            {uiLanguage === 'ta'
              ? 'நேர்காணல் உரையாடல்களைக் காலவரிசைப்படி ஒழுங்கமைக்கப்பட்ட வாழ்க்கை நிகழ்வுகளாக மாற்றுங்கள்'
              : 'Turn recorded interview transcripts into a chronological, verified life journey'}
          </p>
        </div>

        {userNarrators.length === 0 ? null : isOwner ? (
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <button
              className="btn-pill-accent"
              onClick={handleExtractWithAI}
              disabled={extracting}
            >
              <Sparkles size={16} />
              <span>{extracting ? 'AI Extracting...' : uiLanguage === 'ta' ? 'AI நினைவுகள் பிரித்தெடு' : 'Extract Memories with AI'}</span>
            </button>

            <button
              className="btn-pill-primary"
              onClick={() => setShowAddModal(true)}
            >
              <PlusCircle size={16} />
              <span>{uiLanguage === 'ta' ? 'நினைவைச் சேர்க்க' : 'Add Life Event'}</span>
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
                +
              </span>
            </button>
          </div>
        ) : (
          <div
            className="badge-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              background: 'var(--slate-bg-tint)',
              color: 'var(--slate-taupe-dark)',
            }}
          >
            <Lock size={14} />
            <span>{uiLanguage === 'ta' ? 'பார்வையாளர் முறை (Reader Mode) · சரிபார்க்கப்பட்ட காலவரிசை' : 'Reader Mode · Verified Life Timeline'}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          {uiLanguage === 'ta' ? 'நினைவுகளை ஏற்றுகிறது...' : 'Loading life timeline...'}
        </div>
      ) : userNarrators.length === 0 ? (
        <div
          className="modern-card tinted"
          style={{ textAlign: 'center', padding: '60px 20px', alignItems: 'center', marginTop: '16px' }}
        >
          <div className="card-top-icon tinted" style={{ width: '56px', height: '56px', margin: '0 auto 16px' }}>
            <Clock size={24} />
          </div>
          <h3 style={{ fontSize: '20px', color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'தங்களின் குடும்ப நினைவாளர்கள் இன்னும் சேர்க்கப்படவில்லை' : 'No Family Narrators Found'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            {uiLanguage === 'ta'
              ? 'வாழ்க்கைக் காலவரிசையில் நினைவுகளை ஒழுங்கமைக்க, முதலில் தங்களின் குடும்ப நினைவாளரைச் சேர்த்து நேர்காணல் செய்யுங்கள்.'
              : 'To build a chronological life journey, please add a narrator to your family account and conduct interview sessions.'}
          </p>
          <button
            className="btn-pill-primary"
            onClick={() => {
              setEditingNarrator(null);
              setIsAddNarratorOpen(true);
            }}
          >
            <PlusCircle size={16} />
            <span>{uiLanguage === 'ta' ? 'நினைவாளர் சேர்க்க' : 'Add First Narrator'}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Search and Filters: Separate Independent Elements (as in Screenshot) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '28px',
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
                    ? 'நினைவுகள் அல்லது நிகழ்வுகளைத் தேடுக...'
                    : 'Search memories by title, description or year...'
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
                onChange={(e) => handleNarratorSwitch(e.target.value)}
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

            {/* 3. Right: Status Filter Box */}
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
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
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
                <option value="all">{uiLanguage === 'ta' ? 'அனைத்து நிலைகள்' : 'All Status'}</option>
                <option value="confirmed">{uiLanguage === 'ta' ? 'உறுதி செய்யப்பட்டது' : 'Confirmed'}</option>
                <option value="unreviewed">{uiLanguage === 'ta' ? 'சரிபார்க்கப்படாதது' : 'Unreviewed'}</option>
                <option value="rejected">{uiLanguage === 'ta' ? 'நிராகரிக்கப்பட்டது' : 'Rejected'}</option>
              </select>
            </div>
          </div>

      {/* Chronological Timeline Stream */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Loading life timeline...
        </div>
      ) : events.length === 0 ? (
        <div
          className="modern-card"
          style={{ textAlign: 'center', padding: '56px 24px', background: '#FFFFFF', border: '1px dashed var(--border-subtle)', borderRadius: '32px' }}
        >
          <Clock size={40} color="var(--slate-sand)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'காலவரிசை நிகழ்வுகள் இல்லை' : 'No Timeline Events Yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 24px' }}>
            Click "Extract Memories with AI" to scan recorded transcripts, or add manual life events.
          </p>
          <button className="btn-pill-primary" onClick={handleExtractWithAI}>
            <Sparkles size={16} />
            <span>Extract Memories with AI</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            position: 'relative',
            paddingLeft: '36px',
            borderLeft: '3px solid var(--slate-sand)',
            marginLeft: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '26px',
          }}
        >
          {displayedEvents.map((event) => {
            const isEn = uiLanguage === 'en';
            const parenMatch = event.title?.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
            const eventTitleTamil = event.title_tamil || (parenMatch ? parenMatch[1].trim() : event.title);
            const eventTitleEnglish = event.title_english || (parenMatch ? parenMatch[2].trim() : event.title);

            const displayTitle = isEn
              ? (eventTitleEnglish || event.title)
              : (eventTitleTamil || event.title);

            const secondaryTitle = isEn
              ? (eventTitleTamil && eventTitleTamil !== displayTitle ? eventTitleTamil : null)
              : (eventTitleEnglish && eventTitleEnglish !== displayTitle ? eventTitleEnglish : null);

            const displayDesc = isEn
              ? (event.description_english || event.description)
              : (event.description || event.description_english);

            const secondaryDesc = isEn
              ? (event.description && event.description !== displayDesc ? event.description : null)
              : (event.description_english && event.description_english !== displayDesc ? event.description_english : null);

            return (
            <div key={event.id} style={{ position: 'relative' }}>
              {/* Timeline Pin Node */}
              <div
                style={{
                  position: 'absolute',
                  left: '-47px',
                  top: '24px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background:
                    event.extraction_status === 'confirmed'
                      ? 'var(--accent-green)'
                      : event.extraction_status === 'rejected'
                      ? 'var(--status-red)'
                      : 'var(--slate-sand)',
                  border: '4px solid #FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              />

              {/* Memory Card */}
              <div
                className="modern-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '28px',
                  padding: '26px 30px',
                  boxShadow: '0 10px 30px rgba(94, 86, 83, 0.05)',
                  border: '1px solid var(--border-card)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                    marginBottom: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      {event.approximate_year ? (
                        <>
                          <span
                            style={{
                              fontSize: '20px',
                              fontWeight: 800,
                              color: 'var(--accent-green)',
                              fontFamily: 'monospace',
                            }}
                          >
                            {event.approximate_year}
                          </span>
                          <span style={{ fontSize: '19px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                            — {displayTitle}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: '19px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                          {displayTitle}
                        </span>
                      )}
                    </div>

                    {secondaryTitle && (
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', fontStyle: isEn ? 'normal' : 'italic' }}>
                        {secondaryTitle}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '13px', color: 'var(--slate-gray)' }}>
                      {event.place_name && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={14} /> {event.place_name}
                        </span>
                      )}
                      {event.event_type && (
                        <span className="badge-pill" style={{ fontSize: '10px' }}>
                          {event.event_type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Review Status Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      className="badge-pill"
                      style={{
                        fontSize: '11px',
                        textTransform: 'capitalize',
                        background:
                          event.extraction_status === 'confirmed'
                            ? 'rgba(140, 83, 56, 0.15)'
                            : event.extraction_status === 'rejected'
                            ? 'var(--status-red-bg)'
                            : 'var(--slate-bg-tint)',
                        color:
                          event.extraction_status === 'confirmed'
                            ? 'var(--accent-green)'
                            : event.extraction_status === 'rejected'
                            ? 'var(--status-red)'
                            : 'var(--slate-taupe-dark)',
                      }}
                    >
                      {event.extraction_status}
                    </span>

                    {isOwner && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: '#FAF9F8',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--slate-gray)',
                          display: 'grid',
                          placeItems: 'center',
                          cursor: 'pointer',
                        }}
                        title="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description */}
                {displayDesc && (
                  <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--slate-taupe-dark)', marginBottom: secondaryDesc ? '10px' : '16px' }}>
                    {displayDesc}
                  </p>
                )}

                {/* Secondary translation note if available */}
                {secondaryDesc && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '16px', borderLeft: '2px solid var(--border-subtle)', paddingLeft: '10px', fontStyle: 'italic' }}>
                    {secondaryDesc}
                  </div>
                )}

                {/* Transcript Excerpt if linked */}
                {event.source_excerpt && (
                  <div
                    style={{
                      background: 'var(--bg-app)',
                      padding: '12px 18px',
                      borderRadius: '16px',
                      borderLeft: '4px solid var(--slate-sand)',
                      fontSize: '13px',
                      color: 'var(--slate-taupe-dark)',
                      fontStyle: 'italic',
                      marginBottom: '16px',
                    }}
                  >
                    "{event.source_excerpt}"
                  </div>
                )}

                {/* Audio playback strictly for narrator owner */}
                {isOwner && event.storage_key && (
                  <div style={{ marginBottom: '16px' }}>
                    <AudioPlayer storageKey={event.storage_key} durationSeconds={event.duration_seconds || 150} showDownload={false} />
                  </div>
                )}

                {/* Assistant Review Actions: Confirm, Edit, Reject strictly for narrator owner */}
                {isOwner && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '12px',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '16px',
                    }}
                  >
                    {event.extraction_status !== 'confirmed' && (
                      <button
                        className="btn-pill-primary"
                        style={{ padding: '7px 16px', fontSize: '12px' }}
                        onClick={() => handleStatusChange(event.id, 'confirmed')}
                      >
                        <CheckCircle2 size={14} />
                        <span>{uiLanguage === 'ta' ? 'உறுதி செய்க' : 'Confirm Event'}</span>
                      </button>
                    )}

                    {event.extraction_status !== 'rejected' && (
                      <button
                        className="btn-pill-outline"
                        style={{ color: 'var(--status-red)', borderColor: 'var(--status-red)', padding: '7px 16px', fontSize: '12px' }}
                        onClick={() => handleStatusChange(event.id, 'rejected')}
                      >
                        <XCircle size={14} />
                        <span>{uiLanguage === 'ta' ? 'நிராகரி' : 'Reject'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Navigation Buttons: Appears only when timeline events exist */}
      <PageNavigationFooter
        visible={!loading && events.length > 0}
        prevScreen="recordings"
        prevLabel={{
          en: 'Previous: Transcripts & Recordings',
          ta: 'முந்தைய படி: ஒலிப்பதிவுகள் & உரைவடிவம்',
        }}
        nextScreen="story_builder"
        nextLabel={{
          en: 'Next Step: LifeStory Builder',
          ta: 'அடுத்த படி: வாழ்க்கை வரலாறு',
        }}
      />

      {/* Add New Memory Event Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{
              maxWidth: '600px',
              borderRadius: '32px',
              padding: '36px 40px',
              boxShadow: '0 24px 60px rgba(94, 86, 83, 0.15)',
            }}
          >
            <span className="badge-pill" style={{ marginBottom: '8px' }}>
              TIMELINE ENTRY
            </span>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--slate-taupe-dark)', marginBottom: '18px' }}>
              {uiLanguage === 'ta' ? 'புதிய வாழ்க்கை நிகழ்வைச் சேர்க்க' : 'Add Life Event to Timeline'}
            </h3>

            <form onSubmit={handleCreateEvent}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                    Event Title (நிகழ்வு தலைப்பு) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="எ.கா: 1970 — திருமணம் அல்லது முதல் பணி"
                    style={{
                      width: '100%',
                      padding: '12px 18px',
                      borderRadius: '9999px',
                      border: '1px solid var(--border-subtle)',
                      background: '#FAF9F8',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                      Year (ஆண்டு)
                    </label>
                    <input
                      type="number"
                      value={newYear}
                      onChange={(e) => setNewYear(e.target.value)}
                      placeholder="1965"
                      style={{
                        width: '100%',
                        padding: '12px 18px',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-subtle)',
                        background: '#FAF9F8',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                      Location (இடம் / ஊர்)
                    </label>
                    <input
                      type="text"
                      value={newPlace}
                      onChange={(e) => setNewPlace(e.target.value)}
                      placeholder={uiLanguage === 'ta' ? 'ஊர் / நகரம் (எ.கா: சென்னை)' : 'City / Place'}
                      style={{
                        width: '100%',
                        padding: '12px 18px',
                        borderRadius: '9999px',
                        border: '1px solid var(--border-subtle)',
                        background: '#FAF9F8',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '6px' }}>
                    Description (விளக்கம்)
                  </label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="நிகழ்வின் பின்னணி மற்றும் நினைவுக்குரிய சுருக்கம்..."
                    style={{
                      width: '100%',
                      padding: '14px 18px',
                      borderRadius: '20px',
                      border: '1px solid var(--border-subtle)',
                      background: '#FAF9F8',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
                <button
                  type="button"
                  className="btn-pill-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-pill-primary">
                  Save Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
