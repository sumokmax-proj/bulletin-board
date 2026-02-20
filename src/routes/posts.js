'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/errorHandler');
const db = require('../db');

const router = Router();

/* ────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────── */
const postValidation = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('제목은 1~200자여야 합니다.'),
  body('author').trim().isLength({ min: 1, max: 50 }).withMessage('작성자는 1~50자여야 합니다.'),
  body('content').trim().isLength({ min: 1 }).withMessage('내용을 입력하세요.'),
];

/* ────────────────────────────────────────────────
   GET /api/posts  — List posts (paginated)
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts:
 *   get:
 *     summary: 게시글 목록 조회
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *         description: 페이지당 게시글 수
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: 검색어 (제목/내용)
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostList'
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt().default(1),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().default(10),
  query('q').optional().trim().escape(),
  validate,
], (req, res) => {
  const page  = req.query.page  || 1;
  const limit = req.query.limit || 10;
  const q     = req.query.q || '';
  const offset = (page - 1) * limit;

  let where = '';
  let params = [];
  if (q) {
    where = `WHERE title LIKE ? OR content LIKE ?`;
    params = [`%${q}%`, `%${q}%`];
  }

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM posts ${where}`).get(...params).cnt;
  const posts = db.prepare(
    `SELECT id, title, author, views,
            (SELECT COUNT(*) FROM comments WHERE post_id = posts.id) AS comment_count,
            created_at, updated_at
     FROM posts ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  res.json({
    success: true,
    data: {
      posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

/* ────────────────────────────────────────────────
   GET /api/posts/:id  — Get single post
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts/{id}:
 *   get:
 *     summary: 게시글 단건 조회
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostDetail'
 *       404:
 *         description: 게시글 없음
 */
router.get('/:id', [
  param('id').isInt({ min: 1 }).toInt().withMessage('유효하지 않은 ID입니다.'),
  validate,
], (req, res, next) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    const err = new Error('게시글을 찾을 수 없습니다.'); err.status = 404; return next(err);
  }
  // Increment views
  db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(req.params.id);
  post.views += 1;
  post.comments = db.prepare(
    'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC'
  ).all(req.params.id);

  res.json({ success: true, data: post });
});

/* ────────────────────────────────────────────────
   POST /api/posts  — Create post
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts:
 *   post:
 *     summary: 게시글 작성
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostInput'
 *     responses:
 *       201:
 *         description: 게시글 생성 성공
 *       422:
 *         description: 입력값 오류
 */
router.post('/', [...postValidation, validate], (req, res) => {
  const { title, author, content } = req.body;
  const result = db.prepare(
    `INSERT INTO posts (title, author, content) VALUES (?, ?, ?)`
  ).run(title.trim(), author.trim(), content.trim());

  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: post });
});

/* ────────────────────────────────────────────────
   PUT /api/posts/:id  — Update post
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts/{id}:
 *   put:
 *     summary: 게시글 수정
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostInput'
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: 게시글 없음
 */
router.put('/:id', [
  param('id').isInt({ min: 1 }).toInt(),
  ...postValidation, validate,
], (req, res, next) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    const err = new Error('게시글을 찾을 수 없습니다.'); err.status = 404; return next(err);
  }
  const { title, author, content } = req.body;
  db.prepare(
    `UPDATE posts SET title=?, author=?, content=?,
     updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?`
  ).run(title.trim(), author.trim(), content.trim(), req.params.id);

  const updated = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

/* ────────────────────────────────────────────────
   DELETE /api/posts/:id  — Delete post
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts/{id}:
 *   delete:
 *     summary: 게시글 삭제
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: 게시글 없음
 */
router.delete('/:id', [
  param('id').isInt({ min: 1 }).toInt(),
  validate,
], (req, res, next) => {
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    const err = new Error('게시글을 찾을 수 없습니다.'); err.status = 404; return next(err);
  }
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '게시글이 삭제되었습니다.' });
});

module.exports = router;
