import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import UserApprovals from './UserApprovals';
import ReceiptApprovals from './ReceiptApprovals';
import Reports from './Reports';
import AccountManagement from './AccountManagement';
import ProductManagement from '../employee/ProductManagement'; // Reuse the same component

const adminTabs = [
  {
    key: 'accounts',
    label: 'Accounts',
    icon: '👥',
    eyebrow: 'Management Account',
    description: 'Manage client and employee accounts from one place.'
  },
  {
    key: 'products',
    label: 'Products',
    icon: '📦',
    eyebrow: 'Inventory',
    description: 'Update catalog items, stock, and storefront details.'
  },
  {
    key: 'approvals',
    label: 'Approvals',
    icon: '✅',
    eyebrow: 'Account Approvals',
    description: 'Review pending registrations and access requests.'
  },
  {
    key: 'receipts',
    label: 'Receipts',
    icon: '🧾',
    eyebrow: 'Finance',
    description: 'Track receipt submissions and payment records.'
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: '📊',
    eyebrow: 'Insights',
    description: 'Check performance summaries and admin reports.'
  }
];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [adminData, setAdminData] = useState(null);
  const [activeTab, setActiveTab] = useState('accounts');

  const activeTabMeta = adminTabs.find((tab) => tab.key === activeTab) || adminTabs[0];

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const fetchAdminData = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!error) setAdminData(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ede9fe,_#f8fafc_38%,_#e2e8f0)] md:flex">
      <aside className="relative overflow-hidden border-r border-violet-900/10 bg-[linear-gradient(180deg,#1e1537,#32215e_56%,#4c1d95)] text-white shadow-2xl md:flex md:w-80 md:flex-col md:min-h-screen admin-shell-rise">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(167,139,250,0.28),transparent_36%)]" />
        <div className="relative flex w-full flex-col gap-6 px-5 py-6">
          <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm admin-soft-float">
            <div className="flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-lg shadow-violet-950/30">
                👑
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200">Control Room</p>
                <h1 className="text-xl font-semibold">Admin Dashboard</h1>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-black/15 p-4">
              <p className="text-sm text-violet-100">Welcome back</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {adminData?.full_name || 'Admin'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm admin-fade-in" style={{ animationDelay: '120ms' }}>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-200">Sections</p>
              <p className="mt-2 text-2xl font-bold text-white">{adminTabs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm admin-fade-in" style={{ animationDelay: '220ms' }}>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-200">Active View</p>
              <p className="mt-2 text-lg font-semibold text-white">{activeTabMeta.label}</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
            {adminTabs.map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`group rounded-[22px] border px-4 py-4 text-left transition duration-300 whitespace-nowrap md:w-full admin-fade-in ${
                  activeTab === tab.key
                    ? 'border-white/20 bg-white text-violet-950 shadow-xl shadow-violet-950/20'
                    : 'border-white/10 bg-white/7 text-violet-50 hover:translate-x-1 hover:border-white/20 hover:bg-white/12'
                }`}
                style={{ animationDelay: `${160 + index * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tab.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${activeTab === tab.key ? 'text-violet-500' : 'text-violet-200'}`}>
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
            className="relative mt-2 rounded-[20px] border border-red-300/20 bg-red-500/90 px-4 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-red-500"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur admin-shell-rise" style={{ animationDelay: '120ms' }}>
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-700">{activeTabMeta.eyebrow}</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                  {activeTabMeta.icon} {activeTabMeta.label}
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {activeTabMeta.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-violet-100 bg-[linear-gradient(135deg,#faf5ff,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '220ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Workspace</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">Admin</p>
                  <p className="mt-1 text-sm text-slate-500">Full control access</p>
                </div>
                <div className="rounded-[24px] border border-cyan-100 bg-[linear-gradient(135deg,#ecfeff,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '300ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Status</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">Live</p>
                  <p className="mt-1 text-sm text-slate-500">Management tools ready</p>
                </div>
                <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '380ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Focus</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{activeTabMeta.label}</p>
                  <p className="mt-1 text-sm text-slate-500">Current working panel</p>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 admin-shell-rise" style={{ animationDelay: '220ms' }}>
            <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#fafafa)] px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activeTabMeta.label}</p>
                  <p className="text-sm text-slate-500">Manage the selected admin section below.</p>
                </div>
                <div className="hidden rounded-full bg-violet-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 md:block">
                  Animated admin workspace
                </div>
              </div>
            </div>
            <div className="p-6 admin-fade-in" key={activeTab}>
            {activeTab === 'accounts' && <AccountManagement />}
            {activeTab === 'products' && <ProductManagement />}
            {activeTab === 'approvals' && <UserApprovals />}
            {activeTab === 'receipts' && <ReceiptApprovals />}
            {activeTab === 'reports' && <Reports />}
          </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;