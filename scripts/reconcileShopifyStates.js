const fs = require('fs');
const path = require('path');
const { reconcileInventoryShopifyStates, summarizeApprovedShopifyStates } = require('../src/shopifyState');

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
  const approved = summarizeApprovedShopifyStates(projectRoot, inv);
  console.log(
    `Summary (all records): total=${summary.total}, ready=${summary.ready}, pending=${summary.pending_assets}, legacy=${summary.legacy_blocked}`
  );
  console.log(
    `Summary (approved unique): ${approved.uniqueApproved}, ready=${approved.ready}, pending=${approved.pending_assets}, legacy=${approved.legacy_blocked}`
  );
}

main();
