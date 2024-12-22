import createHttpError from 'http-errors';

export const validateBody = (schema, type = 'body') => {
  const func = async (req, res, next) => {
    try {
      await schema.validateAsync(req[type], { abortEarly: false });

      next();
    } catch (err) {
      const error = createHttpError(400, 'Bad request', {
        errors: err.details,
      });

      next(error);
    }
  };

  return func;
};
