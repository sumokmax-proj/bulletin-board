'use strict';

/**
 * AI 댓글 봇
 * 게시판 글을 주기적으로 확인하고, AI가 응답하지 않은 사용자 댓글에
 * gpt-5-mini + 실제 브라우저 웹 검색을 통해 자동으로 댓글을 작성합니다.
 */

const BOARD_API  = process.env.BOARD_API || 'http://localhost:3000/api';
const MODEL      = 'gpt-5-mini';
const AI_AUTHOR  = 'AI';
// 이전 버전 작성자명과 하위 호환 처리
const AI_AUTHORS = new Set(['AI', '🤖 AI 어시스턴트']);
const isAIComment = c => AI_AUTHORS.has(c.author);
const POLL_SEC   = parseInt(process.env.POLL_SEC || '40', 10);
const API_KEY    = process.env.OPENAI_API_KEY;

if (!API_KEY) {
  console.error('[AI Bot] OPENAI_API_KEY 환경변수가 없습니다. 종료합니다.');
  process.exit(1);
}

/* ──────────────────────────────────────────────
   Browser Search (Playwright)
────────────────────────────────────────────── */
let playwright = null;
async function getPlaywright() {
  if (playwright) return playwright;
  try {
    playwright = await import('playwright');
    return playwright;
  } catch {
    return null;
  }
}

/* Hacker News 직접 스크래핑 */
async function scrapeHackerNews() {
  const pw = await getPlaywright();
  if (!pw) return null;
  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto('https://news.ycombinator.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.athing', { timeout: 10000 });

    const stories = await page.$$eval('.athing', items =>
      items.slice(0, 10).map(item => {
        const titleEl = item.querySelector('.titleline > a');
        const meta    = item.nextElementSibling;
        const score   = meta?.querySelector('.score')?.textContent || '';
        const comments= meta?.querySelector('a[href*="item?id"]')?.textContent || '';
        return {
          title:   titleEl?.textContent?.trim() || '',
          url:     titleEl?.href || '',
          snippet: [score, comments].filter(Boolean).join(' | '),
        };
      }).filter(s => s.title)
    );
    console.log(`[AI Bot] HN 스크래핑 성공: ${stories.length}개 기사`);
    return stories.length > 0 ? stories : null;
  } catch (err) {
    console.error('[AI Bot] HN 스크래핑 오류:', err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

/* Brave Search (DDG가 봇 감지 차단하므로 Brave로 교체) */
async function browserSearch(query) {
  const pw = await getPlaywright();
  if (!pw) {
    console.warn('[AI Bot] Playwright 없음 — 브라우저 검색 건너뜀');
    return null;
  }

  // HN 관련 질문은 직접 HN 스크래핑
  const lq = query.toLowerCase();
  if (lq.includes('hacker news') || lq.includes('해커뉴스') || lq.includes(' hn ') || lq.startsWith('hn ')) {
    console.log('[AI Bot] HN 직접 스크래핑 모드');
    return scrapeHackerNews();
  }

  let browser;
  try {
    browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Brave Search — 봇 감지 없음, 안정적인 결과
    const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('[data-type="web"]', { timeout: 10000 });

    const results = await page.$$eval('[data-type="web"]', els =>
      els.slice(0, 5).map(el => {
        const titleEl = el.querySelector('a');
        const title   = titleEl?.textContent?.trim() || '';
        const url     = titleEl?.href || '';
        // 스니펫: p 태그 or snippet 클래스 or 전체 텍스트에서 타이틀 제거
        const snippetEl = el.querySelector('p, [class*="snippet"], [class*="desc"]');
        const snippet = snippetEl?.textContent?.trim() ||
          el.textContent?.replace(title, '')?.trim()?.slice(0, 200) || '';
        return { title, url, snippet };
      }).filter(r => r.title)
    );

    console.log(`[AI Bot] Brave 검색 성공: ${results.length}개 결과`);
    return results.length > 0 ? results : null;
  } catch (err) {
    console.error('[AI Bot] 브라우저 검색 오류:', err.message);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

/* ──────────────────────────────────────────────
   HTTP helpers
────────────────────────────────────────────── */
async function boardGet(path) {
  const res = await fetch(`${BOARD_API}${path}`);
  if (!res.ok) throw new Error(`Board API ${path} → ${res.status}`);
  return (await res.json()).data;
}

async function boardPost(path, body) {
  const res = await fetch(`${BOARD_API}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Board POST ${path} → ${res.status}: ${t}`);
  }
  return (await res.json()).data;
}

/* ──────────────────────────────────────────────
   OpenAI Chat Completions + 브라우저 웹 검색
────────────────────────────────────────────── */
async function askAI(post) {
  // 1) 검색 쿼리 추출 (게시글 + 마지막 사용자 댓글 기반)
  const comments = post.comments || [];
  const lastUserComment = [...comments].reverse().find(c => !isAIComment(c));
  const searchTarget = lastUserComment ? lastUserComment.content : `${post.title} ${post.content}`;
  const searchQuery  = searchTarget.slice(0, 120);

  // 2) 브라우저 웹 검색
  console.log(`[AI Bot] 브라우저 검색: "${searchQuery.slice(0, 60)}..."`);
  const searchResults = await browserSearch(searchQuery);

  // 3) 시스템 프롬프트
  const searchSection = searchResults
    ? `\n\n## 실시간 웹 검색 결과 (방금 브라우저로 직접 검색한 최신 데이터)\n${
        searchResults.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   출처: ${r.url}`).join('\n\n')
      }\n\n위 검색 결과를 반드시 활용하여 답변하세요. "실시간 정보에 접근할 수 없다"거나 "인터넷 검색이 불가하다"는 말은 절대 하지 마세요.`
    : '';

  const systemPrompt = `당신은 친절하고 유익한 게시판 AI 어시스턴트입니다.
사용자의 게시글과 댓글을 읽고 자연스럽게 답변합니다.

답변 규칙:
- 질문에는 정확하고 친절하게 답변합니다.
- 아래 웹 검색 결과가 제공되면 반드시 그 내용을 기반으로 답변합니다.
- "인터넷에 접속할 수 없다", "실시간 정보를 가져올 수 없다" 같은 말은 절대 하지 않습니다.
- 답변은 **마크다운 형식**으로 작성합니다 (제목, 목록, 굵은 글씨 등 활용).
- 출처가 있으면 링크를 포함합니다.
- 한국어로 자연스럽게 작성합니다.
- 핵심을 명확히 전달하되 너무 길지 않게 합니다.
${searchSection}`;

  // 4) 사용자 메시지 (게시글 + 대화 맥락)
  let userMessage = `## 게시글\n**제목:** ${post.title}\n**작성자:** ${post.author}\n\n${post.content}`;
  if (comments.length > 0) {
    userMessage += '\n\n## 댓글 대화';
    for (const c of comments) {
      const label = isAIComment(c) ? 'AI 어시스턴트' : c.author;
      userMessage += `\n\n**[${label}]:** ${c.content}`;
    }
    userMessage += '\n\n---\n마지막 댓글에 자연스럽게 답변하거나 반응해주세요.';
  }

  // 5) Chat Completions API 호출
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model:    MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userMessage  },
      ],
      max_completion_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API error ${res.status}: ${err?.error?.message || 'unknown'}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

/* ──────────────────────────────────────────────
   Core logic — 연속 답변 지원
────────────────────────────────────────────── */
// postId → 마지막으로 처리한 사용자 댓글 ID (없으면 null = 초기 글 자체)
const lastProcessed = new Map();

async function processPost(post) {
  const detail   = await boardGet(`/posts/${post.id}`);
  const comments = detail.comments || [];

  const lastComment   = comments.length > 0 ? comments[comments.length - 1] : null;
  const lastIsAI      = lastComment && isAIComment(lastComment);

  // 마지막 댓글이 AI라면 이미 응답 완료 → 트래킹 업데이트 후 종료
  if (lastIsAI) {
    lastProcessed.set(post.id, lastComment.id);
    return;
  }

  // 현재 상태 ID: 마지막 사용자 댓글 ID (댓글 없으면 null)
  const currentId = lastComment ? lastComment.id : null;
  const prevId    = lastProcessed.get(post.id);

  // 이미 이 상태를 처리했으면 건너뜀
  // (prevId가 undefined → 처음 보는 게시글이므로 항상 처리)
  if (prevId !== undefined && prevId === currentId) return;

  const context = lastComment
    ? `마지막 댓글: "${lastComment.author}" — ${lastComment.content.slice(0, 60)}`
    : '최초 응답 (댓글 없음)';
  console.log(`[AI Bot] 응답 필요 → #${post.id} "${post.title}" | ${context}`);
  console.log(`[AI Bot] AI 응답 생성 중...`);

  const aiReply = await askAI(detail);
  if (!aiReply) throw new Error('AI 응답이 비어있습니다.');

  await boardPost(`/posts/${post.id}/comments`, { author: AI_AUTHOR, content: aiReply });

  lastProcessed.set(post.id, currentId);
  console.log(`[AI Bot] ✅ 댓글 게시 완료 → #${post.id} | 미리보기: ${aiReply.slice(0, 80)}...`);
}

async function poll() {
  try {
    const { posts } = await boardGet('/posts?limit=50');
    for (const post of posts) {
      await processPost(post).catch(err => {
        console.error(`[AI Bot] ❌ #${post.id} 처리 오류:`, err.message);
      });
    }
  } catch (err) {
    console.error('[AI Bot] 폴링 오류:', err.message);
  }
}

/* ──────────────────────────────────────────────
   Start
────────────────────────────────────────────── */
console.log(`\n🤖 AI 댓글 봇 시작`);
console.log(`   게시판 API : ${BOARD_API}`);
console.log(`   AI 모델   : ${MODEL}`);
console.log(`   폴링 주기  : ${POLL_SEC}초\n`);

poll();
setInterval(poll, POLL_SEC * 1000);

process.on('SIGINT',  () => { console.log('\n[AI Bot] 종료합니다.'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n[AI Bot] 종료합니다.'); process.exit(0); });
