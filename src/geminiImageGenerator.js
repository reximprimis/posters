const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class GeminiImageGenerator {
  constructor() {
    // No API key needed for SVG-based image generation
  }

  buildImagePrompt(title, category, style) {
    return `Generate poster: "${title}" in ${category} style: ${style}`;
  }

  async generateImage(title, category, style, outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      console.log(`    → Creating botanical poster design...`);
      await this.generateBotanicalPoster(title, category, style, outputPath);
      console.log(`    ✓ Image generated`);
      return outputPath;
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
      throw error;
    }
  }

  async generateBotanicalPoster(title, category, style, outputPath) {
    const width = 1920;
    const height = 1440;

    const primaryColor = this.getCategoryColor(category);
    const secondaryColor = this.getSecondaryColor(category);
    const accentColor = this.getAccentColor(category);

    // Create botanical poster with actual plant elements
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#f0f8f5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e8f5f0;stop-opacity:1" />
          </linearGradient>

          <linearGradient id="mainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgb(${primaryColor.r},${primaryColor.g},${primaryColor.b});stop-opacity:0.15" />
            <stop offset="100%" style="stop-color:rgb(${secondaryColor.r},${secondaryColor.g},${secondaryColor.b});stop-opacity:0.1" />
          </linearGradient>

          <radialGradient id="flowerCenter">
            <stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ff9500;stop-opacity:0.8" />
          </radialGradient>

          <filter id="plantShadow">
            <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.15"/>
          </filter>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Background sky -->
        <rect width="${width}" height="${height}" fill="url(#skyGrad)" />

        <!-- Ground -->
        <rect x="0" y="1000" width="${width}" height="440" fill="#d4e8d4" opacity="0.6" />
        <ellipse cx="960" cy="1050" rx="800" ry="150" fill="#c8e0c8" opacity="0.4" />

        <!-- Large leaf background elements -->
        <g filter="url(#plantShadow)" opacity="0.7">
          <ellipse cx="150" cy="300" rx="120" ry="200" fill="#7cb342" transform="rotate(-45 150 300)" />
          <ellipse cx="100" cy="350" rx="80" ry="150" fill="#9ccc65" transform="rotate(-45 100 350)" />
          <path d="M 150 250 Q 120 300 150 350" stroke="#7cb342" stroke-width="3" fill="none" opacity="0.6" />
        </g>

        <!-- Right side leaf cluster -->
        <g filter="url(#plantShadow)" opacity="0.7">
          <ellipse cx="1850" cy="400" rx="100" ry="180" fill="#7cb342" transform="rotate(35 1850 400)" />
          <ellipse cx="1900" cy="450" rx="90" ry="160" fill="#9ccc65" transform="rotate(35 1900 450)" />
          <path d="M 1850 300 Q 1880 380 1850 450" stroke="#7cb342" stroke-width="3" fill="none" opacity="0.6" />
        </g>

        <!-- Left flower cluster -->
        <g filter="url(#plantShadow)">
          <!-- Stem -->
          <path d="M 300 1000 Q 280 800 300 500" stroke="#558b2f" stroke-width="8" fill="none" stroke-linecap="round" />

          <!-- Leaves on stem -->
          <ellipse cx="250" cy="750" rx="45" ry="120" fill="#7cb342" transform="rotate(-30 250 750)" />
          <ellipse cx="350" cy="650" rx="45" ry="120" fill="#9ccc65" transform="rotate(30 350 650)" />

          <!-- Flower petals (pink roses) -->
          <circle cx="300" cy="450" r="70" fill="#e91e63" opacity="0.9" filter="url(#glow)" />
          <circle cx="270" cy="420" r="55" fill="#f06292" opacity="0.8" />
          <circle cx="330" cy="420" r="55" fill="#f06292" opacity="0.8" />
          <circle cx="300" cy="380" r="50" fill="#ec407a" />
          <circle cx="300" cy="420" r="40" fill="#ffc0cb" />
          <circle cx="300" cy="410" r="25" fill="#ffb6c1" />
        </g>

        <!-- Right flower cluster -->
        <g filter="url(#plantShadow)">
          <!-- Stem -->
          <path d="M 1700 1000 Q 1720 800 1700 500" stroke="#558b2f" stroke-width="8" fill="none" stroke-linecap="round" />

          <!-- Leaves -->
          <ellipse cx="1750" cy="750" rx="45" ry="120" fill="#7cb342" transform="rotate(30 1750 750)" />
          <ellipse cx="1650" cy="650" rx="45" ry="120" fill="#9ccc65" transform="rotate(-30 1650 650)" />

          <!-- Flower (lavender purple) -->
          <circle cx="1700" cy="480" r="65" fill="#9575cd" opacity="0.9" filter="url(#glow)" />
          <circle cx="1680" cy="460" r="50" fill="#b39ddb" opacity="0.8" />
          <circle cx="1720" cy="460" r="50" fill="#b39ddb" opacity="0.8" />
          <circle cx="1700" cy="420" r="48" fill="#ce93d8" />
          <circle cx="1700" cy="460" r="38" fill="#e1bee7" />
          <circle cx="1700" cy="450" r="20" fill="#f3e5f5" />
        </g>

        <!-- Center tall flowers -->
        <g filter="url(#plantShadow)">
          <!-- Stem -->
          <path d="M 960 1000 Q 960 700 960 350" stroke="#558b2f" stroke-width="10" fill="none" stroke-linecap="round" />

          <!-- Side leaves -->
          <ellipse cx="900" cy="700" rx="50" ry="140" fill="#7cb342" transform="rotate(-35 900 700)" />
          <ellipse cx="1020" cy="650" rx="50" ry="140" fill="#9ccc65" transform="rotate(35 1020 650)" />
          <ellipse cx="900" cy="500" rx="48" ry="130" fill="#7cb342" transform="rotate(-30 900 500)" />
          <ellipse cx="1020" cy="480" rx="48" ry="130" fill="#9ccc65" transform="rotate(30 1020 480)" />

          <!-- Main flower (white) -->
          <circle cx="960" cy="320" r="80" fill="#ffffff" opacity="0.95" filter="url(#glow)" />
          <circle cx="920" cy="290" r="65" fill="#f5f5f5" opacity="0.9" />
          <circle cx="1000" cy="290" r="65" fill="#f5f5f5" opacity="0.9" />
          <circle cx="930" cy="340" r="60" fill="#f5f5f5" />
          <circle cx="990" cy="340" r="60" fill="#f5f5f5" />
          <circle cx="960" cy="280" r="55" fill="#fffacd" />
          <circle cx="960" cy="320" r="45" fill="#ffd700" />
          <circle cx="960" cy="318" r="28" fill="#ffb347" />
        </g>

        <!-- Bottom decorative plants -->
        <g opacity="0.6" filter="url(#plantShadow)">
          <!-- Left bottom corner -->
          <ellipse cx="180" cy="950" rx="80" ry="140" fill="#7cb342" />
          <ellipse cx="220" cy="980" rx="60" ry="110" fill="#9ccc65" />
          <ellipse cx="140" cy="1000" rx="55" ry="100" fill="#7cb342" />
        </g>

        <g opacity="0.6" filter="url(#plantShadow)">
          <!-- Right bottom corner -->
          <ellipse cx="1800" cy="950" rx="80" ry="140" fill="#7cb342" />
          <ellipse cx="1760" cy="980" rx="60" ry="110" fill="#9ccc65" />
          <ellipse cx="1840" cy="1000" rx="55" ry="100" fill="#7cb342" />
        </g>

        <!-- Decorative frame -->
        <rect x="100" y="80" width="1720" height="1280" fill="none" stroke="rgba(124,179,66,0.3)" stroke-width="4" rx="20" />

        <!-- Title text -->
        <text x="960" y="1320" text-anchor="middle" font-family="Georgia, serif" font-size="72" font-weight="bold" fill="rgb(${primaryColor.r},${primaryColor.g},${primaryColor.b})" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1))">
          ${this.escapeXml(title)}
        </text>
      </svg>
    `;

    try {
      await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);
    } catch (svgError) {
      console.log(`    → SVG rendering failed, using fallback...`);
      await this.createSolidColorImage(outputPath, primaryColor, width, height);
    }
  }

  escapeXml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  async createSolidColorImage(outputPath, color, width, height) {
    const channels = 3;
    const pixelArray = Buffer.alloc(width * height * channels);

    for (let i = 0; i < pixelArray.length; i += channels) {
      pixelArray[i] = color.r;
      pixelArray[i + 1] = color.g;
      pixelArray[i + 2] = color.b;
    }

    await sharp(pixelArray, {
      raw: {
        width: width,
        height: height,
        channels: channels
      }
    })
      .png()
      .toFile(outputPath);
  }

  getCategoryColor(category) {
    const colors = {
      'Botanika': { r: 76, g: 175, b: 80 },
      'Paisaje': { r: 63, g: 81, b: 181 },
      'Cocina': { r: 255, g: 152, b: 0 },
      'Tipografia': { r: 33, g: 33, b: 33 },
      'Animales': { r: 156, g: 39, b: 176 },
      'Niños': { r: 233, g: 30, b: 99 },
      'Mapas': { r: 0, g: 150, b: 136 },
      'Moda': { r: 244, g: 67, b: 54 },
      'Retro': { r: 255, g: 193, b: 7 },
      'Iconico': { r: 103, g: 58, b: 183 },
      'Metalico': { r: 158, g: 158, b: 158 },
      'Espacio': { r: 13, g: 71, b: 161 },
      'Deportes': { r: 229, g: 57, b: 53 },
      'Musica': { r: 255, g: 87, b: 34 },
      'Planificador': { r: 25, g: 118, b: 210 },
      'Verano': { r: 251, g: 188, b: 4 }
    };
    return colors[category] || { r: 100, g: 100, b: 100 };
  }

  getSecondaryColor(category) {
    const colors = {
      'Botanika': { r: 139, g: 195, b: 74 },
      'Paisaje': { r: 100, g: 149, b: 237 },
      'Cocina': { r: 255, g: 193, b: 7 },
      'Tipografia': { r: 97, g: 97, b: 97 },
      'Animales': { r: 186, g: 104, b: 200 },
      'Niños': { r: 244, g: 67, b: 54 },
      'Mapas': { r: 38, g: 198, b: 218 },
      'Moda': { r: 255, g: 112, b: 67 },
      'Retro': { r: 255, g: 235, b: 59 },
      'Iconico': { r: 171, g: 71, b: 188 },
      'Metalico': { r: 189, g: 189, b: 189 },
      'Espacio': { r: 66, g: 165, b: 245 },
      'Deportes': { r: 244, g: 107, b: 100 },
      'Musica': { r: 255, g: 167, b: 38 },
      'Planificador': { r: 100, g: 181, b: 246 },
      'Verano': { r: 255, g: 213, b: 79 }
    };
    return colors[category] || { r: 150, g: 150, b: 150 };
  }

  getAccentColor(category) {
    const colors = {
      'Botanika': { r: 102, g: 187, b: 106 },
      'Paisaje': { r: 144, g: 202, b: 249 },
      'Cocina': { r: 255, g: 204, b: 0 },
      'Tipografia': { r: 117, g: 117, b: 117 },
      'Animales': { r: 206, g: 147, b: 216 },
      'Niños': { r: 255, g: 110, b: 119 },
      'Mapas': { r: 77, g: 182, b: 172 },
      'Moda': { r: 255, g: 171, b: 145 },
      'Retro': { r: 255, g: 241, b: 118 },
      'Iconico': { r: 198, g: 124, b: 210 },
      'Metalico': { r: 212, g: 212, b: 212 },
      'Espacio': { r: 132, g: 250, b: 176 },
      'Deportes': { r: 255, g: 138, b: 128 },
      'Musica': { r: 255, g: 204, b: 188 },
      'Planificador': { r: 179, g: 229, b: 252 },
      'Verano': { r: 255, g: 235, b: 147 }
    };
    return colors[category] || { r: 180, g: 180, b: 180 };
  }
}

module.exports = GeminiImageGenerator;
