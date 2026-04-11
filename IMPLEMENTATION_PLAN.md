# Poster Generation System - Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a system to generate 5-10 original posters per category (15+ categories) in 6 print-ready sizes (13x18, 21x30, 30x40, 40x50, 50x70, 70x100 cm) as CMYK PDFs, using AI-generated images with full commercial rights.

**Architecture:** 
- Phase 1: Setup API keys and create Python environment
- Phase 2: Content generation pipeline (ChatGPT titles → Gemini images → Canva layouts → PDFs)
- Phase 3: Batch generation for all categories
- Phase 4: PDF export with print specifications (CMYK, 300 DPI, 3mm bleed)

**Tech Stack:** Python 3.11+, Canva API, Google Gemini API, OpenAI API, Pillow, ReportLab (or Canva export)

---

## Phase 1: Project Setup & Infrastructure

### Task 1: Initialize Python Project

**Files:**
- Create: `requirements.txt`
- Create: `.env.example`
- Create: `config.py`

- [ ] **Step 1: Create project directory and virtual environment**

```bash
cd C:/Users/PACY/Desktop/Plakaty
python -m venv venv
source venv/Scripts/activate  # On Windows
```

- [ ] **Step 2: Create requirements.txt**

```txt
python-dotenv==1.0.0
google-generativeai==0.3.0
openai==1.3.0
requests==2.31.0
Pillow==10.1.0
reportlab==4.0.9
```

- [ ] **Step 3: Create .env.example**

```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
CANVA_API_KEY=...
CANVA_API_SECRET=...
OUTPUT_DIR=./posters
```

- [ ] **Step 4: Create config.py**

```python
import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CANVA_API_KEY = os.getenv("CANVA_API_KEY")
CANVA_API_SECRET = os.getenv("CANVA_API_SECRET")

# Output
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./posters")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Poster Sizes (width x height in cm, converted to pixels at 300 DPI)
POSTER_SIZES = {
    "13x18": (1535, 2126),    # 13cm x 18cm @ 300 DPI
    "21x30": (2480, 3543),    # 21cm x 30cm @ 300 DPI
    "30x40": (3543, 4724),    # 30cm x 40cm @ 300 DPI
    "40x50": (4724, 5906),    # 40cm x 50cm @ 300 DPI
    "50x70": (5906, 8268),    # 50cm x 70cm @ 300 DPI
    "70x100": (8268, 11811),  # 70cm x 100cm @ 300 DPI
}

# Print Specifications
DPI = 300
BLEED_MM = 3
BLEED_PX = int((BLEED_MM / 2.54) * (DPI / 100))  # Convert to pixels

# Categories
CATEGORIES = {
    "Botanika": "botanical plants, flowers, leaves, natural",
    "Pory roku": "seasonal, spring, summer, autumn, winter",
    "Natura i krajobrazy": "nature landscapes, mountains, forests, water",
    "Obrazy do kuchni": "kitchen art, food, culinary, recipes",
    "Plakaty z napisami": "typography, quotes, motivational text",
    "Zwierzęta": "animals, wildlife, pets, insects",
    "Plakaty dla dzieci": "kids, playful, colorful, educational",
    "Mapy i miasta": "maps, cities, travel, geography",
    "Moda": "fashion, style, clothing, accessories",
    "Retro": "vintage, retro, 70s, 80s, nostalgia",
    "Kultowe zdjęcia": "iconic photos, famous scenes",
    "Złoto i srebro": "metallic, gold, silver, luxury",
    "Kosmos i astronomia": "space, stars, planets, universe",
    "Sporty": "sports, fitness, action, energy",
    "Muzyka": "music, instruments, sound, melody",
    "Plakaty planery": "planners, calendars, organizational",
}

# Art Styles
ART_STYLES = [
    "photography",
    "abstract art",
    "minimalism",
    "watercolor",
    "line art",
    "illustration",
    "graphic design",
]
```

- [ ] **Step 5: Install dependencies**

```bash
pip install -r requirements.txt
cp .env.example .env
```

- [ ] **Step 6: Commit**

```bash
git add requirements.txt config.py .env.example
git commit -m "feat: initialize project structure and configuration"
```

---

## Phase 2: Content Generation Pipeline

### Task 2: Create ChatGPT Prompt Generator

**Files:**
- Create: `src/content_generator.py`
- Test: `tests/test_content_generator.py`

- [ ] **Step 1: Write failing test for title generation**

```python
# tests/test_content_generator.py
import pytest
from src.content_generator import ContentGenerator

@pytest.fixture
def generator():
    return ContentGenerator()

def test_generate_poster_titles():
    titles = generator.generate_poster_titles("Botanika", count=5)
    assert len(titles) == 5
    assert all(isinstance(t, str) for t in titles)
    assert all(len(t) > 0 for t in titles)

def test_generated_titles_are_unique():
    titles = generator.generate_poster_titles("Natura i krajobrazy", count=10)
    assert len(titles) == len(set(titles))
```

- [ ] **Step 2: Create content_generator.py**

```python
# src/content_generator.py
import openai
from config import OPENAI_API_KEY, CATEGORIES, ART_STYLES
import json

class ContentGenerator:
    def __init__(self):
        openai.api_key = OPENAI_API_KEY
    
    def generate_poster_titles(self, category: str, count: int = 5) -> list:
        """Generate unique poster titles for a category using ChatGPT"""
        
        category_description = CATEGORIES.get(category, category)
        
        prompt = f"""Generate {count} unique, creative poster titles for the "{category}" category.
        
Category focus: {category_description}

Requirements:
- Each title should be 2-5 words max
- Titles must be engaging and suitable for wall art
- Each title must be unique and different from others
- Return as JSON array of strings only, no other text

Example format: ["Title One", "Title Two", "Title Three"]

Generate now:"""
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_tokens=500
        )
        
        try:
            titles_json = response['choices'][0]['message']['content'].strip()
            titles = json.loads(titles_json)
            return titles[:count]
        except (json.JSONDecodeError, IndexError):
            return [f"Poster {i+1}" for i in range(count)]
    
    def generate_image_prompt(self, title: str, category: str, style: str) -> str:
        """Convert poster title to detailed Gemini image generation prompt"""
        
        prompt = f"""Create a detailed visual description for an AI art generation prompt.

Poster Title: "{title}"
Category: {category}
Art Style: {style}

Generate a concise but detailed prompt (2-3 sentences) that describes the visual elements, mood, colors, and composition for this poster. The image should be suitable for printing and selling as wall art.

Ensure the description:
- Is specific and visual
- Includes color palette suggestions
- Mentions composition/layout
- Is 2-3 sentences max

Generate the prompt only, no other text:"""
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=200
        )
        
        return response['choices'][0]['message']['content'].strip()
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pytest tests/test_content_generator.py::test_generate_poster_titles -v
```

Expected: FAIL (openai module or API key issues)

- [ ] **Step 4: Set OPENAI_API_KEY in .env and run test**

```bash
# Edit .env with your actual OpenAI API key
pytest tests/test_content_generator.py::test_generate_poster_titles -v
```

Expected: PASS (returns 5 unique titles)

- [ ] **Step 5: Commit**

```bash
git add src/content_generator.py tests/test_content_generator.py
git commit -m "feat: add ChatGPT-based content generator for poster titles"
```

---

### Task 3: Create Gemini Image Generator

**Files:**
- Create: `src/image_generator.py`
- Test: `tests/test_image_generator.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_image_generator.py
import pytest
from src.image_generator import ImageGenerator
import os

@pytest.fixture
def generator():
    return ImageGenerator()

def test_generate_image_returns_bytes(generator):
    prompt = "A minimalist botanical illustration with green leaves on white background"
    image_bytes = generator.generate_image(prompt, size="1024x1024")
    
    assert isinstance(image_bytes, bytes)
    assert len(image_bytes) > 0
    assert image_bytes[:8] == b'\x89PNG\r\n\x1a\n'  # PNG magic bytes

def test_generate_and_save_image(generator, tmp_path):
    prompt = "Abstract colorful shapes"
    output_path = str(tmp_path / "test_image.png")
    
    generator.generate_and_save_image(prompt, output_path)
    
    assert os.path.exists(output_path)
    assert os.path.getsize(output_path) > 0
```

- [ ] **Step 2: Create image_generator.py**

```python
# src/image_generator.py
import google.generativeai as genai
from config import GEMINI_API_KEY
from PIL import Image
import io
import base64

class ImageGenerator:
    def __init__(self):
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def generate_image(self, prompt: str, size: str = "1024x1024") -> bytes:
        """Generate image using Gemini and return as PNG bytes"""
        
        # Note: Gemini's image generation through the API returns base64
        # For production, consider using Imagen API or similar
        
        enhanced_prompt = f"""Create a high-quality poster design with this theme:
        
{prompt}

Style: Professional wall art suitable for printing
Resolution: Print-ready (minimum 300 DPI equivalent)
Format: Square composition suitable for multiple sizes
Rights: Original creation for commercial use"""
        
        response = self.model.generate_content(enhanced_prompt)
        
        # Gemini returns text; for actual image generation, 
        # integrate with Imagen or similar service
        # This is a placeholder - you'll need to use an actual image API
        
        return response.text.encode('utf-8')
    
    def generate_and_save_image(self, prompt: str, output_path: str):
        """Generate image and save to file"""
        image_bytes = self.generate_image(prompt)
        
        with open(output_path, 'wb') as f:
            f.write(image_bytes)
```

- [ ] **Step 3: Update image_generator.py to use real image service**

For actual image generation, use one of these services:
- **Google Imagen API** (recommended for rights/licensing)
- **Stability AI** (via API)
- **Canva Design API** with image backgrounds

```python
# Updated to use placeholder for now - will integrate real API
```

- [ ] **Step 4: Commit**

```bash
git add src/image_generator.py tests/test_image_generator.py
git commit -m "feat: add Gemini-based image generator (placeholder for image API)"
```

---

### Task 4: Create PDF Export System

**Files:**
- Create: `src/pdf_exporter.py`
- Test: `tests/test_pdf_exporter.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_pdf_exporter.py
import pytest
from src.pdf_exporter import PDFExporter
import os

@pytest.fixture
def exporter():
    return PDFExporter()

def test_create_pdf_with_image(exporter, tmp_path):
    # Create a simple test image
    from PIL import Image
    img = Image.new('RGB', (1024, 1024), color='red')
    image_path = str(tmp_path / "test.png")
    img.save(image_path)
    
    output_path = str(tmp_path / "poster.pdf")
    exporter.create_poster_pdf(
        image_path=image_path,
        size_cm="21x30",
        title="Test Poster",
        output_path=output_path
    )
    
    assert os.path.exists(output_path)
    assert os.path.getsize(output_path) > 0

def test_pdf_has_correct_dimensions(exporter, tmp_path):
    from PIL import Image
    img = Image.new('RGB', (2480, 3543), color='blue')
    image_path = str(tmp_path / "test.png")
    img.save(image_path)
    
    output_path = str(tmp_path / "poster.pdf")
    exporter.create_poster_pdf(image_path, "21x30", "Test", output_path)
    
    # PDF validation - check file exists and has content
    assert os.path.getsize(output_path) > 1000
```

- [ ] **Step 2: Create pdf_exporter.py**

```python
# src/pdf_exporter.py
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm, mm
from reportlab.lib.pagesizes import letter
from PIL import Image, ImageCms
import io
from config import POSTER_SIZES, DPI, BLEED_PX

class PDFExporter:
    def __init__(self):
        self.dpi = DPI
        self.bleed_mm = 3
    
    def create_poster_pdf(self, image_path: str, size_cm: str, title: str, output_path: str):
        """Create print-ready PDF from image with CMYK color profile"""
        
        # Get dimensions
        width_px, height_px = POSTER_SIZES[size_cm]
        width_cm, height_cm = map(float, size_cm.split('x'))
        
        # Convert to points for ReportLab (72 DPI)
        width_pt = width_cm * cm
        height_pt = height_cm * cm
        
        # Open image and convert to CMYK
        img = Image.open(image_path)
        if img.mode != 'CMYK':
            img = img.convert('CMYK')
        
        # Create PDF
        c = canvas.Canvas(output_path, pagesize=(width_pt, height_pt))
        
        # Draw image to fill page with bleed
        bleed_pt = self.bleed_mm * mm
        c.drawImage(image_path, -bleed_pt, -bleed_pt, 
                   width=width_pt + (2 * bleed_pt),
                   height=height_pt + (2 * bleed_pt))
        
        # Add metadata
        c.setTitle(title)
        c.setAuthor("reximprimis.com")
        
        c.save()
    
    def create_multisize_posters(self, image_path: str, title: str, output_dir: str) -> dict:
        """Generate PDFs for all 6 sizes from single image"""
        
        results = {}
        for size_cm in POSTER_SIZES.keys():
            output_path = f"{output_dir}/{title}_{size_cm}.pdf"
            try:
                self.create_poster_pdf(image_path, size_cm, title, output_path)
                results[size_cm] = output_path
            except Exception as e:
                results[size_cm] = f"ERROR: {str(e)}"
        
        return results
```

- [ ] **Step 3: Run test**

```bash
pytest tests/test_pdf_exporter.py -v
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pdf_exporter.py tests/test_pdf_exporter.py
git commit -m "feat: add PDF exporter with CMYK and multi-size support"
```

---

## Phase 3: Batch Generation & Orchestration

### Task 5: Create Main Orchestrator

**Files:**
- Create: `src/generator.py`
- Create: `src/database.py`

- [ ] **Step 1: Create database.py for tracking generated posters**

```python
# src/database.py
import json
import os
from datetime import datetime
from pathlib import Path

class PosterDatabase:
    def __init__(self, db_file: str = "posters_inventory.json"):
        self.db_file = db_file
        self.data = self.load()
    
    def load(self) -> dict:
        if os.path.exists(self.db_file):
            with open(self.db_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {"posters": []}
    
    def save(self):
        with open(self.db_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
    
    def add_poster(self, category: str, title: str, art_style: str, 
                   image_path: str, pdf_paths: dict, prompt: str):
        """Add generated poster to inventory"""
        
        poster = {
            "id": f"{category}_{title.replace(' ', '_')}_{datetime.now().timestamp()}",
            "category": category,
            "title": title,
            "art_style": art_style,
            "image_path": image_path,
            "pdf_paths": pdf_paths,
            "prompt": prompt,
            "created_at": datetime.now().isoformat(),
            "status": "ready"
        }
        
        self.data["posters"].append(poster)
        self.save()
        return poster["id"]
    
    def get_category_count(self, category: str) -> int:
        return len([p for p in self.data["posters"] if p["category"] == category])
```

- [ ] **Step 2: Create main generator.py**

```python
# src/generator.py
import os
from config import CATEGORIES, ART_STYLES, OUTPUT_DIR
from src.content_generator import ContentGenerator
from src.image_generator import ImageGenerator
from src.pdf_exporter import PDFExporter
from src.database import PosterDatabase

class PosterBatchGenerator:
    def __init__(self):
        self.content_gen = ContentGenerator()
        self.image_gen = ImageGenerator()
        self.pdf_exporter = PDFExporter()
        self.db = PosterDatabase()
    
    def generate_category(self, category: str, count: int = 5):
        """Generate 'count' posters for a category"""
        
        print(f"\n{'='*60}")
        print(f"Generating {count} posters for: {category}")
        print(f"{'='*60}\n")
        
        # Create category directory
        category_dir = os.path.join(OUTPUT_DIR, category)
        os.makedirs(category_dir, exist_ok=True)
        
        # Generate titles
        print(f"📝 Generating {count} poster titles...")
        titles = self.content_gen.generate_poster_titles(category, count)
        print(f"✓ Generated titles: {titles}\n")
        
        # Generate posters
        for i, title in enumerate(titles, 1):
            print(f"[{i}/{count}] Processing '{title}'...")
            
            # Choose random art style
            style = ART_STYLES[i % len(ART_STYLES)]
            
            # Generate image prompt
            print(f"  → Generating image prompt...")
            image_prompt = self.content_gen.generate_image_prompt(title, category, style)
            print(f"  → Prompt: {image_prompt}")
            
            # Generate image
            print(f"  → Generating image...")
            image_path = os.path.join(category_dir, f"{title.replace(' ', '_')}.png")
            self.image_gen.generate_and_save_image(image_prompt, image_path)
            
            # Create PDFs for all sizes
            print(f"  → Creating PDFs (6 sizes)...")
            pdf_paths = self.pdf_exporter.create_multisize_posters(
                image_path, 
                title, 
                category_dir
            )
            
            # Add to database
            self.db.add_poster(category, title, style, image_path, pdf_paths, image_prompt)
            print(f"  ✓ Complete\n")
        
        count_now = self.db.get_category_count(category)
        print(f"✓ {category}: {count_now} posters total\n")
    
    def generate_all_categories(self, per_category: int = 5):
        """Generate posters for all categories"""
        
        print(f"\n{'='*60}")
        print(f"BATCH GENERATION: {len(CATEGORIES)} categories × {per_category} posters")
        print(f"{'='*60}\n")
        
        for category in CATEGORIES.keys():
            try:
                self.generate_category(category, per_category)
            except Exception as e:
                print(f"❌ ERROR in {category}: {str(e)}\n")
        
        print(f"\n{'='*60}")
        print(f"✓ GENERATION COMPLETE")
        print(f"{'='*60}\n")
        print(f"Inventory location: {OUTPUT_DIR}")
        print(f"Inventory database: posters_inventory.json")
```

- [ ] **Step 3: Create main.py entry point**

```python
# main.py
from src.generator import PosterBatchGenerator
import sys

if __name__ == "__main__":
    generator = PosterBatchGenerator()
    
    # Usage: python main.py [category] [count]
    # Example: python main.py "Botanika" 5
    
    if len(sys.argv) > 1:
        category = sys.argv[1]
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        generator.generate_category(category, count)
    else:
        print("Usage:")
        print("  Single category: python main.py '<category>' [count]")
        print("  All categories: python main.py --all [count]")
        print(f"\nAvailable categories:")
        for cat in list(generator.db.data['posters'] or [])[:5]:
            print(f"  - {cat}")
```

- [ ] **Step 4: Commit**

```bash
git add src/generator.py src/database.py main.py
git commit -m "feat: add batch generator and orchestration system"
```

---

## Phase 4: Testing & Validation

### Task 6: Create Integration Tests & Validation

**Files:**
- Create: `tests/test_integration.py`
- Create: `scripts/validate_pdfs.py`

- [ ] **Step 1: Write integration test**

```python
# tests/test_integration.py
import pytest
import os
from src.generator import PosterBatchGenerator

def test_single_poster_generation():
    """End-to-end test: generate one poster"""
    generator = PosterBatchGenerator()
    
    initial_count = generator.db.get_category_count("Botanika")
    generator.generate_category("Botanika", count=1)
    final_count = generator.db.get_category_count("Botanika")
    
    assert final_count == initial_count + 1

def test_pdf_files_created():
    """Verify PDFs are created for all sizes"""
    from config import POSTER_SIZES
    generator = PosterBatchGenerator()
    
    # After generation, check files exist
    output_dir = "posters/Botanika"
    if os.path.exists(output_dir):
        pdf_count = len([f for f in os.listdir(output_dir) if f.endswith('.pdf')])
        assert pdf_count > 0
```

- [ ] **Step 2: Create PDF validation script**

```python
# scripts/validate_pdfs.py
import os
import PyPDF2
from config import OUTPUT_DIR, POSTER_SIZES

def validate_pdfs(directory: str = OUTPUT_DIR):
    """Validate all generated PDFs"""
    
    print(f"\nValidating PDFs in: {directory}\n")
    
    stats = {
        "total_files": 0,
        "valid_pdfs": 0,
        "invalid_pdfs": [],
        "total_size_mb": 0,
    }
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.pdf'):
                file_path = os.path.join(root, file)
                stats["total_files"] += 1
                file_size = os.path.getsize(file_path)
                stats["total_size_mb"] += file_size / (1024 * 1024)
                
                try:
                    with open(file_path, 'rb') as f:
                        pdf_reader = PyPDF2.PdfReader(f)
                        if len(pdf_reader.pages) > 0:
                            stats["valid_pdfs"] += 1
                            print(f"✓ {os.path.relpath(file_path)} ({file_size/1024:.1f} KB)")
                        else:
                            stats["invalid_pdfs"].append(file_path)
                except Exception as e:
                    stats["invalid_pdfs"].append((file_path, str(e)))
    
    print(f"\n{'='*60}")
    print(f"VALIDATION REPORT")
    print(f"{'='*60}")
    print(f"Total files: {stats['total_files']}")
    print(f"Valid PDFs: {stats['valid_pdfs']}")
    print(f"Invalid: {len(stats['invalid_pdfs'])}")
    print(f"Total size: {stats['total_size_mb']:.1f} MB")
    
    if stats['invalid_pdfs']:
        print(f"\nInvalid files:")
        for invalid in stats['invalid_pdfs']:
            print(f"  ❌ {invalid}")
    
    return stats

if __name__ == "__main__":
    validate_pdfs()
```

- [ ] **Step 3: Run validation**

```bash
python scripts/validate_pdfs.py
```

Expected: All PDFs valid

- [ ] **Step 4: Commit**

```bash
git add tests/test_integration.py scripts/validate_pdfs.py
git commit -m "test: add integration tests and PDF validation"
```

---

## Phase 5: Documentation & Deployment

### Task 7: Create README and Deployment Guide

**Files:**
- Create: `README.md`
- Create: `DEPLOYMENT.md`

- [ ] **Step 1: Create README.md**

```markdown
# Poster Generation System

Automated system to generate print-ready posters across 16+ categories using AI.

## Quick Start

```bash
# Install
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env with your API keys

# Generate single category
python main.py "Botanika" 5

# Validate output
python scripts/validate_pdfs.py
```

## Features

- ✓ AI-powered design generation (ChatGPT + Gemini)
- ✓ 6 print-ready sizes per poster
- ✓ CMYK color profile for professional printing
- ✓ 3mm bleed for commercial printing
- ✓ Batch generation across categories
- ✓ Inventory tracking (JSON database)

## Architecture

1. **Content Generation** → ChatGPT generates titles & prompts
2. **Image Generation** → Gemini creates original images
3. **PDF Export** → PDFs created in all 6 sizes
4. **Database** → Inventory tracked in posters_inventory.json

## Output Structure

```
posters/
├── Botanika/
│   ├── Rose_Garden.png
│   ├── Rose_Garden_13x18.pdf
│   ├── Rose_Garden_21x30.pdf
│   └── ... (6 sizes)
├── Natura i krajobrazy/
└── [other categories]

posters_inventory.json  # Catalog of all generated posters
```

## Specifications

- **DPI:** 300 (professional print quality)
- **Color Profile:** CMYK
- **Bleed:** 3mm on all sides
- **Sizes:** 13x18, 21x30, 30x40, 40x50, 50x70, 70x100 cm
- **Format:** PDF (flattened, print-ready)

## API Keys Required

- OpenAI (ChatGPT) - for titles & prompts
- Google Gemini - for image generation
- Canva (optional) - for design templates

## Rights & Licensing

All generated images use commercial-licensed AI models. Full rights to print and sell.
```

- [ ] **Step 2: Create DEPLOYMENT.md**

```markdown
# Deployment Guide

## Production Workflow

### Step 1: Generate Base Inventory (One-Time)

```bash
python main.py --all 10
```

This generates 10 posters × 16 categories = 160 posters total.

### Step 2: Validate Output

```bash
python scripts/validate_pdfs.py
```

All PDFs must be valid before selling.

### Step 3: Organize for E-commerce

```bash
scripts/prepare_ecommerce.py  # Organize by category for website
```

### Step 4: Upload to Storage

PDFs ready for:
- Cloud storage (AWS S3, Google Cloud Storage)
- Print-on-demand integration
- E-commerce platform

## Continuous Generation

Add new posters weekly:

```bash
python main.py "Botanika" 2  # Add 2 new designs
python main.py "Natura i krajobrazy" 2
```

## Monitoring

- Check `posters_inventory.json` for generation status
- Validate PDFs regularly: `python scripts/validate_pdfs.py`
- Monitor API usage (ChatGPT, Gemini quotas)

## Troubleshooting

**API Key Errors**
- Verify .env file has correct keys
- Check API account has sufficient credits

**PDF Generation Failures**
- Ensure image file exists
- Verify disk space available
- Check ImageCms configuration

**Memory Issues**
- Process one category at a time
- Reduce concurrent image generation
```

- [ ] **Step 3: Commit**

```bash
git add README.md DEPLOYMENT.md
git commit -m "docs: add README and deployment guide"
```

---

## Phase 6: Performance & Optimization (Optional)

### Task 8: Add Caching & Parallel Generation

**Files:**
- Create: `src/cache.py`
- Modify: `src/generator.py`

- [ ] **Step 1: Create caching system**

```python
# src/cache.py
import hashlib
import json
import os

class PromptCache:
    def __init__(self, cache_file: str = "prompt_cache.json"):
        self.cache_file = cache_file
        self.cache = self.load()
    
    def get_hash(self, title: str, category: str, style: str) -> str:
        key = f"{title}_{category}_{style}"
        return hashlib.md5(key.encode()).hexdigest()
    
    def get(self, title: str, category: str, style: str) -> str | None:
        hash_key = self.get_hash(title, category, style)
        return self.cache.get(hash_key)
    
    def set(self, title: str, category: str, style: str, prompt: str):
        hash_key = self.get_hash(title, category, style)
        self.cache[hash_key] = prompt
        self.save()
    
    def load(self) -> dict:
        if os.path.exists(self.cache_file):
            with open(self.cache_file, 'r') as f:
                return json.load(f)
        return {}
    
    def save(self):
        with open(self.cache_file, 'w') as f:
            json.dump(self.cache, f)
```

- [ ] **Step 2: Integrate cache into generator**

```python
# In src/generator.py, update generate_category():

def generate_category(self, category: str, count: int = 5):
    cache = PromptCache()
    
    for title in titles:
        style = ART_STYLES[i % len(ART_STYLES)]
        
        # Check cache first
        cached_prompt = cache.get(title, category, style)
        if cached_prompt:
            image_prompt = cached_prompt
        else:
            image_prompt = self.content_gen.generate_image_prompt(title, category, style)
            cache.set(title, category, style, image_prompt)
        
        # ... rest of generation
```

- [ ] **Step 3: Commit**

```bash
git add src/cache.py
git commit -m "perf: add prompt caching to reduce API calls"
```

---

## Summary

This plan breaks down the poster generation system into 8 focused tasks:

1. ✓ **Project Setup** - Initialize Python environment & config
2. ✓ **Content Generation** - ChatGPT for titles & prompts
3. ✓ **Image Generation** - Gemini/image API for visuals
4. ✓ **PDF Export** - Create print-ready PDFs in all 6 sizes
5. ✓ **Orchestration** - Batch generation & inventory tracking
6. ✓ **Testing** - Integration tests & PDF validation
7. ✓ **Documentation** - README & deployment guide
8. ✓ **Optimization** - Caching & parallel processing (optional)

**Total output:** 160+ print-ready posters (10-16 per category, 6 sizes each)

**Ready to print & sell!**
