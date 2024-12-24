import Joi from 'joi';

import {
  emailRegExp,
  phoneNumberRegExp,
  stateRegExp,
  postCodeRegExp,
  ssnRegExp,
  birthdayValidFormat,
} from '../constants/authConstants.js';

export const validationSignUp = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required().messages({
    'string.base': 'First name must be a string.',
    'string.empty': 'First name is required.',
    'string.min': 'First name must be at least 2 characters long.',
    'string.max': 'First name must be less than 50 characters.',
  }),
  lastName: Joi.string().trim().min(2).max(50).required().messages({
    'string.base': 'Last name must be a string.',
    'string.empty': 'Last name is required.',
    'string.min': 'Last name must be at least 2 characters long.',
    'string.max': 'Last name must be less than 50 characters.',
  }),
  email: Joi.string().trim().regex(emailRegExp).required().messages({
    'string.empty': 'Email is required.',
    'string.pattern.base': 'Please enter a valid email.',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.empty': 'Password is required.',
    'string.min': 'Password must be at least 8 characters long.',
    'string.max': 'Password must be less than 128 characters.',
  }),
  phoneNumber: Joi.string().trim().regex(phoneNumberRegExp).required().messages({
    'string.empty': 'Phone number is required.',
    'string.pattern.base': 'Please enter a valid US phone number.',
  }),
  dateOfBirth: Joi.date()
    .less(new Date(Date.now() - 568025136000)) // At least 18 years old (18 * 365.25 * 24 * 60 * 60 * 1000 ms)
    .iso()
    .required()
    .messages({
      'date.base': 'Date of birth must be a valid date.',
      'date.less': 'User must be at least 18 years old.',
      'date.iso': 'Please enter a valid date format "yyyy-mm-dd".',
    }),
  ssn: Joi.string().trim().min(4).max(4).pattern(ssnRegExp).required().messages({
    'string.empty': 'SSN is required.',
    'string.min': 'SSN must be a valid 4 digits.',
    'string.max': 'SSN must be a valid 4 digits.',
    'string.pattern.base': 'SSN must consist of exactly 4 digits.',
  }),
  address: Joi.object({
    street: Joi.string().trim().required().messages({
      'string.empty': 'Street address is required.',
    }),
    city: Joi.string().trim().required().messages({
      'string.empty': 'City is required.',
    }),
    state: Joi.string().regex(stateRegExp).required().messages({
      'string.empty': 'State is required.',
      'string.pattern.base': 'State must be a valid two-letter US state abbreviation.',
    }),
    postCode: Joi.string().regex(postCodeRegExp).required().messages({
      'string.empty': 'Postal code is required.',
      'string.pattern.base': 'Please enter a valid US postal code.',
    }),
  })
    .required()
    .messages({
      'object.base': 'Address must be a valid object.',
    }),
});

export const validationSignIn = Joi.object({
  email: Joi.string().trim().regex(emailRegExp).required().messages({
    'string.empty': 'Email is required.',
    'string.pattern.base': 'Please enter a valid email.',
  }),
  password: Joi.string().min(8).max(128).required().messages({
    'string.empty': 'Password is required.',
    'string.min': 'Password must be at least 8 characters long.',
    'string.max': 'Password must be less than 128 characters.',
  }),
});
