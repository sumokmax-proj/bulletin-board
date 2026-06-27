'use strict';

/* ─────────────────────────────────────────────────────
   i18n — 한국어 / English
───────────────────────────────────────────────────── */
const TRANSLATIONS = {
  ko: {
    /* nav */
    home: '홈', apiDocs: 'API 문서', writePost: '+ 글쓰기', langSwitch: 'EN',
    /* list */
    boardTitle: '게시판', searchPlaceholder: '검색어 입력...', searchBtn: '검색',
    noPost: '게시글이 없습니다.',
    totalPosts: n => `총 ${n}개 게시글`,
    colNo: '번호', colTitle: '제목', colAuthor: '작성자', colViews: '조회', colDate: '작성일',
    /* detail */
    backToList: '← 목록으로',
    authorLabel: '작성자',
    viewsLabel: n => `조회 ${n}`,
    modifiedLabel: d => `(수정됨: ${d})`,
    editPost: '수정', deletePost: '삭제', listBtn: '목록',
    confirmDeletePost: '게시글을 삭제하시겠습니까?',
    postDeleted: '게시글이 삭제되었습니다.',
    deleteFail: '삭제 실패',
    postNotFound: '게시글을 찾을 수 없습니다.',
    toList: '목록으로',
    /* comments */
    commentsTitle: n => `댓글 ${n}개`,
    noComment: '첫 번째 댓글을 작성해 보세요.',
    writeCommentTitle: '댓글 작성',
    cAuthorPlaceholder: '작성자',
    cContentPlaceholder: '댓글을 입력하세요 (최대 1000자)',
    submitComment: '등록',
    editComment: '수정', deleteComment: '삭제',
    confirmDeleteComment: '댓글을 삭제하시겠습니까?',
    commentDeleted: '댓글이 삭제되었습니다.',
    commentUpdated: '댓글이 수정되었습니다.',
    commentAdded: '댓글이 등록되었습니다.',
    commentAddFail: '댓글 등록 실패',
    cancelBtn: '취소', saveBtn: '저장',
    /* form */
    goBack: '← 돌아가기',
    newPostTitle: '새 게시글 작성', editPostTitle: '게시글 수정',
    titleLabel: '제목', authorFormLabel: '작성자', contentLabel: '내용',
    cancelForm: '취소',
    submitPost: '게시글 등록', submitEdit: '수정 완료', processing: '처리 중...',
    errTitle: '제목을 입력하세요.', errAuthor: '작성자를 입력하세요.', errContent: '내용을 입력하세요.',
    postCreated: '게시글이 등록되었습니다.', postUpdated: '게시글이 수정되었습니다.',
    /* modal */
    modalTitle: '확인', modalCancel: '취소', modalOk: '삭제',
    /* misc */
    loading: '불러오는 중...', errorPrefix: '오류: ', genericError: '오류가 발생했습니다.',
    /* footer */
    footerPowered: 'Powered by Node.js + SQLite', footerApiLink: 'API 문서 보기',
  },
  en: {
    home: 'Home', apiDocs: 'API Docs', writePost: '+ Write', langSwitch: '한국어',
    boardTitle: 'Board', searchPlaceholder: 'Search...', searchBtn: 'Search',
    noPost: 'No posts yet.',
    totalPosts: n => `${n} post${n !== 1 ? 's' : ''} total`,
    colNo: '#', colTitle: 'Title', colAuthor: 'Author', colViews: 'Views', colDate: 'Date',
    backToList: '← Back',
    authorLabel: 'Author',
    viewsLabel: n => `${n} view${n !== 1 ? 's' : ''}`,
    modifiedLabel: d => `(Edited: ${d})`,
    editPost: 'Edit', deletePost: 'Delete', listBtn: 'List',
    confirmDeletePost: 'Are you sure you want to delete this post?',
    postDeleted: 'Post deleted.', deleteFail: 'Delete failed',
    postNotFound: 'Post not found.', toList: 'Back to List',
    commentsTitle: n => `${n} Comment${n !== 1 ? 's' : ''}`,
    noComment: 'Be the first to comment!',
    writeCommentTitle: 'Write a Comment',
    cAuthorPlaceholder: 'Your name',
    cContentPlaceholder: 'Enter your comment (max 1000 chars)',
    submitComment: 'Submit',
    editComment: 'Edit', deleteComment: 'Delete',
    confirmDeleteComment: 'Delete this comment?',
    commentDeleted: 'Comment deleted.',
    commentUpdated: 'Comment updated.',
    commentAdded: 'Comment added.',
    commentAddFail: 'Failed to add comment',
    cancelBtn: 'Cancel', saveBtn: 'Save',
    goBack: '← Back',
    newPostTitle: 'New Post', editPostTitle: 'Edit Post',
    titleLabel: 'Title', authorFormLabel: 'Author', contentLabel: 'Content',
    cancelForm: 'Cancel',
    submitPost: 'Submit', submitEdit: 'Save Changes', processing: 'Saving...',
    errTitle: 'Please enter a title.', errAuthor: 'Please enter your name.', errContent: 'Please enter content.',
    postCreated: 'Post created!', postUpdated: 'Post updated.',
    modalTitle: 'Confirm', modalCancel: 'Cancel', modalOk: 'Delete',
    loading: 'Loading...', errorPrefix: 'Error: ', genericError: 'Something went wrong.',
    footerPowered: 'Powered by Node.js + SQLite', footerApiLink: 'View API Docs',
  },
};

let currentLang = 'ko';

/* t(key) — 현재 언어로 문자열 반환. 함수 값이면 나머지 인자 전달 */
function t(key, ...args) {
  const val = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.ko?.[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

async function detectLang() {
  const saved = localStorage.getItem('board-lang');
  if (saved === 'ko' || saved === 'en') return saved;
  try {
    // 서버사이드 Accept-Language 헤더 기반 감지 (CORS 없음)
    const res = await fetch('/api/locale', { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return data.lang || 'ko';
  } catch {
    return navigator.language?.startsWith('ko') ? 'ko' : 'en';
  }
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('board-lang', lang);
  updateStaticText();
  /* 현재 뷰 다시 렌더 */
  const m = location.pathname.match(/^\/posts\/(\d+)\/edit$/);
  if (m) renderForm(m[1]);
  else dispatch(location.pathname);
}

function updateStaticText() {
  const $ = id => document.getElementById(id);
  const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
  set('nav-home',      t('home'));
  set('nav-api',       t('apiDocs'));
  set('nav-write',     t('writePost'));
  set('lang-switch',   t('langSwitch'));
  set('footer-powered', t('footerPowered'));
  set('footer-api',    t('footerApiLink'));
}

/* ─────────────────────────────────────────────────────
   Router
───────────────────────────────────────────────────── */
const routes = {};
function route(path, fn) { routes[path] = fn; }
function navigate(path) { history.pushState(null, '', path); dispatch(path); }
function dispatch(path) {
  const [base, ...rest] = path.replace(/^\//, '').split('/');
  const key = base ? `/${base}` : '/';
  const handler = routes[key] || routes['*'];
  if (handler) handler(rest);
}
window.addEventListener('popstate', () => dispatch(location.pathname));
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  e.preventDefault();
  navigate(a.getAttribute('href'));
});

/* ─────────────────────────────────────────────────────
   API helper
───────────────────────────────────────────────────── */
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.message || t('genericError'));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ─────────────────────────────────────────────────────
   Toast
───────────────────────────────────────────────────── */
function toast(msg, type = 'success', dur = 2800) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').append(el);
  setTimeout(() => el.remove(), dur);
}

/* ─────────────────────────────────────────────────────
   Confirm modal
───────────────────────────────────────────────────── */
function confirm(msg) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${t('modalTitle')}</h3>
        <p>${msg}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-sm" id="mc-cancel">${t('modalCancel')}</button>
          <button class="btn btn-danger btn-sm" id="mc-ok">${t('modalOk')}</button>
        </div>
      </div>`;
    document.body.append(backdrop);
    backdrop.querySelector('#mc-ok').onclick     = () => { backdrop.remove(); resolve(true);  };
    backdrop.querySelector('#mc-cancel').onclick = () => { backdrop.remove(); resolve(false); };
    backdrop.addEventListener('click', e => { if (e.target === backdrop) { backdrop.remove(); resolve(false); } });
  });
}

/* ─────────────────────────────────────────────────────
   Inline Markdown Parser (AI 댓글 렌더링용, CDN 불필요)
───────────────────────────────────────────────────── */
function parseMarkdown(text) {
  const saved = [];
  const protect = html => { saved.push(html); return `\x00${saved.length - 1}\x00`; };
  const restore = s => s.replace(/\x00(\d+)\x00/g, (_, i) => saved[+i]);

  function inline(s) {
    s = s.replace(/`([^`\n]+)`/g, (_, c) => protect(`<code>${esc(c)}</code>`));
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, txt, u) => protect(`<a href="${u}" target="_blank" rel="noopener">${esc(txt)}</a>`));
    s = esc(s);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return restore(s);
  }

  const lines = text.split('\n');
  const out = [];
  let inCode = false, codeLines = [], inUl = false, inOl = false;
  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };
  for (const line of lines) {
    if (line.startsWith('```')) {
      if (!inCode) { closeList(); inCode = true; codeLines = []; }
      else { inCode = false; out.push(`<pre><code>${esc(codeLines.join('\n'))}</code></pre>`); }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    let m;
    if      ((m = line.match(/^(#{1,3}) (.+)/))) { closeList(); const l = m[1].length; out.push(`<h${l}>${inline(m[2])}</h${l}>`); }
    else if ((m = line.match(/^[-*] (.+)/)))      { if (inOl){out.push('</ol>');inOl=false;} if (!inUl){out.push('<ul>');inUl=true;} out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\d+\. (.+)/)))     { if (inUl){out.push('</ul>');inUl=false;} if (!inOl){out.push('<ol>');inOl=true;} out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^> (.+)/)))         { closeList(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); }
    else if (/^-{3,}$/.test(line.trim()))         { closeList(); out.push('<hr>'); }
    else if (line.trim() === '')                  { closeList(); }
    else                                          { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  if (inCode && codeLines.length) out.push(`<pre><code>${esc(codeLines.join('\n'))}</code></pre>`);
  return out.join('');
}

/* ─────────────────────────────────────────────────────
   Render helpers
───────────────────────────────────────────────────── */
const main = () => document.querySelector('main');
function setHTML(html) { main().innerHTML = html; }

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const locale = currentLang === 'ko' ? 'ko-KR' : 'en-US';
  return d.toLocaleDateString(locale, { year: 'numeric', month: currentLang === 'ko' ? '2-digit' : 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ─────────────────────────────────────────────────────
   Page: Post List
───────────────────────────────────────────────────── */
async function renderList(page = 1, q = '') {
  setHTML(`<div class="loading"><div class="spinner"></div> ${t('loading')}</div>`);
  try {
    const qs = new URLSearchParams({ page, limit: 15, ...(q ? { q } : {}) });
    const { data } = await api('GET', `/api/posts?${qs}`);
    const { posts, pagination } = data;

    const rows = posts.length
      ? posts.map(p => `
          <tr>
            <td class="text-mono text-sub">${p.id}</td>
            <td>
              <a href="/posts/${p.id}" data-link class="post-title-link">${esc(p.title)}</a>
              ${p.comment_count > 0 ? `<span class="comment-badge">${p.comment_count}</span>` : ''}
            </td>
            <td class="text-sub">${esc(p.author)}</td>
            <td class="text-sub text-mono">${p.views}</td>
            <td class="text-sub">${fmtDate(p.created_at)}</td>
          </tr>`).join('')
      : `<tr><td colspan="5">
           <div class="empty-state">
             <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                 d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z"/>
             </svg>
             <p>${t('noPost')}</p>
           </div>
         </td></tr>`;

    const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
      .map(n => `<button class="page-btn ${n === page ? 'active' : ''}" data-page="${n}">${n}</button>`)
      .join('');

    setHTML(`
      <div class="list-header">
        <h2>${t('boardTitle')}</h2>
        <form class="search-wrap" id="search-form">
          <input type="text" placeholder="${t('searchPlaceholder')}" value="${esc(q)}" id="search-input" />
          <button class="btn btn-ghost btn-sm" type="submit">${t('searchBtn')}</button>
        </form>
      </div>
      <div class="card" style="overflow:hidden;">
        <table class="post-table">
          <thead>
            <tr>
              <th style="width:60px">${t('colNo')}</th>
              <th>${t('colTitle')}</th>
              <th style="width:100px">${t('colAuthor')}</th>
              <th style="width:70px">${t('colViews')}</th>
              <th style="width:140px">${t('colDate')}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="pagination">${pages}</div>
      <p class="text-sub" style="text-align:center;margin-top:.5rem;font-size:.8rem;">
        ${t('totalPosts', pagination.total)}
      </p>`);

    document.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const q2 = document.getElementById('search-input')?.value.trim() || '';
        renderList(+btn.dataset.page, q2);
      });
    });
    document.getElementById('search-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const q2 = document.getElementById('search-input').value.trim();
      navigate(q2 ? `/?q=${encodeURIComponent(q2)}` : '/');
      renderList(1, q2);
    });
  } catch (err) {
    setHTML(`<div class="empty-state"><p style="color:var(--danger)">${t('errorPrefix')}${esc(err.message)}</p></div>`);
  }
}

/* ─────────────────────────────────────────────────────
   Page: Post Detail
───────────────────────────────────────────────────── */
async function renderDetail(id) {
  setHTML(`<div class="loading"><div class="spinner"></div> ${t('loading')}</div>`);
  try {
    const { data: post } = await api('GET', `/api/posts/${id}`);

    const comments = post.comments.map(c => renderComment(c, id)).join('') ||
      `<p class="text-sub" style="padding:.5rem 0">${t('noComment')}</p>`;

    setHTML(`
      <div style="margin-bottom:1rem;">
        <a href="/" data-link class="btn btn-ghost btn-sm">${t('backToList')}</a>
      </div>
      <div class="card post-detail">
        <h1 style="font-size:1.5rem;font-weight:700;margin-bottom:.8rem;">${esc(post.title)}</h1>
        <div class="post-meta">
          <span>${t('authorLabel')}: <strong>${esc(post.author)}</strong></span>
          <span>${t('viewsLabel', post.views)}</span>
          <span>${fmtDate(post.created_at)}</span>
          ${post.updated_at !== post.created_at ? `<span>${t('modifiedLabel', fmtDate(post.updated_at))}</span>` : ''}
        </div>
        <div class="post-content">${esc(post.content)}</div>
        <div class="post-actions">
          <a href="/posts/${id}/edit" data-link class="btn btn-ghost btn-sm">${t('editPost')}</a>
          <button class="btn btn-danger btn-sm" id="delete-post-btn">${t('deletePost')}</button>
          <a href="/" data-link class="btn btn-ghost btn-sm ml-auto">${t('listBtn')}</a>
        </div>
      </div>

      <div class="comments-section">
        <h3 id="comments-heading">${buildCommentsHeading(post.comments.length)}</h3>
        <div class="comment-list" id="comment-list">${comments}</div>
        <div class="comment-form">
          <h4>${t('writeCommentTitle')}</h4>
          <form id="comment-write-form">
            <div class="form-row" style="margin-bottom:.8rem;">
              <div class="form-group" style="margin-bottom:0">
                <input type="text" class="form-control" id="c-author" placeholder="${t('cAuthorPlaceholder')}" maxlength="50" required />
              </div>
            </div>
            <div class="form-group">
              <textarea class="form-control" id="c-content" rows="3" placeholder="${t('cContentPlaceholder')}" maxlength="1000" required></textarea>
            </div>
            <div style="text-align:right;">
              <button class="btn btn-primary btn-sm" type="submit">${t('submitComment')}</button>
            </div>
          </form>
        </div>
      </div>`);

    document.getElementById('delete-post-btn').addEventListener('click', async () => {
      if (!await confirm(t('confirmDeletePost'))) return;
      try {
        await api('DELETE', `/api/posts/${id}`);
        toast(t('postDeleted'));
        navigate('/');
      } catch { toast(t('deleteFail'), 'error'); }
    });

    document.getElementById('comment-write-form').addEventListener('submit', async e => {
      e.preventDefault();
      const author  = document.getElementById('c-author').value.trim();
      const content = document.getElementById('c-content').value.trim();
      try {
        const { data: c } = await api('POST', `/api/posts/${id}/comments`, { author, content });
        const list = document.getElementById('comment-list');
        list.insertAdjacentHTML('beforeend', renderComment(c, id));
        bindCommentEvents(c.id, id);
        document.getElementById('c-author').value  = '';
        document.getElementById('c-content').value = '';
        const cnt = document.getElementById('comment-count');
        cnt.textContent = +cnt.textContent + 1;
        toast(t('commentAdded'));
      } catch (err) {
        toast(err.message || t('commentAddFail'), 'error');
      }
    });

    post.comments.forEach(c => bindCommentEvents(c.id, id));

  } catch (err) {
    if (err.status === 404 || err.message.includes('찾을 수 없')) {
      setHTML(`<div class="empty-state"><p>${t('postNotFound')}</p><br><a href="/" data-link class="btn btn-primary btn-sm">${t('toList')}</a></div>`);
    } else {
      setHTML(`<div class="empty-state"><p style="color:var(--danger)">${t('errorPrefix')}${esc(err.message)}</p></div>`);
    }
  }
}

/* ─────────────────────────────────────────────────────
   Comment Renderer & Events
───────────────────────────────────────────────────── */
function buildCommentsHeading(n) {
  if (currentLang === 'ko') {
    return `댓글 <span id="comment-count">${n}</span>개`;
  }
  return `<span id="comment-count">${n}</span> Comment${n !== 1 ? 's' : ''}`;
}

const AI_AUTHOR  = 'AI';
const AI_AUTHORS = new Set(['AI', '🤖 AI 어시스턴트']);

function renderComment(c, postId) {
  const isAI = AI_AUTHORS.has(c.author);
  const actions = isAI ? '' : `
    <div class="comment-actions">
      <button class="btn btn-ghost btn-sm" data-edit-comment="${c.id}" data-post="${postId}">${t('editComment')}</button>
      <button class="btn btn-danger btn-sm" data-del-comment="${c.id}" data-post="${postId}">${t('deleteComment')}</button>
    </div>`;
  const contentHtml = isAI
    ? parseMarkdown(c.content)
    : `<span style="white-space:pre-wrap">${esc(c.content)}</span>`;

  return `
    <div class="comment-item" id="comment-${c.id}">
      <div class="comment-header">
        <span class="comment-author">${esc(c.author)}</span>
        <div style="display:flex;align-items:center;gap:.6rem;">
          <span class="comment-date">${fmtDate(c.created_at)}</span>
          ${actions}
        </div>
      </div>
      <div class="comment-content markdown-body" id="comment-content-${c.id}">${contentHtml}</div>
    </div>`;
}

function bindCommentEvents(cid, pid) {
  const container = document.getElementById(`comment-${cid}`);
  if (!container) return;

  container.querySelector(`[data-del-comment="${cid}"]`)?.addEventListener('click', async () => {
    if (!await confirm(t('confirmDeleteComment'))) return;
    try {
      await api('DELETE', `/api/posts/${pid}/comments/${cid}`);
      container.remove();
      const cnt = document.getElementById('comment-count');
      if (cnt) cnt.textContent = Math.max(0, +cnt.textContent - 1);
      toast(t('commentDeleted'));
    } catch { toast(t('deleteFail'), 'error'); }
  });

  container.querySelector(`[data-edit-comment="${cid}"]`)?.addEventListener('click', () => {
    const contentEl  = document.getElementById(`comment-content-${cid}`);
    const original   = contentEl.textContent;
    const authorEl   = container.querySelector('.comment-author');
    const origAuthor = authorEl.textContent;

    contentEl.innerHTML = `
      <div style="margin-top:.5rem;">
        <input type="text" class="form-control" id="ec-author-${cid}" value="${esc(origAuthor)}" style="margin-bottom:.5rem;" maxlength="50" />
        <textarea class="form-control" id="ec-content-${cid}" rows="3" maxlength="1000">${esc(original)}</textarea>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.5rem;">
          <button class="btn btn-ghost btn-sm" id="ec-cancel-${cid}">${t('cancelBtn')}</button>
          <button class="btn btn-primary btn-sm" id="ec-save-${cid}">${t('saveBtn')}</button>
        </div>
      </div>`;

    document.getElementById(`ec-cancel-${cid}`).onclick = () => { contentEl.textContent = original; };
    document.getElementById(`ec-save-${cid}`).onclick = async () => {
      const na = document.getElementById(`ec-author-${cid}`).value.trim();
      const nc = document.getElementById(`ec-content-${cid}`).value.trim();
      try {
        const { data: updated } = await api('PUT', `/api/posts/${pid}/comments/${cid}`, { author: na, content: nc });
        contentEl.textContent = updated.content;
        authorEl.textContent  = updated.author;
        toast(t('commentUpdated'));
      } catch (err) { toast(err.message || t('deleteFail'), 'error'); }
    };
  });
}

/* ─────────────────────────────────────────────────────
   Page: Write / Edit
───────────────────────────────────────────────────── */
async function renderForm(id = null) {
  let post = null;
  if (id) {
    try { const r = await api('GET', `/api/posts/${id}`); post = r.data; }
    catch { setHTML(`<div class="empty-state"><p>${t('postNotFound')}</p></div>`); return; }
  }

  setHTML(`
    <div style="margin-bottom:1rem;">
      <a href="${id ? `/posts/${id}` : '/'}" data-link class="btn btn-ghost btn-sm">${t('goBack')}</a>
    </div>
    <div class="card form-card">
      <h2 style="margin-bottom:1.5rem;">${id ? t('editPostTitle') : t('newPostTitle')}</h2>
      <form id="post-form" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="f-title">${t('titleLabel')} <span style="color:var(--danger)">*</span></label>
            <input type="text" id="f-title" class="form-control"
              value="${post ? esc(post.title) : ''}" maxlength="200" required />
            <div class="field-error hidden" id="err-title"></div>
          </div>
          <div class="form-group">
            <label for="f-author">${t('authorFormLabel')} <span style="color:var(--danger)">*</span></label>
            <input type="text" id="f-author" class="form-control"
              value="${post ? esc(post.author) : ''}" maxlength="50" required />
            <div class="field-error hidden" id="err-author"></div>
          </div>
        </div>
        <div class="form-group">
          <label for="f-content">${t('contentLabel')} <span style="color:var(--danger)">*</span></label>
          <textarea id="f-content" class="form-control" rows="12" required>${post ? esc(post.content) : ''}</textarea>
          <div class="field-error hidden" id="err-content"></div>
        </div>
        <div class="form-actions">
          <a href="${id ? `/posts/${id}` : '/'}" data-link class="btn btn-ghost">${t('cancelForm')}</a>
          <button type="submit" class="btn btn-primary" id="submit-btn">
            ${id ? t('submitEdit') : t('submitPost')}
          </button>
        </div>
      </form>
    </div>`);

  document.getElementById('post-form').addEventListener('submit', async e => {
    e.preventDefault();
    const title   = document.getElementById('f-title').value.trim();
    const author  = document.getElementById('f-author').value.trim();
    const content = document.getElementById('f-content').value.trim();

    let valid = true;
    [['err-title', title, t('errTitle')], ['err-author', author, t('errAuthor')], ['err-content', content, t('errContent')]]
      .forEach(([errId, val, msg]) => {
        const el = document.getElementById(errId);
        if (!val) {
          el.textContent = msg; el.classList.remove('hidden');
          document.getElementById(errId.replace('err-', 'f-')).classList.add('error');
          valid = false;
        } else {
          el.classList.add('hidden');
          document.getElementById(errId.replace('err-', 'f-')).classList.remove('error');
        }
      });
    if (!valid) return;

    const btn = document.getElementById('submit-btn');
    btn.disabled = true; btn.textContent = t('processing');
    try {
      if (id) {
        await api('PUT', `/api/posts/${id}`, { title, author, content });
        toast(t('postUpdated'));
        navigate(`/posts/${id}`);
      } else {
        const { data } = await api('POST', '/api/posts', { title, author, content });
        toast(t('postCreated'));
        navigate(`/posts/${data.id}`);
      }
    } catch (err) {
      toast(err.message || t('genericError'), 'error');
      btn.disabled = false;
      btn.textContent = id ? t('submitEdit') : t('submitPost');
    }
  });
}

/* ─────────────────────────────────────────────────────
   Route definitions
───────────────────────────────────────────────────── */
route('/', () => {
  const params = new URLSearchParams(location.search);
  renderList(+(params.get('page') || 1), params.get('q') || '');
});
route('/posts', ([seg]) => {
  if (seg === 'new') { renderForm(); return; }
  const id = parseInt(seg);
  if (!isNaN(id)) renderDetail(id);
});

// /posts/:id/edit 처리
window.addEventListener('popstate', () => {
  const m = location.pathname.match(/^\/posts\/(\d+)\/edit$/);
  if (m) renderForm(m[1]);
});
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]');
  if (!a) return;
  const m = a.getAttribute('href').match(/^\/posts\/(\d+)\/edit$/);
  if (m) { e.preventDefault(); history.pushState(null, '', a.href); renderForm(m[1]); }
});

/* ─────────────────────────────────────────────────────
   Bootstrap — 언어 감지 후 렌더링
───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // 언어 감지 (IP or localStorage or browser)
  currentLang = await detectLang();
  updateStaticText();

  // 언어 토글 버튼 이벤트
  const langBtn = document.getElementById('lang-switch');
  if (langBtn) langBtn.addEventListener('click', () => setLang(currentLang === 'ko' ? 'en' : 'ko'));

  // 현재 경로 렌더링
  const path = location.pathname;
  const editMatch = path.match(/^\/posts\/(\d+)\/edit$/);
  if (editMatch) { renderForm(editMatch[1]); return; }
  dispatch(path);
});
