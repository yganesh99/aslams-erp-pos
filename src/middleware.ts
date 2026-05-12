import { NextRequest, NextResponse } from 'next/server';

const publicPaths = ['/sign-in', '/api/auth'];

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (publicPaths.some((p) => pathname.startsWith(p))) {
		return NextResponse.next();
	}

	const sessionCookie = request.cookies.get('better-auth.session_token');
	if (!sessionCookie) {
		return NextResponse.redirect(new URL('/sign-in', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
