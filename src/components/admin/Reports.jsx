import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const pad = (value) => String(value).padStart(2, '0');
const localDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const currentYear = () => new Date().getFullYear();
const yearStart = (year) => `${year}-01-01`;
const yearEnd = (year) => Number(year) === currentYear() ? localDateKey(new Date()) : `${year}-12-31`;
const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const compactMoney = (value) => `₱${Number(value || 0).toLocaleString('en-PH', { notation: 'compact', maximumFractionDigits: 1 })}`;
const prettyDate = (value) => {
  if (!value) return 'Any date';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};
const monthLabel = (year, month) => new Date(year, month, 1).toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });

const Icon = ({ type, size = 19 }) => {
  const pathMap = {
    chart: <><path d="M4 19V5" /><path d="M4 19h17" /><rect x="7" y="11" width="3" height="5" rx=".5" /><rect x="13" y="7" width="3" height="9" rx=".5" /><rect x="19" y="3" width="2" height="13" rx=".5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    cash: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9h.01M18 15h.01" /></>,
    box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    filter: <><path d="M4 5h16M7 12h10M10 19h4" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.7 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.3-3" /></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M10 18h4" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{pathMap[type] || pathMap.chart}</svg>;
};

const Reports = () => {
  const yearNow = currentYear();
  const today = localDateKey(new Date());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reportType, setReportType] = useState('weekly');

  const [selectedYear, setSelectedYear] = useState(String(yearNow));
  const [fromDate, setFromDate] = useState(yearStart(yearNow));
  const [toDate, setToDate] = useState(today);
  const [appliedFilters, setAppliedFilters] = useState({ year: String(yearNow), from: yearStart(yearNow), to: today });
  const [filterError, setFilterError] = useState('');

  useEffect(() => {
    let alive = true;
    const fetchCompletedOrders = async () => {
      setLoading(true);
      setLoadError('');
      try {
        // Only completed orders count as sales; unpaid pending orders are excluded.
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            total_amount,
            status,
            created_at,
            order_items (
              quantity,
              subtotal,
              product:product_id (id, name, category)
            )
          `)
          .eq('status', 'completed')
          .order('created_at', { ascending: true });
        if (error) throw error;
        if (alive) setOrders(data || []);
      } catch (error) {
        console.error('Error loading admin reports:', error);
        if (alive) {
          setOrders([]);
          setLoadError(error?.message || 'Unable to load completed sales. Please refresh and try again.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetchCompletedOrders();
    return () => { alive = false; };
  }, []);

  const yearOptions = useMemo(() => {
    const years = new Set([yearNow]);
    orders.forEach((order) => {
      const date = new Date(order.created_at);
      if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [orders, yearNow]);

  const handleYearChange = (value) => {
    setSelectedYear(value);
    setFilterError('');
    if (value === 'all') {
      setFromDate('');
      setToDate('');
    } else {
      setFromDate(yearStart(value));
      setToDate(yearEnd(value));
    }
  };

  const handleFromDateChange = (value) => {
    setFromDate(value);
    if (value && selectedYear !== 'all' && value.slice(0, 4) !== selectedYear) setSelectedYear('all');
    setFilterError('');
  };

  const handleToDateChange = (value) => {
    setToDate(value);
    if (value && selectedYear !== 'all' && value.slice(0, 4) !== selectedYear) setSelectedYear('all');
    setFilterError('');
  };

  const handleGenerate = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setFilterError('The From date must be earlier than or equal to the To date.');
      return;
    }
    setFilterError('');
    setAppliedFilters({ year: selectedYear, from: fromDate, to: toDate });
  };

  const handleReset = () => {
    const start = yearStart(yearNow);
    setSelectedYear(String(yearNow));
    setFromDate(start);
    setToDate(today);
    setAppliedFilters({ year: String(yearNow), from: start, to: today });
    setFilterError('');
  };

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const dateKey = localDateKey(order.created_at);
    if (!dateKey) return false;
    if (appliedFilters.year !== 'all' && dateKey.slice(0, 4) !== appliedFilters.year) return false;
    if (appliedFilters.from && dateKey < appliedFilters.from) return false;
    if (appliedFilters.to && dateKey > appliedFilters.to) return false;
    return true;
  }), [orders, appliedFilters]);

  const overview = useMemo(() => {
    const totalSales = filteredOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const itemsSold = filteredOrders.reduce((sum, order) => sum + (order.order_items || []).reduce((s, item) => s + Number(item.quantity || 0), 0), 0);
    return { totalSales, completedOrders: filteredOrders.length, itemsSold };
  }, [filteredOrders]);

  const reportData = useMemo(() => {
    if (reportType === 'weekly') {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const values = Array(7).fill(0);
      filteredOrders.forEach((order) => {
        const weekday = new Date(order.created_at).getDay();
        values[weekday === 0 ? 6 : weekday - 1] += Number(order.total_amount || 0);
      });
      return { labels, values, title: 'Sales by day of week', total: overview.totalSales, unit: 'currency' };
    }

    if (reportType === 'monthly') {
      const byMonth = new Map();
      filteredOrders.forEach((order) => {
        const date = new Date(order.created_at);
        const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
        if (!byMonth.has(key)) byMonth.set(key, { label: monthLabel(date.getFullYear(), date.getMonth()), value: 0 });
        byMonth.get(key).value += Number(order.total_amount || 0);
      });
      let entries = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));

      // Fill zero-sale months when a bounded date range is short enough to chart clearly.
      if (appliedFilters.from && appliedFilters.to) {
        const start = new Date(`${appliedFilters.from}T12:00:00`);
        const end = new Date(`${appliedFilters.to}T12:00:00`);
        const monthSpan = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
        if (monthSpan >= 0 && monthSpan <= 36) {
          entries = [];
          for (let index = 0; index <= monthSpan; index += 1) {
            const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
            const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
            entries.push([key, { label: monthLabel(date.getFullYear(), date.getMonth()), value: byMonth.get(key)?.value || 0 }]);
          }
        }
      }
      return { labels: entries.map(([, item]) => item.label), values: entries.map(([, item]) => item.value), title: 'Sales by month', total: overview.totalSales, unit: 'currency' };
    }

    const byProduct = new Map();
    filteredOrders.forEach((order) => (order.order_items || []).forEach((item) => {
      const name = item.product?.name || 'Unknown product';
      if (!byProduct.has(name)) byProduct.set(name, { label: name, quantity: 0, revenue: 0 });
      byProduct.get(name).quantity += Number(item.quantity || 0);
      byProduct.get(name).revenue += Number(item.subtotal || 0);
    }));
    const entries = [...byProduct.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
    return { labels: entries.map((item) => item.label), values: entries.map((item) => item.quantity), revenues: entries.map((item) => item.revenue), title: 'Top-selling products', total: entries.reduce((sum, item) => sum + item.quantity, 0), unit: 'quantity' };
  }, [reportType, filteredOrders, overview.totalSales, appliedFilters]);

  const chartData = useMemo(() => ({
    labels: reportData.labels,
    datasets: [{
      label: reportType === 'best' ? 'Units sold' : 'Sales (₱)',
      data: reportData.values,
      backgroundColor: reportType === 'best' ? 'rgba(132, 204, 22, 0.78)' : 'rgba(249, 115, 22, 0.78)',
      borderColor: reportType === 'best' ? '#65a30d' : '#ea580c',
      borderWidth: 1,
      borderRadius: 7,
      maxBarThickness: 46,
    }],
  }), [reportData, reportType]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: reportType === 'best' ? 'y' : 'x',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => reportType === 'best' ? `${Number(context.raw || 0).toLocaleString('en-PH')} units` : money(context.raw) } },
    },
    scales: {
      x: { beginAtZero: true, grid: { display: reportType === 'best', color: '#eef0f3' }, ticks: { color: '#64748b', callback: reportType === 'best' ? undefined : (value) => compactMoney(value) }, border: { display: false } },
      y: { beginAtZero: true, grid: { display: reportType !== 'best', color: '#eef0f3' }, ticks: { color: '#64748b', precision: 0 }, border: { display: false } },
    },
  }), [reportType]);

  const rangeLabel = (appliedFilters.from || appliedFilters.to)
    ? `${prettyDate(appliedFilters.from)} — ${prettyDate(appliedFilters.to)}`
    : 'All recorded dates';
  const description = reportType === 'weekly'
    ? 'Compare revenue by weekday across your selected period.'
    : reportType === 'monthly'
      ? 'Review monthly revenue for your selected dates and year.'
      : 'See which products sold the most units during this period.';
  const summaryRows = reportData.labels.map((label, index) => ({ label, value: reportData.values[index] || 0 }));

  const tabs = [
    { id: 'weekly', label: 'Sales by Day', icon: 'calendar' },
    { id: 'monthly', label: 'Monthly Sales', icon: 'chart' },
    { id: 'best', label: 'Best-Selling Products', icon: 'trophy' },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-5 border-b border-slate-100 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-orange-700"><span className="h-1.5 w-1.5 rounded-full bg-orange-500" />Admin insights</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Reports & Analytics</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Generate reports by year and date range. Sales figures are based on completed orders.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[290px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Report year</p><p className="mt-2 text-sm font-black text-slate-900">{appliedFilters.year === 'all' ? 'All years' : appliedFilters.year}</p><p className="mt-1 text-xs text-slate-500">Applied filter</p></div>
            <div className="rounded-2xl border border-lime-200 bg-lime-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-lime-700">Data source</p><p className="mt-2 text-sm font-black text-slate-900">Live orders</p><p className="mt-1 text-xs text-slate-500">Supabase</p></div>
          </div>
        </div>

        <div className="p-6 sm:p-7">
          <div className="mb-4 flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white"><Icon type="filter" size={18} /></div><div><h3 className="text-sm font-black text-slate-900">Report filters</h3><p className="text-xs text-slate-500">Pick a year, then narrow the date range.</p></div></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.7fr_1fr_1fr_auto] xl:items-end">
            <div><label htmlFor="report-year" className="mb-2 block text-xs font-bold text-slate-600">Year</label><select id="report-year" value={selectedYear} onChange={(e) => handleYearChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"><option value="all">All years</option>{yearOptions.map((year) => <option key={year} value={String(year)}>{year}</option>)}</select></div>
            <div><label htmlFor="report-from" className="mb-2 block text-xs font-bold text-slate-600">From</label><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"><Icon type="calendar" size={17} /></span><input id="report-from" type="date" value={fromDate} max={toDate || undefined} onChange={(e) => handleFromDateChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100" /></div></div>
            <div><label htmlFor="report-to" className="mb-2 block text-xs font-bold text-slate-600">To</label><div className="relative"><span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400"><Icon type="calendar" size={17} /></span><input id="report-to" type="date" value={toDate} min={fromDate || undefined} onChange={(e) => handleToDateChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100" /></div></div>
            <div className="flex gap-2"><button type="button" onClick={handleGenerate} disabled={loading} className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"><Icon type="chart" size={17} />Generate</button><button type="button" onClick={handleReset} title="Reset report filters" className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-3.5 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"><Icon type="refresh" size={17} /></button></div>
          </div>
          {filterError && <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{filterError}</div>}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs"><span className="font-bold text-slate-400">Applied period:</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700">{rangeLabel}</span><span className="text-slate-400">• {filteredOrders.length} completed order{filteredOrders.length !== 1 ? 's' : ''}</span></div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Total sales</p><p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{money(overview.totalSales)}</p><p className="mt-2 text-xs text-slate-500">Paid/completed orders only</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Icon type="cash" size={21} /></div></div></div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Completed orders</p><p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{overview.completedOrders.toLocaleString('en-PH')}</p><p className="mt-2 text-xs text-slate-500">Within the selected period</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Icon type="chart" size={21} /></div></div></div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Items sold</p><p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{overview.itemsSold.toLocaleString('en-PH')}</p><p className="mt-2 text-xs text-slate-500">Total units in completed orders</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-700"><Icon type="box" size={21} /></div></div></div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-xl font-black tracking-tight text-slate-950">Sales performance</h3><p className="mt-1 text-sm text-slate-500">{reportType === 'weekly' ? 'Compare revenue by weekday across your selected period.' : reportType === 'monthly' ? 'Review monthly revenue for the selected dates and year.' : 'See which products sold the most units during this period.'}</p></div><div className="flex flex-wrap gap-2">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setReportType(tab.id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${reportType === tab.id ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><Icon type={tab.icon} size={15} />{tab.label}</button>)}</div></div>

        {loadError ? <div className="m-6 rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="font-bold text-rose-800">Could not load reports</p><p className="mt-1 text-sm leading-6 text-rose-700">{loadError}</p><button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-xl bg-rose-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-800">Reload reports</button></div> : loading ? <div className="p-12 text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-orange-500" /><p className="mt-4 text-sm font-semibold text-slate-600">Loading completed sales...</p></div> : (
          <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.75fr)]">
            <div className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">{reportType === 'weekly' ? 'Weekday breakdown' : reportType === 'monthly' ? 'Monthly breakdown' : 'Product ranking'}</p><h4 className="mt-1 text-lg font-black text-slate-950">{reportData.title}</h4></div><span className="rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-500">{reportType === 'best' ? 'Top 10' : 'Selected range'}</span></div>
              {reportData.labels.length === 0 ? <div className="flex min-h-[320px] flex-col items-center justify-center text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Icon type="chart" size={24} /></div><h5 className="mt-4 text-base font-black text-slate-900">No sales in this period</h5><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Choose another year or date range. Only completed orders are included in sales reports.</p></div> : <div className={`mt-5 ${reportType === 'best' ? 'h-[410px]' : 'h-[340px]'}`}><Bar data={chartData} options={chartOptions} /></div>}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs"><span className="text-slate-500">{rangeLabel}</span><span className="font-black text-slate-950">{reportType === 'best' ? `${reportData.total.toLocaleString('en-PH')} units across top products` : `Total: ${money(overview.totalSales)}`}</span></div>
            </div>

            <aside className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:p-5"><div className="flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm"><Icon type={reportType === 'best' ? 'trophy' : 'calendar'} size={17} /></div><div><h4 className="text-sm font-black text-slate-950">{reportType === 'best' ? 'Best-selling summary' : 'Period summary'}</h4><p className="text-xs text-slate-500">{rangeLabel}</p></div></div>
              {summaryRows.length === 0 ? <div className="py-10 text-center text-sm text-slate-500">No summary rows to show.</div> : <div className="mt-5 space-y-1">{summaryRows.map((row, index) => <div key={`${row.label}-${index}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition hover:bg-white"><div className="flex min-w-0 items-center gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-black text-slate-500 shadow-sm">{index + 1}</span><span className="truncate text-xs font-semibold text-slate-700">{row.label}</span></div><span className="whitespace-nowrap text-xs font-black text-slate-950">{reportType === 'best' ? `${row.value.toLocaleString('en-PH')} sold` : money(row.value)}</span></div>)}</div>}
              <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">{reportType === 'best' ? 'Units shown' : 'Total sales'}</p><p className="mt-2 text-2xl font-black">{reportType === 'best' ? reportData.total.toLocaleString('en-PH') : money(overview.totalSales)}</p><p className="mt-1 text-xs text-slate-400">{reportType === 'best' ? 'Across the top 10 products listed above' : `${overview.completedOrders} completed order${overview.completedOrders !== 1 ? 's' : ''}`}</p></div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
};

export default Reports;
