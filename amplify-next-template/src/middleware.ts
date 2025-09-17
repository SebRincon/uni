import { type NextRequest, NextResponse } from 'next/server';
import { fetchAuthSession } from 'aws-amplify/auth/server';
import { runWithAmplifyServerContext } from '@/src/utilities/server-utils';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { request, response },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec);
        return session.tokens !== undefined;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
  });

  const { pathname } = request.nextUrl;

  const protectedRoutes = ["/home", "/notifications", "/messages"];

  if (authenticated) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/home', request.url));
    }
  } else {
    if (protectedRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets/
     * - screenshots/
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets|screenshots).*)',
  ],
};