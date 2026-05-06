// src/components/common/FormField.tsx — Phase 1 Design System
import React from 'react';

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, error, children, className }: FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }} className={className}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ fontSize: 11.5, color: '#dc2626', margin: 0 }}>{error}</p>}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}
export function Input({ error, style, ...props }: InputProps) {
  return (
    <input
      className="sams-input"
      style={{ borderColor: error ? '#fca5a5' : undefined, ...style }}
      {...props}
    />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}
export function Select({ error, style, children, ...props }: SelectProps) {
  return (
    <select
      className="sams-select"
      style={{ borderColor: error ? '#fca5a5' : undefined, ...style }}
      {...props}
    >
      {children}
    </select>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}
export function Textarea({ error, style, ...props }: TextareaProps) {
  return (
    <textarea
      className="sams-input"
      style={{ resize: 'none', borderColor: error ? '#fca5a5' : undefined, ...style }}
      {...props}
    />
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}
export function FormSection({ title, children, className }: SectionProps) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }} className={className}>
      <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-sunken)' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy-600)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{title}</span>
      </div>
      <div style={{ padding: '18px 20px' }}>{children}</div>
    </div>
  );
}

export function Grid2({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }} className={className}>
      {children}
    </div>
  );
}

interface BadgeProps { children: React.ReactNode; variant?: 'gray' | 'red' | 'yellow' | 'green' | 'blue' | 'purple'; }
const badgeMap: Record<string, string> = {
  gray:   'badge badge-draft',
  red:    'badge badge-rejected',
  yellow: 'badge badge-pending',
  green:  'badge badge-approved',
  blue:   'badge badge-processing',
  purple: 'badge badge-pre_admission',
};
export function Badge({ children, variant = 'gray' }: BadgeProps) {
  return <span className={badgeMap[variant] || 'badge badge-draft'}>{children}</span>;
}
