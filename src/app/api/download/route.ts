import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Google Drive file ID from your share link
    const fileId = '1P6koEZkbneHP21ik3B_vYub3GS5_zKow';
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    // Initial fetch with browser-like headers to avoid bot detection
    let response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Drive returned status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');

    // If Google returns HTML, it's likely the "Virus Scan" confirmation page
    if (contentType && contentType.includes('text/html')) {
      const html = await response.text();
      // Regex to find the confirmation token usually found in the "Download anyway" link
      const confirmMatch = html.match(/confirm=([a-zA-Z0-9_]+)/);
      
      if (confirmMatch && confirmMatch[1]) {
        const confirmToken = confirmMatch[1];
        const confirmedUrl = `${downloadUrl}&confirm=${confirmToken}`;
        
        // Fetch again with the confirmation token
        response = await fetch(confirmedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
      } else {
        // If we can't find a token, the file might be restricted or private
        throw new Error('Google Drive required a confirmation token that could not be parsed. Ensure the file is shared with "Anyone with the link".');
      }
    }

    if (!response.ok) {
      throw new Error('Failed to retrieve the final file payload.');
    }

    // Get the actual file content as buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Return the binary file as a download response
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="letpractice-app.apk"',
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Download proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to download file' },
      { status: 500 }
    );
  }
}
