import React from 'react';

// SCHOOL PRESENTATION DEMO ONLY.
// This component contains fictional sample values and does not read or save
// real client passwords, Supabase Auth data, or password history records.

const sampleHistory = [
  {
    id: 1,
    changedAt: 'October 25, 2026 · 10:15 PM (sample)',
    previousPassword: 'ExampleOld#123',
    newPassword: 'ExampleNew#456',
  },
  {
    id: 2,
    changedAt: 'October 18, 2026 · 8:40 AM (sample)',
    previousPassword: 'DemoPass@001',
    newPassword: 'DemoPass@002',
  },
];

export default function PasswordHistoryDemo() {
  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-amber-200 bg-white shadow-lg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
            School presentation preview
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Password History Demo</h2>
          <p className="mt-1 text-sm text-slate-500">Example records showing how a password history table could look.</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-800">
          Simulation only
        </span>
      </header>

      <div className="mx-5 mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 sm:mx-6">
        <strong>Important:</strong> These are fictional sample strings for a school demo.
        They are not retrieved from Supabase, do not belong to any client, and cannot be
        used to sign in. Supabase Auth does not allow the original password to be recovered
        from its stored password hash.
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {sampleHistory.map((entry) => (
          <article key={entry.id} className="rounded-xl border border-slate-200 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-900">Password changed (sample)</span>
              <span className="text-xs text-slate-500">{entry.changedAt}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example previous password</p>
                <code className="mt-2 block break-all rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">{entry.previousPassword}</code>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Example new password</p>
                <code className="mt-2 block break-all rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">{entry.newPassword}</code>
              </div>
            </div>
          </article>
        ))}
      </div>

      <footer className="border-t border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-6">
        Demo-only component. Keep this separate from the real Client Password History panel and do not present these sample values as actual client passwords.
      </footer>
    </section>
  );
}
