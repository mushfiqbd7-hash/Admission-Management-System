// src/components/settings/SettingsPage.tsx
import { useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Mail,
  KeyRound,
  Shield,
  User,
} from 'lucide-react';

import { authApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: any;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/90 px-7 py-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-[#2563eb]">
          <Icon size={24} />
        </div>

        <div className="min-w-0">
          <h3 className="m-0 text-[18px] font-black tracking-[-0.03em] text-slate-950">
            {title}
          </h3>

          {description && (
            <p className="mt-1 text-[14px] font-medium text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="p-7">{children}</div>
    </div>
  );
}

function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-2 block text-[13px] font-bold text-slate-700">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}

function InputField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-12 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-[14px] font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
    />
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563eb] px-6 text-[14px] font-extrabold text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-[14px] w-[14px] animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

export default function SettingsPage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore();

  const [pw, setPw] = useState({
    currentPassword: '',
    newPassword: '',
    confirm: '',
  });

  const [pwError, setPwError] = useState('');

  const [em, setEm] = useState({
    newEmail: '',
    currentPassword: '',
  });

  const [emError, setEmError] = useState('');

  const changePwMutation = useMutation({
    mutationFn: () =>
      authApi.changePassword({
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwError('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: () =>
      authApi.changeEmail({
        newEmail: em.newEmail.trim(),
        currentPassword: em.currentPassword,
      }),
    onSuccess: (res: any) => {
      toast.success('Email updated successfully');

      if (user && accessToken && refreshToken) {
        setAuth(
          { ...user, email: res?.data?.email || em.newEmail.trim() },
          accessToken,
          refreshToken
        );
      }

      setEm({ newEmail: '', currentPassword: '' });
      setEmError('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update email');
    },
  });

  const handleChangePassword = () => {
    if (!pw.currentPassword || !pw.newPassword || !pw.confirm) {
      setPwError('All password fields are required.');
      return;
    }

    if (pw.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }

    if (pw.newPassword !== pw.confirm) {
      setPwError('New password and confirm password do not match.');
      return;
    }

    setPwError('');
    changePwMutation.mutate();
  };

  const handleChangeEmail = () => {
    if (!em.newEmail.trim() || !em.currentPassword) {
      setEmError('Both email and current password are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.newEmail.trim())) {
      setEmError('Please enter a valid email address.');
      return;
    }

    setEmError('');
    changeEmailMutation.mutate();
  };

  const displayName = user?.full_name || (user as any)?.name || 'User';
  const displayRole = user?.role || 'user';
  const displayEmail = user?.email || 'No email';

  const initials = displayName
    .split(' ')
    .map((part: string) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="h-full overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.06),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef3f9_100%)] px-6 py-7">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className="space-y-6">
            <SettingsCard
              icon={User}
              title="Account Information"
              description="Current signed-in user"
            >
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-[78px] w-[78px] items-center justify-center rounded-[24px] bg-[#061a33] text-[30px] font-black text-white shadow-[0_16px_30px_rgba(6,26,51,0.18)]">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[18px] font-black tracking-[-0.03em] text-slate-950">
                      {displayName}
                    </div>

                    <div className="mt-1 truncate text-[14px] font-medium text-slate-500">
                      {displayEmail}
                    </div>

                    <div className="mt-4">
                      <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[12px] font-black capitalize text-[#2563eb]">
                        {displayRole}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={Shield}
              title="System Information"
              description="Application environment"
            >
              <div className="space-y-4">
                {[
                  ['Application', 'SAMS v2.0.0'],
                  ['Backend', 'Node.js + Express'],
                  ['Database', 'PostgreSQL'],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-slate-100 pb-4 last:border-b-0 last:pb-0"
                  >
                    <span className="text-[13px] font-semibold text-slate-500">
                      {label}
                    </span>

                    <span className="rounded-full bg-slate-50 px-3 py-1 font-mono text-[12px] font-black text-slate-800">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </SettingsCard>
          </div>

          <div className="space-y-6">
            <SettingsCard
              icon={Mail}
              title="Change Email Address"
              description="Update your login email securely"
            >
              <div className="space-y-5">
                <div>
                  <FieldLabel required>New Email Address</FieldLabel>
                  <InputField
                    type="email"
                    value={em.newEmail}
                    onChange={(e) =>
                      setEm((prev) => ({ ...prev, newEmail: e.target.value }))
                    }
                    placeholder={displayEmail}
                  />
                </div>

                <div>
                  <FieldLabel required>Current Password</FieldLabel>
                  <InputField
                    type="password"
                    value={em.currentPassword}
                    onChange={(e) =>
                      setEm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                  />
                </div>

                {emError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
                    {emError}
                  </div>
                )}

                <div>
                  <PrimaryButton
                    onClick={handleChangeEmail}
                    disabled={changeEmailMutation.isPending}
                  >
                    {changeEmailMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Spinner />
                        Updating Email...
                      </span>
                    ) : (
                      'Update Email'
                    )}
                  </PrimaryButton>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={KeyRound}
              title="Change Password"
              description="Keep your account protected with a strong password"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <FieldLabel required>Current Password</FieldLabel>
                  <InputField
                    type="password"
                    value={pw.currentPassword}
                    onChange={(e) =>
                      setPw((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                  />
                </div>

                <div>
                  <FieldLabel required>New Password</FieldLabel>
                  <InputField
                    type="password"
                    value={pw.newPassword}
                    onChange={(e) =>
                      setPw((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div>
                  <FieldLabel required>Confirm New Password</FieldLabel>
                  <InputField
                    type="password"
                    value={pw.confirm}
                    onChange={(e) =>
                      setPw((prev) => ({
                        ...prev,
                        confirm: e.target.value,
                      }))
                    }
                    placeholder="Re-enter new password"
                  />
                </div>

                {pwError && (
                  <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
                    {pwError}
                  </div>
                )}

                <div className="md:col-span-2">
                  <PrimaryButton
                    onClick={handleChangePassword}
                    disabled={changePwMutation.isPending}
                  >
                    {changePwMutation.isPending ? (
                      <span className="flex items-center gap-2">
                        <Spinner />
                        Updating Password...
                      </span>
                    ) : (
                      'Update Password'
                    )}
                  </PrimaryButton>
                </div>
              </div>
            </SettingsCard>
          </div>
        </div>
      </div>
    </div>
  );
}