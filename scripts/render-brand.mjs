/** Renders the YieldShield Arc mark, favicons and social card with headless Chromium (Playwright). */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
const mark = readFileSync("public/mark.svg", "utf8");
const card = `<!doctype html><html><head><style>
  body{margin:0;width:1280px;height:640px;background:#fbfcf8;font-family:"Helvetica Neue",Arial,sans-serif;color:#193730;overflow:hidden;position:relative}
  .brand{position:absolute;left:76px;top:118px;display:flex;align-items:center;gap:22px;font-size:46px;font-weight:700;letter-spacing:-1px}
  .brand svg{width:76px;height:76px}
  h1{position:absolute;left:70px;top:205px;margin:0;font-size:170px;letter-spacing:-6px;line-height:1}
  p{position:absolute;left:76px;top:418px;margin:0;font-size:34px;letter-spacing:-0.4px}
  .foot{position:absolute;left:78px;bottom:92px;font-size:17px;letter-spacing:4px;font-weight:600}
  .art{position:absolute;right:-40px;bottom:-20px;width:640px}
</style></head><body>
  <div class="brand">${mark}<span>YieldShield</span></div>
  <h1>Arc</h1>
  <p>EURC and cirBTC exposure. A fixed USDC claim.</p>
  <div class="foot">ARC TESTNET · PROTOTYPE · TEST TOKENS ONLY</div>
  <svg class="art" viewBox="0 0 640 520"><path d="M40 520a280 280 0 0 1 560 0" fill="#d9e7d8"/><path d="M130 520a190 190 0 0 1 380 0" fill="#b3cfb8"/><path d="M220 520a100 100 0 0 1 200 0" fill="#2f5c45"/><path d="M90 470h460" stroke="#ef624d" stroke-width="26" stroke-linecap="round"/></svg>
</body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 640 });
await page.setContent(card);
await page.screenshot({ path: "public/og.jpg", type: "jpeg", quality: 90 });
await page.screenshot({ path: ".github/assets/banner.png", type: "png" });
async function icon(size, path) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${mark.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`,
  );
  return page.screenshot({ path, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
const png32 = await icon(32, "public/favicon-32.png");
await icon(180, "public/apple-touch-icon.png");
await browser.close();
// favicon.ico: a single 32x32 PNG inside an ICO container.
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png32.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync("public/favicon.ico", Buffer.concat([header, png32]));
console.log("Rendered og.jpg, banner.png, favicon-32.png, apple-touch-icon.png and favicon.ico.");
