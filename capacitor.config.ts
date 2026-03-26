import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ccdec38ba5494028bfa65617122e8d21',
  appName: 'Chabbat Chalom',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://ccdec38b-a549-4028-bfa6-5617122e8d21.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
