/** Writes the app's ABI files from the Foundry build (run `npm run test:contracts` first). */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const sources = [
  ["ShieldPool", "ShieldPool"],
  ["ShieldFactory", "ShieldFactory"],
  ["ShieldOracles", "ShieldChronicleOracle"],
  ["ShieldOracles", "ShieldScenarioOracle"],
  ["ShieldOracles", "ShieldChainlinkOracle"],
  ["ShieldPyth", "ShieldPythOracle"],
  ["ShieldPyth", "IPyth"],
  ["IERC20Metadata", "IERC20Metadata"],
];
mkdirSync("config/abi", { recursive: true });
for (const [file, name] of sources) {
  const { abi } = JSON.parse(readFileSync(`contracts/out/${file}.sol/${name}.json`));
  writeFileSync(`config/abi/${name}.json`, JSON.stringify(abi, null, 2) + "\n");
}
console.log(`Exported ${sources.length} ABIs to config/abi.`);
