// src/components/inbox/InboxPage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Inbox,
  Info,
  Mail,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

import { api, messagesApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import type { Message, Notification } from '@/types';
import { toast } from 'sonner';

type Tab = 'inbox' | 'sent' | 'notifications';

type AppOption = {
  id: string;
  label: string;
};

type MessageExtra = Message & {
  application_id?: string;
  application_number?: string;
  given_name?: string;
  family_name?: string;
  passport_number?: string;
  sender_role?: string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_role?: string;
  attachments?: Array<{
    id: string;
    original_name: string;
    size: number;
  }>;
};

const timeAgo = (dt?: string) => {
  if (!dt) return '';

  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000);

  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;

  return `${Math.floor(h / 24)}d ago`;
};

const fmtDate = (dt?: string) => {
  if (!dt) return '-';

  return new Date(dt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtSize = (bytes?: number) => {
  const size = Number(bytes || 0);

  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;

  return `${(size / 1024 / 1024).toFixed(1)}MB`;
};

const getInitials = (name?: string) => {
  const clean = String(name || 'User').trim();

  return clean
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

function getSenderName(msg: MessageExtra, tab: Tab, isTeam: boolean) {
  if (tab === 'sent') {
    return (
      msg.recipient_name ||
      msg.recipient_email ||
      (isTeam ? 'Application Owner' : 'Admission Team')
    );
  }

  return msg.sender_name || msg.sender_email || 'Unknown Sender';
}

function getSenderSubtitle(msg: MessageExtra, tab: Tab, isTeam: boolean) {
  if (tab === 'sent') {
    return msg.recipient_role
      ? `To · ${msg.recipient_role}`
      : isTeam
      ? 'To · Application Owner'
      : 'To · Admission Team';
  }

  if (msg.sender_role) return `From · ${msg.sender_role}`;
  return msg.sender_email || 'From · System';
}

function Avatar({ name, size = 38 }: { name?: string; size?: number }) {
  const palette = ['#1e3a5f', '#2563eb', '#4338ca', '#0f766e', '#b45309', '#be123c'];
  const index = (name || 'U').charCodeAt(0) % palette.length;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: palette[index],
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.34,
        fontWeight: 950,
        flexShrink: 0,
        boxShadow: '0 8px 18px rgba(15,23,42,0.12)',
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function NotificationIcon({ type }: { type?: string }) {
  if (type === 'success') {
    return <ShieldCheck size={16} style={{ color: '#16a34a' }} />;
  }

  if (type === 'warning') {
    return <AlertCircle size={16} style={{ color: '#d97706' }} />;
  }

  if (type === 'error') {
    return <AlertCircle size={16} style={{ color: '#dc2626' }} />;
  }

  return <Info size={16} style={{ color: '#2563eb' }} />;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={fieldLabelStyle}>{children}</label>;
}

function EmptyBox({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div style={emptyBoxStyle}>
      <div style={emptyIconStyle}>{icon}</div>
      <div style={emptyTitleStyle}>{title}</div>
      {subtitle && <div style={emptySubtitleStyle}>{subtitle}</div>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ padding: 12 }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} style={skeletonRowStyle}>
          <div style={skeletonAvatarStyle} />
          <div style={{ flex: 1 }}>
            <div style={{ ...skeletonLineStyle, width: '48%' }} />
            <div style={{ ...skeletonLineStyle, width: '78%', marginTop: 8 }} />
            <div style={{ ...skeletonLineStyle, width: '60%', marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InboxPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const isTeam = user?.role === 'admin' || user?.role === 'staff';

  const urlTab = new URLSearchParams(location.search).get('tab') as Tab | null;

  const [tab, setTab] = useState<Tab>(
    urlTab && ['inbox', 'sent', 'notifications'].includes(urlTab) ? urlTab : 'inbox'
  );

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MessageExtra | null>(null);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [composing, setComposing] = useState(false);

  const [appId, setAppId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = new URLSearchParams(location.search).get('tab') as Tab | null;

    if (t && ['inbox', 'sent', 'notifications'].includes(t)) {
      setTab(t);
      setSelected(null);
      setSelectedNotif(null);
      setComposing(false);
    }
  }, [location.search]);

  const resetCompose = useCallback(() => {
    setAppId('');
    setSubject('');
    setBody('');
    setFiles([]);
    setComposing(false);
  }, []);

  const openTab = (nextTab: Tab) => {
    setTab(nextTab);
    setSelected(null);
    setSelectedNotif(null);
    setComposing(false);
    setSearch('');
    navigate(nextTab === 'inbox' ? '/inbox' : `/inbox?tab=${nextTab}`);
  };

  const startCompose = () => {
    setSelected(null);
    setSelectedNotif(null);
    setComposing(true);
  };

  const { data: inbox = [], isLoading: loadingInbox } = useQuery<Message[]>({
    queryKey: ['messages', 'inbox'],
    queryFn: () => messagesApi.inbox().then((r) => r.data),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: sent = [], isLoading: loadingSent } = useQuery<Message[]>({
    queryKey: ['messages', 'sent'],
    queryFn: () => messagesApi.sent().then((r) => r.data),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: notifications = [], isLoading: loadingNotifications } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => messagesApi.notifications().then((r) => r.data),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const { data: apps = [] } = useQuery<AppOption[]>({
    queryKey: ['messages-applications'],
    queryFn: () => messagesApi.applications().then((r) => r.data),
    enabled: composing,
  });

  const sendMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();

      fd.append('application_id', appId);
      fd.append('subject', subject);
      fd.append('body', body);

      files.forEach((file) => fd.append('attachments', file));

      return messagesApi.send(fd);
    },
    onSuccess: () => {
      toast.success('Message sent');
      resetCompose();
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to send message';

      toast.error(msg);
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => messagesApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages', 'inbox'] }),
  });

  const markNotifReadMutation = useMutation({
    mutationFn: (id: string) => messagesApi.markNotifRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllNotifsRead = useMutation({
    mutationFn: () => messagesApi.markAllNotifsRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read');
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => messagesApi.deleteMessage(id),
    onSuccess: () => {
      toast.success('Message deleted');
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: () => toast.error('Failed to delete message'),
  });

  const query = search.trim().toLowerCase();

  const filteredInbox = useMemo(
    () =>
      (inbox as MessageExtra[]).filter((m) => {
        if (!query) return true;

        return [
          m.subject,
          m.sender_name,
          m.sender_email,
          m.sender_role,
          m.body,
          m.application_number,
          m.given_name,
          m.family_name,
          m.passport_number,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      }),
    [inbox, query]
  );

  const filteredSent = useMemo(
    () =>
      (sent as MessageExtra[]).filter((m) => {
        if (!query) return true;

        return [
          m.subject,
          m.recipient_name,
          m.recipient_email,
          m.recipient_role,
          m.body,
          m.application_number,
          m.given_name,
          m.family_name,
          m.passport_number,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      }),
    [sent, query]
  );

  const filteredNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        if (!query) return true;

        return [n.message, n.type, n.application_id]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      }),
    [notifications, query]
  );

  const currentMessages = tab === 'inbox' ? filteredInbox : filteredSent;
  const currentLoading =
    tab === 'inbox' ? loadingInbox : tab === 'sent' ? loadingSent : loadingNotifications;

  const unreadMessages = inbox.filter((m) => !m.is_read).length;
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  const canSend = Boolean(appId && subject.trim() && body.trim() && !sendMutation.isPending);

  const openMessage = (msg: MessageExtra) => {
    setSelected(msg);
    setSelectedNotif(null);
    setComposing(false);

    if (tab === 'inbox' && !msg.is_read) {
      markReadMutation.mutate(msg.id);
    }
  };

  const openNotification = (notif: Notification) => {
    setSelected(null);
    setSelectedNotif(notif);
    setComposing(false);

    if (!notif.is_read) {
      markNotifReadMutation.mutate(notif.id);
    }
  };

  const handleDownload = async (attId: string, name: string) => {
    try {
      const res = await api.get(`/messages/attachments/${attId}`, {
        responseType: 'blob',
      });

      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');

      link.href = url;
      link.download = name;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const prepareReply = (msg: MessageExtra) => {
    setAppId(msg.application_id || '');
    setSubject(msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject || ''}`);
    setBody('');
    setFiles([]);
    setSelected(null);
    setSelectedNotif(null);
    setComposing(true);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected]);

  const tabs = [
    {
      id: 'inbox' as Tab,
      label: 'Inbox',
      icon: Inbox,
      count: inbox.length,
      badge: unreadMessages,
    },
    {
      id: 'sent' as Tab,
      label: 'Sent',
      icon: Mail,
      count: sent.length,
      badge: 0,
    },
    {
      id: 'notifications' as Tab,
      label: 'Notifications',
      icon: Bell,
      count: notifications.length,
      badge: unreadNotifications,
    },
  ];

  return (
    <div style={pageStyle}>
      {/* LEFT FOLDER RAIL */}
      <aside style={folderRailStyle}>
        <div style={railHeaderStyle}>
          <button onClick={startCompose} style={composePrimaryBtnStyle}>
            <Plus size={16} />
            Compose
          </button>
        </div>

        <div style={folderListStyle}>
          {tabs.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => openTab(item.id)}
                style={{
                  ...folderBtnStyle,
                  background: active ? '#eff6ff' : 'transparent',
                  borderColor: active ? '#bfdbfe' : 'transparent',
                  color: active ? '#1d4ed8' : '#64748b',
                }}
              >
                <span style={folderIconWrapStyle}>
                  <Icon size={16} />
                </span>

                <span style={{ flex: 1 }}>{item.label}</span>

                {item.badge > 0 ? (
                  <span style={folderBadgeStyle}>{item.badge > 99 ? '99+' : item.badge}</span>
                ) : (
                  <span style={folderCountStyle}>{item.count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={railHelperCardStyle}>
          <MessageSquare size={18} style={{ color: '#2563eb' }} />
          <div>
            <div style={helperTitleStyle}>Admission Mailbox</div>
            <div style={helperTextStyle}>
              Track student questions, team replies, and system alerts from one place.
            </div>
          </div>
        </div>
      </aside>

      {/* MIDDLE MESSAGE LIST */}
      <section style={messageListPanelStyle}>
        <div style={listHeaderStyle}>
          <div>
            <div style={listTitleStyle}>
              {tab === 'inbox' ? 'Inbox' : tab === 'sent' ? 'Sent Mail' : 'Notifications'}
            </div>
            <div style={listSubtitleStyle}>
              {tab === 'notifications'
                ? `${filteredNotifications.length} notification${
                    filteredNotifications.length !== 1 ? 's' : ''
                  }`
                : `${currentMessages.length} message${currentMessages.length !== 1 ? 's' : ''}`}
            </div>
          </div>

          {tab === 'notifications' && unreadNotifications > 0 && (
            <button onClick={() => markAllNotifsRead.mutate()} style={markAllBtnStyle}>
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>

        <div style={searchBoxStyle}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === 'notifications'
                ? 'Search notifications...'
                : 'Search sender, subject, application...'
            }
            style={searchInputStyle}
          />

          {search && (
            <button onClick={() => setSearch('')} style={clearSearchStyle}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={listScrollStyle}>
          {currentLoading ? (
            <SkeletonList />
          ) : tab === 'notifications' ? (
            filteredNotifications.length === 0 ? (
              <EmptyBox
                icon={<Bell size={24} style={{ color: '#94a3b8' }} />}
                title="No notifications"
                subtitle="System alerts and application updates will appear here."
              />
            ) : (
              filteredNotifications.map((item) => {
                const active = selectedNotif?.id === item.id;
                const unread = !item.is_read;

                return (
                  <button
                    key={item.id}
                    onClick={() => openNotification(item)}
                    style={{
                      ...messageRowStyle,
                      background: active ? '#eff6ff' : unread ? '#f8fbff' : '#ffffff',
                      borderColor: active ? '#bfdbfe' : '#e8edf4',
                      boxShadow: active ? '0 10px 24px rgba(37,99,235,0.10)' : 'none',
                    }}
                  >
                    <div style={messageRowLeftStyle}>
                      <div style={notifIconBoxStyle}>
                        <NotificationIcon type={item.type} />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={messageTopLineStyle}>
                          <span
                            style={{
                              ...messageSenderStyle,
                              fontWeight: unread ? 950 : 750,
                            }}
                          >
                            System Notification
                          </span>

                          <span style={messageTimeStyle}>{timeAgo(item.created_at)}</span>
                        </div>

                        <div
                          style={{
                            ...messageSubjectStyle,
                            fontWeight: unread ? 900 : 700,
                          }}
                        >
                          {item.message}
                        </div>

                        <div style={messagePreviewStyle}>
                          {item.application_id
                            ? `Related application: ${item.application_id}`
                            : 'General platform notification'}
                        </div>
                      </div>

                      {unread && <span style={unreadDotStyle} />}
                    </div>
                  </button>
                );
              })
            )
          ) : currentMessages.length === 0 ? (
            <EmptyBox
              icon={<MessageSquare size={24} style={{ color: '#94a3b8' }} />}
              title={tab === 'inbox' ? 'Your inbox is empty' : 'No sent messages'}
              subtitle={
                tab === 'inbox'
                  ? 'New messages from students, agents, or staff will appear here.'
                  : 'Messages you send will be listed here.'
              }
            />
          ) : (
            currentMessages.map((raw) => {
              const msg = raw as MessageExtra;
              const active = selected?.id === msg.id;
              const unread = tab === 'inbox' && !msg.is_read;
              const senderName = getSenderName(msg, tab, isTeam);
              const senderSubtitle = getSenderSubtitle(msg, tab, isTeam);

              return (
                <button
                  key={msg.id}
                  onClick={() => openMessage(msg)}
                  style={{
                    ...messageRowStyle,
                    background: active ? '#eff6ff' : unread ? '#f8fbff' : '#ffffff',
                    borderColor: active ? '#bfdbfe' : '#e8edf4',
                    boxShadow: active ? '0 10px 24px rgba(37,99,235,0.10)' : 'none',
                  }}
                >
                  <div style={messageRowLeftStyle}>
                    <Avatar name={senderName} size={42} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={messageTopLineStyle}>
                        <span
                          style={{
                            ...messageSenderStyle,
                            fontWeight: unread ? 950 : 800,
                          }}
                        >
                          {senderName}
                        </span>

                        <span style={messageTimeStyle}>{timeAgo(msg.created_at)}</span>
                      </div>

                      <div style={senderSubtitleStyle}>{senderSubtitle}</div>

                      <div
                        style={{
                          ...messageSubjectStyle,
                          fontWeight: unread ? 950 : 800,
                        }}
                      >
                        {msg.subject || '(no subject)'}
                      </div>

                      <div style={messagePreviewStyle}>{msg.body || 'No message content'}</div>

                      <div style={messageMetaRowStyle}>
                        {msg.application_number && (
                          <span style={appBadgeStyle}>{msg.application_number}</span>
                        )}

                        {msg.attachments?.length ? (
                          <span style={attachmentBadgeStyle}>
                            <Paperclip size={11} />
                            {msg.attachments.length}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {unread && <span style={unreadDotStyle} />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* RIGHT READING / COMPOSE PANE */}
      <main style={readerPaneStyle}>
        {composing ? (
          <div style={composeCardStyle}>
            <div style={composeHeaderStyle}>
              <div>
                <div style={composeTitleStyle}>New Message</div>
                <div style={composeSubtitleStyle}>
                  {isTeam ? 'Send a message to an application owner.' : 'Send a message to the Admission Team.'}
                </div>
              </div>

              <button onClick={resetCompose} style={iconBtnStyle}>
                <X size={17} />
              </button>
            </div>

            <div style={composeBodyStyle}>
              <div>
                <FieldLabel>
                  Application <span style={{ color: '#ef4444' }}>*</span>
                </FieldLabel>

                <select
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">Select an application...</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.label}
                    </option>
                  ))}
                </select>

                <div style={helpTextStyle}>
                  {isTeam
                    ? 'The message will be connected with the selected application.'
                    : 'Your message will be sent to the Admission Team for the selected application.'}
                </div>
              </div>

              <div>
                <FieldLabel>
                  Subject <span style={{ color: '#ef4444' }}>*</span>
                </FieldLabel>

                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject..."
                  style={inputStyle}
                />
              </div>

              <div>
                <FieldLabel>
                  Message <span style={{ color: '#ef4444' }}>*</span>
                </FieldLabel>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  rows={9}
                  style={{
                    ...inputStyle,
                    resize: 'none',
                    lineHeight: 1.65,
                    paddingTop: 12,
                  }}
                />
              </div>

              <div>
                <FieldLabel>
                  Attachments{' '}
                  <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                    optional, max 5
                  </span>
                </FieldLabel>

                <div style={attachmentStackStyle}>
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} style={fileChipStyle}>
                      <Paperclip size={14} style={{ color: '#64748b' }} />

                      <span style={fileNameStyle}>{file.name}</span>

                      <span style={fileSizeStyle}>{fmtSize(file.size)}</span>

                      <button
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        style={fileRemoveBtnStyle}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={attachBtnStyle}
                  >
                    <Paperclip size={15} />
                    Attach files
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={(e) => {
                      const chosen = Array.from(e.target.files || []);
                      setFiles((prev) => [...prev, ...chosen].slice(0, 5));
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={composeFooterStyle}>
              <button onClick={resetCompose} style={discardBtnStyle}>
                Discard
              </button>

              <button
                onClick={() => sendMutation.mutate()}
                disabled={!canSend}
                style={{
                  ...sendBtnStyle,
                  opacity: canSend ? 1 : 0.55,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                }}
              >
                <Send size={15} />
                {sendMutation.isPending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        ) : selected ? (
          <div style={readCardStyle}>
            {(() => {
              const msg = selected;
              const senderName = getSenderName(msg, tab, isTeam);
              const senderSubtitle = getSenderSubtitle(msg, tab, isTeam);

              return (
                <>
                  <div style={readHeaderStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={readSubjectStyle}>{msg.subject || '(no subject)'}</div>

                      <div style={readMetaBlockStyle}>
                        <Avatar name={senderName} size={46} />

                        <div style={{ minWidth: 0 }}>
                          <div style={readSenderStyle}>
                            {senderName}

                            {msg.sender_role && tab === 'inbox' && (
                              <span style={readRoleStyle}>({msg.sender_role})</span>
                            )}

                            {msg.recipient_role && tab === 'sent' && (
                              <span style={readRoleStyle}>({msg.recipient_role})</span>
                            )}
                          </div>

                          <div style={readSubMetaStyle}>{senderSubtitle}</div>

                          <div style={readDateStyle}>
                            <Clock size={12} />
                            {fmtDate(msg.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={readActionsStyle}>
                      <button
                        onClick={() => prepareReply(msg)}
                        style={replyBtnStyle}
                      >
                        <ChevronRight size={15} />
                        Reply
                      </button>

                      <button
                        onClick={() => deleteMutation.mutate(msg.id)}
                        style={deleteBtnStyle}
                        title="Delete message"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        onClick={() => setSelected(null)}
                        style={iconBtnStyle}
                        title="Close"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {(msg.application_number || msg.given_name || msg.passport_number) && (
                    <div style={applicationInfoStyle}>
                      <FileText size={16} style={{ color: '#2563eb' }} />

                      <div>
                        <div style={appInfoTitleStyle}>
                          {msg.application_number || 'Application'}
                        </div>

                        {(msg.given_name || msg.family_name || msg.passport_number) && (
                          <div style={appInfoTextStyle}>
                            {[`${msg.given_name || ''} ${msg.family_name || ''}`.trim(), msg.passport_number]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={readMessageBodyStyle}>
                    {(msg.body || '').split('\n').map((line, index) => (
                      <p key={index} style={readParagraphStyle}>
                        {line || '\u00A0'}
                      </p>
                    ))}

                    <div ref={bottomRef} />
                  </div>

                  {msg.attachments?.length ? (
                    <div style={readAttachmentsStyle}>
                      <div style={attachmentsTitleStyle}>
                        <Paperclip size={15} />
                        Attachments
                      </div>

                      <div style={attachmentGridStyle}>
                        {msg.attachments.map((att) => (
                          <button
                            key={att.id}
                            onClick={() => handleDownload(att.id, att.original_name)}
                            style={downloadAttachmentStyle}
                          >
                            <div style={downloadIconStyle}>
                              <Paperclip size={15} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={downloadNameStyle}>{att.original_name}</div>
                              <div style={downloadSizeStyle}>{fmtSize(att.size)}</div>
                            </div>

                            <Download size={16} style={{ color: '#2563eb' }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </div>
        ) : selectedNotif ? (
          <div style={readCardStyle}>
            <div style={readHeaderStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={notificationLargeIconStyle}>
                  <NotificationIcon type={selectedNotif.type} />
                </div>

                <div>
                  <div style={readSubjectStyle}>Notification</div>
                  <div style={readDateStyle}>
                    <Clock size={12} />
                    {fmtDate(selectedNotif.created_at)}
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedNotif(null)} style={iconBtnStyle}>
                <X size={16} />
              </button>
            </div>

            <div style={notificationReadBodyStyle}>
              <p style={notificationReadTextStyle}>{selectedNotif.message}</p>

              {selectedNotif.application_id && (
                <div style={applicationInfoStyle}>
                  <FileText size={16} style={{ color: '#2563eb' }} />
                  <div>
                    <div style={appInfoTitleStyle}>Related Application</div>
                    <div style={appInfoTextStyle}>{selectedNotif.application_id}</div>
                  </div>
                </div>
              )}

              {(selectedNotif.link || selectedNotif.application_id) && (
                <button
                  onClick={() =>
                    navigate(
                      selectedNotif.link ||
                        (selectedNotif.application_id
                          ? `/students/${selectedNotif.application_id}`
                          : '/inbox')
                    )
                  }
                  style={openRelatedBtnStyle}
                >
                  Open related page
                  <ChevronRight size={15} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <EmptyBox
            icon={<MessageSquare size={34} style={{ color: '#2563eb' }} />}
            title="Select a message to read"
            subtitle="Choose a message from the list, or compose a new message to the Admission Team."
            action={
              <button onClick={startCompose} style={emptyComposeBtnStyle}>
                <Plus size={16} />
                Compose Message
              </button>
            }
          />
        )}
      </main>
    </div>
  );
}

/* ------------------------- Styles ------------------------- */

const pageStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  display: 'grid',
  gridTemplateColumns: '250px 390px minmax(0, 1fr)',
  background:
    'radial-gradient(circle at top left, rgba(37,99,235,0.06), transparent 34%), linear-gradient(180deg, #f8fafc 0%, #eef3f9 100%)',
};

const folderRailStyle: CSSProperties = {
  background: '#ffffff',
  borderRight: '1px solid #e5eaf2',
  padding: '18px 16px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  overflow: 'hidden',
};

const railHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  flexShrink: 0,
};

const composePrimaryBtnStyle: CSSProperties = {
  width: '100%',
  height: 50,
  borderRadius: 16,
  border: 'none',
  background: '#1e3a5f',
  color: '#ffffff',
  fontSize: 14.5,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  boxShadow: '0 12px 24px rgba(30,58,95,0.22)',
};

const folderListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const folderBtnStyle: CSSProperties = {
  width: '100%',
  height: 52,
  borderRadius: 16,
  border: '1px solid transparent',
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 13px',
  cursor: 'pointer',
  fontSize: 13.5,
  fontWeight: 900,
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
};

const folderIconWrapStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const folderBadgeStyle: CSSProperties = {
  minWidth: 22,
  height: 22,
  padding: '0 7px',
  borderRadius: 999,
  background: '#ef4444',
  color: '#ffffff',
  fontSize: 11,
  fontWeight: 950,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const folderCountStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 900,
};

const railHelperCardStyle: CSSProperties = {
  marginTop: 'auto',
  borderRadius: 18,
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  padding: 14,
  display: 'flex',
  gap: 10,
  alignItems: 'flex-start',
};

const helperTitleStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 950,
  color: '#1e3a8a',
};

const helperTextStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 11.5,
  fontWeight: 650,
  lineHeight: 1.45,
  color: '#64748b',
};

const messageListPanelStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.78)',
  borderRight: '1px solid #e5eaf2',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
  backdropFilter: 'blur(10px)',
};

const listHeaderStyle: CSSProperties = {
  padding: '18px 18px 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexShrink: 0,
};

const listTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.035em',
};

const listSubtitleStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12.5,
  color: '#94a3b8',
  fontWeight: 800,
};

const markAllBtnStyle: CSSProperties = {
  height: 32,
  padding: '0 10px',
  borderRadius: 10,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 11.5,
  fontWeight: 900,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'inherit',
};

const searchBoxStyle: CSSProperties = {
  position: 'relative',
  margin: '0 18px 12px',
  flexShrink: 0,
};

const searchInputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  padding: '0 38px 0 40px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 700,
  color: '#334155',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const clearSearchStyle: CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'transparent',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'inline-flex',
  padding: 0,
};

const listScrollStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  padding: '0 12px 14px',
};

const messageRowStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #e8edf4',
  borderRadius: 16,
  marginBottom: 10,
  padding: 13,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
};

const messageRowLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
};

const messageTopLineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
};

const messageSenderStyle: CSSProperties = {
  fontSize: 13,
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const messageTimeStyle: CSSProperties = {
  fontSize: 11,
  color: '#94a3b8',
  fontWeight: 800,
  flexShrink: 0,
};

const senderSubtitleStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 11.5,
  color: '#94a3b8',
  fontWeight: 800,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const messageSubjectStyle: CSSProperties = {
  marginTop: 7,
  fontSize: 13,
  color: '#1e293b',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const messagePreviewStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 12,
  color: '#64748b',
  lineHeight: 1.4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const messageMetaRowStyle: CSSProperties = {
  marginTop: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
};

const appBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 22,
  borderRadius: 999,
  padding: '0 8px',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  color: '#1d4ed8',
  fontSize: 10.5,
  fontWeight: 950,
  fontFamily: 'Inter, sans-serif',
};

const attachmentBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 22,
  borderRadius: 999,
  padding: '0 8px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  color: '#64748b',
  fontSize: 10.5,
  fontWeight: 900,
};

const unreadDotStyle: CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: '50%',
  background: '#2563eb',
  flexShrink: 0,
  marginTop: 7,
};

const notifIconBoxStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 13,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const readerPaneStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  overflowY: 'auto',
  padding: 24,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
};

const composeCardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 820,
  background: '#ffffff',
  border: '1px solid #e5eaf2',
  borderRadius: 24,
  boxShadow: '0 22px 50px rgba(15,23,42,0.09)',
  overflow: 'hidden',
};

const composeHeaderStyle: CSSProperties = {
  padding: '22px 24px',
  borderBottom: '1px solid #e8edf4',
  background: '#fbfdff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
};

const composeTitleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.035em',
};

const composeSubtitleStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 13,
  color: '#94a3b8',
  fontWeight: 700,
};

const composeBodyStyle: CSSProperties = {
  padding: 24,
  display: 'flex',
  flexDirection: 'column',
  gap: 18,
};

const composeFooterStyle: CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid #e8edf4',
  background: '#fbfdff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
};

const fieldLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 7,
  fontSize: 12,
  fontWeight: 950,
  color: '#475569',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 46,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  padding: '0 14px',
  outline: 'none',
  fontSize: 13.5,
  fontWeight: 700,
  color: '#0f172a',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const helpTextStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 12,
  fontWeight: 650,
  color: '#94a3b8',
};

const attachmentStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const fileChipStyle: CSSProperties = {
  height: 42,
  borderRadius: 13,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  padding: '0 11px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const fileNameStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 12.5,
  fontWeight: 800,
  color: '#334155',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const fileSizeStyle: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 800,
  color: '#94a3b8',
};

const fileRemoveBtnStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'inline-flex',
  padding: 2,
};

const attachBtnStyle: CSSProperties = {
  height: 44,
  borderRadius: 14,
  border: '1.5px dashed #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const discardBtnStyle: CSSProperties = {
  height: 42,
  padding: '0 18px',
  borderRadius: 13,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#64748b',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const sendBtnStyle: CSSProperties = {
  height: 42,
  padding: '0 20px',
  borderRadius: 13,
  border: 'none',
  background: '#1e3a5f',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 950,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'inherit',
  boxShadow: '0 12px 24px rgba(30,58,95,0.22)',
};

const readCardStyle: CSSProperties = {
  width: '100%',
  maxWidth: 860,
  background: '#ffffff',
  border: '1px solid #e5eaf2',
  borderRadius: 24,
  boxShadow: '0 22px 50px rgba(15,23,42,0.09)',
  overflow: 'hidden',
};

const readHeaderStyle: CSSProperties = {
  padding: '24px 26px',
  borderBottom: '1px solid #e8edf4',
  background: '#fbfdff',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 18,
};

const readSubjectStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.045em',
  lineHeight: 1.2,
};

const readMetaBlockStyle: CSSProperties = {
  marginTop: 18,
  display: 'flex',
  alignItems: 'center',
  gap: 13,
};

const readSenderStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 950,
  color: '#0f172a',
};

const readRoleStyle: CSSProperties = {
  marginLeft: 7,
  fontSize: 12,
  fontWeight: 800,
  color: '#94a3b8',
  textTransform: 'capitalize',
};

const readSubMetaStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12.5,
  fontWeight: 750,
  color: '#64748b',
};

const readDateStyle: CSSProperties = {
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  fontSize: 12,
  fontWeight: 750,
  color: '#94a3b8',
};

const readActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
};

const replyBtnStyle: CSSProperties = {
  height: 36,
  padding: '0 13px',
  borderRadius: 12,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 12.5,
  fontWeight: 950,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const iconBtnStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#64748b',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const deleteBtnStyle: CSSProperties = {
  ...iconBtnStyle,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
};

const applicationInfoStyle: CSSProperties = {
  margin: '18px 26px 0',
  borderRadius: 16,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  padding: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const appInfoTitleStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 950,
  color: '#1d4ed8',
  fontFamily: 'Inter, sans-serif',
};

const appInfoTextStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12,
  fontWeight: 750,
  color: '#64748b',
};

const readMessageBodyStyle: CSSProperties = {
  padding: '24px 30px',
  color: '#334155',
};

const readParagraphStyle: CSSProperties = {
  margin: '0 0 12px',
  fontSize: 14,
  lineHeight: 1.75,
  fontWeight: 650,
  color: '#334155',
};

const readAttachmentsStyle: CSSProperties = {
  padding: '0 26px 26px',
};

const attachmentsTitleStyle: CSSProperties = {
  marginBottom: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 13,
  fontWeight: 950,
  color: '#475569',
};

const attachmentGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 10,
};

const downloadAttachmentStyle: CSSProperties = {
  height: 62,
  borderRadius: 16,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  padding: '0 13px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
};

const downloadIconStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 13,
  background: '#eff6ff',
  color: '#2563eb',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const downloadNameStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 950,
  color: '#334155',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const downloadSizeStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 11.5,
  fontWeight: 750,
  color: '#94a3b8',
};

const notificationLargeIconStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 16,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const notificationReadBodyStyle: CSSProperties = {
  padding: 28,
};

const notificationReadTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 15,
  lineHeight: 1.75,
  color: '#334155',
  fontWeight: 700,
};

const openRelatedBtnStyle: CSSProperties = {
  marginTop: 20,
  height: 42,
  padding: '0 16px',
  borderRadius: 13,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const emptyBoxStyle: CSSProperties = {
  width: '100%',
  minHeight: 260,
  padding: 30,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
};

const emptyIconStyle: CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 24,
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.035em',
};

const emptySubtitleStyle: CSSProperties = {
  marginTop: 7,
  maxWidth: 360,
  fontSize: 13,
  lineHeight: 1.6,
  fontWeight: 700,
  color: '#94a3b8',
};

const emptyComposeBtnStyle: CSSProperties = {
  height: 44,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: '#1e3a5f',
  color: '#ffffff',
  fontSize: 13.5,
  fontWeight: 950,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 12px 24px rgba(30,58,95,0.24)',
};

const skeletonRowStyle: CSSProperties = {
  display: 'flex',
  gap: 12,
  borderRadius: 16,
  border: '1px solid #e8edf4',
  background: '#ffffff',
  padding: 13,
  marginBottom: 10,
};

const skeletonAvatarStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  background: '#e2e8f0',
  flexShrink: 0,
};

const skeletonLineStyle: CSSProperties = {
  height: 11,
  borderRadius: 999,
  background: '#e2e8f0',
};