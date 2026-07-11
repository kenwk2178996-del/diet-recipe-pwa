import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Request-scoped client that respects the signed-in user (RLS enforced).
export function getServerSupabase() {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (all: { name: string; value: string; options?: any }[]) => {
          try { all.forEach(({ name, value, options }) => store.set(name, value, options)); }
          catch { /* called from a Server Component: ignore */ }
        },
      },
    }
  );
}
