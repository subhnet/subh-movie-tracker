'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

declare global {
  interface Window {
    google?: any
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // [NEW] Show Password State
  const [showPassword, setShowPassword] = useState(false)
  // [NEW] Invite Code State
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)

  useEffect(() => {
    // Initialize Google Sign-In when the script loads
    if (window.google && googleLoaded) {
      if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
        console.warn('Missing Google Client ID')
        return
      }

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
      })
      window.google.accounts.id.renderButton(
        document.getElementById('googleSignInButton'),
        { theme: 'filled_black', size: 'large', width: 340, shape: 'pill', text: 'continue_with' }
      )
    }
  }, [googleLoaded])

  const handleGoogleCallback = async (response: any) => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Google sign-in failed')
        setLoading(false)
        return
      }

      // Store session
      localStorage.setItem('movieTrackerSession', JSON.stringify(data.session))
      localStorage.setItem('movieTrackerUser', JSON.stringify(data.user))

      // Redirect to home
      window.location.href = '/'
    } catch (err) {
      setError('Network error during Google sign-in')
      console.error(err)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'

      // [NEW] Include inviteCode in body if registering
      const body = isLogin
        ? { username, password }
        : { username, password, inviteCode }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      // Store session in localStorage
      if (isLogin) {
        localStorage.setItem('movieTrackerSession', JSON.stringify(data.session))
        localStorage.setItem('movieTrackerUser', JSON.stringify(data.user))
        // Force a full page reload to update the auth state
        window.location.href = '/'
      } else {
        // Auto-login after registration
        setIsLogin(true)
        setError('')
        // Could auto-login here, but let's ask user to login
        alert('Account created! Please login.')
      }
    } catch (err) {
      setError('Network error. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        onLoad={() => setGoogleLoaded(true)}
        strategy="afterInteractive"
      />

      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0f1014]">
        {/* Background Ambient Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />

        <div className="w-full max-w-md relative z-10 p-6">
          {/* Logo Section */}
          <div className="text-center mb-8 space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl mb-4 group hover:scale-110 transition-transform duration-500">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              CinePath
            </h1>
            <p className="text-white/40 text-sm font-medium">
              Your personal cinematic universe
            </p>
          </div>

          {/* Auth Card */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            {/* Toggle Switch */}
            <div className="flex bg-black/40 p-1 rounded-xl mb-8 relative">
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg transition-all duration-300 ${isLogin ? 'left-1' : 'left-[calc(50%+0px)]'}`}
              />
              <button
                onClick={() => {
                  setIsLogin(true)
                  setError('')
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors ${isLogin ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setIsLogin(false)
                  setError('')
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors ${!isLogin ? 'text-white' : 'text-white/40 hover:text-white/60'}`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider ml-1">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                  placeholder="Enter your username"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider ml-1">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    minLength={6}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      // Eye Off Icon
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      // Eye Icon
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* [NEW] Invite Code Field (Only shown during Registration) */}
              {!isLogin && (
                <div className="space-y-1 animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className="text-xs font-bold text-purple-400/80 uppercase tracking-wider ml-1 flex items-center gap-1">
                    Waitlist / Invite Code
                    <svg className="w-3 h-3 text-purple-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    className="w-full bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3 text-purple-100 placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all font-medium tracking-wide"
                    placeholder=""
                  />
                  <p className="text-[10px] text-purple-300/50 ml-1">Registration is currently invite-only.</p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                  <svg className="w-5 h-5 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Processing...
                  </span>
                ) : (
                  isLogin ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                <span className="px-4 bg-[#13141b] text-white/30 rounded-full">Or continue with</span>
              </div>
            </div>

            <div className="min-h-[50px] flex justify-center">
              <div id="googleSignInButton" className="w-full flex justify-center"></div>
              {!googleLoaded && (
                <div className="w-full h-[44px] bg-white/5 animate-pulse rounded-full"></div>
              )}
            </div>

            <p className="mt-8 text-center text-white/30 text-xs">
              By continuing, you agree to our Terms of Service <br /> and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
