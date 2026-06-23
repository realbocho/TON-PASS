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

  // 크리에이터 초대 링크: ref-CR-XXXXX → /creator/onboard?ref=CR-XXXXX
  if (startParam.startsWith('ref-')) {
    const code = startParam.replace('ref-', '');
    return NextResponse.redirect(new URL(`/creator/onboard?ref=${code}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/((?!api|_next|.*\\..*).*)'],
};
