import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const fileId = '1P6koEZkbneHP21ik3B_vYub3GS5_zKow';
  const downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    // Stage 1: Initial request to get session and potential confirmation page
    let response = await fetch(downloadUrl, {
      headers: { 'User-Agent': userAgent },
    });

    if (!response.ok) {
      throw new Error(`Google Drive initial request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If it's HTML, we need to extract the confirmation token
    if (contentType.includes('text/html')) {
      const html = await response.text();
      
      // Extract the confirm token (various formats Google uses)
      const confirmMatch = html.match(/confirm=([a-zA-Z0-9_]+)/) || 
                          html.match(/name="confirm" value="([a-zA-Z0-9_]+)"/);
      
      if (confirmMatch && confirmMatch[1]) {
        const token = confirmMatch[1];
        const finalUrl = `${downloadUrl}&confirm=${token}`;
        
        // Extract cookies to maintain the session
        const cookies = response.headers.get('set-cookie') || '';
        
        // Stage 2: Fetch actual binary with token and cookies
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

    // Stage 3: Direct stream for smaller files (no confirmation needed)
    if (response.ok && response.body) {
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Disposition': 'attachment; filename="letpractice-v1.0.apk"',
          'Content-Length': response.headers.get('content-length') || '',
        },
      });
    }

    throw new Error('Unable to resolve binary stream.');
  } catch (error: any) {
    console.error('Download Proxy Error:', error);
    // Ultimate fallback: Redirect to the direct URL so browser handles the UI
    return NextResponse.redirect(`https://drive.google.com/uc?export=download&id=${fileId}`);
  }
}
