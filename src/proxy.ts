import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection: redirects anonymous visitors away from authenticated areas.
 * Real authorization (session validity + role) is enforced server-side in layouts, actions
 * and route handlers — this only avoids rendering protected shells for logged-out users.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("vagou_session");
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/company/:path*", "/admin/:path*"],
};
