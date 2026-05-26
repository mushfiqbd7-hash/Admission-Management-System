// src/components/layout/HeaderRealtimeActions.tsx
import { useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { Bell, Mail } from 'lucide-react';

import { messagesApi } from '@/api/client';

type HeaderMessage = {
  id: string;
  is_read?: boolean;
};

type HeaderNotification = {
  id: string;
  is_read?: boolean;
};

function toArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.messages)) return value.messages;
  if (Array.isArray(value?.notifications)) return value.notifications;
  return [];
}

function Badge({ count }: { count: number }) {
  if (!count) return null;

  return (
    <span style={badgeStyle}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function HeaderButton({
  title,
  count,
  onClick,
  children,
}: {
  title: string;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : 'var(--surface-raised)';
        e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
        e.currentTarget.style.color = dark ? '#ffffff' : 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
    >
      {children}
      <Badge count={count} />
    </button>
  );
}

export default function HeaderRealtimeActions() {
  const navigate = useNavigate();

  const { data: inbox = [] } = useQuery<HeaderMessage[]>({
    queryKey: ['header-inbox'],
    queryFn: async () => {
      const res = await messagesApi.inbox();
      return toArray<HeaderMessage>(res.data);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const { data: notifications = [] } = useQuery<HeaderNotification[]>({
    queryKey: ['header-notifications'],
    queryFn: async () => {
      const res = await messagesApi.notifications();
      return toArray<HeaderNotification>(res.data);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const unreadMessages = useMemo(
    () => inbox.filter((m) => !m.is_read).length,
    [inbox]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  return (
    <div style={wrapStyle}>
      <HeaderButton
        title={
          unreadNotifications
            ? `${unreadNotifications} unread notifications`
            : 'Notifications'
        }
        count={unreadNotifications}
        onClick={() => navigate('/inbox?tab=notifications')}
      >
        <Bell size={17} />
      </HeaderButton>

      <HeaderButton
        title={
          unreadMessages
            ? `${unreadMessages} unread messages`
            : 'Messages'
        }
        count={unreadMessages}
        onClick={() => navigate('/inbox')}
      >
        <Mail size={17} />
      </HeaderButton>
    </div>
  );
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const buttonStyle: CSSProperties = {
  position: 'relative',
  width: 40,
  height: 40,
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--text-secondary)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: 'none',
  transition: 'all 0.16s ease',
};

const badgeStyle: CSSProperties = {
  position: 'absolute',
  top: -5,
  right: -5,
  minWidth: 18,
  height: 18,
  padding: '0 5px',
  borderRadius: 999,
  background: '#ef4444',
  color: '#ffffff',
  border: '2px solid var(--surface)',
  fontSize: 9.5,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  animation: 'pulse-badge 2.4s ease-in-out infinite',
};
