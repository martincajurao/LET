import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.let.app',
  appName: 'LET App',
  webDir: 'out',
  server: {
    url: 'http://localhost:9003',
    cleartext: true
  },
  android: {
    webContentsDebuggingEnabled: true
  }
};

export default config;
