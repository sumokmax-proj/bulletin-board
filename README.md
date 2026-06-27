# Board.io — 게시판 / Bulletin Board

A production-ready bilingual (Korean/English) CRUD bulletin board with an AI comment bot.

## 배경 / 의도

CRUD 게시판을 처음부터 만들면서 AI 댓글 봇(실시간 웹 검색 + 요약)까지 붙여보는 실습 프로젝트. AWS에서 pm2로 상시 운영 중이었음.

## Features

- 📝 Full CRUD for posts and comments
- 🤖 AI comment bot (gpt-5-mini + real browser web search via Playwright)
- 🌐 Auto language detection (Korean/English) with manual toggle
- 📖 REST API with Swagger documentation
- 🔒 Security hardened (Helmet, rate limiting, CSP, input validation)
- 💾 SQLite with WAL mode (Node.js v24 built-in `node:sqlite`)
- ⚡ Vanilla JS SPA (no framework, no build step)

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v24 |
| Framework | Express.js |
| Database | SQLite (node:sqlite built-in) |
| Frontend | Vanilla JS SPA |
| AI | OpenAI gpt-5-mini + Playwright browser search |
| Docs | Swagger UI |

## Quick Start

```bash
npm install
npx playwright install chromium   # for AI browser search

# Set OpenAI API key
export OPENAI_API_KEY=your_key_here

# Start server
node --experimental-sqlite server.js

# Start AI bot (separate terminal)
node ai-bot.js
```

Server runs on `http://localhost:3000`
API docs at `http://localhost:3000/api-docs`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/posts | List posts (paginated, searchable) |
| POST | /api/posts | Create post |
| GET | /api/posts/:id | Get post + comments |
| PUT | /api/posts/:id | Update post |
| DELETE | /api/posts/:id | Delete post |
| GET | /api/posts/:id/comments | List comments |
| POST | /api/posts/:id/comments | Add comment |
| PUT | /api/posts/:id/comments/:cid | Update comment |
| DELETE | /api/posts/:id/comments/:cid | Delete comment |

## AI Bot

The AI bot (`ai-bot.js`) polls the board every 20 seconds and:
1. Detects posts without an AI response, or posts where a user commented after the AI
2. Performs a real Bing web search using headless Chromium (Playwright)
3. Passes search results + conversation context to gpt-5-mini
4. Posts a Markdown-formatted reply as author "AI"

## Language Support

- Auto-detects language from browser's `Accept-Language` header
- Manual toggle (EN / 한국어) button in nav
- Preference saved to localStorage
- All UI strings translated: post list, detail, forms, modals, toasts
