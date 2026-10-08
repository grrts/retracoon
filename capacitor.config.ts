import type { CapacitorConfig } from '@capacitor/cli';

// Native app shell for the App Store and Google Play. The game itself is the Vite build
// in dist/; `npm run cap:sync` copies it into the android/ and ios/ projects.
const config: CapacitorConfig = {
  appId: 'com.retracoon.game',
  appName: 'Retracoon',
  webDir: 'dist',
  backgroundColor: '#1a1c2c',
  android: {
    backgroundColor: '#1a1c2c',
  },
  ios: {
    backgroundColor: '#1a1c2c',
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#1a1c2c',
      showSpinner: false,
    },
  },
};

export default config;
