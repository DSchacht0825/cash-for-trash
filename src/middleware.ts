import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname === "/login";
  const isOnApi = req.nextUrl.pathname.startsWith("/api");
  const isPublicFile = req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.includes(".") ||
    req.nextUrl.pathname === "/manifest.json";

  // Allow public files and API routes
  if (isOnApi || isPublicFile) {
    return NextResponse.next();
  }

  // Allow login page
  if (isOnLogin) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
    return NextResponse.next();
  }

  // Require login for everything else
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
