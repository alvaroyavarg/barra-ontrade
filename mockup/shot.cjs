const { chromium } = require('playwright');
const path = require('path');

const DIR = __dirname;
const OUT = process.env.OUT || DIR;

const shots = [
  { file: 'screen1-ruta.html',      w: 390,  h: 844, name: '1-ruta.png',          full: false },
  { file: 'screen2-visita.html',    w: 390,  h: 844, name: '2-nueva-visita.png',  full: false },
  { file: 'screen3-score.html',     w: 390,  h: 844, name: '3-score.png',         full: false },
  { file: 'screen4-muro.html',      w: 390,  h: 844, name: '4-muro.png',          full: false },
  { file: 'screen5-dashboard.html', w: 1360, h: 900, name: '5-dashboard.png',     full: true  },
];

(async () => {
  const browser = await chromium.launch();
  for (const s of shots) {
    const page = await browser.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(DIR, s.file), { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(OUT, s.name), fullPage: s.full });
    await page.close();
    console.log('shot:', s.name);
  }
  await browser.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
