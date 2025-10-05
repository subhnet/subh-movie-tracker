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
  // Prepare chart data
  const ratingLabels = ['10★', '9★', '8★', '7★', '6★', '5★', '4★', '3★', '2★', '1★'];
  const watchedDistribution = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => data.watched.stats.distribution[r] || 0);
  const showsDistribution = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(r => data.shows.stats.distribution[r] || 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎬 Movie Tracker Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
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
        
        .chart-container {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 15px;
            margin-top: 20px;
            position: relative;
            height: 400px;
        }
        
        canvas {
            max-height: 350px !important;
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
            <div class="chart-container">
                <canvas id="ratingChart"></canvas>
            </div>
        </div>
        
        <div class="section">
            <h2>📺 TV Shows - Rating Distribution</h2>
            <div class="chart-container">
                <canvas id="showsChart"></canvas>
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
    
    <script>
        // Rating Distribution Chart for Movies
        const ratingCtx = document.getElementById('ratingChart').getContext('2d');
        new Chart(ratingCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(ratingLabels)},
                datasets: [{
                    label: 'Number of Movies',
                    data: ${JSON.stringify(watchedDistribution)},
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(118, 75, 162, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' movies';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 20,
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 13, weight: 'bold' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        // Rating Distribution Chart for TV Shows
        const showsCtx = document.getElementById('showsChart').getContext('2d');
        new Chart(showsCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(ratingLabels)},
                datasets: [{
                    label: 'Number of Shows',
                    data: ${JSON.stringify(showsDistribution)},
                    backgroundColor: 'rgba(79, 172, 254, 0.8)',
                    borderColor: 'rgba(79, 172, 254, 1)',
                    borderWidth: 2,
                    borderRadius: 8,
                    hoverBackgroundColor: 'rgba(0, 242, 254, 0.9)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' shows';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 10,
                            font: { size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 13, weight: 'bold' }
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
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

