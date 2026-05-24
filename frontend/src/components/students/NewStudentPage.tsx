// src/components/students/NewStudentPage.tsx
import StudentForm from './StudentForm';

export default function NewStudentPage() {
  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(37,99,235,0.055), transparent 34%), linear-gradient(180deg, var(--ui-surface-subtle) 0%, var(--surface-muted) 100%)',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          padding: '18px 22px 22px',
        }}
      >
        <div
          style={{
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
            borderRadius: 24,
            border: '1px solid var(--ui-border)',
            background: 'var(--surface)',
            boxShadow: '0 18px 42px rgba(15, 23, 42, 0.055)',
          }}
        >
          <StudentForm mode="create" />
        </div>
      </div>
    </div>
  );
}