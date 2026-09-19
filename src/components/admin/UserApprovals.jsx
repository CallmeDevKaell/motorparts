import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const UserApprovals = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionUserId, setActionUserId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_approved', false)
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) console.error('Pending users error:', error);
    setPendingUsers(data || []);
    setLoading(false);
  };

  const handleApprove = async (userId) => {
    const selectedUser = pendingUsers.find((item) => item.id === userId);

    if (!selectedUser) return;
    if (!selectedUser.email) {
      alert('❌ This client does not have an email address.');
      return;
    }

    setActionUserId(userId);

    try {
      // 1. Approve the account.
      const { error: approveError } = await supabase
        .from('users')
        .update({ is_approved: true })
        .eq('id', userId);

      if (approveError) throw approveError;

      // 2. Keep the approval request in sync.
      await supabase
        .from('approval_requests')
        .update({ status: 'approved' })
        .eq('target_id', userId)
        .eq('status', 'pending');

      // 3. Use Supabase's built-in email sender.
      // This avoids the Resend API key dependency that caused the 503 error.
      const { error: emailError } = await supabase.auth.resetPasswordForEmail(
        selectedUser.email,
        {
          redirectTo: `${window.location.origin}/login?mode=set-password`,
        }
      );

      if (emailError) {
        alert(
          `✅ Account approved.\n\n⚠️ Password setup email could not be sent:\n${emailError.message}`
        );
      } else {
        alert(
          '✅ Account approved!\n\n📧 Password setup email has been sent to the client.'
        );
      }

      await fetchPendingUsers();
    } catch (error) {
      console.error('Approval error:', error);
      alert('❌ Error approving user: ' + (error.message || 'Unknown error'));
      await fetchPendingUsers();
    } finally {
      setActionUserId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', selectedUserId);

    if (error) {
      alert('❌ Error rejecting user: ' + error.message);
      return;
    }

    await supabase
      .from('approval_requests')
      .update({
        status: 'rejected',
        notes: rejectReason.trim(),
      })
      .eq('target_id', selectedUserId)
      .eq('status', 'pending');

    alert('✅ User rejected and removed.');
    setShowRejectModal(false);
    setRejectReason('');
    setSelectedUserId(null);
    fetchPendingUsers();
  };

  const filteredUsers = pendingUsers.filter((user) => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return true;

    const searchableText = [
      user.full_name,
      user.first_name,
      user.last_name,
      user.middle_name,
      user.username,
      user.email,
      user.id_number,
      user.contact_number,
      user.address,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
          Account Approvals
        </p>
        <h2 className="mt-2 text-3xl font-black text-slate-900">User Approvals</h2>
        <p className="mt-2 text-slate-500">
          Review pending registrations and approve client access.
        </p>
      </div>

      <div className="mb-5 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400">
              ⌕
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, email, username, ID..."
              className="w-full rounded-2xl border border-slate-300 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            Showing {filteredUsers.length} of {pendingUsers.length} pending account
            {pendingUsers.length !== 1 ? 's' : ''}
          </span>
          {searchTerm && (
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">
              Filter active
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Loading pending accounts...
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center text-emerald-700">
          ✅ No pending user approvals.
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <div className="text-3xl">🔍</div>
          <p className="mt-2 font-semibold text-slate-700">
            No matching pending accounts.
          </p>
          <p className="mt-1 text-sm">
            Try another name, email, username, or ID.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-600">Name</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-600">Email</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-600">Role</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-600">Details</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 align-top">
                    <div className="font-semibold text-slate-900">
                      {user.full_name ||
                        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
                        'Pending Client'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      ID: {user.id_number || 'N/A'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Username: {user.username || 'N/A'}
                    </div>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-700">
                    {user.email || 'N/A'}
                  </td>

                  <td className="px-4 py-4 align-top">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {user.role}
                    </span>
                  </td>

                  <td className="px-4 py-4 align-top text-sm text-slate-600">
                    <div>📞 {user.contact_number || 'N/A'}</div>
                    <div className="mt-1">📅 {user.birthdate || 'N/A'}</div>
                    <div className="mt-1">⚧️ {user.gender || 'N/A'}</div>
                    <div className="mt-1">🏠 {user.address || 'N/A'}</div>
                  </td>

                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={actionUserId === user.id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {actionUserId === user.id ? 'Approving...' : '✅ Approve'}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setShowRejectModal(true);
                        }}
                        disabled={actionUserId === user.id}
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">
              Reject Registration
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-900">Reject User</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Please provide the reason for rejecting this registration.
            </p>

            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              rows="4"
              placeholder="Enter rejection reason..."
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedUserId(null);
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleReject}
                className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserApprovals;
