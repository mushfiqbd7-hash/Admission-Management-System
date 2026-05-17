// src/components/auth/RegisterPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, MailCheck } from 'lucide-react';
import { authApi } from '@/api/client';

interface RegisterForm {
  full_name: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [form, setForm] = useState<RegisterForm>({
    full_name: '',
    email: '',
    password: '',
  });

  const set = (field: keyof RegisterForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Public registration is always for applicants (student role).
      // Agent / staff / admin accounts are provisioned by an admin
      // from the User Management screen.
      await authApi.register({ ...form, role: 'student' });
      setRegisteredEmail(form.email.trim());
      setRegistered(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Outfit:wght@300;400;500;600&display=swap"
      />

      <style>{`
        .rp-root *, .rp-root *::before, .rp-root *::after { box-sizing: border-box; }
        .rp-root {
          --navy: #0b1120; --navy-mid: #101827; --blue: #2563eb; --blue-hover: #1d4ed8;
          --blue-glow: rgba(37,99,235,0.28); --glass-bg: rgba(255,255,255,0.042);
          --glass-bdr: rgba(255,255,255,0.082); --text-hi: #f0f4ff;
          --text-mid: rgba(255,255,255,0.52); --text-lo: rgba(255,255,255,0.26);
          --serif: 'Playfair Display', Georgia, serif; --sans: 'Outfit', system-ui, sans-serif;
          display: flex; height: 100vh; width: 100vw; overflow: hidden;
          font-family: var(--sans); background: var(--navy);
        }
        .rp-hero { flex: 1 1 0; position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .rp-hero-photo { position: absolute; inset: 0; background-image: url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=88&auto=format&fit=crop&crop=center'); background-size: cover; background-position: center 20%; animation: rp-pan 30s ease-in-out infinite alternate; }
        @keyframes rp-pan { from { transform: scale(1.06) translateX(0); } to { transform: scale(1.12) translateX(-2%); } }
        .rp-hero-veil { position: absolute; inset: 0; background: linear-gradient(175deg, rgba(8,15,35,0.18) 0%, rgba(8,15,35,0.42) 35%, rgba(8,15,35,0.76) 68%, rgba(8,15,35,0.97) 100%); }
        .rp-wordmark { position: relative; z-index: 2; display: flex; align-items: center; gap: 0.9rem; padding: 2.4rem 2.8rem; animation: rp-fade-down 0.9s cubic-bezier(.22,1,.36,1) both; }
        .rp-monogram { width: 46px; height: 46px; border-radius: 12px; border: 1.5px solid rgba(255,255,255,0.28); background: rgba(255,255,255,0.06); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rp-monogram-letter { font-family: var(--serif); font-size: 1.45rem; font-weight: 500; color: #fff; line-height: 1; }
        .rp-wordmark-text { display: flex; flex-direction: column; gap: 1px; }
        .rp-wordmark-name { font-family: var(--serif); font-size: 1rem; font-weight: 400; color: rgba(255,255,255,0.92); letter-spacing: 0.12em; text-transform: uppercase; }
        .rp-wordmark-sub { font-size: 0.62rem; font-weight: 300; letter-spacing: 0.08em; color: rgba(255,255,255,0.38); text-transform: uppercase; }
        .rp-hero-spacer { flex: 1; }
        .rp-hero-copy { position: relative; z-index: 2; padding: 0 2.8rem 3rem; animation: rp-fade-up 1s cubic-bezier(.22,1,.36,1) 0.25s both; }
        .rp-hero-title { font-family: var(--serif); font-size: clamp(2.6rem, 4.2vw, 4rem); font-weight: 400; line-height: 1.06; color: var(--text-hi); letter-spacing: -0.02em; margin-bottom: 1.4rem; }
        .rp-hero-title em { font-style: italic; color: rgba(255,255,255,0.62); }
        .rp-auth { width: 500px; flex-shrink: 0; background: var(--navy-mid); position: relative; overflow: hidden; overflow-y: auto; display: flex; align-items: center; justify-content: center; padding: 2rem 1.75rem; }
        .rp-auth::before { content: ''; position: absolute; inset: 0; opacity: 0.028; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 180px; pointer-events: none; }
        .rp-auth-edge { position: absolute; left: 0; top: 15%; bottom: 15%; width: 1px; background: linear-gradient(to bottom, transparent, rgba(37,99,235,0.35) 40%, rgba(37,99,235,0.35) 60%, transparent); }
        .rp-auth-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 420px; height: 420px; background: radial-gradient(circle, rgba(37,99,235,0.09) 0%, transparent 68%); pointer-events: none; }
        .rp-card { position: relative; z-index: 1; width: 100%; max-width: 372px; background: var(--glass-bg); border: 1px solid var(--glass-bdr); border-radius: 22px; padding: 2.2rem 2.25rem; backdrop-filter: blur(28px); box-shadow: 0 0 0 1px rgba(255,255,255,0.035) inset, 0 24px 72px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.3); animation: rp-fade-up 0.75s cubic-bezier(.22,1,.36,1) 0.1s both; }
        .rp-card::before { content: ''; position: absolute; top: 0; left: 10%; right: 10%; height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.14) 50%, transparent); }
        .rp-card-heading { font-family: var(--serif); font-size: 2rem; font-weight: 400; color: var(--text-hi); letter-spacing: -0.025em; margin-bottom: 1.6rem; line-height: 1.1; }
        .rp-error { display: flex; align-items: flex-start; gap: 0.6rem; background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.22); border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1.2rem; font-size: 0.8rem; line-height: 1.45; color: #fca5a5; }
        .rp-success-box { display:flex; flex-direction:column; align-items:center; text-align:center; gap:1rem; padding: 1.5rem 0; }
        .rp-success-icon { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25); border-radius: 50%; width: 64px; height: 64px; display:flex; align-items:center; justify-content:center; color: #4ade80; }
        .rp-success-title { font-family: var(--serif); font-size: 1.5rem; color: var(--text-hi); }
        .rp-success-msg { font-size: 0.85rem; color: var(--text-mid); line-height: 1.6; }
        .rp-success-email { color: #93c5fd; font-weight: 600; }
        .rp-field-wrap { margin-bottom: 0.9rem; }
        .rp-label { display: block; font-size: 0.68rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-lo); margin-bottom: 0.4rem; }
        .rp-label-hint { font-size: 0.62rem; color: rgba(251,191,36,0.7); margin-left: 0.4rem; text-transform: none; letter-spacing: 0; font-weight: 400; }
        .rp-input-row { position: relative; }
        .rp-input { width: 100%; font-family: var(--sans); font-size: 0.875rem; color: var(--text-hi); background: rgba(255,255,255,0.046); border: 1px solid rgba(255,255,255,0.09); border-radius: 11px; padding: 0.75rem 1rem; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
        .rp-input::placeholder { color: rgba(255,255,255,0.17); }
        .rp-input:focus { border-color: rgba(59,130,246,0.52); box-shadow: 0 0 0 3.5px rgba(37,99,235,0.14); }
        .rp-input.rp-select { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.3)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
        .rp-input.rp-select option { background: #101827; color: #f0f4ff; }
        .rp-input[readonly] { opacity: 0.5; cursor: not-allowed; }
        .rp-pw-toggle { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.22); padding: 0; display: flex; transition: color 0.2s; }
        .rp-pw-toggle:hover { color: rgba(255,255,255,0.52); }
        .rp-btn { width: 100%; font-family: var(--sans); font-size: 0.9rem; font-weight: 600; letter-spacing: 0.025em; color: #fff; background: linear-gradient(135deg, #2563eb 0%, #1a45c8 100%); border: none; border-radius: 11px; padding: 0.86rem 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.55rem; transition: transform 0.22s, box-shadow 0.22s; box-shadow: 0 5px 22px var(--blue-glow), 0 1px 4px rgba(0,0,0,0.3); margin-top: 1.4rem; }
        .rp-btn:hover:not(:disabled) { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); box-shadow: 0 8px 32px rgba(37,99,235,0.42); transform: translateY(-1.5px); }
        .rp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rp-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.28); border-top-color: #fff; border-radius: 50%; animation: rp-spin 0.65s linear infinite; }
        .rp-footer { text-align: center; margin-top: 1.4rem; font-size: 0.78rem; font-weight: 300; color: var(--text-lo); }
        .rp-footer a { color: rgba(99,154,255,0.82); text-decoration: none; font-weight: 500; }
        .rp-footer a:hover { color: #93c5fd; }
        @keyframes rp-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rp-fade-down { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes rp-spin { to { transform: rotate(360deg); } }
        @media (max-width: 820px) { .rp-root { flex-direction: column; } .rp-hero { flex: none; min-height: 200px; } .rp-auth { width: 100%; flex: 1; } }
      `}</style>

      <div className="rp-root">
        <div className="rp-hero">
          <div className="rp-hero-photo" />
          <div className="rp-hero-veil" />
          <div className="rp-wordmark">
            <div className="rp-monogram">
              <span className="rp-monogram-letter">S</span>
            </div>
            <div className="rp-wordmark-text">
              <span className="rp-wordmark-name">SAMS</span>
              <span className="rp-wordmark-sub">Admission System</span>
            </div>
          </div>
          <div className="rp-hero-spacer" />
          <div className="rp-hero-copy">
            <h1 className="rp-hero-title">
              Join the<br />Admission<br /><em>Team</em>
            </h1>
          </div>
        </div>

        <div className="rp-auth">
          <div className="rp-auth-edge" />
          <div className="rp-auth-glow" />

          <div className="rp-card">
            {registered ? (
              <div className="rp-success-box">
                <div className="rp-success-icon">
                  <MailCheck size={28} />
                </div>
                <h2 className="rp-success-title">Check your email</h2>
                <p className="rp-success-msg">
                  We sent a verification link to<br />
                  <span className="rp-success-email">{registeredEmail}</span><br /><br />
                  Click the link in the email to activate your account.
                  The link expires in 24 hours.
                </p>
                <p className="rp-footer">
                  <Link to="/login">Back to sign in</Link>
                </p>
              </div>
            ) : (
              <>
                <h2 className="rp-card-heading">Create account</h2>

                {error && (
                  <div className="rp-error">
                    <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="rp-field-wrap">
                    <label className="rp-label">Full Name</label>
                    <input type="text" value={form.full_name} onChange={set('full_name')}
                      placeholder="Your full name" className="rp-input" required />
                  </div>

                  <div className="rp-field-wrap">
                    <label className="rp-label">
                      Email Address
                      <span className="rp-label-hint">⚠ cannot be changed after registration</span>
                    </label>
                    <input type="email" value={form.email} onChange={set('email')}
                      placeholder="you@example.com" className="rp-input" required />
                  </div>

                  <div className="rp-field-wrap">
                    <label className="rp-label">Password</label>
                    <div className="rp-input-row">
                      <input type={showPw ? 'text' : 'password'} value={form.password}
                        onChange={set('password')} placeholder="••••••••••"
                        className="rp-input" style={{ paddingRight: '2.8rem' }} required />
                      <button type="button" className="rp-pw-toggle" onClick={() => setShowPw(v => !v)}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="rp-btn">
                    {loading ? <><span className="rp-spinner" />Creating account…</> : 'Create Account'}
                  </button>
                </form>

                <p className="rp-footer">
                  Already have an account? <Link to="/login">Sign in</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
