import type { DashboardData } from '../types/dashboard';

interface RcaSummaryPanelProps {
  records: DashboardData['rcaSummary'];
}

export function RcaSummaryPanel({ records }: RcaSummaryPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">RCA Summary</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.14em] text-slate-400">
              <th className="px-3">Failure Type</th>
              <th className="px-3">Root Cause</th>
              <th className="px-3">Recovery Action</th>
              <th className="px-3">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={`${record.failureType}-${index}`} className="rounded-xl bg-slate-900/70 text-slate-200">
                <td className="rounded-l-xl px-3 py-3 font-medium text-cyan-300">{record.failureType}</td>
                <td className="px-3 py-3">{record.rootCause}</td>
                <td className="px-3 py-3">{record.recoveryAction}</td>
                <td className="rounded-r-xl px-3 py-3">
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                    {record.confidence}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
