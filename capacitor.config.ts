
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.subhnet.movietracker',
    appName: 'CinePath',
    webDir: 'public',
    server: {
        // Replace this with your actual Vercel deployment URL
        // This allows the app to load the live site and use Server Actions correctly
        url: 'https://cinepath.vercel.app',
        cleartext: true
    },
    ios: {
        contentInset: 'always'
    }
};

export default config;
