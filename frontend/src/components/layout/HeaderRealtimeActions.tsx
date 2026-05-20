// src/components/layout/HeaderRealtimeActions.tsx
import { useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
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
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 10px 22px rgba(15,23,42,0.12)';
        e.currentTarget.style.borderColor = '#bfdbfe';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 18px rgba(15,23,42,0.08)';
        e.currentTarget.style.borderColor = '#e2e8f0';
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
        <Bell size={21} />
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
        <Mail size={21} />
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
  width: 54,
  height: 54,
  borderRadius: 18,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#1e3a5f',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 8px 18px rgba(15,23,42,0.08)',
  transition: 'all 0.16s ease',
};

const badgeStyle: CSSProperties = {
  position: 'absolute',
  top: -6,
  right: -6,
  minWidth: 21,
  height: 21,
  padding: '0 6px',
  borderRadius: 999,
  background: '#ef4444',
  color: '#ffffff',
  border: '2px solid #ffffff',
  fontSize: 10.5,
  fontWeight: 950,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
};