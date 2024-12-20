import createHttpError from 'http-errors';
import { isValidObjectId } from 'mongoose';

const isValidID = (req, res, next) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) {
    return next(createHttpError(404, `Value ${id} can't be valid ID`));
  }

  next();
};

export default isValidID;
