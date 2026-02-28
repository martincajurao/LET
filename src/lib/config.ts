// Centralized configuration for Firebase Functions URLs
// Uses Firebase Hosting rewrites (/api/*) for Spark plan compatibility

// Get the base URL for the app - works in both static and SSR builds
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use current origin
    return window.location.origin;
  }
  // Server-side: use environment variable or fallback
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Default fallback for development
  return 'http://localhost:3000';
}

// Firebase Cloud Functions URL
// For static export with Spark plan, we use Firebase Hosting rewrites (/api/*)
export function getFunctionsUrl(): string {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // Development: use local emulator or dev function URL
    // For local dev, you can use emulator or the actual functions
    return process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_DEV_URL || 
           'http://localhost:5001/letpractice/us-central1';
  }
  
  // Production: Use Firebase Hosting API rewrite paths
  // This works on Spark (free) plan since it goes through Firebase Hosting
  const baseUrl = getBaseUrl();
  return baseUrl;
}

// APK Download URL - uses /api/download rewrite
export function getDownloadUrl(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/download`;
}

// APK Info URL - uses /api/apk rewrite (Spark plan compatible)
export function getApkInfoUrl(): string {
  const baseUrl = getBaseUrl();
  // Always use Firebase Hosting rewrite for Spark plan compatibility
  // This requires the Firebase Functions to be deployed
  return `${baseUrl}/api/apk`;
}



// Daily Task URL - uses /api/daily-task rewrite
export function getDailyTaskUrl(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/daily-task`;
}

// Events URL - uses /api/events rewrite
export function getEventsUrl(): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/events`;
}

// Firestore Emulator configuration (for development)
export function getFirestoreConfig() {
  return {
    host: process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST || 'localhost:8080',
    ssl: false
  };
}

// Auth Emulator configuration (for development)
export function getAuthConfig() {
  return {
    host: process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || 'localhost:9099',
    ssl: false
  };
}
