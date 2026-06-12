import Link from "next/link";
import { CheckCircle2, Circle, Rocket, ArrowRight } from "lucide-react";

export interface ChecklistStep {
  key: string;
  title: string;
  description: string;
  href: string;
  done: boolean;
}

/**
 * Shown to newly approved models until every step is complete.
 * Steps are computed server-side in the dashboard page; render nothing
 * when there's no remaining work so established models never see it.
 */
export function GettingStartedChecklist({ steps }: { steps: ChecklistStep[] }) {
  const remaining = steps.filter((s) => !s.done);
  if (remaining.length === 0) return null;

  const doneCount = steps.length - remaining.length;
  const progressPct = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent overflow-hidden shadow-[0_0_24px_rgba(236,72,153,0.12)]">
      <header className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-pink-400" />
          <h2 className="text-base font-semibold">Get set up to earn</h2>
        </div>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
          {doneCount}/{steps.length} done
        </span>
      </header>

      {/* Progress bar */}
      <div className="mx-5 mt-4 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shadow-[0_0_12px_rgba(236,72,153,0.6)] transition-all"
          style={{ width: `${Math.max(progressPct, 4)}%` }}
        />
      </div>

      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {steps.map((step) =>
          step.done ? (
            <div
              key={step.key}
              className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
            >
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/50 line-through">{step.title}</p>
              </div>
            </div>
          ) : (
            <Link
              key={step.key}
              href={step.href}
              className="group flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.03] hover:border-pink-500/40 hover:bg-white/[0.06] transition-all"
            >
              <Circle className="h-5 w-5 text-pink-400/70 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold flex items-center gap-1">
                  {step.title}
                  <ArrowRight className="h-3.5 w-3.5 text-pink-400 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </p>
                <p className="text-xs text-white/50 mt-0.5">{step.description}</p>
              </div>
            </Link>
          )
        )}
      </div>
    </section>
  );
}
