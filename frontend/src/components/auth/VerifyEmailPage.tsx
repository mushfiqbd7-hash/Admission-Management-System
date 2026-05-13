// src/components/auth/VerifyEmailPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { authApi } from '@/api/client';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verified successfully! You can now log in.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err?.response?.data?.error || 'Invalid or expired verification link.'
        );
      });
  }, [searchParams]);

  return (
    <>
      <style>{`
        .ve-root {
          display: flex; align-items: center; justify-content: center;
          height: 100vh; width: 100vw;
          background: #0b1120; font-family: 'Outfit', system-ui, sans-serif;
        }
        .ve-card {
          background: rgba(255,255,255,0.042); border: 1px solid rgba(255,255,255,0.082);
          border-radius: 22px; padding: 2.5rem 2.5rem; max-width: 400px; width: 90%;
          text-align: center; backdrop-filter: blur(28px);
          box-shadow: 0 24px 72px rgba(0,0,0,0.55);
        }
        .ve-title { font-size: 1.5rem; font-weight: 600; color: #f0f4ff; margin: 1rem 0 0.5rem; }
        .ve-msg { font-size: 0.875rem; color: rgba(255,255,255,0.52); line-height: 1.6; margin-bottom: 1.5rem; }
        .ve-btn { display: inline-block; padding: 0.75rem 2rem; background: #2563eb;
          color: #fff; border-radius: 11px; text-decoration: none; font-weight: 600; font-size: 0.9rem; }
        .ve-btn:hover { background: #1d4ed8; }
      `}</style>

      <div className="ve-root">
        <div className="ve-card">
          {status === 'loading' && (
            <>
              <Loader size={48} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
              <h2 className="ve-title">Verifying your email...</h2>
              <p className="ve-msg">Please wait a moment.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle size={48} color="#4ade80" />
              <h2 className="ve-title">Email Verified!</h2>
              <p className="ve-msg">{message}</p>
              <Link to="/login" className="ve-btn">Sign In</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle size={48} color="#f87171" />
              <h2 className="ve-title">Verification Failed</h2>
              <p className="ve-msg">{message}</p>
              <Link to="/login" className="ve-btn">Back to Login</Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
