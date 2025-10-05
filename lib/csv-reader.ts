import { promises as fs } from 'fs';
import path from 'path';
import type { Movie, MovieStats } from './types';

const csv = require('csvtojson');

export async function readMoviesFromCSV(filename: string): Promise<Movie[]> {
  try {
    // For Vercel, prioritize public directory
    const isVercel = process.env.VERCEL === '1';
    
    const pathsToTry = isVercel ? [
      path.join(process.cwd(), 'public', filename),          // Public directory (Vercel)
      path.join(process.cwd(), filename),                    // Root directory fallback
    ] : [
      path.join(process.cwd(), filename),                    // Root directory (local dev)
      path.join(process.cwd(), 'public', filename),          // Public directory fallback
    ];
    
    console.log(`🔍 Looking for ${filename}...`);
    console.log(`   Environment: ${isVercel ? 'Vercel' : 'Local'}`);
    console.log(`   Working directory: ${process.cwd()}`);
    
    let filePath = pathsToTry[0];
    let fileFound = false;
    
    // Try each path until we find the file
    for (const tryPath of pathsToTry) {
      try {
        await fs.access(tryPath);
        filePath = tryPath;
        fileFound = true;
        console.log(`✅ Found ${filename} at: ${tryPath}`);
        break;
      } catch (err) {
        console.log(`❌ Not found at: ${tryPath}`);
      }
    }
    
    if (!fileFound) {
      console.error(`❌ ERROR: Could not find ${filename} in any location!`);
      console.error(`   Tried paths:`, pathsToTry);
      
      // List what files ARE in the directories
      try {
        const rootFiles = await fs.readdir(process.cwd());
        console.log(`   Files in root:`, rootFiles.filter(f => f.endsWith('.csv')));
        
        const publicPath = path.join(process.cwd(), 'public');
        const publicFiles = await fs.readdir(publicPath);
        console.log(`   Files in public:`, publicFiles.filter(f => f.endsWith('.csv')));
      } catch (e) {
        console.error(`   Could not list directory contents:`, e);
      }
      
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

