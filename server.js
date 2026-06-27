'use strict';

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const swaggerUi  = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const postsRouter    = require('./src/routes/posts');
const commentsRouter = require('./src/routes/comments');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ──────────────────────────────────────────────
   Security & Core Middleware
────────────────────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,   // Helmet 기본값 비활성화 (upgrade-insecure-requests 제거)
    directives: {
      defaultSrc:    ["'self'"],
      styleSrc:      ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:       ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc:     ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      scriptSrcAttr: ["'none'"],
      imgSrc:        ["'self'", 'data:'],
      connectSrc:    ["'self'"],
      objectSrc:     ["'none'"],
      baseUri:       ["'self'"],
      formAction:    ["'self'"],
      frameAncestors:["'none'"],
      // upgrade-insecure-requests는 HTTPS 미사용 시 제외
    },
  },
}));
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting (localhost AI 봇은 제외)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.' },
  skip: (req) => {
    const ip = req.ip || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  },
});
app.use('/api', apiLimiter);

/* ──────────────────────────────────────────────
   Locale Detection (서버사이드, CORS 없음)
────────────────────────────────────────────── */
app.get('/api/locale', (req, res) => {
  const acceptLang = req.headers['accept-language'] || '';
  const lang = acceptLang.toLowerCase().includes('ko') ? 'ko' : 'en';
  res.json({ lang });
});

/* ──────────────────────────────────────────────
   Swagger / OpenAPI
────────────────────────────────────────────── */
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: '게시판 API',
      version: '1.0.0',
      description: '게시글 & 댓글 CRUD REST API 문서',
      contact: { name: 'API Support' },
    },
    servers: [{ url: `http://localhost:${PORT}`, description: 'Local server' }],
    components: {
      schemas: {
        Post: {
          type: 'object',
          properties: {
            id:            { type: 'integer', example: 1 },
            title:         { type: 'string',  example: '안녕하세요' },
            author:        { type: 'string',  example: '홍길동' },
            content:       { type: 'string',  example: '첫 번째 게시글입니다.' },
            views:         { type: 'integer', example: 42 },
            comment_count: { type: 'integer', example: 3 },
            created_at:    { type: 'string',  format: 'date-time' },
            updated_at:    { type: 'string',  format: 'date-time' },
          },
        },
        PostInput: {
          type: 'object',
          required: ['title', 'author', 'content'],
          properties: {
            title:   { type: 'string', minLength: 1, maxLength: 200, example: '제목' },
            author:  { type: 'string', minLength: 1, maxLength: 50,  example: '홍길동' },
            content: { type: 'string', minLength: 1, example: '본문 내용' },
          },
        },
        PostList: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                posts: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
                pagination: {
                  type: 'object',
                  properties: {
                    total:      { type: 'integer' },
                    page:       { type: 'integer' },
                    limit:      { type: 'integer' },
                    totalPages: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
        PostDetail: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              allOf: [
                { $ref: '#/components/schemas/Post' },
                {
                  type: 'object',
                  properties: {
                    comments: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
                  },
                },
              ],
            },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            id:         { type: 'integer', example: 1 },
            post_id:    { type: 'integer', example: 1 },
            author:     { type: 'string',  example: '댓글러' },
            content:    { type: 'string',  example: '좋은 글이네요!' },
            created_at: { type: 'string',  format: 'date-time' },
            updated_at: { type: 'string',  format: 'date-time' },
          },
        },
        CommentInput: {
          type: 'object',
          required: ['author', 'content'],
          properties: {
            author:  { type: 'string', minLength: 1, maxLength: 50,   example: '댓글러' },
            content: { type: 'string', minLength: 1, maxLength: 1000, example: '댓글 내용' },
          },
        },
        CommentList: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
          },
        },
      },
    },
    tags: [
      { name: 'Posts',    description: '게시글 CRUD' },
      { name: 'Comments', description: '댓글 CRUD' },
    ],
  },
  apis: ['./src/routes/*.js'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: '게시판 API 문서',
  customCss: '.swagger-ui .topbar { background: #1e293b; }',
}));

// Also expose raw OpenAPI JSON
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

/* ──────────────────────────────────────────────
   API Routes
────────────────────────────────────────────── */
app.use('/api/posts', postsRouter);
app.use('/api/posts/:postId/comments', commentsRouter);

/* ──────────────────────────────────────────────
   Static Frontend
────────────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

// SPA fallback: all non-API routes → index.html
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ──────────────────────────────────────────────
   Error Handling
────────────────────────────────────────────── */
app.use(notFound);
app.use(errorHandler);

/* ──────────────────────────────────────────────
   Start Server
────────────────────────────────────────────── */
const server = app.listen(PORT, () => {
  console.log(`\n🚀 게시판 서버 실행 중`);
  console.log(`   웹 UI  : http://localhost:${PORT}`);
  console.log(`   API    : http://localhost:${PORT}/api/posts`);
  console.log(`   API 문서: http://localhost:${PORT}/api-docs\n`);
});

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n${signal} 수신 — 서버를 종료합니다...`);
  server.close(() => {
    console.log('서버 종료 완료.');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;
