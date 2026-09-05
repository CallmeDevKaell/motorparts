import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../services/supabase';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const detectRecoverySession = async () => {
      const params = new URLSearchParams(window.location.search);
      const hasSetupMode = params.get('mode') === 'set-password';

      const { data: sessionData } = await supabase.auth.getSession();
      const hasSession = Boolean(sessionData?.session);

      if (hasSetupMode || hasSession) {
        // We only show the password form for an explicit setup/recovery flow.
        if (hasSetupMode) setIsRecoveryMode(true);
      }
    };

    detectRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setError('');
        setRecoveryMessage('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let loginEmail = identifier.trim();

      if (!loginEmail.includes('@')) {
        const { data: userRow, error: lookupError } = await supabase
          .from('users')
          .select('email')
          .eq('username', loginEmail.toLowerCase())
          .maybeSingle();

        if (lookupError || !userRow?.email) {
          throw new Error('Invalid username or password.');
        }

        loginEmail = userRow.email;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (signInError) throw new Error(signInError.message);
      if (!data?.user) throw new Error('No user data received. Please check your credentials.');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, is_approved')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        throw new Error('User account not found in system. Please contact admin.');
      }

      if (!userData.is_approved) {
        await supabase.auth.signOut();
        throw new Error('Your account is pending approval. Please wait for admin confirmation.');
      }

      switch (userData.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'employee':
          navigate('/employee/dashboard');
          break;
        case 'client':
          navigate('/client/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setRecoveryMessage('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setRecoveryMessage('✅ Your password has been set successfully. Redirecting to sign in...');

      await supabase.auth.signOut();

      setTimeout(() => {
        setIsRecoveryMode(false);
        setNewPassword('');
        setConfirmNewPassword('');
        setRecoveryMessage('');
        window.history.replaceState({}, '', '/login');
        navigate('/login');
      }, 1200);
    } catch (err) {
      console.error('Password setup error:', err);
      setError(err.message || 'Unable to set your password. Please request a new setup link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_42%,_#e2e8f0)] px-4 py-8 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative overflow-hidden rounded-[28px] bg-slate-950 p-8 text-white shadow-2xl lg:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.3),transparent_45%,rgba(14,165,233,0.22))]" />
          <div className="relative">
            <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-1 text-sm font-semibold backdrop-blur">
              Secure Account Access
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight lg:text-5xl">
              Motor Parts
              <span className="block text-blue-300">
                {isRecoveryMode ? 'Set your password.' : 'Management System.'}
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 lg:text-base">
              {isRecoveryMode
                ? 'Your account has been approved. Create your personal password to finish activating your account.'
                : 'Sign in securely as an admin, employee, or client and continue to your workspace.'}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-2xl">👑</p>
                <p className="mt-2 text-sm font-semibold">Admin</p>
                <p className="mt-1 text-xs text-slate-300">Approvals, reports, and account management.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-2xl">🏍️</p>
                <p className="mt-2 text-sm font-semibold">Employee</p>
                <p className="mt-1 text-xs text-slate-300">Products, orders, and client handling.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-2xl">🧾</p>
                <p className="mt-2 text-sm font-semibold">Client</p>
                <p className="mt-1 text-xs text-slate-300">Browse items and review receipts.</p>
              </div>
            </div>

            <div className="mt-10 rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-200">
                Account Flow
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Register → Admin Approval → Approval Email → Set Password → Sign In
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-xl backdrop-blur lg:p-8">
          {!isRecoveryMode ? (
            <>
              <div className="mb-8 border-b border-slate-200 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Welcome Back
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">Sign In</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Enter your username or email and password to continue.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Username or Email
                  </label>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="Enter your username or email"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-900 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
                <Link to="/" className="font-medium text-blue-600 hover:underline">
                  ← Back to Home
                </Link>
                <p>
                  Don't have an account?{' '}
                  <Link to="/register" className="font-semibold text-blue-600 hover:underline">
                    Register here
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 border-b border-slate-200 pb-5">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  🔐
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Account Approved
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-900">Set Your Password</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Create a new password for your Motor Parts account. You will use this password
                  for future sign-ins.
                </p>
              </div>

              <form onSubmit={handleSetPassword} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="At least 8 characters"
                    minLength="8"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    placeholder="Re-enter your password"
                    minLength="8"
                    required
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {recoveryMessage && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {recoveryMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Saving Password...' : 'Set Password'}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveryMode(false);
                    setError('');
                    setRecoveryMessage('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                  }}
                  className="font-semibold text-blue-600 hover:underline"
                >
                  ← Back to Sign In
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default Login;
