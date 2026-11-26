// Mide cuándo aparece la ruleta del hero en un móvil lento: el LCP y el momento en que se pinta la última de sus
// cuatro capas (las imágenes llevan elementtiming en hero.section.html). Cada corrida usa una sesión nueva y sin caché.
//   npm run lab                     -> en otra terminal: compila y levanta la PWA en http://localhost:4200
//   npm run medir:ruleta            -> 7 corridas contra http://localhost:4200/
//   npm run medir:ruleta -- 10      -> 10 corridas
// Variables opcionales: URL (http://localhost:4200/) y CHROME_PATH (Chrome instalado en macOS por defecto).
// Para comparar dos versiones, compila y mide cada una por separado con el mismo equipo y sin otras cargas.
import puppeteer from 'puppeteer-core';

const CORRIDAS = Number(process.argv[2] ?? 7);
const URL_PWA = process.env.URL ?? 'http://localhost:4200/';
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CAPAS = ['ruleta-cuenco', 'ruleta-cabeza', 'ruleta-numeros', 'ruleta-tapa'];

// Same mobile profile as Lighthouse: slow 4G and a CPU four times slower
const RED = { offline: false, latency: 150, downloadThroughput: 180_000, uploadThroughput: 84_375 };
const CPU = 4;

const mediana = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const seg = (ms) => `${(ms / 1000).toFixed(2)} s`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const lcps = [];
const ruletas = [];
try {
  for (let i = 1; i <= CORRIDAS; i++) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
    });
    const cdp = await page.createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', RED);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    await page.evaluateOnNewDocument(() => {
      window.__lcp = [];
      window.__capas = {};
      new PerformanceObserver((l) =>
        l.getEntries().forEach((e) => window.__lcp.push({ t: e.startTime, url: e.url })),
      ).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) =>
        l.getEntries().forEach((e) => (window.__capas[e.identifier] = e.renderTime || e.loadTime)),
      ).observe({ type: 'element', buffered: true });
    });
    await page.goto(URL_PWA, { waitUntil: 'networkidle0', timeout: 120_000 });
    // LCP and element entries can arrive a little after the network goes quiet
    await new Promise((r) => setTimeout(r, 1500));
    const { lcp, capas } = await page.evaluate(() => ({
      lcp: window.__lcp.at(-1),
      capas: window.__capas,
    }));
    await ctx.close();

    const faltan = CAPAS.filter((c) => !capas[c]);
    if (!lcp || faltan.length) {
      console.error(`Corrida ${i}: no se midió ${lcp ? faltan.join(', ') : 'el LCP'}`);
      continue;
    }
    const ruleta = Math.max(...CAPAS.map((c) => capas[c]));
    lcps.push(lcp.t);
    ruletas.push(ruleta);
    const detalle = CAPAS.map((c) => `${c.slice(7)} ${seg(capas[c])}`).join(', ');
    console.log(
      `Corrida ${i}: LCP ${seg(lcp.t)} (${lcp.url.split('/').pop()}), ruleta completa ${seg(ruleta)} [${detalle}]`,
    );
  }
} finally {
  await browser.close();
}

if (!ruletas.length) process.exit(1);
console.log(
  `\nMedianas de ${ruletas.length} corridas: LCP ${seg(mediana(lcps))}, ` +
    `ruleta completa ${seg(mediana(ruletas))} ` +
    `(rango ${seg(Math.min(...ruletas))}–${seg(Math.max(...ruletas))})`,
);
