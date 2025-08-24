import { chromium } from 'playwright';
import fs from 'fs';

// Simple script to take screenshots of two routes for visual comparison
// Usage: ensure dev server is running at http://localhost:5173, then run: node ./scripts/compareTools.mjs

const base = process.env.BASE_URL || 'http://localhost:5173';
const outDir = './playwright-screenshots';

async function run() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

  const routes = [
    { name: 'vitamin', path: '/vitamin-calculator' },
    { name: 'json', path: '/json-to-geojson' },
  ];

  for (const route of routes) {
    const url = `${base}${route.path}`;
    console.log('Opening', url);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500); // give some time for lazy content
    const file = `${outDir}/${route.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log('Saved', file);
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
