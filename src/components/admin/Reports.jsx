import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const Reports = () => {
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [bestSelling, setBestSelling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('weekly');

  useEffect(() => {
    fetchReports();
  }, [reportType]);

  const fetchReports = async () => {
    setLoading(true);
    
    try {
      // Get all orders with items
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*, product:product_id(name))')
        .eq('admin_approved', true)
        .eq('status', 'approved');

      if (error) throw error;

      // Process data based on report type
      if (reportType === 'weekly') {
        processWeeklyData(orders);
      } else if (reportType === 'monthly') {
        processMonthlyData(orders);
      } else if (reportType === 'best') {
        processBestSelling(orders);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const processWeeklyData = (orders) => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyOrders = orders.filter(order => 
      new Date(order.created_at) >= weekAgo
    );

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sales = days.map(day => 0);

    weeklyOrders.forEach(order => {
      const day = new Date(order.created_at).getDay();
      const adjustedDay = day === 0 ? 6 : day - 1; // Convert to Mon-Sun
      sales[adjustedDay] += order.total_amount;
    });

    setWeeklyData({
      labels: days,
      values: sales,
      total: weeklyOrders.reduce((sum, o) => sum + o.total_amount, 0)
    });
  };

  const processMonthlyData = (orders) => {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const monthlyOrders = orders.filter(order => 
      new Date(order.created_at) >= monthAgo
    );

    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const sales = [0, 0, 0, 0];

    monthlyOrders.forEach(order => {
      const daysDiff = Math.floor((now - new Date(order.created_at)) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(Math.floor(daysDiff / 7), 3);
      sales[weekIndex] += order.total_amount;
    });

    setMonthlyData({
      labels: weeks,
      values: sales,
      total: monthlyOrders.reduce((sum, o) => sum + o.total_amount, 0)
    });
  };

  const processBestSelling = (orders) => {
    const productSales = {};

    orders.forEach(order => {
      order.order_items.forEach(item => {
        const name = item.product?.name || 'Unknown';
        if (!productSales[name]) {
          productSales[name] = 0;
        }
        productSales[name] += item.quantity;
      });
    });

    const sorted = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    setBestSelling({
      labels: sorted.map(([name]) => name),
      values: sorted.map(([, count]) => count)
    });
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  const getChartData = (data) => {
    if (!data) return null;
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'];
    return {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: colors.slice(0, data.labels.length),
        borderWidth: 2,
      }]
    };
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">📊 Reports</h2>
      
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setReportType('weekly')}
          className={`px-4 py-2 rounded transition ${
            reportType === 'weekly' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Weekly Sales
        </button>
        <button
          onClick={() => setReportType('monthly')}
          className={`px-4 py-2 rounded transition ${
            reportType === 'monthly' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Monthly Sales
        </button>
        <button
          onClick={() => setReportType('best')}
          className={`px-4 py-2 rounded transition ${
            reportType === 'best' 
              ? 'bg-purple-500 text-white' 
              : 'bg-gray-200 hover:bg-gray-300'
          }`}
        >
          Best Selling
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading reports...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-center mb-4">
              {reportType === 'weekly' && '📅 Weekly Sales Distribution'}
              {reportType === 'monthly' && '📅 Monthly Sales Distribution'}
              {reportType === 'best' && '🏆 Best Selling Products'}
            </h3>
            {reportType === 'weekly' && weeklyData && (
              <>
                <Pie data={getChartData(weeklyData)} options={chartOptions} />
                <p className="text-center mt-4 font-semibold text-green-600">
                  Total: ₱{weeklyData.total.toFixed(2)}
                </p>
              </>
            )}
            {reportType === 'monthly' && monthlyData && (
              <>
                <Pie data={getChartData(monthlyData)} options={chartOptions} />
                <p className="text-center mt-4 font-semibold text-green-600">
                  Total: ₱{monthlyData.total.toFixed(2)}
                </p>
              </>
            )}
            {reportType === 'best' && bestSelling && (
              <>
                <Pie data={getChartData(bestSelling)} options={chartOptions} />
                <p className="text-center mt-4 text-sm text-gray-600">
                  Based on total quantity sold
                </p>
              </>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-center mb-4">📋 Summary</h3>
            {reportType === 'weekly' && weeklyData && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Week of {new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} - {new Date().toLocaleDateString()}
                </p>
                <div className="space-y-2">
                  {weeklyData.labels.map((day, i) => (
                    <div key={day} className="flex justify-between text-sm">
                      <span>{day}</span>
                      <span className="font-medium">₱{weeklyData.values[i].toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reportType === 'monthly' && monthlyData && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Last 30 days
                </p>
                <div className="space-y-2">
                  {monthlyData.labels.map((week, i) => (
                    <div key={week} className="flex justify-between text-sm">
                      <span>{week}</span>
                      <span className="font-medium">₱{monthlyData.values[i].toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {reportType === 'best' && bestSelling && (
              <div>
                <div className="space-y-2">
                  {bestSelling.labels.map((product, i) => (
                    <div key={product} className="flex justify-between text-sm">
                      <span>{i + 1}. {product}</span>
                      <span className="font-medium">{bestSelling.values[i]} sold</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;