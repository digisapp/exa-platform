// Trophy wall of a model's earned event badges. Shows ALL badges the model has
// earned (one per show they were confirmed for), regardless of whether the event
// is over or its badge has been retired -- an earned badge is a permanent trophy.
// The "Get Tickets" promo ticker (elsewhere on the profile) is the separate,
// upcoming-only surface. See docs/badge-showcase-plan.md.

export interface BadgeWallItem {
  icon: string | null;
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
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 backdrop-blur-sm transition-transform hover:-translate-y-0.5 ${
                upcoming
                  ? "border-cyan-300/40 bg-gradient-to-r from-cyan-600/25 via-sky-500/20 to-violet-600/25 shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                  : "border-white/10 bg-white/[0.04] shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              }`}
            >
              <span className="text-lg leading-none">{b.icon || "⭐"}</span>
              <div className="leading-tight text-left">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-white">
                  {b.shortName}
                  {b.year ? ` ${b.year}` : ""}
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
