// src/components/auth/ResetPasswordPage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, GraduationCap } from 'lucide-react';
import { authApi } from '@/api/client';

const inputBase: React.CSSProperties = {
  height: 44, width: '100%', borderRadius: 11,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)', color: '#fff', outline: 'none',
  fontSize: 13.5, fontWeight: 500, fontFamily: 'inherit',
  boxSizing: 'border-box',
};

export default function ResetPasswordPage() {
  const [params]        = useSearchParams();
  const navigate        = useNavigate();
  const token           = params.get('token') || '';

  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [showCf,     setShowCf]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [done,       setDone]       = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (!token) setError('Invalid or missing reset link. Please request a new one.');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 50%, #0a0f1e 100%)',
      fontFamily: 'Inter, sans-serif', color: '#fff', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, justifyContent: 'center' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraduationCap size={22} color="#fff" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>SAMS</span>
        </div>

        <div style={{
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20, padding: '36px',
        }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={44} color="#4ade80" style={{ marginBottom: 16 }} />
              <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>
                Password updated!
              </h2>
              <p style={{ margin: 0, fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                Your password has been reset. Redirecting you to sign in…
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>
                Set new password
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>
                Choose a strong password for your account.
              </p>

              {error && (
                <div style={{
                  marginBottom: 18, display: 'flex', gap: 9, alignItems: 'flex-start',
                  padding: '10px 12px', borderRadius: 10,
                  border: '1px solid rgba(248,113,113,0.25)',
                  background: 'rgba(239,68,68,0.10)', color: '#fca5a5', fontSize: 12.5,
                }}>
                  <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {/* New password */}
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.60)' }}>
                  New password
                </label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.30)' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    style={{ ...inputBase, paddingLeft: 40, paddingRight: 42 }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', padding: 4 }}>
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Confirm password */}
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.60)' }}>
                  Confirm password
                </label>
                <div style={{ position: 'relative', marginBottom: 24 }}>
                  <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.30)' }} />
                  <input
                    type={showCf ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    style={{ ...inputBase, paddingLeft: 40, paddingRight: 42 }}
                  />
                  <button type="button" onClick={() => setShowCf(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.38)', padding: 4 }}>
                    {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  style={{
                    height: 44, width: '100%', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff', fontSize: 13.5, fontWeight: 700,
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading || !token ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {loading ? 'Updating...' : 'Reset password'}
                </button>
              </form>

              <p style={{ marginTop: 20, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                <Link to="/login" style={{ color: 'rgba(147,197,253,0.85)', fontWeight: 500, textDecoration: 'none' }}>
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
