import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase';
import ProductManagement from './ProductManagement';
import ClientManagement from './ClientManagement';
import OrderManagement from './OrderManagement';

const LOW_STOCK_THRESHOLD = 5;

const employeeTabs = [
  {
    key: 'products',
    label: 'Products',
    icon: '📦',
    eyebrow: 'Catalog work',
    description: 'Manage inventory, update product details, and keep stock visible.'
  },
  {
    key: 'stock-alerts',
    label: 'Stock Alerts',
    icon: '🚨',
    eyebrow: 'Inventory status',
    description: 'Check out-of-stock and low-stock products that may need restocking.'
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
  const [inventoryProducts, setInventoryProducts] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState('');

  const activeTabMeta = employeeTabs.find((tab) => tab.key === activeTab) || employeeTabs[0];

  const fetchEmployeeData = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error) setEmployeeData(data);
  }, [user?.id]);

  const fetchInventoryProducts = useCallback(async () => {
    setInventoryLoading(true);
    setInventoryError('');
    let timeoutId;

    try {
      const query = supabase
        .from('products')
        .select('id, name, category, stock_quantity')
        .order('stock_quantity', { ascending: true })
        .order('name', { ascending: true });

      const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Inventory check timed out. Please retry.')),
          15000
        );
      });

      const { data, error } = await Promise.race([query, timeout]);
      if (error) throw error;
      setInventoryProducts(data || []);
    } catch (error) {
      console.error('Error loading stock alerts:', error);
      setInventoryError(error?.message || 'Unable to load inventory alerts. Please try again.');
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setInventoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployeeData();
    fetchInventoryProducts();

    // Keep stock alerts fresh when a product's stock is changed in Supabase.
    const channel = supabase
      .channel('employee-inventory-stock-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchInventoryProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEmployeeData, fetchInventoryProducts]);

  const outOfStockProducts = inventoryProducts.filter(
    (product) => Number(product.stock_quantity ?? 0) <= 0
  );
  const lowStockProducts = inventoryProducts.filter((product) => {
    const stock = Number(product.stock_quantity ?? 0);
    return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  });
  const alertProducts = [...outOfStockProducts, ...lowStockProducts].sort(
    (a, b) => Number(a.stock_quantity ?? 0) - Number(b.stock_quantity ?? 0)
  );
  const totalAlertProducts = alertProducts.length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const renderStockAlerts = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-600">Inventory Monitoring</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Stock Alerts</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Out of stock means 0 items left. Low stock means {`1–${LOW_STOCK_THRESHOLD}`} items remaining.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchInventoryProducts}
            disabled={inventoryLoading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {inventoryLoading ? 'Checking...' : '↻ Refresh stock'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Manage Products
          </button>
        </div>
      </div>

      {inventoryError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          <p className="font-bold">Could not check inventory</p>
          <p className="mt-1">{inventoryError}</p>
          <button type="button" onClick={fetchInventoryProducts} className="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-xs font-bold text-white hover:bg-rose-800">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[24px] border border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#ffffff)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">Out of Stock</p>
              <p className="mt-3 text-3xl font-black text-rose-800">{inventoryLoading ? '—' : outOfStockProducts.length}</p>
              <p className="mt-1 text-sm text-slate-600">Products with zero items remaining</p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-2xl" aria-hidden="true">⛔</span>
          </div>
        </div>
        <div className="rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fffbeb,#ffffff)] p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Low Stock</p>
              <p className="mt-3 text-3xl font-black text-amber-800">{inventoryLoading ? '—' : lowStockProducts.length}</p>
              <p className="mt-1 text-sm text-slate-600">Products with 1–{LOW_STOCK_THRESHOLD} items remaining</p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl" aria-hidden="true">⚠️</span>
          </div>
        </div>
      </div>

      {inventoryLoading ? (
        <div className="rounded-[24px] border border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-cyan-600" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Checking current stock...</p>
        </div>
      ) : !inventoryError && alertProducts.length === 0 ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-8 text-center">
          <div className="text-4xl" aria-hidden="true">✅</div>
          <h4 className="mt-3 text-lg font-black text-emerald-900">All products are sufficiently stocked</h4>
          <p className="mt-1 text-sm text-emerald-800">No products are currently at or below the low-stock threshold.</p>
        </div>
      ) : !inventoryError ? (
        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h4 className="font-black text-slate-900">Products needing attention</h4>
            <p className="mt-1 text-sm text-slate-500">{totalAlertProducts} product{totalAlertProducts === 1 ? '' : 's'} may need restocking.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Stock Left</th>
                  <th className="px-5 py-3">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertProducts.map((product) => {
                  const stock = Number(product.stock_quantity ?? 0);
                  const outOfStock = stock <= 0;
                  return (
                    <tr key={product.id} className={outOfStock ? 'bg-rose-50/50' : 'hover:bg-amber-50/50'}>
                      <td className="px-5 py-4 font-bold text-slate-900">{product.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{product.category || 'Uncategorized'}</td>
                      <td className={`px-5 py-4 text-sm font-black ${outOfStock ? 'text-rose-700' : 'text-amber-700'}`}>{stock}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-black ${outOfStock ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                          {outOfStock ? '⛔ Out of Stock' : '⚠️ Low Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );

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
                type="button"
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
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${activeTab === tab.key ? 'text-cyan-600' : 'text-cyan-100'}`}>
                      {tab.eyebrow}
                    </p>
                    <p className="text-sm font-semibold">{tab.label}</p>
                  </div>
                  {tab.key === 'stock-alerts' && !inventoryLoading && totalAlertProducts > 0 && (
                    <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-xs font-black text-white" aria-label={`${totalAlertProducts} stock alerts`}>
                      {totalAlertProducts}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
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
                <div className={`rounded-[24px] border p-4 admin-fade-in ${totalAlertProducts > 0 ? 'border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#ffffff)]' : 'border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)]'}`} style={{ animationDelay: '380ms' }}>
                  <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${totalAlertProducts > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Inventory alerts</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{inventoryLoading ? 'Checking...' : `${totalAlertProducts} item${totalAlertProducts === 1 ? '' : 's'}`}</p>
                  <p className="mt-1 text-sm text-slate-500">{inventoryLoading ? 'Loading stock status' : `${outOfStockProducts.length} out · ${lowStockProducts.length} low`}</p>
                </div>
              </div>
            </div>
          </section>

          {!inventoryLoading && totalAlertProducts > 0 && (
            <section className="flex flex-col gap-4 rounded-[24px] border border-rose-200 bg-[linear-gradient(110deg,#fff1f2,#fff7ed)] p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm" aria-hidden="true">🚨</span>
                <div>
                  <h3 className="font-black text-rose-900">Inventory needs attention</h3>
                  <p className="mt-1 text-sm leading-6 text-rose-800">
                    {outOfStockProducts.length > 0 && `${outOfStockProducts.length} product${outOfStockProducts.length === 1 ? ' is' : 's are'} out of stock`}
                    {outOfStockProducts.length > 0 && lowStockProducts.length > 0 && ' and '}
                    {lowStockProducts.length > 0 && `${lowStockProducts.length} product${lowStockProducts.length === 1 ? ' has' : 's have'} low stock`}. Check which items need restocking.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setActiveTab('stock-alerts')} className="shrink-0 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-800">
                Review stock alerts →
              </button>
            </section>
          )}

          {inventoryError && !inventoryLoading && (
            <section className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
              <p className="text-sm text-amber-900">Unable to refresh stock alerts: {inventoryError}</p>
              <button type="button" onClick={fetchInventoryProducts} className="rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800">Retry</button>
            </section>
          )}

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
              {activeTab === 'stock-alerts' && renderStockAlerts()}
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
