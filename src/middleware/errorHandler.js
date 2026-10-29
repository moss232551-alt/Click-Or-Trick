const { ZodError } = require('zod');

const notFound = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.status = 404;
  next(error);
};

const errorHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Invalid request payload',
      issues: error.errors,
    });
  }

  const status = error.status || 500;
  res.status(status).json({
    message: error.message || 'Unexpected server error',
  });
};

module.exports = {
  notFound,
  errorHandler,
};
