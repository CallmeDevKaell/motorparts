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
  }
];

const ClientDashboard = () => {
  const { user } = useAuth();
  const [clientData, setClientData] = useState(null);
  const [activeTab, setActiveTab] = useState('products');

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
                onClick={() => setActiveTab(tab.key)}
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
        </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;