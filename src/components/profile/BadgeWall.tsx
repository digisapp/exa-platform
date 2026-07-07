// Trophy wall of a model's earned event badges. Shows ALL badges the model has
// earned (one per show they were confirmed for), regardless of whether the event
// is over or its badge has been retired -- an earned badge is a permanent trophy.
// The "Get Tickets" promo ticker (elsewhere on the profile) is the separate,
// upcoming-only surface. See docs/badge-showcase-plan.md.

export interface BadgeWallItem {
  shortName: string;
  year: number | null;
  name: string;
  status: string | null; // event status: upcoming | active | completed | cancelled
  active: boolean; // badge is_active
}

export function BadgeWall({ items }: { items: BadgeWallItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6 mt-2">
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300">
          Runway Badges
        </span>
        <span className="text-[10px] font-bold text-white/40 leading-none">
          {items.length}
        </span>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {items.map((b, i) => {
          const upcoming = b.active && (b.status === "upcoming" || b.status === "active");
          return (
            <div
              key={`${b.shortName}-${b.year}-${i}`}
              title={b.name}
              className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2 backdrop-blur-sm transition-transform hover:-translate-y-0.5 ${
                upcoming
                  ? "border-cyan-300/40 bg-gradient-to-r from-cyan-600/25 via-sky-500/20 to-violet-600/25 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                  : "border-white/15 bg-white/[0.04] shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              }`}
            >
              {/* Diamond year emblem — typographic insignia until per-show artwork exists */}
              <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center">
                <span
                  className={`flex h-6 w-6 rotate-45 items-center justify-center rounded-[3px] border ${
                    upcoming
                      ? "border-cyan-300/60 bg-cyan-400/10 shadow-[0_0_10px_rgba(34,211,238,0.4)]"
                      : "border-white/30 bg-white/[0.06]"
                  }`}
                >
                  <span className="-rotate-45 text-[9px] font-black tracking-tight text-white/90">
                    {b.year ? `’${String(b.year).slice(-2)}` : b.shortName.slice(0, 2).toUpperCase()}
                  </span>
                </span>
              </span>
              <div className="leading-tight text-left">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-white">
                  {b.shortName}
                </p>
                {upcoming ? (
                  <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-300">
                    Walking soon
                  </p>
                ) : (
                  <p className="text-[9px] font-medium uppercase tracking-wider text-white/40">
                    Walked
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
