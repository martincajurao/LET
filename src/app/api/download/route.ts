import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const fileId = '1P6koEZkbneHP21ik3B_vYub3GS5_zKow';
  const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    // Step 1: Initial request to get the download page or the file
    let response = await fetch(downloadUrl, {
      headers: { 
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Drive initial request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    let finalUrl = downloadUrl;

    // Step 2: Handle the "Large file / Virus scan" warning page
    if (contentType && contentType.includes('text/html')) {
      const html = await response.text();
      
      // Look for the confirmation token in the HTML
      // Google Drive uses a format like confirm=xxxx or a form with a hidden input
      const confirmMatch = html.match(/confirm=([a-zA-Z0-9_]+)/) || 
                          html.match(/name="confirm" value="([a-zA-Z0-9_]+)"/);
      
      if (confirmMatch && confirmMatch[1]) {
        const token = confirmMatch[1];
        finalUrl = `${downloadUrl}&confirm=${token}`;
        
        // Extract cookies from the first response to maintain the session
        const setCookie = response.headers.get('set-cookie');
        
        // Re-fetch with the confirmation token and cookies if provided
        response = await fetch(finalUrl, {
          headers: { 
            'User-Agent': userAgent,
            ...(setCookie ? { 'Cookie': setCookie } : {})
          },
        });
      } else {
        // If no token is found but it's HTML, the file might be restricted or link is broken
        // We'll try one last direct redirect as a fallback
        return NextResponse.redirect(new URL(downloadUrl));
      }
    }

    if (!response.ok || !response.body) {
      throw new Error('Failed to retrieve binary stream from source.');
    }

    // Step 3: Stream the binary data directly to the client
    // We proxy the stream to avoid redirects and browser "warning" pages
    const stream = response.body;
    const filename = "letpractice-v1.0.apk";

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Length': response.headers.get('content-length') || '',
      },
    });
  } catch (error: any) {
    console.error('Download Proxy Critical Error:', error);
    // Ultimate fallback: Redirect the user to the direct Drive link
    return NextResponse.redirect(new URL(downloadUrl));
  }
}
