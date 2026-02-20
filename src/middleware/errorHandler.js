'use strict';

const { validationResult } = require('express-validator');

/**
 * Run express-validator checks and respond with 422 on failure.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/**
 * Catch-all error handler (must be registered last).
 */
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[ERROR]', err);
  }
  res.status(status).json({
    success: false,
    message: status < 500 ? err.message : 'Internal server error',
  });
}

/**
 * 404 handler (must be registered before errorHandler).
 */
function notFound(req, res, next) {
  const err = new Error(`Not found: ${req.method} ${req.path}`);
  err.status = 404;
  next(err);
}

module.exports = { validate, errorHandler, notFound };
