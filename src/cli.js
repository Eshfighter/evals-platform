import { loadSuite, runSuite } from "./runner.js";

const suitePath = process.argv[2];

if (!suitePath) {
  console.error("Usage: node src/cli.js <suite.json>");
  process.exit(1);
}

const suite = await loadSuite(suitePath);
const report = await runSuite(suite);

console.log(JSON.stringify(report, null, 2));
process.exit(report.failed > 0 ? 1 : 0);
