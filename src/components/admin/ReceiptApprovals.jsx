import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../contexts/AuthContext';

const ReceiptApprovals = () => {
  const { user } = useAuth();
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [approvedReceipts, setApprovedReceipts] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerReceiptFilter, setCustomerReceiptFilter] = useState('all');

  useEffect(() => {
    fetchPendingReceipts();
    fetchTransactionHistory();
  }, []);

  const fetchPendingReceipts = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        order:order_id(
          id,
          total_amount,
          created_at,
          client_id,
          client:client_id(full_name, email, contact_number),
          order_items(
            product:product_id(name, price),
            quantity,
            price_per_unit,
            subtotal
          )
        ),
        employee:generated_by(full_name, email)
      `)
      .eq('status', 'pending')
      .order('generated_at', { ascending: true });
    
    if (!error) {
      setPendingReceipts(data || []);
    } else {
      setError('Failed to load receipts: ' + error.message);
    }
    setLoading(false);
  };



  const fetchTransactionHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        id,
        receipt_number,
        status,
        generated_at,
        approved_at,
        updated_at,
        order_id,
        order:order_id(
          id,
          total_amount,
          client_id,
          is_walk_in,
          walk_in_name,
          walk_in_contact,
          client:client_id(full_name, email, contact_number),
          order_items(
            product:product_id(name),
            quantity,
            price_per_unit,
            subtotal
          )
        ),
        employee:generated_by(full_name, email),
        approver:approved_by(full_name, email)
      `)
      .in('status', ['pending', 'approved', 'completed', 'rejected', 'cancelled'])
      .order('updated_at', { ascending: false });

    if (!error) {
      setApprovedReceipts(data || []);
    } else {
      console.error('Failed to load approved receipt history:', error);
    }
    setHistoryLoading(false);
  };

  const handleApprove = async (receiptId, orderId) => {
    setSuccess('');
    setError('');
    
    try {
      // Update receipt
      const { error: receiptError } = await supabase
        .from('receipts')
        .update({ 
          status: 'approved',
          is_approved: true,
          approved_at: new Date().toISOString(),
          approved_by: user.id,
          sent_to_client: true  // ✅ This is already here - good!
        })
        .eq('id', receiptId);
      
      if (receiptError) throw receiptError;

      // Update order
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          admin_approved: true,
          status: 'approved'
        })
        .eq('id', orderId);
      
      if (orderError) throw orderError;

      setSuccess('✅ Receipt approved and sent to client!');
      fetchPendingReceipts();
      fetchTransactionHistory();
      
      // Clear success after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error approving receipt: ' + err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleReject = async (receiptId, orderId) => {
    if (!window.confirm('Reject this receipt?')) return;

    setSuccess('');
    setError('');

    try {
      const now = new Date().toISOString();

      const { error: receiptError } = await supabase
        .from('receipts')
        .update({
          status: 'rejected',
          is_approved: false,
          sent_to_client: false,
          approved_at: null,
          approved_by: user.id,
          updated_at: now
        })
        .eq('id', receiptId);

      if (receiptError) throw receiptError;

      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          admin_approved: false,
          updated_at: now
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      const { error: requestError } = await supabase
        .from('approval_requests')
        .update({ status: 'rejected' })
        .eq('request_type', 'receipt')
        .eq('target_id', String(orderId))
        .eq('status', 'pending');

      if (requestError) throw requestError;

      setSuccess('✅ Receipt rejected and recorded in transaction history.');
      await fetchPendingReceipts();
      await fetchTransactionHistory();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error rejecting receipt: ' + err.message);
      setTimeout(() => setError(''), 3000);
    }
  };


  const customerAccounts = (() => {
    const byId = new Map();

    approvedReceipts.forEach((receipt) => {
      const order = receipt.order;
      const clientId = order?.client_id;

      // Keep unlinked walk-in sales separate from registered customer accounts.
      if (!clientId) return;

      const client = order?.client;
      if (!client) return;

      if (!byId.has(clientId)) {
        byId.set(clientId, {
          id: clientId,
          full_name: client.full_name || 'Unnamed Client',
          email: client.email || 'N/A',
          contact_number: client.contact_number || 'N/A',
          receipts: [],
          totalTransactions: 0,
          totalValue: 0,
          lastActivity: receipt.updated_at || receipt.generated_at,
        });
      }

      const account = byId.get(clientId);
      account.receipts.push(receipt);
      account.totalTransactions += 1;

      if (['approved', 'completed'].includes(receipt.status)) {
        account.totalValue += Number(order?.total_amount || 0);
      }

      const activityDate = new Date(receipt.updated_at || receipt.generated_at || 0).getTime();
      const currentLast = new Date(account.lastActivity || 0).getTime();

      if (activityDate > currentLast) {
        account.lastActivity = receipt.updated_at || receipt.generated_at;
      }
    });

    return Array.from(byId.values()).sort((a, b) => {
      return new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0);
    });
  })();

  const filteredCustomerAccounts = customerAccounts.filter((account) => {
    const query = customerSearch.trim().toLowerCase();

    if (!query) return true;

    return [
      account.full_name,
      account.email,
      account.contact_number,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const unlinkedWalkInReceipts = approvedReceipts.filter(
    (receipt) => !receipt.order?.client_id && receipt.order?.is_walk_in
  );

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">🧾 Receipt Approvals</h2>
      <p className="text-gray-600 mb-4">Review and approve receipts generated by employees.</p>

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : pendingReceipts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          ✅ No pending receipt approvals.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingReceipts.map((receipt) => (
            <div key={receipt.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <div className="flex flex-col md:flex-row justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <p className="font-semibold text-lg">Receipt #{receipt.receipt_number}</p>
                    <span className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                      ⏳ Pending
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-sm text-gray-600">👤 Client: <span className="font-medium">{receipt.order?.client?.full_name || 'N/A'}</span></p>
                      <p className="text-sm text-gray-600">📧 Email: {receipt.order?.client?.email || 'N/A'}</p>
                      <p className="text-sm text-gray-600">📞 Contact: {receipt.order?.client?.contact_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">👨‍💼 Generated by: {receipt.employee?.full_name || 'N/A'}</p>
                      <p className="text-sm text-gray-600">📅 Date: {new Date(receipt.generated_at).toLocaleString()}</p>
                      <p className="text-sm font-bold text-green-600">💰 Total: ₱{receipt.order?.total_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">Items:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {receipt.order?.order_items?.map((item, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {item.product?.name} × {item.quantity} = ₱{item.subtotal?.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 mt-4 md:mt-0 md:ml-4">
                  <button
                    onClick={() => handleApprove(receipt.id, receipt.order_id)}
                    className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition"
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => handleReject(receipt.id, receipt.order_id)}
                    className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition"
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Transaction Accounts */}
      <div className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Customer Accounts
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">
                Customer Transaction Records
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Select a customer account to view all of their receipts in one place.
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {filteredCustomerAccounts.length} customer{filteredCustomerAccounts.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="mt-5 relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              ⌕
            </span>
            <input
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search customer name, email, or contact..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-slate-500">
            Loading customer transaction records...
          </div>
        ) : filteredCustomerAccounts.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl">👥</div>
            <p className="mt-3 font-semibold text-slate-700">
              No customer transaction accounts found.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Customer accounts with receipts will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Contact
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Receipts
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Transaction Value
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Last Activity
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCustomerAccounts.map((account) => (
                  <tr
                    key={account.id}
                    className="transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {account.full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {account.email}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {account.contact_number}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {account.totalTransactions}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-emerald-600">
                      ₱{account.totalValue.toFixed(2)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {account.lastActivity
                        ? new Date(account.lastActivity).toLocaleString()
                        : 'N/A'}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(account);
                          setCustomerReceiptFilter('all');
                        }}
                        className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                      >
                        👁️ View Receipts
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unlinked Walk-in Sales */}
      {unlinkedWalkInReceipts.length > 0 && (
        <div className="mt-6 rounded-[24px] border border-orange-200 bg-orange-50/60 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-600">
                Walk-in Customers
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-900">
                Unlinked Walk-in Sales
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                These sales were made for customers without a registered account.
              </p>
            </div>

            <span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm">
              {unlinkedWalkInReceipts.length} record{unlinkedWalkInReceipts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {unlinkedWalkInReceipts.map((receipt) => (
              <button
                type="button"
                key={receipt.id}
                onClick={() => {
                  setSelectedCustomer({
                    id: null,
                    full_name: receipt.order?.walk_in_name || 'Walk-in Customer',
                    email: 'Walk-in Sale',
                    contact_number: receipt.order?.walk_in_contact || 'N/A',
                    receipts: unlinkedWalkInReceipts,
                    totalTransactions: unlinkedWalkInReceipts.length,
                    totalValue: unlinkedWalkInReceipts.reduce(
                      (sum, item) =>
                        sum + Number(item.order?.total_amount || 0),
                      0
                    ),
                    lastActivity: receipt.updated_at || receipt.generated_at,
                  });
                  setCustomerReceiptFilter('all');
                }}
                className="rounded-2xl border border-orange-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {receipt.order?.walk_in_name || 'Walk-in Customer'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {receipt.order?.walk_in_contact || 'No contact'}
                    </p>
                  </div>

                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                    View
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Customer Receipt Profile Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#172554_58%,#0f766e)] px-6 py-5 text-white md:px-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                    Customer Account
                  </p>
                  <h3 className="mt-1 text-2xl font-black">
                    {selectedCustomer.full_name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {selectedCustomer.email} · {selectedCustomer.contact_number}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20"
                  aria-label="Close customer receipts"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 p-5 md:p-7">
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Receipts</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">
                    {selectedCustomer.receipts.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Transaction Value</p>
                  <p className="mt-1 text-2xl font-black text-emerald-600">
                    ₱{selectedCustomer.totalValue.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Account Type</p>
                  <p className="mt-1 text-lg font-black text-slate-900">
                    {selectedCustomer.id ? 'Registered Client' : 'Walk-in Customer'}
                  </p>
                </div>
              </div>

              <div className="mb-5 flex flex-wrap gap-2">
                {[
                  ['all', 'All'],
                  ['pending', 'Pending'],
                  ['approved', 'Accepted'],
                  ['completed', 'Completed'],
                  ['rejected', 'Rejected'],
                  ['cancelled', 'Cancelled'],
                ].map(([key, label]) => {
                  const count = selectedCustomer.receipts.filter(
                    (receipt) =>
                      key === 'all' || receipt.status === key
                  ).length;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCustomerReceiptFilter(key)}
                      className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                        customerReceiptFilter === key
                          ? 'bg-slate-950 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {label} · {count}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4">
                {selectedCustomer.receipts
                  .filter(
                    (receipt) =>
                      customerReceiptFilter === 'all' ||
                      receipt.status === customerReceiptFilter
                  )
                  .map((receipt) => {
                    const order = receipt.order;
                    const items = order?.order_items || [];
                    const statusStyles = {
                      pending: 'bg-amber-100 text-amber-700',
                      approved: 'bg-emerald-100 text-emerald-700',
                      completed: 'bg-sky-100 text-sky-700',
                      rejected: 'bg-rose-100 text-rose-700',
                      cancelled: 'bg-orange-100 text-orange-700',
                    };

                    return (
                      <article
                        key={receipt.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {order?.is_walk_in
                                ? 'Walk-in Sale'
                                : 'Registered Sale'}
                            </p>
                            <h4 className="mt-1 text-lg font-black text-slate-900">
                              #{receipt.receipt_number}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Order #{receipt.order_id} ·{' '}
                              {order?.created_at
                                ? new Date(order.created_at).toLocaleString()
                                : receipt.generated_at
                                  ? new Date(receipt.generated_at).toLocaleString()
                                  : 'N/A'}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${
                                statusStyles[receipt.status] ||
                                'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {receipt.status === 'approved'
                                ? 'Accepted'
                                : receipt.status === 'completed'
                                  ? 'Completed'
                                  : receipt.status === 'pending'
                                    ? 'Pending'
                                    : receipt.status === 'rejected'
                                      ? 'Rejected'
                                      : 'Cancelled'}
                            </span>
                            <p className="mt-1.5 text-lg font-black text-emerald-600">
                              ₱{Number(order?.total_amount || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {items.map((item, index) => (
                            <div
                              key={`${receipt.id}-${index}`}
                              className="flex items-center gap-3 px-5 py-3.5"
                            >
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                                {item.product?.image_url ? (
                                  <img
                                    src={item.product.image_url}
                                    alt={item.product?.name || 'Product'}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-sm">
                                    📦
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {item.product?.name || 'Unknown Product'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Qty {item.quantity} × ₱
                                  {Number(item.price_per_unit || 0).toFixed(2)}
                                </p>
                              </div>

                              <p className="text-sm font-bold text-slate-900">
                                ₱{Number(item.subtotal || 0).toFixed(2)}
                              </p>
                            </div>
                          ))}

                          {items.length === 0 && (
                            <div className="px-5 py-6 text-center text-sm text-slate-500">
                              No item breakdown recorded.
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                          <span>
                            Generated by:{' '}
                            <strong className="text-slate-700">
                              {receipt.employee?.full_name || 'N/A'}
                            </strong>
                          </span>

                          <span>
                            {receipt.approved_at
                              ? `Approved ${new Date(receipt.approved_at).toLocaleString()}`
                              : receipt.status === 'pending'
                                ? 'Waiting for admin approval'
                                : receipt.status === 'completed'
                                  ? 'Completed directly by employee'
                                  : receipt.status === 'rejected'
                                    ? 'Rejected by admin'
                                    : 'Cancelled'}
                          </span>
                        </div>
                      </article>
                    );
                  })}

                {selectedCustomer.receipts.filter(
                  (receipt) =>
                    customerReceiptFilter === 'all' ||
                    receipt.status === customerReceiptFilter
                ).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                    No receipts found for this filter.
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-4 md:px-8">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-2xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default ReceiptApprovals;
