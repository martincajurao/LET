import { NextRequest, NextResponse } from 'next/server';
import { storage, firestore } from '@/lib/firebase-server';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('apk') as File;
    const version = formData.get('version') as string;

    if (!file || !version) {
      return NextResponse.json(
        { error: 'Missing required fields: apk and version' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.apk')) {
      return NextResponse.json(
        { error: 'Only APK files are allowed' },
        { status: 400 }
      );
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Create storage reference with version in filename
    const timestamp = Date.now();
    const storageRef = ref(storage, `apk/letpractice-v${version}-${timestamp}.apk`);

    // Upload to Firebase Storage
    await uploadBytes(storageRef, buffer, {
      contentType: 'application/vnd.android.package-archive',
    });

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Store APK metadata in Firestore
    const apkConfigRef = doc(firestore, 'app_config', 'apk');
    await setDoc(apkConfigRef, {
      version,
      downloadURL,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      version,
      downloadURL,
      message: 'APK uploaded successfully',
    });
  } catch (error: any) {
    console.error('APK upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload APK' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const apkConfigRef = doc(firestore, 'app_config', 'apk');
    const snapshot = await getDoc(apkConfigRef);

    if (snapshot.exists()) {
      return NextResponse.json(snapshot.data());
    } else {
      return NextResponse.json({
        version: null,
        downloadURL: null,
        message: 'No APK uploaded yet',
      });
    }
  } catch (error: any) {
    console.error('Error fetching APK config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch APK config' },
      { status: 500 }
    );
  }
}
