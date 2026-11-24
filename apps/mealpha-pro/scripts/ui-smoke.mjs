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

const conversionPage = await browser.newPage();
await conversionPage.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
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
      for (const label of ['Life Score', 'Alpha Intelligence']) {
        if (!(await page.getByText(label, { exact: true }).count())) failures.push(`${viewport.name} dashboard: missing ${label}`);
      }
      if (!(await page.getByText(/Consistency Engine/).count())) failures.push(`${viewport.name} dashboard: missing Consistency Engine`);
    }
    if (route === '/focus' && !(await page.getByRole('button', { name: /افزودن جلسه|Add session/ }).count())) {
      failures.push(`${viewport.name} focus: manual session control missing`);
    }
    if (route === '/habits') {
      const smokeHabitId = `smoke-calendar-${viewport.name}`;
      await page.evaluate(async id => {
        const db = await new Promise((resolve, reject) => {
          const request = indexedDB.open('mealpha-pro-local', 3);
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
          const request = indexedDB.open('mealpha-pro-local', 3);
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
      const request = indexedDB.open('mealpha-pro-local', 3);
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
  const taskRow = page.locator('li').filter({ hasText: taskTitle }).first();
  await taskRow.waitFor({ timeout: 5000 });
  await taskRow.getByRole('checkbox').click();
  await page.waitForFunction(async ({ id, title }) => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('mealpha-pro-local', 3);
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
      const request = indexedDB.open('mealpha-pro-local', 3);
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
      const request = indexedDB.open('mealpha-pro-local', 3);
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
      const request = indexedDB.open('mealpha-pro-local', 3);
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
      const request = indexedDB.open('mealpha-pro-local', 3);
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
  const brandImage = page.locator('img[src="/mealpha.svg"]').first();
  if (!(await brandImage.count()) || !(await brandImage.evaluate(img => img.complete && img.naturalWidth > 0))) failures.push(`${viewport.name}: purple-gold brand image failed to load`);
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
          const request = indexedDB.open('mealpha-pro-local', 3);
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
            const request = indexedDB.open('mealpha-pro-local', 3);
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
    if (!(await page.getByRole('dialog', { name: /مرکز اعلان‌ها|Notification center/ }).count())) {
      failures.push(`${viewport.name}: notification bell did not open its panel`);
    }
    await page.getByRole('button', { name: /بستن اعلان‌ها|Close notifications/ }).click();
  } else {
    failures.push(`${viewport.name}: notification bell control missing`);
  }
  const profileButton = page.getByRole('button', { name: /پروفایل کاربری|User profile/ });
  if (await profileButton.count()) {
    await profileButton.click();
    if (!(await page.getByRole('dialog', { name: /منوی پروفایل|Profile menu/ }).count())) {
      failures.push(`${viewport.name}: profile button did not open its menu`);
    }
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
    const menuButton = page.getByRole('button', { name: /بازکردن منو|Open menu/ });
    if (await menuButton.count()) {
      await menuButton.click();
      const menu = page.getByRole('dialog', { name: /منوی اصلی|Main menu/ });
      if (!(await menu.count())) failures.push(`${viewport.name}: hamburger menu did not open`);
      else {
        const bounds = await menu.evaluate(el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height, viewport: innerHeight, position: getComputedStyle(el).position }; });
        if (bounds.position !== 'fixed' || bounds.top < 60 || bounds.bottom > bounds.viewport + 1 || bounds.height < 40) {
          failures.push(`${viewport.name}: scrolled hamburger menu is outside the visible viewport ${JSON.stringify(bounds)}`);
        }
        await menuButton.click();
      }
    } else failures.push(`${viewport.name}: hamburger menu button missing`);
    await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
    const bottomNav = page.locator('nav[aria-label="ناوبری اصلی"]');
    if (!(await bottomNav.count())) failures.push(`${viewport.name}: mobile bottom navigation missing`);
    else {
      const layout = await bottomNav.evaluate(el => {
        const nav = el.getBoundingClientRect();
        const links = [...el.querySelectorAll('a')].map(a => {
          const r = a.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, width: r.width };
        });
        return { navTop: nav.top, navBottom: nav.bottom, viewportHeight: innerHeight, links };
      });
      if (layout.links.length !== 5 || layout.links.some(link => link.width < 42)) {
        failures.push(`${viewport.name}: mobile navigation items are missing or too narrow ${JSON.stringify(layout)}`);
      }
      if (layout.links.length && Math.max(...layout.links.map(link => link.top)) - Math.min(...layout.links.map(link => link.top)) > 3) {
        failures.push(`${viewport.name}: mobile navigation items are stacked instead of aligned in one row ${JSON.stringify(layout)}`);
      }
      if (layout.navBottom < layout.viewportHeight - 2 || layout.navTop < layout.viewportHeight - 130) {
        failures.push(`${viewport.name}: mobile navigation is not anchored to the bottom safe area ${JSON.stringify(layout)}`);
      }
    }
  }
  await page.close();
}
await browser.close();
if (failures.length) {
  console.error('UI smoke test failures:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('UI smoke tests passed: 10 routes at 320px, 390px, 768px and 1440px; no runtime errors or page-level horizontal overflow; language, appearance and accent-color switches verified.');
