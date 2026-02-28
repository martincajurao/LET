import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.let.app',
  appName: 'Let App',
  webDir: 'out',
  server: {
    // Load app from Firebase Hosting URL
    hostname: 'letpractice.firebaseapp.com',
    androidScheme: 'https',
  },
  // Android WebView configuration for proper routing
  android: {
    // Enable hardware acceleration for smoother naviclsgation
    useLegacyBridge: false,
  },
  // Browser options for proper WebView routing
  plugins: {
    // Enable Capacitor Cookies - This is the key to fixing session persistence!
    CapacitorCookies: {
      enabled: true,
    },
    // Optional: Enable CapacitorHttp for native HTTP calls
    CapacitorHttp: {
      enabled: false,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
    // Configure deep links for proper routing
    DeepLinks: {
      hosts: ['letpractice.firebaseapp.com'],
    },
  },
};

export default config;
