const errorHandle = (err, req, res, next) => {
  const { status = 500, message } = err;

  res.status(status).json({
    message: message,
    error: message,
    data: err,
  });
};

export default errorHandle;
