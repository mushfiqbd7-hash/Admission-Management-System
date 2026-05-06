// src/components/auth/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, AlertCircle, GraduationCap } from 'lucide-react';
import { authApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');

    try {
      const res = await authApi.login(data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061a33] grid grid-cols-[minmax(0,1fr)_520px] ">
      <div
  className="relative overflow-hidden"
  onMouseMove={(e) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    (e.currentTarget as HTMLDivElement).style.setProperty('--x', `${x}px`);
    (e.currentTarget as HTMLDivElement).style.setProperty('--y', `${y}px`);
  }}
>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=1600&q=90&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#061a33]/60 via-[#061a33]/70 to-[#061a33]" />
        <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 hover:opacity-100"
     style={{
       background: 'radial-gradient(600px at var(--x) var(--y), rgba(37,99,235,0.15), transparent 60%)'
     }}
/>

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0f5bff] shadow-xl">
              <GraduationCap size={28} />
            </div>
            <div>
              <div className="text-[26px] font-black tracking-tight text-white">
  Admission
</div>
              <div className="text-[13px] text-white/70">Management System</div>
            </div>
          </div>

          <div className="max-w-[620px] pb-10">
  <h1 className="m-0 text-[58px] font-black leading-[1.02] tracking-[-0.06em] text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
  Manage student
  <br />
  admissions with
  <br />
  <span className="text-blue-400">confidence.</span>
</h1>

  <p className="mt-5 max-w-[420px] text-[15px] font-medium leading-6 text-white/50 tracking-wide">
  Designed for precision. Built for control.
</p>
</div>
        </div>
      </div>

      <div className="relative flex items-center justify-center bg-[#0b1120] px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(37,99,235,0.18),transparent_45%)]" />

        <div className="relative w-full max-w-[390px] rounded-3xl border border-white/10 bg-white/[0.06] p-9 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition duration-300 hover:border-blue-400/25 hover:bg-white/[0.075] hover:shadow-[0_35px_110px_rgba(37,99,235,0.16)] before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-white/[0.04] before:opacity-0 hover:before:opacity-100 before:transition animate-[float_6s_ease-in-out_infinite]">
          <div className="mb-8">
            <h2 className="m-0 text-[34px] font-black tracking-[-0.05em] text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-[14px] text-white/45">
              Sign in to continue to SAMS.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex gap-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-[13px] leading-6 text-red-200">
              <AlertCircle size={17} className="mt-[2px] shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="mb-4">
              <label className="mb-2 block text-[12px] font-black uppercase tracking-wider text-white/35">
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={`h-12 w-full rounded-2xl border bg-white/[0.06] pl-12 pr-4 text-[14px] text-white outline-none placeholder:text-white/20 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10 ${
                    errors.email ? 'border-red-400/45' : 'border-white/10'
                  }`}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^\S+@\S+\.\S+$/,
                      message: 'Invalid email address',
                    },
                  })}
                />
              </div>

              {errors.email && (
                <p className="mt-2 text-[12px] text-red-300">{errors.email.message}</p>
              )}
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-[12px] font-black uppercase tracking-wider text-white/35">
                Password
              </label>

              <div className="relative">
                <Lock
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`h-12 w-full rounded-2xl border bg-white/[0.06] pl-12 pr-12 text-[14px] text-white outline-none placeholder:text-white/20 focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10 ${
                    errors.password ? 'border-red-400/45' : 'border-white/10'
                  }`}
                  {...register('password', {
                    required: 'Password is required',
                  })}
                />

                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65"
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              {errors.password && (
                <p className="mt-2 text-[12px] text-red-300">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
             className="flex h-12 w-full items-center justify-center rounded-2xl bg-[#0f5bff] text-[14px] font-black text-white shadow-[0_14px_28px_rgba(37,99,235,0.35)] transition duration-200 hover:-translate-y-[1px] hover:bg-blue-500 hover:shadow-[0_18px_36px_rgba(37,99,235,0.45)] disabled:translate-y-0 disabled:opacity-60"
             >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-7 text-center text-[13px] text-white/35">
            No account?{' '}
            <Link to="/register" className="font-black text-blue-300 hover:text-blue-200">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}