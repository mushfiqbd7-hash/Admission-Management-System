// src/components/auth/LoginPage.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, AlertCircle, GraduationCap, X, CheckCircle } from 'lucide-react';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'sonner';

// Self-hosted campus video — place file at frontend/public/videos/bg.mp4
const VIDEO_SOURCES = [
  '/videos/bg.mp4',
];

interface LoginForm {
  email: string;
  password: string;
}

const STATS = [
  { v: '12k+', l: 'applications/yr' },
  { v: '180',  l: 'partner universities' },
  { v: '42',   l: 'countries served' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  const [showPw,          setShowPw]          = useState(false);
  const [error,           setError]           = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);
  const [videoLoaded,     setVideoLoaded]     = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    setUnverifiedEmail(null);
    try {
      const res = await authApi.login(data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      const resData = (err as { response?: { data?: { code?: string; email?: string; error?: string } } })?.response?.data;
      if (resData?.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(resData.email || data.email);
        setError('Please verify your email before logging in.');
      } else {
        setError(resData?.error || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!unverifiedEmail) return;
    try {
      await authApi.resendVerification(unverifiedEmail);
      toast.success('Verification email sent. Check your inbox.');
      setUnverifiedEmail(null);
    } catch (_err: unknown) {
      toast.error('Failed to resend. Please try again.');
    }
  };

  const emailReg    = register('email',    { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' } });
  const passwordReg = register('password', { required: 'Password is required' });

  const btnShadow = [
    '0 1px 0 rgba(255,255,255,0.18) inset',
    '0 10px 20px -4px rgba(37,99,235,0.45)',
    '0 2px 4px rgba(37,99,235,0.20)',
  ].join(', ');

  // ── Theme-aware style tokens ──
  const overlayBg   = dark ? 'rgba(0,0,0,0.42)'          : 'rgba(0,0,0,0.25)';
  const textPrimary = dark ? '#fff'                        : '#0f172a';
  const textSub     = dark ? 'rgba(255,255,255,0.55)'     : 'rgba(15,23,42,0.55)';
  const textLabel   = dark ? 'rgba(255,255,255,0.65)'     : 'rgba(15,23,42,0.65)';
  const textMuted   = dark ? 'rgba(255,255,255,0.35)'     : 'rgba(15,23,42,0.40)';
  const iconColor   = dark ? 'rgba(255,255,255,0.32)'     : 'rgba(15,23,42,0.30)';
  const eyeColor    = dark ? 'rgba(255,255,255,0.40)'     : 'rgba(15,23,42,0.35)';
  const linkColor   = dark ? 'rgba(147,197,253,0.95)'     : '#2563eb';
  const forgotColor = dark ? 'rgba(96,165,250,0.85)'      : '#2563eb';
  const cardBg      = dark ? 'transparent'                : 'rgba(255,255,255,0.82)';
  const cardBorder  = dark ? 'none'                       : '1px solid rgba(15,23,42,0.08)';
  const cardBlur    = dark ? undefined                     : 'blur(20px) saturate(180%)';
  const cardShadow  = dark ? undefined                     : '0 8px 40px rgba(15,23,42,0.10), 0 1px 0 rgba(255,255,255,0.80) inset';
  const inputBorder = dark ? 'rgba(255,255,255,0.10)'     : 'rgba(15,23,42,0.14)';
  const inputBg     = dark ? 'rgba(255,255,255,0.05)'     : 'rgba(255,255,255,0.80)';
  const inputColor  = dark ? '#fff'                        : '#0f172a';
  const inputFocusBorder = dark ? 'rgba(96,165,250,0.6)'  : 'rgba(37,99,235,0.50)';
  const inputFocusBg     = dark ? 'rgba(255,255,255,0.08)': 'rgba(255,255,255,0.95)';
  const inputBlurBg      = dark ? 'rgba(255,255,255,0.05)': 'rgba(255,255,255,0.80)';

  const inputBase: React.CSSProperties = {
    height: 42, width: '100%', borderRadius: 11,
    border: `1px solid ${inputBorder}`,
    background: inputBg, color: inputColor, outline: 'none',
    fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'border-color 160ms ease, background-color 160ms ease',
  };

  // ── Forgot password modal state ──
  const [forgotOpen,    setForgotOpen]    = useState(false);
  const [forgotEmail,   setForgotEmail]   = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent,    setForgotSent]    = useState(false);
  const [forgotError,   setForgotError]   = useState('');

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotError('Please enter your email.'); return; }
    setForgotLoading(true); setForgotError('');
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setForgotSent(true);
    } catch {
      setForgotError('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotEmail('');
    setForgotSent(false);
    setForgotError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 520px',
      color: textPrimary,
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
          objectPosition: 'center 40%',
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

      {/* Cinematic overlay — lighter in light mode */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: overlayBg,
        transition: 'background 400ms ease',
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
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>SAMS</div>
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
              Manage student
              <br />
              admissions with{' '}
              <span style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #f0abfc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>confidence.</span>
            </h1>
            <p style={{
              marginTop: 20, maxWidth: 480, fontSize: 16, fontWeight: 400,
              lineHeight: 1.55, color: 'rgba(255,255,255,0.82)',
              letterSpacing: '-0.005em',
              textShadow: '0 1px 8px rgba(0,0,0,0.40)',
            }}>
              Every application is someone&rsquo;s next chapter.
              <br />
              From <span style={{ color: '#fff', fontWeight: 500 }}>submit</span>{' '}
              to <span style={{ color: '#fff', fontWeight: 500 }}>accepted</span>{' '}
              to{' '}
              <span style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #818cf8 50%, #f0abfc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontWeight: 600,
              }}>arrived</span>{' '}
              — we move the journey forward.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 32, marginTop: 36 }}>
              {STATS.map((s) => (
                <div key={s.l}>
                  <div style={{
                    fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff',
                    textShadow: '0 1px 8px rgba(0,0,0,0.50)',
                  }}>
                    {s.v}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
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
          background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.10), transparent 55%)',
          pointerEvents: 'none',
        }} />

        {/* Glass card */}
        <div
          className="fade-up"
          style={{
            position: 'relative', width: '100%', maxWidth: 380,
            padding: '34px 36px', borderRadius: 20,
            background: cardBg,
            border: cardBorder,
            backdropFilter: cardBlur,
            WebkitBackdropFilter: cardBlur,
            boxShadow: cardShadow,
            transition: 'background 400ms ease, box-shadow 400ms ease',
          }}
        >
          {/* Card header */}
          <div style={{ marginBottom: 26 }}>
            <h2 style={{
              margin: 0, fontSize: 26, fontWeight: 700,
              letterSpacing: '-0.03em', color: textPrimary,
            }}>
              Sign in to SAMS
            </h2>
            <p style={{ marginTop: 6, fontSize: 13, color: textSub }}>
              Welcome back. Continue managing applications.
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

          {/* Resend verification */}
          {unverifiedEmail && (
            <button
              type="button"
              onClick={resendVerification}
              style={{
                display: 'block', width: '100%', marginBottom: 18,
                background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'center', fontSize: 13, color: linkColor,
                textDecoration: 'underline', fontFamily: 'inherit',
              }}
            >
              Resend verification email
            </button>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email */}
            <label style={{
              display: 'block', marginBottom: 7, fontSize: 11.5, fontWeight: 600,
              color: textLabel, letterSpacing: '-0.005em',
            }}>
              Email address
            </label>
            <div style={{ position: 'relative', marginBottom: errors.email ? 4 : 14 }}>
              <Mail size={15} style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)', color: iconColor,
              }} />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                style={{
                  ...inputBase,
                  paddingLeft: 40, paddingRight: 14,
                  borderColor: errors.email ? 'rgba(248,113,113,0.45)' : inputBorder,
                }}
                {...emailReg}
                onFocus={(e) => {
                  e.target.style.borderColor = inputFocusBorder;
                  e.target.style.background  = inputFocusBg;
                }}
                onBlur={(e) => {
                  void emailReg.onBlur(e);
                  e.target.style.borderColor = errors.email
                    ? 'rgba(248,113,113,0.45)' : inputBorder;
                  e.target.style.background = inputBlurBg;
                }}
              />
            </div>
            {errors.email && (
              <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#fca5a5' }}>
                {errors.email.message}
              </p>
            )}

            {/* Password */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <label style={{
                fontSize: 11.5, fontWeight: 600,
                color: textLabel, letterSpacing: '-0.005em',
              }}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                style={{ fontSize: 11.5, color: forgotColor, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Forgot?
              </button>
            </div>
            <div style={{ position: 'relative', marginBottom: errors.password ? 4 : 22 }}>
              <Lock size={15} style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)', color: iconColor,
              }} />
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  ...inputBase,
                  paddingLeft: 40, paddingRight: 42,
                  borderColor: errors.password ? 'rgba(248,113,113,0.45)' : inputBorder,
                }}
                {...passwordReg}
                onFocus={(e) => {
                  e.target.style.borderColor = inputFocusBorder;
                  e.target.style.background  = inputFocusBg;
                }}
                onBlur={(e) => {
                  void passwordReg.onBlur(e);
                  e.target.style.borderColor = errors.password
                    ? 'rgba(248,113,113,0.45)' : inputBorder;
                  e.target.style.background = inputBlurBg;
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: eyeColor, padding: 4,
                }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && (
              <p style={{ margin: '4px 0 14px', fontSize: 12, color: '#fca5a5' }}>
                {errors.password.message}
              </p>
            )}

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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{
            marginTop: 22, fontSize: 11.5,
            color: textMuted,
            textAlign: 'center',
          }}>
            No account?{' '}
            <Link
              to="/register"
              style={{
                color: linkColor,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Request access
            </Link>
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {forgotOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)',
          }}
          onClick={closeForgot}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 400, margin: '0 16px',
              background: '#0f172a', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.10)',
              padding: '32px 36px',
              color: '#fff', fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em' }}>
                  Reset your password
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>
                  Enter your email and we'll send a reset link.
                </p>
              </div>
              <button onClick={closeForgot} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.40)', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {forgotSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle size={40} color="#4ade80" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                  If <strong style={{ color: '#fff' }}>{forgotEmail}</strong> is registered,<br />
                  a reset link is on its way. Check your inbox.
                </p>
                <button
                  onClick={closeForgot}
                  style={{
                    marginTop: 20, height: 40, width: '100%', borderRadius: 10, border: 'none',
                    background: 'rgba(255,255,255,0.08)', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgot} noValidate>
                {forgotError && (
                  <div style={{
                    marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center',
                    padding: '9px 12px', borderRadius: 9,
                    border: '1px solid rgba(248,113,113,0.25)',
                    background: 'rgba(239,68,68,0.10)', color: '#fca5a5', fontSize: 12.5,
                  }}>
                    <AlertCircle size={13} />
                    <span>{forgotError}</span>
                  </div>
                )}
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.60)' }}>
                    Email address
                </label>
                <div style={{ position: 'relative', marginBottom: 18 }}>
                  <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.30)' }} />
                  <input
                    type="email"
                    autoFocus
                    placeholder="you@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    style={{
                      height: 42, width: '100%', borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)', color: '#fff',
                      fontSize: 13.5, paddingLeft: 38, paddingRight: 14,
                      boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    height: 43, width: '100%', borderRadius: 11, border: 'none',
                    background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff', fontSize: 13.5, fontWeight: 700,
                    cursor: forgotLoading ? 'wait' : 'pointer',
                    opacity: forgotLoading ? 0.6 : 1, fontFamily: 'inherit',
                  }}
                >
                  {forgotLoading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
