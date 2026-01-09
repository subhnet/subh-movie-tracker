import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { fetchUserMovies } from '@/lib/data-fetcher'
import RatingChart from '../components/RatingChart'
import TopRatedTable from '../components/TopRatedTable'
import TopList from '../components/TopList'

export default async function AnalyticsPage() {
    const user = await getServerUser()

    if (!user) {
        redirect('/login')
    }

    const data = await fetchUserMovies(user.id)
    const topRatedMovies = data.watched.filter((m) => parseFloat(m.rating) >= 8).sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    const topRatedShows = data.shows.filter((m) => parseFloat(m.rating) >= 8).sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20 px-4 md:px-0">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                    Analytics & Insights
                </h1>
                <p className="text-white/60">
                    Deep dive into your viewing habits and top rated content.
                </p>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-[400px] flex flex-col relative w-full">
                    <div className="flex-1 w-full min-h-0 relative">
                        <RatingChart
                            title="Movie Rating Distribution"
                            distribution={data.watchedStats.distribution}
                            color="rgba(96, 165, 250, 0.9)"
                        />
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-[400px] flex flex-col relative w-full">
                    <div className="flex-1 w-full min-h-0 relative">
                        <RatingChart
                            title="TV Show Rating Distribution"
                            distribution={data.showsStats.distribution}
                            color="rgba(244, 114, 182, 0.9)"
                        />
                    </div>
                </div>
            </div>

            {/* People Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TopList
                    title="Top Actors"
                    items={data.watchedStats.topActors}
                    icon="🎭"
                    emptyMessage="Add movies with metadata to see top actors"
                />
                <TopList
                    title="Top Directors"
                    items={data.watchedStats.topDirectors}
                    icon="🎬"
                    emptyMessage="Add movies with metadata to see top directors"
                />
            </div>

            {/* Top Rated Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TopRatedTable title="🎬 Top Rated Movies" movies={topRatedMovies} />
                <TopRatedTable title="📺 Top Rated Shows" movies={topRatedShows} />
            </div>
        </div>
    )
}
