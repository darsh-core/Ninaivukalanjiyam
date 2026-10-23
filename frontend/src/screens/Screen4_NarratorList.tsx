import React, { useEffect, useState } from 'react';
import {
  Search,
  PlusCircle,
  User,
  Mic,
  BookOpen,
  Edit3,
  ArrowUpRight,
  MapPin,
  Calendar,
  Languages,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getNarrators } from '../services/api';
import { PageNavigationFooter } from '../components/PageNavigationFooter';
import type { Narrator } from '../types';

export const Screen4_NarratorList: React.FC = () => {
  const { user } = useAuth();
  const {
    currentScreen,
    setCurrentScreen,
    activeNarrator,
    setActiveNarrator,
    setIsAddNarratorOpen,
    setEditingNarrator,
    goToNewInterview,
    uiLanguage,
  } = useApp();

  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'my'>('all');

  const loadNarrators = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await getNarrators();
      setNarrators(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load narrators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNarrators();
    const handleUpdate = () => void loadNarrators();
    window.addEventListener('narrator_list_updated', handleUpdate);
    return () => window.removeEventListener('narrator_list_updated', handleUpdate);
  }, []);

  const isNarratorOwner = (n: Narrator) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Boolean(
      (n.created_by && n.created_by === user.id) ||
      (n.creator_email && user.email && n.creator_email.toLowerCase() === user.email.toLowerCase())
    );
  };

  const myNarratorsCount = narrators.filter(isNarratorOwner).length;

  const filteredNarrators = narrators
    .filter((n) => {
      if (user?.role === 'admin') {
        if (filterTab === 'my') return isNarratorOwner(n);
        return true;
      }
      return isNarratorOwner(n);
    })
    .filter((n) => {
      const q = search.toLowerCase();
      return (
        (n.full_name_tamil && n.full_name_tamil.toLowerCase().includes(q)) ||
        (n.full_name_english && n.full_name_english.toLowerCase().includes(q)) ||
        (n.preferred_name && n.preferred_name.toLowerCase().includes(q)) ||
        (n.place_of_birth && n.place_of_birth.toLowerCase().includes(q))
      );
    });

  return (
    <div className="page-container">
      {/* Heading & Top Bar */}
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
          <div className="section-pill-tag" style={{ marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'குடும்ப மரபு' : 'Family Heritage'}
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 3.2vw, 42px)', color: 'var(--slate-taupe-dark)' }}>
            {uiLanguage === 'ta' ? 'நினைவாளர்கள் பட்டியல்' : 'Narrators Directory'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginTop: '4px' }}>
            {uiLanguage === 'ta'
              ? 'வாழ்க்கைக் கதைகள் ஆவணப்படுத்தப்பட்டு வரும் குடும்ப முன்னோர்கள்'
              : 'Everyone whose life stories and memories are being preserved in this archive'}
          </p>
        </div>

        <button
          className="btn-pill-accent"
          onClick={() => {
            setEditingNarrator(null);
            setIsAddNarratorOpen(true);
          }}
        >
          <PlusCircle size={16} />
          <span>{uiLanguage === 'ta' ? 'நினைவாளர் சேர்க்க' : 'Add New Narrator'}</span>
        </button>
      </div>

      {/* Modern Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: '#FFFFFF',
          padding: '16px 24px',
          borderRadius: 'var(--radius-pill)',
          border: '1.5px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: '36px',
        }}
      >
        <Search size={19} color="var(--slate-gray)" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            uiLanguage === 'ta'
              ? 'பெயர், ஊர், அல்லது பட்டப் பெயரால் தேடுக (சண்முகம், Bhavani, Erode...)'
              : 'Search by name, birthplace, or preferred title (Shanmugam, Bhavani, Erode...)'
          }
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '15px',
            background: 'transparent',
            fontWeight: 500,
          }}
        />
        <span className="section-pill-tag" style={{ margin: 0, fontSize: '12px' }}>
          {filteredNarrators.length} {uiLanguage === 'ta' ? 'நபர்கள்' : 'narrators'}
        </span>
      </div>

      {/* Filter Tabs - Only shown for admin */}
      {user?.role === 'admin' && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={filterTab === 'all' ? 'btn-pill-primary' : 'btn-pill-outline'}
            style={{ padding: '8px 20px', fontSize: '13px' }}
            onClick={() => setFilterTab('all')}
          >
            {uiLanguage === 'ta' ? 'அனைத்து நினைவாளர்கள்' : 'All Narrators'} ({narrators.length})
          </button>
          <button
            type="button"
            className={filterTab === 'my' ? 'btn-pill-primary' : 'btn-pill-outline'}
            style={{ padding: '8px 20px', fontSize: '13px' }}
            onClick={() => setFilterTab('my')}
          >
            {uiLanguage === 'ta' ? 'எனது நினைவாளர்கள்' : 'My Narrators'} ({myNarratorsCount})
          </button>
        </div>
      )}

      {error && (
        <div style={{ padding: '14px', background: '#FDF0F0', color: '#D24B4B', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          {uiLanguage === 'ta' ? 'நினைவாளர்களை ஏற்றுகிறது...' : 'Loading narrators...'}
        </div>
      ) : filteredNarrators.length === 0 ? (
        <div
          className="modern-card tinted"
          style={{ textAlign: 'center', padding: '60px 20px', alignItems: 'center' }}
        >
          <div className="card-top-icon tinted" style={{ width: '56px', height: '56px', margin: '0 auto 16px' }}>
            <User size={24} />
          </div>
          <h3 style={{ fontSize: '20px', color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
            {uiLanguage === 'ta' ? 'தங்களின் குடும்ப நினைவாளர்கள் இன்னும் சேர்க்கப்படவில்லை' : 'No Family Narrators Added Yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            {uiLanguage === 'ta'
              ? 'உங்கள் குடும்ப முன்னோர்களின் அரிய வாழ்க்கை நினைவுகளையும் கதைகளையும் பாதுகாத்து வைக்க, தங்களின் முதல் நினைவாளரைச் சேர்க்கவும்.'
              : 'Add your first family elder to begin recording interviews and building their verified life story archive.'}
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
        /* Super-rounded Narrator Cards (Screenshot 2 style) */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '28px',
          }}
        >
          {filteredNarrators.map((narrator) => {
            const sessionCount = narrator.session_count || 1;
            const progressPercent = Math.min(100, Math.round(sessionCount * 33));

            return (
              <div
                key={narrator.id}
                className="modern-card"
                style={{
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  {/* Top Avatar & Identity Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {narrator.profile_photo_url ? (
                        <img
                          src={narrator.profile_photo_url}
                          alt={narrator.full_name_tamil || narrator.full_name_english || 'Narrator'}
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(47, 42, 40, 0.15)',
                            border: '2px solid #FFFFFF',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'var(--slate-taupe-dark)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: 800,
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(47, 42, 40, 0.15)',
                          }}
                        >
                          {(narrator.full_name_tamil || narrator.full_name_english || '?').charAt(0)}
                        </div>
                      )}

                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                          {narrator.full_name_tamil || narrator.full_name_english}
                        </h3>
                        {narrator.full_name_english && narrator.full_name_tamil && (
                          <p style={{ fontSize: '13px', color: 'var(--slate-gray)', marginTop: '2px' }}>
                            {narrator.full_name_english}
                          </p>
                        )}
                      </div>
                    </div>

                    {narrator.preferred_name && (
                      <span className="section-pill-tag" style={{ margin: 0, padding: '4px 12px', fontSize: '11px', background: 'var(--slate-bg-tint)' }}>
                        {narrator.preferred_name}
                      </span>
                    )}
                  </div>

                  {/* Badges / Chips */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '20px',
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {narrator.birth_year && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> Born {narrator.birth_year}
                      </span>
                    )}
                    {narrator.place_of_birth && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} /> {narrator.place_of_birth}
                      </span>
                    )}
                    {narrator.tamil_dialect && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Languages size={14} /> {narrator.tamil_dialect}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar inside tinted capsule */}
                  <div
                    style={{
                      background: 'var(--bg-subtle)',
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-lg)',
                      marginBottom: '24px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                      <span style={{ color: 'var(--slate-taupe-dark)' }}>Interview Progress</span>
                      <span style={{ color: 'var(--slate-steel-blue)' }}>{sessionCount} sessions</span>
                    </div>
                    <div style={{ height: '7px', background: '#FFFFFF', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPercent}%`,
                          background: 'var(--slate-taupe-dark)',
                          borderRadius: 'var(--radius-pill)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                {(() => {
                  const isOwner = Boolean(
                    user &&
                    (
                      (narrator.created_by && user.id === narrator.created_by) ||
                      (narrator.creator_email && user.email?.toLowerCase() === narrator.creator_email.toLowerCase()) ||
                      user.role === 'admin'
                    )
                  );

                  return (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '18px',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          className="btn-pill-primary"
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            background: isOwner ? 'var(--slate-taupe-dark)' : 'var(--accent-green)',
                          }}
                          onClick={() => {
                            setActiveNarrator(narrator);
                            setCurrentScreen('narrator_profile');
                          }}
                        >
                          <User size={13} />
                          <span>{isOwner ? 'View Profile' : 'Explore Archive'}</span>
                        </button>

                        {isOwner ? (
                          <button
                            className="btn-pill-outline"
                            style={{ padding: '8px 16px', fontSize: '12px' }}
                            onClick={() => {
                              setEditingNarrator(narrator);
                              setIsAddNarratorOpen(true);
                            }}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                        ) : (
                          <button
                            className="btn-pill-outline"
                            style={{ padding: '8px 16px', fontSize: '12px' }}
                            onClick={() => {
                              setActiveNarrator(narrator);
                              setCurrentScreen('story_builder');
                            }}
                          >
                            <BookOpen size={13} />
                            <span>Read Story</span>
                          </button>
                        )}
                      </div>

                      {isOwner ? (
                        <button
                          className="circle-action-btn accent"
                          onClick={() => goToNewInterview(narrator)}
                          title="Start Interview with this narrator"
                        >
                          <Mic size={17} />
                        </button>
                      ) : (
                        <span
                          className="badge-pill"
                          style={{
                            fontSize: '11px',
                            background: 'var(--slate-bg-tint)',
                            color: 'var(--slate-taupe-dark)',
                          }}
                          title={`Archive curated by ${narrator.creator_name || narrator.creator_email || 'Archivist'}`}
                        >
                          📖 Reader Mode
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Next Step Button (Appears only when narrators exist) */}
      <PageNavigationFooter
        visible={!loading && narrators.length > 0}
        nextScreen="session_setup"
        nextLabel={{
          en: activeNarrator
            ? `Next Step: Start Interview with ${activeNarrator.full_name_english}`
            : 'Next Step: Start Interview',
          ta: activeNarrator
            ? `அடுத்த படி: ${activeNarrator.full_name_tamil || activeNarrator.full_name_english} உடன் நேர்காணல்`
            : 'அடுத்த படி: நேர்காணலைத் தொடங்கு',
        }}
        onNext={() => {
          if (activeNarrator) {
            goToNewInterview(activeNarrator);
          } else if (narrators.length > 0) {
            goToNewInterview(narrators[0]);
          } else {
            setIsAddNarratorOpen(true);
          }
        }}
      />
    </div>
  );
};
