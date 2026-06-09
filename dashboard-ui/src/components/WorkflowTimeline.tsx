interface WorkflowTimelineProps {
  steps: string[];
}

export function WorkflowTimeline({ steps }: WorkflowTimelineProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 shadow-[0_18px_36px_rgba(2,10,26,0.32)]">
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Workflow Timeline</h2>
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        {steps.map((step, idx) => (
          <div key={`${step}-${idx}`} className="flex items-center gap-2">
            <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 font-medium text-cyan-200">
              {step}
            </span>
            {idx < steps.length - 1 ? (
              <span className="text-slate-500" aria-hidden="true">
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
