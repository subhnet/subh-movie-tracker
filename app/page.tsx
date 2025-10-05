import { getDashboardData } from '@/lib/csv-reader'
import StatCards from './components/StatCards'
import RatingChart from './components/RatingChart'
import TopRatedTable from './components/TopRatedTable'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const data = await getDashboardData()

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
          🎬 Movie Tracker Dashboard
        </h1>
        <p className="text-white/90 text-lg drop-shadow">
          Last Updated: {new Date().toLocaleString()}
        </p>
      </header>

      <StatCards 
        watched={data.watchedStats}
        wants={data.wantsStats}
        shows={data.showsStats}
      />

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

      <TopRatedTable 
        title="🌟 Top Rated Movies (8+ Stars)"
        movies={data.watched.filter(m => parseFloat(m.rating) >= 8)}
      />

      <TopRatedTable 
        title="📺 Top Rated Shows"
        movies={data.shows.filter(m => parseFloat(m.rating) >= 8)}
      />
    </div>
  )
}

