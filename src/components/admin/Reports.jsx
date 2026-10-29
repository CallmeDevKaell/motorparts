import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const PAGE_SIZE = 500;
const MAX_REPORT_ROWS = 50000;

const pad = (value) => String(value).padStart(2, '0');

const dateKey = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const todayKey = () => dateKey(new Date());
const currentMonthKey = () => todayKey().slice(0, 7);
const currentYearKey = () => String(new Date().getFullYear());
const startOfMonth = (value) => value ? `${value}-01` : '';
const endOfMonth = (value) => {
  if (!value) return '';
  const [year, month] = value.split('-').map(Number);
  return dateKey(new Date(year, month, 0));
};
const money = (value) => `₱${Number(value || 0).toLocaleString('en-PH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;
const compactMoney = (value) => `₱${Number(value || 0).toLocaleString('en-PH', {
  notation: 'compact',
  maximumFractionDigits: 1,
})}`;
const formatDate = (value, options = { year: 'numeric', month: 'numeric', day: 'numeric' }) => {
  if (!value) return 'Any date';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-PH', options);
};
const formatMonth = (value) => {
  if (!value) return 'N/A';
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-PH', {
    month: 'short',
    year: 'numeric',
  });
};
const orderDateValue = (order) => order.order_date || order.created_at;
const orderDateKey = (order) => dateKey(orderDateValue(order));
const rangeDays = (from, to) => {
  if (!from || !to) return 0;
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end - start) / 86400000) + 1;
};

const Icon = ({ type, size = 20 }) => {
  const paths = {
    cash: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="12" cy="12" r="3" /><path d="M6 9h.01M18 15h.01" /></>,
    box: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><rect x="7" y="11" width="3" height="5" rx=".5" /><rect x="13" y="7" width="3" height="9" rx=".5" /><rect x="19" y="3" width="2" height="13" rx=".5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.7 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.3-3" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type] || paths.chart}
    </svg>
  );
};

const Reports = () => {
  const today = todayKey();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reportType, setReportType] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey());
  const [selectedYear, setSelectedYear] = useState(currentYearKey());
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [filterError, setFilterError] = useState('');

  useEffect(() => {
    let active = true;
    let timeoutId;

    const fetchCompletedOrders = async () => {
      setLoading(true);
      setLoadError('');

      const queryPromise = (async () => {
        let allRows = [];
        for (let offset = 0; offset < MAX_REPORT_ROWS; offset += PAGE_SIZE) {
          const { data, error } = await supabase
            .from('orders')
            .select('id, order_date, created_at, total_amount, status')
            .eq('status', 'completed')
            .order('created_at', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

          if (error) throw error;
          const batch = data || [];
          allRows = allRows.concat(batch);
          if (batch.length < PAGE_SIZE) return allRows;
        }
        throw new Error(`Too many completed orders to load safely (limit ${MAX_REPORT_ROWS}). Please narrow the report query or contact the developer.`);
      })();

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error('Loading reports took too long. Check your internet connection and Supabase status, then press Reload.'));
        }, 15000);
      });

      try {
        const result = await Promise.race([queryPromise, timeoutPromise]);
        if (active) setOrders(result || []);
      } catch (error) {
        console.error('Error loading admin reports:', error);
        if (active) {
          setOrders([]);
          setLoadError(error?.message || 'Unable to load completed sales. Please try again.');
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (active) setLoading(false);
      }
    };

    fetchCompletedOrders();
    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set([Number(currentYearKey())]);
    orders.forEach((order) => {
      const key = orderDateKey(order);
      if (key) years.add(Number(key.slice(0, 4)));
    });
    return [...years].filter(Number.isFinite).sort((a, b) => b - a);
  }, [orders]);

  const period = useMemo(() => {
    if (reportType === 'daily') return { from: selectedDate, to: selectedDate };
    if (reportType === 'monthly') return { from: startOfMonth(selectedMonth), to: endOfMonth(selectedMonth) };
    if (reportType === 'yearly') return { from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` };
    return { from: fromDate, to: toDate };
  }, [reportType, selectedDate, selectedMonth, selectedYear, fromDate, toDate]);

  const customRangeInvalid = reportType === 'custom' && (
    !period.from || !period.to || period.from > period.to
  );

  const filteredOrders = useMemo(() => {
    if (customRangeInvalid) return [];
    return orders.filter((order) => {
      const key = orderDateKey(order);
      if (!key) return false;
      return (!period.from || key >= period.from) && (!period.to || key <= period.to);
    });
  }, [orders, period, customRangeInvalid]);

  const overview = useMemo(() => {
    const totalSales = filteredOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const totalOrders = filteredOrders.length;
    return {
      totalSales,
      totalOrders,
      averageOrderValue: totalOrders ? totalSales / totalOrders : 0,
    };
  }, [filteredOrders]);

  const useMonthlyBuckets = reportType === 'yearly' || (
    reportType === 'custom' && !customRangeInvalid && rangeDays(period.from, period.to) > 62
  );
  const useDailyBuckets = reportType === 'monthly' || (reportType === 'custom' && !useMonthlyBuckets);

  const breakdownRows = useMemo(() => {
    const groups = new Map();

    filteredOrders.forEach((order) => {
      const value = orderDateValue(order);
      const key = orderDateKey(order);
      if (!key) return;

      let bucketKey = key;
      if (reportType === 'daily') {
        const time = value ? new Date(value) : null;
        bucketKey = time && !Number.isNaN(time.getTime())
          ? `${pad(time.getHours())}:${pad(time.getMinutes())}`
          : 'Unknown time';
      } else if (useMonthlyBuckets) {
        bucketKey = key.slice(0, 7);
      }

      if (!groups.has(bucketKey)) groups.set(bucketKey, { key: bucketKey, orders: 0, sales: 0 });
      const row = groups.get(bucketKey);
      row.orders += 1;
      row.sales += Number(order.total_amount || 0);
    });

    return [...groups.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((row) => {
        const isTime = reportType === 'daily';
        const isMonth = useMonthlyBuckets;
        return {
          ...row,
          label: isTime ? row.key : isMonth ? formatMonth(row.key) : formatDate(row.key, { year: 'numeric', month: '2-digit', day: '2-digit' }),
          dayLabel: !isTime && !isMonth ? new Date(`${row.key}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'short' }) : '',
          average: row.orders ? row.sales / row.orders : 0,
        };
      });
  }, [filteredOrders, reportType, useMonthlyBuckets]);

  const chartData = useMemo(() => ({
    labels: breakdownRows.map((row) => row.label),
    datasets: [{
      label: 'Sales (₱)',
      data: breakdownRows.map((row) => row.sales),
      backgroundColor: '#bd6b3d',
      borderColor: '#a9542a',
      borderWidth: 1,
      borderRadius: 6,
      maxBarThickness: 44,
    }],
  }), [breakdownRows]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (context) => money(context.raw) } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', maxRotation: 45, minRotation: 0 }, border: { display: false } },
      y: { beginAtZero: true, grid: { color: '#f1ebe6' }, ticks: { color: '#64748b', callback: (value) => compactMoney(value) }, border: { display: false } },
    },
  }), []);

  const tabs = [
    { id: 'daily', label: 'Daily' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' },
    { id: 'custom', label: 'Custom Date' },
  ];

  const resetFilters = () => {
    const now = todayKey();
    setSelectedDate(now);
    setSelectedMonth(currentMonthKey());
    setSelectedYear(currentYearKey());
    setFromDate(now);
    setToDate(now);
    setFilterError('');
  };

  const rangeTitle = reportType === 'daily'
    ? `Daily Sales — ${formatDate(selectedDate)}`
    : reportType === 'monthly'
      ? `Daily Sales — ${formatMonth(selectedMonth)}`
      : reportType === 'yearly'
        ? `Monthly Sales — ${selectedYear}`
        : `Sales — ${period.from || 'Any date'} to ${period.to || 'Any date'}`;

  const breakdownTitle = reportType === 'daily'
    ? 'Hourly Sales Breakdown'
    : useMonthlyBuckets
      ? 'Monthly Sales Breakdown'
      : 'Daily Sales Breakdown';

  const description = reportType === 'daily'
    ? 'Sales recorded on the selected date.'
    : reportType === 'monthly'
      ? 'Daily sales totals for the selected month.'
      : reportType === 'yearly'
        ? 'Monthly sales totals for the selected year.'
        : 'Sales totals for your selected date range.';

  const handleCustomRangeValidation = () => {
    if (!fromDate || !toDate) {
      setFilterError('Please select both the From and To dates.');
    } else if (fromDate > toDate) {
      setFilterError('The From date must be earlier than or equal to the To date.');
    } else {
      setFilterError('');
    }
  };

  return (
    <div className="space-y-6 text-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-950">Analytics &amp; Reports</h2>
          <p className="mt-2 text-sm text-slate-500">Visual insights into your Motor Parts sales performance.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Report period">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={reportType === tab.id}
              onClick={() => { setReportType(tab.id); setFilterError(''); }}
              className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${reportType === tab.id ? 'border-[#321f13] bg-[#321f13] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-[#eee4dc] bg-white p-5 shadow-sm">
        {reportType === 'daily' && (
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="reports-selected-date" className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon type="calendar" size={17} /> Select Date:</label>
            <input id="reports-selected-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="rounded-xl border border-[#e6d9ce] px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Today</button>
          </div>
        )}
        {reportType === 'monthly' && (
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="reports-selected-month" className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon type="calendar" size={17} /> Select Month:</label>
            <input id="reports-selected-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="rounded-xl border border-[#e6d9ce] px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Current Month</button>
          </div>
        )}
        {reportType === 'yearly' && (
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="reports-selected-year" className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon type="calendar" size={17} /> Select Year:</label>
            <select id="reports-selected-year" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} className="rounded-xl border border-[#e6d9ce] bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
              {availableYears.map((year) => <option key={year} value={String(year)}>{year}</option>)}
            </select>
            <button type="button" onClick={resetFilters} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Current Year</button>
          </div>
        )}
        {reportType === 'custom' && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5"><label htmlFor="reports-from-date" className="text-sm font-semibold text-slate-800">From:</label><input id="reports-from-date" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => { setFromDate(event.target.value); setFilterError(''); }} className="rounded-xl border border-[#e6d9ce] px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></div>
            <div className="flex flex-col gap-1.5"><label htmlFor="reports-to-date" className="text-sm font-semibold text-slate-800">To:</label><input id="reports-to-date" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => { setToDate(event.target.value); setFilterError(''); }} className="rounded-xl border border-[#e6d9ce] px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></div>
            <button type="button" onClick={handleCustomRangeValidation} className="rounded-xl bg-[#321f13] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4a2e1c]">Apply Range</button>
            <button type="button" onClick={resetFilters} title="Reset report filters" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"><Icon type="refresh" size={15} />Reset</button>
          </div>
        )}
        {filterError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{filterError}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-[#eee4dc] bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Icon type="cash" /></div>
          <p className="mt-5 text-3xl font-bold tracking-tight text-[#321f13]">{money(overview.totalSales)}</p>
          <p className="mt-1.5 text-sm text-slate-500">Total Sales</p>
        </article>
        <article className="rounded-2xl border border-[#eee4dc] bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Icon type="box" /></div>
          <p className="mt-5 text-3xl font-bold tracking-tight text-[#321f13]">{overview.totalOrders.toLocaleString('en-PH')}</p>
          <p className="mt-1.5 text-sm text-slate-500">Total Orders</p>
        </article>
        <article className="rounded-2xl border border-[#eee4dc] bg-white p-6 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Icon type="chart" /></div>
          <p className="mt-5 text-3xl font-bold tracking-tight text-[#321f13]">{money(overview.averageOrderValue)}</p>
          <p className="mt-1.5 text-sm text-slate-500">Average Order Value</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#eee4dc] bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-base font-semibold text-[#321f13]">{rangeTitle}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
        {loadError ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            <p className="font-semibold">Unable to load reports</p>
            <p className="mt-1">{loadError}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-lg bg-rose-700 px-4 py-2 font-semibold text-white">Reload Reports</button>
          </div>
        ) : loading ? (
          <div className="flex min-h-[280px] items-center justify-center text-sm text-slate-500">Loading sales data...</div>
        ) : customRangeInvalid ? (
          <div className="flex min-h-[280px] items-center justify-center text-sm text-rose-600">Please select a valid date range.</div>
        ) : breakdownRows.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 text-center text-slate-400">
            <span className="text-4xl" aria-hidden="true">📭</span>
            <p className="text-sm">No sales data for this period</p>
          </div>
        ) : (
          <div className="mt-5 h-[320px] w-full"><Bar data={chartData} options={chartOptions} /></div>
        )}
      </section>

      {!loading && !loadError && !customRangeInvalid && (
        <section className="overflow-hidden rounded-2xl border border-[#eee4dc] bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4"><h3 className="text-base font-semibold text-[#321f13]">{breakdownTitle}</h3><p className="mt-1 text-sm text-slate-500">Completed and paid transactions only.</p></div>
          {breakdownRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">No transaction records for the selected period.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                  {reportType === 'daily' ? <th className="px-4 py-3">Time</th> : useMonthlyBuckets ? <th className="px-4 py-3">Month</th> : <><th className="px-4 py-3">Date</th><th className="px-4 py-3">Day</th></>}
                  <th className="px-4 py-3 text-right">Orders</th><th className="px-4 py-3 text-right">Sales</th><th className="px-4 py-3 text-right">Avg Order</th>
                </tr></thead>
                <tbody>
                  {breakdownRows.map((row) => (
                    <tr key={row.key} className="border-b border-[#f0e7df] last:border-b-0">
                      {reportType === 'daily' || useMonthlyBuckets ? <td className="px-4 py-3">{row.label}</td> : <><td className="px-4 py-3">{row.label}</td><td className="px-4 py-3 text-slate-500">{row.dayLabel}</td></>}
                      <td className="px-4 py-3 text-right">{row.orders}</td><td className="px-4 py-3 text-right font-semibold text-[#a9542a]">{money(row.sales)}</td><td className="px-4 py-3 text-right font-semibold text-slate-900">{money(row.average)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Reports;
