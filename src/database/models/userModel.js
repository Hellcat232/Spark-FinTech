import { Schema, model } from 'mongoose';

import { mongooseSaveError, encryptPassword, displayField } from './hooks.js';

import {
  emailRegExp,
  phoneNumberRegExp,
  postCodeRegExp,
  stateRegExp,
  dateOfBirthValidation,
} from '../../constants/authConstants.js';

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters long.'],
      maxlength: [50, 'First name must be less than 50 characters.'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters long.'],
      maxlength: [50, 'Last name must be less than 50 characters.'],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [emailRegExp, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required.'],
      minlength: [8, 'Password must be at least 8 characters long.'],
      maxlength: [128, 'Password must be less than 128 characters.'],
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required.'],
      unique: true,
      set: (value) => value.replace(/^\+/, ''),
      match: [phoneNumberRegExp, 'Please enter a valid US phone number.'],
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required.'],
      validate: {
        validator: dateOfBirthValidation,
        message: 'User must be at least 18 years old.',
      },
    },
    address: {
      street: {
        type: String,
        required: [true, 'Street address is required.'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required.'],
        trim: true,
      },
      state: {
        type: String,
        required: [true, 'State is required.'],
        trim: true,
        match: [stateRegExp, 'State must be a valid two-letter US state abbreviation.'],
      },
      postCode: {
        type: String,
        required: [true, 'Postal code is required.'],
        match: [postCodeRegExp, 'Please enter a valid US postal code.'],
      },
    },
    plaidAccessToken: { type: String, required: false },
    plaidItemId: { type: String, required: false },
  },

  { versionKey: false, timestamps: true },
);

userSchema.pre('save', encryptPassword);
userSchema.post('save', mongooseSaveError);
displayField(userSchema, ['password', 'plaidAccessToken', 'plaidItemId']);

export const UserRegisterCollection = model('user', userSchema);
