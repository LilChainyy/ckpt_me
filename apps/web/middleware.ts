import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();

  // Log after response is prepared
  const duration = Date.now() - start;
  const log = {
    method: request.method,
    path: request.nextUrl.pathname,
    status: response.status,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(log));

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
