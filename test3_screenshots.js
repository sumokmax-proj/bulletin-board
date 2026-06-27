const { chromium } = require('playwright');

const BASE_URL = 'http://16.176.155.181:3000';

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  console.log('Taking all required screenshots with correct language states...\n');

  // CRITICAL DISCOVERY: The app uses IP detection (ipapi.co) to set initial language.
  // Since the server IP is 16.176.155.181 (AWS), ipapi.co detects it as non-Korean
  // and defaults to ENGLISH. The lang button shows "한국어" when in English mode.
  // localStorage key is "board-lang", value "ko" means Korean, other/empty means English.

  // ============================================================
  // Screenshot 1: test_ko_list.png - Korean list page
  // Need to: start in English (default), then toggle to Korean
  // ============================================================
  console.log('1. Taking Korean list screenshot...');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // App starts in English (IP-detected), lang button shows "한국어"
    // Click "한국어" to switch to Korean
    const koBtn = await page.$('#lang-switch');
    const btnText = await koBtn.textContent();
    console.log('  Lang button:', btnText.trim());
    await koBtn.click();
    await page.waitForTimeout(1500);

    const navAfter = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('  Nav after switch:', navAfter);

    await page.screenshot({ path: '/tmp/test_ko_list.png', fullPage: true });
    console.log('  Saved: /tmp/test_ko_list.png');
    await ctx.close();
  }

  // ============================================================
  // Screenshot 2: test_en_list.png - English list page
  // App defaults to English, so just load and take screenshot
  // ============================================================
  console.log('2. Taking English list screenshot...');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const nav = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('  Nav (should be English):', nav);

    await page.screenshot({ path: '/tmp/test_en_list.png', fullPage: true });
    console.log('  Saved: /tmp/test_en_list.png');
    await ctx.close();
  }

  // ============================================================
  // Screenshot 3: test_en_detail.png - English post detail
  // ============================================================
  console.log('3. Taking English detail screenshot...');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Click first post
    const posts = await page.$$('tbody tr td a, table td a');
    console.log('  Found', posts.length, 'post links');
    if (posts.length > 0) {
      const title = await posts[0].textContent();
      console.log('  Clicking:', title.trim());
      await posts[0].click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/tmp/test_en_detail.png', fullPage: true });
    console.log('  Saved: /tmp/test_en_detail.png');
    console.log('  URL:', page.url());
    await ctx.close();
  }

  // ============================================================
  // Screenshot 4: test_ko_detail.png - Korean post detail
  // ============================================================
  console.log('4. Taking Korean detail screenshot...');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Switch to Korean
    const langBtn = await page.$('#lang-switch');
    await langBtn.click();
    await page.waitForTimeout(1000);

    // Click first post
    const posts = await page.$$('tbody tr td a, table td a');
    if (posts.length > 0) {
      await posts[0].click();
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/tmp/test_ko_detail.png', fullPage: true });
    console.log('  Saved: /tmp/test_ko_detail.png');
    console.log('  URL:', page.url());
    await ctx.close();
  }

  // ============================================================
  // Screenshot 5: test_en_write.png - English write form
  // ============================================================
  console.log('5. Taking English write form screenshot...');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/posts/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const nav = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('  Nav:', nav);

    const form = await page.evaluate(() => ({
      labels: Array.from(document.querySelectorAll('label')).map(l => l.textContent.trim()),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent.trim()),
    }));
    console.log('  Form content:', JSON.stringify(form));

    await page.screenshot({ path: '/tmp/test_en_write.png', fullPage: true });
    console.log('  Saved: /tmp/test_en_write.png');
    await ctx.close();
  }

  // ============================================================
  // EXTRA: Korean write form for comparison
  // ============================================================
  console.log('6. Getting Korean write form content for comparison...');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Switch to Korean
    const langBtn = await page.$('#lang-switch');
    await langBtn.click();
    await page.waitForTimeout(500);

    // Navigate to write form
    await page.goto(`${BASE_URL}/posts/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const form = await page.evaluate(() => ({
      labels: Array.from(document.querySelectorAll('label')).map(l => l.textContent.trim()),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent.trim()),
      nav: Array.from(document.querySelectorAll('nav a, nav button, header a, header button')).map(el => el.textContent.trim()),
    }));
    console.log('  Korean write form:', JSON.stringify(form));
    await ctx.close();
  }

  // ============================================================
  // EXTRA: Check localStorage behavior in detail
  // ============================================================
  console.log('\n7. Testing localStorage persistence in detail...');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    // Visit home
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const ls1 = await page.evaluate(() => JSON.stringify(Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i))])
    )));
    console.log('  localStorage on fresh English visit:', ls1);

    // Toggle to Korean
    const btn = await page.$('#lang-switch');
    await btn.click();
    await page.waitForTimeout(500);

    const ls2 = await page.evaluate(() => JSON.stringify(Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i))])
    )));
    console.log('  localStorage after switching to Korean:', ls2);

    // Navigate to another page
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const ls3 = await page.evaluate(() => JSON.stringify(Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i))])
    )));
    const navAfterReload = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('  localStorage after navigation:', ls3);
    console.log('  Nav after navigation:', navAfterReload);

    // Toggle back to English
    const btn2 = await page.$('#lang-switch');
    const btn2Text = await btn2.textContent();
    console.log('  Lang button text after navigation:', btn2Text.trim());
    await btn2.click();
    await page.waitForTimeout(500);

    const ls4 = await page.evaluate(() => JSON.stringify(Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i))])
    )));
    const navEn = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('  localStorage after switching back to English:', ls4);
    console.log('  Nav in English:', navEn);

    // Navigate again - should persist English
    await page.goto(`${BASE_URL}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const ls5 = await page.evaluate(() => JSON.stringify(Object.fromEntries(
      Array.from({ length: localStorage.length }, (_, i) => [localStorage.key(i), localStorage.getItem(localStorage.key(i))])
    )));
    const navPersist = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('  localStorage after reload in English:', ls5);
    console.log('  Nav after reload in English:', navPersist);

    await ctx.close();
  }

  await browser.close();
  console.log('\nDone!');
}

run().catch(e => console.error('FATAL:', e));
