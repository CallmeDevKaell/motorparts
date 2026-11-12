import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import ClientProducts from './ClientProducts';
import MyReceipts from './MyReceipts';

const clientTabs = [
  {
    key: 'products',
    label: 'Products',
    icon: '📦',
    eyebrow: 'Shopping view',
    description: 'Browse parts, discover new arrivals, and scan promo items.'
  },
  {
    key: 'receipts',
    label: 'My Receipts',
    icon: '🧾',
    eyebrow: 'Purchase history',
    description: 'Review approved receipts and check your transaction records.'
  },
  {
    key: 'password',
    label: 'Change Password',
    icon: '🔐',
    eyebrow: 'Account security',
    description: 'Keep your account secure by updating your password.'
  }
];

const ClientDashboard = () => {
  const { user } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [activeTab, setActiveTab] = useState('products');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const activeTabMeta = clientTabs.find((tab) => tab.key === activeTab) || clientTabs[0];

  useEffect(() => {
    fetchClientData();
  }, [user]);

  const fetchClientData = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!error) setClientData(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setPasswordError('');
    setPasswordSuccess('');

    if (tabKey !== 'password') {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please complete all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Your new password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('The new password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('Your new password must be different from your current password.');
      return;
    }

    setPasswordLoading(true);

    try {
      // Verify the active Supabase user before touching password credentials.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const authUser = authData?.user;
      if (!authUser?.id || authUser.id !== user?.id) {
        throw new Error('Your session could not be verified. Please sign in again.');
      }

      // This feature is restricted to accounts whose database role is client.
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();

      if (profileError) throw profileError;
      if (profile?.role !== 'client') {
        throw new Error('Password changes on this page are available only to client accounts.');
      }

      if (!authUser.email) {
        throw new Error('No sign-in email is linked to this account. Please contact support.');
      }

      // Confirm the current password first, using the authenticated client email.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: currentPassword
      });

      if (verifyError) {
        throw new Error('Your current password is incorrect. Please try again.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccess('Your password was changed successfully.');
    } catch (error) {
      console.error('Client password change error:', error);
      setPasswordError(error?.message || 'Unable to change your password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dcfce7,_#f8fafc_42%,_#e2e8f0)] md:flex">
      <aside className="relative overflow-hidden border-r border-emerald-900/10 bg-[linear-gradient(180deg,#052e16,#14532d_52%,#0f766e)] text-white shadow-2xl md:flex md:w-80 md:flex-col md:min-h-screen admin-shell-rise">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(52,211,153,0.22),transparent_35%)]" />
        <div className="relative flex w-full flex-col gap-6 px-5 py-6">
          <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm admin-soft-float">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-lg shadow-emerald-950/30">
                👤
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Customer Space</p>
                <h1 className="text-xl font-semibold">Client Dashboard</h1>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-black/15 p-4">
              <p className="text-sm text-emerald-100">Signed in as</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {clientData?.full_name || 'Client'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm admin-fade-in" style={{ animationDelay: '120ms' }}>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Sections</p>
              <p className="mt-2 text-2xl font-bold text-white">{clientTabs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm admin-fade-in" style={{ animationDelay: '220ms' }}>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Now Viewing</p>
              <p className="mt-2 text-lg font-semibold text-white">{activeTabMeta.label}</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
            {clientTabs.map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`rounded-[22px] border px-4 py-4 text-left transition duration-300 whitespace-nowrap md:w-full admin-fade-in ${
                  activeTab === tab.key
                    ? 'border-white/20 bg-white text-emerald-950 shadow-xl shadow-emerald-950/20'
                    : 'border-white/10 bg-white/7 text-emerald-50 hover:translate-x-1 hover:border-white/20 hover:bg-white/12'
                }`}
                style={{ animationDelay: `${160 + index * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tab.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${activeTab === tab.key ? 'text-emerald-600' : 'text-emerald-100'}`}>
                      {tab.eyebrow}
                    </p>
                    <p className="text-sm font-semibold">{tab.label}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="mt-2 rounded-[20px] border border-red-300/20 bg-red-500/90 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-red-500"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-200/60 backdrop-blur admin-shell-rise" style={{ animationDelay: '120ms' }}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">{activeTabMeta.eyebrow}</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                  {activeTabMeta.icon} {activeTabMeta.label}
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {activeTabMeta.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '220ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Workspace</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">Client</p>
                  <p className="mt-1 text-sm text-slate-500">Personal browsing view</p>
                </div>
                <div className="rounded-[24px] border border-cyan-100 bg-[linear-gradient(135deg,#ecfeff,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '300ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Status</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">Online</p>
                  <p className="mt-1 text-sm text-slate-500">Products and receipts ready</p>
                </div>
                <div className="rounded-[24px] border border-lime-100 bg-[linear-gradient(135deg,#f7fee7,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '380ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lime-600">View</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{activeTabMeta.label}</p>
                  <p className="mt-1 text-sm text-slate-500">Current customer section</p>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 admin-shell-rise" style={{ animationDelay: '220ms' }}>
            <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activeTabMeta.label}</p>
                  <p className="text-sm text-slate-500">Use this space to browse and manage your own activity.</p>
                </div>
                <div className="hidden rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 md:block">
                  Animated client workspace
                </div>
              </div>
            </div>
            <div className="p-6 admin-fade-in" key={activeTab}>
              {activeTab === 'products' && <ClientProducts />}
              {activeTab === 'receipts' && <MyReceipts clientId={user?.id} />}
              {activeTab === 'password' && (
                <div className="mx-auto max-w-2xl">
                  <div className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-lg shadow-emerald-950/5">
                    <div className="border-b border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] px-6 py-5 sm:px-8">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                          🔐
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-950">Change your password</h3>
                          <p className="mt-1 text-sm text-slate-600">Confirm your current password to protect your account.</p>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handlePasswordChange} className="space-y-5 p-6 sm:p-8">
                      {passwordError && (
                        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                          {passwordError}
                        </div>
                      )}
                      {passwordSuccess && (
                        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                          {passwordSuccess}
                        </div>
                      )}

                      <div>
                        <label htmlFor="client-current-password" className="block text-sm font-semibold text-slate-800">Current password</label>
                        <input
                          id="client-current-password"
                          type="password"
                          autoComplete="current-password"
                          value={passwordForm.currentPassword}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                          required
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          placeholder="Enter current password"
                        />
                      </div>

                      <div>
                        <label htmlFor="client-new-password" className="block text-sm font-semibold text-slate-800">New password</label>
                        <input
                          id="client-new-password"
                          type="password"
                          autoComplete="new-password"
                          value={passwordForm.newPassword}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                          minLength={8}
                          required
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          placeholder="At least 8 characters"
                        />
                        <p className="mt-2 text-xs text-slate-500">Use at least 8 characters. Avoid using a password you use elsewhere.</p>
                      </div>

                      <div>
                        <label htmlFor="client-confirm-password" className="block text-sm font-semibold text-slate-800">Confirm new password</label>
                        <input
                          id="client-confirm-password"
                          type="password"
                          autoComplete="new-password"
                          value={passwordForm.confirmPassword}
                          onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                          minLength={8}
                          required
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          placeholder="Re-enter new password"
                        />
                      </div>

                      <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-slate-500">Your password is securely handled by Supabase Authentication. This page never displays or saves your old password.</p>
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-900/10 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {passwordLoading ? 'Updating password…' : 'Update password'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
        </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;