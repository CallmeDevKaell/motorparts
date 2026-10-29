
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
          amount_paid,
          change_amount,
          payment_method,
          status,
          admin_approved,
          is_walk_in,
          transaction_type,
          created_at,
          updated_at,
          order_items(
            quantity,
            price_per_unit,
            subtotal,
            item_source,
            product:product_id(name, price, image_url)
          )
        `)
        .eq('client_id', clientId)
        .in('status', ['pending', 'approved', 'completed', 'cancelled'])
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
          status,
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
          receiptByOrder.has(order.id)
      ),
    [orders, receiptByOrder]
  );

  const paidOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === 'completed' &&
          receiptByOrder.get(order.id)?.status === 'completed' &&
          receiptByOrder.get(order.id)?.sent_to_client === true
      ),
    [orders, receiptByOrder]
  );

  const approvedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === 'approved' &&
          receiptByOrder.get(order.id)?.is_approved === true
      ),
    [orders, receiptByOrder]
  );

  const cancelledOrders = useMemo(
    () => orders.filter((order) => order.status === 'cancelled'),
    [orders]
  );

  // Total spending includes only completed orders with a completed receipt
  // that has been sent to this client. Pending, approved-unpaid, and cancelled
  // orders are intentionally excluded. Each order is counted once.
  const totalSpent = useMemo(
    () => paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [paidOrders]
  );

  const handleCancelOrder = async (orderId) => {
    const confirmed = window.confirm(
      'Cancel this pending online order? The reserved stock will be returned.'
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
        '✅ Order cancelled successfully. The reserved stock has been returned.'
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

  const renderSourceBadge = (source) => (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        source === 'walk_in'
          ? 'bg-orange-100 text-orange-700'
          : 'bg-blue-100 text-blue-700'
      }`}
    >
      {source === 'walk_in' ? 'WALK-IN' : 'ONLINE'}
    </span>
  );

  const renderOrderCard = (order, mode) => {
    const receipt = receiptByOrder.get(order.id);
    const isPending = mode === 'pending';
    const isCancelled = mode === 'cancelled';
    const isMixed = order.transaction_type === 'mixed';

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
                  ? 'Pending — Not Yet Paid'
                  : isCancelled
                    ? 'Cancelled Order'
                    : isMixed
                      ? 'Completed Checkout — Online + Walk-in'
                      : order.transaction_type === 'walk_in'
                        ? 'Completed Walk-in Sale'
                        : 'Completed Online Order'}
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
                  ? '⏳ Waiting for Payment'
                  : isCancelled
                    ? '✕ Cancelled'
                    : '✓ Paid'}
              </p>
            </div>
          </div>
        </div>

        {isPending && (
          <div className="border-b border-amber-100 bg-amber-50 px-6 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-amber-900">
                  This order has been recorded, but payment is still pending.
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Payment will be completed at the shop using cash.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCancelOrder(order.id)}
                disabled={cancellingOrderId === order.id}
                className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
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
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Order Date</span>
                <span className="text-right font-medium text-slate-800">
                  {formatDateTime(order.order_date)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Transaction Type</span>
                <span className="text-right font-semibold text-slate-800">
                  {isMixed
                    ? 'Mixed: Online + Walk-in'
                    : order.transaction_type === 'walk_in'
                      ? 'Walk-in'
                      : 'Online'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Payment Method</span>
                <span className="text-right font-semibold text-slate-800">
                  {order.payment_method || 'Cash'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Payment Status</span>
                <span
                  className={`text-right font-semibold ${
                    isPending
                      ? 'text-amber-600'
                      : isCancelled
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                  }`}
                >
                  {isPending
                    ? 'Pending Payment'
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
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Receipt</span>
                <span className="text-right font-medium text-slate-800">
                  {receipt?.receipt_number
                    ? `#${receipt.receipt_number}`
                    : 'Pending'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Generated</span>
                <span className="text-right font-medium text-slate-800">
                  {receipt?.generated_at
                    ? formatDateTime(receipt.generated_at)
                    : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Receipt Status</span>
                <span className="text-right font-semibold text-slate-800">
                  {receipt?.status || 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
                {isCancelled ? 'Cancelled Items' : 'Receipt Items'}
              </p>
              <h4 className="mt-1 text-xl font-black text-slate-950">
                {isMixed ? 'One Receipt — Two Item Sources' : 'Order Summary'}
              </h4>
            </div>

            {isMixed && (
              <div className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                ONE RECEIPT • ONE PAYMENT
              </div>
            )}
          </div>

          {isMixed && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  ONLINE
                </p>
                <p className="mt-1 text-sm text-blue-900">
                  Items originally ordered online and paid at this checkout.
                </p>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                  WALK-IN
                </p>
                <p className="mt-1 text-sm text-orange-900">
                  New items added by the client at the shop.
                </p>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-[1.4fr_0.42fr_0.7fr_0.75fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <div>Product</div>
              <div>Qty</div>
              <div>Price</div>
              <div>Source</div>
              <div className="text-right">Subtotal</div>
            </div>

            <div className="divide-y divide-slate-100">
              {(order.order_items || []).map((item, index) => (
                <div
                  key={`${item.product?.name || 'item'}-${index}`}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr_0.42fr_0.7fr_0.75fr_0.8fr] md:items-center"
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

                  <div>
                    <span className="md:hidden mr-2 text-xs font-medium text-slate-500">
                      Source:
                    </span>
                    {renderSourceBadge(item.item_source)}
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

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-stretch">
            <div className="rounded-[22px] bg-slate-950 p-5 text-white">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Grand Total</span>
                <span className="text-2xl font-black text-white">
                  {money(order.total_amount)}
                </span>
              </div>

              {order.status === 'completed' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Cash Received
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {money(order.amount_paid)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Change
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {money(order.change_amount)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`rounded-[22px] px-5 py-4 text-sm font-semibold ${
                isPending
                  ? 'bg-amber-50 text-amber-700'
                  : isCancelled
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {isPending
                ? '⏳ Pay at the shop'
                : isCancelled
                  ? '✕ Cancelled'
                  : isMixed
                    ? '✓ Paid in one checkout'
                    : '✓ Paid'}
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
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
          Purchase History
        </p>
        <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950">
              My Receipts
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Pending orders, approved receipts, and paid shop transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[430px]">
            <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff)] px-5 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                Total Spent
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-emerald-950">
                {money(totalSpent)}
              </p>
              <p className="mt-1 text-xs text-emerald-800/80">
                Completed and paid purchases
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Transactions
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {orders.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                All orders in your history
              </p>
            </div>
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
              Waiting for Payment
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              Pending Orders
            </h3>
          </div>

          <div className="space-y-6">
            {pendingOrders.map((order) =>
              renderOrderCard(order, 'pending')
            )}
          </div>
        </section>
      )}

      {paidOrders.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">
              Paid Transactions
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              Completed Receipts
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              A mixed checkout is displayed as one receipt, with each item marked ONLINE or WALK-IN.
            </p>
          </div>

          <div className="space-y-6">
            {paidOrders.map((order) =>
              renderOrderCard(order, 'paid')
            )}
          </div>
        </section>
      )}

      {approvedOrders.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
              Previously Approved
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">
              Approved Receipts
            </h3>
          </div>

          <div className="space-y-6">
            {approvedOrders.map((order) =>
              renderOrderCard(order, 'approved')
            )}
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
          </div>

          <div className="space-y-6">
            {cancelledOrders.map((order) =>
              renderOrderCard(order, 'cancelled')
            )}
          </div>
        </section>
      )}

      {pendingOrders.length === 0 &&
        paidOrders.length === 0 &&
        approvedOrders.length === 0 &&
        cancelledOrders.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <p className="text-5xl">📭</p>
            <p className="mt-4 font-semibold text-slate-800">
              You don't have any transaction receipts yet.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Your orders will appear here after you place or complete a purchase.
            </p>
          </div>
        )}
    </div>
  );
};

export default MyReceipts;
