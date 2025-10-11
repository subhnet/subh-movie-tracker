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
    <div className="max-w-7xl mx-auto space-y-10">
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

      {/* Stats Section - Rendered on Server */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Overview</h2>
        </div>
        <StatCards 
          watched={data.watchedStats}
          wants={data.wantsStats}
          shows={data.showsStats}
        />
      </div>

      {/* Charts Section - Rendered on Server */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Rating Distribution</h2>
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
        <div className="flex items-center gap-3 mb-6">
          <div className="h-1 w-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-white">Your Top Rated</h2>
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
