"use client";

import { LogOut } from "lucide-react";
import { useTranslation } from "@/i18n";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const { t } = useTranslation();

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Full navigation to the server logout route, which expires the auth
    // cookies on the response. Client-side supabase.auth.signOut() silently
    // keeps the session when the auth server is unreachable (common on
    // mobile), leaving the user stuck signed in.
    window.location.href = "/auth/logout";
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" />
      {t.nav.signOut}
    </button>
  );
}
