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
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatus, setHistoryStatus] = useState('all');
  const [selectedHistoryReceipt, setSelectedHistoryReceipt] = useState(null);

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
      .in('status', ['approved', 'rejected', 'cancelled'])
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

      {/* Receipt Transaction History */}
      <div className="mt-10 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Transaction Records</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">Approved Receipt History</h3>
              <p className="mt-1 text-sm text-slate-500">Accepted, rejected, and customer-cancelled transactions remain here for reference.</p>
              <p className="mt-2 text-xs font-medium text-emerald-600">Click any receipt record to view the full receipt.</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {approvedReceipts.length} recorded
            </div>
          </div>

          <div className="mt-5">
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search customer, email, receipt number..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ['all', 'All', approvedReceipts.length],
              ['approved', 'Accepted', approvedReceipts.filter((r) => r.status === 'approved').length],
              ['rejected', 'Rejected', approvedReceipts.filter((r) => r.status === 'rejected').length],
              ['cancelled', 'Cancelled', approvedReceipts.filter((r) => r.status === 'cancelled').length]
            ].map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setHistoryStatus(key)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  historyStatus === key
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label} · {count}
              </button>
            ))}
          </div>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-slate-500">Loading receipt history...</div>
        ) : (() => {
          const normalized = historySearch.trim().toLowerCase();
          const filteredHistory = approvedReceipts.filter((receipt) => {
            const client = receipt.order?.client;
            const employee = receipt.employee;
            const haystack = [
              receipt.receipt_number,
              client?.full_name,
              client?.email,
              client?.contact_number,
              employee?.full_name,
              employee?.email,
            ].filter(Boolean).join(' ').toLowerCase();

            const matchesSearch = !normalized || haystack.includes(normalized);
            const matchesStatus =
              historyStatus === 'all' || receipt.status === historyStatus;

            return matchesSearch && matchesStatus;
          });

          return filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No transaction records found for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Receipt</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Order Total</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Generated By</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Approved</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((receipt) => (
                    <tr
                      key={receipt.id}
                      onClick={() => setSelectedHistoryReceipt(receipt)}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      title="Click to view the full receipt"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">#{receipt.receipt_number}</p>
                        <p className="text-xs text-slate-500">Order #{receipt.order_id}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{receipt.order?.client?.full_name || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{receipt.order?.client?.email || 'N/A'}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{receipt.order?.client?.contact_number || 'N/A'}</td>
                      <td className="px-5 py-4 font-bold text-emerald-600">₱{receipt.order?.total_amount?.toFixed(2) || '0.00'}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{receipt.employee?.full_name || 'N/A'}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900">
                          {receipt.approved_at
                            ? new Date(receipt.approved_at).toLocaleString()
                            : new Date(receipt.updated_at || receipt.generated_at).toLocaleString()}
                        </p>
                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          receipt.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : receipt.status === 'rejected'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}>
                          {receipt.status === 'approved'
                            ? 'Accepted'
                            : receipt.status === 'rejected'
                              ? 'Rejected'
                              : 'Cancelled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Receipt Details Modal */}
      {selectedHistoryReceipt && (() => {
        const receipt = selectedHistoryReceipt;
        const client = receipt.order?.client;
        const employee = receipt.employee;
        const approver = receipt.approver;
        const items = receipt.order?.order_items || [];

        return (
          <div
            className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/65 px-4 py-6 backdrop-blur-sm sm:py-10"
            onClick={() => setSelectedHistoryReceipt(null)}
          >
            <div className="flex min-h-full items-center justify-center">
              <div
                className="flex w-full max-w-3xl max-h-[calc(100vh-3rem)] sm:max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_90px_-25px_rgba(15,23,42,0.55)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="shrink-0 bg-[linear-gradient(135deg,#0f172a_0%,#16233f_58%,#0b3b4b_100%)] px-5 py-5 text-white sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                        <span className="rounded-full bg-white/10 px-2.5 py-1">Transaction Receipt</span>
                        <span className="text-slate-400">Order #{receipt.order_id}</span>
                      </div>
                      <h3 className="break-all text-2xl font-black tracking-tight sm:text-3xl">#{receipt.receipt_number}</h3>
                      <p className="mt-1 text-sm text-slate-300">Approved transaction record</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedHistoryReceipt(null)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl font-medium text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      aria-label="Close receipt details"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Scrollable Receipt Body */}
                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-4 py-5 sm:px-7 sm:py-6">
                  <div className="space-y-5">
                    {/* Customer + Transaction */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg">👤</div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Customer</p>
                            <p className="mt-0.5 font-bold text-slate-950">{client?.full_name || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <p><span className="mr-2">📧</span>{client?.email || 'N/A'}</p>
                          <p><span className="mr-2">📞</span>{client?.contact_number || 'N/A'}</p>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-lg">🧾</div>
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Transaction</p>
                            <p className="mt-0.5 font-bold text-slate-950">Completed &amp; approved</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm text-slate-600">
                          <p>Generated by: <span className="font-semibold text-slate-900">{employee?.full_name || 'N/A'}</span></p>
                          <p>Generated: {receipt.generated_at ? new Date(receipt.generated_at).toLocaleString() : 'N/A'}</p>
                          <p>Approved by: <span className="font-semibold text-slate-900">{approver?.full_name || 'Not recorded'}</span></p>
                          <p>Approved: {receipt.approved_at ? new Date(receipt.approved_at).toLocaleString() : 'N/A'}</p>
                        </div>
                      </section>
                    </div>

                    {/* Items */}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Order Breakdown</p>
                          <h4 className="mt-1 text-lg font-bold text-slate-950">Items Purchased</h4>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">Product</th>
                              <th className="px-5 py-3 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">Qty</th>
                              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Unit Price</th>
                              <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wide text-slate-500">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                              <tr key={`${item.product_id || index}-${index}`} className="hover:bg-slate-50/80">
                                <td className="px-5 py-4">
                                  <p className="font-semibold text-slate-900">{item.product?.name || 'Unknown Product'}</p>
                                </td>
                                <td className="px-5 py-4 text-center text-slate-600">{item.quantity}</td>
                                <td className="px-5 py-4 text-right text-slate-600">₱{Number(item.price_per_unit || 0).toFixed(2)}</td>
                                <td className="px-5 py-4 text-right font-semibold text-slate-900">₱{Number(item.subtotal || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                            {items.length === 0 && (
                              <tr>
                                <td colSpan="4" className="px-5 py-8 text-center text-sm text-slate-500">No items recorded.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Total */}
                    <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-lg sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-slate-400">Order Total</p>
                          <p className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">₱{Number(receipt.order?.total_amount || 0).toFixed(2)}</p>
                        </div>
                        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Approved
                        </span>
                      </div>
                    </section>
                  </div>
                </div>

                {/* Sticky Footer */}
                <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-7">
                  <div className="flex items-center justify-between gap-3">
                    <p className="hidden text-xs text-slate-400 sm:block">Click outside the receipt to close</p>
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryReceipt(null)}
                      className="ml-auto rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    >
                      Close Receipt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default ReceiptApprovals;
