import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chabbatchalom.app',
  appName: 'Chabbat Chalom',
  webDir: 'dist',
  // server block removed for App Store production build
  // The app now loads from local bundled files (dist/)
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'chabbatchalom',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#F8F6F0',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#F8F6F0',
    },
  },
};

export default config;
