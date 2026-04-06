import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chabbatchalom.15app',
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
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      NSLocationWhenInUseUsageDescription:
        'Autorisez la localisation pour recevoir vos horaires d\'allumage et de sortie des étoiles précis selon votre ville.',
      NSLocationAlwaysUsageDescription:
        'Autorisez la localisation pour recevoir vos horaires de Chabbat et de prière précis, même en arrière-plan.',
    },
  },
};

export default config;
