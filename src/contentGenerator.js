const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');
const { resolveDesignMdUrl, fetchDesignMdBody } = require('./designMd');

class ContentGenerator {
  constructor() {
    if (config.anthropicKey) {
      this.client = new Anthropic({
        apiKey: config.anthropicKey,
      });
    } else {
      this.client = null;
    }
    this._designMdSuffixPromise = null;
  }

  /**
   * Cached snippet from getdesign.md (or URL-only fallback) for image prompt generation.
   */
  async getDesignMdSuffix() {
    if (this._designMdSuffixPromise) return this._designMdSuffixPromise;

    this._designMdSuffixPromise = (async () => {
      const url = resolveDesignMdUrl(config.designMdSlug, config.designMdUrl);
      if (!url) return '';

      try {
        const { text } = await fetchDesignMdBody(url, config.designMdMaxChars);
        if (!text) {
          return `\nBrand/design reference (URL only): ${url}\nUse its typical visual language where it fits wall art (no logos or trademarks).`;
        }
        return `\nBrand/design reference (summarize visually for the poster; no logos or trademarks):\n${text}\n(Source: ${url})`;
      } catch (err) {
        console.warn('design-md: could not fetch, using URL only:', err.message);
        return `\nBrand/design reference (URL only): ${url}\nInfer mood, palette, and composition from the associated design system where appropriate.`;
      }
    })();

    return this._designMdSuffixPromise;
  }

  async generatePosterTitles(category, count = 5) {
    // Fallback titles for demo mode (when API key not set)
    const fallbackTitles = {
      'Botanika': ['Summer Garden', 'Botanical Beauty', 'Green Vibes', 'Nature\'s Art', 'Plant Love'],
      'Pory roku': ['Spring Awakening', 'Summer Sunset', 'Autumn Colors', 'Winter Wonder', 'Seasonal Bliss'],
      'Natura i krajobrazy': ['Mountain Peak', 'Forest Dreams', 'Ocean View', 'Valley Breeze', 'Scenic Route'],
      'Obrazy do kuchni': ['Fresh & Tasty', 'Kitchen Goals', 'Culinary Art', 'Food Love', 'Recipe Magic'],
      'Plakaty z napisami': ['Dream Big', 'Be Yourself', 'Stay Strong', 'Live Laugh', 'You Got This'],
      'Zwierzęta': ['Wild & Free', 'Animal Magic', 'Safari Life', 'Pet Love', 'Natural Beauty'],
      'Plakaty dla dzieci': ['Happy Times', 'Fun Adventure', 'Colorful Dreams', 'Play Zone', 'Joy Ride'],
      'Mapy i miasta': ['City Lights', 'Urban Life', 'World Travel', 'City Love', 'Map Quest'],
      'Moda': ['Fashion Forward', 'Style Icon', 'Trendy Look', 'Fashion Vibes', 'Style Goals'],
      'Retro': ['Vintage Vibes', 'Retro Cool', 'Classic Style', '80s Vibes', 'Nostalgia'],
      'Kultowe zdjęcia': ['Iconic Moment', 'Unforgettable', 'Legend Status', 'Historic', 'Timeless'],
      'Złoto i srebro': ['Golden Hour', 'Luxury Life', 'Shine Bright', 'Premium', 'Precious'],
      'Kosmos i astronomia': ['Cosmic Wonder', 'Star Light', 'Space Odyssey', 'Galaxy Quest', 'Universe'],
      'Sporty': ['Go Team', 'Game Day', 'Athletic Spirit', 'Victory', 'Champion Vibes'],
      'Muzyka': ['Sound Wave', 'Music Soul', 'Rhythm', 'Melody Love', 'Beat Drop'],
      'Plakaty planery': ['Get Organized', 'Plan Ahead', 'Daily Goals', 'Productivity', 'Organized Life'],
    };

    if (!this.client) {
      // Use fallback titles when API key is not set
      const titles = fallbackTitles[category] || Array.from({ length: count }, (_, i) => `${category} ${i + 1}`);
      return titles.slice(0, count);
    }

    const categoryDesc = config.categories[category] || category;

    const prompt = `Generate ${count} unique, creative poster titles for the "${category}" category.

Category focus: ${categoryDesc}

Requirements:
- Each title should be 2-5 words max
- Titles must be engaging and suitable for wall art
- Each title must be unique and different from others
- Return ONLY a JSON array of strings, nothing else

Example format: ["Title One", "Title Two", "Title Three"]

Generate now:`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0].text.trim();
      const titles = JSON.parse(content);
      return titles.slice(0, count);
    } catch (error) {
      console.error('Error generating titles:', error.message);
      return Array.from({ length: count }, (_, i) => `Poster ${i + 1}`);
    }
  }

  async generateImagePrompt(title, category, style) {
    const designSuffix = await this.getDesignMdSuffix();

    if (!this.client) {
      const base = `A beautiful ${style} illustration for "${title}" in the ${category} category with vibrant colors`;
      return designSuffix ? `${base}${designSuffix}` : base;
    }

    const prompt = `Create a detailed visual description for an AI art generation prompt.

Poster Title: "${title}"
Category: ${category}
Art Style: ${style}
${designSuffix}

Generate a concise but detailed prompt (2-3 sentences) that describes the visual elements, mood, colors, and composition for this poster. The image should be suitable for printing and selling as wall art.

Ensure the description:
- Is specific and visual
- Includes color palette suggestions
- Mentions composition/layout
- Is 2-3 sentences max

Generate the prompt only, no other text:`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      return response.content[0].text.trim();
    } catch (error) {
      console.error('Error generating image prompt:', error.message);
      return `A beautiful ${style} illustration for "${title}" in the ${category} category`;
    }
  }
}

module.exports = ContentGenerator;
