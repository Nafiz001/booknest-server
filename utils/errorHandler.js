/**
 * Standard API response formats and error handling utilities
 */

/**
 * Send successful response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {object} data - Response data
 */
const sendSuccess = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...data
  });
};

/**
 * Send error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {object} errors - Additional error details
 */
const sendError = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Handle validation errors
 * @param {object} res - Express response object
 * @param {object} error - Joi validation error
 */
const handleValidationError = (res, error) => {
  const errors = error.details.map(detail => ({
    field: detail.path[0],
    message: detail.message
  }));

  return sendError(res, 400, 'Validation failed', errors);
};

/**
 * Handle MongoDB duplicate key error
 * @param {object} res - Express response object
 * @param {object} error - MongoDB error
 */
const handleDuplicateKeyError = (res, error) => {
  const field = Object.keys(error.keyPattern)[0];
  const message = `${field} already exists`;

  return sendError(res, 409, message);
};

/**
 * Handle MongoDB cast error
 * @param {object} res - Express response object
 * @param {object} error - MongoDB error
 */
const handleCastError = (res, error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return sendError(res, 400, message);
};

/**
 * Handle JWT errors
 * @param {object} res - Express response object
 * @param {object} error - JWT error
 */
const handleJWTError = (res, error) => {
  if (error.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Token expired');
  }

  return sendError(res, 401, 'Authentication failed');
};

/**
 * Handle not found error
 * @param {object} res - Express response object
 * @param {string} resource - Resource name
 */
const handleNotFound = (res, resource = 'Resource') => {
  return sendError(res, 404, `${resource} not found`);
};

/**
 * Handle unauthorized error
 * @param {object} res - Express response object
 * @param {string} message - Custom message
 */
const handleUnauthorized = (res, message = 'Unauthorized access') => {
  return sendError(res, 403, message);
};

/**
 * Handle internal server error
 * @param {object} res - Express response object
 * @param {object} error - Error object
 */
const handleServerError = (res, error) => {
  console.error('Server Error:', error);

  // Don't expose internal error details in production
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;

  return sendError(res, 500, message);
};

/**
 * Async handler wrapper to catch errors
 * @param {function} fn - Async route handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 * @param {object} err - Error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Joi validation error
  if (err.isJoi) {
    return handleValidationError(res, err);
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return handleDuplicateKeyError(res, err);
  }

  // MongoDB cast error
  if (err.name === 'CastError') {
    return handleCastError(res, err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return handleJWTError(res, err);
  }

  // Custom API error with statusCode
  if (err.statusCode) {
    return sendError(res, err.statusCode, err.message);
  }

  // Default to 500 server error
  return handleServerError(res, err);
};

/**
 * Custom API Error class
 */
class APIError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'APIError';
  }
}

module.exports = {
  sendSuccess,
  sendError,
  handleValidationError,
  handleDuplicateKeyError,
  handleCastError,
  handleJWTError,
  handleNotFound,
  handleUnauthorized,
  handleServerError,
  asyncHandler,
  errorHandler,
  APIError
};
