// src/components/auth/RegisterPage.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, MailCheck, User, Mail, Lock, GraduationCap } from 'lucide-react';
import { authApi } from '@/api/client';

// Self-hosted campus video — place file at frontend/public/videos/bg.mp4
// Recommended: Pexels #7683332 "College Students Walking in the Campus"
const VIDEO_SOURCES = [
  '/videos/bg.mp4',
];

interface RegisterForm {
  full_name: string;
  email: string;
  password: string;
}

const inputBase: React.CSSProperties = {
  height: 42, width: '100%', borderRadius: 11,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none',
  fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 160ms ease, background-color 160ms ease',
};

export default function RegisterPage() {
  const [showPw,          setShowPw]          = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [registered,      setRegistered]      = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [videoLoaded,     setVideoLoaded]     = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [form, setForm] = useState<RegisterForm>({ full_name: '', email: '', password: '' });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let idx = 0;
    const tryNext = () => {
      if (idx >= VIDEO_SOURCES.length) return;
      v.src = VIDEO_SOURCES[idx];
      v.load();
      idx++;
    };
    v.addEventListener('error', tryNext);
    tryNext();
    return () => v.removeEventListener('error', tryNext);
  }, []);

  const btnShadow = [
    '0 1px 0 rgba(255,255,255,0.18) inset',
    '0 10px 20px -4px rgba(37,99,235,0.45)',
    '0 2px 4px rgba(37,99,235,0.20)',
  ].join(', ');

  const set = (field: keyof RegisterForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.register(form);
      setRegisteredEmail(form.email.trim());
      setRegistered(true);
    } catch (err: unknown) {
      const resData = (err as {
        response?: { data?: { error?: string; details?: Array<{ message?: string }> } };
      })?.response?.data;
      const detail = resData?.details?.find((d) => d.message)?.message;
      setError(detail || resData?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 520px',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ── CINEMATIC VIDEO BACKGROUND ── */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        onCanPlay={() => setVideoLoaded(true)}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 50%',
          zIndex: 0,
          opacity: videoLoaded ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* Fallback gradient while video loads */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 50%, #0a0f1e 100%)',
        opacity: videoLoaded ? 0 : 1,
        transition: 'opacity 1.2s ease',
      }} />

      {/* Cinematic dark overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'rgba(0,0,0,0.42)',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        pointerEvents: 'none',
      }} />

      {/* LEFT hero */}
      <div
        style={{ position: 'relative', zIndex: 2 }}
        className="hidden md:block"
      >
        <div style={{
          height: '100%', padding: 48,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.20) inset, 0 8px 20px -4px rgba(0,0,0,0.40)',
            }}>
              <GraduationCap size={26} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>SAMS</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)' }}>Student Admission Management</div>
            </div>
          </div>

          {/* Hero text */}
          <div style={{ maxWidth: 560, paddingBottom: 40 }} className="fade-up">
            <h1 style={{
              margin: 0,
              fontSize: 64, fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.045em',
              color: '#fff',
              textShadow: '0 2px 20px rgba(0,0,0,0.50)',
            }}>
              Join the team
              <br />
              shaping student{' '}
              <span style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f0abfc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>futures.</span>
            </h1>
            <p style={{
              marginTop: 20, maxWidth: 480, fontSize: 16, fontWeight: 400,
              lineHeight: 1.55, color: 'rgba(255,255,255,0.82)',
              letterSpacing: '-0.005em',
              textShadow: '0 1px 8px rgba(0,0,0,0.40)',
            }}>
              Create your account to start managing applications,
              <br />
              tracking progress, and supporting students on their journey.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT form panel */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
      }}>
        {/* Subtle top glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.10), transparent 55%)',
          pointerEvents: 'none',
        }} />

        {/* Glass card */}
        <div
          className="fade-up"
          style={{
            position: 'relative', width: '100%', maxWidth: 380,
            padding: '34px 36px', borderRadius: 20,
            background: 'transparent',
            border: 'none',
          }}
        >
          {registered ? (
            /* Success state */
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              textAlign: 'center', gap: 16, padding: '12px 0',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#4ade80',
              }}>
                <MailCheck size={28} />
              </div>
              <h2 style={{
                margin: 0, fontSize: 22, fontWeight: 700,
                letterSpacing: '-0.03em', color: '#fff',
              }}>
                Check your email
              </h2>
              <p style={{
                margin: 0, fontSize: 13,
                color: 'rgba(255,255,255,0.55)', lineHeight: 1.65,
              }}>
                We sent a verification link to<br />
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>{registeredEmail}</span><br /><br />
                Click the link to activate your account.
                The link expires in 24 hours.
              </p>
              <Link
                to="/login"
                style={{
                  fontSize: 12.5, color: 'rgba(147,197,253,0.9)',
                  textDecoration: 'none', fontWeight: 500, marginTop: 4,
                }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {/* Card header */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{
                  margin: 0, fontSize: 26, fontWeight: 700,
                  letterSpacing: '-0.03em', color: '#fff',
                }}>
                  Create account
                </h2>
                <p style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                  Join SAMS to manage student admissions.
                </p>
              </div>

              {/* Error banner */}
              {error && (
                <div style={{
                  marginBottom: 18, display: 'flex', gap: 9, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 10,
                  border: '1px solid rgba(248,113,113,0.25)',
                  background: 'rgba(239,68,68,0.10)',
                  color: '#fca5a5', fontSize: 12.5,
                }}>
                  <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* Full name */}
                <label style={{
                  display: 'block', marginBottom: 7, fontSize: 11.5, fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.005em',
                }}>Full name</label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <User size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.32)',
                  }} />
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Your full name"
                    value={form.full_name}
                    onChange={set('full_name')}
                    required
                    style={{ ...inputBase, paddingLeft: 40, paddingRight: 14 }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(96,165,250,0.6)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  />
                </div>

                {/* Email */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.005em' }}>
                    Email address
                  </label>
                  <span style={{ fontSize: 11, color: 'rgba(251,191,36,0.75)', fontWeight: 500 }}>
                    ⚠ cannot be changed later
                  </span>
                </div>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Mail size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.32)',
                  }} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={set('email')}
                    required
                    style={{ ...inputBase, paddingLeft: 40, paddingRight: 14 }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(96,165,250,0.6)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  />
                </div>

                {/* Password */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.005em' }}>
                    Password
                  </label>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                    min. 8 characters
                  </span>
                </div>
                <div style={{ position: 'relative', marginBottom: 22 }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.32)',
                  }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    required
                    style={{ ...inputBase, paddingLeft: 40, paddingRight: 42 }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(96,165,250,0.6)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
                    onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.background = 'rgba(255,255,255,0.05)'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.40)', padding: 4,
                    }}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    height: 44, width: '100%', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff', fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.005em',
                    boxShadow: btnShadow,
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'all 200ms ease',
                    fontFamily: 'inherit',
                  }}
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              <p style={{
                marginTop: 22, fontSize: 11.5,
                color: 'rgba(255,255,255,0.35)',
                textAlign: 'center',
              }}>
                Already have an account?{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'rgba(147,197,253,0.95)',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
