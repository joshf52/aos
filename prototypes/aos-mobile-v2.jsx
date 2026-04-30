import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, ArrowLeft, Check, ChevronRight, Plus, Sparkles,
  Compass, Target, User, Bell, Search, X, Bookmark,
  Code, FileText, Briefcase, Package, Activity, Zap,
  Settings, Edit3, Bell as BellIcon, Heart, Cpu, Wand2,
  Brain, TrendingUp as TrendUp, Building2, ShoppingBag,
  Users, Lightbulb, Palette, BookOpen, Globe, ChevronDown
} from 'lucide-react';

// ============================================
// DESIGN TOKENS
// ============================================
const tokens = {
  bg: '#0A0A0C',
  surface: '#15151A',
  surfaceElevated: '#1C1C22',
  surfaceGlass: 'rgba(28, 28, 34, 0.7)',
  border: 'rgba(245, 242, 237, 0.06)',
  borderStrong: 'rgba(245, 242, 237, 0.12)',
  text: '#F5F2ED',
  textSecondary: '#8A8580',
  textTertiary: '#5A5650',
  accent: '#3DB87A',
  accentSoft: 'rgba(61, 184, 122, 0.12)',
  gold: '#D4A574',
  goldSoft: 'rgba(212, 165, 116, 0.12)',
  serif: '"New York", "Charter", "Georgia", serif',
  sans: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif',
};

// ============================================
// MOCK DATA
// ============================================
const OPPORTUNITIES = [
  {
    id: 1,
    title: 'Notion Template Analytics',
    category: 'Software',
    confidence: 5,
    builders: 12,
    gap: 'Notion template creators sell on Gumroad but have zero insight into how customers actually use their templates. Top creators have publicly asked for this.',
    signal: '340+ creators making $1K+/month\n450K members in r/Notion\n8,100 monthly searches',
    wedge: 'Notion won\'t build it. Generic analytics don\'t understand Notion\'s structure. A solo dev who knows both creator economics and the Notion API can own this.',
    customer: 'Priya, 28. Sells 4 Notion templates. Makes $3,200/month. Has no idea which sections people use. Would pay $29/month to know.',
    why_now: 'Notion API matured in 2023. Template selling is now a legitimate business model. Window is open.',
  },
  { id: 2, title: 'Invoice Dispute Assistant', category: 'Software', confidence: 4, builders: 7 },
  { id: 3, title: 'GDPR Cleanup Tool', category: 'Software', confidence: 4, builders: 8 },
];

const LENS_QUESTIONS = [
  { num: 1, label: 'Customer', q: 'Who exactly is the customer?', hint: 'Be specific. Name them.' },
  { num: 2, label: 'Today', q: 'What are they doing today instead?', hint: 'The current solution—even if it\'s suffering.' },
  { num: 3, label: 'Wedge', q: 'Why would they switch to you?', hint: 'The compelling reason to change.' },
  { num: 4, label: 'Test', q: 'What\'s the smallest test you can ship?', hint: 'Not the full product. The minimum version.' },
  { num: 5, label: 'Success', q: 'What does success look like in 30 days?', hint: 'Specific. Measurable. Real.' },
];

const CAPABILITIES = [
  { id: 'software', label: 'Software', sub: 'Apps, SaaS, tools', Icon: Code },
  { id: 'content', label: 'Content', sub: 'Newsletters, courses, media', Icon: FileText },
  { id: 'services', label: 'Services', sub: 'Consulting, productized', Icon: Briefcase },
  { id: 'physical', label: 'Physical', sub: 'Products, hardware', Icon: Package },
];

const DOMAINS = [
  { id: 'ai', label: 'AI & Machine Learning', Icon: Brain },
  { id: 'creator', label: 'Creator Economy', Icon: Palette },
  { id: 'b2b', label: 'B2B SaaS', Icon: Building2 },
  { id: 'devtools', label: 'Developer Tools', Icon: Cpu },
  { id: 'health', label: 'Health & Wellness', Icon: Heart },
  { id: 'finance', label: 'Finance', Icon: TrendUp },
  { id: 'education', label: 'Education', Icon: BookOpen },
  { id: 'productivity', label: 'Productivity', Icon: Zap },
  { id: 'commerce', label: 'E-commerce', Icon: ShoppingBag },
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'media', label: 'Media', Icon: Globe },
  { id: 'climate', label: 'Climate', Icon: Lightbulb },
];

const AUDIENCES = [
  { id: 'creators', label: 'Creators', sub: 'Solopreneurs, indie makers, content people' },
  { id: 'developers', label: 'Indie Hackers', sub: 'Developers and technical builders' },
  { id: 'smb', label: 'Small Business', sub: 'Owner-operators and small teams' },
  { id: 'consumers', label: 'Consumers', sub: 'Everyday people and households' },
];

const COMMITMENTS = [
  { id: 'exploring', label: 'Exploring', sub: '2–5 hrs/week · Looking for the right thing', Icon: Sparkles },
  { id: 'building', label: 'Building', sub: '10–20 hrs/week · Ready to commit', Icon: Wand2 },
  { id: 'allin', label: 'All in', sub: '30+ hrs/week · This is my main focus', Icon: Target },
];

const ADVANTAGE_PLACEHOLDERS = [
  'I worked in healthcare operations for 8 years…',
  'I have 50K engaged followers in productivity…',
  'I ship in two weeks what takes others two months…',
  'I know exactly what enterprise teams will pay for…',
  'I built and sold a small business in this space…',
];

// ============================================
// PHONE FRAME
// ============================================
function PhoneFrame({ children }) {
  return (
    <div style={{ background: '#1a1a1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: tokens.sans }}>
      <div style={{
        width: 390, height: 844, background: '#000',
        borderRadius: 56, padding: 12,
        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
        position: 'relative',
      }}>
        <div style={{ width: '100%', height: '100%', background: tokens.bg, borderRadius: 44, overflow: 'hidden', position: 'relative' }}>
          {/* Dynamic Island */}
          <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 120, height: 36, background: '#000', borderRadius: 20, zIndex: 100 }} />
          
          {/* Status Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 32px 0', zIndex: 50, color: tokens.text, fontSize: 15, fontWeight: 600 }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>9:41</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
                <rect x="0.5" y="3" width="3" height="5" rx="0.5" fill={tokens.text}/>
                <rect x="5" y="2" width="3" height="7" rx="0.5" fill={tokens.text}/>
                <rect x="9.5" y="1" width="3" height="9" rx="0.5" fill={tokens.text}/>
                <rect x="14" y="0" width="3" height="11" rx="0.5" fill={tokens.text}/>
              </svg>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <path d="M7 8.5C7.83 8.5 8.5 9.17 8.5 10H5.5C5.5 9.17 6.17 8.5 7 8.5Z" fill={tokens.text}/>
                <path d="M3.5 5C4.88 3.62 5.94 3 7 3C8.06 3 9.12 3.62 10.5 5L12 3.5C10 1.5 8.5 0.5 7 0.5C5.5 0.5 4 1.5 2 3.5L3.5 5Z" fill={tokens.text}/>
              </svg>
              <div style={{ width: 25, height: 11, border: `1px solid ${tokens.text}`, borderRadius: 3, padding: 1, opacity: 0.4 }}>
                <div style={{ width: '85%', height: '100%', background: tokens.text, borderRadius: 1 }}/>
              </div>
            </div>
          </div>
          
          <div style={{ height: '100%', overflow: 'hidden', position: 'relative' }}>{children}</div>
          
          {/* Home Indicator */}
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: 134, height: 5, background: tokens.text, borderRadius: 3, zIndex: 100, opacity: 0.6 }} />
        </div>
      </div>
    </div>
  );
}

// ============================================
// AURORA BACKGROUND
// ============================================
function Aurora({ intensity = 1 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '10%', left: '20%', width: 320, height: 320, background: `radial-gradient(circle, rgba(61, 184, 122, ${0.18 * intensity}) 0%, transparent 60%)`, filter: 'blur(40px)' }}
      />
      <motion.div
        animate={{ x: [0, -30, 40, 0], y: [0, 40, -10, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '40%', right: '0%', width: 280, height: 280, background: `radial-gradient(circle, rgba(212, 165, 116, ${0.12 * intensity}) 0%, transparent 60%)`, filter: 'blur(40px)' }}
      />
    </div>
  );
}

// ============================================
// SHARED ONBOARDING SHELL
// ============================================
function OnboardingShell({ step, totalSteps, onBack, eyebrow, title, hint, children, footer, paddingTop = 60 }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: `${paddingTop}px 24px 24px`, position: 'relative' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <button
          onClick={onBack}
          style={{
            width: 36, height: 36, borderRadius: 18,
            background: tokens.surface, border: `1px solid ${tokens.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} color={tokens.text} strokeWidth={2}/>
        </button>

        {totalSteps && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  width: i + 1 === step ? 18 : 6,
                  background: i + 1 <= step ? tokens.text : tokens.borderStrong,
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: 6, borderRadius: 3 }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${step}-content`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        >
          {eyebrow && (
            <div style={{ fontSize: 11, color: tokens.gold, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500, marginBottom: 14 }}>
              {eyebrow}
            </div>
          )}
          <h1 style={{ fontFamily: tokens.serif, fontSize: 30, color: tokens.text, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>
            {title}
          </h1>
          {hint && (
            <div style={{ fontSize: 14, color: tokens.textSecondary, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 28, fontFamily: tokens.serif }}>
              {hint}
            </div>
          )}
          <div style={{ flex: 1, overflow: 'auto', marginRight: -24, paddingRight: 24 }}>
            {children}
          </div>
        </motion.div>
      </AnimatePresence>

      {footer && <div style={{ paddingTop: 12 }}>{footer}</div>}
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, dark }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      style={{
        width: '100%', padding: '17px',
        background: disabled ? tokens.surfaceElevated : (dark ? tokens.bg : tokens.text),
        color: disabled ? tokens.textTertiary : (dark ? tokens.text : tokens.bg),
        border: dark ? `1px solid ${tokens.borderStrong}` : 'none',
        borderRadius: 18, fontSize: 16, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: '-0.01em', transition: 'all 0.3s',
      }}
    >
      {children}
    </motion.button>
  );
}

// ============================================
// WELCOME (capability) SCREEN
// ============================================
function WelcomeScreen({ onContinue, initialCapability }) {
  const [selected, setSelected] = useState(initialCapability || null);

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <Aurora />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '90px 28px 30px', position: 'relative', zIndex: 1 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <div style={{ fontFamily: tokens.serif, fontSize: 54, color: tokens.text, fontWeight: 400, letterSpacing: '-0.04em', lineHeight: 1 }}>AOS</div>
          <div style={{ fontFamily: tokens.serif, fontSize: 22, color: tokens.textSecondary, fontWeight: 400, fontStyle: 'italic', marginTop: 6, letterSpacing: '-0.01em' }}>
            Build with conviction.
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} style={{ marginTop: 56 }}>
          <div style={{ fontSize: 13, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 14 }}>
            What can you build?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CAPABILITIES.map((cap, i) => (
              <motion.button
                key={cap.id}
                onClick={() => setSelected(cap.id)}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                  background: selected === cap.id ? tokens.accentSoft : tokens.surface,
                  border: `1px solid ${selected === cap.id ? 'rgba(61, 184, 122, 0.4)' : tokens.border}`,
                  borderRadius: 18, cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                  textAlign: 'left', width: '100%',
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: selected === cap.id ? 'rgba(61, 184, 122, 0.2)' : tokens.surfaceElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s' }}>
                  <cap.Icon size={18} color={selected === cap.id ? tokens.accent : tokens.text} strokeWidth={1.5}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: tokens.text, fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' }}>{cap.label}</div>
                  <div style={{ color: tokens.textSecondary, fontSize: 13, marginTop: 1 }}>{cap.sub}</div>
                </div>
                <AnimatePresence>
                  {selected === cap.id && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      style={{ width: 22, height: 22, borderRadius: 11, background: tokens.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Check size={12} color="#000" strokeWidth={3}/>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <div style={{ flex: 1 }}/>

        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <PrimaryButton onClick={() => onContinue(selected)}>
                Continue <ArrowRight size={17} strokeWidth={2.5}/>
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================
// ONBOARDING — DOMAINS
// ============================================
function DomainsScreen({ initial = [], onContinue, onBack, step = 1, totalSteps = 5 }) {
  const [selected, setSelected] = useState(initial);
  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  };
  const min = 3;
  const canContinue = selected.length >= min;

  return (
    <OnboardingShell
      step={step} totalSteps={totalSteps} onBack={onBack}
      eyebrow="01 · Domains"
      title="What captures your imagination?"
      hint={`Pick at least ${min} worlds you want to build in. (${selected.length} selected)`}
      footer={<PrimaryButton onClick={() => onContinue(selected)} disabled={!canContinue}>
        Continue <ArrowRight size={17} strokeWidth={2.5}/>
      </PrimaryButton>}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
        {DOMAINS.map((d, i) => {
          const isSelected = selected.includes(d.id);
          return (
            <motion.button
              key={d.id}
              onClick={() => toggle(d.id)}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 14px',
                background: isSelected ? tokens.accentSoft : tokens.surface,
                border: `1px solid ${isSelected ? 'rgba(61, 184, 122, 0.4)' : tokens.border}`,
                borderRadius: 100,
                cursor: 'pointer',
                color: isSelected ? tokens.accent : tokens.text,
                fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
                transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <d.Icon size={13} strokeWidth={isSelected ? 2 : 1.5}/>
              {d.label}
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

// ============================================
// ONBOARDING — AUDIENCE
// ============================================
function AudienceScreen({ initial, onContinue, onBack, step = 2, totalSteps = 5 }) {
  const [selected, setSelected] = useState(initial || null);

  return (
    <OnboardingShell
      step={step} totalSteps={totalSteps} onBack={onBack}
      eyebrow="02 · Audience"
      title="Who do you want to serve?"
      hint="There's a customer behind every great product."
      footer={<PrimaryButton onClick={() => onContinue(selected)} disabled={!selected}>
        Continue <ArrowRight size={17} strokeWidth={2.5}/>
      </PrimaryButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {AUDIENCES.map((a, i) => {
          const isSelected = selected === a.id;
          return (
            <motion.button
              key={a.id}
              onClick={() => setSelected(a.id)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              style={{
                padding: '18px 20px',
                background: isSelected ? tokens.accentSoft : tokens.surface,
                border: `1px solid ${isSelected ? 'rgba(61, 184, 122, 0.4)' : tokens.border}`,
                borderRadius: 18, cursor: 'pointer', textAlign: 'left',
                position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: tokens.serif, fontSize: 19, color: tokens.text, fontWeight: 400, letterSpacing: '-0.01em' }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 4 }}>{a.sub}</div>
                </div>
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                      style={{ width: 22, height: 22, borderRadius: 11, background: tokens.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Check size={12} color="#000" strokeWidth={3}/>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

// ============================================
// ONBOARDING — COMMITMENT
// ============================================
function CommitmentScreen({ initial, onContinue, onBack, step = 3, totalSteps = 5 }) {
  const [selected, setSelected] = useState(initial || null);

  return (
    <OnboardingShell
      step={step} totalSteps={totalSteps} onBack={onBack}
      eyebrow="03 · Commitment"
      title="How serious is this?"
      hint="We match opportunities to your level."
      footer={<PrimaryButton onClick={() => onContinue(selected)} disabled={!selected}>
        Continue <ArrowRight size={17} strokeWidth={2.5}/>
      </PrimaryButton>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {COMMITMENTS.map((c, i) => {
          const isSelected = selected === c.id;
          return (
            <motion.button
              key={c.id}
              onClick={() => setSelected(c.id)}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '18px 20px',
                background: isSelected ? tokens.accentSoft : tokens.surface,
                border: `1px solid ${isSelected ? 'rgba(61, 184, 122, 0.4)' : tokens.border}`,
                borderRadius: 18, cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: isSelected ? 'rgba(61, 184, 122, 0.2)' : tokens.surfaceElevated,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <c.Icon size={20} color={isSelected ? tokens.accent : tokens.text} strokeWidth={1.5}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: tokens.serif, fontSize: 19, color: tokens.text, fontWeight: 400, letterSpacing: '-0.01em' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 2 }}>{c.sub}</div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </OnboardingShell>
  );
}

// ============================================
// ONBOARDING — ADVANTAGE
// ============================================
function AdvantageScreen({ initial = '', onContinue, onBack, step = 4, totalSteps = 5 }) {
  const [text, setText] = useState(initial);
  const [phIdx, setPhIdx] = useState(0);
  
  useEffect(() => {
    const t = setInterval(() => setPhIdx(i => (i + 1) % ADVANTAGE_PLACEHOLDERS.length), 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <OnboardingShell
      step={step} totalSteps={totalSteps} onBack={onBack}
      eyebrow="04 · Advantage"
      title="What's your edge?"
      hint="The thing that makes you uniquely suited for this."
      footer={<PrimaryButton onClick={() => onContinue(text)} disabled={!text.trim()}>
        Continue <ArrowRight size={17} strokeWidth={2.5}/>
      </PrimaryButton>}
    >
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            flex: 1, minHeight: 200,
            background: tokens.surface, border: `1px solid ${tokens.border}`,
            borderRadius: 18, padding: 18,
            color: tokens.text, fontSize: 16, lineHeight: 1.5,
            fontFamily: tokens.sans, resize: 'none', outline: 'none',
          }}
          placeholder=""
        />
        {!text && (
          <div style={{ position: 'absolute', top: 18, left: 18, right: 18, pointerEvents: 'none', overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={phIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5 }}
                style={{
                  fontSize: 16, color: tokens.textTertiary,
                  fontStyle: 'italic', fontFamily: tokens.serif, lineHeight: 1.5,
                }}
              >
                {ADVANTAGE_PLACEHOLDERS[phIdx]}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </OnboardingShell>
  );
}

// ============================================
// ONBOARDING — PERSONALIZING (THE WOW MOMENT)
// ============================================
function PersonalizingScreen({ profile, onComplete }) {
  const [phase, setPhase] = useState(0); // 0: tokens float, 1: lines connect, 2: pulse, 3: reveal
  
  // Build all the "tokens" representing user choices
  const tokens_data = [
    profile.capability && { type: 'cap', label: CAPABILITIES.find(c => c.id === profile.capability)?.label, color: tokens.accent },
    ...(profile.domains || []).slice(0, 4).map(id => ({ type: 'dom', label: DOMAINS.find(d => d.id === id)?.label, color: tokens.gold })),
    profile.audience && { type: 'aud', label: AUDIENCES.find(a => a.id === profile.audience)?.label, color: tokens.accent },
    profile.commitment && { type: 'com', label: COMMITMENTS.find(c => c.id === profile.commitment)?.label, color: tokens.gold },
  ].filter(Boolean);

  // Pre-compute positions in a circle
  const positions = tokens_data.map((_, i) => {
    const angle = (i / tokens_data.length) * Math.PI * 2 - Math.PI / 2;
    const radius = 120;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1400);
    const t2 = setTimeout(() => setPhase(2), 2400);
    const t3 = setTimeout(() => setPhase(3), 3600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{ height: '100%', background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Ambient gradient */}
      <motion.div
        animate={{ opacity: phase >= 2 ? 1 : 0.3 }}
        transition={{ duration: 1 }}
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.18) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* Constellation container */}
      <div style={{ position: 'relative', width: 320, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Center pulse */}
        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: tokens.gold }}
              />
              <motion.div
                animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: tokens.gold }}
              />
              <div style={{
                width: 14, height: 14, borderRadius: '50%',
                background: tokens.gold,
                boxShadow: `0 0 30px ${tokens.gold}, 0 0 60px ${tokens.gold}`,
                position: 'relative', zIndex: 2,
              }}/>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connecting lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {positions.map((pos, i) => (
            <motion.line
              key={i}
              x1="50%" y1="50%"
              x2={`calc(50% + ${pos.x}px)`} y2={`calc(50% + ${pos.y}px)`}
              stroke={tokens.gold}
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: phase >= 1 ? 1 : 0, opacity: phase >= 1 ? 0.3 : 0 }}
              transition={{ duration: 1, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              style={{ filter: phase >= 2 ? `drop-shadow(0 0 4px ${tokens.gold})` : 'none' }}
            />
          ))}
        </svg>

        {/* Floating tokens */}
        {tokens_data.map((token, i) => {
          const pos = positions[i];
          return (
            <motion.div
              key={i}
              initial={{ 
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 200,
                opacity: 0,
                scale: 0.5,
              }}
              animate={{ 
                x: pos.x,
                y: pos.y,
                opacity: 1,
                scale: 1,
              }}
              transition={{ 
                duration: 1.2,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{
                position: 'absolute',
                padding: '6px 12px',
                background: 'rgba(20, 20, 24, 0.85)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `1px solid ${token.color}40`,
                borderRadius: 100,
                color: tokens.text,
                fontSize: 11,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                letterSpacing: '-0.01em',
                boxShadow: phase >= 2 ? `0 0 16px ${token.color}30` : 'none',
                transition: 'box-shadow 0.6s',
              }}
            >
              {token.label}
            </motion.div>
          );
        })}
      </div>

      {/* Status text */}
      <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center', padding: '0 32px' }}>
        <AnimatePresence mode="wait">
          {phase < 3 ? (
            <motion.div
              key="building"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div style={{ fontFamily: tokens.serif, fontSize: 18, color: tokens.text, fontStyle: 'italic', letterSpacing: '-0.01em' }}>
                Building your taste profile…
              </div>
              <div style={{ fontSize: 13, color: tokens.textTertiary, marginTop: 6 }}>
                {phase === 0 && 'Reading signals'}
                {phase === 1 && 'Connecting patterns'}
                {phase === 2 && 'Calibrating taste'}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div style={{ fontFamily: tokens.serif, fontSize: 26, color: tokens.text, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8 }}>
                Twelve opportunities,<br/>curated for you.
              </div>
              <div style={{ fontSize: 14, color: tokens.textSecondary, fontStyle: 'italic', fontFamily: tokens.serif }}>
                Refreshed every Monday morning.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* CTA */}
      <AnimatePresence>
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{ position: 'absolute', bottom: 36, left: 24, right: 24 }}
          >
            <motion.button
              onClick={onComplete}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%', padding: '17px',
                background: tokens.gold, color: '#1a1a1a',
                border: 'none', borderRadius: 18,
                fontSize: 16, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: 'pointer', letterSpacing: '-0.01em',
              }}
            >
              See your opportunities
              <ArrowRight size={17} strokeWidth={2.5}/>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// TODAY (HOME) SCREEN
// ============================================
function TodayScreen({ onOpenOpportunity, profile }) {
  const opp = OPPORTUNITIES[0];
  const firstDomain = profile?.domains?.[0] ? DOMAINS.find(d => d.id === profile.domains[0])?.label : null;

  return (
    <div style={{ height: '100%', overflow: 'auto', position: 'relative' }}>
      <div style={{ padding: '64px 24px 100px' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div style={{ fontSize: 12, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>
            Tuesday · April 28
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          style={{ fontFamily: tokens.serif, fontSize: 38, color: tokens.text, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 6 }}
        >
          Today's pulse.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          style={{ fontSize: 14, color: tokens.textSecondary, marginTop: 8, lineHeight: 1.5 }}
        >
          {firstDomain ? `Tuned to ${firstDomain.toLowerCase()} and three other domains you picked.` : 'One opportunity worth your attention.'}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          onClick={onOpenOpportunity} whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${tokens.surfaceElevated} 0%, ${tokens.surface} 100%)`,
            border: `1px solid ${tokens.border}`, borderRadius: 24,
            padding: 22, marginTop: 28, cursor: 'pointer',
            textAlign: 'left', position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle at 100% 0%, rgba(212, 165, 116, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }}/>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: tokens.goldSoft, borderRadius: 100, fontSize: 11, color: tokens.gold, fontWeight: 500, letterSpacing: '0.04em' }}>
              <Sparkles size={11} strokeWidth={2}/> Featured
            </div>
            <ConfidenceDots count={opp.confidence}/>
          </div>

          <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 8 }}>
            {opp.category}
          </div>
          <h2 style={{ fontFamily: tokens.serif, fontSize: 26, color: tokens.text, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 14 }}>
            {opp.title}
          </h2>
          <p style={{ fontSize: 14, color: tokens.textSecondary, lineHeight: 1.55, marginBottom: 20 }}>
            {opp.gap}
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: `1px solid ${tokens.border}` }}>
            <PresenceDots count={opp.builders}/>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: tokens.text, fontSize: 13, fontWeight: 500 }}>
              Explore <ArrowRight size={14} strokeWidth={2}/>
            </div>
          </div>
        </motion.button>

        <div style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>
              Also for you
            </div>
            <div style={{ fontSize: 12, color: tokens.textSecondary }}>3 more</div>
          </div>

          {OPPORTUNITIES.slice(1).map((o, i) => (
            <motion.button
              key={o.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%', background: tokens.surface, border: `1px solid ${tokens.border}`,
                borderRadius: 18, padding: 16, marginBottom: 8,
                textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, marginBottom: 4 }}>
                  {o.category}
                </div>
                <div style={{ fontFamily: tokens.serif, fontSize: 17, color: tokens.text, fontWeight: 400, letterSpacing: '-0.01em' }}>
                  {o.title}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <ConfidenceDots count={o.confidence} small/>
                  <div style={{ fontSize: 12, color: tokens.textSecondary }}>{o.builders} exploring</div>
                </div>
              </div>
              <ChevronRight size={16} color={tokens.textSecondary} strokeWidth={2}/>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfidenceDots({ count, small }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: small ? 4 : 5, height: small ? 4 : 5, borderRadius: '50%',
          background: i <= count ? tokens.gold : tokens.borderStrong,
        }}/>
      ))}
    </div>
  );
}

function PresenceDots({ count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 36, height: 12 }}>
        {[0,1,2].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1, 0.9] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4, ease: 'easeInOut' }}
            style={{ position: 'absolute', left: i * 11, top: 1, width: 10, height: 10, borderRadius: '50%', background: tokens.accent, border: `2px solid ${tokens.surface}` }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, color: tokens.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
        {count} exploring now
      </div>
    </div>
  );
}

// ============================================
// OPPORTUNITY DETAIL
// ============================================
function OpportunityScreen({ onBack, onStartLens }) {
  const opp = OPPORTUNITIES[0];
  const [scrollY, setScrollY] = useState(0);

  return (
    <div style={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <motion.div
        animate={{ opacity: scrollY > 100 ? 1 : 0 }}
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 90,
          background: 'rgba(10, 10, 12, 0.8)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          zIndex: 20, display: 'flex', alignItems: 'flex-end', padding: '0 20px 14px',
          pointerEvents: scrollY > 100 ? 'auto' : 'none',
          borderBottom: `1px solid ${tokens.border}`,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: tokens.text, letterSpacing: '-0.01em', flex: 1, textAlign: 'center' }}>Opportunity</div>
      </motion.div>

      <button onClick={onBack} style={{
        position: 'absolute', top: 60, left: 16, width: 36, height: 36, borderRadius: 18,
        background: 'rgba(28, 28, 34, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 30,
      }}>
        <ArrowLeft size={16} color={tokens.text} strokeWidth={2}/>
      </button>
      <button style={{
        position: 'absolute', top: 60, right: 16, width: 36, height: 36, borderRadius: 18,
        background: 'rgba(28, 28, 34, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 30,
      }}>
        <Bookmark size={15} color={tokens.text} strokeWidth={2}/>
      </button>

      <div onScroll={(e) => setScrollY(e.target.scrollTop)} style={{ flex: 1, overflow: 'auto', paddingBottom: 110 }}>
        <div style={{ height: 320, background: `radial-gradient(circle at 30% 30%, rgba(212, 165, 116, 0.18) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(61, 184, 122, 0.12) 0%, transparent 60%), ${tokens.bg}`, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: '0 24px 28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ padding: '4px 10px', background: 'rgba(245, 242, 237, 0.08)', border: `1px solid ${tokens.border}`, borderRadius: 100, fontSize: 11, color: tokens.text, letterSpacing: '0.04em', fontWeight: 500 }}>
                {opp.category}
              </div>
              <ConfidenceDots count={opp.confidence}/>
            </div>
            <h1 style={{ fontFamily: tokens.serif, fontSize: 36, color: tokens.text, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{opp.title}</h1>
          </div>
        </div>

        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <PresenceDots count={opp.builders}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: tokens.textSecondary, fontSize: 12 }}>
            <Activity size={12} strokeWidth={2}/> Live
          </div>
        </div>

        <div style={{ padding: '4px 24px' }}>
          <ContentSection label="The Gap" content={opp.gap}/>
          <ContentSection label="The Signal" content={opp.signal}/>
          <ContentSection label="The Wedge" content={opp.wedge}/>
          <ContentSection label="Example Customer" content={opp.customer} italic/>
          <ContentSection label="Why Now" content={opp.why_now}/>
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 24px 30px',
        background: `linear-gradient(to top, ${tokens.bg} 0%, ${tokens.bg} 60%, rgba(10,10,12,0) 100%)`,
        zIndex: 20,
      }}>
        <PrimaryButton onClick={onStartLens}>
          Evaluate this opportunity <ArrowRight size={17} strokeWidth={2.5}/>
        </PrimaryButton>
      </div>
    </div>
  );
}

function ContentSection({ label, content, italic }) {
  return (
    <div style={{ padding: '24px 0', borderBottom: `1px solid ${tokens.border}` }}>
      <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, color: tokens.text, lineHeight: 1.6, fontStyle: italic ? 'italic' : 'normal', fontFamily: italic ? tokens.serif : tokens.sans, whiteSpace: 'pre-line' }}>
        {content}
      </div>
    </div>
  );
}

// ============================================
// LENS WIZARD
// ============================================
function LensScreen({ onComplete, onBack }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(['', '', '', '', '']);
  const current = LENS_QUESTIONS[step];

  const handleNext = () => {
    if (step === 4) onComplete(answers);
    else setStep(step + 1);
  };

  const progress = ((step + (answers[step] ? 0.5 : 0)) / 5) * 100;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '60px 24px 24px', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <button onClick={() => step === 0 ? onBack() : setStep(step - 1)} style={{ width: 36, height: 36, borderRadius: 18, background: tokens.surface, border: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {step === 0 ? <X size={16} color={tokens.text} strokeWidth={2}/> : <ArrowLeft size={16} color={tokens.text} strokeWidth={2}/>}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="32" height="32" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="16" cy="16" r="13" stroke={tokens.border} strokeWidth="2" fill="none"/>
            <motion.circle cx="16" cy="16" r="13" stroke={tokens.accent} strokeWidth="2" fill="none" strokeLinecap="round"
              animate={{ strokeDasharray: `${progress * 0.81} 200` }} transition={{ duration: 0.6 }}/>
          </svg>
          <div style={{ fontSize: 13, color: tokens.textSecondary, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
            {step + 1}<span style={{ opacity: 0.4 }}> / 5</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
          <div style={{ fontSize: 11, color: tokens.gold, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500, marginBottom: 14 }}>
            Step {current.num} · {current.label}
          </div>
          <h1 style={{ fontFamily: tokens.serif, fontSize: 30, color: tokens.text, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 10 }}>
            {current.q}
          </h1>
          <div style={{ fontSize: 14, color: tokens.textSecondary, fontStyle: 'italic', lineHeight: 1.5 }}>{current.hint}</div>
        </motion.div>
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: 28 }}>
        <textarea
          key={step} autoFocus value={answers[step]}
          onChange={(e) => { const a = [...answers]; a[step] = e.target.value; setAnswers(a); }}
          placeholder="Type your answer..."
          style={{ flex: 1, background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 18, padding: 18, color: tokens.text, fontSize: 16, lineHeight: 1.5, fontFamily: tokens.sans, resize: 'none', outline: 'none', maxHeight: 280 }}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <PrimaryButton onClick={handleNext} disabled={!answers[step].trim()}>
          {step === 4 ? <>Complete evaluation <Check size={17} strokeWidth={2.5}/></> : <>Continue <ArrowRight size={17} strokeWidth={2.5}/></>}
        </PrimaryButton>
      </div>
    </div>
  );
}

// ============================================
// CEREMONY (THE WOW MOMENT)
// ============================================
function CeremonyScreen({ answers, onComplete }) {
  const [phase, setPhase] = useState(0);
  const [signed, setSigned] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1800);
    const t2 = setTimeout(() => setPhase(2), 3400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const startHold = () => {
    const start = Date.now();
    holdRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / 1500, 1);
      setHoldProgress(p);
      if (p >= 1) {
        clearInterval(holdRef.current);
        setSigned(true);
        setPhase(3);
        setTimeout(() => setPhase(4), 2000);
      }
    }, 16);
  };
  const cancelHold = () => { if (!signed) { clearInterval(holdRef.current); setHoldProgress(0); } };

  return (
    <div style={{ height: '100%', background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(212, 165, 116, 0.08) 0%, transparent 60%)', pointerEvents: 'none' }}/>

      <AnimatePresence>
        {phase === 0 && (
          <motion.div exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {LENS_QUESTIONS.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 100, rotate: 0, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, rotate: (i - 2) * 6, x: (i - 2) * 14, scale: 1 }}
                transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', width: 220, height: 290, background: tokens.surfaceElevated, border: `1px solid ${tokens.borderStrong}`, borderRadius: 16, padding: 18, boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,165,116,0.05)', zIndex: i }}
              >
                <div style={{ fontSize: 10, color: tokens.gold, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500, marginBottom: 10 }}>Step {q.num} · {q.label}</div>
                <div style={{ fontFamily: tokens.serif, fontSize: 14, color: tokens.text, lineHeight: 1.4, fontStyle: 'italic', marginBottom: 12 }}>{q.q}</div>
                <div style={{ fontSize: 12, color: tokens.textSecondary, lineHeight: 1.5 }}>{answers[i] || '—'}</div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: 320, background: '#FAF7F0', borderRadius: 4, padding: '32px 28px', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,165,116,0.2)', position: 'relative', fontFamily: tokens.serif }}
          >
            <div style={{ textAlign: 'center', borderBottom: '1px solid #d4cdb8', paddingBottom: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 9, color: '#8B7E5C', textTransform: 'uppercase', letterSpacing: '0.3em', fontWeight: 500, marginBottom: 4 }}>Builder's Covenant</div>
              <div style={{ fontSize: 24, color: '#1a1a1a', fontWeight: 400, letterSpacing: '-0.02em' }}>AOS</div>
              <div style={{ fontSize: 10, color: '#8B7E5C', fontStyle: 'italic', marginTop: 2 }}>Issued April 28, 2026</div>
            </div>
            <div style={{ fontSize: 12, color: '#3a3a3a', lineHeight: 1.5, fontStyle: 'italic', textAlign: 'center', marginBottom: 16 }}>
              I commit, with full intention, to the following work for thirty days.
            </div>
            <div style={{ background: 'rgba(212, 165, 116, 0.08)', padding: 14, borderRadius: 4, marginBottom: 18, border: '1px solid rgba(212, 165, 116, 0.2)' }}>
              <div style={{ fontSize: 10, color: '#8B7E5C', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 4 }}>The Build</div>
              <div style={{ fontSize: 14, color: '#1a1a1a', fontWeight: 500, letterSpacing: '-0.01em' }}>Notion Template Analytics</div>
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={{ borderBottom: signed ? '1px solid #1a1a1a' : '1px dashed #b8a878', height: 50, position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                <AnimatePresence>
                  {signed && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ paddingBottom: 6, position: 'relative' }}>
                      <svg width="160" height="40" viewBox="0 0 160 40" style={{ overflow: 'visible' }}>
                        <motion.path d="M 8 28 Q 18 8, 32 24 T 60 22 Q 75 14, 90 26 T 130 20 L 152 18" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }}/>
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div style={{ fontSize: 10, color: '#8B7E5C', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500, marginTop: 6, fontFamily: tokens.sans }}>Builder's Signature</div>
            </div>

            <AnimatePresence>
              {phase >= 3 && (
                <motion.div
                  initial={{ scale: 0, rotate: -180, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.8, ease: [0.22, 1.5, 0.36, 1] }}
                  style={{ position: 'absolute', bottom: 32, right: 22, width: 64, height: 64, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #E0B884 0%, #B8915C 50%, #8B6F3E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 -4px 8px rgba(0,0,0,0.2), inset 0 4px 8px rgba(255,255,255,0.2)' }}
                >
                  <div style={{ fontFamily: tokens.serif, fontSize: 24, color: '#5C4220', fontWeight: 400, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>A</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 2 && !signed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{ position: 'absolute', bottom: 60, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
          >
            <div style={{ fontSize: 12, color: tokens.textSecondary, fontStyle: 'italic', fontFamily: tokens.serif }}>
              Press and hold to sign your covenant
            </div>
            <motion.button
              onMouseDown={startHold} onMouseUp={cancelHold} onMouseLeave={cancelHold}
              onTouchStart={startHold} onTouchEnd={cancelHold} whileTap={{ scale: 0.98 }}
              style={{ width: 240, height: 54, borderRadius: 27, background: tokens.gold, border: 'none', color: '#1a1a1a', fontSize: 15, fontWeight: 600, position: 'relative', overflow: 'hidden', cursor: 'pointer', letterSpacing: '-0.01em' }}
            >
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${holdProgress * 100}%`, background: 'rgba(255, 255, 255, 0.25)', transition: 'width 0.05s linear' }}/>
              <span style={{ position: 'relative', zIndex: 1 }}>Hold to commit</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === 4 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}
          >
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.6, ease: [0.22, 1.5, 0.36, 1] }}
              style={{ width: 72, height: 72, borderRadius: '50%', background: tokens.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 0 60px rgba(212, 165, 116, 0.4)' }}
            >
              <Check size={36} color="#1a1a1a" strokeWidth={2.5}/>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontFamily: tokens.serif, fontSize: 32, color: tokens.text, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8 }}>It is done.</div>
              <div style={{ fontSize: 14, color: tokens.textSecondary, fontStyle: 'italic', fontFamily: tokens.serif, lineHeight: 1.5, maxWidth: 280 }}>
                Your sprint begins now. Thirty days. One commitment. Build with conviction.
              </div>
            </motion.div>
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }}
              onClick={onComplete} whileTap={{ scale: 0.97 }}
              style={{ padding: '14px 32px', background: tokens.text, color: tokens.bg, border: 'none', borderRadius: 100, fontSize: 15, fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em' }}
            >
              Begin sprint
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// SPRINT
// ============================================
function SprintScreen() {
  const today = 3;
  const days = Array.from({length: 30}, (_, i) => i + 1);

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '64px 24px 100px' }}>
        <div style={{ fontSize: 12, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>Sprint · Day {today} of 30</div>
        <h1 style={{ fontFamily: tokens.serif, fontSize: 38, color: tokens.text, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 6 }}>Notion Analytics.</h1>

        <div style={{ marginTop: 32, padding: 24, background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 24, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 50%, rgba(61, 184, 122, 0.08) 0%, transparent 60%)', pointerEvents: 'none' }}/>
          <svg width="100%" height="180" viewBox="0 0 320 180" style={{ position: 'relative' }}>
            <path
              d={Array.from({length: 30}).map((_, i) => {
                const x = 12 + (i % 10) * 30;
                const y = 30 + Math.floor(i / 10) * 60;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              stroke={tokens.border} strokeWidth="1" fill="none" strokeDasharray="2 4"
            />
            {days.map((day, i) => {
              const x = 12 + (i % 10) * 30;
              const y = 30 + Math.floor(i / 10) * 60;
              const isToday = day === today;
              const isPast = day < today;
              return (
                <g key={day}>
                  {isToday && <motion.circle cx={x} cy={y} r="14" fill={tokens.accent} opacity="0.2" animate={{ r: [14, 18, 14], opacity: [0.2, 0.05, 0.2] }} transition={{ duration: 2, repeat: Infinity }}/>}
                  <circle cx={x} cy={y} r={isToday ? 5 : 3.5} fill={isToday ? tokens.accent : isPast ? tokens.gold : tokens.borderStrong}/>
                  {(day === 1 || day === 7 || day === 14 || day === 21 || day === 30) && (
                    <text x={x} y={y + 18} fontSize="9" fill={tokens.textTertiary} textAnchor="middle" fontFamily={tokens.sans}>{day}</text>
                  )}
                </g>
              );
            })}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 16, borderTop: `1px solid ${tokens.border}` }}>
            <Stat label="Days in" value={today}/>
            <Stat label="Check-ins" value="0/4"/>
            <Stat label="Streak" value="3"/>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={{ marginTop: 16, padding: 20, background: `linear-gradient(135deg, ${tokens.goldSoft} 0%, ${tokens.surface} 70%)`, border: `1px solid rgba(212, 165, 116, 0.2)`, borderRadius: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={13} color={tokens.gold} strokeWidth={2}/>
            <div style={{ fontSize: 11, color: tokens.gold, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500 }}>Week 1 check-in due</div>
          </div>
          <div style={{ fontFamily: tokens.serif, fontSize: 19, color: tokens.text, fontWeight: 400, letterSpacing: '-0.01em', lineHeight: 1.3, marginBottom: 14 }}>
            What did you ship or learn this week?
          </div>
          <button style={{ padding: '10px 18px', background: tokens.gold, color: '#1a1a1a', border: 'none', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Log update</button>
        </motion.div>

        <div style={{ marginTop: 16, padding: 18, background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 18 }}>
          <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 10 }}>Your Covenant</div>
          <div style={{ fontFamily: tokens.serif, fontSize: 14, color: tokens.text, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 12 }}>
            "I commit to building Notion Template Analytics for thirty days, with full intention, beginning April 28."
          </div>
          <button style={{ background: 'transparent', border: 'none', color: tokens.accent, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
            View full document <ChevronRight size={13} strokeWidth={2}/>
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, color: tokens.text, fontWeight: 500, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

// ============================================
// PROFILE
// ============================================
function ProfileScreen({ profile, onOpenPreferences }) {
  const cap = CAPABILITIES.find(c => c.id === profile.capability);
  
  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ padding: '64px 24px 100px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 500 }}>Builder</div>
            <h1 style={{ fontFamily: tokens.serif, fontSize: 38, color: tokens.text, fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.05, marginTop: 6 }}>Josh.</h1>
          </div>
          <button onClick={onOpenPreferences} style={{
            width: 36, height: 36, borderRadius: 18, marginTop: 28,
            background: tokens.surface, border: `1px solid ${tokens.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <Settings size={16} color={tokens.text} strokeWidth={1.8}/>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginTop: 28, padding: 24, background: `linear-gradient(135deg, ${tokens.surfaceElevated} 0%, ${tokens.surface} 100%)`, border: `1px solid ${tokens.border}`, borderRadius: 24, position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212, 165, 116, 0.15) 0%, transparent 70%)' }}/>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: `linear-gradient(135deg, ${tokens.gold} 0%, #B8915C 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontFamily: tokens.serif, fontSize: 24, color: '#1a1a1a', fontWeight: 400 }}>J</div>
            <div style={{ fontFamily: tokens.serif, fontSize: 22, color: tokens.text, fontWeight: 400, letterSpacing: '-0.02em' }}>{cap?.label || 'Software'} Builder</div>
            <div style={{ fontSize: 13, color: tokens.textSecondary, marginTop: 2, fontStyle: 'italic', fontFamily: tokens.serif }}>
              "{profile.advantage || 'I ship fast and know AI systems.'}"
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: `1px solid ${tokens.border}` }}>
              <Stat label="Sprints" value="2"/>
              <Stat label="Shipped" value="1"/>
              <Stat label="Streak" value="3w"/>
            </div>
          </div>
        </motion.div>

        {/* Quick taste profile */}
        <button
          onClick={onOpenPreferences}
          style={{
            width: '100%', marginTop: 16, padding: 18,
            background: tokens.surface, border: `1px solid ${tokens.border}`,
            borderRadius: 18, cursor: 'pointer', textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500 }}>Your taste profile</div>
            <Edit3 size={13} color={tokens.textSecondary} strokeWidth={2}/>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(profile.domains || []).slice(0, 4).map(id => {
              const d = DOMAINS.find(x => x.id === id);
              if (!d) return null;
              return (
                <div key={id} style={{ padding: '5px 11px', background: tokens.surfaceElevated, border: `1px solid ${tokens.border}`, borderRadius: 100, fontSize: 11, color: tokens.text, fontWeight: 500 }}>
                  {d.label}
                </div>
              );
            })}
            {profile.domains && profile.domains.length > 4 && (
              <div style={{ padding: '5px 11px', background: tokens.surfaceElevated, border: `1px solid ${tokens.border}`, borderRadius: 100, fontSize: 11, color: tokens.textSecondary, fontWeight: 500 }}>
                +{profile.domains.length - 4}
              </div>
            )}
          </div>
        </button>

        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500, marginBottom: 14 }}>Past ships</div>
          <div style={{ padding: 16, background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 16, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: tokens.serif, fontSize: 16, color: tokens.text, fontWeight: 400, letterSpacing: '-0.01em' }}>Tonight</div>
                <div style={{ fontSize: 12, color: tokens.textSecondary, marginTop: 2 }}>Shipped Feb 2026 · MVP launched</div>
              </div>
              <Check size={14} color={tokens.accent} strokeWidth={2.5}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PREFERENCES
// ============================================
function PreferencesScreen({ profile, onUpdate, onBack, onEditField }) {
  const cap = CAPABILITIES.find(c => c.id === profile.capability);
  const aud = AUDIENCES.find(a => a.id === profile.audience);
  const com = COMMITMENTS.find(c => c.id === profile.commitment);
  const [notifications, setNotifications] = useState({ pulse: true, weekly: true });

  return (
    <div style={{ height: '100%', overflow: 'auto', background: tokens.bg }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(10, 10, 12, 0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '60px 16px 14px', borderBottom: `1px solid ${tokens.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 18, background: tokens.surface, border: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={16} color={tokens.text} strokeWidth={2}/>
          </button>
          <div style={{ fontSize: 15, fontWeight: 600, color: tokens.text, letterSpacing: '-0.01em' }}>Preferences</div>
          <div style={{ width: 36 }}/>
        </div>
      </div>

      <div style={{ padding: '24px 20px 100px' }}>
        <div style={{ fontFamily: tokens.serif, fontSize: 26, color: tokens.text, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Your taste profile.
        </div>
        <div style={{ fontSize: 13, color: tokens.textSecondary, fontStyle: 'italic', fontFamily: tokens.serif, marginBottom: 28 }}>
          Tune what we send you. Updates take effect immediately.
        </div>

        {/* Section: Build profile */}
        <PrefSection label="Build profile">
          <PrefRow label="Capability" value={cap?.label} Icon={cap?.Icon} onPress={() => onEditField('capability')}/>
          <PrefRow label="Domains" value={`${(profile.domains || []).length} selected`} valueDetail={(profile.domains || []).slice(0,3).map(id => DOMAINS.find(d => d.id === id)?.label).filter(Boolean).join(' · ')} onPress={() => onEditField('domains')}/>
          <PrefRow label="Audience" value={aud?.label} onPress={() => onEditField('audience')}/>
          <PrefRow label="Commitment" value={com?.label} valueDetail={com?.sub.split(' · ')[0]} onPress={() => onEditField('commitment')} last/>
        </PrefSection>

        {/* Section: Identity */}
        <PrefSection label="Identity">
          <PrefRow label="Your edge" value={profile.advantage ? truncate(profile.advantage, 38) : 'Not set'} italic onPress={() => onEditField('advantage')} last/>
        </PrefSection>

        {/* Section: Notifications */}
        <PrefSection label="Notifications">
          <PrefToggle 
            label="Daily Pulse" 
            sub="One opportunity, every morning at 8am"
            value={notifications.pulse}
            onChange={(v) => setNotifications({...notifications, pulse: v})}
          />
          <PrefToggle 
            label="Weekly digest" 
            sub="Monday recap of new opportunities"
            value={notifications.weekly}
            onChange={(v) => setNotifications({...notifications, weekly: v})}
            last
          />
        </PrefSection>

        {/* Section: Account */}
        <PrefSection label="Account">
          <PrefRow label="Email" value="josh@example.com" onPress={() => {}} muted/>
          <PrefRow label="Sign out" valueColor={'#E47B7B'} onPress={() => {}} last/>
        </PrefSection>

        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontFamily: tokens.serif, fontSize: 12, color: tokens.textTertiary, fontStyle: 'italic' }}>
            AOS · Build with conviction.
          </div>
          <div style={{ fontSize: 11, color: tokens.textTertiary, marginTop: 4 }}>v0.1.0</div>
        </div>
      </div>
    </div>
  );
}

function truncate(s, n) { return s.length > n ? s.slice(0, n) + '…' : s; }

function PrefSection({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, color: tokens.textTertiary, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 500, marginBottom: 10, paddingLeft: 4 }}>
        {label}
      </div>
      <div style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 18, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function PrefRow({ label, value, valueDetail, valueColor, Icon, italic, muted, last, onPress }) {
  return (
    <motion.button
      whileTap={{ background: tokens.surfaceElevated }}
      onClick={onPress}
      style={{
        width: '100%', padding: '14px 18px',
        background: 'transparent', border: 'none',
        borderBottom: last ? 'none' : `1px solid ${tokens.border}`,
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: muted ? 'default' : 'pointer', textAlign: 'left',
      }}
    >
      {Icon && (
        <div style={{ width: 28, height: 28, borderRadius: 8, background: tokens.surfaceElevated, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={14} color={tokens.text} strokeWidth={1.5}/>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: tokens.text, fontWeight: 500, letterSpacing: '-0.01em' }}>{label}</div>
        {valueDetail && <div style={{ fontSize: 12, color: tokens.textTertiary, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{valueDetail}</div>}
      </div>
      {value && (
        <div style={{ fontSize: 13, color: valueColor || tokens.textSecondary, fontStyle: italic ? 'italic' : 'normal', fontFamily: italic ? tokens.serif : tokens.sans, flexShrink: 0, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      )}
      {!muted && <ChevronRight size={14} color={tokens.textTertiary} strokeWidth={2}/>}
    </motion.button>
  );
}

function PrefToggle({ label, sub, value, onChange, last }) {
  return (
    <div style={{
      width: '100%', padding: '14px 18px',
      borderBottom: last ? 'none' : `1px solid ${tokens.border}`,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: tokens.text, fontWeight: 500, letterSpacing: '-0.01em' }}>{label}</div>
        <div style={{ fontSize: 12, color: tokens.textTertiary, marginTop: 2 }}>{sub}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 50, height: 30, borderRadius: 15,
          background: value ? tokens.accent : tokens.surfaceElevated,
          border: 'none', cursor: 'pointer',
          padding: 2, transition: 'all 0.3s',
          display: 'flex', justifyContent: value ? 'flex-end' : 'flex-start',
        }}
      >
        <motion.div
          layout transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{ width: 26, height: 26, borderRadius: 13, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
        />
      </button>
    </div>
  );
}

// ============================================
// EDIT FIELD MODAL (reuses onboarding screens)
// ============================================
function EditField({ field, profile, onSave, onClose }) {
  switch (field) {
    case 'capability':
      return <WelcomeScreen initialCapability={profile.capability} onContinue={(v) => { onSave({ capability: v }); onClose(); }}/>;
    case 'domains':
      return <DomainsScreen initial={profile.domains} onContinue={(v) => { onSave({ domains: v }); onClose(); }} onBack={onClose} step={1} totalSteps={1}/>;
    case 'audience':
      return <AudienceScreen initial={profile.audience} onContinue={(v) => { onSave({ audience: v }); onClose(); }} onBack={onClose} step={1} totalSteps={1}/>;
    case 'commitment':
      return <CommitmentScreen initial={profile.commitment} onContinue={(v) => { onSave({ commitment: v }); onClose(); }} onBack={onClose} step={1} totalSteps={1}/>;
    case 'advantage':
      return <AdvantageScreen initial={profile.advantage} onContinue={(v) => { onSave({ advantage: v }); onClose(); }} onBack={onClose} step={1} totalSteps={1}/>;
    default:
      return null;
  }
}

// ============================================
// TAB BAR
// ============================================
function TabBar({ active, onChange }) {
  const tabs = [
    { id: 'today', label: 'Today', Icon: Compass },
    { id: 'sprint', label: 'Sprint', Icon: Target },
    { id: 'profile', label: 'You', Icon: User },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 28, paddingTop: 8,
      background: 'rgba(10, 10, 12, 0.85)',
      backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
      borderTop: `1px solid ${tokens.border}`,
      display: 'flex', justifyContent: 'space-around', zIndex: 50,
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)} style={{ background: 'transparent', border: 'none', padding: '8px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
            <tab.Icon size={22} color={isActive ? tokens.text : tokens.textTertiary} strokeWidth={isActive ? 2 : 1.5}/>
            <div style={{ fontSize: 10, color: isActive ? tokens.text : tokens.textTertiary, fontWeight: isActive ? 600 : 500, letterSpacing: '-0.01em' }}>
              {tab.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// MAIN APP
// ============================================
export default function App() {
  const [screen, setScreen] = useState('welcome');
  const [tab, setTab] = useState('today');
  const [lensAnswers, setLensAnswers] = useState([]);
  const [editField, setEditField] = useState(null);

  const [profile, setProfile] = useState({
    capability: null,
    domains: [],
    audience: null,
    commitment: null,
    advantage: '',
  });

  const updateProfile = (updates) => setProfile(p => ({ ...p, ...updates }));

  const handleLensComplete = (answers) => { setLensAnswers(answers); setScreen('ceremony'); };
  const handleCeremonyComplete = () => { setTab('sprint'); setScreen('main'); };

  const renderTabContent = () => {
    switch(tab) {
      case 'today': return <TodayScreen profile={profile} onOpenOpportunity={() => setScreen('opportunity')}/>;
      case 'sprint': return <SprintScreen/>;
      case 'profile': return <ProfileScreen profile={profile} onOpenPreferences={() => setScreen('preferences')}/>;
      default: return null;
    }
  };

  return (
    <PhoneFrame>
      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} style={{ height: '100%' }}>
            <WelcomeScreen
              initialCapability={profile.capability}
              onContinue={(cap) => { updateProfile({ capability: cap }); setScreen('domains'); }}
            />
          </motion.div>
        )}

        {screen === 'domains' && (
          <motion.div key="domains" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%' }}>
            <DomainsScreen
              initial={profile.domains}
              onContinue={(d) => { updateProfile({ domains: d }); setScreen('audience'); }}
              onBack={() => setScreen('welcome')}
              step={1} totalSteps={4}
            />
          </motion.div>
        )}

        {screen === 'audience' && (
          <motion.div key="audience" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }} style={{ height: '100%' }}>
            <AudienceScreen
              initial={profile.audience}
              onContinue={(a) => { updateProfile({ audience: a }); setScreen('commitment'); }}
              onBack={() => setScreen('domains')}
              step={2} totalSteps={4}
            />
          </motion.div>
        )}

        {screen === 'commitment' && (
          <motion.div key="commitment" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }} style={{ height: '100%' }}>
            <CommitmentScreen
              initial={profile.commitment}
              onContinue={(c) => { updateProfile({ commitment: c }); setScreen('advantage'); }}
              onBack={() => setScreen('audience')}
              step={3} totalSteps={4}
            />
          </motion.div>
        )}

        {screen === 'advantage' && (
          <motion.div key="advantage" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }} style={{ height: '100%' }}>
            <AdvantageScreen
              initial={profile.advantage}
              onContinue={(a) => { updateProfile({ advantage: a }); setScreen('personalizing'); }}
              onBack={() => setScreen('commitment')}
              step={4} totalSteps={4}
            />
          </motion.div>
        )}

        {screen === 'personalizing' && (
          <motion.div key="personalizing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} style={{ height: '100%' }}>
            <PersonalizingScreen profile={profile} onComplete={() => setScreen('main')}/>
          </motion.div>
        )}

        {screen === 'main' && (
          <motion.div key="main" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.5 }} style={{ height: '100%', position: 'relative' }}>
            {renderTabContent()}
            <TabBar active={tab} onChange={setTab}/>
          </motion.div>
        )}

        {screen === 'preferences' && (
          <motion.div key="preferences" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} transition={{ duration: 0.5 }} style={{ height: '100%' }}>
            <PreferencesScreen
              profile={profile}
              onUpdate={updateProfile}
              onBack={() => setScreen('main')}
              onEditField={setEditField}
            />
          </motion.div>
        )}

        {screen === 'opportunity' && (
          <motion.div key="opportunity" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.5 }} style={{ height: '100%' }}>
            <OpportunityScreen onBack={() => setScreen('main')} onStartLens={() => setScreen('lens')}/>
          </motion.div>
        )}

        {screen === 'lens' && (
          <motion.div key="lens" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }} style={{ height: '100%' }}>
            <LensScreen onComplete={handleLensComplete} onBack={() => setScreen('opportunity')}/>
          </motion.div>
        )}

        {screen === 'ceremony' && (
          <motion.div key="ceremony" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} style={{ height: '100%' }}>
            <CeremonyScreen answers={lensAnswers} onComplete={handleCeremonyComplete}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit field overlay */}
      <AnimatePresence>
        {editField && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: 'absolute', inset: 0,
              background: tokens.bg, zIndex: 100,
              borderRadius: 44, overflow: 'hidden',
            }}
          >
            <EditField
              field={editField}
              profile={profile}
              onSave={updateProfile}
              onClose={() => setEditField(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}
