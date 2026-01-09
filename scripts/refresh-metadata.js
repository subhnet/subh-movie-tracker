require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
// Node.js 18+ has native fetch, no need for node-fetch package

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Service role key would be better but using anon for now if RLS allows or user provides it
const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !TMDB_API_KEY) {
    console.error('Missing environment variables. Please check .env file.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function searchTMDB(title, type) {
    try {
        const mediaType = type === 'show' ? 'tv' : 'movie';
        const response = await fetch(
            `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&page=1`
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
            return data.results[0];
        }
    } catch (error) {
        console.error(`Error searching TMDB for ${title}:`, error.message);
    }
    return null;
}

async function run() {
    console.log('Starting metadata refresh (including providers)...');

    const { data: movies, error } = await supabase
        .from('movies')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching movies:', error);
        return;
    }

    console.log(`Found ${movies.length} movies to check.`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const movie of movies) {
        // Rate limit manual delay
        await new Promise(r => setTimeout(r, 100));

        const tmdbResult = await searchTMDB(movie.title, movie.type);

        if (tmdbResult) {
            // Fetch providers
            const endpoints = movie.type === 'show' ? 'tv' : 'movie';
            const providerResponse = await fetch(
                `https://api.themoviedb.org/3/${endpoints}/${tmdbResult.id}/watch/providers?api_key=${TMDB_API_KEY}`
            );

            let providers = null;
            if (providerResponse.ok) {
                const pData = await providerResponse.json();
                providers = pData.results;
            }

            const posterUrl = tmdbResult.poster_path
                ? `https://image.tmdb.org/t/p/w500${tmdbResult.poster_path}`
                : null;

            let credits = null;
            const creditsResponse = await fetch(
                `https://api.themoviedb.org/3/${endpoints}/${tmdbResult.id}/credits?api_key=${TMDB_API_KEY}`
            );
            if (creditsResponse.ok) {
                credits = await creditsResponse.json();
            }

            const updateData = {};

            if (!movie.poster_url && posterUrl) updateData.poster_url = posterUrl;
            if (!movie.overview && tmdbResult.overview) updateData.overview = tmdbResult.overview;
            if (providers) updateData.providers = providers;
            if (credits) updateData.credits = credits;

            if (Object.keys(updateData).length > 0) {
                const { error: updateError } = await supabase
                    .from('movies')
                    .update(updateData)
                    .eq('id', movie.id);

                if (updateError) {
                    console.error(`  Failed to update DB for ${movie.title}: ${updateError.message}`);
                    failedCount++;
                } else {
                    process.stdout.write('.');
                    updatedCount++;
                }
            }
        } else {
            console.log(`\n  Not found: ${movie.title}`);
            failedCount++;
        }
    }

    console.log('\n-----------------------------------');
    console.log(`Finished! Updated: ${updatedCount}, Failed/Skipped: ${failedCount}`);
}

run();
