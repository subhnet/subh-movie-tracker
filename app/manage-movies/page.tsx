import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth-server'
import { fetchAllUserMovies } from '@/lib/data-fetcher'
import ClientMovieManager from '../components/ClientMovieManager'

export default async function ManageMoviesPage() {
  // Server-side authentication - fast and secure
  const user = await getServerUser()

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login')
  }

  // Fetch initial batch of movies on the server - fast load!
  // The rest will be loaded in the background by ClientMovieManager
  const movies = await fetchAllUserMovies(user.id, 50)

  // Pass data to client component for interactive features
  return (
    <ClientMovieManager
      initialMovies={movies}
      userId={user.id}
      username={user.username}
    />
  )
}
