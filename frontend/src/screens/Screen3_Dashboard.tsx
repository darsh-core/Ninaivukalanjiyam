import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Mic,
  Heart,
  BookOpen,
  Users,
  Radio,
  ArrowDown,
  LayoutGrid,
  X,
  Play,
  ArrowRight,
  ArrowLeft,
  Star,
  Clock,
  Sparkles,
  MousePointerClick,
  FileText,
  Headphones,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Archive,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getDashboardOverview, getNarrators } from '../services/api';
import type { DashboardOverview, ActiveScreen, Narrator } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import oldageImg from '../assets/oldage.png';

// Standalone smooth animated number that appears from 1 to target when scrolled into view
const ImpactNumberCounter: React.FC<{
  target: number;
  suffix?: string;
  color: string;
}> = ({ target, suffix = '', color }) => {
  const [val, setVal] = useState(1);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const startCounting = () => {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;

      if (target <= 1) {
        setVal(target);
        return;
      }

      // If target is a small number (e.g. 2, 5), step visibly through every integer from 1 to target
      if (target <= 10) {
        let current = 1;
        setVal(1);
        const stepDelay = Math.max(180, Math.floor(1000 / (target - 1))); // 500ms for 2, 250ms for 5
        const timer = setInterval(() => {
          current += 1;
          setVal(current);
          if (current >= target) {
            clearInterval(timer);
          }
        }, stepDelay);
        return;
      }

      // For larger numbers (e.g. 100%), animate smoothly from 1 to target
      const duration = 1200; // ms
      const startTime = performance.now();
      let animId: number;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(1 + (target - 1) * ease);
        setVal(current);

        if (progress < 1) {
          animId = requestAnimationFrame(tick);
        }
      };

      animId = requestAnimationFrame(tick);
    };

    // Use IntersectionObserver to start counting as soon as the user scrolls to this section
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startCounting();
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);

    // Fallback: in case intersection observer doesn't fire within 800ms
    const fallbackTimer = setTimeout(() => {
      if (!hasAnimatedRef.current) {
        startCounting();
      }
    }, 800);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [target]);

  return (
    <span ref={elementRef} style={{ color, fontVariantNumeric: 'tabular-nums' }}>
      {val}{suffix}
    </span>
  );
};

export const Screen3_Dashboard: React.FC = () => {
  const {
    setCurrentScreen,
    goToNewInterview,
    goToInterview,
    goToNarratorProfile,
    setActiveNarrator,
    uiLanguage,
  } = useApp();

  const [data, setData] = useState<DashboardOverview | null>(null);
  const [narrators, setNarrators] = useState<Narrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickDrawerOpen, setIsQuickDrawerOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overview, nList] = await Promise.all([
        getDashboardOverview(),
        getNarrators(),
      ]);
      setData(overview);
      setNarrators(nList);
    } catch (err) {
      console.error('Failed to load dashboard overview', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const handleUpdate = () => void loadData();
    window.addEventListener('narrator_list_updated', handleUpdate);
    return () => window.removeEventListener('narrator_list_updated', handleUpdate);
  }, []);

  const scrollToWhatWeDo = () => {
    const el = document.getElementById('what-we-do-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const metrics = data?.metrics || {
    totalNarrators: 5,
    interviewSessions: 3,
    storiesRecorded: 2,
    pendingTranscripts: 4,
    memoriesCollected: 5,
  };

  interface HeroPhrase {
    line1Left: string;
    line1Right: string;
    line2: string;
    subtitle: string;
  }

  const heroPhrasesEn: HeroPhrase[] = [
    {
      line1Left: 'Every',
      line1Right: 'Life',
      line2: 'has a Story',
      subtitle: 'Every life has a story worth preserving · Tamil oral history archive',
    },
    {
      line1Left: 'Archive',
      line1Right: 'Voices',
      line2: 'that never fades',
      subtitle: 'Preserving genuine emotions, laughter, and authentic voices for generations',
    },
    {
      line1Left: 'Bring',
      line1Right: 'back Childhood',
      line2: 'memories & roots',
      subtitle: 'Connecting grandparents and grandchildren through shared family roots',
    },
  ];

  const heroPhrasesTa: HeroPhrase[] = [
    {
      line1Left: 'ஒவ்வொரு',
      line1Right: 'வாழ்வும்',
      line2: 'ஒரு அரிய வரலாறு',
      subtitle: 'ஒவ்வொரு மனிதனின் வாழ்விலும் பாதுகாக்கப்பட வேண்டிய ஒரு அரிய கதை உண்டு.',
    },
    {
      line1Left: 'அழியாத',
      line1Right: 'குரல்கள்',
      line2: 'காலம் கடந்த பொக்கிஷம்',
      subtitle: 'காலம் கடந்தாலும் அழியாத சொந்தக் குரலை அடுத்த தலைமுறைக்குக் கடத்துங்கள்.',
    },
    {
      line1Left: 'பால்ய',
      line1Right: 'நினைவுகள்',
      line2: 'குடும்பத்தின் அழியாத வேர்கள்',
      subtitle: 'முன்னோர்களின் குழந்தைப் பருவ நினைவுகளையும் குடும்ப வேர்களையும் பாதுகாப்போம்.',
    },
  ];

  const heroPhrases = uiLanguage === 'ta' ? heroPhrasesTa : heroPhrasesEn;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const activePhrase = heroPhrases[phraseIndex % heroPhrases.length];
  const len1 = activePhrase.line1Left.length;
  const len2 = activePhrase.line1Right.length;
  const len3 = activePhrase.line2.length;
  const totalLen = len1 + len2 + len3;

  useEffect(() => {
    setCharCount(0);
    setIsDeleting(false);
  }, [uiLanguage]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting && charCount >= totalLen) {
      // Pause when entire sentence is fully typed out
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2500);
    } else if (isDeleting && charCount <= 0) {
      // Pause briefly before typing next sentence
      timer = setTimeout(() => {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % heroPhrases.length);
      }, 350);
    } else {
      const speed = isDeleting ? 25 : 65;
      timer = setTimeout(() => {
        setCharCount((prev) => {
          if (isDeleting) {
            return Math.max(0, prev - 1);
          } else {
            return Math.min(totalLen, prev + 1);
          }
        });
      }, speed);
    }

    return () => clearTimeout(timer);
  }, [charCount, isDeleting, totalLen, heroPhrases.length]);

  const count1 = Math.min(charCount, len1);
  const text1 = activePhrase.line1Left.substring(0, count1);

  const count2 = Math.max(0, Math.min(charCount - len1, len2));
  const text2 = activePhrase.line1Right.substring(0, count2);

  const count3 = Math.max(0, Math.min(charCount - len1 - len2, len3));
  const text3 = activePhrase.line2.substring(0, count3);

  // Determine cursor position across the sentence components
  const showCursorInPart1 = charCount <= len1;
  const showCursorInPart2 = charCount > len1 && charCount <= len1 + len2;
  const showCursorInPart3 = charCount > len1 + len2;

  // ========================================================
  // OUR IMPACT SECTION DATA & ANIMATED COUNTER (SCREENSHOT 3)
  // ========================================================
  interface ImpactMetric {
    id: string;
    count: number;
    suffix?: string;
    labelEn: string;
    labelTa: string;
    pillEn: string;
    pillTa: string;
    descEn: string;
    descTa: string;
    color: string;
    screen: ActiveScreen;
  }

  const impactMetrics: ImpactMetric[] = useMemo(
    () => [
      {
        id: 'stories',
        count: metrics.storiesRecorded || 2,
        labelEn: 'Stories Archived',
        labelTa: 'பதிவு செய்யப்பட்ட கதைகள்',
        pillEn: 'Stories',
        pillTa: 'கதைகள்',
        descEn: 'Authentic spoken oral memories of childhood, village roots & life journeys.',
        descTa: 'முன்னோர்களின் சொந்தக் குரலில் பதிவு செய்யப்பட்ட வாழ்வனுபவக் கதைகள்.',
        color: '#8C5338', // Warm rich brown
        screen: 'recordings',
      },
      {
        id: 'narrators',
        count: metrics.totalNarrators || 5,
        labelEn: 'Beloved Narrators',
        labelTa: 'குடும்ப முன்னோர்கள்',
        pillEn: 'Narrators',
        pillTa: 'முன்னோர்கள்',
        descEn: 'Grandparents and family elders whose wisdom is immortalized for generations.',
        descTa: 'வாழ்வின் அரிய அனுபவங்களையும் குடும்ப மரபுகளையும் பகிர்ந்த முன்னோர்கள்.',
        color: '#F59E0B', // Warm Amber Gold
        screen: 'narrators',
      },
      {
        id: 'memories',
        count: metrics.memoriesCollected || 5,
        labelEn: 'Memories & Traditions',
        labelTa: 'சேகரிக்கப்பட்ட நினைவுகள்',
        pillEn: 'Memories',
        pillTa: 'நினைவுகள்',
        descEn: 'Cherished childhood moments, family customs, festive traditions, and ancestral roots.',
        descTa: 'பால்ய நினைவுகள், குடும்பச் சடங்குகள், திருவிழாக் கொண்டாட்டங்கள் மற்றும் முன்னோர்களின் மரபு வேர்கள்.',
        color: '#E11D48', // Crimson Rose
        screen: 'timeline',
      },
      {
        id: 'heritage',
        count: 100,
        suffix: '%',
        labelEn: 'Voice & Dialect Accuracy',
        labelTa: 'தூய தமிழ் ஒலி ஆவணம்',
        pillEn: 'Accuracy',
        pillTa: 'துல்லியம்',
        descEn: 'Preserving native dialects (Kongu, Madurai, Thanjavur) with zero distortion.',
        descTa: 'கொங்கு, மதுரை, தஞ்சை வட்டார வழக்குகளின் தூய ஆவணப் பாதுகாப்பு.',
        color: '#0D9488', // Deep Teal
        screen: 'story_builder',
      },
    ],
    [metrics.storiesRecorded, metrics.totalNarrators, metrics.memoriesCollected]
  );

  // =========================================================================
  // INSPIRING JOURNEYS SHOWCASE DATA (EXACTLY MATCHING SCREENSHOT)
  // Grandparents photos, names, and details can be replaced directly here
  // =========================================================================
  interface InspiringGrandparent {
    id: string;
    nameEn: string;
    nameTa: string;
    age: number;
    relationEn: string;
    relationTa: string;
    subtitleEn: string;
    subtitleTa: string;
    photoUrl: string; // <-- Replace with your grandparent photo URL or local import
    statLeftEn: string;
    statLeftTa: string;
    statRight: string;
    progressPercent: number;
    narratorId?: string;
  }

  const inspiringGrandparents: InspiringGrandparent[] = useMemo(() => {
    if (!narrators || narrators.length === 0) {
      return [
        {
          id: 'rajeshwari',
          nameEn: 'Rajeshwari',
          nameTa: 'ராஜேஸ்வரி',
          age: 78,
          relationEn: 'Grandmother',
          relationTa: 'பாட்டி',
          subtitleEn: 'Erode · Kongu Dialect, Farming & Traditional Lullabies',
          subtitleTa: 'ஈரோடு · கொங்குத் தமிழ், உழவு மரபுகள் & நாட்டுப்புறத் தாலாட்டு',
          photoUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
          statLeftEn: '10 Stories Archived',
          statLeftTa: '10 கதைகள் ஆவணம்',
          statRight: '100%',
          progressPercent: 100,
          narratorId: '11111111-1111-4111-a111-111111111111',
        },
        {
          id: 'shanmugam',
          nameEn: 'Shanmugam',
          nameTa: 'சண்முகம்',
          age: 83,
          relationEn: 'Grandfather',
          relationTa: 'தாத்தா',
          subtitleEn: 'Bhavani · Weaver Heritage & 1950s Village Schooling',
          subtitleTa: 'பவானி · நெசவாளர் மரபும் 1950-களின் கிராமப் பள்ளி நினைவுகளும்',
          photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
          statLeftEn: '16 Stories Archived',
          statLeftTa: '16 கதைகள் ஆவணம்',
          statRight: '85%',
          progressPercent: 85,
          narratorId: '9a064be3-6c1b-4383-a5a9-ec80d5dd5684',
        },
      ];
    }

    return narrators.map((n) => {
      const recCount = parseInt(String(n.recording_count || 0), 10) || (n.session_count ? parseInt(String(n.session_count), 10) * 2 : 0);
      const sessionCount = parseInt(String(n.session_count || 0), 10);
      const progress = Math.min(100, Math.max(20, Math.round((sessionCount || 1) * 33)));
      const age = n.birth_year ? new Date().getFullYear() - n.birth_year : 75;

      return {
        id: n.id,
        nameEn: n.full_name_english || n.preferred_name || n.full_name_tamil || 'Narrator',
        nameTa: n.full_name_tamil || n.preferred_name || n.full_name_english || 'நினைவாளர்',
        age,
        relationEn: n.preferred_name || 'Family Elder',
        relationTa: n.preferred_name || 'குடும்ப முன்னோடி',
        subtitleEn: `${n.place_of_birth || 'Tamil Nadu'} · ${n.tamil_dialect || 'Tamil Oral Heritage'}`,
        subtitleTa: `${n.place_of_birth || 'தமிழ்நாடு'} · ${n.tamil_dialect || 'தமிழ் வாய்மொழி மரபு'}`,
        photoUrl:
          n.profile_photo_url ||
          (n.full_name_english?.toLowerCase().includes('shanmugam')
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80'),
        statLeftEn: `${recCount} Stories Archived`,
        statLeftTa: `${recCount} கதைகள் ஆவணம்`,
        statRight: `${progress}%`,
        progressPercent: progress,
        narratorId: n.id,
      };
    });
  }, [narrators]);

  // =========================================================================
  // CAROUSEL AUTO-SLIDE & INFINITE LOOP CONFIGURATION
  // Automatically slides one by one, keeping the active card centered
  // =========================================================================
  const BASE_COUNT = Math.max(1, inspiringGrandparents.length);
  const REPEAT_COUNT = Math.max(3, Math.ceil(9 / BASE_COUNT));
  const INITIAL_INDEX = Math.floor(REPEAT_COUNT / 2) * BASE_COUNT; // Centered initial card

  const repeatedGrandparents = useMemo(() => {
    const list: (InspiringGrandparent & { uniqueKey: string; originalIndex: number })[] = [];
    for (let r = 0; r < REPEAT_COUNT; r++) {
      for (let i = 0; i < BASE_COUNT; i++) {
        const item = inspiringGrandparents[i % inspiringGrandparents.length];
        list.push({
          ...item,
          uniqueKey: `repeat-${r}-item-${i}-${item.id}`,
          originalIndex: i,
        });
      }
    }
    return list;
  }, [inspiringGrandparents, BASE_COUNT, REPEAT_COUNT]);

  const [currentIndex, setCurrentIndex] = useState(INITIAL_INDEX);
  const [isPaused, setIsPaused] = useState(false);
  const [enableTransition, setEnableTransition] = useState(true);

  useEffect(() => {
    setCurrentIndex(Math.floor(REPEAT_COUNT / 2) * BASE_COUNT);
  }, [BASE_COUNT, REPEAT_COUNT]);

  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const cardSampleRef = useRef<HTMLDivElement>(null);
  const [trackOffset, setTrackOffset] = useState(0);

  // Calculate exact pixel offset to keep currentIndex dead center in the container
  const calculateOffset = (targetIdx: number) => {
    if (!carouselContainerRef.current) return 0;
    const containerW = carouselContainerRef.current.offsetWidth;
    const cardW = cardSampleRef.current ? cardSampleRef.current.offsetWidth : 300;
    const gap = 24;
    const slotW = cardW + gap;
    return containerW / 2 - (targetIdx * slotW + cardW / 2);
  };

  const handleNext = () => {
    setEnableTransition(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    setEnableTransition(true);
    setCurrentIndex((prev) => prev - 1);
  };

  // Recalculate track offset on index or window resize
  useEffect(() => {
    const update = () => {
      setTrackOffset(calculateOffset(currentIndex));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [currentIndex]);

  // Auto-slide effect: slide automatically one by one every 3.8s
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      handleNext();
    }, 3800);

    return () => clearInterval(interval);
  }, [isPaused, currentIndex]);

  // Infinite wrap normalization: silently reset near boundaries without visual jump
  useEffect(() => {
    const minBound = BASE_COUNT;
    const maxBound = BASE_COUNT * (REPEAT_COUNT - 1);

    if (currentIndex >= maxBound || currentIndex < minBound) {
      const timer = setTimeout(() => {
        setEnableTransition(false);
        const normalized = (currentIndex % BASE_COUNT) + BASE_COUNT * Math.floor(REPEAT_COUNT / 2);
        setCurrentIndex(normalized);
      }, 650);

      return () => clearTimeout(timer);
    }
  }, [currentIndex, BASE_COUNT, REPEAT_COUNT]);

  const handleListenStory = (elder: InspiringGrandparent) => {
    if (elder.narratorId) {
      const matched = narrators.find((n) => n.id === elder.narratorId);
      if (matched) {
        setActiveNarrator(matched);
        goToNarratorProfile(matched, 'lifestory');
        return;
      }
      goToNarratorProfile({
        id: elder.narratorId,
        full_name_tamil: elder.nameTa,
        full_name_english: elder.nameEn,
        preferred_name: elder.relationTa,
        birth_year: new Date().getFullYear() - elder.age,
        place_of_birth: elder.subtitleEn.split('·')[0].trim(),
        preferred_language: 'ta',
        tamil_dialect: null,
        profile_photo_url: elder.photoUrl,
        status: 'active',
      }, 'lifestory');
    } else {
      setCurrentScreen('recordings');
    }
  };

  // =========================================================================
  // FAMILY REVIEWS SECTION DATA (EXACTLY MATCHING REFERENCE SCREENSHOT)
  // Heartfelt reviews from family members preserving oral history
  // =========================================================================
  interface FamilyReview {
    id: string;
    authorName: string;
    relationshipEn: string;
    relationshipTa: string;
    timeAgoEn: string;
    timeAgoTa: string;
    avatarUrl: string;
    reviewTextEn: string;
    reviewTextTa: string;
    rating: number;
  }

  const familyReviews: FamilyReview[] = [
    {
      id: 'rev-1',
      authorName: 'Karthik S.',
      relationshipEn: 'Grandson · Chennai',
      relationshipTa: 'பேரன் · சென்னை',
      timeAgoEn: '2 days ago',
      timeAgoTa: '2 நாட்களுக்கு முன்',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      reviewTextEn: 'Hearing my Thatha talk about his childhood on the banks of the river moved our whole family to tears. His authentic Tamil slang and laughter are now captured forever. My kids will know their great-grandfather’s voice.',
      reviewTextTa: 'என் தாத்தா ஆற்றுப் படுகையில் கழித்த பால்ய நினைவுகளை அவருடைய சொந்தக் குரலில் கேட்கும்போது கண்கள் கலங்கியது. வட்டார வழக்கின் அழகு மாறாமல் அப்படியே பதிவாகியுள்ளது. அடுத்த தலைமுறையும் அவர் குரலைக் கேட்கும்.',
      rating: 5,
    },
    {
      id: 'rev-2',
      authorName: 'Divya Sundaram',
      relationshipEn: 'Granddaughter · Bengaluru',
      relationshipTa: 'பேத்தி · பெங்களூரு',
      timeAgoEn: '4 days ago',
      timeAgoTa: '4 நாட்களுக்கு முன்',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      reviewTextEn: 'Paatti’s traditional festive recipes and lullabies were something we feared would be lost forever. The audio quality and timeline organization are so clean. An invaluable family heirloom for generations.',
      reviewTextTa: 'பாட்டியின் பாரம்பரிய மரபுச் சமையல் குறிப்புகளும், அவர் பாடிய தாலாட்டுப் பாடல்களும் காலத்தால் அழியாமல் பாதுகாக்கப்பட்டுவிட்டன. எங்கள் குடும்பத்திற்குக் கிடைத்த அரிய பொக்கிஷம் இது.',
      rating: 5,
    },
    {
      id: 'rev-3',
      authorName: 'Senthil Kumar',
      relationshipEn: 'Son · Coimbatore',
      relationshipTa: 'மகன் · கோயம்புத்தூர்',
      timeAgoEn: '1 week ago',
      timeAgoTa: '1 வாரத்திற்கு முன்',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      reviewTextEn: 'The guided Tamil interview questions made my mother open up about village farming life in Erode in the 1950s. She spoke for over an hour without hesitation. Ninaivu Kalanjiyam is doing sacred, meaningful work.',
      reviewTextTa: 'அம்மாவிடம் 1950-களின் ஈரோட்டு உழவு வாழ்க்கை பற்றி இவ்வளவு ஆழமான நினைவுகள் இருக்கும் என்று நினைத்துக் கூடப் பார்க்கவில்லை. வழிகாட்டப்பட்ட கேள்விகள் அம்மாவைத் தடையின்றிப் பேச வைத்தன.',
      rating: 5,
    },
    {
      id: 'rev-4',
      authorName: 'Vigneshwaran S.',
      relationshipEn: 'Grandson · Singapore',
      relationshipTa: 'பேரன் · சிங்கப்பூர்',
      timeAgoEn: '1 week ago',
      timeAgoTa: '1 வாரத்திற்கு முன்',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      reviewTextEn: 'Living abroad, I was always worried my children would lose touch with our ancestral roots in Bhavani. Listening to Thatha’s voice archive makes us feel right at home in Tamil Nadu whenever we play it.',
      reviewTextTa: 'வெளிநாட்டில் வாழும் என் குழந்தைகளுக்கு பவானி நெசவாளர் மரபு பற்றிய எங்கள் வேர்களை என் தாத்தாவின் குரலிலேயே கடத்த முடிந்தது. இது வெறும் ஒலிப்பதிவு மட்டுமல்ல, எங்கள் அடையாளம்.',
      rating: 5,
    },
    {
      id: 'rev-5',
      authorName: 'Revathi K.',
      relationshipEn: 'Daughter · Tirunelveli',
      relationshipTa: 'மகள் · திருநெல்வேலி',
      timeAgoEn: '2 weeks ago',
      timeAgoTa: '2 வாரங்களுக்கு முன்',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      reviewTextEn: 'The pure Tamil expressions and the oral history of our family ancestral home were preserved with zero distortion. Seeing my father smile with pride while listening back to his own interview was magical.',
      reviewTextTa: 'தூய தமிழ் வழக்கில் அப்பா பகிர்ந்த குடும்ப வரலாற்றுக் கதைகள் எந்த சிதைவுமின்றி ஆவணப்படுத்தப்பட்டுள்ளன. தன் பேச்சை அவரே கேட்டு மகிழ்ந்த காட்சி மறக்க முடியாதது.',
      rating: 5,
    },
  ];

  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const [isReviewPaused, setIsReviewPaused] = useState(false);
  const reviewCardRef = useRef<HTMLDivElement>(null);
  const [reviewCardStep, setReviewCardStep] = useState(384);

  useEffect(() => {
    const updateStep = () => {
      if (reviewCardRef.current) {
        setReviewCardStep(reviewCardRef.current.offsetWidth + 24);
      }
    };
    updateStep();
    window.addEventListener('resize', updateStep);
    return () => window.removeEventListener('resize', updateStep);
  }, []);

  // Auto-play reviews slider every 4.5s
  useEffect(() => {
    if (isReviewPaused) return;

    const timer = setInterval(() => {
      setActiveReviewIdx((prev) => (prev + 1) % familyReviews.length);
    }, 4500);

    return () => clearInterval(timer);
  }, [isReviewPaused, familyReviews.length]);

  const handleNextReview = () => {
    setActiveReviewIdx((prev) => (prev + 1) % familyReviews.length);
  };

  const handlePrevReview = () => {
    setActiveReviewIdx((prev) => (prev > 0 ? prev - 1 : familyReviews.length - 1));
  };

  interface ProjectStep {
    number: string;
    stepTagEn: string;
    stepTagTa: string;
    titleEn: string;
    titleTa: string;
    descEn: string;
    descTa: string;
    themeClass: string;
    icon: React.ReactNode;
    actionLabelEn: string;
    actionLabelTa: string;
    onAction: () => void;
  }

  const projectSteps: ProjectStep[] = [
    {
      number: '01',
      stepTagEn: 'Step 01 · Setup',
      stepTagTa: 'படி 01 · தொடக்கம்',
      titleEn: 'Sign Up',
      titleTa: 'பதிவு செய்க (Sign Up)',
      descEn: 'Create your private family heritage vault in seconds. Add your elders, assign family contributors, and configure preferred Tamil dialect settings.',
      descTa: 'நொடிகளில் உங்கள் குடும்பப் பெட்டகத்தை உருவாக்குங்கள். முதியவர்களின் விபரங்களையும், குடும்ப உறவினர்களையும் இணைத்து எளிதாகத் தொடங்குங்கள்.',
      themeClass: 'project-step-theme-1',
      icon: <UserPlus size={22} strokeWidth={2.2} />,
      actionLabelEn: 'Get Started',
      actionLabelTa: 'தொடங்க',
      onAction: () => setIsQuickDrawerOpen(true),
    },
    {
      number: '02',
      stepTagEn: 'Step 02 · Oral Audio',
      stepTagTa: 'படி 02 · குரல் பதிவு',
      titleEn: 'Record + Answer',
      titleTa: 'பதிவு செய்து பதிலளியுங்கள்',
      descEn: 'Conduct guided oral audio interviews in Tamil. Intuitive prompts help elders comfortably share childhood memories, village roots, and life wisdom.',
      descTa: 'வழிகாட்டப்பட்ட எளிய தமிழ் கேள்விகள் மூலம் ஒலிப்பதிவைத் தொடங்குங்கள். பால்ய நினைவுகள், கிராமக் கதைகள், குலப் பழக்கங்களை முதியவர்கள் இயல்பாகப் பேசுவர்.',
      themeClass: 'project-step-theme-2',
      icon: <Mic size={22} strokeWidth={2.2} />,
      actionLabelEn: 'Record Audio',
      actionLabelTa: 'ஒலிப்பதிவு செய்ய',
      onAction: () => goToNewInterview(),
    },
    {
      number: '03',
      stepTagEn: 'Step 03 · AI Intelligence',
      stepTagTa: 'படி 03 · AI பகுப்பாய்வு',
      titleEn: 'Extract Memories with AI',
      titleTa: 'AI மூலம் நினைவுகளைப் பிரித்தல்',
      descEn: 'Our dialect-aware AI transcribes native Tamil spoken accents with 100% accuracy, extracting key life milestones, folklore, family recipes, and deep emotions.',
      descTa: 'கொங்கு, மதுரை, தஞ்சை வட்டார வழக்குகள் மாறாமல் துல்லியமாக ஒலிபெயர்த்து, முதன்மை நினைவுகளையும் உணர்வுகளையும் AI தானாகப் பிரித்தெடுக்கிறது.',
      themeClass: 'project-step-theme-3',
      icon: <Sparkles size={22} strokeWidth={2.2} />,
      actionLabelEn: 'Explore AI',
      actionLabelTa: 'AI சிறப்புகள்',
      onAction: () => {
        const el = document.getElementById('stories-narrators-stats');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      number: '04',
      stepTagEn: 'Step 04 · Heritage Book',
      stepTagTa: 'படி 04 · வரலாற்று நூல்',
      titleEn: 'Combine into Biography',
      titleTa: 'அத்தியாய வரலாற்று நூல்',
      descEn: 'Combine reviewed memories and transcripts into a readable chapter-by-chapter biography, organized chronologically with historical context and family photographs.',
      descTa: 'சரிபார்க்கப்பட்ட நினைவுகள் மற்றும் உரையாடல்களை அழகான அத்தியாயங்களாக வரிசைப்படுத்தி, புகைப்படங்களுடன் கூடிய முழுமையான வரலாற்று நூலாகத் தொகுத்தல்.',
      themeClass: 'project-step-theme-4',
      icon: <BookOpen size={22} strokeWidth={2.2} />,
      actionLabelEn: 'Read Sample',
      actionLabelTa: 'வாசிக்க',
      onAction: () => {
        const el = document.getElementById('inspiring-journeys-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      number: '05',
      stepTagEn: 'Step 05 · Vault Export',
      stepTagTa: 'படி 05 · ஏற்றுமதி',
      titleEn: 'Export Archive',
      titleTa: 'ஆவணத்தை ஏற்றுமதி செய்க',
      descEn: 'Export your complete family archive as an illustrated printable biography book (PDF) and lossless archival master audio files to safeguard across generations.',
      descTa: 'அழகிய வாழ்க்கை வரலாற்று நூலை அச்சிடத்தக்க புத்தகமாகவும் (PDF), மூல ஆடியோ கோப்புகளாகவும் ஏற்றுமதி செய்து எதிர்காலத் தலைமுறைகளுக்குப் பரிசளியுங்கள்.',
      themeClass: 'project-step-theme-5',
      icon: <Archive size={22} strokeWidth={2.2} />,
      actionLabelEn: 'Export Vault',
      actionLabelTa: 'ஏற்றுமதி செய்ய',
      onAction: () => setIsQuickDrawerOpen(true),
    },
  ];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ========================================================
          HERO EDITORIAL SECTION (SCREENSHOT 1)
          ======================================================== */}
      <section className="hero-editorial-section">
        <div className="hero-editorial-inner">
          {/* Display Headline with embedded horizontal oval photo pill in center for ALL 3 sentences */}
          <h1 className="hero-display-title">
            <div className="hero-display-line1">
              <span className="hero-title-word">
                {text1}
                {showCursorInPart1 && <span className="typewriter-cursor">|</span>}
              </span>
              <span className="hero-headline-pill">
                <img
                  src={oldageImg}
                  alt="Family Generations Memory"
                  loading="eager"
                />
              </span>
              <span className="hero-title-word">
                {text2}
                {showCursorInPart2 && <span className="typewriter-cursor">|</span>}
              </span>
            </div>
            <div className="hero-display-line2">
              <span>{text3}</span>
              {showCursorInPart3 && <span className="typewriter-cursor">|</span>}
            </div>
          </h1>

          {/* Subtitle smoothly updated with typewriter active phrase */}
          <p
            style={{
              fontSize: 'clamp(15px, 1.6vw, 19px)',
              fontWeight: 600,
              color: 'var(--slate-taupe)',
              margin: '-14px auto 36px',
              letterSpacing: '0.2px',
              minHeight: '28px',
              transition: 'opacity 0.3s ease',
            }}
          >
            {activePhrase.subtitle}
          </p>

          {/* Centered Action Buttons (Matching Screenshot) */}
          <div className="hero-ctas-group">
            {/* Green pill button (Matching DONATE pill) */}
            <button
              className="hero-btn-green"
              onClick={() => goToNewInterview()}
              title="Start a new interview session"
            >
              <Mic size={16} />
              <span>{uiLanguage === 'ta' ? 'நேர்காணல் தொடங்கு' : 'START INTERVIEW'}</span>
            </button>

            {/* Outline pill button with arrow (Matching I NEED HELP ↗) */}
            <button
              className="hero-btn-outline"
              onClick={() => {
                const el = document.getElementById('inspiring-journeys-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              title="Explore inspiring journeys of strength and hope"
            >
              <span>{uiLanguage === 'ta' ? 'நினைவுகளைக் காண்க' : 'VIEW MEMORIES'}</span>
              <span
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'var(--bg-subtle)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                }}
              >
                ↗
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Bar / Ticker (Matching Screenshot Bottom Bar) */}
        <div className="hero-bottom-bar">
          {/* Left: Quick Actions Button */}
          <button
            className="bottom-action-pill"
            onClick={() => setIsQuickDrawerOpen(true)}
            title="Open Quick Actions & Session Resume"
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LayoutGrid size={15} color="var(--slate-taupe-dark)" />
            </div>
            <span>{uiLanguage === 'ta' ? 'விரைவுச் செயல்கள்' : 'QUICK ACTIONS'}</span>
          </button>

          {/* Center: Dynamic Relatable Marquee Ticker */}
          <div className="hero-marquee-wrapper" title="Family Archive Highlights">
            <div className="hero-marquee-track">
              {/* First loop of items */}
              <div className="marquee-item">
                <span className="marquee-pill-tag">
                  <Mic size={13} color="var(--accent-green)" />
                  {metrics.storiesRecorded} {uiLanguage === 'ta' ? 'பதிவான கதைகள்' : 'STORIES RECORDED'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'ஒவ்வொரு வாழ்வும் ஒரு அரிய வரலாறு' : 'EVERY LIFE HAS A STORY WORTH PRESERVING'}</span>
              </div>

              <div className="marquee-item">
                <span className="marquee-pill-tag">
                  <Radio size={13} color="var(--slate-steel-blue)" />
                  {metrics.interviewSessions} {uiLanguage === 'ta' ? 'நேர்காணல் அமர்வுகள்' : 'SESSIONS COMPLETED'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'தாத்தா பாட்டியின் பால்ய நினைவுகள்' : 'CHILDHOOD MEMORIES & ROOTS'}</span>
              </div>

              <div className="marquee-item">
                <span className="marquee-pill-tag">
                  <Users size={13} color="var(--slate-sand)" />
                  {metrics.totalNarrators} {uiLanguage === 'ta' ? 'குடும்ப முன்னோர்கள்' : 'BELOVED ELDERS'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'காலம் கடந்தாலும் அழியாத சொந்தக் குரல்' : 'VOICES THAT NEVER FADE OVER TIME'}</span>
              </div>

              <div className="marquee-item">
                <span className="marquee-pill-tag">
                  <Heart size={13} color="#E11D48" />
                  {metrics.memoriesCollected} {uiLanguage === 'ta' ? 'சேகரித்த நினைவுகள்' : 'MEMORIES PRESERVED'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'காவிரிக் கரை வாழ்வும் குடும்ப மரபும்' : 'ANCESTRAL WISDOM & FAMILY HERITAGE'}</span>
              </div>

              <div className="marquee-item">
                <span className="marquee-pill-tag">
                  <Sparkles size={13} color="#D97706" />
                  {uiLanguage === 'ta' ? 'AI வாய்மொழி ஆவணம்' : 'AI TAMIL AUDIO ENGINE'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'தலைமுறைகளைக் கடக்கும் வரலாற்றுப் பெட்டகம்' : 'BRIDGING GENERATIONS THROUGH VOICE'}</span>
              </div>

              {/* Exact duplicate for seamless 100% infinite loop */}
              <div className="marquee-item" aria-hidden="true">
                <span className="marquee-pill-tag">
                  <Mic size={13} color="var(--accent-green)" />
                  {metrics.storiesRecorded} {uiLanguage === 'ta' ? 'பதிவான கதைகள்' : 'STORIES RECORDED'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'ஒவ்வொரு வாழ்வும் ஒரு அரிய வரலாறு' : 'EVERY LIFE HAS A STORY WORTH PRESERVING'}</span>
              </div>

              <div className="marquee-item" aria-hidden="true">
                <span className="marquee-pill-tag">
                  <Radio size={13} color="var(--slate-steel-blue)" />
                  {metrics.interviewSessions} {uiLanguage === 'ta' ? 'நேர்காணல் அமர்வுகள்' : 'SESSIONS COMPLETED'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'தாத்தா பாட்டியின் பால்ய நினைவுகள்' : 'CHILDHOOD MEMORIES & ROOTS'}</span>
              </div>

              <div className="marquee-item" aria-hidden="true">
                <span className="marquee-pill-tag">
                  <Users size={13} color="var(--slate-sand)" />
                  {metrics.totalNarrators} {uiLanguage === 'ta' ? 'குடும்ப முன்னோர்கள்' : 'BELOVED ELDERS'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'காலம் கடந்தாலும் அழியாத சொந்தக் குரல்' : 'VOICES THAT NEVER FADE OVER TIME'}</span>
              </div>

              <div className="marquee-item" aria-hidden="true">
                <span className="marquee-pill-tag">
                  <Heart size={13} color="#E11D48" />
                  {metrics.memoriesCollected} {uiLanguage === 'ta' ? 'சேகரித்த நினைவுகள்' : 'MEMORIES PRESERVED'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'காவிரிக் கரை வாழ்வும் குடும்ப மரபும்' : 'ANCESTRAL WISDOM & FAMILY HERITAGE'}</span>
              </div>

              <div className="marquee-item" aria-hidden="true">
                <span className="marquee-pill-tag">
                  <Sparkles size={13} color="#D97706" />
                  {uiLanguage === 'ta' ? 'AI வாய்மொழி ஆவணம்' : 'AI TAMIL AUDIO ENGINE'}
                </span>
                <span className="marquee-star-dot">✦</span>
                <span>{uiLanguage === 'ta' ? 'தலைமுறைகளைக் கடக்கும் வரலாற்றுப் பெட்டகம்' : 'BRIDGING GENERATIONS THROUGH VOICE'}</span>
              </div>
            </div>
          </div>

          {/* Right: Scroll Down Button */}
          <button
            className="bottom-scroll-btn"
            onClick={scrollToWhatWeDo}
            title="Scroll down to What We Do"
          >
            <span>{uiLanguage === 'ta' ? 'கீழே உருட்டவும்' : 'SCROLL DOWN'}</span>
            <div className="bottom-scroll-circle">
              <ArrowDown size={15} />
            </div>
          </button>
        </div>
      </section>

      {/* ========================================================
          WHAT WE DO SECTION (EXACTLY MATCHING USER SCREENSHOT 2)
          ======================================================== */}
      <section id="what-we-do-section" className="what-we-do-section">
        {/* Mint green pill tag: [ What We Do ] */}
        <div>
          <span className="pill-badge-mint">
            {uiLanguage === 'ta' ? 'எங்கள் செயல்பாடுகள்' : 'What We Do'}
          </span>
        </div>

        {/* Big Bold Headline matching screenshot */}
        <h2 className="what-we-do-title">
          {uiLanguage === 'ta' ? (
            <>
              குடும்ப முன்னோர்களின் குரல் மற்றும்
              <br />
              நினைவுகளைப் பாதுகாப்போம்
            </>
          ) : (
            <>
              Preserving Voice And Wisdom
              <br />
              Across Generations
            </>
          )}
        </h2>

        {/* LEARN MORE ↗ link with circle arrow button */}
        <div style={{ textAlign: 'center' }}>
          <button
            className="learn-more-group"
            onClick={() => {
              const el = document.getElementById('our-impact-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                setIsQuickDrawerOpen(true);
              }
            }}
            title="Explore archive details & impact milestones"
          >
            <span>{uiLanguage === 'ta' ? 'மேலும் அறிய' : 'LEARN MORE'}</span>
            <span className="learn-more-circle">↗</span>
          </button>
        </div>

        {/* Three Super-Rounded Cards (Matching Screenshot 2) */}
        <div className="what-we-do-grid">
          {/* Card 1: Tinted Peach/Sand Card ("Record Life Stories") */}
          <div
            className="feature-card-tinted"
            onClick={() => goToNewInterview()}
            title="Start new interview recording"
          >
            <div>
              {/* Top row: Left icon + Right hand pointer 👆 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="feature-card-top-icon">
                  <Mic size={17} color="var(--slate-taupe-dark)" />
                </div>
                <div style={{ color: 'var(--slate-taupe-dark)' }}>
                  <MousePointerClick size={22} />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="feature-card-title">
                {uiLanguage === 'ta' ? 'வாழ்க்கைக் கதைகளைப் பதிவு செய்க' : 'Record Life Stories'}
              </h3>
              <p className="feature-card-desc">
                {uiLanguage === 'ta'
                  ? 'குடும்ப முன்னோர்களுடன் வழிகாட்டப்பட்ட வாய்மொழி நேர்காணல்களைத் தொடங்குங்கள். அவர்களின் உணர்ச்சிகள், குரல், மற்றும் அரிய வாழ்க்கை அனுபவங்களை அழியாமல் பாதுகாக்கவும்.'
                  : 'Conduct guided oral audio interviews with family elders in Tamil. Preserve their authentic voice, emotions, and life experiences for future generations.'}
              </p>
            </div>

            {/* Bottom row: Badges left + Green circle button right */}
            <div className="feature-card-bottom">
              <div className="feature-badge-cluster">
                <div className="feature-badge-circle" title="Audio Studio">
                  🎙️
                </div>
                <div className="feature-badge-circle" title="Tamil Dialect">
                  தமிழ்
                </div>
                <div className="feature-badge-circle" title="English / Bilingual">
                  EN
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--slate-taupe)' }}>
                  {uiLanguage === 'ta' ? 'ஒலிப்பதிவு கூடம்' : 'Audio Studio'}
                </span>
              </div>

              <div className="green-circle-arrow-btn">
                <span style={{ fontSize: '18px', fontWeight: 800 }}>↗</span>
              </div>
            </div>
          </div>

          {/* Card 2: White Card ("Preserve Memories in Tamil") */}
          <div
            className="feature-card-white"
            onClick={() => setCurrentScreen('timeline')}
            title="View memories timeline"
          >
            <div>
              {/* Top row: Left icon */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="feature-card-top-icon">
                  <Heart size={17} color="var(--accent-green)" />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="feature-card-title">
                {uiLanguage === 'ta' ? 'நினைவுகளைக் காலவரிசைப்படுத்துக' : 'Preserve Memories in Tamil'}
              </h3>
              <p className="feature-card-desc">
                {uiLanguage === 'ta'
                  ? 'நேர்காணல் உரையாடல்களைக் குழந்தைப் பருவ நினைவுகள், காவிரிக் கரை வாழ்வு, மற்றும் பண்பாட்டு நிகழ்வுகளாக ஒழுங்கமைக்கப்பட்ட காலவரிசையில் காண்க.'
                  : 'Organize oral conversations into an interactive chronological timeline with childhood memories, family traditions, and historical milestones.'}
              </p>
            </div>

            {/* Bottom row: Hashtags left + Outline circle button right */}
            <div className="feature-card-bottom">
              <div className="feature-card-tags">
                <span>#Childhood</span>
                <span>#Traditions</span>
                <span>#Heritage</span>
              </div>

              <div className="outline-circle-arrow-btn">
                <span style={{ fontSize: '18px', fontWeight: 800 }}>↗</span>
              </div>
            </div>
          </div>

          {/* Card 3: White Card ("Build a Family History") */}
          <div
            className="feature-card-white"
            onClick={() => setCurrentScreen('story_builder')}
            title="Open LifeStory Builder"
          >
            <div>
              {/* Top row: Left icon */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="feature-card-top-icon">
                  <Users size={17} color="var(--slate-steel-blue)" />
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="feature-card-title">
                {uiLanguage === 'ta' ? 'குடும்ப வரலாறு தொகுக்க' : 'Build a Family History'}
              </h3>
              <p className="feature-card-desc">
                {uiLanguage === 'ta'
                  ? 'சரிபார்க்கப்பட்ட ஒலிப்பதிவுகளையும் உரைகளையும் அழகிய வாழ்க்கை வரலாற்று புத்தகமாகத் தொகுக்கவும். தலைமுறைகள் கொண்டாடும் ஆவணமாக மாற்றவும்.'
                  : 'Assemble verified transcripts and oral recordings into an illustrated biography book, creating an enduring family heritage archive.'}
              </p>
            </div>

            {/* Bottom row: Elder Avatars left + Outline circle button right */}
            <div className="feature-card-bottom">
              <div className="feature-avatars-cluster">
                <div className="avatars-row">
                  <div className="avatar-bubble" style={{ background: 'var(--slate-taupe-dark)' }}>
                    ச
                  </div>
                  <div className="avatar-bubble" style={{ background: 'var(--slate-steel-blue)' }}>
                    ல
                  </div>
                  <div className="avatar-bubble" style={{ background: 'var(--accent-green)' }}>
                    சு
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                  {uiLanguage === 'ta' ? '5 முன்னோர்கள்' : '5 Family Elders'}
                </span>
              </div>

              <div className="outline-circle-arrow-btn">
                <span style={{ fontSize: '18px', fontWeight: 800 }}>↗</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          OUR IMPACT SECTION (SCREENSHOT 3 - DYNAMIC IMPACT COUNTER)
          ======================================================== */}
      <section id="our-impact-section" className="our-impact-section">
        <div className="our-impact-header">
          {/* Pill Badge: [ Our Impact ] */}
          <div>
            <span className="our-impact-pill">
              <Sparkles size={14} style={{ color: 'var(--accent-green)' }} />
              {uiLanguage === 'ta' ? 'எங்கள் தாக்கம்' : 'Our Impact'}
            </span>
          </div>

          {/* Heading: Together, We're Making A Difference */}
          <h2 className="our-impact-title">
            {uiLanguage === 'ta' ? (
              <>
                ஒன்றாக இணைந்து,
                <br />
                வரலாற்றைப் பாதுகாப்போம்
              </>
            ) : (
              <>
                Together, We're Making
                <br />
                A Difference
              </>
            )}
          </h2>
        </div>

        {/* Curved Dome Arc Wrapper */}
        <div className="impact-curve-container">
          <svg
            viewBox="0 0 1440 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            className="impact-curve-svg"
          >
            <path
              d="M 0 160 Q 720 0 1440 160 Z"
              fill="var(--bg-warm-sand, #F4EFE6)"
            />
          </svg>
        </div>

        {/* Curved Dome Body with 2x2 Grid (2 Rows, 2 in Each Row) */}
        <div className="impact-dome-body">
          <div className="impact-grid-2x2">
            {impactMetrics.map((item) => (
              <div
                key={item.id}
                className="impact-grid-card"
                onClick={() => setCurrentScreen(item.screen)}
                title={`Explore ${uiLanguage === 'ta' ? item.labelTa : item.labelEn}`}
              >
                <div>
                  {/* Big Dynamic Number Count */}
                  <div className="impact-card-count">
                    <ImpactNumberCounter
                      target={item.count}
                      suffix={item.suffix}
                      color={item.color}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="impact-card-title">
                    {uiLanguage === 'ta' ? item.labelTa : item.labelEn}
                  </h3>

                  {/* Followed by Description */}
                  <p className="impact-card-desc">
                    {uiLanguage === 'ta' ? item.descTa : item.descEn}
                  </p>
                </div>

                {/* Footer action */}
                <div className="impact-card-footer">
                  <span className="impact-card-action-text">
                    <span style={{ color: item.color, fontWeight: 900 }}>✦</span>
                    {uiLanguage === 'ta' ? `${item.pillTa} பார்க்க` : `Explore ${item.pillEn}`}
                  </span>
                  <div className="impact-card-arrow-circle">
                    ↗
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          INSPIRING JOURNEYS SHOWCASE SECTION (MATCHING SCREENSHOT)
          ======================================================== */}
      <section id="inspiring-journeys-section" className="inspiring-journeys-section">
        {/* Centered Display Title (2 Lines matching screenshot) */}
        <h2 className="inspiring-journeys-title">
          {uiLanguage === 'ta' ? (
            <>
              தலைமுறை கடக்கும்
              <br />
              அரிய வாழ்வனுபவங்கள்
            </>
          ) : (
            <>
              Inspiring Journeys
              <br />
              Of Strength And Hope
            </>
          )}
        </h2>

        {/* SEE ALL STORIES ↗ Pill Button */}
        <div>
          <button
            className="see-all-stories-btn"
            onClick={() => setCurrentScreen('narrators')}
            title="Browse all elders and family stories"
          >
            <span>{uiLanguage === 'ta' ? 'அனைத்துக் கதைகளையும் காண்க' : 'SEE ALL STORIES'}</span>
            <div className="see-all-stories-circle">
              ↗
            </div>
          </button>
        </div>

        {/* Horizontal Showcase Carousel with Smooth Auto-Slide */}
        <div
          ref={carouselContainerRef}
          className="inspiring-carousel-wrapper"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Previous Carousel Button */}
          <button
            className="inspiring-nav-btn inspiring-nav-prev"
            onClick={handlePrev}
            title="Previous Story"
            aria-label="Previous Story"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Sliding Cards Track */}
          <div
            className="inspiring-cards-track"
            style={{
              transform: `translateX(${trackOffset}px)`,
              transition: enableTransition
                ? 'transform 0.65s cubic-bezier(0.2, 0.9, 0.3, 1)'
                : 'none',
            }}
          >
            {repeatedGrandparents.map((elder, idx) => {
              const isActive = idx === currentIndex;

              return (
                <div
                  key={elder.uniqueKey}
                  ref={idx === INITIAL_INDEX ? cardSampleRef : undefined}
                  className={`inspiring-card ${
                    isActive ? 'inspiring-card-active' : 'inspiring-card-inactive'
                  }`}
                  onClick={() => {
                    if (!isActive) {
                      setEnableTransition(true);
                      setCurrentIndex(idx);
                    }
                  }}
                >
                  {/* Portrait Photo Container with Deep Curved Squircle Corners */}
                  <div className="inspiring-photo-box">
                    <img
                      src={elder.photoUrl}
                      alt={
                        uiLanguage === 'ta'
                          ? `${elder.nameTa}, ${elder.age}`
                          : `${elder.nameEn}, ${elder.age}`
                      }
                      className="inspiring-photo-img"
                      onError={(e) => {
                        // Reliable fallback to local asset
                        e.currentTarget.src = oldageImg;
                      }}
                      loading="lazy"
                    />

                    {/* Active Card Pill Button (Green DONATE / LISTEN STORY ↗) */}
                    <button
                      className="inspiring-photo-pill-btn"
                      style={{
                        opacity: isActive ? 1 : 0,
                        pointerEvents: isActive ? 'auto' : 'none',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleListenStory(elder);
                      }}
                      title="Listen to life story"
                    >
                      <span>{uiLanguage === 'ta' ? 'கதை கேட்க' : 'LISTEN STORY'}</span>
                      <div className="inspiring-pill-arrow">↗</div>
                    </button>
                  </div>

                  {/* Active Card White Detail Info Box (Directly Underneath) */}
                  <div
                    className="inspiring-info-card"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateY(0)' : 'translateY(12px)',
                      pointerEvents: isActive ? 'auto' : 'none',
                    }}
                  >
                    {/* Name, Age */}
                    <h4 className="inspiring-info-name">
                      {uiLanguage === 'ta'
                        ? `${elder.nameTa}, ${elder.age}`
                        : `${elder.nameEn}, ${elder.age}`}
                    </h4>

                    {/* Subtitle / Context */}
                    <p className="inspiring-info-sub">
                      {uiLanguage === 'ta' ? elder.subtitleTa : elder.subtitleEn}
                    </p>

                    {/* Progress Bar */}
                    <div className="inspiring-progress-track">
                      <div
                        className="inspiring-progress-bar"
                        style={{ width: `${elder.progressPercent}%` }}
                      />
                    </div>

                    {/* Bottom Stats Row */}
                    <div className="inspiring-info-stats">
                      <span className="inspiring-stat-left">
                        {uiLanguage === 'ta' ? elder.statLeftTa : elder.statLeftEn}
                      </span>
                      <span className="inspiring-stat-right">
                        {elder.statRight}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next Carousel Button */}
          <button
            className="inspiring-nav-btn inspiring-nav-next"
            onClick={handleNext}
            title="Next Story"
            aria-label="Next Story"
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="inspiring-dots-container">
          {inspiringGrandparents.map((_, dotIdx) => {
            const isDotActive = (currentIndex % BASE_COUNT) === dotIdx;
            return (
              <button
                key={dotIdx}
                className={`inspiring-dot ${isDotActive ? 'inspiring-dot-active' : ''}`}
                onClick={() => {
                  const activeMod = currentIndex % BASE_COUNT;
                  const diff = dotIdx - activeMod;
                  setEnableTransition(true);
                  setCurrentIndex((prev) => prev + diff);
                }}
                aria-label={`Go to slide ${dotIdx + 1}`}
              />
            );
          })}
        </div>
      </section>

      {/* ========================================================
          REVIEWS FROM REAL FAMILIES SECTION (SCREENSHOT REFERENCE)
          ======================================================== */}
      <section id="family-reviews-section" className="family-reviews-section">
        <div className="family-reviews-inner">
          {/* Header Headline */}
          <h2 className="family-reviews-title">
            {uiLanguage === 'ta' ? 'உண்மையான ' : 'Reviews from '}
            <span className="family-reviews-title-bold">
              {uiLanguage === 'ta' ? 'குடும்பங்களின் பகிர்வுகள்' : 'real families'}
            </span>
          </h2>

          {/* Trust Rating Badge */}
          <div className="family-reviews-rating-badge">
            <span className="family-reviews-rating-val">4.9/5</span>
            <div className="family-reviews-trust-brand">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#00b67a">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span>{uiLanguage === 'ta' ? 'நினைவு களஞ்சியம்' : 'Trustpilot'}</span>
            </div>
            <span>
              {uiLanguage === 'ta'
                ? '1,280+ குடும்பப் பதிவுகளின் அடிப்படையில்'
                : 'Based on 1,280+ family reviews'}
            </span>
          </div>

          {/* Asymmetric 2-Column Layout */}
          <div className="family-reviews-layout">
            {/* Left Column: Quote Icon + Title + Slider Controls */}
            <div className="family-reviews-left-col">
              <svg
                className="family-reviews-quote-icon"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              <h3 className="family-reviews-sidebar-title">
                {uiLanguage === 'ta' ? (
                  <>எங்கள் குடும்பங்கள்<br />கூறுவது</>
                ) : (
                  <>What our<br />families are<br />saying</>
                )}
              </h3>

              {/* Slider Controls: Arrow Left - Progress Line - Arrow Right */}
              <div className="family-reviews-slider-ctrl">
                <button
                  type="button"
                  className="family-reviews-arrow-btn"
                  onClick={handlePrevReview}
                  title="Previous review"
                  aria-label="Previous review"
                  style={{ opacity: activeReviewIdx === 0 ? 0.4 : 1 }}
                >
                  <ArrowLeft size={20} strokeWidth={2.2} />
                </button>

                <div className="family-reviews-track-line">
                  <div
                    className="family-reviews-track-fill"
                    style={{
                      width: '36px',
                      left: `${(activeReviewIdx / Math.max(1, familyReviews.length - 1)) * (110 - 36)}px`,
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="family-reviews-arrow-btn"
                  onClick={handleNextReview}
                  title="Next review"
                  aria-label="Next review"
                  style={{ opacity: activeReviewIdx === familyReviews.length - 1 ? 0.4 : 1 }}
                >
                  <ArrowRight size={20} strokeWidth={2.2} />
                </button>
              </div>
            </div>

            {/* Right Column: Cards Carousel Track */}
            <div
              className="family-reviews-carousel-col"
              onMouseEnter={() => setIsReviewPaused(true)}
              onMouseLeave={() => setIsReviewPaused(false)}
            >
              <div
                className="family-reviews-cards-track"
                style={{
                  transform: `translateX(-${activeReviewIdx * reviewCardStep}px)`,
                }}
              >
                {familyReviews.map((rev, idx) => (
                  <div
                    key={rev.id}
                    className="family-review-card-item"
                    ref={idx === 0 ? reviewCardRef : undefined}
                  >
                    {/* Speech Bubble */}
                    <div className="family-review-bubble">
                      <p className="family-review-body">
                        {uiLanguage === 'ta' ? rev.reviewTextTa : rev.reviewTextEn}
                      </p>

                      {/* 5 Green Stars */}
                      <div className="family-review-stars">
                        {[...Array(rev.rating)].map((_, starI) => (
                          <Star
                            key={starI}
                            size={16}
                            fill="#00b67a"
                            color="#00b67a"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Author Metadata Row */}
                    <div className="family-review-author-row">
                      <img
                        src={rev.avatarUrl}
                        alt={rev.authorName}
                        className="family-review-avatar"
                        loading="lazy"
                      />
                      <div>
                        <h4 className="family-review-author-name">
                          {rev.authorName}
                        </h4>
                        <div className="family-review-author-meta">
                          {uiLanguage === 'ta'
                            ? `${rev.relationshipTa} · ${rev.timeAgoTa}`
                            : `${rev.relationshipEn} · ${rev.timeAgoEn}`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          PROJECT STEPS / HOW IT WORKS SECTION
          ======================================================== */}
      <section id="project-steps-section" className="project-steps-section">
        <div className="project-steps-inner">
          {/* Section Header */}
          <div className="project-steps-header">
            <div className="project-steps-badge">
              <Sparkles size={14} />
              <span>
                {uiLanguage === 'ta'
                  ? 'எப்படி செயல்படுகிறது · 5 எளிய படிகள்'
                  : 'How It Works · 5 Simple Steps'}
              </span>
            </div>
            <h2 className="project-steps-title">
              {uiLanguage === 'ta' ? (
                <>
                  குரல் பதிவில் தொடங்கி அழியாத{' '}
                  <span className="project-steps-title-highlight">
                    வரலாற்று நூலாக
                  </span>{' '}
                  மாறும் பயணம்
                </>
              ) : (
                <>
                  From Spoken Voice to an{' '}
                  <span className="project-steps-title-highlight">
                    Enduring Biography
                  </span>
                </>
              )}
            </h2>
            <p className="project-steps-subtitle">
              {uiLanguage === 'ta'
                ? 'மூதாதையரின் சொந்தக் குரலையும் வாழ்வியல் ஞானத்தையும் காலத்தால் அழியாமல் பாதுகாத்து நூலாக உருவாக்கும் 5 படிநிலைகள்.'
                : 'Five thoughtful steps to capture, preserve, and celebrate your family elders’ authentic spoken memories and wisdom.'}
            </p>
          </div>

          {/* Connected 5-Step Grid */}
          <div className="project-steps-grid">
            <div className="project-steps-connector-line" />

            {projectSteps.map((step) => (
              <article key={step.number} className="project-step-card">
                {/* Top Row: Step Number Pill + Icon */}
                <div className="project-step-top-row">
                  <div className="project-step-num-pill">{step.number}</div>
                  <div className={`project-step-icon-wrap ${step.themeClass}`}>
                    {step.icon}
                  </div>
                </div>

                {/* Badge Tag */}
                <span className="project-step-badge-tag">
                  {uiLanguage === 'ta' ? step.stepTagTa : step.stepTagEn}
                </span>

                {/* Title */}
                <h3 className="project-step-title">
                  {uiLanguage === 'ta' ? step.titleTa : step.titleEn}
                </h3>

                {/* Description */}
                <p className="project-step-desc">
                  {uiLanguage === 'ta' ? step.descTa : step.descEn}
                </p>

                {/* Action Link Button */}
                <button
                  type="button"
                  className="project-step-action-btn"
                  onClick={step.onAction}
                >
                  <span>
                    {uiLanguage === 'ta' ? step.actionLabelTa : step.actionLabelEn}
                  </span>
                  <ArrowRight size={14} strokeWidth={2.4} />
                </button>
              </article>
            ))}
          </div>

          {/* Bottom Callout Banner */}
          <div className="project-steps-bottom-banner">
            <div className="project-steps-banner-text">
              <h3>
                {uiLanguage === 'ta'
                  ? 'உங்கள் குடும்ப வரலாற்றை இன்றே பாதுகாக்கத் தொடங்குங்கள்'
                  : 'Start Preserving Your Family Legacy Today'}
              </h3>
              <p>
                {uiLanguage === 'ta'
                  ? 'ஒவ்வொரு மூத்த தலைமுறையினரிடமும் ஒரு மாபெரும் வரலாற்று நூலகமே மறைந்துள்ளது. இன்றே சில நிமிடங்களில் முதன்மைப் பதிவைத் தொடங்குங்கள்.'
                  : 'Every elder carries an unwritten library of memories and heritage. Begin your first guided oral recording in minutes.'}
              </p>
            </div>
            <div className="project-steps-banner-actions">
              <button
                type="button"
                className="project-steps-btn-primary"
                onClick={() => goToNewInterview()}
              >
                <Mic size={18} />
                <span>
                  {uiLanguage === 'ta'
                    ? 'பதிவைத் தொடங்குங்கள்'
                    : "Record Elder's Voice"}
                </span>
              </button>
              <button
                type="button"
                className="project-steps-btn-secondary"
                onClick={() => setIsQuickDrawerOpen(true)}
              >
                <Archive size={18} />
                <span>
                  {uiLanguage === 'ta' ? 'குடும்பப் பெட்டகம்' : 'Open Vault'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          QUICK ACTIONS SLIDE-OUT DRAWER
          ======================================================== */}
      {isQuickDrawerOpen && (
        <div
          className="quick-drawer-backdrop"
          onClick={() => setIsQuickDrawerOpen(false)}
        >
          <div
            className="quick-drawer-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span className="pill-badge-mint" style={{ padding: '4px 12px', fontSize: '11px', marginBottom: '6px' }}>
                  {uiLanguage === 'ta' ? 'விரைவுப் பலகை' : 'Archive Overview'}
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--slate-taupe-dark)', margin: 0 }}>
                  {uiLanguage === 'ta' ? 'விரைவுச் செயல்கள்' : 'Quick Actions & Sessions'}
                </h3>
              </div>

              <button
                onClick={() => setIsQuickDrawerOpen(false)}
                className="circle-profile-btn"
                style={{ width: '36px', height: '36px' }}
                title="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Metrics 5 stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: '18px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsQuickDrawerOpen(false);
                  setCurrentScreen('narrators');
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--slate-taupe-dark)' }}>
                  {metrics.totalNarrators}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                  {uiLanguage === 'ta' ? 'நினைவாளர்கள்' : 'Total Narrators'}
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: '18px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsQuickDrawerOpen(false);
                  setCurrentScreen('session_setup');
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--slate-steel-blue)' }}>
                  {metrics.interviewSessions}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                  {uiLanguage === 'ta' ? 'அமர்வுகள்' : 'Interview Sessions'}
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: '18px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsQuickDrawerOpen(false);
                  setCurrentScreen('recordings');
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-green)' }}>
                  {metrics.storiesRecorded}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                  {uiLanguage === 'ta' ? 'பதிவான கதைகள்' : 'Stories Recorded'}
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-subtle)',
                  borderRadius: '18px',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setIsQuickDrawerOpen(false);
                  setCurrentScreen('timeline');
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#C48232' }}>
                  {metrics.memoriesCollected}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>
                  {uiLanguage === 'ta' ? 'நினைவுகள்' : 'Memories Collected'}
                </div>
              </div>
            </div>

            {/* Unfinished Session Card */}
            {data?.unfinishedSession && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '24px',
                  background: '#FAF3EB',
                  border: '1px solid #ECE1D2',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span
                    className="pill-badge-mint"
                    style={{ margin: 0, padding: '2px 8px', fontSize: '10px' }}
                  >
                    CONTINUE SESSION
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--slate-gray)', fontWeight: 700 }}>
                    #{data.unfinishedSession.session_number}
                  </span>
                </div>

                <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--slate-taupe-dark)' }}>
                  {data.unfinishedSession.full_name_tamil || data.unfinishedSession.full_name_english}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '14px' }}>
                  {data.unfinishedSession.title}
                </div>

                <button
                  className="btn-pill-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', fontSize: '12px' }}
                  onClick={() => {
                    setIsQuickDrawerOpen(false);
                    goToInterview(data.unfinishedSession!);
                  }}
                >
                  <span>{uiLanguage === 'ta' ? 'நேர்காணலைத் தொடர்க' : 'RESUME INTERVIEW'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* Recently Recorded Audio Player */}
            {data?.recentStories && data.recentStories.length > 0 && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--slate-gray)', marginBottom: '12px' }}>
                  {uiLanguage === 'ta' ? 'அண்மைய பதிவு' : 'Latest Recording'}
                </div>
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '20px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--slate-taupe-dark)', marginBottom: '8px' }}>
                    {data.recentStories[0].question_tamil}
                  </div>
                  <AudioPlayer
                    storageKey={data.recentStories[0].storage_key}
                    durationSeconds={data.recentStories[0].duration_seconds}
                    showDownload={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
