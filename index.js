#!/usr/bin/env node

require('dotenv').config();
const PosterBatchGenerator = require('./src/posterGenerator');
const config = require('./config');

function parseCliArgs(argv) {
  const positional = [];
  let artStyle = null;
  let matFrame = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--style' && argv[i + 1] != null) {
      artStyle = argv[i + 1];
      i++;
    } else if (typeof a === 'string' && a.startsWith('--style=')) {
      artStyle = a.slice('--style='.length);
    } else if (a === '--mat-frame' || a === '--matted') {
      matFrame = true;
    } else {
      positional.push(a);
    }
  }
  return { positional, artStyle, matFrame };
}

const { positional: args, artStyle: cliArtStyle, matFrame: cliMatFrame } = parseCliArgs(process.argv.slice(2));

async function main() {
  const generator = new PosterBatchGenerator();

  // Check if API keys are configured
  if (!config.openaiKey) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not set');
    console.warn('Set OPENAI_API_KEY in .env to enable ChatGPT for titles\n');
  }

  if (!args.length) {
    console.log('Poster Generator CLI\n');
    console.log('Usage:');
    console.log('  node index.js [command] [options]\n');
    console.log('Commands:');
    console.log('  generate <category> [count] [--style <name>]  - Generate posters for a category');
    console.log('  generate-all [count] [--style <name>]         - Generate posters for all categories');
    console.log('  stats                        - Show inventory statistics\n');
    console.log('Options:');
    console.log('  --style <name>   Fixed style: <count> = total posters (one folder per style).');
    console.log('                   Omit: all styles — <count> = posters per style (× N styles per category).');
    console.log('  --mat-frame      Jasne passe-partout wokół motywu (ten sam rozmiar pliku co pełna strona).\n');
    console.log('Examples:');
    console.log('  node index.js generate "Botanika" 5');
    console.log('  node index.js generate "Botanika" 5 --style watercolor');
    console.log('  node index.js generate-all 10 --style "line art"');
    console.log('  node index.js stats\n');
    return;
  }

  if (cliArtStyle != null && String(cliArtStyle).trim() !== '' && !config.artStyles.includes(cliArtStyle)) {
    console.error(`Unknown art style: ${cliArtStyle}`);
    console.error(`Valid styles: ${config.artStyles.join(', ')}`);
    process.exit(1);
  }

  const genOpts = { withPdf: true };
  if (cliArtStyle != null && String(cliArtStyle).trim() !== '') genOpts.artStyle = cliArtStyle;
  if (cliMatFrame) genOpts.printLayout = 'uniform';

  const [command, param1, param2] = args;

  try {
    if (command === 'generate' && param1) {
      const category = param1;
      const count = parseInt(param2) || 5;
      await generator.generateCategory(category, count, genOpts);
    } else if (command === 'generate-all') {
      const count = parseInt(param1) || 5;
      await generator.generateAllCategories(count, genOpts);
    } else if (command === 'stats') {
      generator.printStats();
    } else {
      console.error(`Unknown command: ${command}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
