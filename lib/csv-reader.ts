import { promises as fs } from 'fs';
import path from 'path';
import type { Movie, MovieStats } from './types';

const csv = require('csvtojson');

export async function readMoviesFromCSV(filename: string): Promise<Movie[]> {
  try {
    // public/ is the single source for these CSVs: it's always bundled by
    // Vercel's serverless file-tracing (unlike dynamically-referenced paths
    // elsewhere in the repo), and it works identically in local dev.
    const filePath = path.join(process.cwd(), 'public', filename);

    try {
      await fs.access(filePath);
    } catch (err) {
      console.error(`❌ Could not find ${filename} at: ${filePath}`);
      return [];
    }

    const data = await csv().fromFile(filePath);
    console.log(`✅ Successfully read ${data.length} items from ${filename}`);
    return data as Movie[];
  } catch (error) {
    console.error(`❌ EXCEPTION reading ${filename}:`, error);
    return [];
  }
}

export function calculateStats(movies: Movie[]): MovieStats {
  if (!movies || movies.length === 0) {
    return {
      total: 0,
      rated: 0,
      avgRating: 0,
      distribution: {}
    };
  }

  const rated = movies.filter(m => m.rating && m.rating !== 'N/A');
  const ratings = rated
    .map(m => parseFloat(m.rating))
    .filter(r => !isNaN(r));

  const avgRating = ratings.length > 0
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  // Rating distribution
  const distribution: Record<number, number> = {
    10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0
  };

  ratings.forEach(rating => {
    const rounded = Math.floor(rating);
    if (distribution.hasOwnProperty(rounded)) {
      distribution[rounded]++;
    }
  });

  return {
    total: movies.length,
    rated: rated.length,
    avgRating: parseFloat(avgRating.toFixed(2)),
    distribution
  };
}

export async function getDashboardData() {
  const [watched, wants, shows] = await Promise.all([
    readMoviesFromCSV('watched_titles.csv'),
    readMoviesFromCSV('wants_titles.csv'),
    readMoviesFromCSV('shows_titles.csv')
  ]);

  return {
    watched,
    wants,
    shows,
    watchedStats: calculateStats(watched),
    wantsStats: calculateStats(wants),
    showsStats: calculateStats(shows)
  };
}

