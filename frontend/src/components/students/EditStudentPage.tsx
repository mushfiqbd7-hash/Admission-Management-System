// src/components/students/EditStudentPage.tsx - Phase 4
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { studentsApi } from '@/api/client';
import StudentForm from './StudentForm';
import type { StudentDetail } from '@/types';

export default function EditStudentPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<StudentDetail>({
    queryKey: ['student', id],
    queryFn:  () => studentsApi.get(id!).then(r => r.data),
    enabled:  !!id,
  });

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
      <div style={{ width: 26, height: 26, border: '2px solid var(--navy-100)', borderTopColor: 'var(--navy-600)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (isError || !data) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontSize: 13 }}>Student not found.</div>
  );

  const s = data.student;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, flexShrink: 0 }}>
        <button onClick={() => navigate(-1)}
          style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
          <ArrowLeft size={14} />
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            Edit: {s.given_name} {s.family_name}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
            Passport: <span style={{ fontFamily: 'var(--font-mono)' }}>{s.passport_number || '-'}</span>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <StudentForm mode="edit" initialData={data} studentId={id} />
      </div>
    </div>
  );
}
