const fs = require('fs');
const path = require('path');
const Replicate = require('replicate');

class ReplicateImageGenerator {
  constructor() {
    this.replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    });
  }

  buildImagePrompt(title, category, style) {
    const categoryDescriptions = {
      'Botanika': 'botanical plants, flora, nature, organic',
      'Paisaje': 'landscape scenery, mountains, nature views',
      'Cocina': 'culinary, food, kitchen, cooking',
      'Tipografia': 'typography, text design, fonts, letters',
      'Animales': 'animals, wildlife, creatures, fauna',
      'Niños': 'children, playful, cute, colorful kids',
      'Mapas': 'maps, geography, cartography, routes',
      'Moda': 'fashion, clothing, style, elegant',
      'Retro': 'retro, vintage, 70s, 80s aesthetic',
      'Iconico': 'iconic, symbolic, emblematic, iconic imagery',
      'Metalico': 'metallic, shiny, chrome, reflective surfaces',
      'Espacio': 'space, cosmos, stars, galaxies, universe',
      'Deportes': 'sports, athletic, action, competition',
      'Musica': 'music, instruments, sound waves, audio',
      'Planificador': 'planning, organization, schedule, productivity',
      'Verano': 'summer, beach, sun, warm, tropical'
    };

    const styleDescriptions = {
      'Moderno': 'modern, contemporary, sleek design',
      'Clasico': 'classic, timeless, elegant design',
      'Vibrante': 'vibrant colors, bold, dynamic',
      'Minimalista': 'minimalist, clean, simple design',
      'Abstracto': 'abstract, artistic, geometric patterns',
      'Realista': 'photorealistic, detailed, professional photography'
    };

    const categoryDesc = categoryDescriptions[category] || category;
    const styleDesc = styleDescriptions[style] || style;

    return `Ultra realistic professional poster design for "${title}". Features ${categoryDesc}. Style: ${styleDesc}. High quality, print-ready, 300 DPI, professional typography, premium composition, vibrant colors, artistic elements, balanced layout, modern aesthetic. Perfect for poster print. Photorealistic quality.`;
  }

  async generateImage(title, category, style, outputPath) {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      console.log(`    → Generating realistic image with Replicate...`);
      const prompt = this.buildImagePrompt(title, category, style);
      console.log(`    → Prompt: ${prompt}`);

      // Call Replicate's SDXL model
      const output = await this.replicate.run(
        'stability-ai/sdxl:8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f',
        {
          input: {
            prompt: prompt,
            negative_prompt: 'blurry, low quality, distorted, ugly, bad quality',
            num_outputs: 1,
            scheduler: 'K_EULER',
            num_inference_steps: 50,
            guidance_scale: 7.5,
            width: 1920,
            height: 1440,
          },
        }
      );

      if (!output || output.length === 0) {
        throw new Error('No image generated from Replicate');
      }

      // Download the image from the URL
      const https = require('https');
      const imageUrl = output[0].url ? output[0].url() : output[0];

      return new Promise((resolve, reject) => {
        https.get(imageUrl, (response) => {
          const fileStream = fs.createWriteStream(outputPath);
          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close();
            console.log(`    ✓ Image generated`);
            resolve(outputPath);
          });

          fileStream.on('error', (err) => {
            fs.unlink(outputPath, () => {}); // Delete the file
            reject(err);
          });
        }).on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ReplicateImageGenerator;
