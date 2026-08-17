/**
 * Dedicated prompts for kids-nursery — Boho-Scandi / minimalist nursery (Etsy/Pinterest bestsellers).
 */

const { getCategoryDescription } = require('./categoryStyles');
const {
  SAFE_PRINT_FRAMING,
  COMPOSITION_GENERAL,
  RESTRICTIONS_BLOCK,
  resolveSafePrintFramingForCategory,
  getCompositionBlock,
} = require('./safePrintFraming');
const { buildTitleBriefBlock } = require('./titleSubjectConsistency');

function joinPromptBlocks(blocks) {
  return blocks
    .filter(Boolean)
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const CHILDREN_NURSERY_MODE = `
Children's nursery poster mode (Boho-Scandi / minimalist nursery — premium Pinterest/Etsy bestseller look):
- ONE clear hero subject centered on warm cream or off-white background with generous negative space.
- Muted pastel earthy palette: sage green, mustard ochre, terracotta, dusty blush, powder blue, sand beige, soft lavender — never neon primaries or circus brights.
- Gentle, calm, storybook mood — suitable for a modern Scandinavian nursery with light wood furniture.
- Subjects: cute animals with soft expressions (lion, giraffe, bear, rabbit, fox, elephant, koala, sloth, owl, deer, penguin, whale), boho rainbows, sun, clouds, moon, stars, balloons, simple wildflowers.
`.trim();

const CHILDREN_FORBIDDEN = `
Forbidden for children's nursery art:
readable text, letters, numbers, alphabet charts, logos, watermarks, branded or copyrighted characters, superheroes, Disney-style faces, scary imagery, angry expressions, neon colors, harsh black outlines clipart look, chaotic busy backgrounds, photorealistic photography, 3D CGI renders, product mockups, frames inside the image.
Inspired nursery aesthetic only — never licensed IP.
`.trim();

const CHILDREN_ILLUSTRATION_STYLE = `
Soft watercolor nursery illustration on cream paper: translucent bleeding washes, delicate hand-painted edges, single centered animal portrait or gentle motif, subtle paper texture, premium Etsy nursery art quality.
Facial features sweet and minimal — small dot eyes, soft blush, no hyper-detail. Lots of breathing room above and below the subject.
Avoid digital flat clipart, vector sticker look, thick comic outlines, or saturated primary colors.
`.trim();

const CHILDREN_MINIMALISM_STYLE = `
Boho minimalist nursery illustration: flat simple shapes, muted earthy tones, large calm negative space on warm off-white, one symbolic motif (rainbow arcs, sun disc, cloud, star cluster, balloon silhouette).
Scandinavian nursery poster aesthetic — clean, modern, gentle, not childish clipart.
Soft edges, no harsh contrast, no busy patterns filling the canvas.
`.trim();

const CHILDREN_COMPOSITION = `
Composition:
Single centered hero subject (one animal OR one nursery motif).
Subject occupies 55–70% of canvas height with clear margin on all sides — full ears, horns, tails, and balloon baskets must remain visible.
Background is plain cream, off-white, or very soft watercolor wash — not a detailed room interior.
`.trim();

function buildChildrenIllustrationPrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || 'kids-nursery').trim();
  const styleKey = String(style || 'Illustration').trim();
  const safeBlock = resolveSafePrintFramingForCategory(categoryKey, styleKey) || SAFE_PRINT_FRAMING;
  return joinPromptBlocks([
    'Premium fine-art nursery poster for print.',
    buildTitleBriefBlock(titleText, { literal: true, category: categoryKey, style: styleKey }),
    `Category focus: ${getCategoryDescription(categoryKey)}`,
    CHILDREN_NURSERY_MODE,
    CHILDREN_FORBIDDEN,
    `Style direction: ${CHILDREN_ILLUSTRATION_STYLE}`,
    CHILDREN_COMPOSITION,
    safeBlock,
    RESTRICTIONS_BLOCK,
    'Ultra-detailed, print-ready nursery wall art.',
  ]);
}

function buildChildrenMinimalismPrompt({ title, category, style }) {
  const titleText = String(title || '').trim();
  const categoryKey = String(category || 'kids-nursery').trim();
  const styleKey = String(style || 'Minimalism').trim();
  const safeBlock = resolveSafePrintFramingForCategory(categoryKey, styleKey) || SAFE_PRINT_FRAMING;
  return joinPromptBlocks([
    'Premium fine-art nursery poster for print.',
    buildTitleBriefBlock(titleText, { literal: true, category: categoryKey, style: styleKey }),
    `Category focus: ${getCategoryDescription(categoryKey)}`,
    CHILDREN_NURSERY_MODE,
    CHILDREN_FORBIDDEN,
    `Style direction: ${CHILDREN_MINIMALISM_STYLE}`,
    CHILDREN_COMPOSITION,
    safeBlock,
    RESTRICTIONS_BLOCK,
    'Ultra-detailed, print-ready nursery wall art.',
  ]);
}

module.exports = {
  CHILDREN_NURSERY_MODE,
  buildChildrenIllustrationPrompt,
  buildChildrenMinimalismPrompt,
};
