// src/components/auth/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, AlertCircle, GraduationCap } from 'lucide-react';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface LoginForm {
  email: string;
  password: string;
}

const STATS = [
  { v: '12k+', l: 'applications/yr' },
  { v: '180',  l: 'partner universities' },
  { v: '42',   l: 'countries served' },
];

const inputBase: React.CSSProperties = {
  height: 42, width: '100%', borderRadius: 11,
  border: '1px solid rgba(255,255,255,0.10)',
  background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none',
  fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 160ms ease, background-color 160ms ease',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);

  const [showPw,          setShowPw]          = useState(false);
  const [error,           setError]           = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading,         setLoading]         = useState(false);

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

  // Destructure register results so we can chain onBlur
  const emailReg    = register('email',    { required: 'Email is required',    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email address' } });
  const passwordReg = register('password', { required: 'Password is required' });

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050e1f',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 520px',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* LEFT hero */}
      <div style={{ position: 'relative', overflow: 'hidden' }}
           className="hidden md:block">

        {/* Orb 1 */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.45), transparent 60%)',
          filter: 'blur(40px)',
          animation: 'float 9s ease-in-out infinite',
        }} />
        {/* Orb 2 */}
        <div style={{
          position: 'absolute', bottom: '-20%', left: '20%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.35), transparent 60%)',
          filter: 'blur(50px)',
          animation: 'float 11s ease-in-out infinite reverse',
        }} />
        {/* Orb 3 */}
        <div style={{
          position: 'absolute', top: '30%', right: '-10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.18), transparent 60%)',
          filter: 'blur(40px)',
          animation: 'float 13s ease-in-out infinite',
        }} />

        {/* Grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div style={{
          position: 'relative', zIndex: 1, height: '100%', padding: 48,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))',
              border: '1px solid rgba(255,255,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.20) inset, 0 8px 20px -4px rgba(0,0,0,0.40)',
            }}>
              <GraduationCap size={26} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>SAMS</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Student Admission Management</div>
            </div>
          </div>

          {/* Hero text */}
          <div style={{ maxWidth: 560, paddingBottom: 40 }} className="fade-up">
            <h1 style={{
              margin: 0,
              fontSize: 64, fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.045em',
              color: '#fff',
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
              lineHeight: 1.55, color: 'rgba(255,255,255,0.70)',
              letterSpacing: '-0.005em',
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

            {/* Stat strip */}
            <div style={{ display: 'flex', gap: 32, marginTop: 36 }}>
              {STATS.map((s) => (
                <div key={s.l}>
                  <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#fff' }}>
                    {s.v}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
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
        position: 'relative',
        background: '#070f23',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 20%, rgba(59,130,246,0.18), transparent 50%)',
          pointerEvents: 'none',
        }} />

        {/* Glass card */}
        <div
          className="fade-up"
          style={{
            position: 'relative', width: '100%', maxWidth: 380,
            padding: '34px 36px', borderRadius: 20,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(40px) saturate(140%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,0.10) inset,' +
              '0 30px 80px -20px rgba(0,0,0,0.55)',
          }}
        >
          {/* Card header */}
          <div style={{ marginBottom: 26 }}>
            <h2 style={{
              margin: 0, fontSize: 26, fontWeight: 700,
              letterSpacing: '-0.03em', color: '#fff',
            }}>
              Sign in to SAMS
            </h2>
            <p style={{ marginTop: 6, fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
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
                textAlign: 'center', fontSize: 13, color: 'rgba(147,197,253,0.95)',
                textDecoration: 'underline', fontFamily: 'inherit',
              }}
            >
              Resend verification email
            </button>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Email field */}
            <label style={{
              display: 'block', marginBottom: 7, fontSize: 11.5, fontWeight: 600,
              color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.005em',
            }}>
              Email address
            </label>
            <div style={{ position: 'relative', marginBottom: errors.email ? 4 : 14 }}>
              <Mail size={15} style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.32)',
              }} />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                style={{
                  ...inputBase,
                  paddingLeft: 40, paddingRight: 14,
                  borderColor: errors.email ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.10)',
                }}
                {...emailReg}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(96,165,250,0.6)';
                  e.target.style.background  = 'rgba(255,255,255,0.08)';
                }}
                onBlur={(e) => {
                  void emailReg.onBlur(e);
                  e.target.style.borderColor = errors.email
                    ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.10)';
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                }}
              />
            </div>
            {errors.email && (
              <p style={{ margin: '4px 0 10px', fontSize: 12, color: '#fca5a5' }}>
                {errors.email.message}
              </p>
            )}

            {/* Password field */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <label style={{
                fontSize: 11.5, fontWeight: 600,
                color: 'rgba(255,255,255,0.65)', letterSpacing: '-0.005em',
              }}>
                Password
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{ fontSize: 11.5, color: 'rgba(96,165,250,0.85)', textDecoration: 'none', fontWeight: 500 }}
              >
                Forgot?
              </a>
            </div>
            <div style={{ position: 'relative', marginBottom: errors.password ? 4 : 22 }}>
              <Lock size={15} style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.32)',
              }} />
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  ...inputBase,
                  paddingLeft: 40, paddingRight: 42,
                  borderColor: errors.password ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.10)',
                }}
                {...passwordReg}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(96,165,250,0.6)';
                  e.target.style.background  = 'rgba(255,255,255,0.08)';
                }}
                onBlur={(e) => {
                  void passwordReg.onBlur(e);
                  e.target.style.borderColor = errors.password
                    ? 'rgba(248,113,113,0.45)' : 'rgba(255,255,255,0.10)';
                  e.target.style.background = 'rgba(255,255,255,0.05)';
                }}
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
                boxShadow:
                  '0 1px 0 rgba(255,255,255,0.18) inset,' +
                  '0 10px 20px -4px rgba(37,99,235,0.45),' +
                  '0 2px 4px rgba(37,99,235,0.20)',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 200ms ease',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{
            marginTop: 22, fontSize: 11.5, color: 'rgba(255,255,255,0.35)', textAlign: 'center',
          }}>
            No account?{' '}
            <Link
              to="/register"
              style={{ color: 'rgba(147,197,253,0.95)', fontWeight: 600, textDecoration: 'none' }}
            >
              Request access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
