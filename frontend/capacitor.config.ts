import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.artisanx.app',
  appName: 'ArtisanX',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
