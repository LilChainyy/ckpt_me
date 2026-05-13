import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from './rate-limit';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRouteHandler = (...args: any[]) => Promise<NextResponse>;

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

export function withRateLimit<T extends AnyRouteHandler>(
  limiter: RateLimiter,
  handler: T,
): T {
  const wrapped = async (request: NextRequest, ...rest: unknown[]) => {
    const ip = getClientIp(request);
    const result = limiter.check(ip);

    if (!result.success) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(result.resetAt),
          },
        },
      );
    }

    const response = await handler(request, ...rest);

    response.headers.set('X-RateLimit-Remaining', String(result.remaining));
    response.headers.set('X-RateLimit-Reset', String(result.resetAt));

    return response;
  };

  return wrapped as T;
}
