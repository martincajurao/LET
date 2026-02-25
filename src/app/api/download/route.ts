import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Google Drive file ID from your share link
    const fileId = '1P6koEZkbneHP21ik3B_vYub3GS5_zKow';
    
    // Create direct download URL
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    // Fetch the file from Google Drive
    const response = await fetch(downloadUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch file from Google Drive');
    }
    
    // Get the file content as buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Return the file as a download response
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="letpractice-app.apk"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    });
  } catch (error: any) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
