#!/usr/bin/env node

require('dotenv').config();
const PosterBatchGenerator = require('./src/posterGenerator');
const config = require('./config');

const args = process.argv.slice(2);

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
    console.log('  generate <category> [count]  - Generate posters for a category');
    console.log('  generate-all [count]         - Generate posters for all categories');
    console.log('  stats                        - Show inventory statistics\n');
    console.log('Examples:');
    console.log('  node index.js generate "Botanika" 5');
    console.log('  node index.js generate-all 10');
    console.log('  node index.js stats\n');
    return;
  }

  const [command, param1, param2] = args;

  try {
    if (command === 'generate' && param1) {
      const category = param1;
      const count = parseInt(param2) || 5;
      await generator.generateCategory(category, count);
    } else if (command === 'generate-all') {
      const count = parseInt(param1) || 5;
      await generator.generateAllCategories(count);
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
