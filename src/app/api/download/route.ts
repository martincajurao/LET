import { NextRequest, NextResponse } from 'next/server';

/**
 * Professional Google Drive Direct Download Proxy
 * Performs a background handshake to extract the 'confirm' token required
 * for large files, allowing a seamless "one-click" binary download.
 */
export async function GET(request: NextRequest) {
  const fileId = '1P6koEZkbneHP21ik3B_vYub3GS5_zKow';
  const baseUrl = 'https://docs.google.com/uc?export=download';
  const url = `${baseUrl}&id=${fileId}`;

  try {
    // Stage 1: Initial request to capture session cookies and detect confirmation token
    const initialResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!initialResponse.ok) {
      throw new Error(`Source fetch failed: ${initialResponse.status}`);
    }

    const setCookie = initialResponse.headers.get('set-cookie');
    const bodyText = await initialResponse.text();

    // Stage 2: Extract the confirmation token from the "Large File" warning page
    // Google uses this token to ensure users acknowledge the file couldn't be scanned for viruses
    const confirmMatch = bodyText.match(/confirm=([a-zA-Z0-9-_]+)/);
    
    if (confirmMatch) {
      const confirmToken = confirmMatch[1];
      const confirmedUrl = `${url}&confirm=${confirmToken}`;
      
      // Stage 3: Final request with token and session cookies to start the binary stream
      const finalResponse = await fetch(confirmedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': setCookie || '',
        },
      });

      if (!finalResponse.ok) {
        throw new Error(`Confirmed download failed: ${finalResponse.status}`);
      }

      // Stage 4: Stream binary directly to client with professional headers
      return new NextResponse(finalResponse.body, {
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="let-practice-app.apk"',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Fallback: If no confirmation was needed, re-fetch the stream (this consumes more bandwidth but is safer)
    const directResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    return new NextResponse(directResponse.body, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="let-practice-app.apk"',
      },
    });

  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    // Ultimate Fallback: Redirect directly to Google Drive if the proxy handshake fails
    return NextResponse.redirect(`https://drive.google.com/uc?export=download&id=${fileId}`);
  }
}
