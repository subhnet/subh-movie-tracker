/**
 * Backfill Posters for Existing Movies
 * 
 * This script fetches poster URLs from TMDB for movies that don't have posters yet.
 * Run this once after setting up TMDB_API_KEY to add posters to existing movies.
 * 
 * Usage: node utils/backfill-posters.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const tmdbApiKey = process.env.TMDB_API_KEY;
const omdbApiKey = process.env.OMDB_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

if (!tmdbApiKey && !omdbApiKey) {
  console.error('❌ Missing TMDB_API_KEY or OMDB_API_KEY in .env.local');
  console.error('📖 Get TMDB key: https://www.themoviedb.org/settings/api');
  console.error('📖 Get OMDb key: https://www.omdbapi.com/apikey.aspx');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchMovieOnTMDB(title, type = 'movie') {
  try {
    const endpoint = type === 'show' ? 'search/tv' : 'search/movie';
    const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${tmdbApiKey}&query=${encodeURIComponent(title)}&page=1`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const firstResult = data.results[0];
      if (firstResult.poster_path) {
        return `https://image.tmdb.org/t/p/w185${firstResult.poster_path}`;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error searching TMDB for "${title}":`, error.message);
    return null;
  }
}

async function searchMovieOnOMDb(title, type = 'movie') {
  try {
    const omdbType = type === 'show' ? 'series' : 'movie';
    const url = `https://www.omdbapi.com/?apikey=${omdbApiKey}&t=${encodeURIComponent(title)}&type=${omdbType}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
      return data.Poster;
    }
    return null;
  } catch (error) {
    console.error(`Error searching OMDb for "${title}":`, error.message);
    return null;
  }
}

async function searchMovie(title, type = 'movie') {
  // Try TMDB first if available, otherwise use OMDb
  if (tmdbApiKey) {
    const poster = await searchMovieOnTMDB(title, type);
    if (poster) return poster;
  }
  
  if (omdbApiKey) {
    return await searchMovieOnOMDb(title, type);
  }
  
  return null;
}

async function backfillPosters() {
  console.log('🎬 Starting poster backfill process...\n');

  // Fetch all movies without posters
  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .is('poster_url', null);

  if (error) {
    console.error('❌ Error fetching movies:', error);
    process.exit(1);
  }

  if (!movies || movies.length === 0) {
    console.log('✅ All movies already have posters!');
    return;
  }

  console.log(`📊 Found ${movies.length} movies without posters\n`);

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const progress = `[${i + 1}/${movies.length}]`;
    
    console.log(`${progress} Searching for: ${movie.title}`);

    // Search using available API
    const posterUrl = await searchMovie(movie.title, movie.type);

    if (posterUrl) {
      // Update database
      const { error: updateError } = await supabase
        .from('movies')
        .update({ poster_url: posterUrl })
        .eq('id', movie.id);

      if (updateError) {
        console.log(`  ❌ Failed to update database`);
        failed++;
      } else {
        console.log(`  ✅ Added poster`);
        updated++;
      }
    } else {
      console.log(`  ⚠️  Poster not found`);
      notFound++;
    }

    // Rate limiting: Wait 250ms between requests (max 4 req/sec)
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Backfill Summary:');
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠️  Not found: ${notFound}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total processed: ${movies.length}`);
  console.log('='.repeat(50));
}

// Run the backfill
backfillPosters()
  .then(() => {
    console.log('\n✨ Backfill complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  });

