"use client";

import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className }: LogoutButtonProps) {
  const supabase = createClient();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    await supabase.auth.signOut();
    // Hard redirect to ensure clean state
    window.location.href = "/";
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </button>
  );
}
