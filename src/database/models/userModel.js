import { Schema, model } from 'mongoose';

import { mongooseSaveError, encryptPassword, displayField, dataFormatter } from './hooks.js';

import {
  emailRegExp,
  phoneNumberRegExp,
  postCodeRegExp,
  stateRegExp,
  birthdayValidFormat,
  dateOfBirthValidation,
  ssnRegExp,
} from '../../constants/authConstants.js';

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required.'],
      trim: true,
      lowercase: true,
      minlength: [2, 'First name must be at least 2 characters long.'],
      maxlength: [50, 'First name must be less than 50 characters.'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required.'],
      trim: true,
      lowercase: true,
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
      match: birthdayValidFormat,
      validate: {
        validator: dateOfBirthValidation,
        message: 'User must be at least 18 years old.',
      },
    },
    ssn: {
      type: String,
      trim: true,
      match: ssnRegExp,
      required: [true, "The last 4 digits of the user's social security number."],
      minlength: [4, 'Must be at least 4 characters long.'],
      maxlength: [4, 'Must be less than 4 characters.'],
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
    userPlaidCredentials: {
      userId: { type: String, required: false },
      userToken: { type: String, required: false },
      requestId: { type: String, required: false },
    },
    reportAssetsToken: { type: String, required: false },
    reportAssetsId: { type: String, required: false },
    plaidAccessToken: { type: String, required: false },
    plaidItemId: { type: String, required: false },
    dwollaCustomerURL: {
      type: String,
      required: false,
    },
  },

  { versionKey: false, timestamps: true },
);

userSchema.pre('save', encryptPassword);
// userSchema.pre('save', dataFormatter);
userSchema.post('save', mongooseSaveError);
displayField(userSchema, [
  'password',
  'plaidAccessToken',
  'plaidItemId',
  'userPlaidCredentials',
  'reportAssetsToken',
  'reportAssetsId',
]);

export const UserRegisterCollection = model('user', userSchema);
