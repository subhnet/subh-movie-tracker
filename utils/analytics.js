const csv = require('csvtojson');
const fs = require('fs').promises;
const path = require('path');

// Calculate statistics from CSV files
async function generateStatistics() {
  try {
    const stats = {
      watched: await analyzeList('watched_titles.csv', 'watched'),
      wants: await analyzeList('wants_titles.csv', 'wants'),
      shows: await analyzeList('shows_titles.csv', 'shows'),
      timestamp: new Date().toISOString()
    };

    // Generate markdown report
    await generateMarkdownReport(stats);
    
    return stats;
  } catch (error) {
    console.error('Error generating statistics:', error);
    throw error;
  }
}

// Analyze a single list
async function analyzeList(filename, listType) {
  try {
    const data = await csv().fromFile(filename);
    
    if (!data || data.length === 0) {
      return {
        total: 0,
        rated: 0,
        unrated: 0,
        averageRating: 0,
        ratingDistribution: {},
        topRated: [],
        recentlyAdded: [],
        tags: {}
      };
    }

    // Basic counts
    const total = data.length;
    const rated = data.filter(item => item.rating && item.rating !== 'N/A').length;
    const unrated = total - rated;

    // Rating analysis
    const ratings = data
      .filter(item => item.rating && item.rating !== 'N/A')
      .map(item => parseFloat(item.rating))
      .filter(r => !isNaN(r));

    const averageRating = ratings.length > 0 
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
      : 0;

    // Rating distribution
    const ratingDistribution = {};
    ratings.forEach(rating => {
      const rounded = Math.floor(rating);
      ratingDistribution[rounded] = (ratingDistribution[rounded] || 0) + 1;
    });

    // Top rated (8 or higher)
    const topRated = data
      .filter(item => {
        const rating = parseFloat(item.rating);
        return !isNaN(rating) && rating >= 8;
      })
      .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
      .slice(0, 10)
      .map(item => ({
        title: item.title,
        rating: item.rating,
        watchedDate: item.watchedDate || '',
        tags: item.tags || ''
      }));

    // Recently added (based on scrapedDate)
    const recentlyAdded = data
      .filter(item => item.scrapedDate)
      .sort((a, b) => new Date(b.scrapedDate) - new Date(a.scrapedDate))
      .slice(0, 10)
      .map(item => ({
        title: item.title,
        rating: item.rating,
        scrapedDate: item.scrapedDate
      }));

    // Tags analysis
    const tags = {};
    data.forEach(item => {
      if (item.tags) {
        const itemTags = item.tags.split(';').map(t => t.trim()).filter(t => t);
        itemTags.forEach(tag => {
          tags[tag] = (tags[tag] || 0) + 1;
        });
      }
    });

    // Rewatch count
    const rewatched = data.filter(item => item.rewatched === 'true').length;

    // Date analysis (for watched items)
    let watchingStats = null;
    if (listType === 'watched') {
      watchingStats = analyzeWatchingPatterns(data);
    }

    return {
      total,
      rated,
      unrated,
      averageRating: parseFloat(averageRating),
      ratingDistribution,
      topRated,
      recentlyAdded,
      tags,
      rewatched,
      watchingStats
    };
  } catch (error) {
    console.error(`Error analyzing ${filename}:`, error.message);
    return {
      total: 0,
      rated: 0,
      unrated: 0,
      averageRating: 0,
      ratingDistribution: {},
      topRated: [],
      recentlyAdded: [],
      tags: {},
      error: error.message
    };
  }
}

// Analyze watching patterns
function analyzeWatchingPatterns(data) {
  const itemsWithDates = data.filter(item => item.watchedDate && item.watchedDate !== '');
  
  if (itemsWithDates.length === 0) {
    return null;
  }

  // Group by month
  const byMonth = {};
  const byYear = {};
  
  itemsWithDates.forEach(item => {
    try {
      const date = new Date(item.watchedDate);
      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const yearKey = date.getFullYear().toString();
        
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        byYear[yearKey] = (byYear[yearKey] || 0) + 1;
      }
    } catch (err) {
      // Skip invalid dates
    }
  });

  return {
    totalWithDates: itemsWithDates.length,
    byMonth,
    byYear,
    mostActiveMonth: Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0]
  };
}

// Generate markdown report
async function generateMarkdownReport(stats) {
  const lines = [];
  
  lines.push('# 🎬 Movie Tracker Statistics\n');
  lines.push(`*Last Updated: ${new Date(stats.timestamp).toLocaleString()}*\n`);
  lines.push('---\n');

  // Watched Movies
  lines.push('## 🍿 Watched Movies\n');
  lines.push(`- **Total Watched:** ${stats.watched.total}`);
  lines.push(`- **Rated:** ${stats.watched.rated}`);
  lines.push(`- **Unrated:** ${stats.watched.unrated}`);
  lines.push(`- **Average Rating:** ${stats.watched.averageRating}/10`);
  if (stats.watched.rewatched > 0) {
    lines.push(`- **Rewatched:** ${stats.watched.rewatched}`);
  }
  lines.push('');

  // Rating Distribution
  if (Object.keys(stats.watched.ratingDistribution).length > 0) {
    lines.push('### Rating Distribution\n');
    const sortedRatings = Object.entries(stats.watched.ratingDistribution)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
    
    sortedRatings.forEach(([rating, count]) => {
      const bar = '█'.repeat(Math.ceil(count / 5)) || '▏';
      lines.push(`- **${rating}★**: ${count} ${bar}`);
    });
    lines.push('');
  }

  // Top Rated
  if (stats.watched.topRated.length > 0) {
    lines.push('### 🌟 Top Rated (8+ Stars)\n');
    stats.watched.topRated.slice(0, 10).forEach((item, index) => {
      lines.push(`${index + 1}. **${item.title}** - ${item.rating}★${item.tags ? ` _[${item.tags}]_` : ''}`);
    });
    lines.push('');
  }

  // Watching Patterns
  if (stats.watched.watchingStats) {
    const ws = stats.watched.watchingStats;
    if (ws.totalWithDates > 0) {
      lines.push('### 📅 Watching Patterns\n');
      lines.push(`- **Movies with watch dates:** ${ws.totalWithDates}`);
      
      if (ws.mostActiveMonth) {
        lines.push(`- **Most active month:** ${ws.mostActiveMonth[0]} (${ws.mostActiveMonth[1]} movies)`);
      }
      
      lines.push('\n**By Year:**');
      const sortedYears = Object.entries(ws.byYear).sort((a, b) => b[0] - a[0]);
      sortedYears.forEach(([year, count]) => {
        lines.push(`- ${year}: ${count} movies`);
      });
      lines.push('');
    }
  }

  // Want to Watch
  lines.push('## 📝 Want to Watch\n');
  lines.push(`- **Total on Watchlist:** ${stats.wants.total}`);
  lines.push(`- **Pre-rated:** ${stats.wants.rated}`);
  if (stats.wants.total > 0) {
    const completionRate = ((stats.watched.total / (stats.watched.total + stats.wants.total)) * 100).toFixed(1);
    lines.push(`- **Completion Rate:** ${completionRate}%`);
  }
  lines.push('');

  // Recently Added to Watchlist
  if (stats.wants.recentlyAdded.length > 0) {
    lines.push('### Recently Added to Watchlist\n');
    stats.wants.recentlyAdded.slice(0, 5).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}${item.rating !== 'N/A' ? ` (${item.rating}★)` : ''}`);
    });
    lines.push('');
  }

  // TV Shows
  lines.push('## 📺 TV Shows\n');
  lines.push(`- **Total Shows:** ${stats.shows.total}`);
  lines.push(`- **Rated:** ${stats.shows.rated}`);
  lines.push(`- **Average Rating:** ${stats.shows.averageRating}/10`);
  lines.push('');

  // Top Rated Shows
  if (stats.shows.topRated.length > 0) {
    lines.push('### Top Rated Shows\n');
    stats.shows.topRated.slice(0, 5).forEach((item, index) => {
      lines.push(`${index + 1}. **${item.title}** - ${item.rating}★`);
    });
    lines.push('');
  }

  // Tags Summary
  const allTags = { ...stats.watched.tags, ...stats.wants.tags, ...stats.shows.tags };
  if (Object.keys(allTags).length > 0) {
    lines.push('## 🏷️ Popular Tags\n');
    const sortedTags = Object.entries(allTags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    sortedTags.forEach(([tag, count]) => {
      lines.push(`- **${tag}**: ${count}`);
    });
    lines.push('');
  }

  // Overall Summary
  lines.push('## 📊 Overall Summary\n');
  const totalContent = stats.watched.total + stats.wants.total + stats.shows.total;
  lines.push(`- **Total Tracked Content:** ${totalContent}`);
  lines.push(`- **Movies Watched:** ${stats.watched.total}`);
  lines.push(`- **Movies to Watch:** ${stats.wants.total}`);
  lines.push(`- **TV Shows:** ${stats.shows.total}`);
  
  if (stats.watched.rated > 0) {
    lines.push(`- **Overall Average Rating:** ${stats.watched.averageRating}/10`);
  }
  lines.push('');

  lines.push('---\n');
  lines.push('*Generated automatically by Movie Tracker*');

  // Write to file
  const content = lines.join('\n');
  await fs.writeFile('STATS.md', content);
  console.log('✅ Statistics saved to STATS.md');
}

module.exports = {
  generateStatistics,
  analyzeList
};

