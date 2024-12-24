import { hashPassword } from '../../utils/hash.js';
import { formatDate } from '../../constants/authConstants.js';

export const mongooseSaveError = (error, data, next) => {
  const { name, code } = error;

  error.status = name === 'MongoServerError' && code === 11000 ? 409 : 400;
  next();
};

export const encryptPassword = async function (next) {
  try {
    if (this.isModified('password')) {
      this.password = await hashPassword(this.password);
    }
    next();
  } catch (error) {
    next(error);
  }
};

export function displayField(schema, fieldsToOmit = []) {
  schema.methods.toJSON = function () {
    const user = this.toObject();

    fieldsToOmit.forEach((field) => delete user[field]);

    return user;
  };
}

export const dataFormatter = async function (next) {
  try {
    if (this.isModified('dateOfBirth')) {
      this.dateOfBirth = formatDate(this.dateOfBirth); // Форматируем дату перед сохранением
    }
    next();
  } catch (error) {
    next(error);
  }
};
