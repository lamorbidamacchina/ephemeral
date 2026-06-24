import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  // Build connect-src to allow both the HTTP polling and the WS upgrade
  // from Socket.io. NEXT_PUBLIC_WS_URL is e.g. https://ws.example.com in prod.
  const wsUrl    = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';
  const wsHost   = new URL(wsUrl).host;
  const wsScheme = wsUrl.startsWith('https') ? 'wss' : 'ws';

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // 'unsafe-inline' is required because React renders inline style attributes
    // (e.g. style={{ fontFamily: '...' }}), which nonces cannot cover.
    // This still blocks external stylesheet injection; the main XSS vector
    // (script execution) is protected by the script-src nonce above.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self' ${wsUrl} ${wsScheme}://${wsHost}`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const reqHeaders = new Headers(request.headers);
  reqHeaders.set('x-nonce', nonce);
  reqHeaders.set('Content-Security-Policy', csp);

  const res = NextResponse.next({ request: { headers: reqHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  return res;
}

export const config = {
  matcher: [
    {
      // Skip static assets and prefetch requests — they don't need a fresh nonce
      source: '/((?!_next/static|_next/image|favicon.ico|apple-icon\\.png|icon\\.png).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
