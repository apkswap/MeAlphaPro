import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
// Upgrade regression: preserve v4 daily entries while moving them into dated Tasks.
const migrationPage = await browser.newPage();
await migrationPage.goto('http://127.0.0.1:8080/favicon.ico');
await migrationPage.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('mealpha-pro-local', 4);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const name of ['goals','tasks','habits','habitLogs','transactions','accounts','paymentReminders','customItems','notes','assets','liabilities','appMeta']) {
        if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: name === 'appMeta' ? 'key' : 'id' });
      }
      request.transaction.objectStore('customItems').put({ id: 'legacy-checklist-smoke', kind: 'dashboard-daily-entry', entryType: 'checklist', date: '2026-11-25', title: 'Legacy checklist migration', done: false });
      request.transaction.objectStore('notes').put({ id: 'legacy-journal-smoke', kind: 'daily-journal', date: '2026-11-25', title: 'Daily journal', notes: 'Legacy journal migration' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
});
await migrationPage.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
const migrated = await migrationPage.evaluate(async () => {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('mealpha-pro-local', 6);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const result = await new Promise((resolve, reject) => {
    const tx = db.transaction(['tasks','notes','customItems','localNotes'], 'readonly');
    const tasks = tx.objectStore('tasks').getAll(), notes = tx.objectStore('notes').getAll(), workspace = tx.objectStore('customItems').getAll(), localNotes = tx.objectStore('localNotes').getAll();
    tx.oncomplete = () => resolve({ tasks: tasks.result, notes: notes.result, workspace: workspace.result, localNotes: localNotes.result });
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return result.tasks.some(item => item.dailyEntryType === 'checklist' && item.title === 'Legacy checklist migration' && item.dueDate === '2026-11-25')
    && result.localNotes.some(item => item.kind === 'daily-journal' && item.title === 'Daily journal' && item.content === 'Legacy journal migration' && item.date === '2026-11-25')
    && !result.notes.some(item => item.id === 'legacy-journal-smoke')
    && !result.workspace.some(item => item.id === 'legacy-checklist-smoke');
});
if (!migrated) throw new Error('v4 checklist and journal entries were not migrated into their intended stores');
await migrationPage.close();

const failures = [];
const routes = ['/', '/goals', '/tasks', '/habits', '/focus', '/transactions', '/wealth', '/insights', '/settings', '/workspace'];
const viewports = [
  { name: 'small-mobile', width: 320, height: 740 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 960 }
];

const conversionPage = await browser.newPage();
await conversionPage.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
const searchLogicChecks = await conversionPage.evaluate(async () => {
  const { normalizeSearchTerm, matchesSearchText } = await import('/src/components/GlobalSearch.tsx');
  return {
    arabicPersianLetters: normalizeSearchTerm('كیفیت مالی') === normalizeSearchTerm('کیفیت مالی'),
    halfSpace: matchesSearchText('هدف‌های مالی', 'هدفهای مالی'),
    persianDigits: matchesSearchText('حساب ۱۲۳۴۵', 'حساب 12345')
  };
});
if (!searchLogicChecks.arabicPersianLetters || !searchLogicChecks.halfSpace || !searchLogicChecks.persianDigits) {
  failures.push('Persian/Arabic search normalization regression: ' + JSON.stringify(searchLogicChecks));
}

const currencyChecks = await conversionPage.evaluate(async () => {
  const { parseRates, makeConverter, monthFinance, netWorth, todayISO, findings, scores } = await import('/src/lib/analytics.ts');
  const settings = {
    currency: 'IRT',
    exchangeRates: 'USD = IRT 26000\nEUR/USD=1.1\nGBP/EUR=1.2'
  };
  const parsed = parseRates(settings.exchangeRates, settings.currency);
  const converter = makeConverter(settings);
  const direct = converter.conv(1, 'USD') / 100;
  const reverse = converter.fromBase(26000, 'USD') / 100;
  const chained = converter.conv(1, 'GBP') / 100;
  const missingValue = converter.conv(1, 'CAD');
  const incompleteMonth = monthFinance([
    { id: 'missing-rate-income', date: todayISO(), kind: 'Income', amount: 100, currency: 'CAD' }
  ], settings);
  const incompleteWealth = netWorth([
    { id: 'missing-rate-asset', currentValue: 100, currency: 'CAD' }
  ], [], settings, []);
  const budgetFinding = findings({
    goals: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    transactions: [{ id: 'budget-smoke-expense', date: todayISO(), kind: 'Expense', amount: 500, currency: 'IRT' }]
  }, { ...settings, monthlyBudget: 400 }, 'en').find(item => item.id.startsWith('budget-'));
  const missingRateData = {
    goals: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    transactions: [{ id: 'missing-rate-expense', date: todayISO(), kind: 'Expense', amount: 500, currency: 'CAD' }]
  };
  const missingRateFindings = findings(missingRateData, { ...settings, monthlyBudget: 1 }, 'en');
  const missingRateFinanceScore = scores(missingRateData, settings).parts.finance;
  return {
    parsedPair: parsed.some(pair => pair.from === 'USD' && pair.to === 'IRT' && pair.rate === 26000),
    direct,
    reverse,
    chained,
    missingIsNaN: Number.isNaN(missingValue),
    missingTracked: converter.missing.has('CAD'),
    monthIncomplete: incompleteMonth.complete === false && incompleteMonth.missing.includes('CAD'),
    wealthIncomplete: incompleteWealth.complete === false && incompleteWealth.missing.includes('CAD'),
    budgetFindingCurrency: budgetFinding?.money?.spent === 500 && budgetFinding.money.budget === 400 && budgetFinding.money.currency === 'IRT',
    missingRateBudgetSuppressed: !missingRateFindings.some(item => item.id.startsWith('budget-')),
    missingRateFinanceScoreIsNull: missingRateFinanceScore === null
  };
});
if (!currencyChecks.parsedPair || currencyChecks.direct !== 26000 || currencyChecks.reverse !== 1 ||
    currencyChecks.chained !== 34320 || !currencyChecks.missingIsNaN || !currencyChecks.missingTracked ||
    !currencyChecks.monthIncomplete || !currencyChecks.wealthIncomplete || !currencyChecks.budgetFindingCurrency ||
    !currencyChecks.missingRateBudgetSuppressed || !currencyChecks.missingRateFinanceScoreIsNull) {
  failures.push('Currency conversion regression: ' + JSON.stringify(currencyChecks));
}
await conversionPage.close();

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  page.on('pageerror', error => failures.push(`${viewport.name}: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') failures.push(`${viewport.name} console: ${message.text()}`); });
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
  await page.locator('h1').first().waitFor({ timeout: 20000 });
  if (viewport.name === 'desktop' || viewport.name === 'mobile' || viewport.name === 'small-mobile') {
    await page.screenshot({ path: `ui-${viewport.name}.png`, fullPage: true });
  }
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
      const lifeScore = page.getByText(/Life score|امتیاز رشد/).first();
      const intelligence = page.getByText(/Alpha Performance Intelligence|هوش عملکردی آلفا/).first();
      if (!(await lifeScore.count())) failures.push(`${viewport.name} dashboard: Life Score panel missing`);
      if (!(await intelligence.count())) failures.push(`${viewport.name} dashboard: performance intelligence panel missing`);

      const searchTrigger = page.getByRole('button', { name: /جستجوی سراسری|Global search/ });
      if (!(await searchTrigger.count())) {
        failures.push(`${viewport.name}: global search trigger is missing`);
      } else {
        const triggerIcon = await searchTrigger.locator('svg').first().evaluate(el => {
          const box = el.getBoundingClientRect();
          return { width: box.width, height: box.height };
        });
        if (triggerIcon.width > 15 || triggerIcon.height > 15) failures.push(`${viewport.name}: global search trigger icon is not compact ${JSON.stringify(triggerIcon)}`);
        if (viewport.width >= 768) {
          const sidebar = page.locator('.mealpha-sidebar-panel');
          if (!(await sidebar.count())) failures.push(`${viewport.name}: desktop sidebar is missing`);
          else {
            await sidebar.hover();
            await page.waitForTimeout(350);
            const sidebarWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);
            if (sidebarWidth > 236) failures.push(`${viewport.name}: expanded desktop sidebar is too wide (${sidebarWidth}px)`);
            if (await page.locator('.mealpha-contextual-rail').count()) failures.push(`${viewport.name}: unwanted adjacent white contextual rail is still rendered`);
            const financeGroup = page.getByRole('button', { name: /مدیریت مالی|Financial management/ });
            if (!(await financeGroup.count())) failures.push(`${viewport.name}: finance parent navigation is missing`);
            else {
              await financeGroup.click();
              for (const label of [/تراکنش‌ها|Transactions/, /دارایی‌ها|Assets/, /بدهی‌ها|Liabilities/]) {
                if (!(await page.getByRole('link', { name: label }).count())) failures.push(`${viewport.name}: finance subtask ${label} is missing`);
              }
              await page.mouse.move(viewport.width - 20, viewport.height - 20);
              await sidebar.locator('a').first().focus();
              await page.waitForFunction(() => document.querySelector('.mealpha-sidebar-panel')?.getBoundingClientRect().width > 200, undefined, { timeout: 3000 }).catch(() => failures.push(`${viewport.name}: keyboard focus did not expand desktop navigation`));
              await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
              await page.mouse.move(viewport.width - 20, viewport.height - 20);
              await page.waitForFunction(() => document.querySelector('.mealpha-sidebar-panel')?.getBoundingClientRect().width < 100, undefined, { timeout: 3000 }).catch(() => failures.push(`${viewport.name}: desktop navigation did not collapse after focus left`));
            }
          }
        }
        await searchTrigger.click();
        const searchDialog = page.getByRole('dialog', { name: /جستجوی سراسری|Global search/ });
        const searchInput = page.getByRole('combobox', { name: /عبارت جستجو|Search query/ });
        await searchDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => failures.push(`${viewport.name}: search dialog did not open`));
        await searchInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => failures.push(`${viewport.name}: search input is missing`));
        if (await searchInput.count()) {
          if (!(await searchInput.evaluate(el => el === document.activeElement))) failures.push(`${viewport.name}: search input did not receive focus`);
          await searchInput.fill('داشبورد');
          const dashboardOption = page.getByRole('option', { name: /داشبورد|Dashboard/ }).first();
          if (!(await dashboardOption.count())) failures.push(`${viewport.name}: page search did not return dashboard`);
          else {
            const overlayMetrics = await page.getByTestId('global-search-overlay').evaluate(el => {
              const r = el.getBoundingClientRect();
              const style = getComputedStyle(el);
              return { parent: el.parentElement?.tagName, position: style.position, zIndex: Number(style.zIndex), top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
            });
            const dialogMetrics = await page.getByTestId('global-search-dialog').evaluate(el => {
              const r = el.getBoundingClientRect();
              return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
            });
            const optionMetrics = await dashboardOption.evaluate(el => {
              const r = el.getBoundingClientRect();
              return { top: r.top, bottom: r.bottom, height: r.height, visible: r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight };
            });
            if (overlayMetrics.parent !== 'BODY' || overlayMetrics.position !== 'fixed' || overlayMetrics.zIndex < 9999 ||
                overlayMetrics.top > 0 || overlayMetrics.left > 0 || overlayMetrics.right < overlayMetrics.viewportWidth - 1 ||
                overlayMetrics.bottom < overlayMetrics.viewportHeight - 1) {
              failures.push(`${viewport.name}: search overlay is trapped by an app layout/stacking context ${JSON.stringify(overlayMetrics)}`);
            }
            if (dialogMetrics.top < 0 || dialogMetrics.left < 0 || dialogMetrics.right > viewport.width + 1 ||
                dialogMetrics.bottom > viewport.height + 1 || dialogMetrics.height > viewport.height) {
              failures.push(`${viewport.name}: search dialog exceeds the visible viewport ${JSON.stringify(dialogMetrics)}`);
            }
            if (!optionMetrics.visible) failures.push(`${viewport.name}: search result is clipped or outside the visible dialog ${JSON.stringify(optionMetrics)}`);
            if ((await page.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden') {
              failures.push(`${viewport.name}: background page remains scrollable while search is open`);
            }
          }
          await page.mouse.click(5, 5);
          await searchDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => failures.push(`${viewport.name}: pointer outside did not close search`));
          await page.keyboard.press('Control+k');
          await searchDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => failures.push(`${viewport.name}: Ctrl+K did not reopen search`));
          if ((await searchInput.inputValue()) !== '') failures.push(`${viewport.name}: search query was not reset after close`);
          await searchInput.fill('اهداف');
          const goalsOption = page.getByRole('option', { name: /اهداف|Goals/ }).first();
          if (!(await goalsOption.count())) failures.push(`${viewport.name}: Persian page query did not return goals`);
          else {
            await goalsOption.click();
            await page.waitForURL('**/goals', { timeout: 5000 }).catch(() => failures.push(`${viewport.name}: selecting a search result did not navigate`));
            await searchDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => failures.push(`${viewport.name}: search stayed open after navigation`));
          }
          await searchTrigger.click();
          await searchDialog.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
          await page.keyboard.press('Escape');
          await searchDialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => failures.push(`${viewport.name}: Escape did not close search`));
        }
      }
    }
    if (route === '/focus' && !(await page.getByRole('button', { name: /افزودن جلسه|Add session/ }).count())) {
      failures.push(`${viewport.name} focus: manual session control missing`);
    }
    if (route === '/habits') {
      const smokeHabitId = `smoke-calendar-${viewport.name}`;
      await page.evaluate(async id => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('mealpha-pro-local', 6);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise((resolve, reject) => {
          const tx = db.transaction('habits', 'readwrite');
          tx.objectStore('habits').put({ id, name: 'Smoke calendar habit', frequency: 'Daily', targetPerPeriod: 1, archived: false });
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      }, smokeHabitId);
      await page.reload({ waitUntil: 'networkidle' });
      const calendar = await page.evaluate(() => {
        const grids = [...document.querySelectorAll('[class~="grid-cols-7"]')];
        const grid = grids.find(element => element.querySelectorAll('button[aria-label]').length >= 28);
        if (!grid) return null;
        const buttons = [...grid.querySelectorAll('button[aria-label]')];
        return {
          columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
          dayCount: buttons.length,
          minDayWidth: Math.min(...buttons.map(button => button.getBoundingClientRect().width))
        };
      });
      if (!calendar || calendar.columns !== 7 || calendar.dayCount < 28 || calendar.minDayWidth < 24) {
        failures.push(`${viewport.name} habits: monthly calendar is not compact/readable ${JSON.stringify(calendar)}`);
      }
      await page.evaluate(async id => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('mealpha-pro-local', 6);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise((resolve, reject) => {
          const tx = db.transaction('habits', 'readwrite');
          tx.objectStore('habits').delete(id);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      }, smokeHabitId);
      await page.reload({ waitUntil: 'networkidle' });
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
  const isMobile = viewport.width < 768;
  if (isMobile) {
    const menuToggle = page.getByRole('button', { name: /بازکردن منو|Open menu/ });
    if (await menuToggle.count()) await menuToggle.click();
    else failures.push(`${viewport.name}: mobile menu control not visible`);
  }
  const languageButton = isMobile
    ? page.getByRole('button', { name: /English/ })
    : page.getByRole('button', { name: /^(EN|فا)$/i });
  if (await languageButton.count()) {
    await languageButton.click();
    await page.waitForFunction(() => document.documentElement.dir === 'ltr');
    const persianButton = isMobile
      ? page.getByRole('button', { name: /فارسی/ })
      : page.getByRole('button', { name: /^(EN|فا)$/i });
    if (await persianButton.count()) {
      await persianButton.click();
      await page.waitForFunction(() => document.documentElement.dir === 'rtl');
    } else {
      failures.push(`${viewport.name}: return-to-Persian control not visible`);
    }
  } else {
    failures.push(`${viewport.name}: language switch control not visible`);
  }
  const themeButton = isMobile
    ? page.getByRole('button', { name: /تغییر تم|Toggle theme/ })
    : page.getByRole('button', { name: /شب|روز|Night|Day/ });
  if (await themeButton.count()) {
    await themeButton.click();
    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
    await themeButton.click();
    await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  } else {
    failures.push(`${viewport.name}: theme switch control not visible`);
  }
  // Regression: dashboard completion must update the whole IndexedDB record, not replace it with status-only data.
  const taskId = `smoke-dashboard-task-${viewport.name}`;
  const taskTitle = `Dashboard persistence ${viewport.name}`;
  const today = new Date().toISOString().slice(0, 10);
  await page.evaluate(async ({ id, title, dueDate }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mealpha-pro-local', 6);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      tx.objectStore('tasks').put({
        id, title, status: 'Todo', priority: 'High', dueDate,
        notes: 'Must survive dashboard completion', estimatedMinutes: 45,
        reminders: [{ id: 'keep-reminder', at: '2030-01-01T10:00:00.000Z', enabled: true }]
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, { id: taskId, title: taskTitle, dueDate: today });
  await page.reload({ waitUntil: 'networkidle' });
  // Open any dashboard sections needed for persistence regression checks.
  await page.locator('details').evaluateAll(elements => elements.forEach(element => { element.open = true; }));
  const taskRow = page.locator('li').filter({ hasText: taskTitle }).first();
  await taskRow.waitFor({ timeout: 5000 });
  await taskRow.getByRole('checkbox').click();
  await page.waitForFunction(async ({ id, title }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mealpha-pro-local', 6);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readonly');
      const request = tx.objectStore('tasks').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record?.status === 'Done' && record?.title && record?.dueDate && record?.priority === 'High'
      && record?.notes === 'Must survive dashboard completion' && record?.reminders?.[0]?.id === 'keep-reminder';
  }, { id: taskId }, { timeout: 5000 }).catch(() => failures.push(`${viewport.name}: dashboard completion erased task fields or reminders`));
  await page.evaluate(async id => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mealpha-pro-local', 6);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      tx.objectStore('tasks').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, taskId);

  // Regression: completing a task from the Tasks table must preserve every user-entered field.
  const listTaskId = `smoke-task-list-${viewport.name}`;
  const listTaskTitle = `Task list persistence ${viewport.name}`;
  await page.evaluate(async ({ id, title, dueDate }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mealpha-pro-local', 6);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      tx.objectStore('tasks').put({
        id, title, status: 'Todo', priority: 'High', dueDate,
        notes: 'Preserve task-list metadata', estimatedMinutes: 75, actualMinutes: 30,
        goalId: 'smoke-linked-goal',
        reminders: [{ id: 'task-list-reminder', at: '2030-02-01T09:30:00.000Z', enabled: true, repeat: 'weekly' }]
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  }, { id: listTaskId, title: listTaskTitle, dueDate: today });
  await page.goto('http://127.0.0.1:8080/tasks', { waitUntil: 'networkidle' });
  const listTaskRow = page.locator('tr').filter({ hasText: listTaskTitle }).first();
  await listTaskRow.waitFor({ timeout: 5000 });
  await listTaskRow.getByRole('checkbox').click();
  await page.waitForFunction(async ({ id, title }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mealpha-pro-local', 6);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readonly');
      const request = tx.objectStore('tasks').get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return record?.status === 'Done' && record?.title === title
      && record?.priority === 'High' && record?.notes === 'Preserve task-list metadata'
      && record?.estimatedMinutes === 75 && record?.actualMinutes === 30
      && record?.goalId === 'smoke-linked-goal'
      && record?.reminders?.[0]?.id === 'task-list-reminder'
      && record?.reminders?.[0]?.repeat === 'weekly';
  }, { id: listTaskId, title: listTaskTitle }, { timeout: 5000 }).catch(() => failures.push(`${viewport.name}: Tasks page completion erased task fields, goal link or reminder settings`));
  await page.evaluate(async id => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mealpha-pro-local', 6);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      tx.objectStore('tasks').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, listTaskId);

  await page.goto('http://127.0.0.1:8080/settings', { waitUntil: 'networkidle' });
  const palettes = [
    { id: 'violet', label: 'بنفش' },
    { id: 'blue', label: 'آبی' },
    { id: 'green', label: 'سبز' },
    { id: 'cyan', label: 'فیروزه‌ای' },
    { id: 'orange', label: 'نارنجی' },
    { id: 'pink', label: 'صورتی' }
  ];
  for (const palette of palettes) {
    const paletteButton = page.getByRole('button', { name: palette.label, exact: true });
    if (!(await paletteButton.count())) {
      failures.push(`${viewport.name}: ${palette.id} accent palette is missing`);
      continue;
    }
    await paletteButton.click();
    const saveSettings = page.getByRole('button', { name: /ذخیره|Save/ }).first();
    await saveSettings.click();
    try {
      await page.waitForFunction(id => document.documentElement.dataset.colorTheme === id, palette.id, { timeout: 5000 });
    } catch {
      failures.push(`${viewport.name}: ${palette.id} accent palette did not persist after save`);
    }
  }
  await page.reload({ waitUntil: 'networkidle' });
  if ((await page.locator('html').getAttribute('data-color-theme')) !== 'pink') {
    failures.push(`${viewport.name}: selected accent palette did not survive reload`);
  }
  const profileName = `Smoke-${viewport.name}`;
  const profileNameInput = page.getByPlaceholder('نام شما');
  if (await profileNameInput.count()) {
    await profileNameInput.fill(profileName);
    const saveProfileButton = page.getByRole('button', { name: 'ذخیره پروفایل' });
    if (await saveProfileButton.count()) {
      await saveProfileButton.click();
      await page.getByText('پروفایل ذخیره و بررسی شد.').waitFor({ timeout: 5000 }).catch(() => undefined);
      await page.reload({ waitUntil: 'networkidle' });
      if ((await page.getByPlaceholder('نام شما').inputValue()) !== profileName) failures.push(`${viewport.name}: profile name did not persist after reload`);
    } else failures.push(`${viewport.name}: dedicated profile save button is missing`);
  } else failures.push(`${viewport.name}: profile name field is missing`);
  if (!(await page.getByText('راهنمای کامل راه‌اندازی Dropbox').count())) failures.push(`${viewport.name}: Dropbox setup guide is missing`);
  const brandImage = page.locator('img[src="/mealpha.svg"]:visible').first();
  if (!(await brandImage.count())) failures.push(`${viewport.name}: visible brand image is missing`);
  else {
    const brandMetrics = await brandImage.evaluate(img => {
      const box = img.getBoundingClientRect();
      return { loaded: img.complete && img.naturalWidth > 0, width: box.width, height: box.height, fit: getComputedStyle(img).objectFit };
    });
    const expectedLogoSize = viewport.width >= 768 ? 56 : 36;
    if (!brandMetrics.loaded || brandMetrics.width < expectedLogoSize - 1 || brandMetrics.height < expectedLogoSize - 1 || brandMetrics.fit !== 'contain') {
      failures.push(`${viewport.name}: brand mark is missing, undersized or cropped ${JSON.stringify(brandMetrics)}`);
    }
  }
  await page.goto('http://127.0.0.1:8080/goals', { waitUntil: 'networkidle' });
  const addMainGoal = page.getByRole('button', { name: 'افزودن هدف اصلی' });
  if (await addMainGoal.count()) {
    await addMainGoal.click();
    const goalDialog = page.getByRole('dialog');
    const parentName = `Smoke Parent ${viewport.name}`;
    const childName = `Smoke Child ${viewport.name}`;
    await goalDialog.locator('input').first().fill(parentName);
    await goalDialog.getByRole('button', { name: 'ذخیره' }).click();
    await page.getByText(parentName, { exact: true }).waitFor({ timeout: 5000 });
    const parentRow = page.locator('tr').filter({ hasText: parentName });
    const addChild = parentRow.locator('[data-testid="add-subgoal"]');
    if (await addChild.count()) {
      await addChild.click();
      const childDialog = page.getByRole('dialog');
      const parentSelect = childDialog.getByRole('combobox').first();
      const selectedParent = (await parentSelect.innerText()).trim();
      console.log(`${viewport.name} subgoal parent selection: ${selectedParent}`);
      if (!selectedParent.includes(parentName)) {
        failures.push(`${viewport.name}: add-subgoal form did not preselect its parent`);
        await parentSelect.click();
        await page.getByRole('option', { name: parentName, exact: true }).click();
      }
      await childDialog.locator('input').first().fill(childName);
      await childDialog.getByRole('button', { name: 'ذخیره' }).click();
      await page.getByText(childName, { exact: true }).waitFor({ timeout: 5000 });
      await page.reload({ waitUntil: 'networkidle' });
      const childRow = page.locator('tr').filter({ hasText: childName });
      const childRowCount = await childRow.count();
      const childRowText = childRowCount ? (await childRow.first().innerText()).replace(/\\s+/g, ' ').trim() : '(missing)';
      const hierarchyLabelCount = childRowCount ? await childRow.getByText(/زیرهدف|Subgoal/, { exact: true }).count() : 0;
      console.log(`${viewport.name} goal hierarchy after reload: rows=${childRowCount}; labels=${hierarchyLabelCount}; row=${childRowText}`);
      if (!childRowCount) failures.push(`${viewport.name}: subgoal record is missing after reload`);
      else if (!hierarchyLabelCount) failures.push(viewport.name + ': child record exists but is not displayed as a subgoal');
      // Regression: qualitative subgoals use checklist items instead of target/current numeric values.
      await page.evaluate(async title => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('mealpha-pro-local', 6);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise((resolve, reject) => {
          const tx = db.transaction('goals', 'readwrite');
          const store = tx.objectStore('goals');
          const request = store.getAll();
          request.onsuccess = () => {
            const record = request.result.find(item => item.title === title);
            if (record) store.put({ ...record, trackingType: 'qualitative', targetValue: 10, currentValue: 3, description: "Legacy checklist item one\nLegacy checklist item two", descriptionItems: undefined });
          };
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      }, childName);
      await page.reload({ waitUntil: 'networkidle' });
      const editableChild = page.locator('tr').filter({ hasText: childName }).first();
      const childRowButtons = editableChild.getByRole('button');
      await childRowButtons.nth(await childRowButtons.count() - 2).click();
      const childEditDialog = page.getByRole('dialog');
      if (await childEditDialog.locator('input[type="number"]').count()) {
        failures.push(viewport.name + ': qualitative goal still shows target/current numeric fields');
      }
      const checklistInputs = childEditDialog.getByPlaceholder('موردی که باید انجام شود');
      if (await checklistInputs.count() !== 2) {
        failures.push(viewport.name + ': legacy child description was not migrated into two checklist items');
      } else {
        await checklistInputs.nth(0).fill('Legacy checklist item one');
        await checklistInputs.nth(1).fill('Legacy checklist item two');
        const checklistToggle = checklistInputs.nth(0).locator('xpath=preceding-sibling::input[@type="checkbox"]');
        if (await checklistToggle.count() !== 1) {
          failures.push(`${viewport.name}: first checklist item's checkbox could not be located`);
        } else {
          await checklistToggle.check();
          if (!(await checklistToggle.isChecked())) failures.push(`${viewport.name}: first checklist checkbox did not become checked before save`);
        }
        await childEditDialog.getByRole('button', { name: 'ذخیره' }).click();
        // Do not reload before the async IndexedDB save finishes; mobile/tablet can be slower.
        await childEditDialog.waitFor({ state: 'hidden', timeout: 10000 });
        await page.reload({ waitUntil: 'networkidle' });
        const checklistState = await page.evaluate(async title => {
          const db = await new Promise((resolve, reject) => {
            const request = indexedDB.open('mealpha-pro-local', 6);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          const records = await new Promise((resolve, reject) => {
            const tx = db.transaction('goals', 'readonly');
            const request = tx.objectStore('goals').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          db.close();
          const matches = records.filter(item => item.title === title).map(record => ({ id: record.id, parentGoalId: record.parentGoalId, trackingType: record.trackingType, description: record.description, items: record.descriptionItems, targetValue: record.targetValue, currentValue: record.currentValue, updatedAt: record.updatedAt }));
          const record = matches[0] ?? null;
          return { selected: record, matches };
        }, childName);
        console.log(`${viewport.name} checklist persistence probe: ${JSON.stringify(checklistState)}`);
        const persistedGoal = checklistState?.selected;
        if (!persistedGoal || persistedGoal.items?.length !== 2 || !persistedGoal.items[0].done || persistedGoal.items[1].done) {
          failures.push(viewport.name + ': child checklist completion did not persist after reload');
        }
        if (persistedGoal?.targetValue !== 10 || persistedGoal?.currentValue !== 3) {
          failures.push(viewport.name + ': hiding qualitative numeric fields unexpectedly changed stored legacy values');
        }
      }
    } else failures.push(`${viewport.name}: add-subgoal control is missing from goal rows`);
  } else failures.push(`${viewport.name}: add-main-goal control is missing`);
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
  const notificationsButton = page.getByRole('button', { name: /اعلان‌ها|Notifications/ });
  if (await notificationsButton.count()) {
    await notificationsButton.click();
    const notificationPanel = page.getByRole('dialog', { name: /مرکز اعلان‌ها|Notification center/ });
    if (!(await notificationPanel.count())) {
      failures.push(`${viewport.name}: notification bell did not open its panel`);
    }
    await page.keyboard.press('Escape');
    await notificationPanel.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => failures.push(`${viewport.name}: Escape did not close notification panel`));
    await notificationsButton.click();
    await notificationPanel.waitFor({ state: 'visible', timeout: 3000 }).catch(() => failures.push(`${viewport.name}: notification panel did not reopen`));
    await page.locator('main').click({ position: { x: 12, y: 12 } });
    await notificationPanel.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => failures.push(`${viewport.name}: outside click did not close notification panel`));
  } else {
    failures.push(`${viewport.name}: notification bell control missing`);
  }
  const profileButton = page.getByRole('button', { name: /پروفایل کاربری|User profile/ });
  if (await profileButton.count()) {
    await profileButton.click();
    const profilePanel = page.getByRole('dialog', { name: /منوی پروفایل|Profile menu/ });
    if (!(await profilePanel.count())) {
      failures.push(`${viewport.name}: profile button did not open its menu`);
    }
    await page.keyboard.press('Escape');
    await profilePanel.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => failures.push(`${viewport.name}: Escape did not close profile panel`));
    await profileButton.click();
    await profilePanel.waitFor({ state: 'visible', timeout: 3000 }).catch(() => failures.push(`${viewport.name}: profile panel did not reopen`));
    const profileLink = page.getByRole('link', { name: /مشاهده و ویرایش پروفایل|View and edit profile/ });
    if (await profileLink.count()) {
      await profileLink.click();
      await page.waitForURL('**/settings');
      const coralAccent = page.getByTestId('accent-theme-coral');
      const violetAccent = page.getByTestId('accent-theme-violet');
      const saveProfile = page.getByTestId('save-profile-settings');
      await coralAccent.waitFor({ state: 'visible', timeout: 10000 });
      await violetAccent.waitFor({ state: 'visible', timeout: 10000 });
      await saveProfile.waitFor({ state: 'visible', timeout: 10000 });
      if (await coralAccent.count() && await violetAccent.count() && await saveProfile.count()) {
        await coralAccent.click();
        await saveProfile.click();
        await page.waitForFunction(() => document.documentElement.dataset.colorTheme === 'coral');
        const coralValue = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
        await violetAccent.click();
        await saveProfile.click();
        await page.waitForFunction(() => document.documentElement.dataset.colorTheme === 'violet');
        const violetValue = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());
        if (coralValue !== '7 88% 63%' || violetValue === coralValue) failures.push(`${viewport.name}: accent themes are not applied independently`);
        await coralAccent.click();
        await saveProfile.click();
        await page.waitForFunction(() => document.documentElement.dataset.colorTheme === 'coral');
      } else {
        failures.push(`${viewport.name}: coral and violet accent options are missing`);
      }
    } else {
      failures.push(`${viewport.name}: profile menu has no working settings link`);
    }
  } else {
    failures.push(`${viewport.name}: profile control missing`);
  }
  if (isMobile) {
    await page.goto('http://127.0.0.1:8080/goals', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const menuButton = page.locator('button[aria-controls="mealpha-mobile-menu"]');
    if (await menuButton.count()) {
      await menuButton.click();
      const menu = page.getByRole('dialog', { name: /مرکز دسترسی|Navigation center/ });
      if (!(await menu.count())) failures.push(`${viewport.name}: hamburger navigation center did not open`);
      else {
        await page.waitForFunction(() => {
          const dialog = document.getElementById('mealpha-mobile-menu');
          return !!dialog && dialog.contains(document.activeElement);
        }, undefined, { timeout: 3000 }).catch(() => failures.push(`${viewport.name}: mobile navigation did not move focus into the drawer`));
        if ((await page.evaluate(() => getComputedStyle(document.body).overflow)) !== 'hidden') {
          failures.push(`${viewport.name}: background page remains scrollable while mobile navigation is open`);
        }
        const expectedModules = [
          /داشبورد|Dashboard/,
          /اهداف|Goals/,
          /کارها|Tasks/,
          /عادت‌ها|Habits/,
          /تمرکز|Focus/,
          /هوش عملکرد|Insights/,
          /تراکنش‌ها|Transactions/,
          /دارایی‌ها|Assets/,
          /بدهی‌ها|Liabilities/,
          /فضای شخصی|My workspace/,
          /تنظیمات|Settings/
        ];
        for (const label of expectedModules) {
          if (!(await menu.getByRole('link', { name: label }).count())) failures.push(`${viewport.name}: mobile navigation destination ${label} is missing`);
        }
        if (viewport.width < 380) {
          const clippedLabels = await menu.locator('a span.min-w-0').evaluateAll(elements =>
            elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.textContent?.trim())
          );
          if (clippedLabels.length) failures.push(`${viewport.name}: narrow mobile navigation labels are clipped ${JSON.stringify(clippedLabels)}`);
        }
        const counters = menu.locator('.grid.grid-cols-3 > div');
        if (await counters.count() !== 3) failures.push(`${viewport.name}: live task/goal/payment counters are missing`);
        const bounds = await menu.evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, viewport: innerHeight, position: getComputedStyle(el).position }; });
        if (bounds.position !== 'fixed' || bounds.top < 0 || bounds.bottom > bounds.viewport + 1 || bounds.height < bounds.viewport - 32) {
          failures.push(`${viewport.name}: navigation drawer is outside the visible viewport ${JSON.stringify(bounds)}`);
        }
        await menu.screenshot({ path: `ui-${viewport.name}-navigation.png` });
        await page.keyboard.press('Shift+Tab');
        if (!(await menu.evaluate(el => el.contains(document.activeElement)))) failures.push(`${viewport.name}: keyboard focus escaped the mobile navigation drawer`);
        await page.keyboard.press('Escape');
        await menu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => failures.push(`${viewport.name}: Escape did not close mobile navigation drawer`));
        if ((await page.evaluate(() => getComputedStyle(document.body).overflow)) === 'hidden') {
          failures.push(`${viewport.name}: background scroll lock was not released after closing navigation`);
        }
        if (!(await menuButton.evaluate(el => el === document.activeElement))) {
          failures.push(`${viewport.name}: focus was not returned to the mobile menu trigger`);
        }
      }
      
    } else failures.push(`${viewport.name}: hamburger menu button missing`);
    await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
    const legacyBottomNav = page.locator('nav[aria-label="ناوبری اصلی"]:visible, nav[aria-label="Primary navigation"]:visible').filter({ has: page.locator('a') });
    if (await legacyBottomNav.count()) failures.push(`${viewport.name}: legacy fixed bottom taskbar is still visible`);
    for (const actionName of [/جستجوی سراسری|Global search/, /اعلان‌ها|Notifications/, /پروفایل کاربری|User profile/]) {
      if (!(await page.getByRole('button', { name: actionName }).isVisible().catch(() => false))) {
        failures.push(`${viewport.name}: mobile header action ${actionName} is not visible`);
      }
    }
    const mobileMainPadding = await page.locator('main').evaluate(el => parseFloat(getComputedStyle(el).paddingBottom));
    if (mobileMainPadding > 48) failures.push(`${viewport.name}: excess bottom spacing remains after removing taskbar (padding=${mobileMainPadding}px)`);
  }
  // Regression: daily checklist and journal both live in Tasks, associated with the selected date.
  await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
  const journalSection = page.locator('summary').filter({ hasText: /یادداشت و چک‌لیست روزانه|Daily notes & checklist/ });
  if (await journalSection.count() && !(await journalSection.evaluate(el => el.parentElement.open))) await journalSection.click();
  const checklistInput = page.getByPlaceholder(/کار جدید برای امروز|Add a task for this day/);
  const journalInput = page.getByPlaceholder(/اتفاقات، افکار یا نکات امروزت را اینجا بنوی|Write down your day, thoughts or notes/);
  const checklistProbe = `Smoke checklist ${viewport.name} ${Date.now()}`;
  const journalProbe = `Smoke journal ${viewport.name} ${Date.now()}`;
  if (await checklistInput.count() && await journalInput.count()) {
    await checklistInput.fill(checklistProbe);
    await page.getByRole('button', { name: /افزودن|Add/ }).last().click();
    await journalInput.fill(journalProbe);
    await page.getByRole('button', { name: /ذخیره یادداشت|Save journal/ }).click();
    await page.waitForFunction(async ({ checklistProbe, journalProbe }) => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('mealpha-pro-local', 6);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const result = await new Promise((resolve, reject) => {
        const tx = db.transaction(['tasks', 'notes', 'customItems', 'localNotes'], 'readonly');
        const tasksRequest = tx.objectStore('tasks').getAll();
        const notesRequest = tx.objectStore('notes').getAll();
        const workspaceRequest = tx.objectStore('customItems').getAll();
        const localNotesRequest = tx.objectStore('localNotes').getAll();
        tx.oncomplete = () => resolve({ tasks: tasksRequest.result, notes: notesRequest.result, workspace: workspaceRequest.result, localNotes: localNotesRequest.result });
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      return result.tasks.some(item => item.title === checklistProbe && item.dailyEntryType === 'checklist' && !!item.dueDate)
        && result.localNotes.some(item => item.content === journalProbe && item.kind === 'daily-journal' && !!item.date)
        && !result.workspace.some(item => item.title === checklistProbe || item.content === journalProbe)
        && !result.notes.some(item => item.notes === journalProbe || item.content === journalProbe);
    }, { checklistProbe, journalProbe }, { timeout: 7000 }).catch(() => failures.push(`${viewport.name}: daily checklist/journal were not persisted in their separate stores`));
    await page.reload({ waitUntil: 'networkidle' });
    const sectionAfterReload = page.locator('summary').filter({ hasText: /یادداشت و چک‌لیست روزانه|Daily notes & checklist/ });
    if (await sectionAfterReload.count() && !(await sectionAfterReload.evaluate(el => el.parentElement.open))) await sectionAfterReload.click();
    if ((await page.getByPlaceholder(/اتفاقات، افکار یا نکات امروزت را اینجا بنوی|Write down your day, thoughts or notes/).inputValue()) !== journalProbe) failures.push(`${viewport.name}: daily journal did not persist after reload`);
    if (!(await page.getByText(checklistProbe, { exact: true }).count())) failures.push(`${viewport.name}: daily checklist did not persist after reload`);
  } else failures.push(`${viewport.name}: daily checklist or journal editor is missing`);
  await page.close();
}
await browser.close();
if (failures.length) {
  console.error('UI smoke test failures:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('UI smoke tests passed: 10 routes at 320px, 390px, 768px and 1440px; no runtime errors or page-level horizontal overflow; language, appearance and accent-color switches verified.');
