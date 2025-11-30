import { body, query } from 'express-validator';

export const createPropertyValidators = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('locality')
    .trim()
    .notEmpty()
    .withMessage('Locality is required'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('propertyType')
    .isIn(['FLAT', 'PG', 'INDEPENDENT_HOUSE', 'SHARED_ROOM'])
    .withMessage('Invalid property type'),
  body('roomConfig')
    .isIn(['SINGLE_ROOM', 'ONE_RK', 'ONE_BHK', 'TWO_BHK', 'THREE_BHK', 'THREE_PLUS_BHK', 'SHARED'])
    .withMessage('Invalid room configuration'),
  body('furnishing')
    .isIn(['FULLY_FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED'])
    .withMessage('Invalid furnishing status'),
  body('rentAmount')
    .isInt({ min: 1000, max: 10000000 })
    .withMessage('Rent amount must be between ₹1,000 and ₹1,00,00,000'),
  body('depositAmount')
    .isInt({ min: 0, max: 50000000 })
    .withMessage('Deposit amount must be valid'),
  body('tenantPreference')
    .isArray({ min: 1 })
    .withMessage('At least one tenant preference is required'),
  body('tenantPreference.*')
    .isIn(['STUDENTS', 'WORKING_PROFESSIONALS', 'FAMILY', 'ANY'])
    .withMessage('Invalid tenant preference'),
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array'),
];

export const updatePropertyValidators = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Title must be between 5 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 20, max: 2000 })
    .withMessage('Description must be between 20 and 2000 characters'),
  body('rentAmount')
    .optional()
    .isInt({ min: 1000, max: 10000000 })
    .withMessage('Rent amount must be between ₹1,000 and ₹1,00,00,000'),
  body('depositAmount')
    .optional()
    .isInt({ min: 0, max: 50000000 })
    .withMessage('Deposit amount must be valid'),
];

export const propertyQueryValidators = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('minRent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Min rent must be a non-negative integer'),
  query('maxRent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Max rent must be a non-negative integer'),
];
