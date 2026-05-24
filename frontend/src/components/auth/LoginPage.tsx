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

export default function LoginPage() {
  const navigate   = useNavigate();
  const setAuth    = useAuthStore((s) => s.setAuth);

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

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050e1f',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) 520px',
      color: '#fff',
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* ── LEFT: hero ────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden' }}
           className="hidden md:block">

        {/* Animated gradient orbs */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.45), transparent 60%)',
          filter: 'blur(40px)',
          animation: 'float 9s ease-in-out infinite',
        }}/>
        <div style={{
          position: 'absolute', bottom: '-20%', left: '20%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.35), transparent 60%)',
          filter: 'blur(50px)',
          animation: 'float 11s ease-in-out infinite reverse',
        }}/>
        <div style={{
          position: 'absolute', top: '30%', right: '-10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.18), transparent 60%)',
          filter: 'blur(40px)',
          animation: 'float 13s ease-in-out infinite',
        }}/>

        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)',
        }}/>

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
              <GraduationCap size={26} color="#fff"/>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>SAMS</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Student Admission Management</div>
            </div>
          </div>

          {/* Centerpiece */}
          <div style={{ maxWidth: 560, paddingBottom: 40 }} className="fade-up">
            <h1 style={{
              margin: 0,
              fontSize: 64, fontWeight: 700, lineHeight: 1.0, letterSpacing: '-0.045em',
              color: '#fff',
            }}>
              Manage student
              <br/>
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
              <br/>
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
                  <div style={{
                    fontSize: 24, fontWeight: 700,
                    letterSpacing: '-0.03em', color: '#fff',
                  }}>{s.v}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: form panel ─────────────────────── */}
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
        }}/>

        {/* Glass card */}
        <div style={{
          position: 'relative', width: '100%', maxWidth: 380,
          padding: '34px 36px', borderRadius: 20,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          backdropFilter: 'blur(40px) saturate(140%)',
          WebkitBackdropFilter: 'blur(40px) saturate(140%)',
          boxShadow:
            '0 1px 0 rgba(255,255,255,0.10) inset,' +
            '0 30px 80px -20px rgba(0,0,0,0.55)',
        }} className="fade-up">

          {/* Header */}
          <div style={{ marginBottom: 26 }}>
            <h2 style={{
              margin: 0, fontSize: 26, fontWeight: 700,
              letterSpacing: '-0.03em', color: '#fff',
            }}>Sign in to SAMS</h2>
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
              <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }}/>
              <span>{error}</span>
            </div>
          )}

          {/* Resend verification */}
          {unverifiedEmail && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await authApi.resendVerification(unverifiedEmail);
                  toast.success('Verification email sent. Check your inbox.');
                  setUnver