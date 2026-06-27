const { chromium } = require('playwright');

const BASE_URL = 'http://16.176.155.181:3000';
const RESULTS = [];
const ISSUES = [];

function log(msg) {
  console.log(msg);
  RESULTS.push(msg);
}

function issue(msg) {
  console.log(`[ISSUE] ${msg}`);
  ISSUES.push(msg);
}

function pass(msg) {
  console.log(`[PASS] ${msg}`);
  RESULTS.push(`[PASS] ${msg}`);
}

function fail(msg) {
  console.log(`[FAIL] ${msg}`);
  ISSUES.push(`[FAIL] ${msg}`);
}

async function checkElement(page, selector, description) {
  try {
    const el = await page.$(selector);
    if (el) {
      const text = await el.textContent();
      pass(`${description}: found (text: "${text.trim()}")`);
      return { found: true, text: text.trim() };
    } else {
      fail(`${description}: NOT FOUND (selector: ${selector})`);
      return { found: false, text: null };
    }
  } catch (e) {
    fail(`${description}: ERROR - ${e.message}`);
    return { found: false, text: null };
  }
}

async function checkText(page, text, description) {
  try {
    const content = await page.content();
    if (content.includes(text)) {
      pass(`${description}: text "${text}" found in page`);
      return true;
    } else {
      fail(`${description}: text "${text}" NOT found in page`);
      return false;
    }
  } catch (e) {
    fail(`${description}: ERROR - ${e.message}`);
    return false;
  }
}

async function getConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

async function run() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  log('='.repeat(60));
  log('BULLETIN BOARD BILINGUAL TEST SUITE');
  log('='.repeat(60));
  log(`Target: ${BASE_URL}`);
  log(`Date: ${new Date().toISOString()}`);
  log('');

  // ============================================================
  // TEST 1: Initial Page Load (Korean default)
  // ============================================================
  log('\n--- TEST 1: Initial Page Load (Korean Default) ---');

  const ctx1 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR'
  });
  const page1 = await ctx1.newPage();
  const jsErrors1 = [];
  page1.on('console', msg => { if (msg.type() === 'error') jsErrors1.push(msg.text()); });
  page1.on('pageerror', err => jsErrors1.push(`PAGE ERROR: ${err.message}`));

  try {
    await page1.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page1.waitForTimeout(2000);

    await page1.screenshot({ path: '/tmp/test_ko_list.png', fullPage: true });
    pass('Screenshot saved: /tmp/test_ko_list.png');

    // Check Korean elements
    const pageTitle = await page1.title();
    log(`Page title: "${pageTitle}"`);

    // Check heading
    const h1 = await page1.$('h1');
    if (h1) {
      const h1Text = await h1.textContent();
      log(`H1 text: "${h1Text.trim()}"`);
      if (h1Text.includes('게시판')) {
        pass('H1 shows Korean "게시판"');
      } else {
        fail(`H1 shows "${h1Text.trim()}" instead of "게시판"`);
      }
    } else {
      // try other headings
      const heading = await page1.$('[class*="title"], [class*="heading"], h2, h3');
      if (heading) {
        const hText = await heading.textContent();
        log(`Heading text: "${hText.trim()}"`);
      } else {
        fail('No heading found on page');
      }
    }

    // Check nav items in Korean
    const navText = await page1.evaluate(() => {
      const navs = document.querySelectorAll('nav a, nav button, header a, header button');
      return Array.from(navs).map(el => el.textContent.trim()).filter(t => t.length > 0);
    });
    log(`Nav items: ${JSON.stringify(navText)}`);

    if (navText.some(t => t.includes('홈'))) pass('Nav shows Korean "홈"');
    else fail('Nav does NOT show Korean "홈"');

    if (navText.some(t => t.includes('API 문서') || t.includes('API문서'))) pass('Nav shows Korean "API 문서"');
    else fail('Nav does NOT show Korean "API 문서"');

    if (navText.some(t => t.includes('글쓰기'))) pass('Nav shows Korean "+ 글쓰기"');
    else fail('Nav does NOT show Korean "+ 글쓰기"');

    if (navText.some(t => t === 'EN' || t.includes('EN'))) pass('Language button shows "EN"');
    else fail(`Language button NOT showing "EN" - nav items: ${JSON.stringify(navText)}`);

    // Check table headers in Korean
    const tableHeaders = await page1.evaluate(() => {
      const ths = document.querySelectorAll('th, thead td');
      return Array.from(ths).map(th => th.textContent.trim());
    });
    log(`Table headers: ${JSON.stringify(tableHeaders)}`);

    // Check for posts in table
    const rows = await page1.evaluate(() => {
      const trs = document.querySelectorAll('tbody tr, [class*="row"]');
      return trs.length;
    });
    log(`Table rows (posts): ${rows}`);

    // JS errors
    if (jsErrors1.length > 0) {
      fail(`JavaScript errors on Korean list page: ${jsErrors1.join('; ')}`);
    } else {
      pass('No JavaScript errors on Korean list page');
    }

  } catch (e) {
    fail(`Test 1 failed: ${e.message}`);
  }

  await ctx1.close();

  // ============================================================
  // TEST 2: Language Toggle to English
  // ============================================================
  log('\n--- TEST 2: Language Toggle to English ---');

  const ctx2 = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page2 = await ctx2.newPage();
  const jsErrors2 = [];
  page2.on('console', msg => { if (msg.type() === 'error') jsErrors2.push(msg.text()); });
  page2.on('pageerror', err => jsErrors2.push(`PAGE ERROR: ${err.message}`));

  try {
    await page2.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page2.waitForTimeout(1500);

    // Find and click EN button
    const enButton = await page2.$('button:has-text("EN"), a:has-text("EN"), [data-lang="en"]');
    if (enButton) {
      await enButton.click();
      await page2.waitForTimeout(1500);
      pass('Clicked EN language button');
    } else {
      // Try finding by text content more broadly
      const allButtons = await page2.evaluate(() => {
        const buttons = document.querySelectorAll('button, a[role="button"]');
        return Array.from(buttons).map(b => ({ text: b.textContent.trim(), id: b.id, class: b.className }));
      });
      log(`All buttons: ${JSON.stringify(allButtons)}`);
      fail('Could not find EN button');
    }

    await page2.screenshot({ path: '/tmp/test_en_list.png', fullPage: true });
    pass('Screenshot saved: /tmp/test_en_list.png');

    // Check English elements
    const navTextEn = await page2.evaluate(() => {
      const navs = document.querySelectorAll('nav a, nav button, header a, header button');
      return Array.from(navs).map(el => el.textContent.trim()).filter(t => t.length > 0);
    });
    log(`Nav items after EN toggle: ${JSON.stringify(navTextEn)}`);

    if (navTextEn.some(t => t === 'Home' || t.includes('Home'))) pass('Nav shows English "Home"');
    else fail(`Nav does NOT show "Home" - items: ${JSON.stringify(navTextEn)}`);

    if (navTextEn.some(t => t.includes('API Docs') || t.includes('API docs'))) pass('Nav shows English "API Docs"');
    else fail(`Nav does NOT show "API Docs" - items: ${JSON.stringify(navTextEn)}`);

    if (navTextEn.some(t => t.includes('Write'))) pass('Nav shows English "+ Write"');
    else fail(`Nav does NOT show "+ Write" - items: ${JSON.stringify(navTextEn)}`);

    if (navTextEn.some(t => t.includes('한국어') || t.includes('KO'))) pass('Language button shows "한국어" or "KO"');
    else fail(`Language button NOT showing "한국어" or "KO" - items: ${JSON.stringify(navTextEn)}`);

    // Check heading in English
    const h1En = await page2.$('h1');
    if (h1En) {
      const h1Text = await h1En.textContent();
      log(`H1 in English mode: "${h1Text.trim()}"`);
      if (h1Text.includes('Board') && !h1Text.includes('게시판')) pass('H1 shows English "Board"');
      else fail(`H1 shows "${h1Text.trim()}" - expected "Board"`);
    }

    // Check table headers in English
    const tableHeadersEn = await page2.evaluate(() => {
      const ths = document.querySelectorAll('th, thead td');
      return Array.from(ths).map(th => th.textContent.trim());
    });
    log(`Table headers in English: ${JSON.stringify(tableHeadersEn)}`);

    const expectedHeaders = ['#', 'Title', 'Author', 'Views', 'Date'];
    for (const h of expectedHeaders) {
      if (tableHeadersEn.some(th => th === h || th.includes(h))) pass(`Table header "${h}" found`);
      else fail(`Table header "${h}" NOT found in: ${JSON.stringify(tableHeadersEn)}`);
    }

    // Check localStorage
    const lsLang = await page2.evaluate(() => localStorage.getItem('language') || localStorage.getItem('lang') || localStorage.getItem('locale') || 'NOT FOUND');
    log(`localStorage language key: "${lsLang}"`);

    // JS errors
    if (jsErrors2.length > 0) {
      fail(`JavaScript errors after EN toggle: ${jsErrors2.join('; ')}`);
    } else {
      pass('No JavaScript errors after EN toggle');
    }

  } catch (e) {
    fail(`Test 2 failed: ${e.message}`);
  }

  // ============================================================
  // TEST 3: Navigate to Post Detail in English
  // ============================================================
  log('\n--- TEST 3: Post Detail Page in English ---');

  try {
    // Find a post link and click it
    const postLinks = await page2.$$('tbody tr td a, [class*="title"] a, table a');
    log(`Found ${postLinks.length} post links`);

    if (postLinks.length > 0) {
      const firstPostText = await postLinks[0].textContent();
      log(`Clicking first post: "${firstPostText.trim()}"`);
      await postLinks[0].click();
      await page2.waitForTimeout(2000);

      await page2.screenshot({ path: '/tmp/test_en_detail.png', fullPage: true });
      pass('Screenshot saved: /tmp/test_en_detail.png');

      const detailUrl = page2.url();
      log(`Detail page URL: ${detailUrl}`);

      // Check for "← Back" button
      const backBtn = await page2.$('a:has-text("Back"), button:has-text("Back"), a:has-text("←"), [href="/"], [href*="back"]');
      if (backBtn) {
        const backText = await backBtn.textContent();
        pass(`Back button found: "${backText.trim()}"`);
      } else {
        // Search more broadly
        const allLinks = await page2.evaluate(() => {
          return Array.from(document.querySelectorAll('a, button')).map(el => el.textContent.trim()).filter(t => t.length > 0 && t.length < 50);
        });
        log(`All links/buttons on detail page: ${JSON.stringify(allLinks)}`);
        fail('Back button NOT found');
      }

      // Check Edit button
      const editBtn = await page2.$('button:has-text("Edit"), a:has-text("Edit"), [class*="edit"]');
      if (editBtn) {
        const editText = await editBtn.textContent();
        pass(`Edit button found: "${editText.trim()}"`);
      } else {
        fail('Edit button NOT found in English detail page');
      }

      // Check Delete button
      const deleteBtn = await page2.$('button:has-text("Delete"), a:has-text("Delete"), [class*="delete"]');
      if (deleteBtn) {
        const deleteText = await deleteBtn.textContent();
        pass(`Delete button found: "${deleteText.trim()}"`);
      } else {
        fail('Delete button NOT found in English detail page');
      }

      // Check Comments heading
      const commentsHeading = await page2.evaluate(() => {
        const allHeadings = document.querySelectorAll('h1, h2, h3, h4, [class*="heading"], [class*="title"]');
        return Array.from(allHeadings).map(h => h.textContent.trim());
      });
      log(`All headings on detail page: ${JSON.stringify(commentsHeading)}`);

      const hasCommentsHeading = commentsHeading.some(h => h.includes('Comment'));
      if (hasCommentsHeading) pass('Comments heading found in English');
      else fail(`Comments heading NOT found - headings: ${JSON.stringify(commentsHeading)}`);

      // Check comment count format (N Comments)
      const pageText = await page2.evaluate(() => document.body.innerText);
      const commentMatch = pageText.match(/(\d+)\s*[Cc]omments?/);
      if (commentMatch) {
        pass(`Comment count format found: "${commentMatch[0]}"`);
      } else {
        const commentMatchKo = pageText.match(/댓글\s*\d+개/);
        if (commentMatchKo) {
          fail(`Comment count still in Korean: "${commentMatchKo[0]}" - not translated to English`);
        } else {
          fail('Comment count heading format not found (neither English nor Korean)');
        }
      }

      // Check "Write a Comment" section
      const writeCommentSection = await page2.evaluate(() => document.body.innerText);
      if (writeCommentSection.includes('Write a Comment') || writeCommentSection.includes('Write Comment')) {
        pass('"Write a Comment" section found in English');
      } else if (writeCommentSection.includes('댓글 작성') || writeCommentSection.includes('댓글을 작성')) {
        fail('"Write a Comment" section still in Korean - not translated');
      } else {
        fail('"Write a Comment" section NOT found in English');
      }

      // Check comment form labels
      const formLabels = await page2.evaluate(() => {
        const labels = document.querySelectorAll('label, input[placeholder], textarea[placeholder]');
        return Array.from(labels).map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim() || el.getAttribute('placeholder') || ''
        }));
      });
      log(`Form labels/placeholders: ${JSON.stringify(formLabels)}`);

      const hasYourName = formLabels.some(l => l.text.includes('Your name') || l.text.includes('Name'));
      if (hasYourName) pass('Comment form has "Your name" label in English');
      else {
        // check if still in Korean
        const hasKoreanName = formLabels.some(l => l.text.includes('이름') || l.text.includes('작성자'));
        if (hasKoreanName) fail('Comment form name field still in Korean - not translated');
        else fail('Comment form "Your name" label NOT found');
      }

      const submitBtn = await page2.$('button[type="submit"]:has-text("Submit"), button:has-text("Submit")');
      if (submitBtn) {
        pass('Submit button found in English');
      } else {
        const allBtns = await page2.evaluate(() => {
          return Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
        });
        log(`All buttons: ${JSON.stringify(allBtns)}`);
        if (allBtns.some(b => b.includes('등록') || b.includes('작성'))) {
          fail('Submit button still in Korean - not translated');
        } else {
          fail('Submit button NOT found');
        }
      }

    } else {
      fail('No post links found on list page - cannot test detail page');
      await page2.screenshot({ path: '/tmp/test_en_detail.png', fullPage: true });
    }

  } catch (e) {
    fail(`Test 3 failed: ${e.message}`);
    await page2.screenshot({ path: '/tmp/test_en_detail.png', fullPage: true }).catch(() => {});
  }

  await ctx2.close();

  // ============================================================
  // TEST 4: Switch Back to Korean
  // ============================================================
  log('\n--- TEST 4: Switch Back to Korean ---');

  const ctx3 = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page3 = await ctx3.newPage();
  const jsErrors3 = [];
  page3.on('console', msg => { if (msg.type() === 'error') jsErrors3.push(msg.text()); });
  page3.on('pageerror', err => jsErrors3.push(`PAGE ERROR: ${err.message}`));

  try {
    // Start fresh, go to site
    await page3.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page3.waitForTimeout(1500);

    // Toggle to English first
    const enBtn = await page3.$('button:has-text("EN"), a:has-text("EN")');
    if (enBtn) {
      await enBtn.click();
      await page3.waitForTimeout(1000);
      pass('Toggled to English');
    }

    // Now click the Korean button
    const koBtn = await page3.$('button:has-text("한국어"), a:has-text("한국어"), button:has-text("KO"), a:has-text("KO")');
    if (koBtn) {
      const koBtnText = await koBtn.textContent();
      log(`Korean button text: "${koBtnText.trim()}"`);
      await koBtn.click();
      await page3.waitForTimeout(1500);
      pass('Clicked Korean language button');

      await page3.screenshot({ path: '/tmp/test_ko_detail.png', fullPage: true });
      pass('Screenshot saved: /tmp/test_ko_detail.png');

      // Verify Korean text returned
      const navTextKo = await page3.evaluate(() => {
        const navs = document.querySelectorAll('nav a, nav button, header a, header button');
        return Array.from(navs).map(el => el.textContent.trim()).filter(t => t.length > 0);
      });
      log(`Nav items after switching back to Korean: ${JSON.stringify(navTextKo)}`);

      if (navTextKo.some(t => t.includes('홈'))) pass('Korean "홈" restored after toggle back');
      else fail(`Korean "홈" NOT restored - nav: ${JSON.stringify(navTextKo)}`);

      if (navTextKo.some(t => t.includes('글쓰기'))) pass('Korean "글쓰기" restored after toggle back');
      else fail('Korean "글쓰기" NOT restored after toggle back');

    } else {
      const allBtns = await page3.evaluate(() => {
        return Array.from(document.querySelectorAll('button, a[role="button"]')).map(b => ({ text: b.textContent.trim() }));
      });
      fail(`Korean button NOT found - buttons available: ${JSON.stringify(allBtns)}`);
      await page3.screenshot({ path: '/tmp/test_ko_detail.png', fullPage: true });
    }

  } catch (e) {
    fail(`Test 4 failed: ${e.message}`);
    await page3.screenshot({ path: '/tmp/test_ko_detail.png', fullPage: true }).catch(() => {});
  }

  await ctx3.close();

  // ============================================================
  // TEST 5: LocalStorage Persistence
  // ============================================================
  log('\n--- TEST 5: LocalStorage Persistence ---');

  const ctx4 = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page4 = await ctx4.newPage();

  try {
    // Set English in localStorage
    await page4.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page4.waitForTimeout(1500);

    // Toggle to English
    const enBtn4 = await page4.$('button:has-text("EN"), a:has-text("EN")');
    if (enBtn4) {
      await enBtn4.click();
      await page4.waitForTimeout(1000);
    }

    // Check what's in localStorage
    const lsData = await page4.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    log(`LocalStorage contents: ${JSON.stringify(lsData)}`);

    // Navigate to home page (simulate refresh)
    await page4.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page4.waitForTimeout(1500);

    // Check if still in English
    const navAfterReload = await page4.evaluate(() => {
      const navs = document.querySelectorAll('nav a, nav button, header a, header button');
      return Array.from(navs).map(el => el.textContent.trim()).filter(t => t.length > 0);
    });
    log(`Nav items after reload: ${JSON.stringify(navAfterReload)}`);

    if (navAfterReload.some(t => t.includes('Home'))) {
      pass('LocalStorage persistence WORKS - English maintained after navigation');
    } else if (navAfterReload.some(t => t.includes('홈'))) {
      fail('LocalStorage persistence FAILED - reverted to Korean after navigation');
    } else {
      fail(`Unclear state after navigation - nav: ${JSON.stringify(navAfterReload)}`);
    }

    // Check localStorage persisted
    const lsAfterReload = await page4.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    log(`LocalStorage after reload: ${JSON.stringify(lsAfterReload)}`);

  } catch (e) {
    fail(`Test 5 failed: ${e.message}`);
  }

  await ctx4.close();

  // ============================================================
  // TEST 6: Comment Count Format
  // ============================================================
  log('\n--- TEST 6: Comment Count Format ---');

  const ctx5 = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page5 = await ctx5.newPage();

  try {
    await page5.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page5.waitForTimeout(1500);

    // First check in Korean
    const postLinksKo = await page5.$$('tbody tr td a, table td a');
    if (postLinksKo.length > 0) {
      await postLinksKo[0].click();
      await page5.waitForTimeout(2000);

      const pageTextKo = await page5.evaluate(() => document.body.innerText);
      const commentKoMatch = pageTextKo.match(/댓글\s*\d+개/);
      if (commentKoMatch) {
        pass(`Korean comment count format: "${commentKoMatch[0]}"`);
      } else {
        // look for any comment heading
        const allText = pageTextKo.split('\n').filter(l => l.includes('댓글') || l.includes('comment') || l.includes('Comment'));
        log(`Comment-related text lines: ${JSON.stringify(allText)}`);
        fail(`Korean comment count format "댓글 N개" NOT found`);
      }

      // Now switch to English and check same post
      await page5.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await page5.waitForTimeout(1000);

      const enBtn5 = await page5.$('button:has-text("EN"), a:has-text("EN")');
      if (enBtn5) {
        await enBtn5.click();
        await page5.waitForTimeout(500);
      }

      const postLinksEn = await page5.$$('tbody tr td a, table td a');
      if (postLinksEn.length > 0) {
        await postLinksEn[0].click();
        await page5.waitForTimeout(2000);

        const pageTextEn = await page5.evaluate(() => document.body.innerText);
        const commentEnMatch = pageTextEn.match(/(\d+)\s*[Cc]omments?/);
        if (commentEnMatch) {
          pass(`English comment count format: "${commentEnMatch[0]}"`);
        } else {
          const commentKoInEn = pageTextEn.match(/댓글\s*\d+개/);
          if (commentKoInEn) {
            fail(`Comment count NOT translated to English: still shows "${commentKoInEn[0]}"`);
          } else {
            const allCommentLines = pageTextEn.split('\n').filter(l => l.toLowerCase().includes('comment') || l.includes('댓글'));
            log(`Comment-related lines in EN mode: ${JSON.stringify(allCommentLines)}`);
            fail('English comment count format NOT found');
          }
        }
      }
    } else {
      fail('No post links found for comment count test');
    }

  } catch (e) {
    fail(`Test 6 failed: ${e.message}`);
  }

  await ctx5.close();

  // ============================================================
  // TEST 7: Write Form - Korean
  // ============================================================
  log('\n--- TEST 7: Write Form - Both Languages ---');

  const ctx6 = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page6 = await ctx6.newPage();
  const jsErrors6 = [];
  page6.on('console', msg => { if (msg.type() === 'error') jsErrors6.push(msg.text()); });
  page6.on('pageerror', err => jsErrors6.push(`PAGE ERROR: ${err.message}`));

  try {
    // Test Korean write form
    await page6.goto(`${BASE_URL}/posts/new`, { waitUntil: 'networkidle', timeout: 30000 });
    await page6.waitForTimeout(2000);

    const koWriteUrl = page6.url();
    log(`Korean write form URL: ${koWriteUrl}`);

    // Get form content
    const koFormContent = await page6.evaluate(() => {
      const labels = document.querySelectorAll('label');
      const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
      const buttons = document.querySelectorAll('button');
      const headings = document.querySelectorAll('h1, h2, h3');

      return {
        labels: Array.from(labels).map(l => ({ for: l.htmlFor, text: l.textContent.trim() })),
        placeholders: Array.from(inputs).map(i => ({ type: i.type, placeholder: i.getAttribute('placeholder') })),
        buttons: Array.from(buttons).map(b => b.textContent.trim()),
        headings: Array.from(headings).map(h => h.textContent.trim())
      };
    });
    log(`Korean write form content: ${JSON.stringify(koFormContent, null, 2)}`);

    // Check for Korean form elements
    const koLabels = koFormContent.labels.map(l => l.text);
    const koPlaceholders = koFormContent.placeholders.map(p => p.placeholder);
    const koButtons = koFormContent.buttons;
    const koHeadings = koFormContent.headings;

    // Check heading
    if (koHeadings.some(h => h.includes('글쓰기') || h.includes('작성'))) {
      pass('Korean write form heading found');
    } else {
      fail(`Korean write form heading NOT found - headings: ${JSON.stringify(koHeadings)}`);
    }

    log(`Korean form labels: ${JSON.stringify(koLabels)}`);
    log(`Korean form placeholders: ${JSON.stringify(koPlaceholders)}`);
    log(`Korean form buttons: ${JSON.stringify(koButtons)}`);

    // Now test English write form
    // Toggle to English
    const enBtn6 = await page6.$('button:has-text("EN"), a:has-text("EN")');
    if (enBtn6) {
      await enBtn6.click();
      await page6.waitForTimeout(1000);
      pass('Toggled to English for write form test');
    } else {
      // Navigate to home and toggle
      await page6.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      const enBtnHome = await page6.$('button:has-text("EN"), a:has-text("EN")');
      if (enBtnHome) {
        await enBtnHome.click();
        await page6.waitForTimeout(500);
        await page6.goto(`${BASE_URL}/posts/new`, { waitUntil: 'networkidle', timeout: 30000 });
        await page6.waitForTimeout(1500);
      }
    }

    await page6.screenshot({ path: '/tmp/test_en_write.png', fullPage: true });
    pass('Screenshot saved: /tmp/test_en_write.png');

    const enFormContent = await page6.evaluate(() => {
      const labels = document.querySelectorAll('label');
      const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
      const buttons = document.querySelectorAll('button');
      const headings = document.querySelectorAll('h1, h2, h3');

      return {
        labels: Array.from(labels).map(l => ({ for: l.htmlFor, text: l.textContent.trim() })),
        placeholders: Array.from(inputs).map(i => ({ type: i.type, placeholder: i.getAttribute('placeholder') })),
        buttons: Array.from(buttons).map(b => b.textContent.trim()),
        headings: Array.from(headings).map(h => h.textContent.trim())
      };
    });
    log(`English write form content: ${JSON.stringify(enFormContent, null, 2)}`);

    const enLabels = enFormContent.labels.map(l => l.text);
    const enPlaceholders = enFormContent.placeholders.map(p => p.placeholder);
    const enButtons = enFormContent.buttons;
    const enHeadings = enFormContent.headings;

    // Check English heading
    if (enHeadings.some(h => h.includes('Write') || h.includes('Post') || h.includes('Create'))) {
      pass('English write form heading found');
    } else {
      if (enHeadings.some(h => h.includes('글쓰기') || h.includes('작성'))) {
        fail(`Write form heading NOT translated - still Korean: ${JSON.stringify(enHeadings)}`);
      } else {
        fail(`Write form heading NOT found in English - headings: ${JSON.stringify(enHeadings)}`);
      }
    }

    // Check form labels in English
    log(`English form labels: ${JSON.stringify(enLabels)}`);
    log(`English form placeholders: ${JSON.stringify(enPlaceholders)}`);
    log(`English form buttons: ${JSON.stringify(enButtons)}`);

    // Check for common English form fields
    const allEnText = [...enLabels, ...enPlaceholders];

    if (allEnText.some(t => t && (t.includes('Title') || t.includes('title')))) {
      pass('Title field label/placeholder found in English');
    } else {
      const hasKoreanTitle = allEnText.some(t => t && (t.includes('제목')));
      if (hasKoreanTitle) fail('Title field still in Korean in English mode');
      else fail('Title field not found in English write form');
    }

    if (allEnText.some(t => t && (t.includes('Author') || t.includes('author') || t.includes('Name') || t.includes('name')))) {
      pass('Author/Name field label/placeholder found in English');
    } else {
      const hasKoreanAuthor = allEnText.some(t => t && (t.includes('작성자') || t.includes('이름')));
      if (hasKoreanAuthor) fail('Author field still in Korean in English mode');
      else fail('Author field not found in English write form');
    }

    if (allEnText.some(t => t && (t.includes('Content') || t.includes('content')))) {
      pass('Content field label/placeholder found in English');
    } else {
      const hasKoreanContent = allEnText.some(t => t && (t.includes('내용')));
      if (hasKoreanContent) fail('Content field still in Korean in English mode');
      else fail('Content field not found in English write form');
    }

    // Check submit button
    if (enButtons.some(b => b.includes('Submit') || b.includes('Post') || b.includes('Save') || b.includes('Create'))) {
      pass('English submit button found');
    } else {
      const hasKoreanSubmit = enButtons.some(b => b.includes('등록') || b.includes('저장') || b.includes('작성'));
      if (hasKoreanSubmit) fail(`Submit button still in Korean: ${JSON.stringify(enButtons.filter(b => b.includes('등록') || b.includes('저장') || b.includes('작성')))}`);
      else fail(`Submit button not found - buttons: ${JSON.stringify(enButtons)}`);
    }

    if (jsErrors6.length > 0) {
      fail(`JavaScript errors on write form: ${jsErrors6.join('; ')}`);
    } else {
      pass('No JavaScript errors on write form');
    }

  } catch (e) {
    fail(`Test 7 failed: ${e.message}`);
    await page6.screenshot({ path: '/tmp/test_en_write.png', fullPage: true }).catch(() => {});
  }

  await ctx6.close();

  // ============================================================
  // TEST 8: Additional Deep Inspection
  // ============================================================
  log('\n--- TEST 8: Additional Deep Inspection ---');

  const ctx7 = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page7 = await ctx7.newPage();
  const jsErrors7 = [];
  page7.on('console', msg => {
    if (msg.type() === 'error') jsErrors7.push(msg.text());
    if (msg.type() === 'warning') log(`[CONSOLE WARN] ${msg.text()}`);
  });
  page7.on('pageerror', err => jsErrors7.push(`PAGE ERROR: ${err.message}`));
  page7.on('requestfailed', req => issue(`Request failed: ${req.url()} - ${req.failure()?.errorText}`));

  try {
    await page7.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page7.waitForTimeout(1500);

    // Check all visible text on the page for any mixed language issues
    const allTextKo = await page7.evaluate(() => document.body.innerText);
    log(`\nFull Korean page text (first 1000 chars):\n${allTextKo.substring(0, 1000)}`);

    // Toggle to English
    const enBtn7 = await page7.$('button:has-text("EN"), a:has-text("EN")');
    if (enBtn7) {
      await enBtn7.click();
      await page7.waitForTimeout(1500);
    }

    const allTextEn = await page7.evaluate(() => document.body.innerText);
    log(`\nFull English page text (first 1000 chars):\n${allTextEn.substring(0, 1000)}`);

    // Check for any Korean text remaining in English mode (mixed language issues)
    // Common Korean characters range: \uAC00-\uD7A3
    const koreanInEnglish = allTextEn.match(/[\uAC00-\uD7A3]+/g);
    if (koreanInEnglish) {
      const uniqueKorean = [...new Set(koreanInEnglish)];
      // Filter out post content (might legitimately be Korean)
      log(`Korean text found in English mode: ${JSON.stringify(uniqueKorean)}`);
      // This might be legitimate post content, so just log it
    }

    // Navigate to a post and check for mixed language issues
    const postLinks7 = await page7.$$('tbody tr td a, table td a');
    if (postLinks7.length > 0) {
      await postLinks7[0].click();
      await page7.waitForTimeout(2000);

      const detailTextEn = await page7.evaluate(() => document.body.innerText);
      log(`\nEnglish detail page text (first 1500 chars):\n${detailTextEn.substring(0, 1500)}`);

      // Check for specific elements
      const detailStructure = await page7.evaluate(() => {
        return {
          buttons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()),
          links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent.trim(), href: a.href })).filter(a => a.text.length > 0),
          headings: Array.from(document.querySelectorAll('h1,h2,h3,h4')).map(h => ({ tag: h.tagName, text: h.textContent.trim() })),
          labels: Array.from(document.querySelectorAll('label')).map(l => l.textContent.trim()),
          placeholders: Array.from(document.querySelectorAll('[placeholder]')).map(el => el.getAttribute('placeholder'))
        };
      });
      log(`\nDetail page structure in English: ${JSON.stringify(detailStructure, null, 2)}`);
    }

    if (jsErrors7.length > 0) {
      fail(`JavaScript errors in deep inspection: ${jsErrors7.join('; ')}`);
    }

  } catch (e) {
    fail(`Test 8 failed: ${e.message}`);
  }

  await ctx7.close();
  await browser.close();

  // ============================================================
  // FINAL REPORT
  // ============================================================
  log('\n' + '='.repeat(60));
  log('FINAL TEST REPORT');
  log('='.repeat(60));

  const passes = RESULTS.filter(r => r.startsWith('[PASS]')).length;
  const failures = ISSUES.length;

  log(`\nTotal PASS: ${passes}`);
  log(`Total ISSUES: ${failures}`);

  if (failures > 0) {
    log('\nALL ISSUES FOUND:');
    ISSUES.forEach((issue, i) => log(`  ${i + 1}. ${issue}`));
  } else {
    log('\nNo issues found!');
  }

  log('\n' + '='.repeat(60));
}

run().catch(e => {
  console.error('FATAL ERROR:', e);
  process.exit(1);
});
