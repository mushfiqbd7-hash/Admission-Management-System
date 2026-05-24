// src/components/apply/PublicApplicationPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import StudentForm from '@/components/students/StudentForm';

type PageState = 'loading' | 'valid' | 'invalid' | 'submitted';

const _apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

export default function PublicApplicationPage() {
  const { token } = useParams<{ token: string }>();
  const [pageState, setPageState] = useState<PageState>('loading');

  useEffect(() => {
    if (!token) { setPageState('invalid'); return; }
    axios.get(`${_apiBase}/apply/${token}`)
      .then(r => setPageState(r.data.valid ? 'valid' : 'invalid'))
      .catch(() => setPageState('invalid'));
  }, [token]);

  if (pageState === 'loading') return (
    <div style={centeredPage}>
      <Loader2 size={32} style={{ color: '#2563eb', animation: 'spin 0.8s linear infinite' }} />
      <p style={mutedText}>Verifying your application link…</p>
    </div>
  );

  if (pageState === 'invalid') return (
    <div style={centeredPage}>
      <div style={iconCircle('#fef2f2', '#dc2626')}>
        <AlertTriangle size={28} style={{ color: '#dc2626' }} />
      </div>
      <h2 style={heading}>Link Invalid or Expired</h2>
      <p style={mutedText}>
        This application link has already been used or has expired.<br />
        Please contact the admissions team for a new link.
      </p>
    </div>
  );

  if (pageState === 'submitted') return (
    <div style={centeredPage}>
      <div style={iconCircle('#f0fdf4', '#16a34a')}>
        <CheckCircle size={32} style={{ color: '#16a34a' }} />
      </div>
      <h2 style={{ ...heading, color: '#15803d' }}>Application Submitted!</h2>
      <p style={{ ...mutedText, maxWidth: 420, textAlign: 'center', lineHeight: 1.7 }}>
        Thank you. The admission team will contact you very soon.
      </p>
    </div>
  );

  // pageState === 'valid'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg, #f8fafc)' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
        color: '#fff', padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, flexShrink: 0,
      }}>
        <GraduationCap size={22} />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em' }}>
          Student Application Form
        </span>
      </div>

      {/* Form fills remaining height */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <StudentForm
          mode="public"
          publicToken={token}
          onPublicSubmitSuccess={() => setPageState('submitted')}
        />
      </div>
    </div>
  );
}

// -- Styles --------------------------------------------------------------------

const centeredPage: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', minHeight: '100vh', gap: 16,
  background: '#f8fafc', padding: 24,
};

const heading: React.CSSProperties = {
  margin: 0, fontSize: 22, fontWeight: 700,
  color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em',
};

const mutedText: React.CSSProperties = {
  margin: 0, fontSize: 14, color: '#64748b',
};

const iconCircle = (bg: string, border: string): React.CSSProperties => ({
  width: 72, height: 72, borderRadius: '50%',
  background: bg, border: `2px solid ${border}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});
