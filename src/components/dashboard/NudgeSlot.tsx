"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";

// Dashboard clutter guard: at most ONE nudge card renders per page view
// (declutter convention — the owner deleted nudge piles twice, PRs #73/#75).
//
// How it works: the dashboard RSC wraps its nudge cards in <NudgeSlot> in
// PRIORITY ORDER (payout before push). Each card runs its own client-side
// eligibility checks (localStorage snooze, Notification.permission, …) in a
// mount effect and then calls claim(); the first eligible card wins the slot
// and later claims are refused. React flushes sibling mount effects in tree
// order, so child order IS the priority order. Claims are permanent for the
// page view — dismissing the winner never promotes the runner-up mid-view.
//
// Future nudges join by rendering inside the slot and gating their
// setVisible(true) on useNudgeSlot("their-id")().

const NudgeSlotContext = createContext<((id: string) => boolean) | null>(null);

export function NudgeSlot({ children }: { children: ReactNode }) {
  // Ref, not state: claims happen inside child effects; only the claiming
  // card re-renders itself — the slot never needs to.
  const ownerRef = useRef<string | null>(null);
  const claim = useCallback((id: string) => {
    if (ownerRef.current === null) ownerRef.current = id;
    return ownerRef.current === id;
  }, []);
  return (
    <NudgeSlotContext.Provider value={claim}>
      {children}
    </NudgeSlotContext.Provider>
  );
}

/** Returns a claim() for this card; outside a slot every card may show. */
export function useNudgeSlot(id: string): () => boolean {
  const claim = useContext(NudgeSlotContext);
  return useCallback(() => (claim ? claim(id) : true), [claim, id]);
}
