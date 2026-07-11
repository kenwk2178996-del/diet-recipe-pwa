import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC = ["/login", "/auth", "/manifest.webmanifest", "/sw.js"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (all: { name: string; value: string; options?: any }[]) => {
          all.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          all.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC.some((p) => path.startsWith(p));
  if (!user && !isPublic && !path.startsWith("/_next") && !path.startsWith("/icons")) {
    const url = req.nextUrl.clone(); url.pathname = "/login"; return NextResponse.redirect(url);
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icons).*)"] };
