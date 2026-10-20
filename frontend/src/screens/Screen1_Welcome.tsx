import React, { useState } from 'react';
import {
  Mic,
  Heart,
  BookOpen,
  ShieldCheck,
  ArrowUpRight,
  ArrowDown,
  Sparkles,
  Phone,
  Users,
  Calendar,
  Languages,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import heroImg from '../assets/hero.png';
import oldageImg from '../assets/oldage.png';
import logoImg from '../assets/logo.png';

export const Screen1_Welcome: React.FC = () => {
  const { setCurrentScreen, uiLanguage, setUiLanguage } = useApp();
  const [impactStat, setImpactStat] = useState<'stories' | 'sessions' | 'elders'>('stories');

  const scrollToFeatures = () => {
    const el = document.getElementById('features-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation Bar (Matching Screenshot 1) */}
      <header
        style={{
          height: '84px',
          padding: '0 clamp(20px, 4vw, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-subtle)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Brand Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <img
            src={logoImg}
            alt="NinaivuKalanjiyam"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              objectFit: 'cover',
              boxShadow: '0 2px 8px rgba(47, 42, 40, 0.1)',
            }}
          />
          <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.5px', color: 'var(--slate-taupe-dark)' }}>
            NINAIVU KALANJIYAM
          </span>
        </div>

        {/* Center Nav Links (Screenshot 1) */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            fontSize: '12.5px',
            fontWeight: 700,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: 'var(--slate-taupe-dark)',
          }}
          className="desktop-only"
        >
          <a href="#about" onClick={(e) => { e.preventDefault(); scrollToFeatures(); }} style={{ textDecoration: 'none', color: 'inherit' }}>
            {uiLanguage === 'ta' ? 'அறிமுகம்' : 'WHO WE ARE'}
          </a>
          <a href="#features-section" onClick={(e) => { e.preventDefault(); scrollToFeatures(); }} style={{ textDecoration: 'none', color: 'inherit' }}>
            {uiLanguage === 'ta' ? 'செயல்பாடுகள்' : 'WHAT WE DO'}
          </a>
          <a href="#impact" onClick={(e) => { e.preventDefault(); document.getElementById('impact-section')?.scrollIntoView({ behavior: 'smooth' }); }} style={{ textDecoration: 'none', color: 'inherit' }}>
            {uiLanguage === 'ta' ? 'தாக்கம்' : 'OUR IMPACT'}
          </a>
          <a href="#consent" onClick={(e) => { e.preventDefault(); setCurrentScreen('signin'); }} style={{ textDecoration: 'none', color: 'inherit' }}>
            {uiLanguage === 'ta' ? 'தனியுரிமை' : 'GET INVOLVED'}
          </a>
        </nav>

        {/* Right Action Buttons (Screenshot 1) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Language Toggle */}
          <div className="lang-switch">
            <button
              className={`lang-btn ${uiLanguage === 'ta' ? 'active' : ''}`}
              onClick={() => setUiLanguage('ta')}
            >
              தமிழ்
            </button>
            <button
              className={`lang-btn ${uiLanguage === 'en' ? 'active' : ''}`}
              onClick={() => setUiLanguage('en')}
            >
              EN
            </button>
          </div>

          <button
            className="circle-action-btn"
            onClick={() => setCurrentScreen('signin')}
            title="Interview Helpline / Contact"
          >
            <Phone size={17} />
          </button>

          <button
            className="btn-pill-outline"
            style={{ padding: '10px 22px', fontSize: '13px' }}
            onClick={() => setCurrentScreen('signin')}
          >
            {uiLanguage === 'ta' ? 'உள்நுழைக' : 'SIGN IN'}
          </button>
        </div>
      </header>

      {/* Hero Section (Matching Screenshot 1) */}
      <section
        style={{
          padding: 'clamp(50px, 8vw, 100px) clamp(20px, 4vw, 56px) 60px',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
          width: '100%',
        }}
      >
        {/* Giant Display Headline with Embedded Horizontal Pill Image (Screenshot 1) */}
        <h1
          style={{
            fontSize: 'clamp(44px, 7.5vw, 92px)',
            fontWeight: 800,
            color: 'var(--slate-taupe-dark)',
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            marginBottom: '24px',
          }}
        >
          Every
          <img
            src={oldageImg}
            alt="Family Generational Memory"
            className="headline-pill-img"
          />
          Story
          <br />
          is Worth Preserving
        </h1>

        {/* Tamil Meaningful Subhead */}
        <p
          style={{
            fontSize: 'clamp(18px, 2.2vw, 24px)',
            fontWeight: 600,
            color: 'var(--slate-taupe)',
            maxWidth: '820px',
            margin: '0 auto 16px',
            lineHeight: 1.45,
          }}
        >
          ஒவ்வொரு மனிதனின் வாழ்விலும் பாதுகாக்கப்பட வேண்டிய ஒரு கதை இருக்கிறது.
        </p>

        <p
          style={{
            fontSize: '16px',
            color: 'var(--text-muted)',
            maxWidth: '680px',
            margin: '0 auto 36px',
            lineHeight: 1.6,
          }}
        >
          Preserve the voices, cherished experiences, and oral traditions of your parents and
          grandparents into an enduring bilingual family archive.
        </p>

        {/* Hero Pill CTA Buttons (Screenshot 1) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className="btn-pill-accent"
            onClick={() => setCurrentScreen('signin')}
          >
            <span>{uiLanguage === 'ta' ? 'தொடங்குக' : 'GET STARTED'}</span>
          </button>

          <button
            className="btn-pill-outline"
            onClick={() => setCurrentScreen('signin')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <span>{uiLanguage === 'ta' ? 'உள்நுழைக' : 'ACCESS ARCHIVE'}</span>
            <div
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: 'var(--bg-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowUpRight size={15} />
            </div>
          </button>
        </div>

        {/* Privacy Note */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '32px',
            fontSize: '12.5px',
            color: 'var(--slate-gray)',
          }}
        >
          <ShieldCheck size={16} color="var(--accent-green)" />
          <span>Private family archive: stories and recordings are protected behind secure authentication.</span>
        </div>
      </section>

      {/* Bottom Sponsor / Dialect Ticker Bar (Screenshot 1) */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '28px clamp(20px, 4vw, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--slate-bg-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--slate-taupe-dark)',
            }}
          >
            <Languages size={17} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--slate-taupe-dark)' }}>
            TAMIL ORAL ARCHIVE
          </span>
        </div>

        {/* Dialect Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(16px, 3vw, 40px)',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--slate-taupe)',
            letterSpacing: '0.5px',
            flexWrap: 'wrap',
          }}
        >
          <span>Kongu Tamil (கொங்கு)</span>
          <span>•</span>
          <span>Madurai (மதுரை)</span>
          <span>•</span>
          <span>Tirunelveli (நெல்லை)</span>
          <span>•</span>
          <span>Central (தஞ்சாவூர்)</span>
        </div>

        {/* Scroll Down Action (Screenshot 1) */}
        <div
          onClick={scrollToFeatures}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: 'var(--slate-taupe-dark)',
          }}
        >
          <span>SCROLL DOWN</span>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1.5px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFFFFF',
            }}
          >
            <ArrowDown size={15} />
          </div>
        </div>
      </div>

      {/* ========================================================
          SECTION 2: "WHAT WE DO" (MATCHING SCREENSHOT 2)
          ======================================================== */}
      <section
        id="features-section"
        style={{
          padding: '90px clamp(20px, 4vw, 56px) 80px',
          maxWidth: '1240px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Section Header with Pill Tag (Screenshot 2) */}
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div className="section-pill-tag">
            {uiLanguage === 'ta' ? 'செயல்பாடுகள்' : 'What We Do'}
          </div>

          <h2
            style={{
              fontSize: 'clamp(32px, 4.5vw, 52px)',
              fontWeight: 800,
              color: 'var(--slate-taupe-dark)',
              maxWidth: '820px',
              margin: '0 auto 16px',
              letterSpacing: '-0.03em',
            }}
          >
            {uiLanguage === 'ta'
              ? 'முன்னோர்களின் குரல் மற்றும் நினைவுகளைப் பாதுகாத்தல்'
              : 'Preserving Precious Voices And Memories Across Generations'}
          </h2>

          <div
            onClick={() => setCurrentScreen('signin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: 'var(--slate-taupe-dark)',
            }}
          >
            <span>LEARN MORE</span>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1.5px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#FFFFFF',
              }}
            >
              <ArrowUpRight size={14} />
            </div>
          </div>
        </div>

        {/* 3 Super-Rounded Modern Cards (Matching Screenshot 2) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '28px',
          }}
        >
          {/* Card 1: Tinted Card with Green Button */}
          <div className="modern-card tinted">
            <div>
              <div className="card-top-icon tinted">
                <Mic size={18} />
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '14px', color: 'var(--slate-taupe-dark)' }}>
                {uiLanguage === 'ta' ? '1. வாழ்வின் கதைகளைப் பதிவு செய்' : '1. Record Life Stories'}
              </h3>

              <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '32px' }}>
                Capture high-fidelity voice answers through guided interview questions tailored for iPad
                Safari and desktop microphones.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="card-hashtags">
                <span>#OralHistory</span>
                <span>#VoiceStudio</span>
              </div>

              <button
                className="circle-action-btn accent"
                onClick={() => setCurrentScreen('signin')}
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          {/* Card 2: White Card with Tags */}
          <div className="modern-card">
            <div>
              <div className="card-top-icon">
                <Heart size={18} color="var(--slate-sand)" />
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '14px', color: 'var(--slate-taupe-dark)' }}>
                {uiLanguage === 'ta' ? '2. நினைவுகளைத் தமிழில் காத்திடு' : '2. Preserve in Tamil'}
              </h3>

              <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '32px' }}>
                Honor regional Tamil dialects (Kongu, Madurai, Nellai, Central) with native transcript
                review and dual Tamil/English presentation.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="card-hashtags">
                <span>#Kongu</span>
                <span>#Madurai</span>
                <span>#Dialects</span>
              </div>

              <button
                className="circle-action-btn"
                onClick={() => setCurrentScreen('signin')}
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>

          {/* Card 3: White Card with Avatar Stack (Screenshot 2) */}
          <div className="modern-card">
            <div>
              <div className="card-top-icon">
                <BookOpen size={18} color="var(--slate-steel-blue)" />
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '14px', color: 'var(--slate-taupe-dark)' }}>
                {uiLanguage === 'ta' ? '3. குடும்ப வரலாறு பெட்டகம்' : '3. Build Family Legacy'}
              </h3>

              <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '32px' }}>
                Synthesize reviewed transcripts into chronological timelines, biography book chapters, and
                exportable ZIP/PDF archives.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="avatar-stack">
                  <div className="avatar-stack-item">ச</div>
                  <div className="avatar-stack-item" style={{ background: 'var(--slate-sand)' }}>ல</div>
                  <div className="avatar-stack-item" style={{ background: 'var(--slate-taupe)' }}>சு</div>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)' }}>
                  Family Archive
                </span>
              </div>

              <button
                className="circle-action-btn"
                onClick={() => setCurrentScreen('signin')}
              >
                <ArrowUpRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 3: "OUR IMPACT" (MATCHING SCREENSHOT 3 & 4)
          ======================================================== */}
      <section
        id="impact-section"
        style={{
          background: '#FFFFFF',
          padding: '110px clamp(20px, 4vw, 56px) 100px',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="section-pill-tag">
            {uiLanguage === 'ta' ? 'எங்கள் நோக்கம்' : 'Our Impact'}
          </div>

          <h2
            style={{
              fontSize: 'clamp(34px, 5vw, 62px)',
              fontWeight: 800,
              color: 'var(--slate-taupe-dark)',
              letterSpacing: '-0.03em',
              marginBottom: '32px',
            }}
          >
            Together, We're Making
            <br />A Difference
          </h2>

          {/* Interactive Metric Switcher (Screenshot 3 & 4) */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '36px' }}>
            <button
              className={`lang-btn ${impactStat === 'stories' ? 'active' : ''}`}
              style={{ padding: '8px 18px', fontSize: '13px' }}
              onClick={() => setImpactStat('stories')}
            >
              Memories Preserved
            </button>
            <button
              className={`lang-btn ${impactStat === 'sessions' ? 'active' : ''}`}
              style={{ padding: '8px 18px', fontSize: '13px' }}
              onClick={() => setImpactStat('sessions')}
            >
              Interviews Recorded
            </button>
            <button
              className={`lang-btn ${impactStat === 'elders' ? 'active' : ''}`}
              style={{ padding: '8px 18px', fontSize: '13px' }}
              onClick={() => setImpactStat('elders')}
            >
              Beloved Narrators
            </button>
          </div>

          {/* Giant Display Stat Number (Matching Screenshot 3 & 4) */}
          <div
            style={{
              fontSize: 'clamp(72px, 13vw, 150px)',
              fontWeight: 800,
              color: 'var(--accent-green)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              marginBottom: '16px',
            }}
          >
            {impactStat === 'stories' && '31,546'}
            {impactStat === 'sessions' && '1,420'}
            {impactStat === 'elders' && '216'}
          </div>

          <div
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--slate-taupe-dark)',
              textTransform: 'capitalize',
            }}
          >
            {impactStat === 'stories' && 'Family Memories & Audio Stories Preserved'}
            {impactStat === 'sessions' && 'Generational Interview Sessions Conducted'}
            {impactStat === 'elders' && 'Grandparents & Elders In Archive'}
          </div>
        </div>
      </section>

      {/* Curved Arch Divider (Screenshot 3 & 4) */}
      <div className="curved-arch-top" />

      {/* Footer */}
      <footer
        style={{
          background: 'var(--bg-app)',
          padding: '40px clamp(20px, 4vw, 56px) 50px',
          textAlign: 'center',
          color: 'var(--slate-gray)',
          fontSize: '13px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <p style={{ fontWeight: 600, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
          NinaivuKalanjiyam (நினைவுக் களஞ்சியம்) — Preserving family memories, wisdom, and voices across generations.
        </p>
        <p style={{ fontSize: '12px' }}>
          Urban Slate Edition · Private & Protected Generational Family Oral History Archive
        </p>
      </footer>
    </div>
  );
};
