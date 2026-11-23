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
  // Search dialog: keyboard dismissal, focus restoration, focus trap and outside click.
  const searchTrigger = page.getByRole('button', { name: /جستجوی سراسری|Global search/ });
  if (!(await searchTrigger.count())) failures.push(`${viewport.name}: global search trigger missing`);
  else {
    await searchTrigger.click();
    const searchDialog = page.getByRole('dialog', { name: /جستجوی سراسری|Global search/ });
    await searchDialog.waitFor({ state: 'visible' });
    const searchInput = searchDialog.getByRole('textbox', { name: /عبارت جستجو|Search query/ });
    if (!(await searchInput.evaluate(el => document.activeElement === el))) failures.push(`${viewport.name}: search input did not receive focus`);
    await searchInput.press('Shift+Tab');
    const closeSearch = searchDialog.getByRole('button', { name: /بستن|Close/ });
    if (!(await closeSearch.evaluate(el => document.activeElement === el))) failures.push(`${viewport.name}: search focus trap did not wrap backwards`);
    await page.keyboard.press('Tab');
    if (!(await searchInput.evaluate(el => document.activeElement === el))) failures.push(`${viewport.name}: search focus trap did not wrap forwards`);
    await page.keyboard.press('Escape');
    await searchDialog.waitFor({ state: 'hidden' });
    if (!(await searchTrigger.evaluate(el => document.activeElement === el))) failures.push(`${viewport.name}: closing search did not restore trigger focus`);
    await searchTrigger.click();
    await page.locator('[role="presentation"]').click({ position: { x: 4, y: 4 } });
    await searchDialog.waitFor({ state: 'hidden' });
  }

  if (viewport.name === 'desktop') {
    // Seed deterministic weekly habit history: three completed prior weeks, two logs per week.
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('mealpha-pro-local', 3);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const today = new Date();
      const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const tx = db.transaction(['habits', 'habitLogs'], 'readwrite');
      tx.objectStore('habits').put({ id: 'smoke-weekly-habit', name: 'Weekly streak smoke', frequency: 'Weekly', targetPerPeriod: 2, archived: false });
      tx.objectStore('habits').put({ id: 'smoke-archived-habit', name: 'Archived habit smoke', frequency: 'Daily', targetPerPeriod: 1, archived: true });
      for (let week = 1; week <= 3; week++) {
        for (const day of [0, 2]) {
          const date = new Date(monday);
          date.setDate(date.getDate() - week * 7 + day);
          tx.objectStore('habitLogs').put({ id: `smoke-weekly-${week}-${day}`, habitId: 'smoke-weekly-habit', date: iso(date) });
        }
      }
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
      db.close();
    });
    await page.goto('http://127.0.0.1:8080/habits', { waitUntil: 'networkidle' });
    const weeklyCard = page.getByTestId('habit-card-smoke-weekly');
    await weeklyCard.waitFor({ state: 'visible', timeout: 10000 });
    const currentStreak = await weeklyCard.getByTestId('habit-current-streak').innerText();
    const bestStreak = await weeklyCard.getByTestId('habit-best-streak').innerText();
    if (!/[3۳]/.test(currentStreak)) failures.push(`weekly habit streak should count completed weeks, got ${currentStreak}`);
    if (!/[3۳]/.test(bestStreak)) failures.push(`weekly habit best streak should count completed weeks, got ${bestStreak}`);
    const archivedCard = page.getByTestId('habit-card-smoke-archived');
    await archivedCard.waitFor({ state: 'visible', timeout: 10000 });
    if (!(await archivedCard.getByTestId('habit-toggle').isDisabled())) failures.push('archived habit can still be logged from its primary toggle');
    const archivedCalendarButtons = archivedCard.locator('button[title]');
    if (await archivedCalendarButtons.count()) {
      const enabledArchivedDates = await archivedCalendarButtons.evaluateAll(buttons => buttons.some(button => !button.disabled));
      if (enabledArchivedDates) failures.push('archived habit calendar still allows editing historical dates');
    }
    await page.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('mealpha-pro-local', 3);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(['habits', 'habitLogs'], 'readwrite');
      tx.objectStore('habits').delete('smoke-weekly-habit');
      tx.objectStore('habits').delete('smoke-archived-habit');
      const logs = tx.objectStore('habitLogs');
      for (let week = 1; week <= 3; week++) for (const day of [0, 2]) logs.delete(`smoke-weekly-${week}-${day}`);
      await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
      db.close();
    });
  }
  await page.close();
}
await browser.close();
if (failures.length) {
  console.error('UI smoke test failures:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('UI smoke tests passed: 10 routes at 320px, 390px, 768px and 1440px; no runtime errors or page-level horizontal overflow; language and theme switches verified.');
