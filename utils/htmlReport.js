const csv = require('csvtojson');
const fs = require('fs').promises;

async function generateHtmlReport() {
  try {
    // Load data
    const watched = await loadCsvData('watched_titles.csv');
    const wants = await loadCsvData('wants_titles.csv');
    const shows = await loadCsvData('shows_titles.csv');

    // Calculate statistics
    const watchedStats = calculateStats(watched);
    const wantsStats = calculateStats(wants);
    const showsStats = calculateStats(shows);

    // Generate HTML
    const html = generateHtml({
      watched: { data: watched, stats: watchedStats },
      wants: { data: wants, stats: wantsStats },
      shows: { data: shows, stats: showsStats },
      generatedAt: new Date().toLocaleString()
    });

    // Save to file
    await fs.writeFile('index.html', html);
    console.log('✅ HTML dashboard saved to index.html');
  } catch (error) {
    console.error('Error generating HTML report:', error);
    throw error;
  }
}

async function loadCsvData(filename) {
  try {
    return await csv().fromFile(filename);
  } catch (error) {
    console.warn(`Could not load ${filename}:`, error.message);
    return [];
  }
}

function calculateStats(data) {
  if (!data || data.length === 0) {
    return {
      total: 0,
      rated: 0,
      avgRating: 0,
      distribution: {}
    };
  }

  const rated = data.filter(item => item.rating && item.rating !== 'N/A');
  const ratings = rated.map(item => parseFloat(item.rating)).filter(r => !isNaN(r));
  const avgRating = ratings.length > 0 
    ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2)
    : 0;

  // Rating distribution
  const distribution = { 10: 0, 9: 0, 8: 0, 7: 0, 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
  ratings.forEach(rating => {
    const rounded = Math.floor(rating);
    if (distribution.hasOwnProperty(rounded)) {
      distribution[rounded]++;
    }
  });

  return {
    total: data.length,
    rated: rated.length,
    avgRating: parseFloat(avgRating),
    distribution
  };
}

function generateHtml(data) {
  const maxDistribution = Math.max(
    ...Object.values(data.watched.stats.distribution),
    ...Object.values(data.shows.stats.distribution)
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎬 Movie Tracker Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            padding: 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #667eea;
        }
        
        h1 {
            font-size: 2.5em;
            color: #667eea;
            margin-bottom: 10px;
        }
        
        .timestamp {
            color: #666;
            font-size: 0.9em;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-card.wants {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .stat-card.shows {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .stat-card h2 {
            font-size: 1.2em;
            margin-bottom: 15px;
            opacity: 0.9;
        }
        
        .stat-number {
            font-size: 3em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .stat-label {
            font-size: 0.9em;
            opacity: 0.8;
        }
        
        .stat-details {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid rgba(255,255,255,0.3);
            display: flex;
            justify-content: space-between;
        }
        
        .section {
            margin-top: 40px;
        }
        
        .section h2 {
            color: #667eea;
            font-size: 1.8em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e0e0e0;
        }
        
        .distribution {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin-top: 20px;
        }
        
        .bar-chart {
            display: flex;
            align-items: flex-end;
            justify-content: space-around;
            height: 250px;
            padding: 20px 0;
            border-bottom: 2px solid #ddd;
        }
        
        .bar-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            margin: 0 5px;
        }
        
        .bar {
            width: 100%;
            background: linear-gradient(to top, #667eea, #764ba2);
            border-radius: 5px 5px 0 0;
            transition: all 0.3s ease;
            min-height: 5px;
            position: relative;
        }
        
        .bar:hover {
            opacity: 0.8;
        }
        
        .bar-value {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-weight: bold;
            color: #667eea;
            font-size: 0.9em;
        }
        
        .bar-label {
            margin-top: 10px;
            font-weight: bold;
            color: #666;
        }
        
        .table-container {
            overflow-x: auto;
            margin-top: 20px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        th {
            background: #667eea;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            padding: 15px;
            border-bottom: 1px solid #e0e0e0;
        }
        
        tr:hover {
            background: #f8f9fa;
        }
        
        .rating {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-weight: bold;
        }
        
        .tag {
            display: inline-block;
            background: #e0e0e0;
            color: #333;
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 0.85em;
            margin: 2px;
        }
        
        footer {
            margin-top: 60px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
            }
            
            h1 {
                font-size: 1.8em;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .bar-chart {
                height: 200px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎬 Movie Tracker Dashboard</h1>
            <p class="timestamp">Generated: ${data.generatedAt}</p>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h2>🍿 Watched Movies</h2>
                <div class="stat-number">${data.watched.stats.total}</div>
                <div class="stat-label">Total Movies Watched</div>
                <div class="stat-details">
                    <span>Rated: ${data.watched.stats.rated}</span>
                    <span>Avg: ${data.watched.stats.avgRating}★</span>
                </div>
            </div>
            
            <div class="stat-card wants">
                <h2>📝 Want to Watch</h2>
                <div class="stat-number">${data.wants.stats.total}</div>
                <div class="stat-label">Movies on Watchlist</div>
                <div class="stat-details">
                    <span>Pre-rated: ${data.wants.stats.rated}</span>
                    <span>${data.watched.stats.total > 0 ? ((data.watched.stats.total / (data.watched.stats.total + data.wants.stats.total)) * 100).toFixed(1) : 0}% Complete</span>
                </div>
            </div>
            
            <div class="stat-card shows">
                <h2>📺 TV Shows</h2>
                <div class="stat-number">${data.shows.stats.total}</div>
                <div class="stat-label">TV Shows Tracked</div>
                <div class="stat-details">
                    <span>Rated: ${data.shows.stats.rated}</span>
                    <span>Avg: ${data.shows.stats.avgRating}★</span>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>📊 Watched Movies - Rating Distribution</h2>
            <div class="distribution">
                <div class="bar-chart">
                    ${generateBarChart(data.watched.stats.distribution, maxDistribution)}
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2>🌟 Top Rated Movies (8+ Stars)</h2>
            <div class="table-container">
                ${generateTopRatedTable(data.watched.data)}
            </div>
        </div>
        
        <div class="section">
            <h2>📺 Top Rated Shows</h2>
            <div class="table-container">
                ${generateTopRatedTable(data.shows.data)}
            </div>
        </div>
        
        <footer>
            <p>🎬 Generated automatically by Movie Tracker</p>
            <p>Total Content Tracked: ${data.watched.stats.total + data.wants.stats.total + data.shows.stats.total}</p>
        </footer>
    </div>
</body>
</html>`;
}

function generateBarChart(distribution, maxValue) {
  const ratings = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  return ratings.map(rating => {
    const count = distribution[rating] || 0;
    const height = maxValue > 0 ? (count / maxValue) * 100 : 0;
    return `
      <div class="bar-item">
        <div class="bar" style="height: ${Math.max(height, 2)}%;">
          ${count > 0 ? `<span class="bar-value">${count}</span>` : ''}
        </div>
        <div class="bar-label">${rating}★</div>
      </div>
    `;
  }).join('');
}

function generateTopRatedTable(data) {
  const topRated = data
    .filter(item => {
      const rating = parseFloat(item.rating);
      return !isNaN(rating) && rating >= 8;
    })
    .sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating))
    .slice(0, 20);

  if (topRated.length === 0) {
    return '<p style="color: #666; padding: 20px;">No items rated 8 or higher yet.</p>';
  }

  const rows = topRated.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><strong>${escapeHtml(item.title)}</strong></td>
      <td><span class="rating">${item.rating}★</span></td>
      <td>${item.watchedDate || '-'}</td>
      <td>${item.tags ? item.tags.split(';').map(tag => `<span class="tag">${escapeHtml(tag.trim())}</span>`).join('') : '-'}</td>
    </tr>
  `).join('');

  return `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Title</th>
          <th>Rating</th>
          <th>Watched Date</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

module.exports = {
  generateHtmlReport
};

