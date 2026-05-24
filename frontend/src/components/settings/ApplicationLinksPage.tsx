// src/components/settings/ApplicationLinksPage.tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Copy, Check, Plus, Loader2, Clock, User } from 'lucide-react';
import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

type InviteToken = {
  token: string;
  expires_at: string;
  created_at: string;
  student_id: string | null;
  created_by_name: string;
};

export default function ApplicationLinksPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const isAdminStaff = user?.role === 'admin' || user?.role === 'staff';

  const [generating, setGenerating] = useState(false);
  const [linkModal, setLinkModal] = useState<{ link: string; expires: string } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ tokens: InviteToken[] }>({
    queryKey: ['invite-tokens'],
    queryFn: () => api.get('/invite-tokens').then(r => r.data),
    staleTime: 20_000,
  });

  const tokens = data?.tokens || [];

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post('/invite-tokens', {});
      const { token, expires_at } = res.data;
      const link = `${window.location.origin}/apply/${token}`;
      setLinkModal({ link, expires: expires_at });
      qc.invalidateQueries({ queryKey: ['invite-tokens'] });
    } catch {
      toast.error('Failed to generate link');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (token: string) => {
    const link = `${window.location.origin}/apply/${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast.success('Link copied!');
    });
  };

  const daysLeft = (expires: string) =>
    Math.max(0, Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000));

  return (
    <div style={{ padding: '24px 28px', maxWidth: 780 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Application Links
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
            Generate single-use links for applicants to fill and submit their own form.
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generating} style={genBtn}>
          {generating
            ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
            : <Plus size={14} />}
          Generate New Link
        </button>
      </div>

      {/* Links list */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: isAdminStaff ? '1fr 120px 110px 100px' : '1fr 120px 110px', gap: 0, padding: '10px 18px', background: 'var(--surface-sunken)', borderBottom: '1px solid var(--border)' }}>
          <span style={thStyle}>Link</span>
          {isAdminStaff && <span style={thStyle}>Created by</span>}
          <span style={thStyle}>Status</span>
          <span style={thStyle}>Actions</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <Loader2 size={20} style={{ color: '#94a3b8', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tokens.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Link2 size={22} style={{ color: '#94a3b8' }} />
            </div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>No active links</p>
            <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
              Generate a link to share with applicants.
            </p>
          </div>
        ) : (
          tokens.map((t, i) => {
            const link = `${window.location.origin}/apply/${t.token}`;
            const dl = daysLeft(t.expires_at);
            const copied = copiedToken === t.token;
            const isLast = i === tokens.length - 1;
            return (
              <div key={t.token} style={{ display: 'grid', gridTemplateColumns: isAdminStaff ? '1fr 120px 110px 100px' : '1fr 120px 110px', gap: 0, padding: '12px 18px', borderBottom: isLast ? 'none' : '1px solid var(--border)', alignItems: 'center' }}>
                {/* Link URL */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <Link2 size={13} style={{ color: '#2563eb', flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, color: '#475569', fontFamily: 'DM Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {link}
                  </span>
                </div>

                {/* Created by (admin/staff only) */}
                {isAdminStaff && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <User size={11} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.created_by_name}</span>
                  </div>
                )}

                {/* Expiry */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={11} style={{ color: dl <= 1 ? '#dc2626' : '#94a3b8' }} />
                  <span style={{ fontSize: 11.5, color: dl <= 1 ? '#dc2626' : 'var(--text-secondary)', fontWeight: dl <= 1 ? 600 : 400 }}>
                    {dl === 0 ? 'Expires today' : `${dl}d left`}
                  </span>
                </div>

                {/* Copy */}
                <button onClick={() => handleCopy(t.token)} style={{ ...copyBtn, background: copied ? '#f0fdf4' : '#eff6ff', border: `1px solid ${copied ? '#bbf7d0' : '#bfdbfe'}`, color: copied ? '#16a34a' : '#2563eb' }}>
                  {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Hint */}
      <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
        Links expire after 7 days or after one submission - whichever comes first.
      </p>

      {/* Generated link modal */}
      {linkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', width: 480, boxShadow: '0 24px 64px rgba(15,23,42,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#eff6ff', border: '2px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Link2 size={24} style={{ color: '#2563eb' }} />
              </div>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>Link Generated!</h3>
            <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#64748b', textAlign: 'center' }}>
              Share this link with the applicant. Single-use, expires in 7 days.
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: '#334155', fontFamily: 'DM Mono, monospace', wordBreak: 'break-all' }}>{linkModal.link}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setLinkModal(null)} style={{ flex: 1, padding: '9px 0', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Close
              </button>
              <button
                onClick={() => { navigator.clipboard.writeText(linkModal.link); toast.success('Copied!'); }}
                style={{ flex: 2, padding: '9px 0', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                <Copy size={14} /> Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Styles --------------------------------------------------------------------

const thStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const genBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 7,
  padding: '9px 16px', border: 'none', borderRadius: 12,
  background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', color: '#fff',
  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 8px 20px rgba(30,58,95,0.2)',
};

const copyBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '4px 10px', borderRadius: 7,
  fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};
