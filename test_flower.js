const sharp = require('sharp');

const flowerSvg = `
<svg width="1920" height="1440" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#87ceeb" />
      <stop offset="100%" style="stop-color:#e0f6ff" />
    </linearGradient>
    <radialGradient id="center">
      <stop offset="0%" style="stop-color:#ffd700" />
      <stop offset="100%" style="stop-color:#ffa500" />
    </radialGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Sky background -->
  <rect width="1920" height="1440" fill="url(#sky)" />

  <!-- Ground/grass -->
  <ellipse cx="960" cy="1250" rx="900" ry="250" fill="#90ee90" opacity="0.8" filter="url(#shadow)" />

  <!-- Main stem -->
  <path d="M 960 1200 Q 950 1000 960 400" stroke="#228b22" stroke-width="28" fill="none" stroke-linecap="round" />

  <!-- Left leaf -->
  <ellipse cx="850" cy="900" rx="100" ry="180" fill="#228b22" transform="rotate(-35 850 900)" filter="url(#shadow)" opacity="0.9" />
  <ellipse cx="820" cy="900" rx="60" ry="140" fill="#32cd32" transform="rotate(-35 820 900)" opacity="0.6" />

  <!-- Right leaf -->
  <ellipse cx="1070" cy="950" rx="100" ry="180" fill="#32cd32" transform="rotate(35 1070 950)" filter="url(#shadow)" opacity="0.9" />
  <ellipse cx="1100" cy="950" rx="60" ry="140" fill="#228b22" transform="rotate(35 1100 950)" opacity="0.6" />

  <!-- Main flower petals - pink and magenta -->
  <circle cx="960" cy="280" r="130" fill="#ff69b4" filter="url(#shadow)" />
  <circle cx="1130" cy="360" r="130" fill="#ff1493" filter="url(#shadow)" />
  <circle cx="1110" cy="550" r="130" fill="#ff69b4" filter="url(#shadow)" />
  <circle cx="810" cy="550" r="130" fill="#ff1493" filter="url(#shadow)" />
  <circle cx="790" cy="360" r="130" fill="#ff69b4" filter="url(#shadow)" />

  <!-- Outer petals (lighter) -->
  <circle cx="1000" cy="180" r="100" fill="#ffb6d9" opacity="0.9" />
  <circle cx="1170" cy="280" r="100" fill="#ffb6d9" opacity="0.9" />
  <circle cx="1170" cy="500" r="100" fill="#ffb6d9" opacity="0.9" />
  <circle cx="750" cy="500" r="100" fill="#ffb6d9" opacity="0.9" />
  <circle cx="750" cy="280" r="100" fill="#ffb6d9" opacity="0.9" />
  <circle cx="920" cy="180" r="100" fill="#ffb6d9" opacity="0.9" />

  <!-- Flower center -->
  <circle cx="960" cy="400" r="110" fill="url(#center)" filter="url(#shadow)" />

  <!-- Inner center -->
  <circle cx="960" cy="400" r="70" fill="#ffed4e" />
  <circle cx="960" cy="400" r="40" fill="#ffd700" opacity="0.7" />

  <!-- Small side flowers -->
  <g filter="url(#shadow)">
    <circle cx="680" cy="700" r="70" fill="#ff69b4" opacity="0.8" />
    <circle cx="680" cy="730" r="50" fill="#ffd700" />
  </g>

  <g filter="url(#shadow)">
    <circle cx="1240" cy="750" r="70" fill="#ff1493" opacity="0.8" />
    <circle cx="1240" cy="780" r="50" fill="#ffa500" />
  </g>

  <!-- Decorative frame -->
  <rect x="100" y="100" width="1720" height="1240" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="6" rx="30" />

  <!-- Title area placeholder -->
  <rect x="100" y="1280" width="1720" height="80" fill="rgba(255,255,255,0.15)" rx="10" />
  <text x="960" y="1335" text-anchor="middle" font-family="Georgia, serif" font-size="40" fill="white" font-weight="bold">Botanical Elegance</text>
</svg>
`;

sharp(Buffer.from(flowerSvg))
  .png()
  .toFile('posters/test_flower.png')
  .then(() => {
    const fs = require('fs');
    const stats = fs.statSync('posters/test_flower.png');
    console.log('✓ Test flower image created');
    console.log(`  Size: ${(stats.size / 1024).toFixed(0)}KB`);
  })
  .catch(err => console.error('Error:', err.message));
