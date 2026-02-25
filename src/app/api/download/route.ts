import { NextRequest, NextResponse } from 'next/server';

/**
 * Professional APK Download Proxy
 * Streams the APK directly from the GitHub release source to provide
 * a seamless "one-click" download experience for educators.
 */
export async function GET(request: NextRequest) {
  const downloadUrl = 'https://github.com/martincajurao/LET/releases/download/V1.0/let.apk';
  
  try {
    // Stage 1: Fetch binary from source (GitHub handles redirects internally)
    const response = await fetch(downloadUrl, {
      redirect: 'follow',
      headers: {
        'User-Agent': 'LET-Practice-App-Proxy/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Source fetch failed: ${response.status}`);
    }

    // Stage 2: Stream binary directly to client with professional headers
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="let-practice-v1.0.apk"',
        'Content-Length': response.headers.get('content-length') || '',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    // Fallback: Redirect directly to GitHub if the proxy handshake fails
    return NextResponse.redirect(downloadUrl);
  }
}
