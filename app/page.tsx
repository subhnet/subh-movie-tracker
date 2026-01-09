import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { fetchUserMovies } from '@/lib/data-fetcher'
import StatCards from './components/StatCards'
import ClientDashboard from './components/ClientDashboard'

export default async function Dashboard() {
  const user = await getServerUser()

  if (!user) {
    redirect('/login')
  }

  const data = await fetchUserMovies(user.id)
  const topRatedMovies = data.watched.filter((m) => parseFloat(m.rating) >= 8).sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
  const topRatedShows = data.shows.filter((m) => parseFloat(m.rating) >= 8).sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
  const allMovies = [...data.watched, ...data.wants, ...data.shows]

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
      {/* Hero Header - More Compact */}
      <header className="relative mb-6">
        {/* Subtle background glow, less overwhelming than before */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[100%] bg-blue-600/20 blur-[120px] rounded-full -z-10"></div>

        <div className="px-4 md:px-0 flex flex-col md:flex-row justify-between items-end gap-4">
          <div className="pb-1">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
              Welcome Back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">{user.username}</span>
            </h1>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <a href="/chat" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              AI Chat
            </a>
            <a href="/recommendations" className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              Discover
            </a>
          </div>
        </div>
      </header>

      {/* Main Stats Row - Compact */}
      <div className="px-4 md:px-0">
        <StatCards
          watched={data.watchedStats}
          wants={data.wantsStats}
          shows={data.showsStats}
        />
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 md:px-0">
        {/* Manage Collection Card */}
        <a href="/manage-movies" className="block group relative overflow-hidden rounded-2xl h-48 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-pink-500/10 border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/90 to-orange-600/90 transition-all duration-500"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center mix-blend-overlay opacity-30"></div>
          <div className="relative h-full p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <span className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-1">Manage Library</h3>
              <p className="text-white/80 text-sm font-medium">Organize your {allMovies.length} items</p>
            </div>
          </div>
        </a>

        {/* Analytics Card (New) */}
        <a href="/analytics" className="block group relative overflow-hidden rounded-2xl h-48 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-cyan-500/10 border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/90 to-blue-600/90 transition-all duration-500"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center mix-blend-overlay opacity-30"></div>
          <div className="relative h-full p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <span className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              </span>
              <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase">New</span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-1">Analytics</h3>
              <p className="text-white/80 text-sm font-medium">Rating distributions & top lists</p>
            </div>
          </div>
        </a>

        {/* AI Assistant Mini Card */}
        <a href="/chat" className="block group relative overflow-hidden rounded-2xl h-48 transition-all hover:scale-[1.01] hover:shadow-xl hover:shadow-blue-500/10 border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-indigo-600/90 transition-all duration-500"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1531297461136-82lw9b29154a?auto=format&fit=crop&q=80&w=800')] bg-cover bg-center mix-blend-overlay opacity-30"></div>
          <div className="relative h-full p-6 flex flex-col justify-between z-10">
            <div className="flex justify-between items-start">
              <span className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </span>
              <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[10px] font-bold text-white uppercase">Beta</span>
            </div>
            <div>
              <h3 className="text-2xl font-black text-white mb-1">Ask CineMate</h3>
              <p className="text-white/80 text-sm font-medium">Get insights on your viewing habits</p>
            </div>
          </div>
        </a>
      </div>

      <ClientDashboard
        initialMovies={allMovies}
        userId={user.id}
      />
    </div>
  )
}
