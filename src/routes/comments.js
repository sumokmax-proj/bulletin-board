'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../middleware/errorHandler');
const db = require('../db');

const router = Router({ mergeParams: true });

const commentValidation = [
  body('author').trim().isLength({ min: 1, max: 50 }).withMessage('작성자는 1~50자여야 합니다.'),
  body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('댓글은 1~10000자여야 합니다.'),
];

function getPost(id) {
  return db.prepare('SELECT id FROM posts WHERE id = ?').get(id);
}

/* ────────────────────────────────────────────────
   GET /api/posts/:postId/comments
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts/{postId}/comments:
 *   get:
 *     summary: 댓글 목록 조회
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CommentList'
 *       404:
 *         description: 게시글 없음
 */
router.get('/', [
  param('postId').isInt({ min: 1 }).toInt(),
  validate,
], (req, res, next) => {
  if (!getPost(req.params.postId)) {
    const err = new Error('게시글을 찾을 수 없습니다.'); err.status = 404; return next(err);
  }
  const comments = db.prepare(
    'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC'
  ).all(req.params.postId);
  res.json({ success: true, data: comments });
});

/* ────────────────────────────────────────────────
   POST /api/posts/:postId/comments
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts/{postId}/comments:
 *   post:
 *     summary: 댓글 작성
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommentInput'
 *     responses:
 *       201:
 *         description: 댓글 생성 성공
 *       404:
 *         description: 게시글 없음
 */
router.post('/', [
  param('postId').isInt({ min: 1 }).toInt(),
  ...commentValidation, validate,
], (req, res, next) => {
  if (!getPost(req.params.postId)) {
    const err = new Error('게시글을 찾을 수 없습니다.'); err.status = 404; return next(err);
  }
  const { author, content } = req.body;
  const result = db.prepare(
    'INSERT INTO comments (post_id, author, content) VALUES (?, ?, ?)'
  ).run(req.params.postId, author.trim(), content.trim());

  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: comment });
});

/* ────────────────────────────────────────────────
   PUT /api/posts/:postId/comments/:id
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts/{postId}/comments/{id}:
 *   put:
 *     summary: 댓글 수정
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CommentInput'
 *     responses:
 *       200:
 *         description: 수정 성공
 *       404:
 *         description: 댓글 없음
 */
router.put('/:id', [
  param('postId').isInt({ min: 1 }).toInt(),
  param('id').isInt({ min: 1 }).toInt(),
  ...commentValidation, validate,
], (req, res, next) => {
  const comment = db.prepare(
    'SELECT id FROM comments WHERE id = ? AND post_id = ?'
  ).get(req.params.id, req.params.postId);
  if (!comment) {
    const err = new Error('댓글을 찾을 수 없습니다.'); err.status = 404; return next(err);
  }
  const { author, content } = req.body;
  db.prepare(
    `UPDATE comments SET author=?, content=?,
     updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id=?`
  ).run(author.trim(), content.trim(), req.params.id);

  const updated = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

/* ────────────────────────────────────────────────
   DELETE /api/posts/:postId/comments/:id
──────────────────────────────────────────────── */
/**
 * @openapi
 * /api/posts/{postId}/comments/{id}:
 *   delete:
 *     summary: 댓글 삭제
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: 댓글 없음
 */
router.delete('/:id', [
  param('postId').isInt({ min: 1 }).toInt(),
  param('id').isInt({ min: 1 }).toInt(),
  validate,
], (req, res, next) => {
  const comment = db.prepare(
    'SELECT id FROM comments WHERE id = ? AND post_id = ?'
  ).get(req.params.id, req.params.postId);
  if (!comment) {
    const err = new Error('댓글을 찾을 수 없습니다.'); err.status = 404; return next(err);
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '댓글이 삭제되었습니다.' });
});

module.exports = router;
