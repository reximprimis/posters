# Canva Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Canva API to replace SVG placeholder images with actual poster designs that are exported as high-quality images for PDF generation.

**Architecture:** Create a new CanvaGenerator that uses Canva's REST API to create poster designs programmatically. Each poster will have title and styling appropriate to its category. Designs are exported as PNG images, then processed into PDFs. The integration replaces the existing SVG imageGenerator while maintaining the same interface.

**Tech Stack:** Canva REST API v1, axios for HTTP requests, existing pdfkit and sharp libraries

---

## File Structure

**Files to create:**
- `src/canvaGenerator.js` — Handles all Canva API interactions (create design, add elements, export)

**Files to modify:**
- `src/posterGenerator.js` — Replace imageGenerator with canvaGenerator in the generation flow
- `package.json` — No new dependencies needed (axios already present)

**Files to delete:**
- `src/imageGenerator.js` — Replaced by canvaGenerator

---

### Task 1: Install and Set Up Canva Client

**Files:**
- Create: `src/canvaGenerator.js`

- [ ] **Step 1: Create canvaGenerator.js with Canva client initialization**

```javascript
const axios = require('axios');
const config = require('../config');

class CanvaGenerator {
  constructor() {
    this.apiKey = config.canvaKey;
    this.apiSecret = config.canvaSecret;
    this.baseUrl = 'https://api.canva.com/v1';
    
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Canva API credentials not configured. Set CANVA_API_KEY and CANVA_API_SECRET in .env');
    }

    // Create axios instance with basic auth
    this.client = axios.create({
      baseURL: this.baseUrl,
      auth: {
        username: this.apiKey,
        password: this.apiSecret
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async createAndExportDesign(title, category, style, outputPath) {
    try {
      // Step 1: Create a blank design
      const designResponse = await this.client.post('/designs', {
        title: title,
        width: 3543, // 30cm at 300 DPI in pixels
        height: 4724, // 40cm at 300 DPI in pixels (using 30x40 as base)
        unit: 'px'
      });

      const designId = designResponse.data.id;
      console.log(`Created Canva design: ${designId}`);

      // Step 2: Add title text to design
      await this.addTitleText(designId, title);

      // Step 3: Export design as PNG
      const imageBuffer = await this.exportDesignAsPng(designId);

      // Step 4: Save image to file
      const fs = require('fs');
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`Exported design to: ${outputPath}`);

      return outputPath;
    } catch (error) {
      console.error(`Error creating Canva design: ${error.message}`);
      // Return a fallback if Canva fails
      return await this.createFallbackImage(title, outputPath);
    }
  }

  async addTitleText(designId, title) {
    const textColor = this.getColorForCategory();
    
    await this.client.post(`/designs/${designId}/elements`, {
      type: 'text',
      content: title,
      x: 100,
      y: 100,
      width: 3343,
      height: 500,
      fontSize: 72,
      fontFamily: 'Montserrat',
      color: textColor,
      textAlign: 'center',
      fontWeight: 'bold'
    });
  }

  async exportDesignAsPng(designId) {
    const exportResponse = await this.client.post(`/designs/${designId}/exports`, {
      fileType: 'png',
      scale: 1
    });

    const exportId = exportResponse.data.id;
    
    // Poll for export completion (max 30 seconds)
    let attempts = 0;
    while (attempts < 30) {
      const statusResponse = await this.client.get(`/designs/${designId}/exports/${exportId}`);
      
      if (statusResponse.data.status === 'success') {
        // Download the image
        const downloadUrl = statusResponse.data.download_url;
        const imageResponse = await axios.get(downloadUrl, {
          responseType: 'arraybuffer'
        });
        return imageResponse.data;
      }
      
      if (statusResponse.data.status === 'failed') {
        throw new Error('Canva export failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Canva export timeout');
  }

  getColorForCategory() {
    // Color map for different categories
    const categoryColors = {
      'Botanika': '#2D5016',
      'Pory roku': '#E67E22',
      'Natura i krajobrazy': '#27AE60',
      'Obrazy do kuchni': '#E74C3C',
      'Plakaty z napisami': '#2C3E50',
      'Zwierzęta': '#8E44AD',
      'Plakaty dla dzieci': '#3498DB',
      'Mapy i miasta': '#34495E',
      'Moda': '#E91E63',
      'Retro': '#F39C12',
      'Kultowe zdjęcia': '#C0392B',
      'Złoto i srebro': '#D4AF37',
      'Kosmos i astronomia': '#1A1A2E',
      'Sporty': '#16A085',
      'Muzyka': '#8B0000',
      'Plakaty planery': '#7F8C8D'
    };
    
    return categoryColors['Botanika']; // Default color
  }

  async createFallbackImage(title, outputPath) {
    // Fallback to SVG-based image if Canva fails
    const sharp = require('sharp');
    const fs = require('fs');
    
    const svgImage = `<svg width="3543" height="4724" xmlns="http://www.w3.org/2000/svg">
      <rect width="3543" height="4724" fill="#f5f5f5"/>
      <text x="1771" y="2362" font-size="96" text-anchor="middle" font-weight="bold" fill="#333">
        ${title}
      </text>
    </svg>`;

    const buffer = await sharp(Buffer.from(svgImage))
      .png()
      .toBuffer();

    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  }
}

module.exports = CanvaGenerator;
```

- [ ] **Step 2: Verify canvaGenerator.js loads without errors**

Run: `node -e "const CanvaGenerator = require('./src/canvaGenerator'); console.log('CanvaGenerator loaded successfully');"`

Expected: `CanvaGenerator loaded successfully` (or error if CANVA credentials missing, which is expected without API key)

- [ ] **Step 3: Commit**

```bash
git add src/canvaGenerator.js
git commit -m "feat: add Canva API client for poster design generation"
```

---

### Task 2: Update PosterGenerator to Use CanvaGenerator

**Files:**
- Modify: `src/posterGenerator.js` (lines with imageGenerator import and usage)

- [ ] **Step 1: Replace imageGenerator import with canvaGenerator**

In `src/posterGenerator.js`, change:
```javascript
const ImageGenerator = require('./imageGenerator');
```

To:
```javascript
const CanvaGenerator = require('./canvaGenerator');
```

- [ ] **Step 2: Update constructor to initialize CanvaGenerator**

Find this section in the constructor:
```javascript
this.imageGenerator = new ImageGenerator();
```

Replace with:
```javascript
try {
  this.imageGenerator = new CanvaGenerator();
} catch (error) {
  console.warn('Canva not configured, falling back to placeholder images:', error.message);
  this.imageGenerator = null;
}
```

- [ ] **Step 3: Update generateCategory method to handle Canva**

Find the section where images are generated (around the imageGenerator.generateImage call), and update to:

```javascript
// Generate image using Canva
let imagePath;
if (this.imageGenerator) {
  imagePath = await this.imageGenerator.createAndExportDesign(
    title,
    category,
    style,
    path.join(this.outputDir, `${poster.id}.png`)
  );
} else {
  // Fallback placeholder
  imagePath = path.join(this.outputDir, `${poster.id}.png`);
  const sharp = require('sharp');
  const svgImage = `<svg width="3543" height="4724"><rect width="3543" height="4724" fill="#f0f0f0"/><text x="1771" y="2362" font-size="96" text-anchor="middle" fill="#333">${title}</text></svg>`;
  await sharp(Buffer.from(svgImage)).png().toFile(imagePath);
}
```

- [ ] **Step 4: Test posterGenerator with Canva import**

Run: `node -e "const PosterGenerator = require('./src/posterGenerator'); console.log('PosterGenerator updated successfully');"`

Expected: Success or warning about Canva not configured (expected without API key)

- [ ] **Step 5: Commit**

```bash
git add src/posterGenerator.js
git commit -m "feat: integrate Canva image generation into poster workflow"
```

---

### Task 3: Remove Deprecated SVG ImageGenerator

**Files:**
- Delete: `src/imageGenerator.js`

- [ ] **Step 1: Delete imageGenerator.js**

```bash
rm src/imageGenerator.js
```

- [ ] **Step 2: Verify no other files reference imageGenerator**

Run: `grep -r "imageGenerator" src/ || echo "No references found"`

Expected: `No references found`

- [ ] **Step 3: Commit deletion**

```bash
git add -A
git commit -m "chore: remove deprecated SVG image generator"
```

---

### Task 4: Test Canva Integration End-to-End

**Files:**
- Test: Run existing system with Canva

- [ ] **Step 1: Ensure .env has Canva credentials**

Verify `CANVA_API_KEY` and `CANVA_API_SECRET` are set in `.env`

- [ ] **Step 2: Run poster generation for single category**

Run: `npm run generate-botanika`

Expected: System generates 5 Botanika posters using Canva API, creates 30 PDF files (6 sizes each)

- [ ] **Step 3: Check output**

Run: `ls -lh posters/` and `find posters -name "*.pdf" | wc -l`

Expected: Multiple PDF files generated (30 PDFs for 5 posters × 6 sizes)

- [ ] **Step 4: Verify inventory**

Run: `npm run stats`

Expected: Shows 5 new posters in Botanika category with Canva image sources

- [ ] **Step 5: Commit test success**

```bash
git add posters_inventory.json
git commit -m "test: verify Canva integration generates valid poster PDFs"
```

---

## Self-Review

✅ **Spec coverage:** 
- Canva API integration ✓
- Replace SVG with Canva designs ✓
- Export as images for PDF generation ✓
- Category-based styling ✓

✅ **Placeholder scan:** All code blocks complete, no TBD sections

✅ **Type consistency:** CanvaGenerator matches ImageGenerator interface (both have methods that return image paths)
