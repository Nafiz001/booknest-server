/**
 * Standardized API response utility functions
 */

/**
 * Success response format
 * @param {string} message - Success message
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code
 * @returns {object} Formatted response
 */
const successResponse = (message, data = {}, statusCode = 200) => {
  return {
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Error response format
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {object} errors - Additional error details
 * @returns {object} Formatted response
 */
const errorResponse = (message, statusCode = 500, errors = null) => {
  const response = {
    success: false,
    statusCode,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  return response;
};

/**
 * Paginated response format
 * @param {array} data - Array of data items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 * @returns {object} Formatted paginated response
 */
const paginatedResponse = (data, page, limit, total, message = 'Data retrieved successfully') => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    statusCode: 200,
    message,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      pageSize: limit,
      totalItems: total,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Send success response with Express
 * @param {object} res - Express response object
 * @param {string} message - Success message
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code
 */
const sendSuccess = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json(successResponse(message, data, statusCode));
};

/**
 * Send error response with Express
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {object} errors - Additional error details
 */
const sendError = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json(errorResponse(message, statusCode, errors));
};

/**
 * Send paginated response with Express
 * @param {object} res - Express response object
 * @param {array} data - Array of data items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {string} message - Success message
 */
const sendPaginated = (res, data, page, limit, total, message = 'Data retrieved successfully') => {
  return res.status(200).json(paginatedResponse(data, page, limit, total, message));
};

/**
 * Create response with custom fields
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {object} additionalFields - Additional fields to include
 * @returns {object} Formatted response
 */
const customResponse = (success, message, additionalFields = {}) => {
  return {
    success,
    message,
    ...additionalFields,
    timestamp: new Date().toISOString()
  };
};

/**
 * Send custom response with Express
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {object} additionalFields - Additional fields to include
 */
const sendCustom = (res, statusCode, success, message, additionalFields = {}) => {
  return res.status(statusCode).json(customResponse(success, message, additionalFields));
};

/**
 * Created response (201)
 * @param {object} res - Express response object
 * @param {string} message - Success message
 * @param {object} data - Created resource data
 */
const sendCreated = (res, message, data = {}) => {
  return sendSuccess(res, message, data, 201);
};

/**
 * No content response (204)
 * @param {object} res - Express response object
 */
const sendNoContent = (res) => {
  return res.status(204).send();
};

/**
 * Not found response (404)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
const sendNotFound = (res, message = 'Resource not found') => {
  return sendError(res, message, 404);
};

/**
 * Bad request response (400)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {object} errors - Validation errors
 */
const sendBadRequest = (res, message = 'Bad request', errors = null) => {
  return sendError(res, message, 400, errors);
};

/**
 * Unauthorized response (401)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, message, 401);
};

/**
 * Forbidden response (403)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, message, 403);
};

/**
 * Conflict response (409)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
const sendConflict = (res, message = 'Resource conflict') => {
  return sendError(res, message, 409);
};

/**
 * Internal server error response (500)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
const sendServerError = (res, message = 'Internal server error') => {
  return sendError(res, message, 500);
};

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  customResponse,
  sendSuccess,
  sendError,
  sendPaginated,
  sendCustom,
  sendCreated,
  sendNoContent,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendConflict,
  sendServerError
};
