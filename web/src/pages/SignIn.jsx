import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_HOME } from '@sptos/shared';
import { useAuth } from '../lib/auth.jsx';
import { ErrorNote } from '../components/ui.jsx';

// Development demo accounts (only loaded when VITE_DEMO_MODE=true in local development)
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const DEMO_ACCOUNTS = DEMO_MODE
  ? [
      {
        name: 'Riya Sharma',
        email: 'riya@sptos.local',
        role: 'Commuter',
        password: import.meta.env.VITE_DEMO_PASSWORD_COMMUTER || 'sptos1234',
      },
      {
        name: 'Suresh Patil',
        email: 'suresh@sptos.local',
        role: 'Driver',
        password: import.meta.env.VITE_DEMO_PASSWORD_DRIVER || 'sptos1234',
      },
      {
        name: 'Meera Nair (Admin)',
        email: 'meera@sptos.local',
        role: 'Administrator',
        password: import.meta.env.VITE_DEMO_PASSWORD_ADMIN || 'sptos1234',
      },
      {
        name: 'Krishna (Admin)',
        email: 'krishna@sptos.local',
        role: 'Administrator',
        password: import.meta.env.VITE_DEMO_PASSWORD_KRISHNA || 'krishnagg',
      },
    ]
  : [];

export function SignIn() {
  const { user, signIn, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from ?? ROLE_HOME[user.role] ?? '/'} replace />;

  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const fieldError = error?.fieldErrors ?? {};

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const nextUser =
        mode === 'signin'
          ? await signIn(form.email, form.password)
          : await register({
              name: form.name,
              email: form.email,
              password: form.password,
              ...(form.phone ? { phone: form.phone } : {}),
            });
      navigate(location.state?.from ?? ROLE_HOME[nextUser.role] ?? '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-600 text-white shadow-lg shadow-brand-500/25 mx-auto">
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" d="M5 16V7.5C5 5.57 8.13 4 12 4s7 1.57 7 3.5V16" />
            <path strokeLinecap="round" d="M5 10h14M7 16v2m10-2v2M7.5 19h1m7 0h1" />
            <circle cx="8" cy="14" r="1" /><circle cx="16" cy="14" r="1" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          {mode === 'signin'
            ? 'Sign in to access your digital tickets, saved stops and live bus alerts.'
            : 'Join BusBuddy for instant mobile boarding passes and arrival notifications.'}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex p-1 bg-slate-200/80 rounded-2xl max-w-xs mx-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => { setMode('signin'); setError(null); }}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            mode === 'signin' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(null); }}
          className={`flex-1 py-2 rounded-xl transition cursor-pointer ${
            mode === 'register' ? 'bg-white text-brand-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Register
        </button>
      </div>

      {/* Form Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-4">
        <form onSubmit={submit} className="space-y-4" noValidate>
          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="name">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                className="field"
                placeholder="Riya Sharma"
                value={form.name}
                onChange={set('name')}
                required
              />
              {fieldError.name && <p className="mt-1 text-xs text-red-600 font-semibold">{fieldError.name}</p>}
            </div>
          )}

          <div>
            <label className="label" htmlFor="email">
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              className="field"
              value={form.email}
              onChange={set('email')}
              required
            />
            {fieldError.email && <p className="mt-1 text-xs text-red-600 font-semibold">{fieldError.email}</p>}
          </div>

          <div>
            <label className="label" htmlFor="password">
              Password *
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              className="field"
              value={form.password}
              onChange={set('password')}
              required
            />
            {fieldError.password && (
              <p className="mt-1 text-xs text-red-600 font-semibold">{fieldError.password}</p>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label className="label" htmlFor="phone">
                Phone Number <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="+91 90000 00000"
                className="field"
                value={form.phone}
                onChange={set('phone')}
              />
            </div>
          )}

          <ErrorNote error={error} />

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3.5 px-6 rounded-2xl bg-brand-700 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Verifying credentials…' : mode === 'signin' ? 'Sign In to Account →' : 'Create Commuter Account →'}
          </button>
        </form>

        {/* Development Only Demo Autofill */}
        {DEMO_ACCOUNTS.length > 0 && (
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-bold uppercase tracking-wider text-[10px] text-brand-700">Dev Testing Accounts</span>
              <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">VITE_DEMO_MODE</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_ACCOUNTS.map((entry) => (
                <button
                  key={entry.email}
                  type="button"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-brand-50/70 hover:border-brand-300 text-left transition cursor-pointer text-xs"
                  onClick={() => {
                    setMode('signin');
                    setForm({ ...form, email: entry.email, password: entry.password });
                  }}
                >
                  <div>
                    <span className="font-bold text-slate-800 block">{entry.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{entry.email}</span>
                  </div>
                  <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 font-bold text-[10px] text-slate-700">
                    Use {entry.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-500">
        <Link to="/" className="font-bold text-brand-700 hover:underline">
          ← Continue exploring as guest
        </Link>
      </p>
    </div>
  );
}

export default SignIn;
