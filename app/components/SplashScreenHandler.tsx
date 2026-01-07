
'use client'

import { useEffect } from 'react'
import { SplashScreen } from '@capacitor/splash-screen'

export default function SplashScreenHandler() {
    useEffect(() => {
        // Hide splash screen when the app is mounted and ready
        const hideSplash = async () => {
            try {
                await SplashScreen.hide()
            } catch (e) {
                // Ignore error if not running in Capacitor
            }
        }

        hideSplash()
    }, [])

    return null
}
