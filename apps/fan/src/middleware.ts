import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // Only handle root path
  if (pathname !== '/') return NextResponse.next();

  // Check for startapp parameter
  const startParam =
    searchParams.get('tgWebAppStartParam') ||
    searchParams.get('startapp') ||
    '';

  if (startParam.startsWith('p-')) {
    const slug = startParam.replace('p-', '');
    return NextResponse.redirect(new URL(`/pay/${slug}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/((?!api|_next|.*\\..*).*)'],
};
