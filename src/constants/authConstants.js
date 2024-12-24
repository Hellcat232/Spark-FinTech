export const emailRegExp =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const phoneNumberRegExp = /^1[2-9]\d{2}[2-9](?!11)\d{6}$/;

export const phone = /^\+1[2-9]\d{2}[2-9](?!11)\d{6}$/;

export const stateRegExp = /^[A-Z]{2}$/;

export const ssnRegExp = /^\d{4}$/;

export const postCodeRegExp = /^\d{5}(-\d{4})?$/;

export const birthdayValidFormat = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const dateOfBirthValidation = (value) => {
  const today = new Date();
  const age = today.getFullYear() - value.getFullYear();
  const monthDiff = today.getMonth() - value.getMonth();
  const dayDiff = today.getDate() - value.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

export const formatDate = (date) => {
  const dateValue = new Date(date);

  if (isNaN(dateValue.getTime())) {
    throw new Error('Invalid date format');
  }

  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(
    dateValue.getDate(),
  ).padStart(2, '0')}`;
};

export const cuttingISO = (date) => {
  const isoString = new Date(date).toISOString();

  return isoString.split('T')[0];
};
