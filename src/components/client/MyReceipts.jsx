import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';

const formatDateTime = (value) => {
  if (!value) return 'N/A';

  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const money = (value) => `₱${Number(value || 0).toFixed(2)}`;

const MyReceipts = ({ clientId }) => {
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (clientId) {
      fetchReceipts();
    }
  }, [clientId]);

  const fetchReceipts = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_date,
          total_amount,
          status,
          admin_approved,
          created_at,
          updated_at,
          order_items(
            product:product_id(name, price, image_url),
            quantity,
            price_per_unit,
            subtotal
          )
        `)
        .eq('client_id', clientId)
        .in('status', ['pending', 'approved', 'cancelled'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const orderIds = (ordersData || []).map((order) => order.id);

      if (orderIds.length === 0) {
        setOrders([]);
        setReceipts([]);
        return;
      }

      const { data: receiptsData, error: receiptsError } = await supabase
        .from('receipts')
        .select(`
          id,
          receipt_number,
          is_approved,
          sent_to_client,
          generated_at,
          approved_at,
          order_id
        `)
        .in('order_id', orderIds);

      if (receiptsError) throw receiptsError;

      setOrders(ordersData || []);
      setReceipts(receiptsData || []);
    } catch (fetchError) {
      console.error('Error fetching receipts:', fetchError);
      setOrders([]);
      setReceipts([]);
      setError('Unable to load your transaction records.');
    } finally {
      setLoading(false);
    }
  };

  const receiptByOrder = useMemo(
    () => new Map((receipts || []).map((receipt) => [receipt.order_id, receipt])),
    [receipts]
  );

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === 'pending' &&
          !order.admin_approved &&
          receiptByOrder.has(order.id)
      ),
    [orders, receiptByOrder]
  );

  const approvedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === 'approved' &&
          order.admin_approved &&
          receiptByOrder.get(order.id)?.is_approved === true &&
          receiptByOrder.get(order.id)?.sent_to_client === true
      ),
    [orders, receiptByOrder]
  );

  const cancelledOrders = useMemo(
    () => orders.filter((order) => order.status === 'cancelled'),
    [orders]
  );

  const handleCancelOrder = async (orderId) => {
    const confirmed = window.confirm(
      'Cancel this order? This can only be done while the order is still waiting for admin approval.'
    );

    if (!confirmed) return;

    setCancellingOrderId(orderId);
    setMessage('');
    setError('');

    try {
      const { error: cancelError } = await supabase.rpc(
        'cancel_client_order',
        { p_order_id: orderId }
      );

      if (cancelError) throw cancelError;

      setMessage(
        '✅ Order cancelled successfully. The reserved stock has been returned to inventory.'
      );

      await fetchReceipts();
    } catch (cancelError) {
      console.error('Error cancelling order:', cancelError);
      setError(
        cancelError?.message ||
          'Unable to cancel the order. Please try again.'
      );
    } finally {
      setCancellingOrderId(null);
    }
  };

  const renderOrderReceipt = (order, type = 'approved') => {
    const receipt = receiptByOrder.get(order.id);
    const isPending = type === 'pending';
    const isCancelled = type === 'cancelled';

    return (
      <article
        key={order.id}
        className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
      >
        <div
          className={`px-6 py-6 text-white ${
            isPending
              ? 'bg-[linear-gradient(135deg,#78350f,#b45309,#d97706)]'
              : isCancelled
                ? 'bg-[linear-gradient(135deg,#7f1d1d,#991b1b,#b91c1c)]'
                : 'bg-[linear-gradient(135deg,#052e16,#14532d_55%,#0f766e)]'
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                {isPending
                  ? 'Awaiting Approval'
                  : isCancelled
                    ? 'Cancelled Order'
                    : 'Transaction Receipt'}
              </p>

              <h3 className="mt-1 text-2xl font-black">
                {receipt?.receipt_number
                  ? `#${receipt.receipt_number}`
                  : `Order #${order.id}`}
              </h3>

              <p className="mt-1 text-sm text-white/80">
                Order #{order.id}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">
                Status
              </p>
              <p className="mt-1 font-bold">
                {isPending
                  ? '⏳ Waiting for Admin Approval'
                  : isCancelled
                    ? '✕ Cancelled'
                    : '✓ Approved'}
              </p>
            </div>
          </div>
        </div>

        {isPending && (
          <div className="border-b border-amber-100 bg-amber-50 px-6 py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-amber-900">
                  Your order is waiting for admin approval.
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-700">
                  You can still cancel this order while it is pending.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCancelOrder(order.id)}
                disabled={cancellingOrderId === order.id}
                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancellingOrderId === order.id
                  ? 'Cancelling...'
                  : 'Cancel Order'}
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-5 border-b border-slate-100 p-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Order Information
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Order Date</span>
                <span className="text-right font-medium text-slate-800">
                  {formatDateTime(order.order_date)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Order Status</span>
                <span
                  className={`font-semibold ${
                    isPending
                      ? 'text-amber-600'
                      : isCancelled
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {isPending
                    ? 'Pending Approval'
                    : isCancelled
                      ? 'Cancelled'
                      : 'Approved'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Payment Status</span>
                <span
                  className={`font-semibold ${
                    isPending
                      ? 'text-amber-600'
                      : isCancelled
                        ? 'text-slate-500'
                        : 'text-emerald-600'
                  }`}
                >
                  {isPending
                    ? 'Awaiting Approval'
                    : isCancelled
                      ? 'Cancelled'
                      : 'Paid'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Receipt Information
            </p>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Receipt</span>
                <span className="text-right font-medium text-slate-800">
                  {receipt?.receipt_number
                    ? `#${receipt.receipt_number}`
                    : 'Pending'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Generated</span>
                <span className="text-right font-medium text-slate-800">
                  {receipt?.generated_at
                    ? formatDateTime(receipt.generated_at)
                    : 'N/A'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500">Approved</span>
                <span className="text-right font-medium text-slate-800">
                  {receipt?.approved_at
                    ? formatDateTime(receipt.approved_at)
                    : isPending
                      ? 'Waiting for admin'
                      : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                {isCancelled ? 'Cancelled Items' : 'Purchased Items'}
              </p>
              <h4 className="mt-1 text-xl font-black text-slate-950">
                Order Summary
              </h4>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {order.order_items?.length || 0} item
              {(order.order_items?.length || 0) !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.6fr_0.45fr_0.75fr_0.9fr] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <div>Product</div>
              <div>Qty</div>
              <div>Price</div>
              <div className="text-right">Subtotal</div>
            </div>

            <div className="divide-y divide-slate-100">
              {(order.order_items || []).map((item, index) => (
                <div
                  key={index}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1.6fr_0.45fr_0.75fr_0.9fr] md:items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {item.product?.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product?.name || 'Product'}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          📦
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {item.product?.name || 'Unknown Product'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Motorcycle part
                      </p>
                    </div>
                  </div>

                  <div className="text-sm text-slate-700">
                    <span className="font-medium md:hidden">Qty: </span>
                    {item.quantity}
                  </div>

                  <div className="text-sm text-slate-700">
                    <span className="font-medium md:hidden">Price: </span>
                    {money(item.price_per_unit)}
                  </div>

                  <div className="font-semibold text-slate-900 md:text-right">
                    <span className="mr-1 text-xs text-slate-500 md:hidden">
                      Subtotal:
                    </span>
                    {money(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 rounded-[22px] bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-300">Grand Total</p>
              <p className="mt-1 text-3xl font-black">
                {money(order.total_amount)}
              </p>
            </div>

            <div
              className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
                isPending
                  ? 'bg-amber-400/15 text-amber-300'
                  : isCancelled
                    ? 'bg-rose-400/15 text-rose-300'
                    : 'bg-emerald-500/15 text-emerald-300'
              }`}
            >
              {isPending
                ? '⏳ Awaiting Admin Approval'
                : isCancelled
                  ? '✕ Order Cancelled'
                  : '✓ Receipt Approved'}
            </div>
          </div>
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="text-lg font-semibold text-slate-700">
          Loading your receipts...
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Please wait while we load your transaction history.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
              Purchase History
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              My Receipts
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pending orders and approved receipts are shown here in full.
            </p>
          </div>

          <div className="inline-flex w-fit items-center rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {orders.length} transaction{orders.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {message && (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {pendingOrders.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-600">
              Waiting for Approval
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              Pending Orders
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              These orders were prepared by the employee and are still waiting for admin approval.
            </p>
          </div>

          <div className="space-y-6">
            {pendingOrders.map((order) => renderOrderReceipt(order, 'pending'))}
          </div>
        </section>
      )}

      {approvedOrders.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
              Completed Approval
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              Approved Receipts
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Your approved transaction receipts are displayed below in full.
            </p>
          </div>

          <div className="space-y-6">
            {approvedOrders.map((order) => renderOrderReceipt(order, 'approved'))}
          </div>
        </section>
      )}

      {cancelledOrders.length > 0 && (
        <section>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-600">
              Order History
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              Cancelled Orders
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Cancelled orders remain in your transaction history for reference.
            </p>
          </div>

          <div className="space-y-6">
            {cancelledOrders.map((order) =>
              renderOrderReceipt(order, 'cancelled')
            )}
          </div>
        </section>
      )}

      {pendingOrders.length === 0 &&
        approvedOrders.length === 0 &&
        cancelledOrders.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <p className="text-5xl">📭</p>
            <p className="mt-4 font-semibold text-slate-800">
              You don't have any transaction receipts yet.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Your orders will appear here after an employee creates them.
            </p>
          </div>
        )}
    </div>
  );
};

export default MyReceipts;
