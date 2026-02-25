import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const fileId = '1P6koEZkbneHP21ik3B_vYub3GS5_zKow';
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    // Phase 1: Check for virus scan confirmation page
    let response = await fetch(downloadUrl, {
      headers: { 'User-Agent': userAgent },
    });

    if (!response.ok) {
      throw new Error(`Google Drive initial request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    let finalUrl = downloadUrl;

    // Google Drive returns HTML for the "Large file / Virus scan" warning
    if (contentType && contentType.includes('text/html')) {
      const html = await response.text();
      const confirmMatch = html.match(/confirm=([a-zA-Z0-9_]+)/);
      
      if (confirmMatch && confirmMatch[1]) {
        finalUrl = `${downloadUrl}&confirm=${confirmMatch[1]}`;
        // Re-fetch with confirmation
        response = await fetch(finalUrl, {
          headers: { 'User-Agent': userAgent },
        });
      } else {
        // If no token, the file might be restricted. Redirect as a fallback.
        return NextResponse.redirect(new URL(downloadUrl));
      }
    }

    if (!response.ok || !response.body) {
      throw new Error('Failed to retrieve binary stream from source.');
    }

    // Phase 2: Stream the binary data directly to the client
    // This bypasses memory issues with large files
    const stream = response.body;
    const filename = "letpractice-v1.0.apk";

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Download Proxy Critical Error:', error);
    // Ultimate fallback: Try to redirect the browser to the direct link
    return NextResponse.redirect(new URL(downloadUrl));
  }
}
