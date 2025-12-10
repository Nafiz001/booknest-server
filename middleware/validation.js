const Joi = require('joi');

/**
 * Validate registration input
 */
const validateRegister = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).when('authProvider', {
      is: 'email',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    authProvider: Joi.string().valid('email', 'google').default('email'),
    googleUid: Joi.string().when('authProvider', {
      is: 'google',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    profilePicture: Joi.string().uri().optional()
  });

  return schema.validate(data);
};

/**
 * Validate login input
 */
const validateLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().when('authProvider', {
      is: 'email',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    authProvider: Joi.string().valid('email', 'google').default('email'),
    googleUid: Joi.string().when('authProvider', {
      is: 'google',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });

  return schema.validate(data);
};

/**
 * Validate book creation/update
 */
const validateBook = (data, isUpdate = false) => {
  const schema = Joi.object({
    title: Joi.string().min(3).max(200).required(),
    author: Joi.string().min(2).max(100).required(),
    description: Joi.string().min(10).max(2000).required(),
    category: Joi.string().required(),
    price: Joi.number().positive().required(),
    isbn: Joi.string().pattern(/^(?:\d{9}[\dX]|\d{13})$/).required(),
    publisher: Joi.string().max(100).optional(),
    publishedDate: Joi.date().optional(),
    pages: Joi.number().integer().positive().optional(),
    language: Joi.string().max(50).optional(),
    image: Joi.string().optional(),
    stock: Joi.number().integer().min(0).default(0),
    status: Joi.string().valid('draft', 'published', 'unpublished').default('draft')
  });

  return schema.validate(data);
};

/**
 * Validate order creation
 */
const validateOrder = (data) => {
  const schema = Joi.object({
    book: Joi.string().required(),
    deliveryType: Joi.string().valid('delivery', 'pickup').required(),
    deliveryAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().optional(),
      zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required()
    }).when('deliveryType', {
      is: 'delivery',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    requestedDate: Joi.date().greater('now').required(),
    notes: Joi.string().max(500).optional(),
    totalAmount: Joi.number().positive().required()
  });

  return schema.validate(data);
};

/**
 * Validate user profile update
 */
const validateProfileUpdate = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).optional(),
    profilePicture: Joi.string().uri().optional(),
    phone: Joi.string().pattern(/^\d{10}$/).optional()
  });

  return schema.validate(data);
};

/**
 * Validate role update
 */
const validateRoleUpdate = (data) => {
  const schema = Joi.object({
    role: Joi.string().valid('user', 'librarian', 'admin').required()
  });

  return schema.validate(data);
};

/**
 * Validate order status update
 */
const validateOrderStatus = (data) => {
  const schema = Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'shipped', 'delivered', 'cancelled').required()
  });

  return schema.validate(data);
};

/**
 * Validate book status update
 */
const validateBookStatus = (data) => {
  const schema = Joi.object({
    status: Joi.string().valid('draft', 'published', 'unpublished').required()
  });

  return schema.validate(data);
};

module.exports = {
  validateRegister,
  validateLogin,
  validateBook,
  validateOrder,
  validateProfileUpdate,
  validateRoleUpdate,
  validateOrderStatus,
  validateBookStatus
};
