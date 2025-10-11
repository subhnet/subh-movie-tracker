import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { fetchUserMovies } from '@/lib/data-fetcher'
import StatCards from './components/StatCards'
import RatingChart from './components/RatingChart'
import TopRatedTable from './components/TopRatedTable'
import ClientDashboard from './components/ClientDashboard'

export default async function Dashboard() {
  // Server-side authentication - fast and secure
  const user = await getServerUser()
  
  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }
  
  // Fetch data on the server - this is included in the initial HTML!
  const data = await fetchUserMovies(user.id)
  
  // Filter top rated movies and shows
  const topRatedMovies = data.watched.filter((m) => parseFloat(m.rating) >= 8)
  const topRatedShows = data.shows.filter((m) => parseFloat(m.rating) >= 8)
  
  // All movies combined for QuickAdd
  const allMovies = [...data.watched, ...data.wants, ...data.shows]

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 p-8 md:p-12 shadow-2xl">
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-black text-white mb-4 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              CinePath
            </h1>
            <p className="text-white/70 text-lg md:text-xl mb-4">Your Personal Movie Journey</p>
            {user && (
              <p className="text-white/80 text-xl md:text-2xl">
                Welcome back,{' '}
                <a 
                  href="/manage-movies"
                  className="font-bold text-white hover:text-blue-300 hover:underline decoration-2 underline-offset-4 cursor-pointer transition-all inline-flex items-center gap-1"
                >
                  {user.username}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* AI Chat Feature */}
        <a 
          href="/chat"
          className="group relative block"
        >
          <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 group-hover:blur-3xl transition-all duration-500"></div>
          <div className="relative h-full bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30 group-hover:scale-[1.02] group-hover:shadow-2xl transition-all duration-300">
            <div className="relative mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-lg">NEW</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Chat with CineMate</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">Chat with CineMate, your AI movie companion. Get personalized recommendations based on your taste.</p>
            <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:gap-3 gap-2 transition-all">
              <span>Start chatting</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>

        {/* Recommendations Feature */}
        <a 
          href="/recommendations"
          className="group relative block"
        >
          <div className="absolute -inset-1 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 group-hover:blur-3xl transition-all duration-500"></div>
          <div className="relative h-full bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30 group-hover:scale-[1.02] group-hover:shadow-2xl transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">AI Recommendations</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">Discover new movies or prioritize your watchlist with intelligent AI-powered suggestions.</p>
            <div className="flex items-center text-purple-600 font-semibold text-sm group-hover:gap-3 gap-2 transition-all">
              <span>Get recommendations</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>

        {/* Manage Movies Feature */}
        <a 
          href="/manage-movies"
          className="group relative block"
        >
          <div className="absolute -inset-1 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-3xl blur-2xl opacity-75 group-hover:opacity-100 group-hover:blur-3xl transition-all duration-500"></div>
          <div className="relative h-full bg-gradient-to-br from-white/95 to-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/30 group-hover:scale-[1.02] group-hover:shadow-2xl transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Manage Collection</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">Browse and manage your entire movie collection. Search, filter, edit, and organize your titles.</p>
            <div className="flex items-center text-pink-600 font-semibold text-sm group-hover:gap-3 gap-2 transition-all">
              <span>View collection</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </a>
      </div>

      {/* Stats Section - Rendered on Server */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-1 w-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-white">Overview</h2>
        </div>
        <StatCards 
          watched={data.watchedStats}
          wants={data.wantsStats}
          shows={data.showsStats}
        />
      </div>

      {/* Charts Section - Rendered on Server */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-1 w-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-white">Rating Distribution</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RatingChart 
            title="🍿 Watched Movies Distribution"
            distribution={data.watchedStats.distribution}
            color="rgba(102, 126, 234, 0.8)"
          />
          <RatingChart 
            title="📺 TV Shows Distribution"
            distribution={data.showsStats.distribution}
            color="rgba(79, 172, 254, 0.8)"
          />
        </div>
      </div>

      {/* Top Rated Section - Rendered on Server */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-1 w-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
          <h2 className="text-xl font-bold text-white">Your Top Rated</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopRatedTable 
            title="🎬 Your Top Movies"
            movies={topRatedMovies}
          />

          <TopRatedTable 
            title="📺 Your Top Shows"
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
