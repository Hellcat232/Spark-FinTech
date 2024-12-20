export const emailRegExp =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const phoneNumberRegExp = /^1[2-9]\d{2}[2-9](?!11)\d{6}$/;

export const phone = /^\+1[2-9]\d{2}[2-9](?!11)\d{6}$/;

export const stateRegExp = /^[A-Z]{2}$/;

export const postCodeRegExp = /^\d{5}(-\d{4})?$/;

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
