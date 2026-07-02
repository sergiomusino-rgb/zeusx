import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zeusx.app',
  appName: 'ZeusX',
  webDir: 'out',
  server: {
    // Punto al tuo host web (cambia con il tuo dominio reale)
    url: 'https://zeusx-zwu8.vercel.app',
    cleartext: true, // Permette connessioni HTTP (solo per sviluppo)
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0f172a',
    },
  },
  android: {
    allowMixedContent: true, // Permette HTTP e HTTPS
    captureInput: true,
  },
};

export default config;