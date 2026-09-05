import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import ProductManagement from './ProductManagement';
import ClientManagement from './ClientManagement';
import OrderManagement from './OrderManagement';

const employeeTabs = [
  {
    key: 'products',
    label: 'Products',
    icon: '📦',
    eyebrow: 'Catalog work',
    description: 'Manage inventory, update product details, and keep stock visible.'
  },
  {
    key: 'clients',
    label: 'Clients',
    icon: '👤',
    eyebrow: 'Client records',
    description: 'Create and manage client accounts before approval.'
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: '💰',
    eyebrow: 'Sales flow',
    description: 'Track orders, process requests, and keep transactions moving.'
  }
];

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [employeeData, setEmployeeData] = useState(null);

  const activeTabMeta = employeeTabs.find((tab) => tab.key === activeTab) || employeeTabs[0];

  useEffect(() => {
    fetchEmployeeData();
  }, [user]);

  const fetchEmployeeData = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!error) setEmployeeData(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_40%,_#e2e8f0)] md:flex">
      <aside className="relative overflow-hidden border-r border-sky-900/10 bg-[linear-gradient(180deg,#0f172a,#123a68_52%,#0f766e)] text-white shadow-2xl md:flex md:w-80 md:flex-col md:min-h-screen admin-shell-rise">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.2),transparent_35%)]" />
        <div className="relative flex w-full flex-col gap-6 px-5 py-6">
          <div className="rounded-[26px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm admin-soft-float">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-lg shadow-slate-950/30">
                🏍️
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Operations Hub</p>
                <h1 className="text-xl font-semibold">Employee Dashboard</h1>
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-black/15 p-4">
              <p className="text-sm text-sky-100">On shift</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {employeeData?.full_name || 'Employee'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm admin-fade-in" style={{ animationDelay: '120ms' }}>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Tools</p>
              <p className="mt-2 text-2xl font-bold text-white">{employeeTabs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm admin-fade-in" style={{ animationDelay: '220ms' }}>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Current Focus</p>
              <p className="mt-2 text-lg font-semibold text-white">{activeTabMeta.label}</p>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
            {employeeTabs.map((tab, index) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-[22px] border px-4 py-4 text-left transition duration-300 whitespace-nowrap md:w-full admin-fade-in ${
                  activeTab === tab.key
                    ? 'border-white/20 bg-white text-sky-950 shadow-xl shadow-slate-950/20'
                    : 'border-white/10 bg-white/7 text-sky-50 hover:translate-x-1 hover:border-white/20 hover:bg-white/12'
                }`}
                style={{ animationDelay: `${160 + index * 80}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{tab.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${activeTab === tab.key ? 'text-cyan-600' : 'text-cyan-100'}`}>
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
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">{activeTabMeta.eyebrow}</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                  {activeTabMeta.icon} {activeTabMeta.label}
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  {activeTabMeta.description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-cyan-100 bg-[linear-gradient(135deg,#ecfeff,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '220ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-600">Workspace</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">Employee</p>
                  <p className="mt-1 text-sm text-slate-500">Daily operations ready</p>
                </div>
                <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(135deg,#eff6ff,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '300ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Status</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">Active</p>
                  <p className="mt-1 text-sm text-slate-500">Catalog and orders online</p>
                </div>
                <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] p-4 admin-fade-in" style={{ animationDelay: '380ms' }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">View</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{activeTabMeta.label}</p>
                  <p className="mt-1 text-sm text-slate-500">Current working panel</p>
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 admin-shell-rise" style={{ animationDelay: '220ms' }}>
            <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activeTabMeta.label}</p>
                  <p className="text-sm text-slate-500">Use the tools below to manage this section.</p>
                </div>
                <div className="hidden rounded-full bg-cyan-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 md:block">
                  Animated employee workspace
                </div>
              </div>
            </div>
            <div className="p-6 admin-fade-in" key={activeTab}>
            {activeTab === 'products' && <ProductManagement />}
            {activeTab === 'clients' && <ClientManagement />}
            {activeTab === 'orders' && <OrderManagement />}
          </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;