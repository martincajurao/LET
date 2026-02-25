import { NextRequest, NextResponse } from 'next/server';

/**
 * Professional APK Download Proxy
 * Bypasses Google Drive's "Large File" confirmation page by automatically 
 * extracting the 'confirm' token and streaming the binary data.
 */
export async function GET(request: NextRequest) {
  const fileId = '1P6koEZkbneHP21ik3B_vYub3GS5_zKow';
  const baseUrl = 'https://drive.google.com/uc?export=download';
  const downloadUrl = `${baseUrl}&id=${fileId}`;
  
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    // Stage 1: Attempt initial download
    let response = await fetch(downloadUrl, {
      headers: { 'User-Agent': userAgent },
    });

    if (!response.ok) {
      throw new Error(`Initial request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If the response is HTML, it means Google is showing the "Large File" warning page
    if (contentType.includes('text/html')) {
      const html = await response.text();
      
      // Extract the confirmation token from the HTML
      // Google uses several formats, we check the most common ones
      const confirmMatch = html.match(/confirm=([a-zA-Z0-9_]+)/) || 
                          html.match(/name="confirm" value="([a-zA-Z0-9_]+)"/);
      
      if (confirmMatch && confirmMatch[1]) {
        const token = confirmMatch[1];
        const finalUrl = `${downloadUrl}&confirm=${token}`;
        
        // We must also capture and send back the cookies to maintain the session
        const cookies = response.headers.get('set-cookie') || '';
        
        // Stage 2: Fetch the actual binary using the token and session cookies
        const binaryResponse = await fetch(finalUrl, {
          headers: { 
            'User-Agent': userAgent,
            'Cookie': cookies 
          },
        });

        if (binaryResponse.ok && binaryResponse.body) {
          return new NextResponse(binaryResponse.body, {
            headers: {
              'Content-Type': 'application/vnd.android.package-archive',
              'Content-Disposition': 'attachment; filename="letpractice-v1.0.apk"',
              'Content-Length': binaryResponse.headers.get('content-length') || '',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
      }
    }

    // Stage 3: If no confirmation was needed (small file), stream directly
    if (response.ok && response.body) {
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="letpractice-v1.0.apk"',
          'Content-Length': response.headers.get('content-length') || '',
        },
      });
    }

    throw new Error('Could not resolve binary stream.');
  } catch (error: any) {
    console.error('Direct Download Proxy Error:', error);
    // Ultimate fallback: Redirect to the direct Google Drive URL if the proxy fails
    // This will at least allow the user to click "Download anyway" in the Drive UI
    return NextResponse.redirect(downloadUrl);
  }
}
