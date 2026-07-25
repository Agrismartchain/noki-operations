import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { routing } from "./i18n/routing";
import { ACCESS_TOKEN_COOKIE } from "./lib/auth/cookies";

const intlMiddleware = createMiddleware(routing);
const locales = new Set<string>(routing.locales);

function getPathLocale(pathname: string): string | null {
  const segment = pathname.split("/")[1];
  if (!segment) {
    return null;
  }

  return locales.has(segment) ? segment : null;
}

const PUBLIC_SEGMENTS = ["login"];

function isPublicLocalizedPath(pathname: string, locale: string): boolean {
  return PUBLIC_SEGMENTS.some(
    (segment) => pathname === `/${locale}/${segment}` || pathname.startsWith(`/${locale}/${segment}/`),
  );
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const locale = getPathLocale(pathname);

  if (locale && !isPublicLocalizedPath(pathname, locale) && !request.cookies.get(ACCESS_TOKEN_COOKIE)?.value) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `/${locale}/login`;
    redirectUrl.search = "";

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax" });
    return response;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
