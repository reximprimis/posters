const fs = require('fs');
const path = require('path');
const { reconcileInventoryShopifyStates } = require('../src/shopifyState');

const projectRoot = path.resolve(__dirname, '..');
const inventoryPath = path.join(projectRoot, 'posters_inventory.json');

function main() {
  if (!fs.existsSync(inventoryPath)) {
    throw new Error('Brak posters_inventory.json');
  }
  const inv = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const summary = reconcileInventoryShopifyStates(projectRoot, inv);
  fs.writeFileSync(inventoryPath, JSON.stringify(inv, null, 2), 'utf8');
  console.log(`Shopify states reconciled. changed=${summary.changed}`);
  console.log(
    `Summary: total=${summary.total}, ready=${summary.ready}, pending_assets=${summary.pending_assets}, legacy_blocked=${summary.legacy_blocked}`
  );
}

main();
