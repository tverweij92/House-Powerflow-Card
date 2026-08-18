const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sources = [
  path.join(root, "src", "house-power-flow-card-base.js"),
  path.join(root, "src", "house-power-flow-card-responsive.js"),
];
const outputs = [
  path.join(root, "house-power-flow-card.js"),
  path.join(root, "dist", "house-power-flow-card.js"),
];

const banner = `/*
 * House Power Flow Card v5.2.1
 * Generated from src/house-power-flow-card-base.js and
 * src/house-power-flow-card-responsive.js.
 * Run: node scripts/build-card.cjs
 */\n\n`;
const bundle = banner + sources
  .map((source) => fs.readFileSync(source, "utf8").trim())
  .join("\n\n") + "\n";

for (const output of outputs) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, bundle, "utf8");
  console.log(`Built ${path.relative(root, output)}`);
}
