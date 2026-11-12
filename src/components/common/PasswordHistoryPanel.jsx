import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const eventLabels = {
  password_set: 'Password set',
  password_changed: 'Password changed',
};

const formatDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

/**
 * Admin usage: <PasswordHistoryPanel userId={client.id} />
 * Client usage: <PasswordHistoryPanel /> (signed-in user's own history)
 * The database stores event metadata only—not passwords or password hashes.
 */
const PasswordHistoryPanel = ({ userId = null, title = 'Password History' }) => {
  const [targetUserId, setTargetUserId] = useState(userId);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => setTargetUserId(userId), [userId]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        let resolvedUserId = targetUserId;
        if (!resolvedUserId) {
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          resolvedUserId = data?.user?.id || null;
        }
        if (!resolvedUserId) throw new Error('Sign in to view password history.');

        const { data, error } = await supabase
          .from('password_change_history')
          .select('id, event_type, created_at')
          .eq('user_id', resolvedUserId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        if (!cancelled) setEvents(data || []);
      } catch (error) {
        console.error('Password history load failed:', error);
        if (!cancelled) {
          setErrorMessage(error?.message || 'Unable to load password history.');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [targetUserId]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">Records of password setup and changes</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{events.length}</span>
      </div>

      <div className="p-5">
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
          <span className="mt-0.5 text-amber-700" aria-hidden="true">ⓘ</span>
          <p className="text-xs leading-5 text-amber-900">For account security, this history shows when a password was changed, not the password value itself.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-7 text-sm text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-orange-500" />
            Loading password history...
          </div>
        ) : errorMessage ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <div className="text-sm font-bold text-slate-700">No password-change records yet</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Future password changes will appear here automatically.</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">{eventLabels[event.event_type] || 'Password updated'}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
                </div>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Logged</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
};

export default PasswordHistoryPanel;
