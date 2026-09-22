import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.artisanx.app',
  appName: 'ArtisanX',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      providers: ["phone"],
      skipNativeAuth: false,
    },
  },
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ["*.cashfree.com", "cashfree.com"]
  }
};

export default config;
