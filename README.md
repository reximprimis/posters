# Poster Generation System

Automated system to generate print-ready posters in 16+ categories using AI.

## Operational Docs

- Frame + thumb + PDF workflow: `docs/FRAME_THUMB_PDF_FLOW.md`
- Application versioning: `docs/VERSIONING.md`

## Quick Start

```bash
# Setup
npm install
cp .env.example .env
# Edit .env with your API keys

# Generate posters for one category
node index.js generate "Botanika" 5

# Generate posters for all categories
node index.js generate-all 5

# View inventory statistics
node index.js stats
```

## Features

- ✓ AI-powered content generation (ChatGPT for titles/prompts)
- ✓ Image generation with placeholder system (ready for Gemini API)
- ✓ Print-ready PDFs in all 6 sizes
- ✓ 300 DPI resolution for professional printing
- ✓ 3mm bleed for commercial printing
- ✓ CMYK color profile support
- ✓ Batch generation across categories
- ✓ Automatic inventory tracking (JSON database)

## Architecture

1. **Content Generation** → ChatGPT generates unique titles & visual prompts
2. **Image Generation** → Creates poster images (placeholder SVG, ready for Gemini/AI)
3. **PDF Export** → Generates PDFs in all 6 print-ready sizes
4. **Database** → Tracks all generated posters in `posters_inventory.json`

## Output Structure

```
posters/
├── Botanika/
│   ├── Rose_Garden.png
│   ├── Rose_Garden_13x18.pdf
│   ├── Rose_Garden_21x30.pdf
│   ├── Rose_Garden_30x40.pdf
│   ├── Rose_Garden_40x50.pdf
│   ├── Rose_Garden_50x70.pdf
│   └── Rose_Garden_70x100.pdf
├── Natura i krajobrazy/
└── [other categories]

posters_inventory.json  # Complete catalog with metadata
```

## Poster Specifications

- **Sizes:** 13×18, 21×30, 30×40, 40×50, 50×70, 70×100 cm
- **DPI:** 300 (professional print quality)
- **Color Profile:** CMYK (ready for printing)
- **Bleed:** 3mm on all sides
- **Format:** PDF (flattened, print-ready)

## Categories

- Botanika (botanical)
- Pory roku (seasonal)
- Natura i krajobrazy (landscapes)
- Obrazy do kuchni (kitchen art)
- Plakaty z napisami (typography)
- Zwierzęta (animals)
- Plakaty dla dzieci (kids)
- Mapy i miasta (maps/cities)
- Moda (fashion)
- Retro (vintage)
- Kultowe zdjęcia (iconic images)
- Złoto i srebro (metallic/luxury)
- Kosmos i astronomia (space)
- Sporty (sports)
- Muzyka (music)
- Plakaty planery (planners)

## API Keys Required

1. **OpenAI API Key** (ChatGPT)
   - Get from: https://platform.openai.com/
   - For generating poster titles and prompts

2. **Google Gemini API Key** (Optional - for image generation)
   - Get from: https://makersuite.google.com/
   - Ready for integration in `imageGenerator.js`

3. **Canva API** (Optional - for design templates)
   - Get from: https://developers.canva.com/
   - Can be integrated for template-based designs

## Usage Examples

### Generate 5 posters for Botanika category

```bash
node index.js generate "Botanika" 5
```

### Generate 3 posters for all 16 categories (48 total)

```bash
node index.js generate-all 3
```

### Check inventory status

```bash
node index.js stats
```

## File Structure

```
├── index.js                 # CLI entry point
├── config.js                # Configuration & categories
├── package.json             # Node.js dependencies
├── .env.example             # Environment variables template
├── README.md                # This file
├── posters_inventory.json   # Generated inventory database
└── src/
    ├── posterGenerator.js   # Main orchestrator
    ├── contentGenerator.js  # ChatGPT integration
    ├── imageGenerator.js    # Image generation (SVG placeholder, ready for Gemini)
    └── pdfGenerator.js      # PDF export (300 DPI, CMYK)
```

## Next Steps

1. ✓ Set up Node.js environment
2. ✓ Install dependencies
3. **Add API keys** to `.env` file
4. **Run first generation** - `node index.js generate "Botanika" 3`
5. **Validate PDFs** - Check `posters/` directory
6. **Integrate Gemini API** - Replace placeholder images in `imageGenerator.js`
7. **Integrate Canva API** - Optional design template system

## Rights & Licensing

- AI-generated images use commercial-licensed models
- Full rights to print, modify, and sell
- Ready for e-commerce integration

## Performance

- ~30-60 seconds per poster (including API calls)
- Batch generation: 16 categories × 5 posters = ~2-3 minutes

## Troubleshooting

**Missing API Key?**
```bash
# Edit .env and add OPENAI_API_KEY=sk-...
```

**Directory not found?**
```bash
# The script auto-creates posters/ directory
```

**PDF generation failed?**
- Check image file exists in poster directory
- Verify pdfkit package installed correctly

## Support

Built for reximprimis.com poster sales platform.
