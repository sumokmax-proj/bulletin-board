const { chromium } = require('playwright');

const BASE_URL = 'http://16.176.155.181:3000';

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  console.log('\n====== DETAILED INVESTIGATION TESTS ======\n');

  // ============================================================
  // INVESTIGATE: Why does a fresh context start in English?
  // ============================================================
  console.log('--- INVESTIGATION: Fresh context default language ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const ls = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    console.log('Fresh context localStorage:', JSON.stringify(ls));

    const navText = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0);
    });
    console.log('Fresh context nav:', JSON.stringify(navText));

    // What does the lang button say?
    const langBtn = await page.$('#lang-switch, [id*="lang"], button[onclick*="lang"], button[class*="lang"]');
    if (langBtn) {
      const btnText = await langBtn.textContent();
      console.log('Lang button text:', btnText.trim());
      const btnId = await langBtn.getAttribute('id');
      const btnClass = await langBtn.getAttribute('class');
      console.log('Lang button id:', btnId, 'class:', btnClass);
    }

    // Check what h1 says
    const h1 = await page.$('h1');
    if (h1) console.log('H1 text:', await h1.textContent());

    // Get cookies
    const cookies = await ctx.cookies();
    console.log('Cookies:', JSON.stringify(cookies));

    // Check for IP detection that may be setting language
    const htmlLang = await page.getAttribute('html', 'lang');
    console.log('HTML lang attribute:', htmlLang);

    // Check the actual page source for language detection logic
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    });
    console.log('Script sources:', JSON.stringify(scripts));

    await ctx.close();
  }

  // ============================================================
  // INVESTIGATE: Write form /posts/new language behavior
  // ============================================================
  console.log('\n--- INVESTIGATION: Write form /posts/new ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    // First go to home and check language
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const navHome = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('Home nav (fresh ctx):', JSON.stringify(navHome));

    // Determine if we're in Korean or English
    const isKorean = navHome.some(t => t.includes('홈'));
    console.log('Is Korean mode:', isKorean);

    // Navigate to write form directly
    await page.goto(`${BASE_URL}/posts/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const navWrite = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('Write form nav:', JSON.stringify(navWrite));

    const writeFormContent = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label')).map(l => l.textContent.trim());
      const inputs = Array.from(document.querySelectorAll('input[placeholder], textarea[placeholder]'))
        .map(i => ({ type: i.type, ph: i.placeholder }));
      const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
      const h = Array.from(document.querySelectorAll('h1,h2,h3')).map(e => e.textContent.trim());
      return { labels, inputs, btns, h };
    });
    console.log('Write form content:', JSON.stringify(writeFormContent, null, 2));

    await ctx.close();
  }

  // ============================================================
  // INVESTIGATE: Proper Korean start, then navigate to write form
  // ============================================================
  console.log('\n--- INVESTIGATION: Korean session -> write form ---');
  {
    // Use a context that forces no stored language to see real default
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      // Clear all storage
    });
    const page = await ctx.newPage();

    // Clear localStorage before visiting
    await page.goto('about:blank');
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const navInitial = await page.evaluate(() =>
      Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
        .map(el => el.textContent.trim()).filter(t => t.length > 0));
    console.log('Initial nav:', JSON.stringify(navInitial));

    const ls = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    console.log('Initial localStorage:', JSON.stringify(ls));

    // Check if EN button exists or 한국어 button
    const allBtns = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map(b => ({
        text: b.textContent.trim(),
        id: b.id,
        onclick: b.getAttribute('onclick') || ''
      })));
    console.log('All buttons:', JSON.stringify(allBtns));

    // Find the language toggle button
    const langBtn = await page.$('#lang-switch');
    if (langBtn) {
      const langBtnText = await langBtn.textContent();
      console.log('Language toggle button:', langBtnText.trim());

      // If it says EN, we're currently in Korean
      if (langBtnText.trim() === 'EN') {
        console.log('Currently in KOREAN mode');
        // Click to switch to English
        await langBtn.click();
        await page.waitForTimeout(1000);

        const navEn = await page.evaluate(() =>
          Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
            .map(el => el.textContent.trim()).filter(t => t.length > 0));
        console.log('Nav after EN toggle:', JSON.stringify(navEn));

        const lsAfterToggle = await page.evaluate(() => {
          const data = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
          }
          return data;
        });
        console.log('localStorage after toggle:', JSON.stringify(lsAfterToggle));

        // Navigate to write form in English
        await page.goto(`${BASE_URL}/posts/new`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1500);

        const writeNavEn = await page.evaluate(() =>
          Array.from(document.querySelectorAll('nav a, nav button, header a, header button'))
            .map(el => el.textContent.trim()).filter(t => t.length > 0));
        console.log('Write form nav in English:', JSON.stringify(writeNavEn));

        const writeFormEn = await page.evaluate(() => ({
          labels: Array.from(document.querySelectorAll('label')).map(l => l.textContent.trim()),
          placeholders: Array.from(document.querySelectorAll('[placeholder]')).map(e => e.placeholder),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
          headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent.trim()),
          pageText: document.body.innerText.substring(0, 500)
        }));
        console.log('Write form in English:', JSON.stringify(writeFormEn, null, 2));
      } else if (langBtnText.trim().includes('한국어')) {
        console.log('Currently in ENGLISH mode');
        // Navigate to write form while in English (already in English)
        await page.goto(`${BASE_URL}/posts/new`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1500);

        const writeFormEn = await page.evaluate(() => ({
          labels: Array.from(document.querySelectorAll('label')).map(l => l.textContent.trim()),
          placeholders: Array.from(document.querySelectorAll('[placeholder]')).map(e => e.placeholder),
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
          headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent.trim()),
          pageText: document.body.innerText.substring(0, 500)
        }));
        console.log('Write form in English:', JSON.stringify(writeFormEn, null, 2));
      }
    }

    await ctx.close();
  }

  // ============================================================
  // INVESTIGATE: Korean write form when actually in Korean
  // ============================================================
  console.log('\n--- INVESTIGATION: Korean write form properly ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const langBtn = await page.$('#lang-switch');
    let inKorean = false;
    if (langBtn) {
      const t = await langBtn.textContent();
      inKorean = t.trim() === 'EN';
      console.log('Language button:', t.trim(), '=> currently', inKorean ? 'Korean' : 'English');
    }

    if (!inKorean) {
      // Switch to Korean first
      const koBtn = await page.$('button:has-text("한국어")');
      if (koBtn) {
        await koBtn.click();
        await page.waitForTimeout(1000);
        console.log('Switched to Korean');
      }
    }

    // Navigate to write form in Korean
    await page.goto(`${BASE_URL}/posts/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const writeFormKo = await page.evaluate(() => ({
      labels: Array.from(document.querySelectorAll('label')).map(l => l.textContent.trim()),
      placeholders: Array.from(document.querySelectorAll('[placeholder]')).map(e => e.placeholder),
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.textContent.trim()),
      nav: Array.from(document.querySelectorAll('nav a, nav button, header a, header button')).map(el => el.textContent.trim()),
      pageText: document.body.innerText.substring(0, 600)
    }));
    console.log('Write form in Korean:', JSON.stringify(writeFormKo, null, 2));

    await ctx.close();
  }

  // ============================================================
  // INVESTIGATE: Detail page - Back button text and "Edit" button
  // ============================================================
  console.log('\n--- INVESTIGATION: Detail page buttons in Korean ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Check if Korean
    const langBtn = await page.$('#lang-switch');
    let inKorean = false;
    if (langBtn) {
      const t = await langBtn.textContent();
      inKorean = t.trim() === 'EN';
    }

    if (!inKorean) {
      const koBtn = await page.$('button:has-text("한국어")');
      if (koBtn) { await koBtn.click(); await page.waitForTimeout(500); }
    }

    // Click first post
    const posts = await page.$$('tbody tr td a, table td a');
    if (posts.length > 0) {
      await posts[0].click();
      await page.waitForTimeout(2000);

      const detailKo = await page.evaluate(() => ({
        nav: Array.from(document.querySelectorAll('nav a, nav button, header a, header button')).map(el => el.textContent.trim()),
        buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
        links: Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim()).filter(t => t.length > 0),
        headings: Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h => ({ tag: h.tagName, text: h.textContent.trim() })),
        labels: Array.from(document.querySelectorAll('label')).map(l => l.textContent.trim()),
        placeholders: Array.from(document.querySelectorAll('[placeholder]')).map(e => e.placeholder),
        pageText: document.body.innerText.substring(0, 500)
      }));
      console.log('Korean detail page:', JSON.stringify(detailKo, null, 2));
    }

    await ctx.close();
  }

  // ============================================================
  // INVESTIGATE: How is language determined initially? (IP detection)
  // ============================================================
  console.log('\n--- INVESTIGATION: Language detection mechanism ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();

    // Intercept requests to ipapi.co
    const ipapiRequests = [];
    page.on('request', req => {
      if (req.url().includes('ipapi')) {
        ipapiRequests.push(req.url());
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('ipapi requests:', ipapiRequests);

    // Get inline scripts to understand language detection
    const inlineScripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script:not([src])')).map(s => s.textContent.substring(0, 500));
    });
    console.log('Inline script snippets:');
    inlineScripts.forEach((s, i) => {
      if (s.includes('lang') || s.includes('language') || s.includes('ipapi') || s.includes('localStorage')) {
        console.log(`Script ${i}: ${s.substring(0, 300)}`);
      }
    });

    // Get external scripts relevant to language
    const scripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script[src]')).map(s => s.src));
    console.log('External scripts:', scripts);

    await ctx.close();
  }

  // ============================================================
  // TEST: Proper sequence - Korean, then toggle to English via localStorage
  // ============================================================
  console.log('\n--- TEST: localStorage persistence check ---');
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Check initial state
    const initialLs = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    console.log('Initial localStorage:', JSON.stringify(initialLs));

    // Check button and toggle
    const langBtn = await page.$('#lang-switch');
    if (langBtn) {
      const btnText = await langBtn.textContent();
      console.log('Lang button before:', btnText.trim());

      await langBtn.click();
      await page.waitForTimeout(1000);

      const afterLs = await page.evaluate(() => {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }
        return data;
      });
      console.log('localStorage after toggle:', JSON.stringify(afterLs));

      const afterBtn = await page.$('#lang-switch');
      if (afterBtn) {
        const afterBtnText = await afterBtn.textContent();
        console.log('Lang button after toggle:', afterBtnText.trim());
      }
    }

    await ctx.close();
  }

  await browser.close();
  console.log('\n====== INVESTIGATION COMPLETE ======\n');
}

run().catch(e => console.error('FATAL:', e));
