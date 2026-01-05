"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);

        // Don't refresh during password recovery - let the reset page handle it
        if (event === 'PASSWORD_RECOVERY') {
          return;
        }

        // Don't do anything if we're on auth pages - let them handle it
        const pathname = window.location.pathname;
        const isAuthPage = pathname.startsWith('/auth/') ||
          pathname === '/signin' ||
          pathname === '/signup' ||
          pathname === '/forgot-password' ||
          pathname.startsWith('/claim/');
        if (isAuthPage) {
          return;
        }

        // Refresh the page data when auth state changes
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          router.refresh();
        }

        if (event === 'SIGNED_OUT') {
          router.push('/');
          router.refresh();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
