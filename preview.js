const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = 3000;

app.use(express.static('posters'));
app.use(express.json());

// Serve HTML preview page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Poster Preview</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { margin-bottom: 20px; color: #333; }
        .category-section { margin-bottom: 40px; }
        .category-title { font-size: 24px; font-weight: bold; margin: 30px 0 15px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .poster-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .poster-card { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .poster-card:hover { transform: translateY(-5px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .poster-image { width: 100%; height: 300px; object-fit: cover; background: #f0f0f0; }
        .poster-info { padding: 15px; }
        .poster-title { font-weight: bold; margin-bottom: 5px; color: #2c3e50; }
        .poster-meta { font-size: 12px; color: #7f8c8d; margin-bottom: 10px; }
        .poster-links { display: flex; gap: 5px; flex-wrap: wrap; }
        .pdf-link { display: inline-block; padding: 5px 10px; background: #3498db; color: white; text-decoration: none; border-radius: 4px; font-size: 11px; }
        .pdf-link:hover { background: #2980b9; }
        .stats { background: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 15px; }
        .stat-item { text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; color: #3498db; }
        .stat-label { font-size: 12px; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎨 Poster Preview</h1>
        <div id="stats" class="stats"></div>
        <div id="categories"></div>
      </div>

      <script>
        async function loadPosters() {
          try {
            const response = await fetch('/api/posters');
            const data = await response.json();

            // Update stats
            const stats = data.stats;
            document.getElementById('stats').innerHTML = \`
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-number">\${stats.totalPosters}</div>
                  <div class="stat-label">Total Posters</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">\${stats.totalPdfs}</div>
                  <div class="stat-label">PDF Files</div>
                </div>
                <div class="stat-item">
                  <div class="stat-number">\${stats.categories}</div>
                  <div class="stat-label">Categories</div>
                </div>
              </div>
            \`;

            // Display posters by category
            const categoriesDiv = document.getElementById('categories');
            const categories = Object.keys(data.posters).sort();

            categoriesDiv.innerHTML = categories.map(category => {
              const posters = data.posters[category];
              return \`
                <div class="category-section">
                  <div class="category-title">\${category} (\${posters.length})</div>
                  <div class="poster-grid">
                    \${posters.map(poster => \`
                      <div class="poster-card">
                        <img src="\${poster.imagePath}" class="poster-image" alt="\${poster.title}">
                        <div class="poster-info">
                          <div class="poster-title">\${poster.title}</div>
                          <div class="poster-meta">\${poster.style}</div>
                          <div class="poster-links">
                            \${poster.pdfs.map((pdf, idx) => \`
                              <a href="\${pdf}" class="pdf-link">\${[
                                '13x18', '21x30', '30x40', '40x50', '50x70', '70x100'
                              ][idx]}</a>
                            \`).join('')}
                          </div>
                        </div>
                      </div>
                    \`).join('')}
                  </div>
                </div>
              \`;
            }).join('');
          } catch (error) {
            document.getElementById('categories').innerHTML = '<p>Error loading posters</p>';
          }
        }

        loadPosters();
      </script>
    </body>
    </html>
  `);
});

// API endpoint to get all posters
app.get('/api/posters', (req, res) => {
  const inventory = JSON.parse(fs.readFileSync('posters_inventory.json', 'utf-8'));

  const posters = {};
  const stats = {
    totalPosters: inventory.posters.length,
    totalPdfs: inventory.posters.length * 6,
    categories: new Set(inventory.posters.map(p => p.category)).size
  };

  // Group by category
  for (const poster of inventory.posters) {
    if (!posters[poster.category]) {
      posters[poster.category] = [];
    }

    posters[poster.category].push({
      title: poster.title,
      style: poster.artStyle,
      imagePath: `/${poster.imagePath}`,
      pdfs: poster.pdfPaths || []
    });
  }

  res.json({ posters, stats });
});

app.listen(PORT, () => {
  console.log(`\n✓ Preview server running at http://localhost:${PORT}`);
  console.log(`✓ Open your browser to see generated posters\n`);
});
