import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { fetchUserMovies } from '@/lib/data-fetcher'
import StatCards from './components/StatCards'
import RatingChart from './components/RatingChart'
import TopRatedTable from './components/TopRatedTable'
import ClientDashboard from './components/ClientDashboard'

export default async function Dashboard() {
  // Server-side authentication
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch data
  const data = await fetchUserMovies(user.id)

  const topRatedMovies = data.watched.filter((m) => parseFloat(m.rating) >= 8)
  const topRatedShows = data.shows.filter((m) => parseFloat(m.rating) >= 8)
  const allMovies = [...data.watched, ...data.wants, ...data.shows]

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 pb-20">
      {/* Hero Section */}
      <header className="relative mt-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 blur-[120px] rounded-full -z-10 animate-pulse-slow"></div>
        <div className="relative px-4 md:px-0">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 backdrop-blur-md text-xs font-semibold text-white/80 uppercase tracking-wider">
                Dashboard
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white tracking-tight leading-tight">
                Welcome Back
              </h1>
              {user && (
                <div className="text-2xl text-white/60 font-light flex items-center gap-2">
                  Hello, <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded-lg">{user.username}</span>. Ready for your next story?
                </div>
              )}
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="text-center">
                <div className="text-3xl font-bold text-white font-mono">{data.watched.length}</div>
                <div className="text-xs text-white/40 uppercase tracking-widest font-semibold mt-1">Watched</div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white font-mono">{data.wants.length}</div>
                <div className="text-xs text-white/40 uppercase tracking-widest font-semibold mt-1">Watchlist</div>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white font-mono">{data.shows.length}</div>
                <div className="text-xs text-white/40 uppercase tracking-widest font-semibold mt-1">Shows</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0">
        {/* Chat Card */}
        <a href="/chat" className="group relative block h-64 overflow-hidden rounded-3xl transition-transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-900 opacity-90 transition-all duration-500 group-hover:scale-105"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531297461136-82lw9b29154a?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-20"></div>

          <div className="relative h-full p-8 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <span className="px-3 py-1 bg-white text-blue-900 text-xs font-bold rounded-full shadow-lg">NEW</span>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform">AI Chat</h3>
              <p className="text-white/70 text-sm font-medium line-clamp-2">Discuss plots and get personalized suggestions.</p>
            </div>
          </div>
        </a>

        {/* Recommendations Card */}
        <a href="/recommendations" className="group relative block h-64 overflow-hidden rounded-3xl transition-transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-900 opacity-90 transition-all duration-500 group-hover:scale-105"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-20"></div>

          <div className="relative h-full p-8 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform">Discover</h3>
              <p className="text-white/70 text-sm font-medium line-clamp-2">AI-powered recommendations based on your taste.</p>
            </div>
          </div>
        </a>

        {/* Manage Card */}
        <a href="/manage-movies" className="group relative block h-64 overflow-hidden rounded-3xl transition-transform hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600 to-orange-900 opacity-90 transition-all duration-500 group-hover:scale-105"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80')] bg-cover bg-center mix-blend-overlay opacity-20"></div>

          <div className="relative h-full p-8 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white mb-2 group-hover:translate-x-1 transition-transform">Collection</h3>
              <p className="text-white/70 text-sm font-medium line-clamp-2">Browse, filter, and organize your library.</p>
            </div>
          </div>
        </a>
      </div>

      {/* Main Stats Grid */}
      <div className="px-4 md:px-0">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
        </div>
        <StatCards
          watched={data.watchedStats}
          wants={data.wantsStats}
          shows={data.showsStats}
        />
      </div>

      {/* Distribution Charts */}
      <div className="px-4 md:px-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🍿</span> Movies Rated
              </h3>
            </div>
            <RatingChart
              title=""
              distribution={data.watchedStats.distribution}
              color="rgba(102, 126, 234, 0.9)"
            />
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-2xl">📺</span> Shows Rated
              </h3>
            </div>
            <RatingChart
              title=""
              distribution={data.showsStats.distribution}
              color="rgba(236, 72, 153, 0.9)"
            />
          </div>
        </div>
      </div>

      {/* Top Rated Lists */}
      <div className="px-4 md:px-0">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-white">Hall of Fame</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <TopRatedTable
            title="🎬 Top Movies"
            movies={topRatedMovies}
          />

          <TopRatedTable
            title="📺 Top Shows"
            movies={topRatedShows}
          />
        </div>
      </div>

      {/* Interactive Client Components */}
      <ClientDashboard
        initialMovies={allMovies}
        userId={user.id}
      />
    </div>
  )
}
