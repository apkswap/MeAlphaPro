import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const failures = [];
const routes = ['/', '/goals', '/tasks', '/habits', '/focus', '/transactions', '/wealth', '/insights', '/settings', '/workspace'];
const viewports = [
  { name: 'small-mobile', width: 320, height: 740 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 960 }
];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  page.on('pageerror', error => failures.push(`${viewport.name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`${viewport.name} console: ${message.text()}`); });
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
  await page.locator('h1').first().waitFor({ timeout: 20000 });
  for (const route of routes) {
    await page.goto('http://127.0.0.1:8080' + route, { waitUntil: 'networkidle' });
    await page.locator('h1').first().waitFor({ timeout: 10000 });
    const heading = (await page.locator('h1').first().innerText()).trim();
    if (!heading) failures.push(`${viewport.name} ${route}: empty page heading`);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    if (dimensions.document > dimensions.viewport + 1 || dimensions.body > dimensions.viewport + 1) {
      failures.push(`${viewport.name} ${route}: horizontal page overflow ${JSON.stringify(dimensions)}`);
    }
    if (await page.getByText('MeAlpha Pro could not load this screen').count()) {
      failures.push(`${viewport.name} ${route}: React runtime error fallback`);
    }
    if (route === '/') {
      for (const label of ['Life Score', 'Alpha Intelligence']) {
        if (!(await page.getByText(label, { exact: true }).count())) failures.push(`${viewport.name} dashboard: missing ${label}`);
      }
      if (!(await page.getByText(/Consistency Engine/).count())) failures.push(`${viewport.name} dashboard: missing Consistency Engine`);
    }
    if (route === '/focus' && !(await page.getByRole('button', { name: /افزودن جلسه|Add session/ }).count())) {
      failures.push(`${viewport.name} focus: manual session control missing`);
    }
    if (route === '/insights') {
      for (const [label, pattern] of [['3-month', /3 (mo|ماه)/], ['6-month', /6 (mo|ماه)/], ['12-month', /12 (mo|ماه)/]]) {
        const periodButton = page.getByRole('button', { name: pattern });
        if (!(await periodButton.count())) {
          failures.push(`${viewport.name} insights: ${label} period control missing`);
        } else {
          await periodButton.click();
          if ((await periodButton.getAttribute('aria-pressed')) !== 'true') {
            failures.push(`${viewport.name} insights: ${label} period control did not activate`);
          }
        }
      }
    }
  }
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
  if (await page.getByRole('button', { name: /English/ }).count()) {
    await page.getByRole('button', { name: /English/ }).click();
    await page.waitForFunction(() => document.documentElement.dir === 'ltr');
    if (await page.getByRole('button', { name: /فارسی/ }).count()) {
      await page.getByRole('button', { name: /فارسی/ }).click();
      await page.waitForFunction(() => document.documentElement.dir === 'rtl');
    }
  } else {
    failures.push(`${viewport.name}: language switch control not visible`);
  }
  const themeButton = page.getByRole('button', { name: /حالت روشن|Light mode/ });
  if (await themeButton.count()) {
    await themeButton.click();
    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
    const darkButton = page.getByRole('button', { name: /حالت تاریک|Dark mode/ });
    await darkButton.click();
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  } else {
    failures.push(`${viewport.name}: theme switch control not visible`);
  }
  if (viewport.name === 'desktop' || viewport.name === 'mobile' || viewport.name === 'small-mobile') {
    await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
    await page.screenshot({ path: `ui-${viewport.name}.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
if (failures.length) {
  console.error('UI smoke test failures:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('UI smoke tests passed: 10 routes at 320px, 390px, 768px and 1440px; no runtime errors or page-level horizontal overflow; language and theme switches verified.');
